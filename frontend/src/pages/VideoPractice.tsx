/**
 * Video Practice page
 * Main practice interface with play/record modes controlled by spacebar
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Square, Mic, MicOff, X, RotateCcw, Settings as SettingsIcon } from 'lucide-react';
import { videoApi, sessionApi } from '../services/api';
import { Video, Session, PracticeMode } from '@shared/types';
import LoadingSpinner from '../components/LoadingSpinner';

const VideoPractice = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [video, setVideo] = useState<Video | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<PracticeMode>('play');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showHints, setShowHints] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    loadSessionData();

    return () => {
      cleanup();
    };
  }, [sessionId]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        toggleMode();
      } else if (e.code === 'Escape') {
        exitSession();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [mode, isRecording]);

  const loadSessionData = async () => {
    try {
      setLoading(true);
      if (sessionId && sessionId !== 'new') {
        const sessionData = await sessionApi.getSessionById(sessionId);
        setSession(sessionData);
        if (sessionData.videoId) {
          const videoData = await videoApi.getVideoById(sessionData.videoId);
          setVideo(videoData);
        }
      }
    } catch (error) {
      console.error('Failed to load session data:', error);
    } finally {
      setLoading(false);
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const toggleMode = async () => {
    if (mode === 'play') {
      // Switch to record mode
      setMode('record');
      await startRecording();
    } else {
      // Switch to play mode
      await stopRecording();
      setMode('play');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;
      recordingChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus',
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' });
        // Upload recording
        if (session && sessionId) {
          try {
            const duration = recordingTime / 1000;
            await sessionApi.uploadRecording(sessionId, blob, duration);
          } catch (error) {
            console.error('Failed to upload recording:', error);
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setMode('play');
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const exitSession = () => {
    if (confirm('Exit practice session?')) {
      navigate('/');
    }
  };

  const formatRecordingTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="card p-12 text-center">
        <p className="text-neutral-400 mb-4">No video loaded</p>
        <button onClick={() => navigate('/')} className="btn btn-primary">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{video.originalName}</h1>
          <p className="text-neutral-400">
            {session?.name} · Press <kbd className="px-2 py-1 bg-neutral-800 rounded">Space</kbd> to toggle
          </p>
        </div>
        <button onClick={exitSession} className="btn btn-ghost btn-icon" aria-label="Exit">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Video Container */}
      <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
        {/* Mode Badge */}
        <div className="absolute top-4 left-4 z-20">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              mode === 'play'
                ? 'bg-primary-500 text-white'
                : 'bg-error-500 text-white recording-pulse'
            }`}
          >
            {mode === 'play' ? (
              <span className="flex items-center space-x-2">
                <Play className="w-4 h-4" />
                <span>PLAY MODE</span>
              </span>
            ) : (
              <span className="flex items-center space-x-2">
                <Mic className="w-4 h-4" />
                <span>RECORD MODE</span>
              </span>
            )}
          </span>
        </div>

        {/* Play Mode - Video Player */}
        {mode === 'play' ? (
          <video
            ref={videoRef}
            src={`/api/videos/${video.id}`}
            className="w-full h-full"
            controls
            controlsList="nodownload"
          />
        ) : (
          /* Record Mode - Webcam Preview */
          <div className="w-full h-full relative">
            <video
              ref={videoRef as React.RefObject<HTMLVideoElement>}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              onLoadedMetadata={() => {
                if (streamRef.current && videoRef.current) {
                  videoRef.current.srcObject = streamRef.current;
                }
              }}
            />
            {/* Recording Timer */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
              <div className="flex items-center space-x-2 bg-black/70 px-4 py-2 rounded-full">
                <div className="w-3 h-3 bg-red-500 rounded-full recording-pulse" />
                <span className="text-white font-mono text-lg">
                  {formatRecordingTime(recordingTime)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Recording Timer */}
        {isRecording && (
          <div className="absolute bottom-4 right-4 z-20 bg-black/70 px-3 py-1 rounded-full">
            <span className="text-white font-mono">{formatRecordingTime(recordingTime)}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center space-x-4">
        <button
          onClick={toggleMode}
          className={`btn ${
            mode === 'play' ? 'btn-danger' : 'btn-success'
          } flex items-center space-x-2 px-8 py-3 text-lg`}
        >
          {mode === 'play' ? (
            <>
              <Mic className="w-6 h-6" />
              <span>Start Recording</span>
            </>
          ) : (
            <>
              <Square className="w-6 h-6" />
              <span>Stop Recording</span>
            </>
          )}
        </button>
        <button onClick={exitSession} className="btn btn-secondary">
          Exit Session
        </button>
      </div>

      {/* Keyboard Hints */}
      {showHints && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-white">Keyboard Shortcuts</h3>
            <button
              onClick={() => setShowHints(false)}
              className="text-neutral-400 hover:text-white text-sm"
            >
              Hide
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center space-x-2">
              <kbd className="px-2 py-1 bg-neutral-700 rounded text-neutral-300">Space</kbd>
              <span className="text-neutral-400">Toggle Play/Record</span>
            </div>
            <div className="flex items-center space-x-2">
              <kbd className="px-2 py-1 bg-neutral-700 rounded text-neutral-300">Esc</kbd>
              <span className="text-neutral-400">Exit Session</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPractice;
