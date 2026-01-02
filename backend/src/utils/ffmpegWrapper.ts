/**
 * FFmpeg wrapper utility functions
 * Provides convenient interfaces for video processing operations
 */

import ffmpeg from '@fluent-ffmpeg/ffmpeg';
import ffmpegPath from '@fluent-ffmpeg/ffmpeg';
import ffprobePath from '@fluent-ffmpeg/ffmpeg';
import path from 'path';
import logger from './logger';
import { FFMPEG_PATH, FFPROBE_PATH } from '../config';

// Set FFmpeg and FFprobe paths
ffmpegPath.setFfmpegPath(FFMPEG_PATH);
ffmpegPath.setFfprobePath(FFPROBE_PATH);

/**
 * Video metadata extracted using FFprobe
 */
export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  codec: string;
  bitrate: number;
  framerate: number;
  hasAudio: boolean;
  audioCodec?: string;
}

/**
 * Get video metadata using FFprobe
 */
export async function getVideoMetadata(filePath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        logger.error('Failed to get video metadata', { error: err, filePath });
        reject(err);
        return;
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

      if (!videoStream) {
        reject(new Error('No video stream found'));
        return;
      }

      const videoMetadata: VideoMetadata = {
        duration: metadata.format.duration || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        codec: videoStream.codec_name || 'unknown',
        bitrate: metadata.format.bit_rate || 0,
        framerate: eval(videoStream.r_frame_rate || '0'),
        hasAudio: !!audioStream,
        audioCodec: audioStream?.codec_name,
      };

      resolve(videoMetadata);
    });
  });
}

/**
 * Generate thumbnail from video at specified timestamp
 */
export async function generateThumbnail(
  videoPath: string,
  outputPath: string,
  timestamp = 5,
  width = 320,
  height = 180
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timestamp],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: `${width}x${height}`,
      })
      .on('end', () => {
        logger.debug(`Thumbnail generated: ${outputPath}`);
        resolve();
      })
      .on('error', err => {
        logger.error('Failed to generate thumbnail', { error: err, videoPath });
        reject(err);
      });
  });
}

/**
 * Merge multiple video files into one
 */
export async function mergeVideos(
  inputPaths: string[],
  outputPath: string,
  options: {
    format?: 'mp4' | 'webm';
    fps?: number;
    quality?: '480p' | '720p' | '1080p';
  } = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    const { format = 'mp4', fps = 30, quality = '720p' } = options;

    // Quality presets
    const qualityPresets = {
      '480p': { width: 854, height: 480, bitrate: '1500k' },
      '720p': { width: 1280, height: 720, bitrate: '3000k' },
      '1080p': { width: 1920, height: 1080, bitrate: '6000k' },
    };

    const preset = qualityPresets[quality];

    const command = ffmpeg();

    // Add all input videos
    inputPaths.forEach(inputPath => {
      command.addInput(inputPath);
    });

    command
      .on('start', commandLine => {
        logger.debug('FFmpeg merge command started', { commandLine });
      })
      .on('end', () => {
        logger.debug(`Videos merged successfully: ${outputPath}`);
        resolve();
      })
      .on('error', err => {
        logger.error('Failed to merge videos', { error: err, outputPath });
        reject(err);
      })
      .outputOptions([
        `-filter_complex`, // Complex filter for concatenation
        inputPaths.map((_, i) => `[${i}:v][${i}:a]`).join('') + `concat=n=${inputPaths.length}:v=1:a=1[outv][outa]`,
        '-map', '[outv]',
        '-map', '[outa]',
        `-c:v`, format === 'webm' ? 'libvpx-vp9' : 'libx264',
        `-c:a`, format === 'webm' ? 'libopus' : 'aac',
        `-r`, `${fps}`,
        `-b:v`, preset.bitrate,
        `-s`, `${preset.width}x${preset.height}`,
        `-pix_fmt`, 'yuv420p',
        `-movflags`, '+faststart',
      ])
      .save(outputPath);
  });
}

/**
 * Interleave original video segments with user recordings
 * Creates a comparison video showing movie segments alternated with user's recordings
 */
