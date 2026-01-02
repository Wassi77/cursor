/**
 * Session routes - API endpoints for session management
 */

import { Router } from 'express';
import { asyncHandler } from '../middleware';
import {
  createSession,
  listSessions,
  getSessionById,
  updateSession,
  deleteSession,
} from '../services';
import { z } from 'zod';

const router = Router();

/**
 * POST /api/sessions
 * Create a new session
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { videoId, name, description } = req.body;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_VIDEO_ID', message: 'Video ID is required' },
      });
    }

    const session = await createSession(videoId, name, description);

    res.status(201).json({
      success: true,
      data: session,
    });
  })
);

/**
 * GET /api/sessions
 * List all sessions with pagination and optional filters
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const filters = {
      videoId: req.query.videoId as string,
      status: req.query.status as string,
    };

    const result = await listSessions(page, limit, filters);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/sessions/:id
 * Get a specific session by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const includeVideo = req.query.includeVideo === 'true';

    const session = await getSessionById(id, includeVideo);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' },
      });
    }

    res.json({
      success: true,
      data: session,
    });
  })
);

/**
 * PUT /api/sessions/:id
 * Update a session
 */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const session = await updateSession(id, updates);

    res.json({
      success: true,
      data: session,
    });
  })
);

/**
 * DELETE /api/sessions/:id
 * Delete a session
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await deleteSession(id);

    res.json({
      success: true,
      message: 'Session deleted successfully',
    });
  })
);

export default router;
