/**
 * Dashboard page
 * Main landing page showing imported videos, stats, and recent sessions
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Upload, Video, Clock, TrendingUp, FolderOpen, Mic } from 'lucide-react';
import { videoApi, sessionApi } from '../services/api';
import { Video, Session, Statistics } from '@shared/types';
import LoadingSpinner from '../components/LoadingSpinner';
import UploadDropZone from '../components/UploadDropZone';

const Dashboard = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [videosData, sessionsData] = await Promise.all([
        videoApi.listVideos(1, 10),
        sessionApi.listSessions(1, 5),
      ]);

      setVideos(videosData.videos);
      setSessions(sessionsData.sessions);
      setStats({
        totalSessions: sessionsData.total,
        totalRecordingTime: sessionsData.sessions.reduce((acc, s) => acc + s.totalDuration, 0),
        totalVideos: videosData.total,
        recentSessions: sessionsData.sessions,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = () => {
    setShowUpload(false);
    loadDashboardData();
  };

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to Movie Mimic</h1>
          <p className="text-neutral-400">Practice English by mimicking actors from your favorite movies</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Upload className="w-5 h-5" />
          <span>Import Video</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={Video}
          label="Total Videos"
          value={stats?.totalVideos || 0}
          color="primary"
        />
        <StatCard
          icon={Mic}
          label="Total Sessions"
          value={stats?.totalSessions || 0}
          color="success"
        />
        <StatCard
          icon={Clock}
          label="Recording Time"
          value={formatDuration(stats?.totalRecordingTime || 0)}
          color="warning"
        />
      </div>

      {/* Upload Modal */}
      {showUpload && <UploadDropZone onClose={() => setShowUpload(false)} onComplete={handleUploadComplete} />}

      {/* Videos Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-white flex items-center space-x-2">
            <Video className="w-6 h-6 text-primary-500" />
            <span>Your Videos</span>
          </h2>
          {videos.length === 0 && (
            <p className="text-neutral-400">Import your first video to get started</p>
          )}
        </div>

        {videos.length === 0 ? (
          <EmptyState
            icon={Video}
            title="No videos yet"
            description="Import a movie or video to start practicing"
            action={() => setShowUpload(true)}
            actionLabel="Import Video"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </section>

      {/* Recent Sessions Section */}
      {sessions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-white flex items-center space-x-2">
              <TrendingUp className="w-6 h-6 text-success-500" />
              <span>Recent Sessions</span>
            </h2>
            <Link
              to="/review/:sessionId"
              className="text-primary-400 hover:text-primary-300 flex items-center space-x-1"
            >
              <FolderOpen className="w-4 h-4" />
              <span>View All</span>
            </Link>
          </div>

          <div className="card overflow-hidden">
            <div className="divide-y divide-neutral-700">
              {sessions.map((session) => (
                <SessionRow key={session.id} session={session} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

// Subcomponents
const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="card p-6">
    <div className="flex items-center space-x-4">
      <div className={`p-3 rounded-lg bg-${color}-500/20`}>
        <Icon className={`w-6 h-6 text-${color}-500`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-neutral-400 text-sm">{label}</p>
      </div>
    </div>
  </div>
);

const VideoCard = ({ video }: { video: Video }) => (
  <Link
    to={`/practice/new?videoId=${video.id}`}
    className="card overflow-hidden hover:border-primary-500 transition-colors duration-200 cursor-pointer group"
  >
    <div className="aspect-video bg-neutral-900 relative overflow-hidden">
      {video.thumbnailPath ? (
        <img
          src={`/api/videos/${video.id}/thumbnail`}
          alt={video.originalName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Video className="w-16 h-16 text-neutral-600" />
        </div>
      )}
      <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs">
        {formatDuration(video.duration)}
      </div>
    </div>
    <div className="p-4">
      <h3 className="font-medium text-white truncate mb-1">{video.originalName}</h3>
      <p className="text-sm text-neutral-400">{video.resolution}</p>
    </div>
  </Link>
);

const SessionRow = ({ session }: { session: Session }) => (
  <Link
    to={`/review/${session.id}`}
    className="block p-4 hover:bg-neutral-750 transition-colors duration-200"
  >
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-medium text-white">{session.name}</h3>
        <p className="text-sm text-neutral-400">
          {session.metadata.totalChunks} recording chunks · {formatDuration(session.totalDuration)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm text-neutral-400">
          {new Date(session.updatedAt).toLocaleDateString()}
        </p>
        <span className={`text-xs px-2 py-1 rounded ${
          session.status === 'exported' ? 'bg-success-500/20 text-success-400' :
          session.status === 'active' ? 'bg-primary-500/20 text-primary-400' :
          'bg-neutral-600 text-neutral-300'
        }`}>
          {session.status}
        </span>
      </div>
    </div>
  </Link>
);

const EmptyState = ({ icon: Icon, title, description, action, actionLabel }: any) => (
  <div className="card p-12 text-center">
    <Icon className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
    <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
    <p className="text-neutral-400 mb-6">{description}</p>
    {action && actionLabel && (
      <button onClick={action} className="btn btn-primary">
        {actionLabel}
      </button>
    )}
  </div>
);

const formatDuration = (ms: number) => {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export default Dashboard;
