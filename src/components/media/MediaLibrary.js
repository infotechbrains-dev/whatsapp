'use client';

import { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  PhotoIcon,
  VideoCameraIcon,
  DocumentIcon,
  PlusIcon,
  XMarkIcon,
  CloudArrowUpIcon,
  TrashIcon,
  PencilIcon,
  EyeIcon,
  TagIcon,
} from '@heroicons/react/24/outline';

const MediaLibrary = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  allowMultiple = false,
  fileTypes = ['image', 'video', 'document']
}) => {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [filters, setFilters] = useState({
    type: 'all',
    search: '',
    tags: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0
  });
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  useEffect(() => {
    if (isOpen) {
      fetchMediaFiles();
    }
  }, [isOpen, filters, pagination.currentPage]);

  const fetchMediaFiles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: '12'
      });

      if (filters.type !== 'all') {
        params.append('type', filters.type);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.tags) {
        params.append('tags', filters.tags);
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/media?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch media files');
      }

      const data = await response.json();
      setMediaFiles(data.mediaFiles || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      console.error('Error fetching media files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files) => {
    setUploading(true);
    const uploadPromises = Array.from(files).map(async (file) => {
      const fileType = getFileTypeFromFile(file);
      
      if (!fileTypes.includes(fileType)) {
        throw new Error(`File type ${fileType} not allowed`);
      }

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

      return response.json();
    });

    try {
      await Promise.all(uploadPromises);
      fetchMediaFiles(); // Refresh the list
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Error uploading files: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const getFileTypeFromFile = (file) => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'document';
  };

  const handleFileSelect = (file) => {
    if (allowMultiple) {
      const newSelected = new Set(selectedFiles);
      if (newSelected.has(file._id)) {
        newSelected.delete(file._id);
      } else {
        newSelected.add(file._id);
      }
      setSelectedFiles(newSelected);
    } else {
      onSelect(file);
      onClose();
    }
  };

  const handleMultipleSelect = () => {
    const selectedMediaFiles = mediaFiles.filter(file => selectedFiles.has(file._id));
    onSelect(selectedMediaFiles);
    onClose();
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'image':
        return <PhotoIcon className="w-6 h-6" />;
      case 'video':
        return <VideoCameraIcon className="w-6 h-6" />;
      default:
        return <DocumentIcon className="w-6 h-6" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        
        <div className="inline-block w-full max-w-6xl transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Media Library</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            {/* Filters */}
            <div className="mt-4 flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Type Filter */}
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                {fileTypes.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}s
                  </option>
                ))}
              </select>
              
              {/* Upload Button */}
              <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
                <CloudArrowUpIcon className="w-4 h-4 mr-2" />
                Upload Files
                <input
                  type="file"
                  multiple
                  accept={fileTypes.includes('image') ? 'image/*,' : ''}
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
              </label>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : mediaFiles.length === 0 ? (
              <div className="text-center py-12">
                <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-500">No media files found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {mediaFiles.map((file) => (
                  <div
                    key={file._id}
                    className={`relative group border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                      selectedFiles.has(file._id) 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleFileSelect(file)}
                  >
                    {/* Preview */}
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
                    
                    {/* File Info */}
                    <div className="p-2 bg-white">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {file.originalName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.fileSize)}
                      </p>
                    </div>
                    
                    {/* Selection Indicator */}
                    {allowMultiple && selectedFiles.has(file._id) && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              {/* Pagination */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                  disabled={pagination.currentPage === 1}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {allowMultiple && selectedFiles.size > 0 && (
                  <button
                    onClick={handleMultipleSelect}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Select {selectedFiles.size} files
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaLibrary;
