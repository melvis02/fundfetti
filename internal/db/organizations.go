package db

import (
	"database/sql"
	"fmt"
)

func CreateOrganization(org Organization) (int64, error) {
	stmt, err := DB.Prepare("INSERT INTO organizations (name, slug, contact_email) VALUES (?, ?, ?)")
	if err != nil {
		return 0, fmt.Errorf("failed to prepare insert org stmt: %w", err)
	}
	defer stmt.Close()

	res, err := stmt.Exec(org.Name, org.Slug, org.ContactEmail)
	if err != nil {
		return 0, fmt.Errorf("failed to execute insert org: %w", err)
	}

	return res.LastInsertId()
}

func GetOrganization(id int64) (*Organization, error) {
	var org Organization
	err := DB.QueryRow("SELECT id, name, slug, contact_email, created_at FROM organizations WHERE id = ?", id).
		Scan(&org.ID, &org.Name, &org.Slug, &org.ContactEmail, &org.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // Not found
		}
		return nil, fmt.Errorf("failed to get org: %w", err)
	}
	return &org, nil
}

func GetAllOrganizations() ([]Organization, error) {
	rows, err := DB.Query("SELECT id, name, slug, contact_email, created_at FROM organizations ORDER BY name ASC")
	if err != nil {
		return nil, fmt.Errorf("failed to query orgs: %w", err)
	}
	defer rows.Close()

	orgs := []Organization{}
	for rows.Next() {
		var org Organization
		if err := rows.Scan(&org.ID, &org.Name, &org.Slug, &org.ContactEmail, &org.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan org: %w", err)
		}
		orgs = append(orgs, org)
	}
	return orgs, nil
}

func UpdateOrganization(org Organization) error {
	stmt, err := DB.Prepare("UPDATE organizations SET name = ?, slug = ?, contact_email = ? WHERE id = ?")
	if err != nil {
		return fmt.Errorf("failed to prepare update org stmt: %w", err)
	}
	defer stmt.Close()

	_, err = stmt.Exec(org.Name, org.Slug, org.ContactEmail, org.ID)
	if err != nil {
		return fmt.Errorf("failed to execute update org: %w", err)
	}
	return nil
}

func DeleteOrganization(id int64) error {
	_, err := DB.Exec("DELETE FROM organizations WHERE id = ?", id)
	return err
}
