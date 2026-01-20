package main

import (
	"fmt"
	"log"
	"os"

	"github.com/melvis02/fundfetti/internal/auth"
	"github.com/melvis02/fundfetti/internal/db"
	_ "modernc.org/sqlite"
)

func main() {
	dbDriver := os.Getenv("DB_DRIVER")
	if dbDriver == "" {
		dbDriver = "sqlite"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		if dbDriver == "sqlite" {
			dbURL = "orders.db"
		} else {
			log.Fatal("DATABASE_URL is required")
		}
	}

	if err := db.InitDB(dbDriver, dbURL); err != nil {
		log.Fatalf("Failed to init db: %v", err)
	}

	email := os.Getenv("SEED_EMAIL")
	password := os.Getenv("SEED_PASSWORD")

	if email == "" || password == "" {
		log.Fatal("SEED_EMAIL and SEED_PASSWORD environment variables are required")
	}

	role := "global_admin"

	// Check if user exists
	existing, _ := db.GetUserByEmail(email)
	if existing != nil {
		fmt.Printf("User %s already exists. Resetting password...\n", email)
		// Update password logic could go here, but for now just skip or maybe delete/recreate
		// Since we didn't implement UpdateUser, let's just log it.
		hash, _ := auth.HashPassword(password)
		_, err := db.DB.Exec("UPDATE users SET password_hash = ? WHERE id = ?", hash, existing.ID)
		if err != nil {
			log.Fatalf("Failed to update password: %v", err)
		}
		fmt.Println("Password updated.")
		return
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	id, err := db.CreateUser(email, hash, role, nil)
	if err != nil {
		log.Fatalf("Failed to create user: %v", err)
	}

	fmt.Printf("User %s created with ID %d\n", email, id)
}
