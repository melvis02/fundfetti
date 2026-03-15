# AI Agent Guidelines (Fundfetti)

This document provides context, rules, and guidelines for AI coding agents and assistants working within the Fundfetti repository. 

## Project Overview

Fundfetti is a high-performance order processing system for non-profit fundraisers. Originally a CLI/scripting tool, it has expanded into a full-featured web platform supporting multi-tenant organizations, campaign management, and public ordering. 

### Core Tech Stack
- **Backend**: Go 1.22+ (Gorilla Mux)
- **Frontend**: React (Vite), Tailwind CSS
- **Database**: SQLite (for local dev) or PostgreSQL (for production)

## Development Rules

1.  **Architecture**: The backend is written in Go and uses `gorilla/mux` for routing. The frontend is a React application built with Vite and Tailwind CSS.
2.  **Database Agnosticism**: The application supports *both* SQLite and PostgreSQL. When writing raw SQL queries or database migrations, ensure compatibility with both engines (or use appropriate abstraction/driver-specific logic). Do not casually use syntax exclusive to one.
3.  **Frontend Styling**: Tailwind CSS is the framework of choice. Use Tailwind utility classes directly in the React components over custom CSS files when possible. 
4.  **Go Best Practices**:
    *   Maintain idiomatic Go code.
    *   Return errors explicitly and handle them up the stack.
5.  **Multi-Tenancy**: The platform handles multiple organizations. Features interacting with data should securely authenticate requests and ensure proper scoping (e.g., fetch products only for the active organization).

## Key Files to Know

- **`cmd/server/main.go`**: Entry point for backend server.
- **`frontend/src/`**: All React code lives here.
- **`internal/db/`**: Database interactions and queries.
- **`k8s/`**: Kubernetes manifests for deployment.

## Workflow

-   When executing bash commands to test the backend, use `go run cmd/server/main.go` from the root directory.
-   When executing frontend commands, ensure you are in the `/frontend` directory (`cd frontend`).
-   If asked to generate new workflow files, ensure they are placed in the `.github/workflows/` directory for CI/CD, or within `.agents/workflows/` if defining specific multi-step agent behaviors.
