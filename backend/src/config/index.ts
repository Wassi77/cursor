/**
 * Application configuration loaded from environment variables
 * Provides centralized access to all configuration values
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

/**
 * Port for the Express server
 */
export const PORT = parseInt(process.env.PORT || '5000', 10);

/**
 * Node environment (development, production, test)
 */
export const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Database configuration
 */
export const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/movie-mimic.sqlite');

/**
 * File upload configuration
 */
export const MAX_UPLOAD_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE || '2147483648', 10); // 2GB default

export const ALLOWED_VIDEO_FORMATS = process.env.ALLOWED_VIDEO_FORMATS
  ?.split(',')
  .map(f => f.trim()) || ['mp4', 'webm', 'mkv', 'avi', 'mov'];

export const ALLOWED_SUBTITLE_FORMATS = process.env.ALLOWED_SUBTITLE_FORMATS
  ?.split(',')
  .map(f => f.trim()) || ['srt', 'vtt', 'ass'];

/**
 * FFmpeg configuration
 */
export const FFMPEG_PATH = process.env.FFMPEG_PATH || '/usr/bin/ffmpeg';
export const FFPROBE_PATH = process.env.FFPROBE_PATH || '/usr/bin/ffprobe';

/**
 * CORS configuration
 */
export const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

/**
 * Rate limiting configuration
 */
export const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 minutes
export const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);

/**
 * Logging configuration
 */
export const LOG_LEVEL = process.env.LOG_LEVEL || 'debug';
export const LOG_FILE_PATH = process.env.LOG_FILE_PATH || path.join(__dirname, '../../logs/app.log');

/**
 * File storage paths
 */
export const UPLOADS_DIR = path.join(__dirname, '../../uploads');
export const VIDEOS_DIR = path.join(UPLOADS_DIR, 'videos');
export const SUBTITLES_DIR = path.join(UPLOADS_DIR, 'subtitles');
export const RECORDINGS_DIR = path.join(UPLOADS_DIR, 'recordings');
export const EXPORTS_DIR = path.join(UPLOADS_DIR, 'exports');
export const THUMBNAILS_DIR = path.join(UPLOADS_DIR, 'thumbnails');
export const TEMP_DIR = path.join(UPLOADS_DIR, 'temp');

/**
 * API configuration
 */
export const API_PREFIX = '/api';

/**
 * Determine if running in development mode
 */
export const isDevelopment = NODE_ENV === 'development';

/**
 * Determine if running in production mode
 */
export const isProduction = NODE_ENV === 'production';
