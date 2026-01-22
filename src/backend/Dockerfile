# Backend-only Dockerfile (for docker-compose development)
# Note: Railway uses the root Dockerfile for production deployment

FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache sqlite

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p uploads data logs

# Set environment variables
ENV NODE_ENV=development
ENV PORT=5000

# Expose port
EXPOSE 5000

# Start the application
CMD ["node", "server.js"]