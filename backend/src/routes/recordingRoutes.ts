/**
 * Recording routes - API endpoints for recording management
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { asyncHandler } from '../middleware';
import {
  saveRecording,
  getRecordings,
  getRecordingById,
  deleteRecording,
  setRecordingOrder,
  deleteAllRecordings,
} from '../services';
import { ALLOWED_VIDEO_FORMATS, MAX_UPLOAD_SIZE, TEMP_DIR } from '../config';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_UPLOAD_SIZE,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().substring(1);
    if (ALLOWED_VIDEO_FORMATS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file format. Allowed: ${ALLOWED_VIDEO_FORMATS.join(', ')}`));
    }
  },
});

/**
 * POST /api/sessions/:sessionId/recordings
 * Upload a recording chunk
 */
router.post(
  '/:sessionId/recordings',
  upload.single('recording'),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No recording file provided' },
      });
    }

    const duration = parseFloat(req.body.duration) || 0;
    const recording = await saveRecording(sessionId, req.file, duration);

    res.status(201).json({
      success: true,
      data: recording,
    });
  })
);

/**
 * GET /api/sessions/:sessionId/recordings
 * Get all recordings for a session
 */
router.get(
  '/:sessionId/recordings',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const recordings = await getRecordings(sessionId);

    res.json({
      success: true,
      data: recordings,
    });
  })
);

/**
 * DELETE /api/sessions/:sessionId/recordings/:chunkId
 * Delete a specific recording chunk
 */
router.delete(
  '/:sessionId/recordings/:chunkId',
  asyncHandler(async (req, res) => {
    const { sessionId, chunkId } = req.params;
    await deleteRecording(sessionId, chunkId);

    res.json({
      success: true,
      message: 'Recording deleted successfully',
    });
  })
);

/**
 * PUT /api/sessions/:sessionId/recordings/reorder
 * Reorder recordings
 */
router.put(
  '/:sessionId/recordings/reorder',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { recordingIds } = req.body;

    if (!Array.isArray(recordingIds)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ORDER', message: 'recordingIds must be an array' },
      });
    }

    await setRecordingOrder(sessionId, recordingIds);

    res.json({
      success: true,
      message: 'Recordings reordered successfully',
    });
  })
);

/**
 * DELETE /api/sessions/:sessionId/recordings
 * Delete all recordings for a session
 */
router.delete(
  '/:sessionId/recordings',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    await deleteAllRecordings(sessionId);

    res.json({
      success: true,
      message: 'All recordings deleted successfully',
    });
  })
);

export default router;
