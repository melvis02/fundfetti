package db

import (
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"

	_ "github.com/lib/pq"
	"github.com/melvis02/fundfetti/internal/ordersheets"
	_ "modernc.org/sqlite"
)

var DB *sql.DB
var currentDriver string

func Rebind(query string) string {
	if currentDriver != "postgres" {
		return query
	}

	// Replace ? with $1, $2, etc.
	// This is a simple implementation assuming ? is not used in string literals.
	// For this project, it's sufficient.
	count := 0
	result := strings.Builder{}
	for _, char := range query {
		if char == '?' {
			count++
			result.WriteString(fmt.Sprintf("$%d", count))
		} else {
			result.WriteRune(char)
		}
	}
	res := result.String()
	log.Printf("[DEBUG] Rebind: %s -> %s", query, res)
	return res
}

func InitDB(driverName, dataSourceName string) error {
	currentDriver = driverName
	var err error
	DB, err = sql.Open(driverName, dataSourceName)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	if err = DB.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	// Dialect helpers
	primaryKeyDef := "INTEGER PRIMARY KEY AUTOINCREMENT"
	if driverName == "postgres" {
		primaryKeyDef = "SERIAL PRIMARY KEY"
	}

	// Existing Tables
	createOrdersTable := fmt.Sprintf(`
	CREATE TABLE IF NOT EXISTS orders (
		id %s,
		name TEXT,
		email TEXT,
		phone TEXT,
		picked_up BOOLEAN DEFAULT FALSE,
		paid BOOLEAN DEFAULT FALSE,
		campaign_id INTEGER,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(name, email)
	);`, primaryKeyDef)

	createOrderItemsTable := fmt.Sprintf(`
	CREATE TABLE IF NOT EXISTS order_items (
		id %s,
		order_id INTEGER,
		plant_type TEXT,
		quantity INTEGER,
		FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
	);`, primaryKeyDef)

	// New Tables for Features
	createOrganizationsTable := fmt.Sprintf(`
	CREATE TABLE IF NOT EXISTS organizations (
		id %s,
		name TEXT NOT NULL,
		slug TEXT NOT NULL UNIQUE,
		contact_email TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`, primaryKeyDef)

	createUsersTable := fmt.Sprintf(`
	CREATE TABLE IF NOT EXISTS users (
		id %s,
		email TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		role TEXT NOT NULL DEFAULT 'org_admin',
		organization_id INTEGER,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(organization_id) REFERENCES organizations(id) ON DELETE SET NULL
	);`, primaryKeyDef)

	createProductsTable := fmt.Sprintf(`
	CREATE TABLE IF NOT EXISTS products (
		id %s,
		organization_id INTEGER,
		name TEXT NOT NULL,
		description TEXT,
		price_cents INTEGER DEFAULT 0,
		image_url TEXT,
		stock_quantity INTEGER DEFAULT -1,
		FOREIGN KEY(organization_id) REFERENCES organizations(id) ON DELETE CASCADE
	);`, primaryKeyDef)

	createCampaignsTable := fmt.Sprintf(`
	CREATE TABLE IF NOT EXISTS campaigns (
		id %s,
		organization_id INTEGER,
		name TEXT NOT NULL,
		description TEXT,
		start_date TIMESTAMP,
		end_date TIMESTAMP,
		payment_metadata TEXT,
		instructions TEXT,
		is_active BOOLEAN DEFAULT TRUE,
		FOREIGN KEY(organization_id) REFERENCES organizations(id) ON DELETE CASCADE
	);`, primaryKeyDef)

	createCampaignProductsTable := `
	CREATE TABLE IF NOT EXISTS campaign_products (
		campaign_id INTEGER,
		product_id INTEGER,
		PRIMARY KEY (campaign_id, product_id),
		FOREIGN KEY(campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
		FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
	);`

	queries := []string{
		createOrdersTable,
		createOrderItemsTable,
		createOrganizationsTable,
		createUsersTable,
		createProductsTable,
		createCampaignsTable,
		createCampaignProductsTable,
	}

	for _, query := range queries {
		// SQLite uses 0/1 for booleans, Postgres allows TRUE/FALSE constants but defaults need care
		// Actually, standard SQL boolean works in Postgres. SQLite accepts 'TRUE'/'FALSE' usually but maps to 1/0.
		// Let's ensure compatibility.
		// My definitions above use `BOOLEAN DEFAULT FALSE` which is valid in generic SQL (SQLite maps to NUMERIC).
		// Wait, SQLite `BOOLEAN` affinity is NUMERIC. `DEFAULT 0` is safer than `FALSE` for SQLite if we rely on it being 0/1.
		// However, Postgres `BOOLEAN` is a real type. `0` might be invalid for boolean in Postgres depending on strictness.
		// Postgres: `DEFAULT FALSE` is correct. `DEFAULT 0` is error.
		// SQLite: `DEFAULT FALSE` works (maps to 0).
		// So using `FALSE`/`TRUE` is actually better for cross-compat than `0`/`1`.

		if _, err := DB.Exec(query); err != nil {
			return fmt.Errorf("failed to create table: %w \n Query: %s", err, query)
		}
	}

	// Migrations (Idempotent operations)
	// These are tricky cross-DB.
	// ADD COLUMN IF NOT EXISTS is Postgres 9.6+. SQLite supports basic ADD COLUMN.
	// Simple approach: Ignore error or check for column existence.
	// Since this is a "migration" step for existing deployments, and I want to be safe:
	// I will use a helper to add column safely.

	ignoreErr := func(err error) {
		if err != nil {
			// Log but don't fail, assuming it might be "duplicate column"
			log.Printf("Migration warning (might be already applied): %v", err)
		}
	}

	// Orders: campaign_id
	ignoreErr(addColumn(driverName, "orders", "campaign_id", "INTEGER"))

	// Products: organization_id
	ignoreErr(addColumn(driverName, "products", "organization_id", "INTEGER"))

	// Campaigns: organization_id
	ignoreErr(addColumn(driverName, "campaigns", "organization_id", "INTEGER"))

	return nil
}

