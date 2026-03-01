package server

import (
	"encoding/csv"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/melvis02/fundfetti/internal/db"
	"github.com/melvis02/fundfetti/internal/email"
	"github.com/melvis02/fundfetti/internal/ordersheets"
)

// -- Orders --

func createOrderHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CampaignID int64                      `json:"campaign_id"`
		Name       string                     `json:"name"`
		Email      string                     `json:"email"`
		Phone      string                     `json:"phone"`
		Items      []ordersheets.OrderedPlant `json:"items"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	if req.Email == "" {
		http.Error(w, "Email address is required", http.StatusBadRequest)
		return
	}

	// Calculate total amount (optional validation, or we can trust the client/recalc later)
	// For now, we construct the Order object expected by db.UpsertOrder

	// We need to persist this. The db.UpsertOrder takes ordersheets.Order.
	// We might need to generate an Order Number? Or let DB handle ID.
	// UpsertOrder uses Name+Email as key properly? Let's check DB logic later.

	campaignID := req.CampaignID
	order := ordersheets.Order{
		// OrderNumber: ???  -- DB auto-increments ID but OrderNumber is from CSV usually.
		// We might need a way to assign one if it's new.
		CampaignID:    &campaignID,
		Name:          req.Name,
		Email:         req.Email,
		PhoneNumber:   req.Phone,
		OrderedPlants: req.Items,
	}

	if err := db.UpsertOrder(order); err != nil {
		http.Error(w, "Failed to create order: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Send confirmation email asynchronously
	go func() {
		campaign, err := db.GetCampaign(campaignID)
		if err == nil && campaign != nil {
			org, _ := db.GetOrganization(campaign.OrganizationID)
			email.SendOrderConfirmation(order, *campaign, org)
		}
	}()

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"status": "created"})
}

// -- Organizations --

func listOrganizationsHandler(w http.ResponseWriter, r *http.Request) {
	orgs, err := db.GetAllOrganizations()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(orgs)
}

func getOrganizationHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.ParseInt(vars["id"], 10, 64)
	org, err := db.GetOrganization(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if org == nil {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(org)
}

func createOrganizationHandler(w http.ResponseWriter, r *http.Request) {
	var org db.Organization
	if err := json.NewDecoder(r.Body).Decode(&org); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	id, err := db.CreateOrganization(org)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	org.ID = id
	json.NewEncoder(w).Encode(org)
}

func updateOrganizationHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.ParseInt(vars["id"], 10, 64)
	var org db.Organization
	if err := json.NewDecoder(r.Body).Decode(&org); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	org.ID = id
	if err := db.UpdateOrganization(org); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(org)
}

func deleteOrganizationHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.ParseInt(vars["id"], 10, 64)
	if err := db.DeleteOrganization(id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

// -- Products --

func listProductsHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	// If org_id is present, filter by it
	if orgIDStr, ok := vars["org_id"]; ok {
		orgID, _ := strconv.ParseInt(orgIDStr, 10, 64)
		products, err := db.GetOrganizationProducts(orgID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(products)
		return
	}

	// Fallback to all (admin)
	products, err := db.GetAllProducts()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(products)
}

func getProductHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.ParseInt(vars["id"], 10, 64)
	product, err := db.GetProduct(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if product == nil {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(product)
}

func createProductHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	var p db.Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	// If creating under an org route, enforce OrgID
	if orgIDStr, ok := vars["org_id"]; ok {
		orgID, _ := strconv.ParseInt(orgIDStr, 10, 64)
		p.OrganizationID = orgID
	}

	id, err := db.CreateProduct(p)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	p.ID = id
	json.NewEncoder(w).Encode(p)
}

func updateProductHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.ParseInt(vars["id"], 10, 64)
	var p db.Product
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	p.ID = id
	if err := db.UpdateProduct(p); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(p)
}

func deleteProductHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.ParseInt(vars["id"], 10, 64)
	if err := db.DeleteProduct(id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

// -- Campaigns --

func listCampaignsHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	if orgIDStr, ok := vars["org_id"]; ok {
		orgID, _ := strconv.ParseInt(orgIDStr, 10, 64)
		campaigns, err := db.GetOrganizationCampaigns(orgID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(campaigns)
		return
	}

	// Public view: only active campaigns
	campaigns, err := db.GetActiveCampaigns()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(campaigns)
}

func getCampaignHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.ParseInt(vars["id"], 10, 64)
	campaign, err := db.GetCampaign(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if campaign == nil {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(campaign)
}

func getCampaignBySlugHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	orgSlug := vars["org_slug"] // Will be empty string if not matched by mux
	campaignSlug := vars["campaign_slug"]

	campaign, err := db.GetCampaignBySlug(orgSlug, campaignSlug)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if campaign == nil {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	json.NewEncoder(w).Encode(campaign)
}

func createCampaignHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	var c db.Campaign
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	if orgIDStr, ok := vars["org_id"]; ok {
		orgID, _ := strconv.ParseInt(orgIDStr, 10, 64)
		c.OrganizationID = orgID
	}

	id, err := db.CreateCampaign(c)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	c.ID = id
	json.NewEncoder(w).Encode(c)
}

func updateCampaignHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.ParseInt(vars["id"], 10, 64)
	var c db.Campaign
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	c.ID = id
	if err := db.UpdateCampaign(c); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(c)
}

func deleteCampaignHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.ParseInt(vars["id"], 10, 64)
	if err := db.DeleteCampaign(id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func addCampaignProductHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	campaignID, _ := strconv.ParseInt(vars["id"], 10, 64)
	var req struct {
		ProductID int64 `json:"product_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	if err := db.AddProductToCampaign(campaignID, req.ProductID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func removeCampaignProductHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	campaignID, _ := strconv.ParseInt(vars["id"], 10, 64)
	productID, _ := strconv.ParseInt(vars["product_id"], 10, 64)

	if err := db.RemoveProductFromCampaign(campaignID, productID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

// -- Categories --

func listCategoriesHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	orgID, _ := strconv.ParseInt(vars["org_id"], 10, 64)
	categories, err := db.GetOrganizationCategories(orgID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(categories)
}

func createCategoryHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	orgID, _ := strconv.ParseInt(vars["org_id"], 10, 64)

	var c db.Category
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	c.OrganizationID = orgID

	id, err := db.CreateCategory(c)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	c.ID = id
	json.NewEncoder(w).Encode(c)
}

func updateCategoryHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.ParseInt(vars["id"], 10, 64)
	var c db.Category
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	c.ID = id
	if err := db.UpdateCategory(c); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(c)
}

func deleteCategoryHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, _ := strconv.ParseInt(vars["id"], 10, 64)
	if err := db.DeleteCategory(id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

// -- Product Import --

func importProductsHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	orgID, _ := strconv.ParseInt(vars["org_id"], 10, 64)

	file, _, err := r.FormFile("products_csv")
	if err != nil {
		http.Error(w, "Error retrieving file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		http.Error(w, "Error reading CSV", http.StatusBadRequest)
		return
	}

	count := 0
	for i, record := range records {
		if i == 0 {
			continue // skip header
		}
		if len(record) < 2 {
			continue
		}

		name := record[0]
		priceStr := record[1]

		price, _ := strconv.ParseFloat(priceStr, 64)
		priceCents := int(price * 100)

		p, _ := db.GetProductByName(orgID, name)
		if p == nil {
			db.CreateProduct(db.Product{
				OrganizationID: orgID,
				Name:           name,
				PriceCents:     priceCents,
				StockQuantity:  -1,
			})
			count++
		}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"status": "ok", "count": count})
}
