package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"os"

	"github.com/gorilla/sessions"
	"github.com/melvis02/fundfetti/internal/db"
	"golang.org/x/crypto/bcrypt"
)

var (
	// Key must be 32 bytes
	store = sessions.NewCookieStore([]byte(os.Getenv("SESSION_KEY")))
)

func init() {
	key := os.Getenv("SESSION_KEY")
	if key == "" {
		key = "super-secret-key-that-is-32-bytes-long!"
	}
	store = sessions.NewCookieStore([]byte(key))

	store.Options = &sessions.Options{
		Path:     "/",
		MaxAge:   86400 * 7,
		HttpOnly: true,
		Secure:   false, // Set to true in prod with TLS
	}
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type User struct {
	ID    int64  `json:"id"`
	Email string `json:"email"`
	Role  string `json:"role"`
	OrgID *int64 `json:"org_id"`
}

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(bytes), err
}

func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	user, err := db.GetUserByEmail(req.Email)
	if err != nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	if !CheckPasswordHash(req.Password, user.PasswordHash) {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	session, _ := store.Get(r, "session")
	session.Values["user_id"] = user.ID
	session.Values["role"] = user.Role
	session.Save(r, w)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "ok",
		"user": User{
			ID:    user.ID,
			Email: user.Email,
			Role:  user.Role,
			OrgID: user.OrganizationID,
		},
	})
}

func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "session")
	session.Values["user_id"] = nil
	session.Values["role"] = nil
	session.Options.MaxAge = -1
	session.Save(r, w)
	w.WriteHeader(http.StatusOK)
}

func MeHandler(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "session")
	userID, ok := session.Values["user_id"].(int64)
	if !ok {
		http.Error(w, "Not logged in", http.StatusUnauthorized)
		return
	}

	user, err := db.GetUserByID(userID)
	if err != nil {
		http.Error(w, "User not found", http.StatusUnauthorized)
		return
	}

	json.NewEncoder(w).Encode(User{
		ID:    user.ID,
		Email: user.Email,
		Role:  user.Role,
		OrgID: user.OrganizationID,
	})
}

// Middleware
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session, _ := store.Get(r, "session")
		userID, ok := session.Values["user_id"].(int64)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), "user_id", userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
