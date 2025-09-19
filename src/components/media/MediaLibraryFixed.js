'use client';

import { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  PhotoIcon,
  VideoCameraIcon,
  DocumentIcon,
  XMarkIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

const MediaLibraryFixed = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  allowMultiple = false,
  fileTypes = ['image', 'video', 'document']
}) => {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

  useEffect(() => {
    if (isOpen) {
      console.log('MediaLibrary opened, fetching media files...');
      fetchMediaFiles();
    }
  }, [isOpen, filters, pagination.currentPage]);

  const fetchMediaFiles = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('Fetching media files with filters:', filters);
      
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
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Making request to /api/media with params:', params.toString());
      
      const response = await fetch(`/api/media?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch media files');
      }

      const data = await response.json();
      console.log('Received media files:', data);
      
      setMediaFiles(data.mediaFiles || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      console.error('Error fetching media files:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file) => {
    console.log('File selected:', file);
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

  console.log('Rendering MediaLibrary. Loading:', loading, 'Error:', error, 'Files count:', mediaFiles.length);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-6xl bg-white rounded-lg shadow-2xl max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Media Library</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2"
                type="button"
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
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto flex-1" style={{ maxHeight: 'calc(80vh - 200px)' }}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="text-red-800">
                  <strong>Error:</strong> {error}
                </div>
              </div>
            )}
            
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">Loading media files...</span>
              </div>
            ) : mediaFiles.length === 0 ? (
              <div className="text-center py-12">
                <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-500">
                  {error ? 'Failed to load media files' : 'No media files found'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Upload some files to get started
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-gray-600">
                  Found {mediaFiles.length} files
                </div>
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
                            onError={(e) => {
                              console.error('Image failed to load:', file.s3Url);
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : (
                          <div className="text-gray-400">
                            {getFileIcon(file.fileType)}
                          </div>
                        )}
                        <div className="hidden w-full h-full items-center justify-center text-gray-400">
                          {getFileIcon(file.fileType)}
                        </div>
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
                          <CheckCircleIcon className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              {/* Pagination */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                  disabled={pagination.currentPage === 1}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                  type="button"
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
                  type="button"
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
                    type="button"
                  >
                    Select {selectedFiles.size} files
                  </button>
                )}
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
        </div>
      </div>
    </div>
  );
};

export default MediaLibraryFixed;
