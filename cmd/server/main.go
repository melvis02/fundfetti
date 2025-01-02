package server

import (
	"bytes"
	"io"
	"net/http"

	"github.com/melvis02/label-generator/internal/ordersheets"
)

func StartServer() {
	http.HandleFunc("/upload", uploadFileHandler)
	http.HandleFunc("/post", postContentHandler)
	http.ListenAndServe(":8080", nil)
}

func uploadFileHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		http.ServeFile(w, r, "upload.html")
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

		ordersheets.GenerateOrderSheets(orders)
		ordersheets.GenerateSummarySheet(orders)
		return
	}
}

func postContentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "POST" {

		// Read the request body
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Error reading request body", http.StatusInternalServerError)
			return
		}

		data := ordersheets.ReadTSV(body)
		orders := ordersheets.FormatOrderSheet(data[3:])

		ordersheets.GenerateOrderSheets(orders)
		ordersheets.GenerateSummarySheet(orders)
		return
	}
}
