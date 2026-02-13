FROM node:20-alpine

WORKDIR /app

# Install a simple static file server
RUN npm install -g http-server

# Copy application files
COPY . .

# Expose port 8080 for the highrise UI
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# Serve the static files
CMD ["http-server", ".", "-p", "8080", "-c-1", "--cors", "-s"]
