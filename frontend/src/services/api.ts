/**
 * API service
 * Handles all HTTP requests to the backend API
 */

import axios from 'axios';
import type {
  Video,
  Session,
  RecordingChunk,
  Export,
  ExportSettings,
  PaginatedResponse,
} from '@shared/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Video API
export const videoApi = {
  listVideos: async (page: number = 1, limit: number = 20): Promise<PaginatedResponse<Video>> => {
    const response = await api.get('/videos', { params: { page, limit } });
    return response.data.data;
  },

  getVideoById: async (id: string): Promise<Video> => {
    const response = await api.get(`/videos/${id}`);
    return response.data.data;
  },

  uploadVideo: async (formData: FormData): Promise<Video> => {
    const response = await api.post('/videos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        console.log(`Upload progress: ${progress}%`);
      },
    });
    return response.data.data;
  },

  deleteVideo: async (id: string): Promise<void> => {
    await api.delete(`/videos/${id}`);
  },
};

// Session API
export const sessionApi = {
  listSessions: async (
    page: number = 1,
    limit: number = 20,
    filters?: { videoId?: string; status?: string }
  ): Promise<PaginatedResponse<Session>> => {
    const response = await api.get('/sessions', { params: { page, limit, ...filters } });
    return response.data.data;
  },

  getSessionById: async (id: string, includeVideo = false): Promise<Session> => {
    const response = await api.get(`/sessions/${id}`, {
      params: { includeVideo: includeVideo.toString() },
    });
    return response.data.data;
  },

  createSession: async (videoId: string, name?: string, description?: string): Promise<Session> => {
    const response = await api.post('/sessions', { videoId, name, description });
    return response.data.data;
  },

  updateSession: async (id: string, updates: Partial<Session>): Promise<Session> => {
    const response = await api.put(`/sessions/${id}`, updates);
    return response.data.data;
  },

  deleteSession: async (id: string): Promise<void> => {
    await api.delete(`/sessions/${id}`);
  },

  getRecordings: async (sessionId: string): Promise<RecordingChunk[]> => {
    const response = await api.get(`/sessions/${sessionId}/recordings`);
    return response.data.data;
  },

  uploadRecording: async (sessionId: string, blob: Blob, duration: number): Promise<RecordingChunk> => {
    const formData = new FormData();
    formData.append('recording', blob);
    formData.append('duration', duration.toString());

    const response = await api.post(`/sessions/${sessionId}/recordings`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  deleteRecording: async (sessionId: string, chunkId: string): Promise<void> => {
    await api.delete(`/sessions/${sessionId}/recordings/${chunkId}`);
  },

  reorderRecordings: async (sessionId: string, recordingIds: string[]): Promise<void> => {
    await api.put(`/sessions/${sessionId}/recordings/reorder`, { recordingIds });
  },

  exportSession: async (sessionId: string, settings: ExportSettings): Promise<Export> => {
    const response = await api.post(`/sessions/${sessionId}/export`, settings);
    return response.data.data;
  },

  getSessionExports: async (sessionId: string): Promise<Export[]> => {
    const response = await api.get(`/sessions/${sessionId}/exports`);
    return response.data.data;
  },
};

// Config API
export const configApi = {
  getConfig: async () => {
    const response = await api.get('/config');
    return response.data.data;
  },
};

export default api;
