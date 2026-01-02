# Movie Mimic 🎬

A comprehensive full-stack web application for learning English by mimicking actors from movies. Import your favorite videos, practice recording yourself, and export comparison videos to track your progress.

## Features

### 🎥 Video Management
- **Import Videos**: Drag-and-drop or file picker upload (MP4, WebM, MKV, AVI, MOV)
- **Automatic Thumbnails**: Generate thumbnails from uploaded videos
- **Video Metadata**: Extract duration, resolution, and codec information
- **Subtitle Support**: SRT, VTT, and ASS subtitle formats

### 🎤 Practice Mode
- **Dual Mode Interface**: Switch between PLAY MODE and RECORD MODE with a single spacebar
- **Webcam Recording**: Record yourself with audio and video
- **Playback Controls**: Full video player with custom controls
- **Playback Speed**: Adjust from 0.5x to 2x speed
- **Session Management**: Organize your practice sessions

### 📊 Session Review
- **Recording Chunks**: View all recorded segments
- **Reorder Recordings**: Drag and drop to reorder chunks
- **Delete Individual Chunks**: Remove unwanted recordings
- **Preview Mode**: Watch any recording before export

### 📥 Export & Download
- **Two Export Types**:
  - **Solo Recording**: Just your performance
  - **Comparison Video**: Original movie interleaved with your recordings
- **Quality Options**: 480p, 720p, 1080p
- **Format Selection**: MP4 or WebM
- **FPS Control**: 24, 30, or 60 frames per second
- **Download History**: Track all exported videos

### ⚙️ Settings & Configuration
- **Theme Toggle**: Dark/light mode
- **Device Selection**: Choose microphone and camera
- **Audio Output**: Select playback device
- **Data Management**: Clear local data and cache
- **App Information**: Version and details

## Tech Stack

### Frontend
- **React 18** with TypeScript and Strict Mode
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Zustand** for state management
- **React Router** for navigation
- **Axios** for API communication

### Backend
- **Node.js** with Express.js
- **TypeScript** with strict mode
- **SQLite3** database
- **FFmpeg** for video processing
- **Multer** for file uploads
- **Winston** for logging
- **Zod** for validation

### DevOps
- **Docker** for containerization
- **Docker Compose** for local development
- **ESLint** for linting
- **Prettier** for code formatting

## Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- FFmpeg and FFprobe installed
- Docker (optional, for containerized development)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd movie-mimic
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration (or use defaults for development).

4. **Install FFmpeg**:
   - **Ubuntu/Debian**: `sudo apt-get install ffmpeg`
   - **macOS**: `brew install ffmpeg`
   - **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html)

5. **Start the application**:
   ```bash
   # Start both frontend and backend
   npm run dev

   # Or use Docker
   npm run docker:up
   ```

6. **Open your browser**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000/api/health

## Usage Guide

### 1. Import a Video

1. Click "Import Video" on the dashboard
2. Drag and drop a video file or click to browse
3. Wait for upload and thumbnail generation
4. Your video appears in the dashboard

### 2. Start a Practice Session

1. Click on a video card
2. A new session is created
3. **PLAY MODE**: Watch the movie with subtitles
4. Press **Spacebar** to switch to **RECORD MODE**
5. Record yourself mimicking the actor
6. Press **Spacebar** again to stop recording and switch back
7. Repeat as needed

### 3. Review and Edit Recordings

1. Navigate to the Session Review page
2. See all recording chunks in order
3. Preview individual chunks
4. Delete unwanted recordings
5. Reorder chunks if needed
6. Rename the session

### 4. Export Videos

1. Go to the Export page
2. Choose export settings (quality, format, FPS)
3. Export either:
   - **Solo Recording**: Just your performance
   - **Comparison Video**: Movie + your recordings interleaved
4. Wait for processing to complete
5. Download your exported videos

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Toggle between PLAY and RECORD modes |
| `Esc` | Exit current session |
| `Arrow Left/Right` | Seek backward/forward (in video player) |

