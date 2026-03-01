package db

import (
	"database/sql"
	"fmt"
)

func CreateProduct(p Product) (int64, error) {
	query := "INSERT INTO products (organization_id, category_id, name, description, price_cents, image_url, stock_quantity) VALUES (?, ?, ?, ?, ?, ?, ?)"

	if currentDriver == "postgres" {
		var id int64
		err := DB.QueryRow(Rebind(query+" RETURNING id"), p.OrganizationID, p.CategoryID, p.Name, p.Description, p.PriceCents, p.ImageURL, p.StockQuantity).Scan(&id)
		if err != nil {
			return 0, fmt.Errorf("failed to insert product: %w", err)
		}
		return id, nil
	}

	res, err := DB.Exec(query, p.OrganizationID, p.CategoryID, p.Name, p.Description, p.PriceCents, p.ImageURL, p.StockQuantity)
	if err != nil {
		return 0, fmt.Errorf("failed to execute insert product: %w", err)
	}

	return res.LastInsertId()
}

func GetProduct(id int64) (*Product, error) {
	var p Product
	err := DB.QueryRow(Rebind("SELECT id, organization_id, category_id, name, COALESCE(description, ''), price_cents, COALESCE(image_url, ''), stock_quantity FROM products WHERE id = ?"), id).
		Scan(&p.ID, &p.OrganizationID, &p.CategoryID, &p.Name, &p.Description, &p.PriceCents, &p.ImageURL, &p.StockQuantity)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // Not found
		}
		return nil, fmt.Errorf("failed to get product: %w", err)
	}
	return &p, nil
}

func GetOrganizationProducts(orgID int64) ([]Product, error) {
	rows, err := DB.Query(Rebind("SELECT id, organization_id, category_id, name, COALESCE(description, ''), price_cents, COALESCE(image_url, ''), stock_quantity FROM products WHERE organization_id = ? ORDER BY name ASC"), orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to query products: %w", err)
	}
	defer rows.Close()

	products := []Product{}
	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.ID, &p.OrganizationID, &p.CategoryID, &p.Name, &p.Description, &p.PriceCents, &p.ImageURL, &p.StockQuantity); err != nil {
			return nil, fmt.Errorf("failed to scan product: %w", err)
		}
		products = append(products, p)
	}
	return products, nil
}

// Deprecated: Use GetOrganizationProducts
func GetAllProducts() ([]Product, error) {
	rows, err := DB.Query(Rebind("SELECT id, organization_id, category_id, name, COALESCE(description, ''), price_cents, COALESCE(image_url, ''), stock_quantity FROM products ORDER BY name ASC"))
	if err != nil {
		return nil, fmt.Errorf("failed to query products: %w", err)
	}
	defer rows.Close()

	products := []Product{}
	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.ID, &p.OrganizationID, &p.CategoryID, &p.Name, &p.Description, &p.PriceCents, &p.ImageURL, &p.StockQuantity); err != nil {
			return nil, fmt.Errorf("failed to scan product: %w", err)
		}
		products = append(products, p)
	}
	return products, nil
}

func UpdateProduct(p Product) error {
	_, err := DB.Exec(Rebind("UPDATE products SET category_id = ?, name = ?, description = ?, price_cents = ?, image_url = ?, stock_quantity = ? WHERE id = ?"), p.CategoryID, p.Name, p.Description, p.PriceCents, p.ImageURL, p.StockQuantity, p.ID)
	return err
}

func DeleteProduct(id int64) error {
	_, err := DB.Exec(Rebind("DELETE FROM products WHERE id = ?"), id)
	return err
}

func GetProductByName(orgID int64, name string) (*Product, error) {
	var p Product
	err := DB.QueryRow(Rebind("SELECT id, organization_id, category_id, name, COALESCE(description, ''), price_cents, COALESCE(image_url, ''), stock_quantity FROM products WHERE organization_id = ? AND name = ?"), orgID, name).
		Scan(&p.ID, &p.OrganizationID, &p.CategoryID, &p.Name, &p.Description, &p.PriceCents, &p.ImageURL, &p.StockQuantity)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // Not found
		}
		return nil, fmt.Errorf("failed to get product by name: %w", err)
	}
	return &p, nil
}