func addColumn(driver, table, column, colType string) error {
	// Postgres requires 'ADD COLUMN', SQLite works with 'ADD' or 'ADD COLUMN'
	// 'IF NOT EXISTS' for columns is newer.
	query := fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s;", table, column, colType)
	if driver == "postgres" {
		query = fmt.Sprintf("ALTER TABLE %s ADD COLUMN IF NOT EXISTS %s %s;", table, column, colType)
	}
	_, err := DB.Exec(query)
	// SQLite will error if column exists. Postgres with IF NOT EXISTS won't.
	// We handle SQLite error in the caller by ignoring it, or we could query schema.
	// For now, ignoring error is 'okay' for this simple migration script.
	if driver == "sqlite" && err != nil && strings.Contains(err.Error(), "duplicate column") {
		return nil
	}
	return err
}

func UpsertOrder(order ordersheets.Order) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Insert or Get Order ID (Upsert on name, email)
	var orderID int64

	// Try to find existing order
	err = tx.QueryRow(Rebind("SELECT id FROM orders WHERE name = ? AND email = ?"), order.Name, order.Email).Scan(&orderID)
	if err != nil && err != sql.ErrNoRows {
		return fmt.Errorf("failed to check existing order: %w", err)
	}

	if err == sql.ErrNoRows {
		// New order
		insertQuery := "INSERT INTO orders (name, email, phone, campaign_id) VALUES (?, ?, ?, ?)"
		if currentDriver == "postgres" {
			err := tx.QueryRow(Rebind(insertQuery+" RETURNING id"), order.Name, order.Email, order.PhoneNumber, order.CampaignID).Scan(&orderID)
			if err != nil {
				return fmt.Errorf("failed to insert order: %w", err)
			}
		} else {
			res, err := tx.Exec(insertQuery, order.Name, order.Email, order.PhoneNumber, order.CampaignID)
			if err != nil {
				return fmt.Errorf("failed to insert order: %w", err)
			}
			orderID, err = res.LastInsertId()
			if err != nil {
				return fmt.Errorf("failed to get last insert id: %w", err)
			}
		}
	} else {
		// Existing order - update phone if needed, but DO NOT overwrite picked_up/paid
		// Also update campaign_id if it's set on the incoming order (assuming we want to link it if it wasn't linked or update it)
		// For now, let's just update phone and campaign_id
		_, err = tx.Exec(Rebind("UPDATE orders SET phone = ?, campaign_id = COALESCE(?, campaign_id) WHERE id = ?"), order.PhoneNumber, order.CampaignID, orderID)
		if err != nil {
			return fmt.Errorf("failed to update order: %w", err)
		}

		// Delete existing items to replace them (simplest way to handle CSV updates)
		_, err = tx.Exec(Rebind("DELETE FROM order_items WHERE order_id = ?"), orderID)
		if err != nil {
			return fmt.Errorf("failed to delete invalid order items: %w", err)
		}
	}

	// 2. Insert Order Items
	stmt, err := tx.Prepare(Rebind("INSERT INTO order_items (order_id, plant_type, quantity) VALUES (?, ?, ?)"))
	if err != nil {
		return fmt.Errorf("failed to prepare item statement: %w", err)
	}
	defer stmt.Close()

	for _, item := range order.OrderedPlants {
		if _, err := stmt.Exec(orderID, item.PlantType, item.Quantity); err != nil {
			return fmt.Errorf("failed to insert order item: %w", err)
		}
	}

	return tx.Commit()
}

