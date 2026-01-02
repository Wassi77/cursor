/**
 * Routes aggregator
 * Combines all route modules
 */

import { Router } from 'express';
import videoRoutes from './videoRoutes';
import sessionRoutes from './sessionRoutes';
import recordingRoutes from './recordingRoutes';
import exportRoutes from './exportRoutes';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Movie Mimic API is running',
    timestamp: new Date().toISOString(),
  });
});

// Config endpoint
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      maxUploadSize: 2147483648, // 2GB
      allowedVideoFormats: ['mp4', 'webm', 'mkv', 'avi', 'mov'],
      allowedSubtitleFormats: ['srt', 'vtt', 'ass'],
      qualities: ['480p', '720p', '1080p'],
      formats: ['mp4', 'webm'],
      fps: [24, 30, 60],
    },
  });
});

// Mount routes
router.use('/videos', videoRoutes);
router.use('/sessions', sessionRoutes);
router.use('/sessions', recordingRoutes);
router.use('/sessions', exportRoutes);

export default router;
