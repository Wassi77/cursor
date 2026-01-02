/**
 * SQLite database connection and initialization
 * Handles database setup, migrations, and connection management
 */

import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs/promises';
import logger from '../utils/logger';
import { DB_PATH } from '../config';

let db: Database | null = null;

/**
 * Initialize database connection and ensure database file exists
 */
export async function initDatabase(): Promise<Database> {
  if (db) {
    return db;
  }

  try {
    // Ensure database directory exists
    const dbDir = path.dirname(DB_PATH);
    await fs.mkdir(dbDir, { recursive: true });

    // Open database connection
    db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database,
    });

    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON');

    // Enable WAL mode for better performance
    await db.exec('PRAGMA journal_mode = WAL');

    logger.info(`Database connected: ${DB_PATH}`);

    return db;
  } catch (error) {
    logger.error('Failed to initialize database', { error });
    throw error;
  }
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    logger.info('Database connection closed');
  }
}

/**
 * Get database instance
 */
export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Run database migrations
 */
export async function runMigrations(): Promise<void> {
  const database = getDatabase();

  try {
    // Create videos table
    await database.exec(`
      CREATE TABLE IF NOT EXISTS videos (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        originalName TEXT NOT NULL,
        format TEXT NOT NULL,
        duration INTEGER NOT NULL,
        resolution TEXT NOT NULL,
        filepath TEXT NOT NULL,
        subtitlePath TEXT,
        uploadedAt TEXT NOT NULL,
        metadata TEXT NOT NULL,
        thumbnailPath TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create sessions table
    await database.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        videoId TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        totalDuration INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        exportedAt TEXT,
        metadata TEXT NOT NULL DEFAULT '{}',
        FOREIGN KEY (videoId) REFERENCES videos(id) ON DELETE CASCADE
      )
    `);

    // Create recordings table
    await database.exec(`
      CREATE TABLE IF NOT EXISTS recordings (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        duration INTEGER NOT NULL,
        "order" INTEGER NOT NULL,
        filepath TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        thumbnailPath TEXT,
        metadata TEXT NOT NULL,
        FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);

    // Create exports table
    await database.exec(`
      CREATE TABLE IF NOT EXISTS exports (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        type TEXT NOT NULL,
        format TEXT NOT NULL,
        quality TEXT NOT NULL,
        fps INTEGER NOT NULL,
        filepath TEXT NOT NULL,
        filesize INTEGER NOT NULL,
        createdAt TEXT NOT NULL,
        downloadedAt TEXT,
        FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better query performance
    await database.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_videoId ON sessions(videoId);
      CREATE INDEX IF NOT EXISTS idx_recordings_sessionId ON recordings(sessionId);
      CREATE INDEX IF NOT EXISTS idx_exports_sessionId ON exports(sessionId);
      CREATE INDEX IF NOT EXISTS idx_videos_uploadedAt ON videos(uploadedAt DESC);
      CREATE INDEX IF NOT EXISTS idx_sessions_updatedAt ON sessions(updatedAt DESC);
    `);

    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Failed to run database migrations', { error });
    throw error;
  }
}

/**
 * Reset database (drop all tables) - use with caution
 */
export async function resetDatabase(): Promise<void> {
  const database = getDatabase();

  try {
    await database.exec(`
      DROP TABLE IF EXISTS exports;
      DROP TABLE IF EXISTS recordings;
      DROP TABLE IF EXISTS sessions;
      DROP TABLE IF EXISTS videos;
    `);

    logger.warn('Database has been reset');
    await runMigrations();
  } catch (error) {
    logger.error('Failed to reset database', { error });
    throw error;
  }
}
