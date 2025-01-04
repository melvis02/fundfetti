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
	router.HandleFunc("/upload", upload).Methods("GET", "POST")
	router.HandleFunc("/post", post).Methods("POST")
	router.HandleFunc("/", index).Methods("GET")

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

var templates = template.Must(template.ParseFiles("./templates/base.html", "./templates/body.html"))

// index is the handler responsible for rending the index page for the site.
func index(w http.ResponseWriter, r *http.Request) {
	b := struct {
		Title template.HTML
	}{
		Title: template.HTML("Huegel Flower Fundraiser"),
	}
	err := templates.ExecuteTemplate(w, "base", &b)
	if err != nil {
		http.Error(w, fmt.Sprintf("index: couldn't parse template: %v", err), http.StatusInternalServerError)
		return
	}
}

func upload(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		w.WriteHeader(http.StatusOK)
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
		orders := ordersheets.FormatOrderSheet(data)

		ordersheets.GenerateOrderSheets(orders, w)
		ordersheets.GenerateSummarySheet(orders)

		b := struct {
			Title template.HTML
		}{
			Title: template.HTML("Huegel Flower Fundraiser"),
		}
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

func post(w http.ResponseWriter, r *http.Request) {
	if r.Method == "POST" {

		// Read the request body
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Error reading request body", http.StatusInternalServerError)
			return
		}

		data := ordersheets.ReadTSV(body)
		orders := ordersheets.FormatOrderSheet(data[3:])

		//ordersheets.GenerateOrderSheets(orders)
		ordersheets.GenerateSummarySheet(orders)
		w.WriteHeader(http.StatusOK)
		return
	}
}
