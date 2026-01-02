FROM node:18-alpine

# Install FFmpeg and FFprobe
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy root package files
COPY package.json ./

# Copy shared package (types and constants)
COPY shared/package.json ./shared/
COPY shared/tsconfig.json ./shared/
COPY shared/src ./shared/src/

# Copy backend package files
COPY backend/package.json ./backend/

# Install dependencies (this will also install shared package)
RUN npm ci

# Copy backend source
COPY backend/tsconfig.json ./backend/
COPY backend/src ./backend/src/

# Build shared and backend
RUN cd shared && npm run build
RUN cd backend && npm run build

# Create necessary directories
RUN mkdir -p data uploads/videos uploads/subtitles uploads/recordings uploads/exports uploads/thumbnails uploads/temp logs

# Expose port
EXPOSE 5000

# Start backend
CMD ["node", "backend/dist/index.js"]
