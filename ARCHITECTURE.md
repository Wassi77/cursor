# Movie Mimic Architecture

Technical architecture overview of the Movie Mimic application.

## System Overview

Movie Mimic is a full-stack web application built as a monorepo with:

- **Frontend**: React SPA (Single Page Application)
- **Backend**: Node.js REST API
- **Database**: SQLite3
- **Shared**: TypeScript types and constants

```
┌─────────────────────────────────────────────────────────┐
│                   User Browser                       │
│                    (React SPA)                      │
└────────────────────┬────────────────────────────────┘
                     │ HTTP/WebSocket
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   Load Balancer                     │
│                  (Optional - Nginx)                 │
└────────────────────┬────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌────────────────┐      ┌─────────────────┐
│   Frontend     │      │    Backend      │
│   (Vite Dev)   │      │   (Express)     │
│   Port: 5173   │      │   Port: 5000    │
└────────┬───────┘      └────────┬────────┘
         │                       │
         │        Static Assets   │
         │◄─────────────────────┤
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────────────┐
│              File Storage                       │
│         (uploads/ directory)                   │
│  ┌─────────────────────────────────────────┐  │
│  │ videos/ | recordings/ | exports/      │  │
│  └─────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│            SQLite Database                     │
│         (data/movie-mimic.sqlite)             │
│  ┌─────────────────────────────────────────┐  │
│  │ videos | sessions | recordings | exports│  │
│  └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Frontend Architecture

### Technology Stack

- **React 18**: UI library with hooks and strict mode
- **TypeScript**: Type safety and better developer experience
- **Vite**: Build tool and dev server with hot module replacement
- **Tailwind CSS**: Utility-first CSS framework
- **Zustand**: Lightweight state management
- **React Router**: Client-side routing
- **Axios**: HTTP client for API communication

### Directory Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Navigation.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── UploadDropZone.tsx
│   │   └── ConfirmationDialog.tsx
│   ├── pages/             # Page-level components
│   │   ├── Dashboard.tsx
│   │   ├── VideoPractice.tsx
│   │   ├── SessionReview.tsx
│   │   ├── ExportDownload.tsx
│   │   └── Settings.tsx
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API service layer
│   │   └── api.ts
│   ├── store/             # State management
│   │   └── themeStore.ts
│   ├── utils/             # Utility functions
│   ├── types/             # Frontend-specific types
│   ├── assets/            # Static assets
│   ├── App.tsx            # Root component
│   ├── main.tsx           # Entry point
│   └── index.css          # Global styles
├── public/                # Static assets
├── index.html             # HTML template
├── vite.config.ts         # Vite configuration
├── tailwind.config.js     # Tailwind configuration
└── tsconfig.json          # TypeScript config
```

### Component Hierarchy

```
App
├── Navigation
├── Routes
│   ├── Dashboard
│   │   ├── VideoCard
│   │   ├── StatCard
│   │   ├── SessionRow
│   │   └── UploadDropZone (modal)
│   ├── VideoPractice
│   │   ├── VideoPlayer
│   │   ├── WebcamPreview
│   │   └── RecordingControls
│   ├── SessionReview
│   │   ├── ChunkRow
│   │   └── ConfirmationDialog
│   ├── ExportDownload
│   │   └── ExportItem
│   └── Settings
└── LoadingSpinner (global)
```

### State Management

Zustand stores handle application state:

- **Theme Store**: Light/dark mode preference
- Future stores could include:
  - User authentication state
  - Video playback state
  - Recording state

### Data Flow

```
User Action → Component → Hook/Store → API Service → Backend
                     ↓
                Update State
                     ↓
                Re-render
```

## Backend Architecture

### Technology Stack

- **Node.js 18+**: Runtime environment
- **Express.js**: Web framework
- **TypeScript**: Type safety
- **SQLite3**: Embedded database
- **FFmpeg**: Video processing
- **Multer**: File upload handling
- **Winston**: Logging
- **Zod**: Schema validation

### Directory Structure

```
backend/
├── src/
│   ├── config/           # Configuration management
│   │   └── index.ts
│   ├── database/         # Database setup and migrations
│   │   └── connection.ts
│   ├── middleware/       # Express middleware
│   │   ├── errorHandler.ts
│   │   ├── requestValidator.ts
│   │   └── index.ts
│   ├── routes/           # API route definitions
│   │   ├── videoRoutes.ts
│   │   ├── sessionRoutes.ts
│   │   ├── recordingRoutes.ts
│   │   ├── exportRoutes.ts
│   │   └── index.ts
│   ├── services/         # Business logic layer
│   │   ├── videoService.ts
│   │   ├── sessionService.ts
│   │   ├── recordingService.ts
│   │   ├── exportService.ts
│   │   └── index.ts
│   ├── utils/           # Utility functions
│   │   ├── logger.ts
│   │   ├── fileSystem.ts
│   │   └── ffmpegWrapper.ts
│   └── index.ts         # Application entry point
├── uploads/             # File storage (gitignored)
├── data/                # Database files (gitignored)
├── logs/                # Log files (gitignored)
├── Dockerfile           # Docker image
└── package.json
```

