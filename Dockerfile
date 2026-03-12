# Multi-stage build for production optimization
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm install
RUN cd backend && npm install

# Development stage
FROM base AS development
COPY . .
EXPOSE 5173 5000
CMD ["sh", "-c", "trap 'kill 0' TERM INT EXIT; (cd backend && npm run dev) & npm run dev & wait"]

# Build stage
FROM base AS build
COPY . .

# Build frontend
RUN npm run build

# Build backend
RUN cd backend && npm run build

# Production stage
FROM node:20-alpine AS production

# Install dumb-init and curl for proper signal handling and health checks
RUN apk add --no-cache dumb-init curl bash

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy built application first
COPY --from=build --chown=nodejs:nodejs /app/backend/dist ./
COPY --from=build --chown=nodejs:nodejs /app/dist ./public

# Copy package files and install only production dependencies
COPY --chown=nodejs:nodejs backend/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

# Switch to non-root user
USER nodejs

# Expose port (DigitalOcean will use PORT env var if provided)
EXPOSE 5000
ENV PORT=5000

# Health check - increased timeouts for external service connections (Redis, Appwrite)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]