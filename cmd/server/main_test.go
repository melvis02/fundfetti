// FILE: cmd/server/main_test.go
package server

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestIndexHandler(t *testing.T) {
	tests := []struct {
		method         string
		body           string
		expectedStatus int
		expectedBody   string
	}{
		{
			method:         "GET",
			body:           "",
			expectedStatus: http.StatusOK,
			expectedBody:   "Huegel Flower Fundraiser",
		},
		{
			method:         "POST",
			body:           "orders_sheets=testdata",
			expectedStatus: http.StatusOK,
			expectedBody:   "Huegel Flower Fundraiser",
		},
		{
			method:         "PUT",
			body:           "",
			expectedStatus: http.StatusMethodNotAllowed,
			expectedBody:   "",
		},
	}

	for _, tt := range tests {
		req := httptest.NewRequest(tt.method, "/", strings.NewReader(tt.body))
		req.Header.Set("Content-Type", "multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW")

		rr := httptest.NewRecorder()
		handler := http.HandlerFunc(index)

		handler.ServeHTTP(rr, req)

		if status := rr.Code; status != tt.expectedStatus {
			t.Errorf("handler returned wrong status code: got %v want %v", status, tt.expectedStatus)
		}

		if !strings.Contains(rr.Body.String(), tt.expectedBody) {
			t.Errorf("handler returned unexpected body: got %v want %v", rr.Body.String(), tt.expectedBody)
		}
	}
}
