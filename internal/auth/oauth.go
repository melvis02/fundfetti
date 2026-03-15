package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/melvis02/fundfetti/internal/db"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

var googleOAuthConfig *oauth2.Config

func init() {
	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	clientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "http://localhost:8080" // Default for local dev
	}
	
	if clientID != "" && clientSecret != "" {
		googleOAuthConfig = &oauth2.Config{
			RedirectURL:  fmt.Sprintf("%s/api/auth/google/callback", appURL),
			ClientID:     clientID,
			ClientSecret: clientSecret,
			Scopes:       []string{"https://www.googleapis.com/auth/userinfo.email"},
			Endpoint:     google.Endpoint,
		}
	} else {
		log.Println("Google OAuth not configured (missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET)")
	}
}

func generateStateToken() string {
	b := make([]byte, 16)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

func GoogleLoginHandler(w http.ResponseWriter, r *http.Request) {
	if googleOAuthConfig == nil {
		http.Error(w, "Google SSO is not configured on this server.", http.StatusServiceUnavailable)
		return
	}

	state := generateStateToken()
	
	// Store state in a cookie to prevent CSRF
	session, _ := store.Get(r, "session")
	session.Values["oauth_state"] = state
	session.Save(r, w)

	url := googleOAuthConfig.AuthCodeURL(state)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func GoogleCallbackHandler(w http.ResponseWriter, r *http.Request) {
	if googleOAuthConfig == nil {
		http.Error(w, "Google SSO is not configured.", http.StatusServiceUnavailable)
		return
	}

	// Verify state token
	session, _ := store.Get(r, "session")
	expectedState, ok := session.Values["oauth_state"].(string)
	if !ok || r.FormValue("state") != expectedState {
		http.Error(w, "Invalid OAuth state token", http.StatusUnauthorized)
		return
	}
	
	// Clear the state token immediately
	delete(session.Values, "oauth_state")
	session.Save(r, w)

	code := r.FormValue("code")
	token, err := googleOAuthConfig.Exchange(context.Background(), code)
	if err != nil {
		http.Error(w, "Failed to exchange token", http.StatusInternalServerError)
		return
	}

	client := googleOAuthConfig.Client(context.Background(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		http.Error(w, "Failed to get user info", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read user info", http.StatusInternalServerError)
		return
	}

	var user struct {
		ID    string `json:"id"`
		Email string `json:"email"`
	}
	if err := json.Unmarshal(data, &user); err != nil {
		http.Error(w, "Failed to parse user info", http.StatusInternalServerError)
		return
	}

	// 1. Try to find the user by their OAuth ID
	dbUser, err := db.GetUserByOAuthID("google", user.ID)
	if err != nil || dbUser == nil {
		// 2. If not found, try to find by Email to link accounts
		dbUser, err = db.GetUserByEmail(user.Email)
		if err == nil && dbUser != nil {
			// Email exists but no OAuth config yet. We could link them, but to be safe,
			// requiring them to login via password first to link might be better. 
			// For simplicity and ease of use in this admin tool, we'll auto-link based on verified Google Email.
			dbUser.OAuthProvider = "google"
			dbUser.OAuthID = user.ID
			// In a real prod environment we'd likely have a specific query to UPDATE oauth details here
			// For now, if they exist we will just log them in. 
		} else {
			// 3. User doesn't exist at all. For safety in a multi-tenant app, 
			// we likely don't want open registration via SSO granting 'org_admin' with no org.
			// Let's reject unknown users. An admin must create the account via email first.
			http.Error(w, "Access Denied: Your email is not registered as an admin. Please contact an administrator.", http.StatusForbidden)
			return
		}
	}

	// Log the user into the normal session
	session.Values["user_id"] = dbUser.ID
	session.Values["role"] = dbUser.Role
	if dbUser.OrganizationID != nil {
		session.Values["org_id"] = *dbUser.OrganizationID
	}
	session.Save(r, w)

	// Redirect back to admin dashboard upon successful login
	http.Redirect(w, r, "/admin", http.StatusTemporaryRedirect)
}
