# Fundfetti Frontend

This is the frontend application for Fundfetti, built with React, Vite, and Tailwind CSS. It serves both the public-facing ordering wizard and the secure internal Administrator dashboard.

## Overview

The application is structured as a Single Page Application (SPA) with React Router handling navigation:

-   **Public Routes**: Under the root `/` and `/c/:id`, these pages allow public users to view active campaigns and place orders.
-   **Admin Routes**: Under `/admin` (accessible via `/login`), these pages provide organizers with tools to manage their campaigns, products, and orders.

## Development

To run the frontend locally for development:

1.  Ensure you have Node.js and npm installed.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the Vite development server:
    ```bash
    npm run dev
    ```

The development server will typically start on `http://localhost:5173`. Make sure the Go backend is running on `http://localhost:8080` as Vite is configured to proxy API requests to it automatically.

## Tech Stack highlights

-   [React](https://reactjs.org/) + [Vite](https://vitejs.dev/) for fast UI development
-   [Tailwind CSS](https://tailwindcss.com/) for styling
-   [React Router](https://reactrouter.com/) for navigation
-   Tailwind headless UI components (if applicable) for accessible widgets.
