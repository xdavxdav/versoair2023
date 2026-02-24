# ---- Build Stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install ALL dependencies (dev too — needed for vite & esbuild)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine
WORKDIR /app

# Copy the built output (server bundle + frontend assets)
COPY --from=builder /app/dist ./dist

# Copy package manifests and install only production deps
# (needed at runtime because esbuild uses --packages=external)
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

ENV NODE_ENV=production
EXPOSE 10000

CMD ["node", "dist/index.js"]
