# Movie Mimic API Documentation

Complete API reference for the Movie Mimic backend.

## Base URL

```
http://localhost:5000/api
```

## Authentication

Currently, no authentication is required. This may change in future versions.

## Response Format

All API responses follow this structure:

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

## Endpoints

### Health & Configuration

#### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "success": true,
  "message": "Movie Mimic API is running",
  "timestamp": "2025-01-02T10:00:00.000Z"
}
```

#### GET /api/config

Get application configuration and limits.

**Response:**
```json
{
  "success": true,
  "data": {
    "maxUploadSize": 2147483648,
    "allowedVideoFormats": ["mp4", "webm", "mkv", "avi", "mov"],
    "allowedSubtitleFormats": ["srt", "vtt", "ass"],
    "qualities": ["480p", "720p", "1080p"],
    "formats": ["mp4", "webm"],
    "fps": [24, 30, 60]
  }
}
```

---

## Video Endpoints

### POST /api/videos/upload

Upload a new video file.

**Request:** `multipart/form-data`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| video | File | Yes | Video file (max 2GB) |
| originalName | String | No | Original filename (auto-detected if not provided) |

**Supported Formats:** MP4, WebM, MKV, AVI, MOV

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "filename": "video_1234567890_abc123.mp4",
    "originalName": "My Movie.mp4",
    "format": "mp4",
    "duration": 7200000,
    "resolution": "1920x1080",
    "filepath": "/uploads/videos/video_1234567890_abc123.mp4",
    "subtitlePath": null,
    "uploadedAt": "2025-01-02T10:00:00.000Z",
    "metadata": {
      "codec": "h264",
      "bitrate": 5000000,
      "framerate": 29.97,
      "size": 104857600,
      "hasAudio": true,
      "hasSubtitles": false
    },
    "thumbnailPath": "/uploads/thumbnails/thumb_video_1234567890_abc123.jpg"
  }
}
```

**Error Responses:**

- `400` - No file provided
- `400` - Invalid file format
- `413` - File too large (max 2GB)
- `500` - Server error

### GET /api/videos

List all videos with pagination.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | Integer | 1 | Page number |
| limit | Integer | 20 | Items per page (max 100) |

**Request:**
```
GET /api/videos?page=1&limit=10
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "videos": [ ... ],
    "total": 25,
    "page": 1,
    "totalPages": 3
  }
}
```

### GET /api/videos/:id

Get details of a specific video.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | String | Video ID |

**Success Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "filename": "video_1234567890_abc123.mp4",
    "originalName": "My Movie.mp4",
    "format": "mp4",
    "duration": 7200000,
    "resolution": "1920x1080",
    "filepath": "/uploads/videos/video_1234567890_abc123.mp4",
    "subtitlePath": null,
    "uploadedAt": "2025-01-02T10:00:00.000Z",
    "metadata": { ... },
    "thumbnailPath": "/uploads/thumbnails/thumb_video_1234567890_abc123.jpg"
  }
}
```

**Error Responses:**

- `404` - Video not found

### PUT /api/videos/:id

Update video metadata.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | String | Video ID |

**Request Body:**
```json
{
  "originalName": "Updated Name.mp4",
  "subtitlePath": "/uploads/subtitles/subtitles.srt"
}
```

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

### DELETE /api/videos/:id

Delete a video and all associated sessions.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | String | Video ID |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Video deleted successfully"
}
```

**Note:** This will cascade delete all sessions and recordings associated with this video.

---

## Session Endpoints

### POST /api/sessions

Create a new practice session for a video.

**Request Body:**
```json
{
  "videoId": "uuid",
  "name": "My Practice Session",
  "description": "Optional description"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "videoId": "uuid",
    "name": "My Practice Session",
    "description": "Optional description",
    "createdAt": "2025-01-02T10:00:00.000Z",
    "updatedAt": "2025-01-02T10:00:00.000Z",
    "totalDuration": 0,
    "status": "active",
    "exportedAt": null,
    "metadata": {
      "totalChunks": 0,
      "averageChunkDuration": 0,
      "notes": ""
    }
  }
}
```

### GET /api/sessions

List all sessions with optional filters.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | Integer | 1 | Page number |
| limit | Integer | 20 | Items per page |
| videoId | String | - | Filter by video ID |
| status | String | - | Filter by status (active, completed, exporting, exported, archived) |

**Request:**
```
GET /api/sessions?page=1&limit=10&status=active
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [ ... ],
    "total": 15,
    "page": 1,
    "totalPages": 2
  }
}
```

### GET /api/sessions/:id

Get details of a specific session.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | String | Session ID |
| includeVideo | Boolean | false | Include video details in response |

**Request:**
```
GET /api/sessions/:id?includeVideo=true
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "videoId": "uuid",
    "video": { ... },
    "name": "My Practice Session",
    ...
  }
}
```

### PUT /api/sessions/:id

Update session metadata.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | String | Session ID |

**Request Body:**
```json
{
  "name": "Updated Session Name",
  "description": "Updated description",
  "status": "completed"
}
```

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

### DELETE /api/sessions/:id

Delete a session and all its recordings.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | String | Session ID |

**Success Response:**
```json
{
  "success": true,
  "message": "Session deleted successfully"
}
```

**Note:** This will cascade delete all recordings and exports associated with this session.

---

## Recording Endpoints

### POST /api/sessions/:sessionId/recordings

Upload a recording chunk.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| sessionId | String | Session ID |