### Layer Architecture

```
┌─────────────────────────────────────┐
│           Routes Layer            │  ← HTTP endpoints
│    (videoRoutes, sessionRoutes...) │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│        Services Layer             │  ← Business logic
│  (videoService, sessionService...)  │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      Database/Utils Layer         │  ← Data access
│   (database, fileSystem, ffmpeg)  │
└─────────────────────────────────────┘
```

### Middleware Stack

1. **Helmet**: Security headers
2. **CORS**: Cross-origin resource sharing
3. **Rate Limiting**: Request rate limiting
4. **Body Parser**: JSON and URL-encoded bodies
5. **Morgan**: Request logging
6. **Request Validator**: Input validation (Zod)
7. **Route Handlers**: Business logic
8. **Error Handler**: Error formatting

### Request Flow

```
Client Request
    ↓
Middleware (Security, CORS, Rate Limiting)
    ↓
Request Validator
    ↓
Route Handler
    ↓
Service Layer (Business Logic)
    ↓
Database / FFmpeg / File System
    ↓
Response
    ↓
Error Handler (if error)
```

## Database Schema

### ER Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    Videos   │──────▶│  Sessions   │──────▶│ Recordings  │
│─────────────│  1:N  │─────────────│  1:N  │─────────────│
│ id          │       │ id          │       │ id          │
│ filename    │       │ videoId     │       │ sessionId   │
│ originalName│       │ name        │       │ duration    │
│ format      │       │ description │       │ order       │
│ duration    │       │ status      │       │ filepath    │
│ resolution  │       │ totalDuration│      │ createdAt   │
│ filepath    │       │ metadata    │       │ metadata    │
│ thumbnail   │       │ createdAt   │       └─────────────┘
│ metadata    │       │ updatedAt   │
│ uploadedAt  │       └─────────────┘
└─────────────┘             │
                            ▼ N:1
                    ┌─────────────┐
                    │   Exports   │
                    │─────────────│
                    │ id          │
                    │ sessionId   │
                    │ type        │
                    │ format      │
                    │ quality     │
                    │ fps         │
                    │ filepath    │
                    │ filesize    │
                    │ createdAt   │
                    └─────────────┘
```

### Tables

#### videos
```sql
- id: TEXT (PK)
- filename: TEXT
- originalName: TEXT
- format: TEXT
- duration: INTEGER (ms)
- resolution: TEXT
- filepath: TEXT
- subtitlePath: TEXT
- uploadedAt: TEXT (ISO 8601)
- metadata: TEXT (JSON)
- thumbnailPath: TEXT
- createdAt: TEXT
- updatedAt: TEXT
```

#### sessions
```sql
- id: TEXT (PK)
- videoId: TEXT (FK → videos.id)
- name: TEXT
- description: TEXT
- createdAt: TEXT (ISO 8601)
- updatedAt: TEXT
- totalDuration: INTEGER (ms)
- status: TEXT (active|completed|exporting|exported|archived)
- exportedAt: TEXT (ISO 8601)
- metadata: TEXT (JSON)
```

#### recordings
```sql
- id: TEXT (PK)
- sessionId: TEXT (FK → sessions.id)
- duration: INTEGER (ms)
- order: INTEGER
- filepath: TEXT
- createdAt: TEXT (ISO 8601)
- thumbnailPath: TEXT
- metadata: TEXT (JSON)
```

#### exports
```sql
- id: TEXT (PK)
- sessionId: TEXT (FK → sessions.id)
- type: TEXT (solo|comparison)
- format: TEXT (mp4|webm)
- quality: TEXT (480p|720p|1080p)
- fps: INTEGER
- filepath: TEXT
- filesize: INTEGER (bytes)
- createdAt: TEXT (ISO 8601)
- downloadedAt: TEXT (ISO 8601)
```

## File Storage

### Directory Structure

```
uploads/
├── videos/           # Uploaded video files
├── subtitles/        # Subtitle files
├── recordings/       # User recording chunks
├── exports/          # Exported videos
├── thumbnails/       # Video thumbnails
└── temp/            # Temporary files
```

### File Naming Convention

- Videos: `{originalName}_{timestamp}_{random}.{ext}`
- Thumbnails: `thumb_{videoId}_{timestamp}.jpg`
- Recordings: `recording_{sessionId}_{order}_{timestamp}.webm`
- Exports: `export_{sessionId}_{type}_{timestamp}.{format}`

## Video Processing Pipeline

### Upload Flow

```
1. Client uploads file
   ↓
