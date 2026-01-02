# Setup Guide

Complete guide for setting up Movie Mimic for local development.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [FFmpeg Installation](#ffmpeg-installation)
4. [Application Setup](#application-setup)
5. [Running the Application](#running-the-application)
6. [Docker Setup](#docker-setup)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 9.0.0 or higher
- **FFmpeg**: For video processing
- **Git**: For cloning the repository

### Check Versions

```bash
node --version    # Should be v18+
npm --version     # Should be v9+
git --version     # Any recent version
ffmpeg -version   # Any recent version
```

## Environment Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd movie-mimic
```

### 2. Install Node.js Dependencies

Install all dependencies including frontend, backend, and shared packages:

```bash
npm install
```

This will install:
- Root dependencies (TypeScript, ESLint, Prettier)
- Frontend dependencies (React, Vite, Tailwind, etc.)
- Backend dependencies (Express, SQLite3, FFmpeg wrapper, etc.)
- Shared package dependencies

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` file with your configuration:

```bash
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
DB_PATH=./data/movie-mimic.sqlite

# File Upload
MAX_UPLOAD_SIZE=2147483648
ALLOWED_VIDEO_FORMATS=mp4,webm,mkv,avi,mov
ALLOWED_SUBTITLE_FORMATS=srt,vtt,ass

# FFmpeg paths
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe

# CORS
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=debug
LOG_FILE_PATH=./logs/app.log
```

**Note:** You can use default values for development.

## FFmpeg Installation

FFmpeg is required for video processing (thumbnails, exports, merging).

### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

Verify installation:
```bash
ffmpeg -version
```

### macOS

Using Homebrew:
```bash
brew install ffmpeg
```

Or using MacPorts:
```bash
sudo port install ffmpeg
```

### Windows

1. Download FFmpeg from [ffmpeg.org](https://ffmpeg.org/download.html#build-windows)
2. Extract to a folder (e.g., `C:\ffmpeg`)
3. Add FFmpeg to your PATH:
   - Open System Properties > Environment Variables
   - Edit "Path" variable
   - Add `C:\ffmpeg\bin`
4. Restart terminal
5. Verify: `ffmpeg -version`

### Docker (if using Docker)

No manual FFmpeg installation needed - it's included in the Docker image.

### Verify FFmpeg Paths

After installation, verify the paths in your `.env` file match your system:

```bash
which ffmpeg    # Linux/macOS
where ffmpeg    # Windows
```

Update `.env` if needed:
```
FFMPEG_PATH=/usr/local/bin/ffmpeg    # macOS
FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe # Windows
```

## Application Setup

### 1. Create Required Directories

The application will create these automatically, but you can create them manually:

```bash
mkdir -p data
mkdir -p uploads/videos
mkdir -p uploads/subtitles
mkdir -p uploads/recordings
mkdir -p uploads/exports
mkdir -p uploads/thumbnails
mkdir -p uploads/temp
mkdir -p logs
```

### 2. Build Dependencies

Build TypeScript for shared package:

```bash
cd shared && npm run build && cd ..
```

### 3. Set Up Database

The database will be created automatically on first run. However, you can manually run migrations:

```bash
cd backend
npm run db:migrate
```

This creates the `data/movie-mimic.sqlite` file with all required tables.

## Running the Application

### Option 1: Development Mode (Recommended)

Both frontend and backend with hot reload:

```bash
npm run dev
```

This starts:
- Backend: http://localhost:5000
- Frontend: http://localhost:5173
- Watch mode for automatic rebuilds

### Option 2: Separate Terminals

Run frontend and backend separately:

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### Option 3: Production Build

Build and run production version:

```bash
# Build all packages
npm run build

# Start backend
cd backend && npm start

# In another terminal, start frontend
cd frontend && npm run preview
```

## Docker Setup

### Using Docker Compose (Easiest)

1. Make sure Docker is installed and running
2. Start all services:

```bash
npm run docker:up
```

This starts:
- Backend container (port 5000)
- Frontend container (port 5173)
- Data volume

3. View logs:

```bash
npm run docker:logs
```

4. Stop services:

```bash
npm run docker:down
```

### Manual Docker Commands

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View specific service logs
docker-compose logs backend
docker-compose logs frontend

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Remove volumes (deletes data)
docker-compose down -v
```

## Troubleshooting

### "FFmpeg not found" Error

**Problem:** Backend can't find FFmpeg

**Solutions:**

1. Verify FFmpeg is installed:
   ```bash
   ffmpeg -version
   ```

2. Check paths in `.env`:
   ```bash
   # Linux/macOS
   which ffmpeg
   # Windows
   where ffmpeg
   ```

3. Update `.env` with correct paths:
   ```
   FFMPEG_PATH=/usr/bin/ffmpeg
   FFPROBE_PATH=/usr/bin/ffprobe
   ```

4. If using Docker, rebuild the image:
   ```bash
   docker-compose build backend
   ```

### Port Already in Use

**Problem:** Port 5000 or 5173 is already in use

**Solution:** Change ports in `.env` or `vite.config.ts`:

Backend (.env):
```
PORT=5001
```

Frontend (vite.config.ts):
```javascript
server: {
  port: 5174,
  // ...
}
```

Update CORS origin accordingly:
```
CORS_ORIGIN=http://localhost:5174
```

### Database Lock Error

**Problem:** "Database is locked" or "Database file is locked"

**Solution:** Stop the application and delete the lock file:

```bash
rm -f data/movie-mimic.sqlite-wal data/movie-mimic.sqlite-shm
```

If that doesn't work, delete the database and let it recreate:

```bash
rm -f data/movie-mimic.sqlite
```

### Permission Denied (Uploads Directory)

**Problem:** Can't write to uploads directory

**Solution:** Fix permissions:

```bash
# Linux/macOS
chmod -R 755 uploads/

# Give write permission to current user
chown -R $USER:$USER uploads/
```

### Module Not Found Errors

**Problem:** "Module not found" when running the app

**Solution:** Reinstall dependencies:

```bash
rm -rf node_modules
rm -rf frontend/node_modules
rm -rf backend/node_modules
rm -rf shared/node_modules
rm -f package-lock.json frontend/package-lock.json backend/package-lock.json shared/package-lock.json
npm install
```

### Hot Reload Not Working

**Problem:** Changes not reflecting in the browser

**Solution:**

1. For backend (tsx watch):
   - Restart the dev server
   - Check console for errors

2. For frontend (Vite):
   - Clear cache: `rm -rf frontend/node_modules/.vite`
   - Restart dev server
   - Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)

### Docker Container Won't Start

**Problem:** Docker containers failing to start

**Solutions:**

1. Check logs:
   ```bash
   docker-compose logs backend
   docker-compose logs frontend
   ```

2. Rebuild containers:
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

3. Remove volumes and start fresh:
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```

4. Check Docker is running:
   ```bash
   docker ps
   ```

### TypeScript Errors

**Problem:** TypeScript compilation errors

**Solutions:**

1. Rebuild shared package:
   ```bash
   cd shared && npm run build
   ```

2. Clear TypeScript cache:
   ```bash
   rm -rf frontend/dist backend/dist
   npm run build
   ```

3. Verify all dependencies are installed:
   ```bash
   npm install
   ```

### File Upload Fails

**Problem:** Can't upload videos

**Solutions:**

1. Check file size (< 2GB)
2. Check file format (MP4, WebM, MKV, AVI, MOV)
3. Verify uploads directory exists and is writable:
   ```bash
   ls -la uploads/
   ```
4. Check backend logs for errors
5. Verify FFmpeg is working:
   ```bash
   ffmpeg -i test.mp4
   ```

### Frontend Can't Connect to Backend

**Problem:** API requests failing

**Solutions:**

1. Verify backend is running: `http://localhost:5000/api/health`
2. Check CORS origin in `.env` matches frontend URL
3. Check frontend proxy configuration in `vite.config.ts`
4. Clear browser cache and cookies
5. Check browser console for CORS errors

## Development Tips

### Recommended Workflow

1. Start with `npm run dev` in the root
2. Make changes to code
3. Changes auto-reflect (hot reload)
4. Check browser console and terminal for errors

### Database Management

View SQLite database:
```bash
sqlite3 data/movie-mimic.sqlite
```

Common commands:
```sql
.tables                    # List tables
.schema videos            # Show table structure
SELECT * FROM videos;     # Query data
.quit                     # Exit
```

Reset database:
```bash
rm -f data/movie-mimic.sqlite
# App will recreate on next start
```

### Logs

Backend logs location:
- Console (development)
- `logs/app.log` (all levels)
- `logs/error.log` (errors only)
- `logs/exceptions.log` (unhandled exceptions)

### Testing API

Use curl or Postman:

```bash
# Health check
curl http://localhost:5000/api/health

# Get config
curl http://localhost:5000/api/config

# List videos
curl http://localhost:5000/api/videos
```

Or use Postman with the provided collection (if available).

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment instructions.

## Getting Help

If you encounter issues not covered here:

1. Check the main [README.md](./README.md)
2. Review [API.md](./API.md) for API issues
3. Check application logs
4. Open an issue on GitHub with:
   - Operating system and version
   - Node.js version
   - Error messages
   - Steps to reproduce

---

**Happy Developing!** 🚀
