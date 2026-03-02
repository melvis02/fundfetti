package auth

import (
	"context"
	"encoding/json"
	"log"
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
		log.Fatal("SESSION_KEY environment variable is required")
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
	if user.OrganizationID != nil {
		session.Values["org_id"] = *user.OrganizationID
	}
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
	session.Values["org_id"] = nil
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

		if role, ok := session.Values["role"].(string); ok {
			ctx = context.WithValue(ctx, "role", role)
		}

		if orgID, ok := session.Values["org_id"].(int64); ok {
			ctx = context.WithValue(ctx, "org_id", orgID)
		}

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireRole enforces role-based access control on routes
func RequireRole(allowedRoles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role, ok := r.Context().Value("role").(string)
			if !ok {
				http.Error(w, "Forbidden - Role not found in context", http.StatusForbidden)
				return
			}

			for _, allowed := range allowedRoles {
				if role == allowed {
					next.ServeHTTP(w, r)
					return
				}
			}

			http.Error(w, "Forbidden - Insufficient Role Permissions", http.StatusForbidden)
		})
	}
}

// BlockReaderMutations ensures that users with the 'reader' role cannot make state-mutating requests
func BlockReaderMutations(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost || r.Method == http.MethodPut || r.Method == http.MethodDelete {
			role, ok := r.Context().Value("role").(string)
			if ok && role == "reader" {
				http.Error(w, "Forbidden - Readers cannot modify data", http.StatusForbidden)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}
