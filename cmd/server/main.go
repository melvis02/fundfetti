package server

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"

	"github.com/melvis02/fundfetti/internal/db"
	"github.com/melvis02/fundfetti/internal/ordersheets"
)

func StartServer() {

	// Initialize Database
	if err := db.InitDB("orders.db"); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	router := mux.NewRouter()

	// Unified Modern Routes - JSON API
	router.HandleFunc("/api/orders", getOrdersHandler).Methods("GET")
	router.HandleFunc("/api/upload", uploadHandler).Methods("POST")
	router.HandleFunc("/api/orders", createOrderHandler).Methods("POST")
	router.HandleFunc("/api/orders/{id}/status", orderStatusHandler).Methods("POST")

	// Organization API
	router.HandleFunc("/api/organizations", listOrganizationsHandler).Methods("GET")
	router.HandleFunc("/api/organizations", createOrganizationHandler).Methods("POST")
	router.HandleFunc("/api/organizations/{id}", getOrganizationHandler).Methods("GET")
	router.HandleFunc("/api/organizations/{id}", updateOrganizationHandler).Methods("PUT")
	router.HandleFunc("/api/organizations/{id}", deleteOrganizationHandler).Methods("DELETE")

	// Nested Resources under Organizations
	router.HandleFunc("/api/organizations/{org_id}/products", listProductsHandler).Methods("GET")
	router.HandleFunc("/api/organizations/{org_id}/products", createProductHandler).Methods("POST")
	router.HandleFunc("/api/organizations/{org_id}/campaigns", listCampaignsHandler).Methods("GET")
	router.HandleFunc("/api/organizations/{org_id}/campaigns", createCampaignHandler).Methods("POST")

	// Product API (Global/Direct access) - Consider deprecating or making Admin only
	router.HandleFunc("/api/products", listProductsHandler).Methods("GET")
	router.HandleFunc("/api/products", createProductHandler).Methods("POST")
	router.HandleFunc("/api/products/{id}", getProductHandler).Methods("GET")
	router.HandleFunc("/api/products/{id}", updateProductHandler).Methods("PUT")
	router.HandleFunc("/api/products/{id}", deleteProductHandler).Methods("DELETE")

	// Campaign API (Global/Direct access)
	router.HandleFunc("/api/campaigns", listCampaignsHandler).Methods("GET")
	router.HandleFunc("/api/campaigns", createCampaignHandler).Methods("POST")
	router.HandleFunc("/api/campaigns/{id}", getCampaignHandler).Methods("GET")
	router.HandleFunc("/api/campaigns/{id}", updateCampaignHandler).Methods("PUT")
	router.HandleFunc("/api/campaigns/{id}", deleteCampaignHandler).Methods("DELETE")
	router.HandleFunc("/api/campaigns/{id}/products", addCampaignProductHandler).Methods("POST")
	router.HandleFunc("/api/campaigns/{id}/products/{product_id}", removeCampaignProductHandler).Methods("DELETE")

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
	if campaignIDStr != "" {
		if id, err := strconv.ParseInt(campaignIDStr, 10, 64); err == nil {
			campaignID = &id
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
