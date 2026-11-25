# Dockerfile for MallMaze backend
# -------------------------------------------------
# Use official Node LTS image
FROM node:18-alpine AS builder
# Install curl for debugging and health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Install build tools (if any) and copy package files
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy source code
COPY backend/ ./backend/
COPY data/ ./data/
# COPY scripts/ ./scripts/  # if you have any helper scripts

# Expose the port the app runs on (default 4000)
EXPOSE 4000

# Define environment variables (can be overridden at runtime)
ENV NODE_ENV=production
ENV PORT=4000

# Start the server
CMD ["node", "backend/server.js"]