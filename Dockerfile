# Stage 1: Build the React Client
FROM node:18-alpine AS client-build
WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./
# Install dependencies
RUN npm install

# Copy client source code
COPY client/ ./
# Build the React application
RUN npm run build

# Stage 2: Setup the Server
FROM node:18-alpine
WORKDIR /app/server

# Copy server package files
COPY server/package*.json ./
# Install server dependencies (including pg)
RUN npm install

# Copy server source code
COPY server/ ./

# Copy built client assets from Stage 1 to the location server expects
# server/index.js expects ../client/dist
COPY --from=client-build /app/client/dist /app/client/dist

# Expose port (Cloud Run defaults to 8080)
ENV PORT=8080
EXPOSE 8080

# Start command
CMD ["npm", "start"]