type DBOrder struct {
	ID         int64
	CampaignID *int64 // Nullable
	Name       string
	Email      string
	Phone      string
	PickedUp   bool
	Paid       bool
	CreatedAt  time.Time
	Items      []DBOrderItem
}

type DBOrderItem struct {
	PlantType string
	Quantity  int
}

type DBUser struct {
	ID             int64     `json:"id"`
	Email          string    `json:"email"`
	PasswordHash   string    `json:"-"` // Never expose password hash
	Role           string    `json:"role"`
	OrganizationID *int64    `json:"org_id"`
	CreatedAt      time.Time `json:"created_at"`
}

type Organization struct {
	ID           int64     `json:"id"`
	Name         string    `json:"name"`
	Slug         string    `json:"slug"`
	ContactEmail string    `json:"contact_email"`
	CreatedAt    time.Time `json:"created_at"`
}

type Product struct {
	ID             int64  `json:"id"`
	OrganizationID int64  `json:"organization_id"`
	Name           string `json:"name"`
	Description    string `json:"description"`
	PriceCents     int    `json:"price_cents"`
	ImageURL       string `json:"image_url"`
	StockQuantity  int    `json:"stock_quantity"` // -1 for unlimited
}

type Campaign struct {
	ID              int64     `json:"id"`
	OrganizationID  int64     `json:"organization_id"`
	Name            string    `json:"name"`
	Description     string    `json:"description"`
	StartDate       time.Time `json:"start_date"`
	EndDate         time.Time `json:"end_date"`
	PaymentMetadata string    `json:"payment_metadata"` // JSON string or text
	Instructions    string    `json:"instructions"`
	IsActive        bool      `json:"is_active"`
	Products        []Product `json:"products,omitempty"`
}

func GetOrders() ([]DBOrder, error) {
	rows, err := DB.Query("SELECT id, name, email, phone, picked_up, paid, created_at FROM orders ORDER BY name ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []DBOrder
	for rows.Next() {
		var o DBOrder
		if err := rows.Scan(&o.ID, &o.Name, &o.Email, &o.Phone, &o.PickedUp, &o.Paid, &o.CreatedAt); err != nil {
			log.Printf("Error scanning order: %v", err)
			continue
		}

		// Only fetching basic info for the list view for now.
		// If we need items in the main list, we can add a subquery or join later.
		// For the requested "Manage Orders" view (Name, Phone, Total Items, Status), logic below:

		// Fetch item count or details
		itemRows, err := DB.Query(Rebind("SELECT plant_type, quantity FROM order_items WHERE order_id = ?"), o.ID)
		if err == nil {
			defer itemRows.Close()
			for itemRows.Next() {
				var i DBOrderItem
				if err := itemRows.Scan(&i.PlantType, &i.Quantity); err == nil {
					o.Items = append(o.Items, i)
				}
			}
		}

		orders = append(orders, o)
	}
	return orders, nil
}

func GetOrganizationOrders(orgID int64) ([]DBOrder, error) {
	query := `
		SELECT o.id, o.name, o.email, o.phone, o.picked_up, o.paid, o.created_at 
		FROM orders o
		JOIN campaigns c ON o.campaign_id = c.id
		WHERE c.organization_id = ?
		ORDER BY o.name ASC
	`
	rows, err := DB.Query(Rebind(query), orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []DBOrder
	for rows.Next() {
		var o DBOrder
		if err := rows.Scan(&o.ID, &o.Name, &o.Email, &o.Phone, &o.PickedUp, &o.Paid, &o.CreatedAt); err != nil {
			log.Printf("Error scanning order: %v", err)
			continue
		}

		// Fetch item count or details
		itemRows, err := DB.Query(Rebind("SELECT plant_type, quantity FROM order_items WHERE order_id = ?"), o.ID)
		if err == nil {
			defer itemRows.Close()
			for itemRows.Next() {
				var i DBOrderItem
				if err := itemRows.Scan(&i.PlantType, &i.Quantity); err == nil {
					o.Items = append(o.Items, i)
				}
			}
		}

		orders = append(orders, o)
	}
	return orders, nil
}

func UpdateOrderStatus(id int64, pickedUp, paid bool) error {
	_, err := DB.Exec(Rebind("UPDATE orders SET picked_up = ?, paid = ? WHERE id = ?"), pickedUp, paid, id)
	return err
}
