/**
 * Shared TypeScript interfaces and types used across frontend and backend
 * Single source of truth for data structures in the application
 */

/**
 * Video entity representing an imported movie or video file
 */
export interface Video {
  id: string;
  filename: string;
  originalName: string;
  format: VideoFormat;
  duration: number; // Duration in milliseconds
  resolution: string; // e.g., "1920x1080"
  filepath: string;
  subtitlePath: string | null;
  uploadedAt: string; // ISO 8601 timestamp
  metadata: VideoMetadata;
  thumbnailPath?: string;
}

/**
 * Supported video file formats
 */
export type VideoFormat = 'mp4' | 'webm' | 'mkv' | 'avi' | 'mov';

/**
 * Extended metadata about a video file
 */
export interface VideoMetadata {
  codec: string;
  bitrate: number;
  framerate: number;
  size: number; // File size in bytes
  hasAudio: boolean;
  hasSubtitles: boolean;
}

/**
 * Recording/practice session for a video
 */
export interface Session {
  id: string;
  videoId: string;
  video?: Video; // Populated when needed
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  totalDuration: number; // Total recorded time in milliseconds
  status: SessionStatus;
  exportedAt: string | null;
  metadata: SessionMetadata;
}

/**
 * Current status of a session
 */
export type SessionStatus = 'active' | 'completed' | 'exporting' | 'exported' | 'archived';

/**
 * Extended metadata for a session
 */
export interface SessionMetadata {
  totalChunks: number;
  averageChunkDuration: number;
  notes: string;
}

/**
 * A single recorded chunk within a session
 */
export interface RecordingChunk {
  id: string;
  sessionId: string;
  duration: number; // Duration in milliseconds
  order: number; // Sequence order within the session
  filepath: string;
  createdAt: string;
  thumbnailPath?: string;
  metadata: RecordingMetadata;
}

/**
 * Metadata about a recording chunk
 */
export interface RecordingMetadata {
  size: number; // File size in bytes
  format: string;
  audioCodec: string;
  videoCodec: string;
}

/**
 * Exported video record
 */
export interface Export {
  id: string;
  sessionId: string;
  type: ExportType;
  format: ExportFormat;
  quality: ExportQuality;
  fps: number;
  filepath: string;
  filesize: number;
  createdAt: string;
  downloadedAt: string | null;
}

/**
 * Type of export - solo recording or comparison with original video
 */
export type ExportType = 'solo' | 'comparison';

/**
 * Video format for exports
 */
export type ExportFormat = 'mp4' | 'webm';

/**
 * Quality presets for video export
 */
export type ExportQuality = '480p' | '720p' | '1080p';

/**
 * Settings for video export
 */
export interface ExportSettings {
  quality: ExportQuality;
  format: ExportFormat;
  fps: number;
  type: ExportType;
}

/**
 * Current status of an export job
 */
export interface ExportStatus {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100 percentage
  eta?: number; // Estimated time remaining in seconds
  error?: string;
}

/**
 * User preferences and settings (stored locally)
 */
export interface UserPreferences {
  theme: 'light' | 'dark';
  audioInputDeviceId: string | null;
  audioOutputDeviceId: string | null;
  videoInputDeviceId: string | null;
  defaultQuality: ExportQuality;
  defaultFormat: ExportFormat;
  defaultFps: number;
  keyboardShortcuts: KeyboardShortcuts;
}

/**
 * Customizable keyboard shortcuts
 */
export interface KeyboardShortcuts {
  togglePlayPause: string;
  toggleRecord: string;
  exitSession: string;
  seekForward: string;
  seekBackward: string;
}

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode: number;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Recording state for frontend
 */
export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  chunks: RecordingChunk[];
  currentChunkStartTime: number | null;
}

/**
 * Playback state for video player
 */
export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
}

/**
 * Session practice mode
 */
export type PracticeMode = 'play' | 'record';

/**
 * Subtitle entry
 */
export interface Subtitle {
  index: number;
  startTime: number; // In milliseconds
  endTime: number; // In milliseconds
  text: string;
}

/**
 * Subtitle file format
 */
export type SubtitleFormat = 'srt' | 'vtt' | 'ass';

/**
 * Parsed subtitle file
 */
export interface ParsedSubtitles {
  format: SubtitleFormat;
  subtitles: Subtitle[];
  language?: string;
}

/**
 * Statistics for dashboard
 */
export interface Statistics {
  totalSessions: number;
  totalRecordingTime: number; // In milliseconds
  totalVideos: number;
  recentSessions: Session[];
}
