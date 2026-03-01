package db

import (
	"database/sql"
	"fmt"
	"time"
)

type Category struct {
	ID             int64     `json:"id"`
	OrganizationID int64     `json:"organization_id"`
	Name           string    `json:"name"`
	CreatedAt      time.Time `json:"created_at"`
}

func CreateCategory(c Category) (int64, error) {
	query := "INSERT INTO categories (organization_id, name) VALUES (?, ?)"

	if currentDriver == "postgres" {
		var id int64
		err := DB.QueryRow(Rebind(query+" RETURNING id"), c.OrganizationID, c.Name).Scan(&id)
		if err != nil {
			return 0, fmt.Errorf("failed to insert category: %w", err)
		}
		return id, nil
	}

	res, err := DB.Exec(query, c.OrganizationID, c.Name)
	if err != nil {
		return 0, fmt.Errorf("failed to execute insert category: %w", err)
	}

	return res.LastInsertId()
}

func GetOrganizationCategories(orgID int64) ([]Category, error) {
	rows, err := DB.Query(Rebind("SELECT id, organization_id, name, created_at FROM categories WHERE organization_id = ? ORDER BY name ASC"), orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to query categories: %w", err)
	}
	defer rows.Close()

	categories := []Category{}
	for rows.Next() {
		var c Category
		if err := rows.Scan(&c.ID, &c.OrganizationID, &c.Name, &c.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan category: %w", err)
		}
		categories = append(categories, c)
	}
	return categories, nil
}

func GetCategory(id int64) (*Category, error) {
	var c Category
	err := DB.QueryRow(Rebind("SELECT id, organization_id, name, created_at FROM categories WHERE id = ?"), id).
		Scan(&c.ID, &c.OrganizationID, &c.Name, &c.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // Not found
		}
		return nil, fmt.Errorf("failed to get category: %w", err)
	}
	return &c, nil
}

func UpdateCategory(c Category) error {
	_, err := DB.Exec(Rebind("UPDATE categories SET name = ? WHERE id = ?"), c.Name, c.ID)
	return err
}

func DeleteCategory(id int64) error {
	// Let the database handle cascading deletes or setting to null if configured in schema.
	_, err := DB.Exec(Rebind("DELETE FROM categories WHERE id = ?"), id)
	return err
}
