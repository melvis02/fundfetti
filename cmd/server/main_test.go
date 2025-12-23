// FILE: cmd/server/main_test.go
package server

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/melvis02/flower-fundraiser-processing/internal/db"
)

func TestDashboardHandler(t *testing.T) {
	// Need to be in project root for templates
	if err := os.Chdir("../../"); err != nil {
		t.Fatalf("Failed to change dir: %v", err)
	}

	// Setup in-memory DB for testing
	if err := db.InitDB(":memory:"); err != nil {
		t.Fatalf("Failed to init db: %v", err)
	}

	initTemplates()

	tests := []struct {
		method         string
		expectedStatus int
		expectedBody   string
	}{
		{
			method:         "GET",
			expectedStatus: http.StatusOK,
			expectedBody:   "Manage Orders",
		},
	}

	for _, tt := range tests {
		req := httptest.NewRequest(tt.method, "/", nil)

		rr := httptest.NewRecorder()
		handler := http.HandlerFunc(dashboardHandler)

		handler.ServeHTTP(rr, req)

		if status := rr.Code; status != tt.expectedStatus {
			t.Errorf("handler returned wrong status code: got %v want %v", status, tt.expectedStatus)
		}

		if !strings.Contains(rr.Body.String(), tt.expectedBody) {
			t.Errorf("handler returned unexpected body: got %v want %v", rr.Body.String(), tt.expectedBody)
		}
	}
}
