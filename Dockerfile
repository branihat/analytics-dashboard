# Simplified Railway deployment - Frontend Build Stage
FROM node:18-alpine AS frontend-build

WORKDIR /app

# Copy frontend files
COPY src/frontend/package*.json ./
COPY src/frontend/ .

# Install and build with minimal complexity
RUN npm install --legacy-peer-deps --no-optional
RUN npm run build

# Verify build succeeded
RUN ls -la build/ && test -f build/index.html

# Backend Production Stage
FROM node:18-alpine AS production

# Install essential system dependencies including build tools for sqlite3
RUN apk add --no-cache \
    sqlite \
    curl \
    python3 \
    py3-setuptools \
    make \
    g++

WORKDIR /app

# Copy backend files
COPY src/backend/package*.json ./
COPY src/backend/ .

# Install backend dependencies
RUN npm install --production

# Create directories first
RUN mkdir -p uploads data logs public

# Remove any existing public file/directory and copy built frontend
RUN rm -rf ./public
COPY --from=frontend-build /app/build ./public

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Simple startup - no complex scripts
CMD ["node", "server.js"]