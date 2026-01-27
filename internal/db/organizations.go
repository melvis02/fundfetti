package db

import (
	"database/sql"
	"fmt"
)

func CreateOrganization(org Organization) (int64, error) {
	query := "INSERT INTO organizations (name, slug, contact_email, payment_metadata) VALUES (?, ?, ?, ?)"

	if currentDriver == "postgres" {
		var id int64
		err := DB.QueryRow(Rebind(query+" RETURNING id"), org.Name, org.Slug, org.ContactEmail, org.PaymentMetadata).Scan(&id)
		if err != nil {
			return 0, fmt.Errorf("failed to insert org: %w", err)
		}
		return id, nil
	}

	res, err := DB.Exec(query, org.Name, org.Slug, org.ContactEmail, org.PaymentMetadata)
	if err != nil {
		return 0, fmt.Errorf("failed to execute insert org: %w", err)
	}

	return res.LastInsertId()
}

func GetOrganization(id int64) (*Organization, error) {
	var org Organization
	err := DB.QueryRow(Rebind("SELECT id, name, slug, contact_email, COALESCE(payment_metadata, ''), created_at FROM organizations WHERE id = ?"), id).
		Scan(&org.ID, &org.Name, &org.Slug, &org.ContactEmail, &org.PaymentMetadata, &org.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // Not found
		}
		return nil, fmt.Errorf("failed to get org: %w", err)
	}
	return &org, nil
}

func GetAllOrganizations() ([]Organization, error) {
	rows, err := DB.Query(Rebind("SELECT id, name, slug, contact_email, COALESCE(payment_metadata, ''), created_at FROM organizations ORDER BY name ASC"))
	if err != nil {
		return nil, fmt.Errorf("failed to query orgs: %w", err)
	}
	defer rows.Close()

	orgs := []Organization{}
	for rows.Next() {
		var org Organization
		if err := rows.Scan(&org.ID, &org.Name, &org.Slug, &org.ContactEmail, &org.PaymentMetadata, &org.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan org: %w", err)
		}
		orgs = append(orgs, org)
	}
	return orgs, nil
}

func UpdateOrganization(org Organization) error {
	_, err := DB.Exec(Rebind("UPDATE organizations SET name = ?, slug = ?, contact_email = ?, payment_metadata = ? WHERE id = ?"), org.Name, org.Slug, org.ContactEmail, org.PaymentMetadata, org.ID)
	return err
}

func DeleteOrganization(id int64) error {
	_, err := DB.Exec(Rebind("DELETE FROM organizations WHERE id = ?"), id)
	return err
}
