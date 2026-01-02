/**
 * Export & Download page
 * Export session as video and download options
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Download, ArrowLeft, Settings as SettingsIcon, FileVideo, Play, CheckCircle } from 'lucide-react';
import { sessionApi } from '../services/api';
import { Session, Export, ExportSettings } from '@shared/types';
import LoadingSpinner from '../components/LoadingSpinner';

const ExportDownload = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [exports, setExports] = useState<Export[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    quality: '720p',
    format: 'mp4',
    fps: 30,
    type: 'solo',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessionData();
  }, [sessionId]);

  const loadSessionData = async () => {
    try {
      setLoading(true);
      const [sessionData, exportsData] = await Promise.all([
        sessionApi.getSessionById(sessionId!),
        sessionApi.getSessionExports(sessionId!),
      ]);

      setSession(sessionData);
      setExports(exportsData);
    } catch (error) {
      console.error('Failed to load session data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: 'solo' | 'comparison') => {
    if (!session || exporting) return;

    try {
      setExporting(true);
      const settings: ExportSettings = { ...exportSettings, type };
      await sessionApi.exportSession(sessionId!, settings);

      // Reload exports
      const exportsData = await sessionApi.getSessionExports(sessionId!);
      setExports(exportsData);
    } catch (error) {
      console.error('Failed to export session:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = (exportId: string) => {
    window.open(`/api/sessions/${sessionId}/download/${exportId}`, '_blank');
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to={`/review/${session.id}`} className="btn btn-ghost btn-icon">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Export Videos</h1>
            <p className="text-neutral-400">{session.name}</p>
          </div>
        </div>
      </div>

      {/* Export Settings */}
      <div className="card p-6">
        <h2 className="font-semibold text-white mb-4 flex items-center space-x-2">
          <SettingsIcon className="w-5 h-5 text-primary-500" />
          <span>Export Settings</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quality Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Video Quality
            </label>
            <div className="flex space-x-2">
              {(['480p', '720p', '1080p'] as const).map((quality) => (
                <button
                  key={quality}
                  onClick={() =>
                    setExportSettings((prev) => ({ ...prev, quality }))
                  }
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    exportSettings.quality === quality
                      ? 'bg-primary-500 text-white'
                      : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                  }`}
                >
                  {quality}
                </button>
              ))}
            </div>
          </div>

          {/* FPS Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Frame Rate
            </label>
            <div className="flex space-x-2">
              {[24, 30, 60].map((fps) => (
                <button
                  key={fps}
                  onClick={() =>
                    setExportSettings((prev) => ({ ...prev, fps }))
                  }
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    exportSettings.fps === fps
                      ? 'bg-primary-500 text-white'
                      : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                  }`}
                >
                  {fps} FPS
                </button>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Video Format
            </label>
            <div className="flex space-x-2">
              {(['mp4', 'webm'] as const).map((format) => (
                <button
                  key={format}
                  onClick={() =>
                    setExportSettings((prev) => ({ ...prev, format }))
                  }
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    exportSettings.format === format
                      ? 'bg-primary-500 text-white'
                      : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                  }`}
                >
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Export Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Solo Recording Export */}
        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-primary-500/20 rounded-lg">
              <FileVideo className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Solo Recording</h3>
              <p className="text-sm text-neutral-400">
                Your performance only
              </p>
            </div>
          </div>

          {exporting ? (
            <LoadingSpinner size="small" />
          ) : (
            <button
              onClick={() => handleExport('solo')}
              className="btn btn-primary w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Solo Video
            </button>
          )}

          {/* Existing exports */}
          {exports.filter((e) => e.type === 'solo').length > 0 && (
            <div className="mt-4 space-y-2">
              {exports
                .filter((e) => e.type === 'solo')
                .map((exp) => (
                  <ExportItem
                    key={exp.id}
                    export={exp}
                    onDownload={() => handleDownload(exp.id)}
                  />
                ))}
            </div>
          )}
        </div>

        {/* Comparison Export */}
        <div className="card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-success-500/20 rounded-lg">
              <Play className="w-6 h-6 text-success-500" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Comparison Video</h3>
              <p className="text-sm text-neutral-400">
                Movie + your recordings
              </p>
            </div>
          </div>

          {exporting ? (
            <LoadingSpinner size="small" />
          ) : (
            <button
              onClick={() => handleExport('comparison')}
              className="btn btn-success w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Comparison
            </button>
          )}

          {/* Existing exports */}
          {exports.filter((e) => e.type === 'comparison').length > 0 && (
            <div className="mt-4 space-y-2">
              {exports
                .filter((e) => e.type === 'comparison')
                .map((exp) => (
                  <ExportItem
                    key={exp.id}
                    export={exp}
                    onDownload={() => handleDownload(exp.id)}
                  />
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Export History */}
      {exports.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold text-white mb-4">Export History</h2>
          <div className="space-y-2">
            {exports.map((exp) => (
              <ExportItem
                key={exp.id}
                export={exp}
                onDownload={() => handleDownload(exp.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ExportItem = ({ export: exp, onDownload }: { export: Export; onDownload: () => void }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
      <div className="flex items-center space-x-3">
        <CheckCircle className="w-5 h-5 text-success-500" />
        <div>
          <p className="text-sm text-white">
            {exp.type} · {exp.quality} · {exp.format.toUpperCase()} · {exp.fps}fps
          </p>
          <p className="text-xs text-neutral-400">
            {formatFileSize(exp.filesize)} · {new Date(exp.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
      <button onClick={onDownload} className="btn btn-ghost btn-icon" aria-label="Download">
        <Download className="w-4 h-4" />
      </button>
    </div>
  );
};

const formatFileSize = (bytes: number) => {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
};

export default ExportDownload;
