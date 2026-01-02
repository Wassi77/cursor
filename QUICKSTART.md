# Quick Start Guide

Quick setup and run instructions for Movie Mimic.

## Prerequisites Check

Verify you have everything installed:

```bash
# Check Node.js (v18+ required)
node -v

# Check npm (v9+ required)
npm -v

# Check FFmpeg
ffmpeg -version
```

## Quick Start (Local Development)

### 1. Install Dependencies

```bash
npm install
```

This installs all workspace packages (frontend, backend, shared).

### 2. Start Application

```bash
npm run dev
```

Or use the convenience script:

```bash
./start.sh
```

This starts:
- Backend: http://localhost:5000
- Frontend: http://localhost:5173

### 3. Open in Browser

Navigate to http://localhost:5173

## Quick Start (Docker)

### Build and Run Everything

```bash
# Build Docker image
docker build -t movie-mimic .

# Run container
docker run -p 5173:80 -p 5000:5000 -v $(pwd)/data:/app/data -v $(pwd)/uploads:/app/uploads movie-mimic
```

Or use Docker Compose:

```bash
docker-compose up
```

## First Steps

1. **Import a Video**
   - Click "Import Video" on dashboard
   - Drag and drop or browse for a video file
   - Wait for upload and thumbnail generation

2. **Create a Session**
   - Click on a video card
   - A new practice session is created

3. **Practice Recording**
   - Press **Spacebar** to toggle between PLAY and RECORD modes
   - Record yourself mimicking the actor
   - Multiple recording chunks are saved

4. **Review Recordings**
   - Go to Session Review page
   - Preview, reorder, or delete recordings

5. **Export Videos**
   - Go to Export page
   - Choose quality (480p, 720p, 1080p)
   - Select format (MP4, WebM)
   - Export as solo recording or comparison video

## Troubleshooting

### "Module not found" errors

```bash
# Clean install
rm -rf node_modules frontend/node_modules backend/node_modules shared/node_modules
npm install
```

### Port already in use

```bash
# Change port in .env
PORT=5001
```

### FFmpeg not found

```bash
# Install FFmpeg
# Ubuntu/Debian:
sudo apt-get install ffmpeg

# macOS:
brew install ffmpeg

# Windows:
# Download from https://ffmpeg.org/download.html
```

### TypeScript errors

```bash
# Build shared package first
cd shared && npm run build
cd ..

# Then build others
npm run build
```

## Development Tips

- Use `npm run dev` for hot reload
- Check browser console for errors
- Backend logs show in terminal
- SQLite database auto-creates in `data/` directory
- Uploaded videos stored in `uploads/` directory

## Key Files

- `.env` - Configuration
- `package.json` - Root dependencies
- `README.md` - Full documentation
- `SETUP.md` - Detailed setup
- `API.md` - API reference
- `DOCKER.md` - Docker guide

## Stopping

Press `Ctrl+C` to stop development servers.

## Getting Help

For issues, see:
- `README.md` - Main documentation
- `SETUP.md` - Setup troubleshooting
- `DEPLOYMENT.md` - Production deployment
- `API.md` - API documentation

---

Happy practicing! 🎬🎤
