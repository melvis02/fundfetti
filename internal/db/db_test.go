package db

import (
	"testing"
	"time"

	"github.com/melvis02/fundfetti/internal/ordersheets"
)

func TestPhase1Integration(t *testing.T) {
	// 1. Init DB in memory
	if err := InitDB("sqlite", ":memory:"); err != nil {
		t.Fatalf("Failed to init DB: %v", err)
	}

	// 1.5 Create Org (needed for GetCampaign join)
	org := Organization{Name: "Test Org", Slug: "test-org"}
	orgID, err := CreateOrganization(org)
	if err != nil {
		t.Fatalf("Failed to create org: %v", err)
	}

	// 2. Create Product
	p := Product{
		OrganizationID: orgID,
		Name:          "Test Product",
		Description:   "A lovely product",
		PriceCents:    1000,
		StockQuantity: 100,
	}
	pID, err := CreateProduct(p)
	if err != nil {
		t.Fatalf("Failed to create product: %v", err)
	}
	if pID == 0 {
		t.Error("Got ID 0 for product")
	}

	// 3. Create Campaign
	c := Campaign{
		OrganizationID: orgID,
		Name:      "Fall Fundraiser",
		StartDate: time.Now(),
		IsActive:  true,
		Slug:      "fall-fundraiser",
	}
	cID, err := CreateCampaign(c)
	if err != nil {
		t.Fatalf("Failed to create campaign: %v", err)
	}

	// 4. Add Product to Campaign
	if err := AddProductToCampaign(cID, pID); err != nil {
		t.Fatalf("Failed to add product to campaign: %v", err)
	}

	// Verify linkage
	linkedC, err := GetCampaign(cID)
	if err != nil {
		t.Fatalf("Failed to get campaign: %v", err)
	}
	if len(linkedC.Products) != 1 {
		t.Errorf("Expected 1 product, got %d", len(linkedC.Products))
	}
	if linkedC.Products[0].Name != "Test Product" {
		t.Errorf("Expected product 'Test Product', got '%s'", linkedC.Products[0].Name)
	}

	// 5. Create Order linked to Campaign
	o := ordersheets.Order{
		OrderNumber: 1,
		CampaignID:  &cID,
		Name:        "John Doe",
		Email:       "john@example.com",
		PhoneNumber: "555-0100",
		Items: []ordersheets.OrderItem{
			{ProductName: "Test Product", Quantity: 2},
		},
	}
	if err := UpsertOrder(o); err != nil {
		t.Fatalf("Failed to upsert order: %v", err)
	}

	// Verify Order Linkage
	orders, err := GetOrders()
	if err != nil {
		t.Fatalf("Failed to get orders: %v", err)
	}
	if len(orders) != 1 {
		t.Fatalf("Expected 1 order, got %d", len(orders))
	}
	// Note: GetOrders currently doesn't fetch CampaignID, I should probably update it to verify
	// But let's check via raw query or assumes if Upsert didn't fail it's there.
	// Let's inspect DB directly to be sure
	var fetchedCID int64
	err = DB.QueryRow("SELECT campaign_id FROM orders WHERE id = ?", orders[0].ID).Scan(&fetchedCID)
	if err != nil {
		t.Fatalf("Failed to query campaign_id: %v", err)
	}
	if fetchedCID != cID {
		t.Errorf("Expected campaign_id %d, got %d", cID, fetchedCID)
	}
}

func TestPhase1_5_OrganizationIntegration(t *testing.T) {
	// 1. Init DB in memory
	if err := InitDB("sqlite", ":memory:"); err != nil {
		t.Fatalf("Failed to init DB: %v", err)
	}

	// 2. Create Organization
	org := Organization{
		Name:         "Test Org",
		Slug:         "test-org",
		ContactEmail: "test@example.com",
	}
	orgID, err := CreateOrganization(org)
	if err != nil {
		t.Fatalf("Failed to create org: %v", err)
	}

	// 3. Create Product under Org
	p := Product{
		OrganizationID: orgID,
		Name:           "Org Product",
		PriceCents:     500,
	}
	pID, err := CreateProduct(p)
	if err != nil {
		t.Fatalf("Failed to create product: %v", err)
	}

	// Verify Product has OrgID
	fetchedP, err := GetProduct(pID)
	if err != nil {
		t.Fatalf("Failed to get product: %v", err)
	}
	if fetchedP.OrganizationID != orgID {
		t.Errorf("Expected orgID %d, got %d", orgID, fetchedP.OrganizationID)
	}

	// 4. Create Campaign under Org
	c := Campaign{
		OrganizationID: orgID,
		Name:           "Org Campaign",
		StartDate:      time.Now(),
	}
	cID, err := CreateCampaign(c)
	if err != nil {
		t.Fatalf("Failed to create campaign: %v", err)
	}

	// Verify Campaign has OrgID
	fetchedC, err := GetCampaign(cID)
	if err != nil {
		t.Fatalf("Failed to get campaign: %v", err)
	}
	if fetchedC.OrganizationID != orgID {
		t.Errorf("Expected orgID %d, got %d", orgID, fetchedC.OrganizationID)
	}

	// 5. Verify Organization Products List
	orgProducts, err := GetOrganizationProducts(orgID)
	if err != nil {
		t.Fatalf("Failed to get org products: %v", err)
	}
	if len(orgProducts) != 1 {
		t.Errorf("Expected 1 product, got %d", len(orgProducts))
	}
}