**Request:** `multipart/form-data`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| recording | File | Yes | Video/audio recording file |
| duration | Number | Yes | Duration in seconds |

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sessionId": "uuid",
    "duration": 10000,
    "order": 1,
    "filepath": "/uploads/recordings/recording_uuid.mp4",
    "createdAt": "2025-01-02T10:00:00.000Z",
    "metadata": {
      "size": 1048576,
      "format": "webm",
      "audioCodec": "opus",
      "videoCodec": "vp9"
    }
  }
}
```

### GET /api/sessions/:sessionId/recordings

Get all recording chunks for a session.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| sessionId | String | Session ID |

**Success Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sessionId": "uuid",
      "duration": 10000,
      "order": 1,
      "filepath": "/uploads/recordings/recording_1.webm",
      "createdAt": "2025-01-02T10:00:00.000Z",
      "metadata": { ... }
    },
    ...
  ]
}
```

### DELETE /api/sessions/:sessionId/recordings/:chunkId

Delete a specific recording chunk.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| sessionId | String | Session ID |
| chunkId | String | Recording chunk ID |

**Success Response:**
```json
{
  "success": true,
  "message": "Recording deleted successfully"
}
```

**Note:** Remaining chunks will be automatically re-ordered.

### PUT /api/sessions/:sessionId/recordings/reorder

Reorder recording chunks.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| sessionId | String | Session ID |

**Request Body:**
```json
{
  "recordingIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Recordings reordered successfully"
}
```

### DELETE /api/sessions/:sessionId/recordings

Delete all recordings for a session.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| sessionId | String | Session ID |

**Success Response:**
```json
{
  "success": true,
  "message": "All recordings deleted successfully"
}
```

---

## Export Endpoints

### POST /api/sessions/:sessionId/export

Export a session as a video.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| sessionId | String | Session ID |

**Request Body:**
```json
{
  "type": "solo",
  "format": "mp4",
  "quality": "720p",
  "fps": 30
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| type | String | Yes | Export type: "solo" or "comparison" |
| format | String | Yes | Video format: "mp4" or "webm" |
| quality | String | Yes | Quality: "480p", "720p", or "1080p" |
| fps | Number | Yes | Frame rate: 24, 30, or 60 |

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sessionId": "uuid",
    "type": "solo",
    "format": "mp4",
    "quality": "720p",
    "fps": 30,
    "filepath": "/uploads/exports/export_uuid.mp4",
    "filesize": 52428800,
    "createdAt": "2025-01-02T10:00:00.000Z",
    "downloadedAt": null
  }
}
```

**Export Types:**

- **solo**: Concatenate user recordings only
- **comparison**: Interleave original video with user recordings

### GET /api/sessions/:sessionId/exports

Get all exports for a session.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| sessionId | String | Session ID |

**Success Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sessionId": "uuid",
      "type": "solo",
      "format": "mp4",
      "quality": "720p",
      "fps": 30,
      "filepath": "/uploads/exports/export_uuid.mp4",
      "filesize": 52428800,
      "createdAt": "2025-01-02T10:00:00.000Z",
      "downloadedAt": null
    },
    ...
  ]
}
```

### GET /api/sessions/:sessionId/export/status

Check export progress/status.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| sessionId | String | Session ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| exportId | String | Yes | Export ID |

**Request:**
```
GET /api/sessions/:sessionId/export/status?exportId=uuid
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "exportId": "uuid",
    "status": "completed",
    "progress": 100,
    "eta": null
  }
}
```

**Status Values:**

- `pending`: Export queued
- `processing`: Export in progress
- `completed`: Export ready
- `failed`: Export failed

### GET /api/sessions/:sessionId/download/:exportId

Download an exported video.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| sessionId | String | Session ID |
| exportId | String | Export ID |

**Response:**

- Content-Type: `video/mp4` or `video/webm`
- Content-Disposition: `attachment; filename="export_uuid.mp4"`
- Binary video file

### DELETE /api/exports/:exportId

Delete an export.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| exportId | String | Export ID |

**Success Response:**
```json
{
  "success": true,
  "message": "Export deleted successfully"
}
```

---

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| VALIDATION_ERROR | Request validation failed | 400 |
| NOT_FOUND | Resource not found | 404 |
| FILE_TOO_LARGE | File exceeds size limit | 413 |
| INVALID_FILE_FORMAT | File format not supported | 400 |
| VIDEO_PROCESSING_ERROR | Error processing video | 500 |
| EXPORT_ERROR | Failed to export video | 500 |
| DATABASE_ERROR | Database operation failed | 500 |
| UNAUTHORIZED | Authentication required | 401 |
| RATE_LIMIT_EXCEEDED | Too many requests | 429 |

---

## Rate Limiting

API endpoints are rate limited:

- Window: 15 minutes
- Max Requests: 100 per window

**Rate Limit Response (429):**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests from this IP, please try again later."
  }
}
```

---

## File Upload Limits

- Maximum file size: 2GB (2,147,483,648 bytes)
- Supported video formats: MP4, WebM, MKV, AVI, MOV
- Supported subtitle formats: SRT, VTT, ASS

---

## WebSocket Events (Future)

Future versions may support WebSocket events for real-time updates:

- `export:progress` - Export progress updates
- `export:complete` - Export completed
- `export:error` - Export failed

---

## Testing with cURL

### Upload a Video

```bash
curl -X POST \
  http://localhost:5000/api/videos/upload \
  -F "video=@/path/to/video.mp4" \
  -F "originalName=My Movie.mp4"
```

### Create a Session

```bash
curl -X POST \
  http://localhost:5000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"videoId":"uuid","name":"My Session"}'
```

### Export a Session

```bash
curl -X POST \
  http://localhost:5000/api/sessions/uuid/export \
  -H "Content-Type: application/json" \
  -d '{"type":"solo","format":"mp4","quality":"720p","fps":30}'
```

---

## Postman Collection

A Postman collection will be available in the `/docs` folder for easy API testing.
