'use client';

import { useState, useRef } from 'react';
import {
  CloudArrowUpIcon,
  PhotoIcon,
  VideoCameraIcon,
  DocumentIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const MediaUploader = ({ 
  onUploadComplete, 
  fileTypes = ['image', 'video', 'document'],
  maxFiles = 5,
  className = ''
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef(null);

  const getFileTypeFromFile = (file) => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'document';
  };

  const validateFile = (file) => {
    const fileType = getFileTypeFromFile(file);
    
    if (!fileTypes.includes(fileType)) {
      return `File type ${fileType} not allowed`;
    }

    const maxSizes = {
      image: 5 * 1024 * 1024, // 5MB
      video: 100 * 1024 * 1024, // 100MB
      document: 10 * 1024 * 1024, // 10MB
    };

    if (file.size > maxSizes[fileType]) {
      return `File size exceeds ${maxSizes[fileType] / 1024 / 1024}MB limit for ${fileType} files`;
    }

    return null;
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files);
    handleFiles(selectedFiles);
  };

  const handleFiles = async (files) => {
    if (files.length === 0) return;

    // Validate files
    const validFiles = [];
    const newErrors = [];

    files.forEach((file, index) => {
      const error = validateFile(file);
      if (error) {
        newErrors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    // Check max files limit
    if (uploadedFiles.length + validFiles.length > maxFiles) {
      newErrors.push(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setErrors(newErrors);

    if (validFiles.length === 0) return;

    setUploading(true);

    // Upload files one by one to show individual progress
    const results = [];
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      try {
        const result = await uploadSingleFile(file, i);
        results.push(result);
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        newErrors.push(`${file.name}: Upload failed`);
      }
    }

    setUploadedFiles(prev => [...prev, ...results.filter(Boolean)]);
    setErrors(newErrors);
    setUploading(false);
    
    if (onUploadComplete) {
      onUploadComplete(results.filter(Boolean));
    }

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadSingleFile = async (file, index) => {
    const fileType = getFileTypeFromFile(file);
    
    setUploadProgress(prev => ({
      ...prev,
      [index]: { progress: 0, status: 'uploading' }
    }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', fileType);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/media', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      
      setUploadProgress(prev => ({
        ...prev,
        [index]: { progress: 100, status: 'success' }
      }));

      return result.mediaFile;
    } catch (error) {
      setUploadProgress(prev => ({
        ...prev,
        [index]: { progress: 0, status: 'error' }
      }));
      throw error;
    }
  };

  const removeUploadedFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
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

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm font-medium text-gray-900">
          Drop files here or click to upload
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Supports: {fileTypes.join(', ')} files (Max {maxFiles} files)
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={fileTypes.map(type => {
            switch (type) {
              case 'image': return 'image/*';
              case 'video': return 'video/*';
              case 'document': return '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';
              default: return '';
            }
          }).join(',')}
          onChange={handleFileInput}
          className="hidden"
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Choose Files
        </button>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Upload Errors</h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Uploading...</h4>
          {Object.entries(uploadProgress).map(([index, progress]) => (
            <div key={index} className="flex items-center space-x-3">
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      progress.status === 'success' 
                        ? 'bg-green-500' 
                        : progress.status === 'error'
                        ? 'bg-red-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {progress.status === 'success' ? '✓' : progress.status === 'error' ? '✗' : `${progress.progress}%`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Uploaded Files</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="text-gray-400">
                  {getFileIcon(file.fileType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.originalName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.fileSize)}
                  </p>
                </div>
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                <button
                  onClick={() => removeUploadedFile(index)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaUploader;
