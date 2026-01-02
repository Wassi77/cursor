/**
 * Video service - handles all video-related business logic
 * Manages video upload, metadata extraction, thumbnail generation, and file operations
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import logger from '../utils/logger';
import { getVideoMetadata, generateThumbnail } from '../utils/ffmpegWrapper';
import {
  deleteFile,
  generateUniqueFilename,
  getFileSize,
} from '../utils/fileSystem';
import { VIDEOS_DIR, THUMBNAILS_DIR } from '../config';
import { Video, VideoMetadata as SharedVideoMetadata, VideoFormat } from '@movie-mimic/shared/types';
import { AppError } from '../middleware/errorHandler';

/**
 * Upload and process a video file
 */
export async function uploadVideo(
  file: Express.Multer.File,
  originalName: string
): Promise<Video> {
  const db = getDatabase();

  try {
    // Generate unique filename
    const filename = generateUniqueFilename(originalName);
    const filepath = `${VIDEOS_DIR}/${filename}`;
    const format = originalName.split('.').pop()?.toLowerCase() as VideoFormat;

    // Get video metadata using FFprobe
    const metadata = await getVideoMetadata(file.path);

    // Generate thumbnail
    const thumbnailFilename = `thumb_${filename.replace(/\.[^/.]+$/, '')}.jpg`;
    const thumbnailPath = `${THUMBNAILS_DIR}/${thumbnailFilename}`;
    await generateThumbnail(file.path, thumbnailPath);

    // Create video object
    const video: Video = {
      id: uuidv4(),
      filename,
      originalName,
      format,
      duration: Math.round(metadata.duration * 1000), // Convert to milliseconds
      resolution: `${metadata.width}x${metadata.height}`,
      filepath,
      subtitlePath: null,
      uploadedAt: new Date().toISOString(),
      metadata: {
        codec: metadata.codec,
        bitrate: metadata.bitrate,
        framerate: metadata.framerate,
        size: file.size,
        hasAudio: metadata.hasAudio,
        hasSubtitles: false,
      },
      thumbnailPath,
    };

    // Save to database
    await db.run(
      `INSERT INTO videos (
        id, filename, originalName, format, duration, resolution,
        filepath, subtitlePath, uploadedAt, metadata, thumbnailPath
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        video.id,
        video.filename,
        video.originalName,
        video.format,
        video.duration,
        video.resolution,
        video.filepath,
        video.subtitlePath,
        video.uploadedAt,
        JSON.stringify(video.metadata),
        video.thumbnailPath,
      ]
    );

    logger.info('Video uploaded successfully', { videoId: video.id, filename });
    return video;
  } catch (error) {
    logger.error('Failed to upload video', { error, filename: originalName });
    throw new AppError('Failed to upload video', 500, 'VIDEO_UPLOAD_ERROR');
  }
}

/**
 * Get all videos with pagination
 */
export async function listVideos(
  page: number = 1,
  limit: number = 20
): Promise<{ videos: Video[]; total: number; page: number; totalPages: number }> {
  const db = getDatabase();

  try {
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await db.get('SELECT COUNT(*) as count FROM videos');
    const total = countResult?.count || 0;

    // Get videos with pagination
    const rows = await db.all(
      `SELECT * FROM videos ORDER BY uploadedAt DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const videos = rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata),
    }));

    return {
      videos,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    logger.error('Failed to list videos', { error });
    throw new AppError('Failed to retrieve videos', 500, 'VIDEO_LIST_ERROR');
  }
}

/**
 * Get a video by ID
 */
export async function getVideoById(id: string): Promise<Video | null> {
  const db = getDatabase();

  try {
    const row = await db.get('SELECT * FROM videos WHERE id = ?', [id]);

    if (!row) {
      return null;
    }

    return {
      ...row,
      metadata: JSON.parse(row.metadata),
    };
  } catch (error) {
    logger.error('Failed to get video', { error, videoId: id });
    throw new AppError('Failed to retrieve video', 500, 'VIDEO_GET_ERROR');
  }
}

/**
 * Delete a video and all associated data
 */
export async function deleteVideo(id: string): Promise<void> {
  const db = getDatabase();

  try {
    const video = await getVideoById(id);
    if (!video) {
      throw new AppError('Video not found', 404, 'VIDEO_NOT_FOUND');
    }

    // Delete video file
    await deleteFile(video.filepath);

    // Delete thumbnail if exists
    if (video.thumbnailPath) {
      await deleteFile(video.thumbnailPath);
    }

    // Delete subtitle file if exists
    if (video.subtitlePath) {
      await deleteFile(video.subtitlePath);
    }

    // Delete from database (cascades to sessions, recordings, exports)
    await db.run('DELETE FROM videos WHERE id = ?', [id]);

    logger.info('Video deleted successfully', { videoId: id });
  } catch (error) {
    logger.error('Failed to delete video', { error, videoId: id });
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to delete video', 500, 'VIDEO_DELETE_ERROR');
  }
}

/**
 * Update video metadata
 */
export async function updateVideo(
  id: string,
  updates: Partial<Omit<Video, 'id' | 'filename' | 'uploadedAt'>>
): Promise<Video> {
  const db = getDatabase();

  try {
    const video = await getVideoById(id);
    if (!video) {
      throw new AppError('Video not found', 404, 'VIDEO_NOT_FOUND');
    }

    const updatedVideo = { ...video, ...updates, updatedAt: new Date().toISOString() };

    await db.run(
      `UPDATE videos SET
        originalName = ?, subtitlePath = ?, metadata = ?, thumbnailPath = ?, updatedAt = ?
      WHERE id = ?`,
      [
        updatedVideo.originalName,
        updatedVideo.subtitlePath,
        JSON.stringify(updatedVideo.metadata),
        updatedVideo.thumbnailPath,
        updatedVideo.updatedAt,
        id,
      ]
    );

    return updatedVideo;
  } catch (error) {
    logger.error('Failed to update video', { error, videoId: id });
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to update video', 500, 'VIDEO_UPDATE_ERROR');
  }
}

/**
 * Get video statistics
 */
export async function getVideoStats(): Promise<{ totalVideos: number; totalDuration: number; totalSize: number }> {
  const db = getDatabase();

  try {
    const result = await db.get(`
      SELECT
        COUNT(*) as totalVideos,
        SUM(duration) as totalDuration
      FROM videos
    `);

    let totalSize = 0;
    const videos = await listVideos(1, 1000);
    for (const video of videos.videos) {
      totalSize += video.metadata.size;
    }

    return {
      totalVideos: result?.totalVideos || 0,
      totalDuration: result?.totalDuration || 0,
      totalSize,
    };
  } catch (error) {
    logger.error('Failed to get video stats', { error });
    throw new AppError('Failed to get video statistics', 500, 'VIDEO_STATS_ERROR');
  }
}
