'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, PhotoIcon, FolderOpenIcon, VideoCameraIcon, DocumentIcon } from '@heroicons/react/24/outline';

const MediaLibraryContent = ({ onFileSelect, onClose }) => {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMediaFiles();
  }, []);

  const fetchMediaFiles = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/media?limit=20', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch media files');
      }

      const data = await response.json();
      setMediaFiles(data.mediaFiles || []);
    } catch (error) {
      console.error('Error fetching media files:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'image':
        return <PhotoIcon className="w-8 h-8" />;
      case 'video':
        return <VideoCameraIcon className="w-8 h-8" />;
      default:
        return <DocumentIcon className="w-8 h-8" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-500">Loading your media files...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 text-sm">Error: {error}</p>
      </div>
    );
  }

  if (mediaFiles.length === 0) {
    return (
      <div className="text-center py-8">
        <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-gray-500">No media files found</p>
        <p className="text-sm text-gray-400">Upload some files to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">{mediaFiles.length} files available</p>
      <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto">
        {mediaFiles.map((file) => (
          <div
            key={file._id}
            onClick={() => {
              onFileSelect(file);
              onClose();
            }}
            className="border rounded-lg overflow-hidden cursor-pointer hover:border-blue-500 transition-colors"
          >
            <div className="aspect-square bg-gray-100 flex items-center justify-center">
              {file.fileType === 'image' ? (
                <img
                  src={file.s3Url}
                  alt={file.originalName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-gray-400">
                  {getFileIcon(file.fileType)}
                </div>
              )}
            </div>
            <div className="p-2">
              <p className="text-xs font-medium text-gray-900 truncate">
                {file.originalName}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(file.fileSize)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SimpleMediaModal = ({ isOpen, onClose, mode, onFileSelect }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document');

      const token = localStorage.getItem('token');
      const response = await fetch('/api/media', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      onFileSelect(result.mediaFile);
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {mode === 'upload' ? 'Upload Media' : 'Media Library'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            type="button"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {mode === 'upload' ? (
            <div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm font-medium text-gray-900">
                  Select a file to upload
                </p>
                <input
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="mt-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {uploading && (
                  <p className="mt-2 text-sm text-blue-600">Uploading...</p>
                )}
              </div>
            </div>
          ) : (
            <MediaLibraryContent onFileSelect={onFileSelect} onClose={onClose} />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleMediaModal;
