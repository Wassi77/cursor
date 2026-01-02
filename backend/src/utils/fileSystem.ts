/**
 * File system utility functions
 * Handles directory creation, file operations, and path management
 */

import fs from 'fs/promises';
import path from 'path';
import logger from './logger';
import {
  VIDEOS_DIR,
  SUBTITLES_DIR,
  RECORDINGS_DIR,
  EXPORTS_DIR,
  THUMBNAILS_DIR,
  TEMP_DIR,
} from '../config';

/**
 * Ensure all required upload directories exist
 */
export async function ensureUploadDirectories(): Promise<void> {
  const directories = [
    VIDEOS_DIR,
    SUBTITLES_DIR,
    RECORDINGS_DIR,
    EXPORTS_DIR,
    THUMBNAILS_DIR,
    TEMP_DIR,
  ];

  for (const dir of directories) {
    try {
      await fs.mkdir(dir, { recursive: true });
      logger.debug(`Directory ensured: ${dir}`);
    } catch (error) {
      logger.error(`Failed to create directory: ${dir}`, { error });
      throw error;
    }
  }
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a file if it exists
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    if (await fileExists(filePath)) {
      await fs.unlink(filePath);
      logger.debug(`File deleted: ${filePath}`);
    }
  } catch (error) {
    logger.error(`Failed to delete file: ${filePath}`, { error });
    throw error;
  }
}

/**
 * Delete a directory and all its contents
 */
export async function deleteDirectory(dirPath: string): Promise<void> {
  try {
    if (await fileExists(dirPath)) {
      await fs.rm(dirPath, { recursive: true, force: true });
      logger.debug(`Directory deleted: ${dirPath}`);
    }
  } catch (error) {
    logger.error(`Failed to delete directory: ${dirPath}`, { error });
    throw error;
  }
}

/**
 * Get file size in bytes
 */
export async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch (error) {
    logger.error(`Failed to get file size: ${filePath}`, { error });
    throw error;
  }
}

/**
 * Move a file from source to destination
 */
export async function moveFile(source: string, destination: string): Promise<void> {
  try {
    // Ensure destination directory exists
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.rename(source, destination);
    logger.debug(`File moved from ${source} to ${destination}`);
  } catch (error) {
    logger.error(`Failed to move file: ${source} -> ${destination}`, { error });
    throw error;
  }
}

/**
 * Copy a file from source to destination
 */
export async function copyFile(source: string, destination: string): Promise<void> {
  try {
    // Ensure destination directory exists
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(source, destination);
    logger.debug(`File copied from ${source} to ${destination}`);
  } catch (error) {
    logger.error(`Failed to copy file: ${source} -> ${destination}`, { error });
    throw error;
  }
}

/**
 * Read file content as buffer
 */
export async function readFileAsBuffer(filePath: string): Promise<Buffer> {
  try {
    return await fs.readFile(filePath);
  } catch (error) {
    logger.error(`Failed to read file: ${filePath}`, { error });
    throw error;
  }
}

/**
 * Write buffer to file
 */
export async function writeBufferToFile(filePath: string, buffer: Buffer): Promise<void> {
  try {
    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
    logger.debug(`File written: ${filePath}`);
  } catch (error) {
    logger.error(`Failed to write file: ${filePath}`, { error });
    throw error;
  }
}

/**
 * Generate a unique filename
 */
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(originalName);
  const name = path.basename(originalName, ext);
  const sanitized = name.replace(/[^a-zA-Z0-9]/g, '_');
  return `${sanitized}_${timestamp}_${random}${ext}`;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase().substring(1);
}

/**
 * Format file size to human readable string
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
