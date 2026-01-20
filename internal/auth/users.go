package auth

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/melvis02/fundfetti/internal/db"
)

// ListUsersHandler returns users.
// Global Admins see all users (if no org_id param) or filtered by org.
// Org Admins/Readers see only their org's users.
func ListUsersHandler(w http.ResponseWriter, r *http.Request) {
	// 1. Get current user from context (set by AuthMiddleware)
	userID, ok := r.Context().Value("user_id").(int64)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	currentUser, err := db.GetUserByID(userID)
	if err != nil {
		http.Error(w, "User not found", http.StatusUnauthorized)
		return
	}

	// 2. Determine Scope
	var filterOrgID *int64

	if currentUser.Role == "global_admin" {
		// Global Admin can filter by org_id query param, or see all
		queryOrgID := r.URL.Query().Get("org_id")
		if queryOrgID != "" {
			id, err := strconv.ParseInt(queryOrgID, 10, 64)
			if err == nil {
				filterOrgID = &id
			}
		}
	} else {
		// Org Admin / Reader restricted to their own org
		if currentUser.OrganizationID == nil {
			// Specific edge case: non-global admin with no org? Should not happen.
			http.Error(w, "Forbidden: No organization assigned", http.StatusForbidden)
			return
		}
		filterOrgID = currentUser.OrganizationID
	}

	// 3. Fetch Data
	users, err := db.ListUsers(filterOrgID)
	if err != nil {
		http.Error(w, "Failed to fetch users", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(users)
}

// CreateUserRequest payload
type CreateUserRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
	OrgID    *int64 `json:"org_id"`
}

// CreateUserHandler creates a new user.
func CreateUserHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value("user_id").(int64)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	currentUser, err := db.GetUserByID(userID)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// RBAC Check
	if currentUser.Role == "global_admin" {
		// Can create any user
	} else if currentUser.Role == "org_admin" {
		// Can only create users for their own org
		if req.OrgID == nil || *req.OrgID != *currentUser.OrganizationID {
			http.Error(w, "Forbidden: Can only create users for your own organization", http.StatusForbidden)
			return
		}
		// Can only assign roles 'org_admin' or 'reader' (cannot create global_admin)
		if req.Role == "global_admin" {
			http.Error(w, "Forbidden: Cannot create global admin", http.StatusForbidden)
			return
		}
	} else {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Hash Password
	hash, err := HashPassword(req.Password)
	if err != nil {
		http.Error(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}

	// Create
	id, err := db.CreateUser(req.Email, hash, req.Role, req.OrgID)
	if err != nil {
		// Check for duplicate email error sqlite constraint?
		http.Error(w, "Failed to create user (email might be taken)", http.StatusInternalServerError)
		return
	}

	// Return the new user (without sensitive data)
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{"id": id, "email": req.Email})
}

// UpdateUserRequest payload
type UpdateUserRequest struct {
	Email    string `json:"email"`
	Role     string `json:"role"`
	OrgID    *int64 `json:"org_id"`
	Password string `json:"password,omitempty"` // Optional
}

func UpdateUserHandler(w http.ResponseWriter, r *http.Request) {
	// Parse URL param
	vars := mux.Vars(r)
	targetID, _ := strconv.ParseInt(vars["id"], 10, 64)

	userID, _ := r.Context().Value("user_id").(int64)
	currentUser, _ := db.GetUserByID(userID)

	var req UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// RBAC Logic
	// Global Admin: Can update anyone.
	// Org Admin: Can update users in their org ONLY. Cannot change OrgID to another org.
	//            Cannot promote self or others to global_admin.

	targetUser, err := db.GetUserByID(targetID)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	if currentUser.Role == "global_admin" {
		// Allowed
	} else if currentUser.Role == "org_admin" {
		// Check if target is in same org
		if currentUser.OrganizationID == nil || targetUser.OrganizationID == nil || *currentUser.OrganizationID != *targetUser.OrganizationID {
			http.Error(w, "Forbidden: Cannot edit users outside your organization", http.StatusForbidden)
			return
		}
		// Check if trying to change OrgID
		if req.OrgID != nil && *req.OrgID != *currentUser.OrganizationID {
			http.Error(w, "Forbidden: Cannot move user to another organization", http.StatusForbidden)
			return
		}
		// Check if trying to set global_admin
		if req.Role == "global_admin" {
			http.Error(w, "Forbidden: Cannot set role to global_admin", http.StatusForbidden)
			return
		}
	} else {
		// Readers cannot edit
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Hash password if provided
	var pwHash *string
	if req.Password != "" {
		h, _ := HashPassword(req.Password)
		pwHash = &h
	}

	if err := db.UpdateUser(targetID, req.Email, req.Role, req.OrgID, pwHash); err != nil {
		http.Error(w, "Failed to update user", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}

func DeleteUserHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	targetID, _ := strconv.ParseInt(vars["id"], 10, 64)

	userID, _ := r.Context().Value("user_id").(int64)
	currentUser, _ := db.GetUserByID(userID)

	targetUser, err := db.GetUserByID(targetID)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// RBAC
	if currentUser.Role == "global_admin" {
		// Allowed
	} else if currentUser.Role == "org_admin" {
		if currentUser.OrganizationID == nil || targetUser.OrganizationID == nil || *currentUser.OrganizationID != *targetUser.OrganizationID {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
	} else {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	if err := db.DeleteUser(targetID); err != nil {
		http.Error(w, "Failed to delete user", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
