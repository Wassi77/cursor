/**
 * Upload Drop Zone component
 * Drag and drop interface for uploading video files
 */

import { useState, useCallback } from 'react';
import { Upload, X, FileVideo, Check } from 'lucide-react';
import { videoApi } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

interface UploadDropZoneProps {
  onClose: () => void;
  onComplete: () => void;
}

const UploadDropZone = ({ onClose, onComplete }: UploadDropZoneProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/x-matroska', 'video/avi', 'video/quicktime'];
    if (!validTypes.includes(selectedFile.type)) {
      alert('Please select a valid video file (MP4, WebM, MKV, AVI, or MOV)');
      return;
    }

    // Validate file size (2GB max)
    if (selectedFile.size > 2147483648) {
      alert('File size exceeds 2GB limit');
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('video', file);
      formData.append('originalName', file.name);

      await videoApi.uploadVideo(formData);
      setUploaded(true);
      
      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (error) {
      console.error('Failed to upload video:', error);
      alert('Failed to upload video. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return mb > 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-700">
          <h2 className="text-xl font-semibold text-white">Import Video</h2>
          <button
            onClick={onClose}
            disabled={uploading || uploaded}
            className="btn btn-ghost btn-icon"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!file && (
            <div
              className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
                dragActive
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-neutral-600 hover:border-neutral-500'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-16 h-16 text-neutral-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                Drag and drop your video here
              </h3>
              <p className="text-neutral-400 mb-4">
                or click to browse your files
              </p>
              <p className="text-sm text-neutral-500 mb-6">
                Supports MP4, WebM, MKV, AVI, MOV · Max 2GB
              </p>
              <label className="btn btn-primary cursor-pointer">
                <FileVideo className="w-4 h-4 mr-2" />
                Select Video File
                <input
                  type="file"
                  className="hidden"
                  accept="video/mp4,video/webm,video/x-matroska,video/avi,video/quicktime"
                  onChange={handleFileSelect}
                />
              </label>
            </div>
          )}

          {file && !uploaded && (
            <div className="space-y-4">
              <div className="card p-4 bg-neutral-800/50 border border-neutral-600">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-primary-500/20 rounded-lg">
                    <FileVideo className="w-8 h-8 text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium truncate">{file.name}</h4>
                    <p className="text-sm text-neutral-400">
                      {formatFileSize(file.size)} · {file.type || 'Unknown type'}
                    </p>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    disabled={uploading}
                    className="btn btn-ghost btn-icon"
                    aria-label="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setFile(null)}
                  disabled={uploading}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="btn btn-primary flex-1"
                >
                  {uploading ? (
                    <>
                      <LoadingSpinner size="small" />
                      <span className="ml-2">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Video
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {uploaded && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-success-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-success-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Upload Complete!
              </h3>
              <p className="text-neutral-400">
                Your video has been successfully imported.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadDropZone;
