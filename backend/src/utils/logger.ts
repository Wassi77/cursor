/**
 * Winston logger configuration
 * Provides structured logging with different levels and transports
 */

import winston from 'winston';
import path from 'path';
import { isDevelopment, LOG_LEVEL, LOG_FILE_PATH } from '../config';

/**
 * Custom log format with timestamps and colors
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

/**
 * Console format for development with colors
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

/**
 * Create Winston logger instance
 */
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: isDevelopment ? consoleFormat : logFormat,
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: LOG_FILE_PATH,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // Separate error log file
    new winston.transports.File({
      filename: path.join(path.dirname(LOG_FILE_PATH), 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(path.dirname(LOG_FILE_PATH), 'exceptions.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(path.dirname(LOG_FILE_PATH), 'rejections.log'),
    }),
  ],
});

export default logger;
