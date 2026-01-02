/**
 * Main Express server entry point
 * Initializes database, middleware, and routes
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import logger from './utils/logger';
import { initDatabase, runMigrations, closeDatabase } from './database/connection';
import { ensureUploadDirectories } from './utils/fileSystem';
import { errorHandler, notFoundHandler } from './middleware';
import routes from './routes';
import {
  PORT,
  isDevelopment,
  CORS_ORIGIN,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
} from './config';

/**
 * Create and configure Express application
 */
function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: CORS_ORIGIN,
      credentials: true,
    })
  );

  // Rate limiting
  const limiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX_REQUESTS,
    message: 'Too many requests from this IP, please try again later.',
  });
  app.use('/api/', limiter);

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  if (isDevelopment) {
    app.use(morgan('dev'));
  } else {
    app.use(
      morgan('combined', {
        stream: {
          write: (message: string) => logger.info(message.trim()),
        },
      })
    );
  }

  // API routes
  app.use('/api', routes);

  // Error handling (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    // Initialize upload directories
    await ensureUploadDirectories();

    // Initialize database
    await initDatabase();
    await runMigrations();

    // Create Express app
    const app = createApp();

    // Start listening
    app.listen(PORT, () => {
      logger.info(`🚀 Movie Mimic API server started on port ${PORT}`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🌐 CORS origin: ${CORS_ORIGIN}`);
      if (isDevelopment) {
        logger.info(`🔧 Development mode enabled`);
      }
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received, starting graceful shutdown...`);

      try {
        await closeDatabase();
        logger.info('Database connection closed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Start the server
startServer();
