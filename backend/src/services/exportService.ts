/**
 * Export service - handles video export and merging operations
 * Manages the creation of solo and comparison videos
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import logger from '../utils/logger';
import { mergeVideos, createComparisonVideo, getFileSize } from '../utils/ffmpegWrapper';
import { EXPORTS_DIR } from '../config';
import { Export, ExportSettings, ExportStatus } from '@movie-mimic/shared/types';
import { AppError } from '../middleware/errorHandler';
import { getVideoById } from './videoService';
import { getSessionById } from './sessionService';
import { getRecordings } from './recordingService';

/**
 * Export a session as a video
 */
export async function exportSession(
  sessionId: string,
  settings: ExportSettings
): Promise<Export> {
  const db = getDatabase();

  try {
    // Get session with video
    const session = await getSessionById(sessionId, true);
    if (!session) {
      throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
    }

    // Get recordings
    const recordings = await getRecordings(sessionId);
    if (recordings.length === 0) {
      throw new AppError('No recordings found for this session', 400, 'NO_RECORDINGS');
    }

    // Update session status
    await db.run(
      'UPDATE sessions SET status = ? WHERE id = ?',
      ['exporting', sessionId]
    );

    // Generate export filename
    const timestamp = Date.now();
    const exportId = uuidv4();
    const filename = `export_${sessionId}_${settings.type}_${timestamp}.${settings.format}`;
    const filepath = `${EXPORTS_DIR}/${filename}`;

    // Perform export based on type
    if (settings.type === 'solo') {
      // Solo: concatenate user recordings only
      const recordingPaths = recordings.map(r => r.filepath);
      await mergeVideos(recordingPaths, filepath, {
        format: settings.format,
        fps: settings.fps,
        quality: settings.quality,
      });
    } else if (settings.type === 'comparison') {
      // Comparison: interleave original video segments with user recordings
      // For now, we'll use the original video + recordings
      if (!session.video) {
        throw new AppError('Original video not found for comparison', 404, 'VIDEO_NOT_FOUND');
      }
      
      const videoDetails = await getVideoById(session.videoId);
      if (!videoDetails) {
        throw new AppError('Original video not found', 404, 'VIDEO_NOT_FOUND');
      }

      const recordingPaths = recordings.map(r => r.filepath);
      await createComparisonVideo(
        [videoDetails.filepath], // Original video segments (simplified)
        recordingPaths,
        filepath,
        {
          format: settings.format,
          fps: settings.fps,
          quality: settings.quality,
        }
      );
    }

    // Get file size
    const filesize = await getFileSize(filepath);

    // Create export record
    const exportRecord: Export = {
      id: exportId,
      sessionId,
      type: settings.type,
      format: settings.format,
      quality: settings.quality,
      fps: settings.fps,
      filepath,
      filesize,
      createdAt: new Date().toISOString(),
      downloadedAt: null,
    };

    // Save to database
    await db.run(
      `INSERT INTO exports (
        id, sessionId, type, format, quality, fps,
        filepath, filesize, createdAt, downloadedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        exportRecord.id,
        exportRecord.sessionId,
        exportRecord.type,
        exportRecord.format,
        exportRecord.quality,
        exportRecord.fps,
        exportRecord.filepath,
        exportRecord.filesize,
        exportRecord.createdAt,
        exportRecord.downloadedAt,
      ]
    );

    // Update session status
    await db.run(
      'UPDATE sessions SET exportedAt = ?, status = ? WHERE id = ?',
      [new Date().toISOString(), 'exported', sessionId]
    );

    logger.info('Session exported successfully', { exportId, sessionId, type: settings.type });
    return exportRecord;
  } catch (error) {
    logger.error('Failed to export session', { error, sessionId });
    
    // Reset session status
    try {
      await db.run(
        'UPDATE sessions SET status = ? WHERE id = ?',
        ['active', sessionId]
      );
    } catch (err) {
      logger.error('Failed to reset session status', { error: err, sessionId });
    }

    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to export session', 500, 'EXPORT_ERROR');
  }
}

/**
 * Get all exports for a session
 */
export async function getSessionExports(sessionId: string): Promise<Export[]> {
  const db = getDatabase();

  try {
    const rows = await db.all(
      `SELECT * FROM exports WHERE sessionId = ? ORDER BY createdAt DESC`,
      [sessionId]
    );

    return rows;
  } catch (error) {
    logger.error('Failed to get exports', { error, sessionId });
    throw new AppError('Failed to retrieve exports', 500, 'EXPORT_GET_ERROR');
  }
}

/**
 * Get a specific export
 */
export async function getExportById(id: string): Promise<Export | null> {
  const db = getDatabase();

  try {
    const row = await db.get('SELECT * FROM exports WHERE id = ?', [id]);

    return row || null;
  } catch (error) {
    logger.error('Failed to get export', { error, exportId: id });
    throw new AppError('Failed to retrieve export', 500, 'EXPORT_GET_ERROR');
  }
}

/**
 * Mark an export as downloaded
 */
export async function markAsDownloaded(exportId: string): Promise<void> {
  const db = getDatabase();

  try {
    await db.run(
      'UPDATE exports SET downloadedAt = ? WHERE id = ?',
      [new Date().toISOString(), exportId]
    );

    logger.debug('Export marked as downloaded', { exportId });
  } catch (error) {
    logger.error('Failed to mark export as downloaded', { error, exportId });
    throw new AppError('Failed to update export', 500, 'EXPORT_UPDATE_ERROR');
  }
}

/**
 * Delete an export
 */
export async function deleteExport(exportId: string): Promise<void> {
  const db = getDatabase();

  try {
    const exportRecord = await getExportById(exportId);
    if (!exportRecord) {
      throw new AppError('Export not found', 404, 'EXPORT_NOT_FOUND');
    }

    // Delete file
    const fs = await import('fs/promises');
    try {
      await fs.unlink(exportRecord.filepath);
    } catch (err) {
      logger.warn('Failed to delete export file', { error: err, filepath: exportRecord.filepath });
    }

    // Delete from database
    await db.run('DELETE FROM exports WHERE id = ?', [exportId]);

    logger.info('Export deleted successfully', { exportId });
  } catch (error) {
    logger.error('Failed to delete export', { error, exportId });
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to delete export', 500, 'EXPORT_DELETE_ERROR');
  }
}

/**
 * Get export status (for progress tracking)
 * Note: Currently exports are synchronous, but this prepares for async exports
 */
export async function getExportStatus(exportId: string): Promise<ExportStatus> {
  try {
    const exportRecord = await getExportById(exportId);
    if (!exportRecord) {
      throw new AppError('Export not found', 404, 'EXPORT_NOT_FOUND');
    }

    // Since exports are synchronous, status is always completed if found
    return {
      exportId,
      status: 'completed',
      progress: 100,
    };
  } catch (error) {
    logger.error('Failed to get export status', { error, exportId });
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to get export status', 500, 'EXPORT_STATUS_ERROR');
  }
}