export async function createComparisonVideo(
  videoSegments: string[],
  userRecordings: string[],
  outputPath: string,
  options: {
    format?: 'mp4' | 'webm';
    fps?: number;
    quality?: '480p' | '720p' | '1080p';
  } = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    const { format = 'mp4', fps = 30, quality = '720p' } = options;

    // Quality presets
    const qualityPresets = {
      '480p': { width: 854, height: 480, bitrate: '1500k' },
      '720p': { width: 1280, height: 720, bitrate: '3000k' },
      '1080p': { width: 1920, height: 1080, bitrate: '6000k' },
    };

    const preset = qualityPresets[quality];

    // Interleave video segments and recordings
    const allInputs = [];
    for (let i = 0; i < Math.max(videoSegments.length, userRecordings.length); i++) {
      if (videoSegments[i]) allInputs.push(videoSegments[i]);
      if (userRecordings[i]) allInputs.push(userRecordings[i]);
    }

    const command = ffmpeg();

    // Add all input files
    allInputs.forEach(inputPath => {
      command.addInput(inputPath);
    });

    command
      .on('start', commandLine => {
        logger.debug('FFmpeg comparison video command started', { commandLine });
      })
      .on('end', () => {
        logger.debug(`Comparison video created: ${outputPath}`);
        resolve();
      })
      .on('error', err => {
        logger.error('Failed to create comparison video', { error: err, outputPath });
        reject(err);
      })
      .outputOptions([
        `-filter_complex`,
        allInputs.map((_, i) => `[${i}:v][${i}:a]`).join('') + `concat=n=${allInputs.length}:v=1:a=1[outv][outa]`,
        '-map', '[outv]',
        '-map', '[outa]',
        `-c:v`, format === 'webm' ? 'libvpx-vp9' : 'libx264',
        `-c:a`, format === 'webm' ? 'libopus' : 'aac',
        `-r`, `${fps}`,
        `-b:v`, preset.bitrate,
        `-s`, `${preset.width}x${preset.height}`,
        `-pix_fmt`, 'yuv420p',
        `-movflags`, '+faststart',
      ])
      .save(outputPath);
  });
}

/**
 * Convert video to different format or quality
 */
export async function convertVideo(
  inputPath: string,
  outputPath: string,
  options: {
    format?: 'mp4' | 'webm';
    fps?: number;
    quality?: '480p' | '720p' | '1080p';
  } = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    const { format = 'mp4', fps = 30, quality = '720p' } = options;

    const qualityPresets = {
      '480p': { width: 854, height: 480, bitrate: '1500k' },
      '720p': { width: 1280, height: 720, bitrate: '3000k' },
      '1080p': { width: 1920, height: 1080, bitrate: '6000k' },
    };

    const preset = qualityPresets[quality];

    ffmpeg(inputPath)
      .on('start', commandLine => {
        logger.debug('FFmpeg convert command started', { commandLine });
      })
      .on('end', () => {
        logger.debug(`Video converted: ${outputPath}`);
        resolve();
      })
      .on('error', err => {
        logger.error('Failed to convert video', { error: err, inputPath, outputPath });
        reject(err);
      })
      .outputOptions([
        `-c:v`, format === 'webm' ? 'libvpx-vp9' : 'libx264',
        `-c:a`, format === 'webm' ? 'libopus' : 'aac',
        `-r`, `${fps}`,
        `-b:v`, preset.bitrate,
        `-s`, `${preset.width}x${preset.height}`,
        `-pix_fmt`, 'yuv420p',
        `-movflags`, '+faststart',
      ])
      .save(outputPath);
  });
}

/**
 * Extract audio from video
 */
export async function extractAudio(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .on('end', () => {
        logger.debug(`Audio extracted: ${outputPath}`);
        resolve();
      })
      .on('error', err => {
        logger.error('Failed to extract audio', { error: err, inputPath });
        reject(err);
      })
      .noVideo()
      .audioCodec('aac')
      .save(outputPath);
  });
}

/**
 * Add audio track to video
 */
export async function addAudioTrack(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .addInput(videoPath)
      .addInput(audioPath)
      .on('end', () => {
        logger.debug(`Audio track added: ${outputPath}`);
        resolve();
      })
      .on('error', err => {
        logger.error('Failed to add audio track', { error: err });
        reject(err);
      })
      .outputOptions([
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-map', '0:v',
        '-map', '1:a',
        '-shortest',
      ])
      .save(outputPath);
  });
}
