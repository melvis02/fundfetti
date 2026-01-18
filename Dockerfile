# Use the official Go image as the base
FROM golang:1.25-alpine AS builder

# Set the working directory within the container
WORKDIR /app

# Copy the Go module files
COPY go.mod go.sum ./

# Download the Go modules
RUN go mod download && go mod verify

# Copy the rest of the application code
COPY . .

# Build the Go binary
RUN go build -o main .

# Create a minimal runtime image
FROM alpine:latest

# Set the working directory within the container
WORKDIR /app

# Copy the binary from the build stage
COPY --from=builder /app/main .
COPY --from=builder /app/templates/ ./templates/
COPY --from=builder /app/public/ ./public/

# Expose the port your application listens on
EXPOSE 8080

# Run the application
CMD ["./main"]