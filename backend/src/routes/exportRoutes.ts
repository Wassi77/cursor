/**
 * Export routes - API endpoints for video export and download
 */

import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { asyncHandler } from '../middleware';
import {
  exportSession,
  getSessionExports,
  getExportById,
  markAsDownloaded,
  deleteExport,
  getExportStatus,
} from '../services';
import { EXPORTS_DIR } from '../config';

const router = Router();

/**
 * POST /api/sessions/:sessionId/export
 * Export a session as a video
 */
router.post(
  '/:sessionId/export',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const settings = req.body;

    if (!settings.type || !settings.format || !settings.quality || !settings.fps) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_SETTINGS', message: 'Missing required export settings' },
      });
    }

    const exportRecord = await exportSession(sessionId, settings);

    res.status(201).json({
      success: true,
      data: exportRecord,
    });
  })
);

/**
 * GET /api/sessions/:sessionId/exports
 * Get all exports for a session
 */
router.get(
  '/:sessionId/exports',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const exports = await getSessionExports(sessionId);

    res.json({
      success: true,
      data: exports,
    });
  })
);

/**
 * GET /api/sessions/:sessionId/export/status
 * Get export status
 */
router.get(
  '/:sessionId/export/status',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { exportId } = req.query;

    if (!exportId || typeof exportId !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_EXPORT_ID', message: 'Export ID is required' },
      });
    }

    const status = await getExportStatus(exportId);

    res.json({
      success: true,
      data: status,
    });
  })
);

/**
 * GET /api/sessions/:sessionId/download/:exportId
 * Download an exported video
 */
router.get(
  '/:sessionId/download/:exportId',
  asyncHandler(async (req, res) => {
    const { exportId } = req.params;
    const exportRecord = await getExportById(exportId);

    if (!exportRecord) {
      return res.status(404).json({
        success: false,
        error: { code: 'EXPORT_NOT_FOUND', message: 'Export not found' },
      });
    }

    const filepath = exportRecord.filepath;

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({
        success: false,
        error: { code: 'FILE_NOT_FOUND', message: 'Exported file not found' },
      });
    }

    // Mark as downloaded
    await markAsDownloaded(exportId);

    // Stream file
    const filename = path.basename(filepath);
    const stat = fs.statSync(filepath);

    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);

    fileStream.on('error', error => {
      console.error('Error streaming file:', error);
    });
  })
);

/**
 * DELETE /api/exports/:exportId
 * Delete an export
 */
router.delete(
  '/exports/:exportId',
  asyncHandler(async (req, res) => {
    const { exportId } = req.params;
    await deleteExport(exportId);

    res.json({
      success: true,
      message: 'Export deleted successfully',
    });
  })
);

export default router;
