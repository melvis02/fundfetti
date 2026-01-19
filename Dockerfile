# Stage 1: Build React App
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Build Go App
FROM golang:1.24-alpine AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o main .

# Stage 3: Final Image
FROM alpine:latest
WORKDIR /app
COPY --from=backend-builder /app/main .
COPY --from=backend-builder /app/public/ ./public/
COPY --from=backend-builder /app/templates/ ./templates/
# Copy the built frontend assets from Stage 1 to where Go expects them
COPY --from=frontend-builder /app/frontend/dist/ ./frontend/dist/

EXPOSE 8080
CMD ["./main"]