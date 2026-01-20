package db

import (
	"database/sql"
)

// CreateUser creates a new user.
// Note: Password must be hashed before passing here.
func CreateUser(email, passwordHash, role string, orgID *int64) (int64, error) {
	res, err := DB.Exec(Rebind("INSERT INTO users (email, password_hash, role, organization_id) VALUES (?, ?, ?, ?)"), email, passwordHash, role, orgID)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

// GetUserByEmail retrieves a user by email.
func GetUserByEmail(email string) (*DBUser, error) {
	var u DBUser
	err := DB.QueryRow(Rebind("SELECT id, email, password_hash, role, organization_id, created_at FROM users WHERE email = ?"), email).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Role, &u.OrganizationID, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// GetUserByID retrieves a user by ID.
func GetUserByID(id int64) (*DBUser, error) {
	var u DBUser
	err := DB.QueryRow(Rebind("SELECT id, email, password_hash, role, organization_id, created_at FROM users WHERE id = ?"), id).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Role, &u.OrganizationID, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// ListUsers returns a list of users.
// If orgID is provided (non-nil), strictly filters by that Organization ID.
// If orgID is nil, returns ALL users (Global Admin view).
func ListUsers(orgID *int64) ([]DBUser, error) {
	var rows *sql.Rows
	var err error

	if orgID != nil {
		rows, err = DB.Query(Rebind("SELECT id, email, role, organization_id, created_at FROM users WHERE organization_id = ? ORDER BY email ASC"), *orgID)
	} else {
		// Global list - specific columns to avoid password hash
		rows, err = DB.Query("SELECT id, email, role, organization_id, created_at FROM users ORDER BY email ASC")
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []DBUser
	for rows.Next() {
		var u DBUser
		// We don't fetch password_hash for list view
		if err := rows.Scan(&u.ID, &u.Email, &u.Role, &u.OrganizationID, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, nil
}

// UpdateUser updates a user's role, organization, or email.
// Pass nil for passwordHash if not updating password.
func UpdateUser(id int64, email string, role string, orgID *int64, passwordHash *string) error {
	// Construct dynamic query based on what's provided, or just update all except password if nil
	// Simplification: Update basic fields. Password only if provided.

	if passwordHash != nil {
		_, err := DB.Exec(Rebind("UPDATE users SET email=?, role=?, organization_id=?, password_hash=? WHERE id=?"), email, role, orgID, *passwordHash, id)
		return err
	}

	_, err := DB.Exec(Rebind("UPDATE users SET email=?, role=?, organization_id=? WHERE id=?"), email, role, orgID, id)
	return err
}

// DeleteUser deletes a user by ID.
func DeleteUser(id int64) error {
	_, err := DB.Exec(Rebind("DELETE FROM users WHERE id = ?"), id)
	return err
}