## Project Structure

```
movie-mimic/
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable React components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── services/     # API services
│   │   ├── store/        # State management (Zustand)
│   │   ├── utils/        # Utility functions
│   │   └── types/        # TypeScript types
│   ├── public/           # Static assets
│   └── package.json
├── backend/              # Node.js/Express backend
│   ├── src/
│   │   ├── config/       # Configuration files
│   │   ├── database/     # Database setup and migrations
│   │   ├── middleware/   # Express middleware
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   └── utils/        # Utility functions
│   └── package.json
├── shared/               # Shared types and constants
│   ├── types/
│   └── constants/
├── uploads/              # Uploaded files (gitignored)
│   ├── videos/
│   ├── subtitles/
│   ├── recordings/
│   ├── exports/
│   └── thumbnails/
├── data/                 # Database files (gitignored)
├── docker-compose.yml    # Docker configuration
├── package.json          # Root package.json
└── README.md
```

## API Documentation

See [API.md](./API.md) for complete API documentation.

### Main Endpoints

- `GET /api/health` - Health check
- `GET /api/config` - Application configuration
- `POST /api/videos/upload` - Upload a video
- `GET /api/videos` - List all videos
- `POST /api/sessions` - Create a new session
- `GET /api/sessions/:id` - Get session details
- `POST /api/sessions/:id/recordings` - Upload recording
- `POST /api/sessions/:id/export` - Export session as video

## Development

### Running Tests

```bash
# Run linter
npm run lint

# Run linter with auto-fix
npm run lint:fix

# Format code
npm run format
```

### Building for Production

```bash
# Build all packages
npm run build

# Build frontend only
npm run build:frontend

# Build backend only
npm run build:backend
```

### Database Management

```bash
# Run migrations
npm run db:migrate

# Seed database (for testing)
npm run db:seed
```

## Docker Deployment

### Using Docker Compose

```bash
# Start all services
npm run docker:up

# View logs
npm run docker:logs

# Stop all services
npm run docker:down
```

### Production Deployment

1. Build the Docker images:
   ```bash
   docker-compose build
   ```

2. Start the services:
   ```bash
   docker-compose up -d
   ```

3. Configure reverse proxy (nginx, traefik, etc.) for HTTPS

## Troubleshooting

### FFmpeg Not Found

If you see "FFmpeg not found" error:

- **Linux**: `sudo apt-get install ffmpeg` or `sudo yum install ffmpeg`
- **macOS**: `brew install ffmpeg`
- **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH

### Port Already in Use

Change the port in `.env`:
```
PORT=5001
```

### File Upload Fails

Check:
- File size is under 2GB limit
- File format is supported (MP4, WebM, MKV, AVI, MOV)
- Uploads directory has write permissions
- FFmpeg is properly installed

### Database Errors

Reset the database:
```bash
rm -f data/movie-mimic.sqlite
```

The database will be recreated on next restart.

## Roadmap

### Future Features

- [ ] User authentication and accounts
- [ ] Cloud storage (S3, Google Cloud)
- [ ] Speech recognition for accuracy scoring
- [ ] Pose detection for gesture analysis
- [ ] Accent analysis and feedback
- [ ] Emotion detection from facial expressions
- [ ] Collaborative recording sessions
- [ ] Analytics and progress tracking
- [ ] Mobile apps (iOS, Android)
- [ ] Social sharing features

### AI Integration

The application is designed to support future AI features:

- Speech-to-text for accuracy measurement
- Real-time feedback on pronunciation
- Gesture and emotion analysis
- Personalized learning recommendations

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run linter and formatter
5. Submit a pull request

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Support

For issues, questions, or suggestions:

1. Check the [troubleshooting section](#troubleshooting)
2. Review the [API documentation](./API.md)
3. Check the [setup guide](./SETUP.md)
4. Open an issue on GitHub

## Credits

Built with ❤️ for language learners worldwide.

---

**Happy Practicing!** 🎬🎤
