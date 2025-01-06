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

	"github.com/melvis02/flower-fundraiser-processing/internal/ordersheets"
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

func index(w http.ResponseWriter, r *http.Request) {
	var orders []ordersheets.Order

	siteContent := struct {
		Title  template.HTML
		Orders []ordersheets.Order
	}{
		Title:  template.HTML("Huegel Flower Fundraiser"),
		Orders: orders,
	}

	if r.Method == "GET" {
		// do nothing
	} else if r.Method == "POST" {
		file, _, err := r.FormFile("orders_sheets")
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer file.Close()

		buf := bytes.NewBuffer(nil)
		if _, err := io.Copy(buf, file); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		data := ordersheets.ReadTSV(buf.Bytes())
		siteContent.Orders = ordersheets.FormatOrderSheet(data)
	} else {
		w.WriteHeader(http.StatusMethodNotAllowed)
	}

	err := templates.ExecuteTemplate(w, "base", &siteContent)
	if err != nil {
		http.Error(w, fmt.Sprintf("index: couldn't parse template: %v", err.Error()), http.StatusInternalServerError)
		return
	}
}
