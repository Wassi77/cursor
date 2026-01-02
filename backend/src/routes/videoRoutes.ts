/**
 * Video routes - API endpoints for video management
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { asyncHandler } from '../middleware';
import { uploadVideo, listVideos, getVideoById, deleteVideo, updateVideo, getVideoStats } from '../services';
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
 * POST /api/videos/upload
 * Upload a new video file
 */
router.post(
  '/upload',
  upload.single('video'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No video file provided' },
      });
    }

    const originalName = req.body.originalName || req.file.originalname;
    const video = await uploadVideo(req.file, originalName);

    res.status(201).json({
      success: true,
      data: video,
    });
  })
);

/**
 * GET /api/videos
 * List all videos with pagination
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await listVideos(page, limit);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/videos/stats
 * Get video statistics
 */
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const stats = await getVideoStats();

    res.json({
      success: true,
      data: stats,
    });
  })
);

/**
 * GET /api/videos/:id
 * Get a specific video by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const video = await getVideoById(id);

    if (!video) {
      return res.status(404).json({
        success: false,
        error: { code: 'VIDEO_NOT_FOUND', message: 'Video not found' },
      });
    }

    res.json({
      success: true,
      data: video,
    });
  })
);

/**
 * PUT /api/videos/:id
 * Update video metadata
 */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const video = await updateVideo(id, updates);

    res.json({
      success: true,
      data: video,
    });
  })
);

/**
 * DELETE /api/videos/:id
 * Delete a video
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await deleteVideo(id);

    res.json({
      success: true,
      message: 'Video deleted successfully',
    });
  })
);

export default router;
