# Fundraiser Order Processing

High-performance order processing system for non-profit fundraisers. Originally a CLI/scripting tool, now expanded into a full-featured web platform supporting multi-tenant organizations, campaign management, and public ordering.

## Features

-   **Multi-Tenancy**: Support for multiple Organizations.
-   **Campaign Management**: Create and manage fundraising campaigns with start/end dates.
-   **Product Management**: Manage products and prices per organization.
-   **Public Ordering**: Mobile-friendly wizard for customers to place orders online.
-   **Order Management**: Track orders, mark as paid/picked up, and print labels/summaries.
-   **Legacy Import**: Support for importing CSV/TSV order sheets.

## Documentation

-   [**Administrator Guide**](docs/ADMIN_GUIDE.md): For organizers managing the system.
-   [**User Ordering Guide**](docs/USER_GUIDE.md): For customers placing orders.

## Quick Start

### Prerequisites
-   Go 1.22+
-   Node.js & npm (for frontend development)

### Running the Application

1.  **Backend**:
    ```bash
    go run cmd/server/main.go
    ```
    Server runs on `http://localhost:8080`.

2.  **Frontend (Development)**:
    ```bash
    cd frontend
    npm run dev
    ```
    Access via the Vite dev server (proxying to backend).

## Tech Stack

-   **Backend**: Go (Gorilla Mux), SQLite
-   **Frontend**: React, Tailwind CSS
-   **Database**: SQLite (embedded)

## Roadmap

- [x] Backend Foundation (DB & API)
- [x] Multi-Tenancy (Organizations)
- [x] Admin Dashboard
- [x] Public Ordering Flow
- [ ] Authentication & Authorization (Next Phase)
- [ ] Payment Gateway Integration (Stripe/Square API)