/**
 * Session Review page
 * Review and manage recording chunks from a session
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Play, Trash2, GripVertical, Download, ArrowLeft, Edit2, Save } from 'lucide-react';
import { sessionApi } from '../services/api';
import { Session, RecordingChunk } from '@shared/types';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationDialog from '../components/ConfirmationDialog';

const SessionReview = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [chunks, setChunks] = useState<RecordingChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChunk, setSelectedChunk] = useState<RecordingChunk | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; chunkId?: string }>({
    open: false,
  });

  useEffect(() => {
    loadSessionData();
  }, [sessionId]);

  const loadSessionData = async () => {
    try {
      setLoading(true);
      const sessionData = await sessionApi.getSessionById(sessionId!);
      const chunksData = await sessionApi.getRecordings(sessionId!);

      setSession(sessionData);
      setChunks(chunksData);
      setSessionName(sessionData.name);
    } catch (error) {
      console.error('Failed to load session data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChunk = async (chunkId: string) => {
    try {
      await sessionApi.deleteRecording(sessionId!, chunkId);
      setChunks((prev) => prev.filter((c) => c.id !== chunkId));
      setDeleteDialog({ open: false });
    } catch (error) {
      console.error('Failed to delete chunk:', error);
    }
  };

  const handleReorderChunks = async (fromIndex: number, toIndex: number) => {
    const newChunks = [...chunks];
    const [moved] = newChunks.splice(fromIndex, 1);
    newChunks.splice(toIndex, 0, moved);
    setChunks(newChunks);

    // Update order numbers
    const orderedChunks = newChunks.map((chunk, index) => ({ ...chunk, order: index + 1 }));

    try {
      await sessionApi.reorderRecordings(sessionId!, orderedChunks.map((c) => c.id));
    } catch (error) {
      console.error('Failed to reorder chunks:', error);
      // Revert on error
      setChunks(chunks);
    }
  };

  const handleSaveSession = async () => {
    if (!session) return;

    try {
      await sessionApi.updateSession(sessionId!, { name: sessionName });
      setSession({ ...session, name: sessionName });
      setEditing(false);
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="card p-12 text-center">
        <p className="text-neutral-400 mb-4">Session not found</p>
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
        <div className="flex items-center space-x-4">
          <Link
            to="/"
            className="btn btn-ghost btn-icon"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            {editing ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  className="input"
                  autoFocus
                />
                <button onClick={handleSaveSession} className="btn btn-success">
                  <Save className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <h1 className="text-3xl font-bold text-white">{session.name}</h1>
            )}
            <p className="text-neutral-400 mt-1">
              {chunks.length} recording chunks · {formatDuration(session.totalDuration)} total
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setEditing(!editing)}
            className="btn btn-ghost btn-icon"
            aria-label={editing ? 'Cancel editing' : 'Edit session name'}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <Link to={`/export/${session.id}`} className="btn btn-primary">
            <Download className="w-4 h-4 mr-2" />
            Export Videos
          </Link>
        </div>
      </div>

      {/* Video Preview */}
      {selectedChunk && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-white">Preview: Chunk {selectedChunk.order}</h3>
            <button
              onClick={() => {
                setSelectedChunk(null);
                setIsPlaying(false);
              }}
              className="text-neutral-400 hover:text-white"
            >
              Close
            </button>
          </div>
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <video
              src={selectedChunk.filepath}
              className="w-full h-full"
              controls
              autoPlay={isPlaying}
            />
          </div>
        </div>
      )}

      {/* Recording Chunks */}
      {chunks.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-neutral-400 mb-4">No recordings yet</p>
          <Link
            to={`/practice/${session.id}`}
            className="btn btn-primary"
          >
            Start Recording
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-neutral-700">
            <h2 className="font-semibold text-white">Recording Chunks</h2>
          </div>
          <div className="divide-y divide-neutral-700">
            {chunks.map((chunk, index) => (
              <ChunkRow
                key={chunk.id}
                chunk={chunk}
                index={index}
                isSelected={selectedChunk?.id === chunk.id}
                onSelect={() => setSelectedChunk(chunk)}
                onPlay={() => {
                  setSelectedChunk(chunk);
                  setIsPlaying(true);
                }}
                onDelete={() => setDeleteDialog({ open: true, chunkId: chunk.id })}
                onMoveUp={index > 0 ? () => handleReorderChunks(index, index - 1) : undefined}
                onMoveDown={
                  index < chunks.length - 1 ? () => handleReorderChunks(index, index + 1) : undefined
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog.open}
        title="Delete Recording"
        message="Are you sure you want to delete this recording? This action cannot be undone."
        onConfirm={() => deleteDialog.chunkId && handleDeleteChunk(deleteDialog.chunkId)}
        onCancel={() => setDeleteDialog({ open: false })}
      />
    </div>
  );
};

const ChunkRow = ({
  chunk,
  index,
  isSelected,
  onSelect,
  onPlay,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  chunk: RecordingChunk;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onPlay: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) => {
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div
      className={`flex items-center p-4 hover:bg-neutral-750 transition-colors duration-200 ${
        isSelected ? 'bg-neutral-750' : ''
      }`}
    >
      <div className="flex items-center space-x-3 text-neutral-500">
        <button
          onClick={onMoveUp}
          disabled={!onMoveUp}
          className="hover:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ▲
        </button>
        <button
          onClick={onMoveDown}
          disabled={!onMoveDown}
          className="hover:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ▼
        </button>
        <GripVertical className="w-4 h-4" />
      </div>

      <div className="flex-1">
        <div className="flex items-center space-x-4">
          <span className="text-neutral-500 font-mono">#{chunk.order}</span>
          <div>
            <p className="text-white font-medium">Recording Chunk</p>
            <p className="text-sm text-neutral-400">
              {formatDuration(chunk.duration)} · {new Date(chunk.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onPlay}
          className="btn btn-ghost btn-icon"
          aria-label="Play chunk"
        >
          <Play className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="btn btn-ghost btn-icon text-error-400 hover:text-error-300 hover:bg-error-500/10"
          aria-label="Delete chunk"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SessionReview;
