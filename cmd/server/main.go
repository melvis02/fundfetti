package server

import (
	"bytes"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"

	"github.com/melvis02/label-generator/internal/ordersheets"
)

func StartServer() {

	router := mux.NewRouter()

	router.PathPrefix("/public/").Handler(http.StripPrefix("/public/", http.FileServer(http.Dir("public"))))
	router.HandleFunc("/", index).Methods("GET", "POST")

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

var templates = template.Must(template.ParseFiles("./templates/base.t.html", "./templates/body.t.html", "./templates/summarysheet.t.html", "./templates/ordersheets.t.html"))

// index is the handler responsible for rending the index page for the site.
func index(w http.ResponseWriter, r *http.Request) {
	var orders []ordersheets.Order

	b := struct {
		Title  template.HTML
		Orders []ordersheets.Order
	}{
		Title:  template.HTML("Huegel Flower Fundraiser"),
		Orders: orders,
	}

	if r.Method == "GET" {
		err := templates.ExecuteTemplate(w, "base", &b)
		if err != nil {
			http.Error(w, fmt.Sprintf("index: couldn't parse template: %v", err), http.StatusInternalServerError)
			return
		}
		return
	}

	if r.Method == "POST" {
		file, _, err := r.FormFile("orders_spreadsheet")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer file.Close()

		buf := bytes.NewBuffer(nil)
		if _, err := io.Copy(buf, file); err != nil {
			return
		}

		data := ordersheets.ReadTSV(buf.Bytes())
		b.Orders = ordersheets.FormatOrderSheet(data)

		err = templates.ExecuteTemplate(w, "base", &b)
		if err != nil {
			http.Error(w, fmt.Sprintf("index: couldn't parse template: %v", err), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		return
	}
	w.WriteHeader(http.StatusBadRequest)
}
