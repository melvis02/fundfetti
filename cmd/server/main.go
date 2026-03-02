package server

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"

	"github.com/melvis02/fundfetti/internal/auth"
	"github.com/melvis02/fundfetti/internal/db"
	"github.com/melvis02/fundfetti/internal/ordersheets"
)

func StartServer() {

	// Database Config
	dbDriver := os.Getenv("DB_DRIVER")
	if dbDriver == "" {
		dbDriver = "sqlite" // default to sqlite for backward compatibility
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		if dbDriver == "sqlite" {
			dbURL = "orders.db"
		} else {
			log.Fatal("DATABASE_URL environment variable is required for non-sqlite drivers")
		}
	}

	// Initialize Database
	log.Printf("Connecting to database (%s)...", dbDriver)
	if err := db.InitDB(dbDriver, dbURL); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	router := mux.NewRouter()

	// Auth Routes
	router.HandleFunc("/api/auth/login", auth.LoginHandler).Methods("POST")
	router.HandleFunc("/api/auth/logout", auth.LogoutHandler).Methods("POST")
	router.HandleFunc("/api/auth/me", auth.MeHandler).Methods("GET")

	// Public Routes
	router.HandleFunc("/api/orders", createOrderHandler).Methods("POST")
	router.HandleFunc("/api/campaigns/{id}", getCampaignHandler).Methods("GET")
	router.HandleFunc("/api/campaigns", listCampaignsHandler).Methods("GET") // Public for now
	router.HandleFunc("/api/products", listProductsHandler).Methods("GET")   // Public for now
	router.HandleFunc("/api/public/campaigns/{org_slug}/{campaign_slug}", getCampaignBySlugHandler).Methods("GET")

	// Protected Admin Routes
	adminRouter := router.PathPrefix("/api").Subrouter()
	adminRouter.Use(auth.AuthMiddleware)
	adminRouter.Use(auth.BlockReaderMutations)

	// Admin: Orders
	adminRouter.HandleFunc("/orders", getOrdersHandler).Methods("GET")
	adminRouter.HandleFunc("/upload", uploadHandler).Methods("POST")
	adminRouter.HandleFunc("/orders/{id}/status", orderStatusHandler).Methods("POST")

	// Admin: Users
	adminRouter.HandleFunc("/users", auth.ListUsersHandler).Methods("GET")
	adminRouter.HandleFunc("/users", auth.CreateUserHandler).Methods("POST")
	adminRouter.HandleFunc("/users/{id}", auth.UpdateUserHandler).Methods("PUT")
	adminRouter.HandleFunc("/users/{id}", auth.DeleteUserHandler).Methods("DELETE")

	// Admin: Organizations
	adminRouter.HandleFunc("/organizations", listOrganizationsHandler).Methods("GET")
	adminRouter.Handle("/organizations", auth.RequireRole("global_admin")(http.HandlerFunc(createOrganizationHandler))).Methods("POST")
	adminRouter.HandleFunc("/organizations/{id}", getOrganizationHandler).Methods("GET")
	adminRouter.HandleFunc("/organizations/{id}", updateOrganizationHandler).Methods("PUT")
	adminRouter.HandleFunc("/organizations/{id}", deleteOrganizationHandler).Methods("DELETE")

	// Admin: Nested Resources
	adminRouter.HandleFunc("/organizations/{org_id}/products", listProductsHandler).Methods("GET")
	adminRouter.HandleFunc("/organizations/{org_id}/products", createProductHandler).Methods("POST")
	adminRouter.HandleFunc("/organizations/{org_id}/products/import", importProductsHandler).Methods("POST")
	adminRouter.HandleFunc("/organizations/{org_id}/campaigns", listCampaignsHandler).Methods("GET")
	adminRouter.HandleFunc("/organizations/{org_id}/campaigns", createCampaignHandler).Methods("POST")
	adminRouter.HandleFunc("/organizations/{org_id}/categories", listCategoriesHandler).Methods("GET")
	adminRouter.HandleFunc("/organizations/{org_id}/categories", createCategoryHandler).Methods("POST")

	// Admin: Product Modification (Global/Direct)
	adminRouter.HandleFunc("/products", createProductHandler).Methods("POST")
	adminRouter.HandleFunc("/products/{id}", getProductHandler).Methods("GET")
	adminRouter.HandleFunc("/products/{id}", updateProductHandler).Methods("PUT")
	adminRouter.HandleFunc("/products/{id}", deleteProductHandler).Methods("DELETE")

	// Admin: Campaign Modification (Global/Direct)
	adminRouter.HandleFunc("/campaigns", createCampaignHandler).Methods("POST")
	// getCampaignHandler is public above
	adminRouter.HandleFunc("/campaigns/{id}", updateCampaignHandler).Methods("PUT")
	adminRouter.HandleFunc("/campaigns/{id}", deleteCampaignHandler).Methods("DELETE")
	adminRouter.HandleFunc("/campaigns/{id}/products", addCampaignProductHandler).Methods("POST")
	adminRouter.HandleFunc("/campaigns/{id}/products/{product_id}", removeCampaignProductHandler).Methods("DELETE")

	// Admin: Category Modification (Global/Direct)
	adminRouter.HandleFunc("/categories/{id}", updateCategoryHandler).Methods("PUT")
	adminRouter.HandleFunc("/categories/{id}", deleteCategoryHandler).Methods("DELETE")

	// SPA Handler (Serve React App)
	// 1. Serve static assets directly
	assetsHandler := http.StripPrefix("/assets/", http.FileServer(http.Dir("frontend/dist/assets")))
	router.PathPrefix("/assets/").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		assetsHandler.ServeHTTP(w, r)
	})

	// 2. Serve public assets (legacy or shared)
	router.PathPrefix("/public/").Handler(http.StripPrefix("/public/", http.FileServer(http.Dir("public"))))

	// 3. Catch-all: Serve index.html for React Router
	router.PathPrefix("/").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		w.Header().Set("Pragma", "no-cache")
		w.Header().Set("Expires", "0")
		http.ServeFile(w, r, "frontend/dist/index.html")
	})

	port, ok := os.LookupEnv("PORT")
	if !ok {
		port = "8080"
	}

	loggedRouter := handlers.LoggingHandler(os.Stdout, router)

	addr := fmt.Sprintf(":%s", port)
	server := http.Server{
		Addr:         addr,
		Handler:      loggedRouter,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  15 * time.Second,
	}
	log.Println("[cmd/server/main] Running web server on port", port)
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("[cmd/server/main] couldn't start web server: %v\n", err)
	}
}

