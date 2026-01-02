/**
 * Settings page
 * Application settings and preferences
 */

import { useState, useEffect, useRef } from 'react';
import { Trash2, RefreshCw, Monitor, Mic, Volume2, Info } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { sessionApi } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationDialog from '../components/ConfirmationDialog';

const Settings = () => {
  const { theme, setTheme } = useThemeStore();
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('');
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>('');
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    loadDevices();
    loadStats();
  }, []);

  const loadDevices = async () => {
    try {
      setLoadingDevices(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioInputs(devices.filter((d) => d.kind === 'audioinput'));
      setAudioOutputs(devices.filter((d) => d.kind === 'audiooutput'));
      setVideoInputs(devices.filter((d) => d.kind === 'videoinput'));

      // Get default devices
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoadingDevices(false);
    }
  };

  const loadStats = async () => {
    try {
      // Load storage usage
      const sessionCount = parseInt(localStorage.getItem('movie-mimic-session-count') || '0');
      const videoCount = parseInt(localStorage.getItem('movie-mimic-video-count') || '0');
      setStats({ sessionCount, videoCount });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleClearAllData = async () => {
    try {
      setClearing(true);
      localStorage.clear();
      await new Promise((resolve) => setTimeout(resolve, 500));
      setStats({ sessionCount: 0, videoCount: 0 });
      setDeleteDialog(false);
    } catch (error) {
      console.error('Failed to clear data:', error);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-neutral-400">Configure your preferences and manage data</p>
      </div>

      {/* Theme Settings */}
      <section className="card p-6">
        <h2 className="font-semibold text-white mb-4 flex items-center space-x-2">
          <Monitor className="w-5 h-5 text-primary-500" />
          <span>Appearance</span>
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium">Theme</p>
            <p className="text-sm text-neutral-400">Choose your preferred color scheme</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setTheme('light')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                theme === 'light'
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
              }`}
            >
              Light
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                theme === 'dark'
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
              }`}
            >
              Dark
            </button>
          </div>
        </div>
      </section>

      {/* Device Settings */}
      <section className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white flex items-center space-x-2">
            <Mic className="w-5 h-5 text-primary-500" />
            <span>Devices</span>
          </h2>
          <button
            onClick={loadDevices}
            disabled={loadingDevices}
            className="btn btn-ghost btn-icon"
            aria-label="Refresh devices"
          >
            <RefreshCw
              className={`w-4 h-4 ${loadingDevices ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        {loadingDevices ? (
          <div className="flex items-center justify-center py-4">
            <LoadingSpinner size="small" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Audio Input */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Microphone
              </label>
              <select
                value={selectedAudioInput}
                onChange={(e) => setSelectedAudioInput(e.target.value)}
                className="input"
              >
                <option value="">Default</option>
                {audioInputs.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Audio Output */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Speakers
              </label>
              <select className="input" disabled>
                <option value="">Default</option>
                {audioOutputs.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Speakers ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Video Input */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Camera
              </label>
              <select
                value={selectedVideoInput}
                onChange={(e) => setSelectedVideoInput(e.target.value)}
                className="input"
              >
                <option value="">Default</option>
                {videoInputs.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </section>

      {/* Data Management */}
      <section className="card p-6">
        <h2 className="font-semibold text-white mb-4 flex items-center space-x-2">
          <Trash2 className="w-5 h-5 text-error-500" />
          <span>Data Management</span>
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-neutral-800 rounded-lg">
            <div>
              <p className="text-white font-medium">Storage Usage</p>
              <p className="text-sm text-neutral-400">
                {stats?.videoCount || 0} videos · {stats?.sessionCount || 0} sessions
              </p>
            </div>
            <div className="text-right">
              <p className="text-neutral-400">Local Storage</p>
              <p className="text-xs text-neutral-500">Settings only</p>
            </div>
          </div>

          <button
            onClick={() => setDeleteDialog(true)}
            className="btn btn-danger w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All Data
          </button>
        </div>
      </section>

      {/* About */}
      <section className="card p-6">
        <h2 className="font-semibold text-white mb-4 flex items-center space-x-2">
          <Info className="w-5 h-5 text-primary-500" />
          <span>About</span>
        </h2>
        <div className="space-y-2 text-neutral-400">
          <p>Movie Mimic v1.0.0</p>
          <p className="text-sm">
            A comprehensive learning tool for practicing English by mimicking actors from movies.
          </p>
          <p className="text-sm">
            Import videos, record yourself, and export comparison videos to track your progress.
          </p>
        </div>
      </section>

      {/* Clear Data Confirmation */}
      <ConfirmationDialog
        isOpen={deleteDialog}
        title="Clear All Data"
        message="This will remove all locally stored settings and preferences. Videos and sessions stored on the server will not be affected. This action cannot be undone."
        onConfirm={handleClearAllData}
        onCancel={() => setDeleteDialog(false)}
        confirmText="Clear Data"
        confirmClass="btn-danger"
      />
    </div>
  );
};

export default Settings;
