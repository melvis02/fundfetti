package db

import (
	"database/sql"
	"fmt"
)

func CreateCampaign(c Campaign) (int64, error) {
	query := "INSERT INTO campaigns (organization_id, name, description, start_date, end_date, payment_metadata, instructions, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"

	if currentDriver == "postgres" {
		var id int64
		err := DB.QueryRow(Rebind(query+" RETURNING id"), c.OrganizationID, c.Name, c.Description, c.StartDate, c.EndDate, c.PaymentMetadata, c.Instructions, c.IsActive).Scan(&id)
		if err != nil {
			return 0, fmt.Errorf("failed to insert campaign: %w", err)
		}
		return id, nil
	}

	res, err := DB.Exec(query, c.OrganizationID, c.Name, c.Description, c.StartDate, c.EndDate, c.PaymentMetadata, c.Instructions, c.IsActive)
	if err != nil {
		return 0, fmt.Errorf("failed to execute insert campaign: %w", err)
	}

	return res.LastInsertId()
}

func GetCampaign(id int64) (*Campaign, error) {
	var c Campaign
	query := `
		SELECT c.id, c.organization_id, c.name, COALESCE(c.description, ''), c.start_date, c.end_date, COALESCE(c.payment_metadata, ''), COALESCE(c.instructions, ''), c.is_active, o.name, COALESCE(o.payment_metadata, '')
		FROM campaigns c
		JOIN organizations o ON c.organization_id = o.id
		WHERE c.id = ?
	`
	err := DB.QueryRow(Rebind(query), id).
		Scan(&c.ID, &c.OrganizationID, &c.Name, &c.Description, &c.StartDate, &c.EndDate, &c.PaymentMetadata, &c.Instructions, &c.IsActive, &c.OrganizationName, &c.OrganizationPaymentMetadata)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // Not found
		}
		return nil, fmt.Errorf("failed to get campaign: %w", err)
	}

	// Fetch products associated with this campaign
	products, err := GetCampaignProducts(id)
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign products: %w", err)
	}
	c.Products = products

	return &c, nil
}

func GetOrganizationCampaigns(orgID int64) ([]Campaign, error) {
	rows, err := DB.Query(Rebind("SELECT id, organization_id, name, COALESCE(description, ''), start_date, end_date, COALESCE(payment_metadata, ''), COALESCE(instructions, ''), is_active FROM campaigns WHERE organization_id = ? ORDER BY start_date DESC"), orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to query campaigns: %w", err)
	}
	defer rows.Close()

	campaigns := []Campaign{}
	for rows.Next() {
		var c Campaign
		if err := rows.Scan(&c.ID, &c.OrganizationID, &c.Name, &c.Description, &c.StartDate, &c.EndDate, &c.PaymentMetadata, &c.Instructions, &c.IsActive); err != nil {
			return nil, fmt.Errorf("failed to scan campaign: %w", err)
		}
		campaigns = append(campaigns, c)
	}
	return campaigns, nil
}

func GetActiveCampaigns() ([]Campaign, error) {
	query := `
		SELECT c.id, c.organization_id, c.name, COALESCE(c.description, ''), c.start_date, c.end_date, COALESCE(c.payment_metadata, ''), COALESCE(c.instructions, ''), c.is_active, o.name, COALESCE(o.payment_metadata, '')
		FROM campaigns c
		JOIN organizations o ON c.organization_id = o.id
		WHERE c.is_active = 1
		ORDER BY c.start_date DESC
	`
	if currentDriver == "postgres" {
		query = `
			SELECT c.id, c.organization_id, c.name, COALESCE(c.description, ''), c.start_date, c.end_date, COALESCE(c.payment_metadata, ''), COALESCE(c.instructions, ''), c.is_active, o.name, COALESCE(o.payment_metadata, '')
			FROM campaigns c
			JOIN organizations o ON c.organization_id = o.id
			WHERE c.is_active = true
			ORDER BY c.start_date DESC
		`
	}

	rows, err := DB.Query(Rebind(query))
	if err != nil {
		return nil, fmt.Errorf("failed to query active campaigns: %w", err)
	}
	defer rows.Close()

	campaigns := []Campaign{}
	for rows.Next() {
		var c Campaign
		if err := rows.Scan(&c.ID, &c.OrganizationID, &c.Name, &c.Description, &c.StartDate, &c.EndDate, &c.PaymentMetadata, &c.Instructions, &c.IsActive, &c.OrganizationName, &c.OrganizationPaymentMetadata); err != nil {
			return nil, fmt.Errorf("failed to scan campaign: %w", err)
		}
		campaigns = append(campaigns, c)
	}
	return campaigns, nil
}

// Deprecated: Use GetOrganizationCampaigns
func GetAllCampaigns() ([]Campaign, error) {
	rows, err := DB.Query(Rebind("SELECT id, organization_id, name, COALESCE(description, ''), start_date, end_date, COALESCE(payment_metadata, ''), COALESCE(instructions, ''), is_active FROM campaigns ORDER BY start_date DESC"))
	if err != nil {
		return nil, fmt.Errorf("failed to query campaigns: %w", err)
	}
	defer rows.Close()

	campaigns := []Campaign{}
	for rows.Next() {
		var c Campaign
		if err := rows.Scan(&c.ID, &c.OrganizationID, &c.Name, &c.Description, &c.StartDate, &c.EndDate, &c.PaymentMetadata, &c.Instructions, &c.IsActive); err != nil {
			return nil, fmt.Errorf("failed to scan campaign: %w", err)
		}
		campaigns = append(campaigns, c)
	}
	return campaigns, nil
}

func UpdateCampaign(c Campaign) error {
	_, err := DB.Exec(Rebind("UPDATE campaigns SET name = ?, description = ?, start_date = ?, end_date = ?, payment_metadata = ?, instructions = ?, is_active = ? WHERE id = ?"), c.Name, c.Description, c.StartDate, c.EndDate, c.PaymentMetadata, c.Instructions, c.IsActive, c.ID)
	return err
}

func DeleteCampaign(id int64) error {
	_, err := DB.Exec(Rebind("DELETE FROM campaigns WHERE id = ?"), id)
	return err
}

// Campaign Product Relationship Management

func AddProductToCampaign(campaignID, productID int64) error {
	_, err := DB.Exec(Rebind("INSERT INTO campaign_products (campaign_id, product_id) VALUES (?, ?) ON CONFLICT DO NOTHING"), campaignID, productID)
	return err
}

func RemoveProductFromCampaign(campaignID, productID int64) error {
	_, err := DB.Exec(Rebind("DELETE FROM campaign_products WHERE campaign_id = ? AND product_id = ?"), campaignID, productID)
	return err
}

func GetCampaignProducts(campaignID int64) ([]Product, error) {
	query := `
		SELECT p.id, p.name, p.description, p.price_cents, p.image_url, p.stock_quantity
		FROM products p
		JOIN campaign_products cp ON p.id = cp.product_id
		WHERE cp.campaign_id = ?
		ORDER BY p.name ASC
	`
	rows, err := DB.Query(Rebind(query), campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	products := []Product{}
	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.PriceCents, &p.ImageURL, &p.StockQuantity); err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, nil
}
