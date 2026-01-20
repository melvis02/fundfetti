package main

import (
	"fmt"
	"log"

	"github.com/melvis02/fundfetti/internal/auth"
	"github.com/melvis02/fundfetti/internal/db"
	_ "modernc.org/sqlite"
)

func main() {
	if err := db.InitDB("orders.db"); err != nil {
		log.Fatalf("Failed to init db: %v", err)
	}

	email := "admin@fundfetti.com"
	password := "admin123"
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
