# Root Dockerfile - Builds and runs entire Movie Mimic application

# Build stage
FROM node:18-alpine AS builder

# Install FFmpeg and FFprobe for backend
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy shared package (types and constants)
COPY shared/package.json ./shared/
COPY shared/tsconfig.json ./shared/
COPY shared/src ./shared/src/

# Copy backend package and source
COPY backend/package.json ./backend/
COPY backend/tsconfig.json ./backend/
COPY backend/src ./backend/src/

# Copy frontend package and source  
COPY frontend/package.json ./frontend/
COPY frontend/tsconfig.json ./frontend/
COPY frontend/tsconfig.node.json ./frontend/
COPY frontend/vite.config.ts ./frontend/
COPY frontend/tailwind.config.js ./frontend/
COPY frontend/postcss.config.js ./frontend/
COPY frontend/src ./frontend/src/
COPY frontend/public ./frontend/public/
COPY frontend/index.html ./frontend/index.html
COPY frontend/nginx.conf ./frontend/

# Install all dependencies (including workspace dependencies)
RUN npm ci

# Build shared package
RUN cd shared && npm run build

# Build backend
RUN cd backend && npm run build

# Build frontend
RUN cd frontend && npm run build

# Production stage - Backend
FROM node:18-alpine AS backend

RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy backend from builder
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/shared/node_modules ./shared/node_modules

# Create directories
RUN mkdir -p data uploads/videos uploads/subtitles uploads/recordings uploads/exports uploads/thumbnails uploads/temp logs

EXPOSE 5000

CMD ["node", "dist/index.js"]

# Production stage - Frontend
FROM nginx:alpine AS frontend

# Copy frontend build from builder
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY --from=builder /app/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
