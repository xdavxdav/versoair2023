# Multi-stage Docker build for Verso Air Business Intelligence Platform

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY drizzle.config.ts ./

# Install native dependencies for sharp (image processing)
RUN apk add --no-cache vips-dev build-base

# Install dependencies
RUN npm ci

# Copy source code
COPY client/ ./client/
COPY server/ ./server/
COPY shared/ ./shared/

# Build application
RUN npm run build

# Stage 2: Production
FROM node:18-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S verso -u 1001

# Copy package files
COPY package*.json ./

# Install runtime dependency for sharp
RUN apk add --no-cache vips

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=verso:nodejs /app/dist ./dist
COPY --from=builder --chown=verso:nodejs /app/shared ./shared

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5003

# Switch to non-root user
USER verso

# Expose port
EXPOSE 5003

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 5003) + '/api/status').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Start application
CMD ["node", "dist/index.js"]