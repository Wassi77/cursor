/**
 * Recording service - handles recording chunk management
 * Manages recording uploads, storage, and ordering
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import logger from '../utils/logger';
import { deleteFile, generateUniqueFilename, getFileSize } from '../utils/fileSystem';
import { RECORDINGS_DIR, TEMP_DIR } from '../config';
import { RecordingChunk } from '@movie-mimic/shared/types';
import { AppError } from '../middleware/errorHandler';
import { updateSessionStats } from './sessionService';

/**
 * Save a recording chunk
 */
export async function saveRecording(
  sessionId: string,
  file: Express.Multer.File,
  duration: number
): Promise<RecordingChunk> {
  const db = getDatabase();

  try {
    // Verify session exists
    const session = await db.get('SELECT id FROM sessions WHERE id = ?', [sessionId]);
    if (!session) {
      throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
    }

    // Get current order number
    const result = await db.get(
      'SELECT MAX("order") as maxOrder FROM recordings WHERE sessionId = ?',
      [sessionId]
    );
    const order = (result?.maxOrder || 0) + 1;

    // Generate unique filename
    const filename = generateUniqueFilename(`recording_${sessionId}_${order}.webm`);
    const filepath = `${RECORDINGS_DIR}/${filename}`;

    const recording: RecordingChunk = {
      id: uuidv4(),
      sessionId,
      duration: Math.round(duration * 1000), // Convert to milliseconds
      order,
      filepath,
      createdAt: new Date().toISOString(),
      metadata: {
        size: file.size,
        format: 'webm',
        audioCodec: 'opus',
        videoCodec: 'vp9',
      },
    };

    // Save to database
    await db.run(
      `INSERT INTO recordings (
        id, sessionId, duration, "order", filepath, createdAt, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        recording.id,
        recording.sessionId,
        recording.duration,
        recording.order,
        recording.filepath,
        recording.createdAt,
        JSON.stringify(recording.metadata),
      ]
    );

    // Update session statistics
    await updateSessionStats(sessionId);

    logger.info('Recording saved successfully', { recordingId: recording.id, sessionId, order });
    return recording;
  } catch (error) {
    logger.error('Failed to save recording', { error, sessionId });
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to save recording', 500, 'RECORDING_SAVE_ERROR');
  }
}

/**
 * Get all recordings for a session
 */
export async function getRecordings(sessionId: string): Promise<RecordingChunk[]> {
  const db = getDatabase();

  try {
    const rows = await db.all(
      `SELECT * FROM recordings WHERE sessionId = ? ORDER BY "order" ASC`,
      [sessionId]
    );

    return rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata),
    }));
  } catch (error) {
    logger.error('Failed to get recordings', { error, sessionId });
    throw new AppError('Failed to retrieve recordings', 500, 'RECORDING_GET_ERROR');
  }
}

/**
 * Get a specific recording by ID
 */
export async function getRecordingById(sessionId: string, recordingId: string): Promise<RecordingChunk | null> {
  const db = getDatabase();

  try {
    const row = await db.get(
      `SELECT * FROM recordings WHERE sessionId = ? AND id = ?`,
      [sessionId, recordingId]
    );

    if (!row) {
      return null;
    }

    return {
      ...row,
      metadata: JSON.parse(row.metadata),
    };
  } catch (error) {
    logger.error('Failed to get recording', { error, recordingId });
    throw new AppError('Failed to retrieve recording', 500, 'RECORDING_GET_ERROR');
  }
}

/**
 * Delete a recording chunk
 */
export async function deleteRecording(sessionId: string, recordingId: string): Promise<void> {
  const db = getDatabase();

  try {
    const recording = await getRecordingById(sessionId, recordingId);
    if (!recording) {
      throw new AppError('Recording not found', 404, 'RECORDING_NOT_FOUND');
    }

    // Delete file
    await deleteFile(recording.filepath);

    // Delete from database
    await db.run('DELETE FROM recordings WHERE id = ?', [recordingId]);

    // Update session statistics
    await updateSessionStats(sessionId);

    // Reorder remaining recordings
    await reorderRecordings(sessionId);

    logger.info('Recording deleted successfully', { recordingId, sessionId });
  } catch (error) {
    logger.error('Failed to delete recording', { error, recordingId, sessionId });
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to delete recording', 500, 'RECORDING_DELETE_ERROR');
  }
}

/**
 * Reorder recordings in a session
 */
export async function reorderRecordings(sessionId: string): Promise<void> {
  const db = getDatabase();

  try {
    const recordings = await getRecordings(sessionId);

    // Update order for each recording
    for (let i = 0; i < recordings.length; i++) {
      await db.run(
        `UPDATE recordings SET "order" = ? WHERE id = ?`,
        [i + 1, recordings[i].id]
      );
    }

    logger.debug('Recordings reordered', { sessionId });
  } catch (error) {
    logger.error('Failed to reorder recordings', { error, sessionId });
    throw new AppError('Failed to reorder recordings', 500, 'RECORDING_REORDER_ERROR');
  }
}

/**
 * Reorder recordings with a specific order array
 */
export async function setRecordingOrder(sessionId: string, recordingIds: string[]): Promise<void> {
  const db = getDatabase();

  try {
    // Verify all recordings belong to this session
    for (const recordingId of recordingIds) {
      const recording = await getRecordingById(sessionId, recordingId);
      if (!recording) {
        throw new AppError(`Recording ${recordingId} not found in session`, 404, 'RECORDING_NOT_FOUND');
      }
    }

    // Update order for each recording
    for (let i = 0; i < recordingIds.length; i++) {
      await db.run(
        `UPDATE recordings SET "order" = ? WHERE id = ?`,
        [i + 1, recordingIds[i]]
      );
    }

    logger.info('Recording order updated', { sessionId, count: recordingIds.length });
  } catch (error) {
    logger.error('Failed to set recording order', { error, sessionId });
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to set recording order', 500, 'RECORDING_ORDER_ERROR');
  }
}

/**
 * Delete all recordings for a session
 */
export async function deleteAllRecordings(sessionId: string): Promise<void> {
  const db = getDatabase();

  try {
    const recordings = await getRecordings(sessionId);

    // Delete all files
    for (const recording of recordings) {
      await deleteFile(recording.filepath);
    }

    // Delete from database
    await db.run('DELETE FROM recordings WHERE sessionId = ?', [sessionId]);

    // Update session statistics
    await updateSessionStats(sessionId);

    logger.info('All recordings deleted for session', { sessionId, count: recordings.length });
  } catch (error) {
    logger.error('Failed to delete all recordings', { error, sessionId });
    throw new AppError('Failed to delete all recordings', 500, 'RECORDING_DELETE_ALL_ERROR');
  }
}
