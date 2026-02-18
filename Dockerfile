# Stage 1: Build the React Client
FROM node:20-alpine AS client-build
WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./
# Install dependencies (Force Clean)
RUN rm -f package-lock.json
RUN npm install

# Copy client source code
COPY client/ ./
# Build the React application
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# Stage 2: Setup the Server
FROM node:20-alpine
WORKDIR /app/server

# Install system dependencies for canvas/sharp
RUN apk add --no-cache \
    build-base \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    librsvg-dev \
    python3

# Install Puppeteer dependencies separately
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to skip downloading Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

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
