# Stage 1: Build the Go application
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy go.mod and go.sum files to download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy the source code
COPY . .

# Build the application
# CGO_ENABLED=0 for a static binary, GOOS=linux for cross-compilation if building on non-Linux
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o /app/lightboard-server .

# Stage 2: Create the final small image
FROM alpine:latest

WORKDIR /app

# Copy the built executable from the builder stage
COPY --from=builder /app/lightboard-server .

# Copy the sample configuration file (optional, user should mount their own)
# This is mostly for showing where it could go or for a default setup.
COPY config.sample.yaml /app/config.sample.yaml

# Expose the default HTTP port (adjust if your default config is different)
EXPOSE 8080

# Command to run the application
# The user will need to provide their own config.yaml,
# e.g., by mounting it to /app/config.yaml
ENTRYPOINT ["/app/lightboard-server"]
CMD ["-config", "/app/config.yaml"]
