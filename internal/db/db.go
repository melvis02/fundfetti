package db

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/melvis02/flower-fundraiser-processing/internal/ordersheets"
	_ "modernc.org/sqlite"
)

var DB *sql.DB

func InitDB(dataSourceName string) error {
	var err error
	DB, err = sql.Open("sqlite", dataSourceName)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	if err = DB.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	createOrdersTable := `
	CREATE TABLE IF NOT EXISTS orders (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT,
		email TEXT,
		phone TEXT,
		picked_up BOOLEAN DEFAULT 0,
		paid BOOLEAN DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(name, email)
	);`

	createOrderItemsTable := `
	CREATE TABLE IF NOT EXISTS order_items (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		order_id INTEGER,
		plant_type TEXT,
		quantity INTEGER,
		FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
	);`

	if _, err := DB.Exec(createOrdersTable); err != nil {
		return fmt.Errorf("failed to create orders table: %w", err)
	}

	if _, err := DB.Exec(createOrderItemsTable); err != nil {
		return fmt.Errorf("failed to create order_items table: %w", err)
	}

	return nil
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
	err = tx.QueryRow("SELECT id FROM orders WHERE name = ? AND email = ?", order.Name, order.Email).Scan(&orderID)
	if err != nil && err != sql.ErrNoRows {
		return fmt.Errorf("failed to check existing order: %w", err)
	}

	if err == sql.ErrNoRows {
		// New order
		res, err := tx.Exec("INSERT INTO orders (name, email, phone) VALUES (?, ?, ?)", order.Name, order.Email, order.PhoneNumber)
		if err != nil {
			return fmt.Errorf("failed to insert order: %w", err)
		}
		orderID, err = res.LastInsertId()
		if err != nil {
			return fmt.Errorf("failed to get last insert id: %w", err)
		}
	} else {
		// Existing order - update phone if needed, but DO NOT overwrite picked_up/paid
		_, err = tx.Exec("UPDATE orders SET phone = ? WHERE id = ?", order.PhoneNumber, orderID)
		if err != nil {
			return fmt.Errorf("failed to update order: %w", err)
		}

		// Delete existing items to replace them (simplest way to handle CSV updates)
		_, err = tx.Exec("DELETE FROM order_items WHERE order_id = ?", orderID)
		if err != nil {
			return fmt.Errorf("failed to delete invalid order items: %w", err)
		}
	}

	// 2. Insert Order Items
	stmt, err := tx.Prepare("INSERT INTO order_items (order_id, plant_type, quantity) VALUES (?, ?, ?)")
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
	ID        int64
	Name      string
	Email     string
	Phone     string
	PickedUp  bool
	Paid      bool
	CreatedAt time.Time
	Items     []DBOrderItem
}

type DBOrderItem struct {
	PlantType string
	Quantity  int
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
		itemRows, err := DB.Query("SELECT plant_type, quantity FROM order_items WHERE order_id = ?", o.ID)
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
	_, err := DB.Exec("UPDATE orders SET picked_up = ?, paid = ? WHERE id = ?", pickedUp, paid, id)
	return err
}
