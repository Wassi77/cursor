/**
 * Shared constants used across frontend and backend
 * Provides configuration values and application-wide constants
 */

/**
 * Supported video formats for upload and processing
 */
export const SUPPORTED_VIDEO_FORMATS = ['mp4', 'webm', 'mkv', 'avi', 'mov'] as const;

/**
 * Supported subtitle formats
 */
export const SUPPORTED_SUBTITLE_FORMATS = ['srt', 'vtt', 'ass'] as const;

/**
 * Maximum file upload size (2GB)
 */
export const MAX_UPLOAD_SIZE = 2_147_483_648; // 2GB in bytes

/**
 * Default pagination settings
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * Export quality presets with their resolutions
 */
export const QUALITY_PRESETS = {
  '480p': { width: 854, height: 480, bitrate: '1500k' },
  '720p': { width: 1280, height: 720, bitrate: '3000k' },
  '1080p': { width: 1920, height: 1080, bitrate: '6000k' },
} as const;

/**
 * Supported FPS values
 */
export const SUPPORTED_FPS = [24, 30, 60] as const;

/**
 * Default FPS
 */
export const DEFAULT_FPS = 30;

/**
 * Playback speed options
 */
export const PLAYBACK_SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0] as const;

/**
 * Default playback speed
 */
export const DEFAULT_PLAYBACK_SPEED = 1.0;

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  // Health
  HEALTH: '/api/health',
  CONFIG: '/api/config',

  // Videos
  VIDEOS: '/api/videos',
  VIDEO_BY_ID: (id: string) => `/api/videos/${id}`,
  VIDEO_THUMBNAIL: (id: string) => `/api/videos/${id}/thumbnail`,

  // Subtitles
  VIDEO_SUBTITLES: (id: string) => `/api/videos/${id}/subtitles`,

  // Sessions
  SESSIONS: '/api/sessions',
  SESSION_BY_ID: (id: string) => `/api/sessions/${id}`,

  // Recordings
  SESSION_RECORDINGS: (sessionId: string) => `/api/sessions/${sessionId}/recordings`,
  RECORDING_BY_ID: (sessionId: string, chunkId: string) =>
    `/api/sessions/${sessionId}/recordings/${chunkId}`,

  // Exports
  SESSION_EXPORT: (sessionId: string) => `/api/sessions/${sessionId}/export`,
  EXPORT_STATUS: (sessionId: string) => `/api/sessions/${sessionId}/export/status`,
  EXPORT_DOWNLOAD: (sessionId: string, type: string) =>
    `/api/sessions/${sessionId}/download/${type}`,
} as const;

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Error codes
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_FORMAT: 'INVALID_FILE_FORMAT',
  VIDEO_PROCESSING_ERROR: 'VIDEO_PROCESSING_ERROR',
  EXPORT_ERROR: 'EXPORT_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  VIDEO_NOT_FOUND: 'Video not found',
  SESSION_NOT_FOUND: 'Session not found',
  RECORDING_NOT_FOUND: 'Recording not found',
  INVALID_VIDEO_FORMAT: 'Invalid video format',
  INVALID_SUBTITLE_FORMAT: 'Invalid subtitle format',
  FILE_TOO_LARGE: 'File size exceeds maximum limit',
  EXPORT_FAILED: 'Export failed',
  DATABASE_ERROR: 'Database operation failed',
  UNAUTHORIZED: 'Unauthorized access',
} as const;

/**
 * File storage paths
 */
export const STORAGE_PATHS = {
  UPLOADS: './uploads',
  VIDEOS: './uploads/videos',
  SUBTITLES: './uploads/subtitles',
  RECORDINGS: './uploads/recordings',
  EXPORTS: './uploads/exports',
  THUMBNAILS: './uploads/thumbnails',
  TEMP: './uploads/temp',
} as const;

/**
 * Default keyboard shortcuts
 */
export const DEFAULT_KEYBOARD_SHORTCUTS = {
  togglePlayPause: 'Space',
  toggleRecord: 'Space',
  exitSession: 'Escape',
  seekForward: 'ArrowRight',
  seekBackward: 'ArrowLeft',
} as const;

/**
 * Session status transitions
 */
export const SESSION_STATUS_TRANSITIONS: Record<string, string[]> = {
  active: ['completed', 'archived'],
  completed: ['archived', 'active'],
  exporting: ['exported', 'failed'],
  exported: ['archived'],
  failed: ['active'],
  archived: [],
};

/**
 * Recording chunk time limits
 */
export const MIN_CHUNK_DURATION = 1000; // 1 second minimum
export const MAX_CHUNK_DURATION = 60000; // 60 seconds maximum
export const DEFAULT_CHUNK_DURATION = 10000; // 10 seconds default

/**
 * Thumbnail generation settings
 */
export const THUMBNAIL_TIMESTAMP = 5; // Generate thumbnail at 5 seconds
export const THUMBNAIL_WIDTH = 320;
export const THUMBNAIL_HEIGHT = 180;

/**
 * Rate limiting settings
 */
export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
} as const;

/**
 * Export progress update interval (milliseconds)
 */
export const EXPORT_PROGRESS_INTERVAL = 1000;

/**
 * WebSocket events (if using real-time updates)
 */
export const WS_EVENTS = {
  EXPORT_PROGRESS: 'export:progress',
  EXPORT_COMPLETE: 'export:complete',
  EXPORT_ERROR: 'export:error',
} as const;

/**
 * Application metadata
 */
export const APP_INFO = {
  NAME: 'Movie Mimic',
  VERSION: '1.0.0',
  DESCRIPTION: 'Practice English by mimicking actors from movies',
} as const;

/**
 * Browser local storage keys
 */
export const STORAGE_KEYS = {
  THEME: 'movie-mimic-theme',
  PREFERENCES: 'movie-mimic-preferences',
  RECENT_SESSIONS: 'movie-mimic-recent-sessions',
} as const;

/**
 * Color palette (NO PURPLE)
 */
export const COLORS = {
  primary: {
    DEFAULT: '#3b82f6', // Blue 500
    hover: '#2563eb', // Blue 600
    light: '#60a5fa', // Blue 400
  },
  success: {
    DEFAULT: '#22c55e', // Green 500
    hover: '#16a34a', // Green 600
  },
  warning: {
    DEFAULT: '#f59e0b', // Amber 500
    hover: '#d97706', // Amber 600
  },
  error: {
    DEFAULT: '#ef4444', // Red 500
    hover: '#dc2626', // Red 600
  },
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
} as const;

/**
 * Animation durations (milliseconds)
 */
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;
