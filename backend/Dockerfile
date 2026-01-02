FROM node:18-alpine

# Install FFmpeg and FFprobe
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create necessary directories
RUN mkdir -p data uploads/videos uploads/subtitles uploads/recordings uploads/exports uploads/thumbnails uploads/temp logs

# Expose port
EXPOSE 5000

# Start server
CMD ["npm", "run", "start"]
