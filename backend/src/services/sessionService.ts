/**
 * Session service - handles session management business logic
 * Manages session creation, updates, deletion, and queries
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { Session, SessionStatus } from '@movie-mimic/shared/types';

/**
 * Create a new session for a video
 */
export async function createSession(videoId: string, name: string, description?: string): Promise<Session> {
  const db = getDatabase();

  try {
    // Verify video exists
    const video = await db.get('SELECT id FROM videos WHERE id = ?', [videoId]);
    if (!video) {
      throw new AppError('Video not found', 404, 'VIDEO_NOT_FOUND');
    }

    const now = new Date().toISOString();
    const session: Session = {
      id: uuidv4(),
      videoId,
      name: name || `Session ${new Date().toLocaleDateString()}`,
      description: description || '',
      createdAt: now,
      updatedAt: now,
      totalDuration: 0,
      status: 'active',
      exportedAt: null,
      metadata: {
        totalChunks: 0,
        averageChunkDuration: 0,
        notes: '',
      },
    };

    await db.run(
      `INSERT INTO sessions (
        id, videoId, name, description, createdAt, updatedAt,
        totalDuration, status, exportedAt, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.videoId,
        session.name,
        session.description,
        session.createdAt,
        session.updatedAt,
        session.totalDuration,
        session.status,
        session.exportedAt,
        JSON.stringify(session.metadata),
      ]
    );

    logger.info('Session created successfully', { sessionId: session.id, videoId });
    return session;
  } catch (error) {
    logger.error('Failed to create session', { error, videoId, name });
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to create session', 500, 'SESSION_CREATE_ERROR');
  }
}

/**
 * Get all sessions with pagination and optional filtering
 */
export async function listSessions(
  page: number = 1,
  limit: number = 20,
  filters?: { videoId?: string; status?: SessionStatus }
): Promise<{ sessions: Session[]; total: number; page: number; totalPages: number }> {
  const db = getDatabase();

  try {
    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters?.videoId) {
      conditions.push('videoId = ?');
      params.push(filters.videoId);
    }

    if (filters?.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM sessions ${whereClause}`;
    const countResult = await db.get(countQuery, params);
    const total = countResult?.count || 0;

    // Get sessions with pagination
    const rows = await db.all(
      `SELECT * FROM sessions ${whereClause} ORDER BY updatedAt DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const sessions = rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata),
    }));

    return {
      sessions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    logger.error('Failed to list sessions', { error });
    throw new AppError('Failed to retrieve sessions', 500, 'SESSION_LIST_ERROR');
  }
}

/**
 * Get a session by ID with video details
 */
export async function getSessionById(id: string, includeVideo = false): Promise<Session | null> {
  const db = getDatabase();

  try {
    const row = await db.get('SELECT * FROM sessions WHERE id = ?', [id]);

    if (!row) {
      return null;
    }

    const session = {
      ...row,
      metadata: JSON.parse(row.metadata),
    };

    // Optionally include video details
    if (includeVideo) {
      const videoRow = await db.get('SELECT id, originalName, thumbnailPath, duration FROM videos WHERE id = ?', [
        session.videoId,
      ]);
      if (videoRow) {
        session.video = videoRow;
      }
    }

    return session;
  } catch (error) {
    logger.error('Failed to get session', { error, sessionId: id });
    throw new AppError('Failed to retrieve session', 500, 'SESSION_GET_ERROR');
  }
}

/**
 * Update a session
 */
export async function updateSession(
  id: string,
  updates: Partial<Omit<Session, 'id' | 'videoId' | 'createdAt'>>
): Promise<Session> {
  const db = getDatabase();

  try {
    const session = await getSessionById(id);
    if (!session) {
      throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
    }

    const updatedSession = {
      ...session,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await db.run(
      `UPDATE sessions SET
        name = ?, description = ?, status = ?, exportedAt = ?, metadata = ?, updatedAt = ?
      WHERE id = ?`,
      [
        updatedSession.name,
        updatedSession.description,
        updatedSession.status,
        updatedSession.exportedAt,
        JSON.stringify(updatedSession.metadata),
        updatedSession.updatedAt,
        id,
      ]
    );

    return updatedSession;
  } catch (error) {
    logger.error('Failed to update session', { error, sessionId: id });
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to update session', 500, 'SESSION_UPDATE_ERROR');
  }
}

/**
 * Delete a session and all associated recordings
 */
export async function deleteSession(id: string): Promise<void> {
  const db = getDatabase();

  try {
    const session = await getSessionById(id);
    if (!session) {
      throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
    }

    // Delete from database (cascades to recordings)
    await db.run('DELETE FROM sessions WHERE id = ?', [id]);

    logger.info('Session deleted successfully', { sessionId: id });
  } catch (error) {
    logger.error('Failed to delete session', { error, sessionId: id });
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to delete session', 500, 'SESSION_DELETE_ERROR');
  }
}

/**
 * Update session statistics after recording operations
 */
export async function updateSessionStats(sessionId: string): Promise<void> {
  const db = getDatabase();

  try {
    // Get recordings for session
    const recordings = await db.all(
      'SELECT duration FROM recordings WHERE sessionId = ? ORDER BY "order"',
      [sessionId]
    );

    const totalDuration = recordings.reduce((sum, r) => sum + r.duration, 0);
    const totalChunks = recordings.length;
    const averageChunkDuration = totalChunks > 0 ? totalDuration / totalChunks : 0;

    // Update session
    await db.run(
      `UPDATE sessions SET
        totalDuration = ?, metadata = ?, updatedAt = ?
      WHERE id = ?`,
      [
        totalDuration,
        JSON.stringify({ totalChunks, averageChunkDuration, notes: '' }),
        new Date().toISOString(),
        sessionId,
      ]
    );

    logger.debug('Session stats updated', { sessionId, totalDuration, totalChunks });
  } catch (error) {
    logger.error('Failed to update session stats', { error, sessionId });
    throw new AppError('Failed to update session statistics', 500, 'SESSION_STATS_ERROR');
  }
}
