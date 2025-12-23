package server

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"

	"github.com/melvis02/flower-fundraiser-processing/internal/db"
	"github.com/melvis02/flower-fundraiser-processing/internal/ordersheets"
)

func StartServer() {

	// Initialize Database
	if err := db.InitDB("orders.db"); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	router := mux.NewRouter()

	router.PathPrefix("/public/").Handler(http.StripPrefix("/public/", http.FileServer(http.Dir("public"))))

	// Unified Modern Routes
	router.HandleFunc("/", dashboardHandler).Methods("GET")
	router.HandleFunc("/upload", uploadHandler).Methods("POST")
	router.HandleFunc("/print/summary", printSummaryHandler).Methods("GET")
	router.HandleFunc("/print/orders", printOrdersHandler).Methods("GET")
	router.HandleFunc("/api/orders/{id}/status", orderStatusHandler).Methods("POST")

	// Initialize Templates
	initTemplates()

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

// Parse all templates once. Note: We include print templates here so they are valid,
// but we will render specific pages using ExecuteTemplate.
var templates *template.Template

func initTemplates() {
	templates = template.Must(template.ParseFiles(
		"./templates/base.t.html",
		"./templates/body.t.html",
		"./templates/summarysheet.t.html",
		"./templates/ordersheets.t.html",
		"./templates/orders_list.t.html",
	))
}

// Helper to convert DB orders to Presentation orders (if needed for printing)
func dbOrdersToPresentation(dbOrders []db.DBOrder) []ordersheets.Order {
	var presentationOrders []ordersheets.Order
	for i, o := range dbOrders {
		po := ordersheets.Order{
			OrderNumber:   i + 1, // Or use o.ID if preferred? Using index for now to match old behavior
			Name:          o.Name,
			LastName:      "", // We stopped parsing last name explicitly in DB, might need to re-derive or just ignore if unused
			Email:         o.Email,
			PhoneNumber:   o.Phone,
			OrderedPlants: []ordersheets.OrderedPlant{},
		}
		// Hacky re-derivation of LastName if needed by templates.
		// The original code did `strings.Split(Name, " ")[1]`.
		parts := strings.Split(o.Name, " ")
		if len(parts) > 1 {
			po.LastName = parts[len(parts)-1]
		}

		for _, item := range o.Items {
			po.OrderedPlants = append(po.OrderedPlants, ordersheets.OrderedPlant{
				PlantType: item.PlantType,
				Quantity:  item.Quantity,
			})
		}
		presentationOrders = append(presentationOrders, po)
	}
	return presentationOrders
}

func dashboardHandler(w http.ResponseWriter, r *http.Request) {
	orders, err := db.GetOrders()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get orders: %v", err), http.StatusInternalServerError)
		return
	}

	siteContent := struct {
		Title       template.HTML
		AdminOrders []db.DBOrder
	}{
		Title:       template.HTML("Manage Orders"),
		AdminOrders: orders,
	}

	// We render "orders_list.t.html" inside "base"
	// But "orders_list.t.html" uses {{define "body"}}.
	// So we execute "base".
	// However, we have a conflict: "body.t.html" ALSO defines "body" (the old upload form).
	// We need to ensure that for the dashboard, the "body" block comes from "orders_list.t.html".
	// One way is to Parse dedicated templates for this handler, strictly excluding "body.t.html".

	t, err := template.ParseFiles("./templates/base.t.html", "./templates/orders_list.t.html")
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to parse templates: %v", err), http.StatusInternalServerError)
		return
	}

	if err := t.ExecuteTemplate(w, "base", &siteContent); err != nil {
		http.Error(w, fmt.Sprintf("Failed to execute template: %v", err), http.StatusInternalServerError)
	}
}

func uploadHandler(w http.ResponseWriter, r *http.Request) {
	file, _, err := r.FormFile("orders_sheets")
	if err != nil {
		http.Error(w, "Error retrieving file: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()

	buf := bytes.NewBuffer(nil)
	if _, err := io.Copy(buf, file); err != nil {
		http.Error(w, "Error reading file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	data := ordersheets.ReadTSV(buf.Bytes())
	orders := ordersheets.FormatOrderSheet(data)

	// Persist orders to DB
	count := 0
	for _, order := range orders {
		if err := db.UpsertOrder(order); err != nil {
			log.Printf("Failed to upsert order for %s: %v", order.Name, err)
		} else {
			count++
		}
	}
	log.Printf("Imported/Updated %d orders", count)

	// Redirect back to dashboard
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func printSummaryHandler(w http.ResponseWriter, r *http.Request) {
	orders, err := db.GetOrders()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get orders: %v", err), http.StatusInternalServerError)
		return
	}

	presentationOrders := dbOrdersToPresentation(orders)

	siteContent := struct {
		Title  template.HTML
		Orders []ordersheets.Order
	}{
		Title:  template.HTML("Order Summary"),
		Orders: presentationOrders,
	}

	// For printing, we likely want "summarysheet.t.html".
	// It's a partial used in "base". We can create a dedicated "print_base" or just abuse "base"
	// by feeding it a body that renders the summary.
	// OR, looking at "base", it renders "body" then checks ".Orders" (or now removed ShowPrintableDocuments).
	// Let's make a specialized printer flow.
	// Actually, the original code rendered "base" and injected the sheets at the bottom.
	// Let's keep it simple: We need a template that renders JUST the summary sheet style.
	// But "summarysheet.t.html" defines {{define "summary_sheet"}}.

	// I'll create a synthetic template on the fly or just assume "base" + a body that calls the partial.

	tmplStr := `
		{{define "body"}}
			{{template "summary_sheet" .}}
		{{end}}
	`
	t, err := template.New("print_wrapper").Parse(tmplStr)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Parse base + files
	t, err = t.ParseFiles("./templates/base.t.html", "./templates/summarysheet.t.html")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := t.ExecuteTemplate(w, "base", &siteContent); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func printOrdersHandler(w http.ResponseWriter, r *http.Request) {
	orders, err := db.GetOrders()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get orders: %v", err), http.StatusInternalServerError)
		return
	}

	presentationOrders := dbOrdersToPresentation(orders)

	siteContent := struct {
		Title  template.HTML
		Orders []ordersheets.Order
	}{
		Title:  template.HTML("Order Sheets"),
		Orders: presentationOrders,
	}

	tmplStr := `
		{{define "body"}}
			{{template "orders_sheets" .}}
		{{end}}
	`
	t, err := template.New("print_wrapper").Parse(tmplStr)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Parse base + files
	t, err = t.ParseFiles("./templates/base.t.html", "./templates/ordersheets.t.html")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if err := t.ExecuteTemplate(w, "base", &siteContent); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
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