2. Multer saves to temp/
   ↓
3. FFprobe extracts metadata
   ↓
4. FFmpeg generates thumbnail
   ↓
5. File moved to uploads/videos/
   ↓
6. Record saved to database
```

### Export Flow

```
1. Client requests export
   ↓
2. Service validates session
   ↓
3. FFmpeg merges recordings
   - Solo: Concatenate user recordings
   - Comparison: Interleave video + recordings
   ↓
4. Apply quality/format settings
   ↓
5. Save to uploads/exports/
   ↓
6. Create export record
   ↓
7. Update session status
```

## API Design

### RESTful Principles

- **Resources**: Videos, Sessions, Recordings, Exports
- **HTTP Methods**:
  - `GET`: Retrieve resources
  - `POST`: Create resources
  - `PUT/PATCH`: Update resources
  - `DELETE`: Remove resources
- **Status Codes**:
  - `200`: Success
  - `201`: Created
  - `400`: Bad request
  - `404`: Not found
  - `500`: Server error

### URL Patterns

```
/api/videos                ← List all videos
/api/videos/:id           ← Get specific video
/api/videos/upload         ← Upload video
/api/sessions             ← List all sessions
/api/sessions/:id         ← Get/update/delete session
/api/sessions/:id/recordings  ← Manage recordings
/api/sessions/:id/export  ← Export session
```

### Response Format

```json
{
  "success": true|false,
  "data": { ... },         // On success
  "error": { ... }        // On error
}
```

## Security

### Current Measures

- **Helmet**: Security headers
- **CORS**: Configurable origins
- **Rate Limiting**: 100 requests/15 minutes
- **File Type Validation**: Allowed formats only
- **File Size Limits**: 2GB max
- **Input Validation**: Zod schemas
- **SQL Injection**: Parameterized queries

### Future Enhancements

- User authentication (JWT)
- Role-based access control
- File encryption at rest
- HTTPS enforcement
- Content security policy
- Input sanitization

## Scalability Considerations

### Current Capacity

- Single-server architecture
- SQLite database (suitable for < 100K records)
- Local file storage
- Synchronous video processing

### Scaling Paths

#### Horizontal Scaling
- Load balancer → Multiple backend instances
- Shared storage (NFS, S3)
- PostgreSQL for distributed database
- Redis for caching

#### Vertical Scaling
- Increase server resources
- Optimize database queries
- Implement caching
- Use queues for heavy processing

#### Cloud Migration

- **Storage**: S3, Google Cloud Storage
- **Database**: AWS RDS, Google Cloud SQL
- **Processing**: AWS Lambda, Google Cloud Functions
- **CDN**: CloudFront, Cloud CDN

## Performance Optimization

### Frontend

- Code splitting (React.lazy)
- Lazy loading components
- Image optimization
- Browser caching
- Minification and compression

### Backend

- Database indexes
- Connection pooling (future)
- Response compression
- Static file caching
- FFmpeg optimization

### Video Processing

- Hardware acceleration (GPU)
- Adaptive bitrate streaming
- Parallel processing
- Queue-based exports

## Monitoring & Observability

### Logging

- Structured logging (Winston)
- Multiple log levels
- Separate error logs
- Request logging (Morgan)

### Metrics (Future)

- Request count and duration
- Error rate
- Database query time
- Video processing time
- Storage usage

### Alerts (Future)

- High error rate
- Slow response times
- Disk space warning
- Failed exports

## Deployment Architecture

### Development

```
Developer Machine
    ↓
npm run dev
    ↓
┌──────────────┐
│  Vite Dev    │
│  :5173       │
└──────────────┘
┌──────────────┐
│  Express     │
│  :5000       │
└──────────────┘
```

### Production

```
┌─────────────┐
│   CDN       │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Nginx     │ ← SSL termination, static files
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Docker     │
│  Container  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   App       │
│  (Express)  │
└─────────────┘
```

## Future Architecture

### Planned Enhancements

1. **Microservices**
   - Separate video processing service
   - Dedicated export service
   - Real-time notification service

2. **Event-Driven Architecture**
   - Message queue (RabbitMQ, Bull)
   - Event sourcing
   - Async video processing

3. **Real-time Features**
   - WebSocket support
   - Live progress updates
   - Collaborative sessions

4. **AI Integration**
   - Speech recognition service
   - Pose detection service
   - Analysis pipeline

### Technology Migration Path

```
Current:         Future:
─────────────────────────
SQLite     →     PostgreSQL
Express    →     NestJS / Fastify
FFmpeg     →     MediaPipe / GPU
Local File →     S3 / Cloud Storage
Sync       →     Async (Bull / RabbitMQ)
REST       →     GraphQL (optional)
```

---

This architecture document provides a high-level overview. For detailed implementation, see the source code and [API.md](./API.md).