func getOrdersHandler(w http.ResponseWriter, r *http.Request) {
	var orders []db.DBOrder
	var err error

	orgIDStr := r.URL.Query().Get("org_id")
	if orgIDStr != "" {
		if orgID, parseErr := strconv.ParseInt(orgIDStr, 10, 64); parseErr == nil {
			orders, err = db.GetOrganizationOrders(orgID)
		} else {
			http.Error(w, "Invalid org_id", http.StatusBadRequest)
			return
		}
	} else {
		orders, err = db.GetOrders()
	}

	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get orders: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(orders)
}

func uploadHandler(w http.ResponseWriter, r *http.Request) {
	file, header, err := r.FormFile("orders_sheets")
	if err != nil {
		http.Error(w, "Error retrieving file: "+err.Error(), http.StatusBadRequest)
	}
	defer file.Close()

	buf := bytes.NewBuffer(nil)
	if _, err := io.Copy(buf, file); err != nil {
		http.Error(w, "Error reading file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	data := ordersheets.ReadFile(buf.Bytes(), header.Filename)
	orders := ordersheets.FormatOrderSheet(data)

	campaignIDStr := r.FormValue("campaign_id")
	var campaignID *int64
	var orgID int64
	if campaignIDStr != "" {
		if id, err := strconv.ParseInt(campaignIDStr, 10, 64); err == nil {
			campaignID = &id
			// Get org_id from campaign
			campaign, err := db.GetCampaign(id)
			if err == nil && campaign != nil {
				orgID = campaign.OrganizationID
			}
		}
	}

	// Auto-create products if they don't exist
	if orgID != 0 {
		productNames := make(map[string]bool)
		for _, order := range orders {
			for _, plant := range order.OrderedPlants {
				productNames[plant.PlantType] = true
			}
		}

		priceRegex := regexp.MustCompile(`(?i)\s*[-–—]?\s*\$(\d+(\.\d{2})?)\s*`)

		for productName := range productNames {
			cleanName := productName
			priceCents := 0

			matches := priceRegex.FindStringSubmatch(productName)
			if len(matches) > 1 {
				priceStr := matches[1]
				if price, err := strconv.ParseFloat(priceStr, 64); err == nil {
					priceCents = int(price * 100)
					cleanName = strings.TrimSpace(priceRegex.ReplaceAllString(productName, " "))
					// Clean up any double spaces
					cleanName = regexp.MustCompile(`\s+`).ReplaceAllString(cleanName, " ")
				}
			}

			p, err := db.GetProductByName(orgID, cleanName)
			if err != nil {
				log.Printf("Error checking product %s: %v", cleanName, err)
				continue
			}

			var productID int64
			if p == nil {
				// Create new product
				newID, err := db.CreateProduct(db.Product{
					OrganizationID: orgID,
					Name:           cleanName,
					PriceCents:     priceCents,
					StockQuantity:  -1,
				})
				if err != nil {
					log.Printf("Failed to create product %s: %v", cleanName, err)
					continue
				}
				productID = newID
				log.Printf("Auto-created product: %s  at $%d.%02d (ID: %d)", cleanName, priceCents/100, priceCents%100, productID)
			} else {
				productID = p.ID
				// If existing product has 0 price but we found a price in the CSV, update it?
				// User didn't explicitly ask for update, but it's a nice touch.
				// However, if they have an existing price, we shouldn't overwrite it unless it's 0.
				if p.PriceCents == 0 && priceCents != 0 {
					p.PriceCents = priceCents
					db.UpdateProduct(*p)
					log.Printf("Updated existing product price: %s to $%d.%02d", cleanName, priceCents/100, priceCents%100)
				}
			}

			// Ensure product is linked to campaign
			if campaignID != nil {
				if err := db.AddProductToCampaign(*campaignID, productID); err != nil {
					log.Printf("Failed to link product %d to campaign %d: %v", productID, *campaignID, err)
				}
			}
		}
	}

	// Persist orders to DB
	count := 0
	for _, order := range orders {
		order.CampaignID = campaignID
		if err := db.UpsertOrder(order); err != nil {
			log.Printf("Failed to upsert order for %s: %v", order.Name, err)
		} else {
			count++
		}
	}
	log.Printf("Imported/Updated %d orders", count)

	// Return updated list
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "ok",
		"count":   count,
		"message": fmt.Sprintf("Imported %d orders", count),
	})
}

func orderStatusHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	idStr := vars["id"]
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid Order ID", http.StatusBadRequest)
		return
	}

	var req struct {
		PickedUp bool `json:"picked_up"`
		Paid     bool `json:"paid"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := db.UpdateOrderStatus(id, req.PickedUp, req.Paid); err != nil {
		http.Error(w, fmt.Sprintf("Failed to update order: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
