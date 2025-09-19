'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, PhotoIcon, FolderOpenIcon } from '@heroicons/react/24/outline';
import MediaLibraryFixed from '@/components/media/MediaLibraryFixed';
import MediaUploaderFixed from '@/components/media/MediaUploaderFixed';
import SimpleMediaModal from '@/components/media/SimpleMediaModal';
import WhatsAppPreview from '@/components/templates/WhatsAppPreview';

export default function NewTemplatePage() {
  const [templateData, setTemplateData] = useState({
    name: '',
    category: 'MARKETING',
    language: 'en_US',
    headerType: 'TEXT',
    headerText: '',
    bodyText: '',
    footerText: '',
    buttons: [],
    headerMedia: null, // For IMAGE, VIDEO, DOCUMENT headers
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [showMediaUploader, setShowMediaUploader] = useState(false);
  const [mediaSelectionFor, setMediaSelectionFor] = useState(null); // 'header'
  const [simpleModalMode, setSimpleModalMode] = useState(null); // 'upload' or 'library'
  const [showSimpleModal, setShowSimpleModal] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      // Build components array based on form data
      const components = [];
      
      // Add header component
      if (templateData.headerType !== 'NONE') {
        const headerComponent = {
          type: 'HEADER',
          format: templateData.headerType,
        };
        
        if (templateData.headerType === 'TEXT' && templateData.headerText) {
          headerComponent.text = templateData.headerText;
          
          // Add example for text header parameters if they exist
          const headerParams = templateData.headerText.match(/{{(\d+)}}/g) || [];
          if (headerParams.length > 0) {
            const exampleValues = headerParams.map((param, index) => `HeaderSample${index + 1}`);
            headerComponent.example = {
              header_text: exampleValues
            };
          }
        } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(templateData.headerType) && templateData.headerMedia) {
          // For media headers, provide example URL for WhatsApp API
          headerComponent.example = {
            header_handle: [templateData.headerMedia.s3Url]
          };
        }
        
        if (templateData.headerType === 'TEXT' && templateData.headerText || 
            ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(templateData.headerType) && templateData.headerMedia) {
          components.push(headerComponent);
        }
      }
      
      // Add body component
      if (templateData.bodyText) {
        const bodyComponent = {
          type: 'BODY',
          text: templateData.bodyText,
        };

        // Add example for body parameters if they exist
        const bodyParams = templateData.bodyText.match(/{{(\d+)}}/g) || [];
        if (bodyParams.length > 0) {
          const exampleValues = bodyParams.map((param, index) => `Sample${index + 1}`);
          bodyComponent.example = {
            body_text: [exampleValues]
          };
        }

        components.push(bodyComponent);
      }
      
      // Add footer component
      if (templateData.footerText) {
        components.push({
          type: 'FOOTER',
          text: templateData.footerText,
        });
      }

      console.log('Template data to be sent:', {
        name: templateData.name,
        category: templateData.category,
        language: templateData.language,
        components: components,
      });

      console.log('Components breakdown:', components.map(comp => ({
        type: comp.type,
        format: comp.format,
        hasText: !!comp.text,
        hasExample: !!comp.example,
        example: comp.example
      })));

      console.log('Full components JSON:', JSON.stringify(components, null, 2));

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: templateData.name,
          category: templateData.category,
          language: templateData.language,
          components: components,
        }),
      });

      if (response.ok) {
        router.push('/dashboard/templates');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create template');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setTemplateData(prev => ({ ...prev, [field]: value }));
    
    // Clear header media when switching header types
    if (field === 'headerType' && value === 'TEXT') {
      setTemplateData(prev => ({ ...prev, headerMedia: null }));
    }
  };

  const handleMediaSelect = (mediaFile) => {
    if (mediaSelectionFor === 'header') {
      setTemplateData(prev => ({ ...prev, headerMedia: mediaFile }));
    }
    setShowMediaLibrary(false);
    setMediaSelectionFor(null);
  };

  const openMediaLibrary = (purpose) => {
    console.log('Opening media library for:', purpose);
    setMediaSelectionFor(purpose);
    setSimpleModalMode('library');
    setShowSimpleModal(true);
  };

  const openMediaUploader = (purpose) => {
    console.log('Opening media uploader for:', purpose);
    setMediaSelectionFor(purpose);
    setSimpleModalMode('upload');
    setShowSimpleModal(true);
  };

  const handleMediaUploadComplete = (uploadedFiles) => {
    if (uploadedFiles.length > 0 && mediaSelectionFor === 'header') {
      setTemplateData(prev => ({ ...prev, headerMedia: uploadedFiles[0] }));
    }
    setShowMediaUploader(false);
    setMediaSelectionFor(null);
  };

  const removeSelectedMedia = (purpose) => {
    if (purpose === 'header') {
      setTemplateData(prev => ({ ...prev, headerMedia: null }));
    }
  };

  const getFileTypeFromHeaderType = (headerType) => {
    switch (headerType) {
      case 'IMAGE': return ['image'];
      case 'VIDEO': return ['video'];  
      case 'DOCUMENT': return ['document'];
      default: return ['image', 'video', 'document'];
    }
  };



  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard/templates"
                className="flex items-center text-gray-500 hover:text-gray-700"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Templates
              </Link>
            </div>
            <div className="text-center">
              <h1 className="text-lg font-semibold text-gray-900">Create New Template</h1>
            </div>
            <div className="w-32"></div> {/* Spacer for balance */}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Split Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Template Form */}
          <div className="bg-white shadow rounded-lg h-fit">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Template Details</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Template Name *
              </label>
              <input
                type="text"
                id="name"
                required
                value={templateData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                placeholder="e.g., welcome_message"
              />
              <p className="mt-1 text-sm text-gray-500">
                Use lowercase letters, numbers, and underscores only
              </p>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Category *
              </label>
              <select
                id="category"
                required
                value={templateData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              >
                <option value="MARKETING">Marketing</option>
                <option value="UTILITY">Utility</option>
                <option value="AUTHENTICATION">Authentication</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-700">
                Language *
              </label>
              <select
                id="language"
                required
                value={templateData.language}
                onChange={(e) => handleInputChange('language', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              >
                <option value="en_US">English (US)</option>
                <option value="en_GB">English (UK)</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="pt_BR">Portuguese (Brazil)</option>
                <option value="hi">Hindi</option>
              </select>
            </div>

            <div>
              <label htmlFor="headerType" className="block text-sm font-medium text-gray-700">
                Header Type
              </label>
              <select
                id="headerType"
                value={templateData.headerType}
                onChange={(e) => handleInputChange('headerType', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              >
                <option value="NONE">None</option>
                <option value="TEXT">Text</option>
                <option value="IMAGE">Image</option>
                <option value="VIDEO">Video</option>
                <option value="DOCUMENT">Document</option>
              </select>
            </div>
          </div>

          {/* Header Text */}
          {templateData.headerType === 'TEXT' && (
            <div>
              <label htmlFor="headerText" className="block text-sm font-medium text-gray-700">
                Header Text
              </label>
              <input
                type="text"
                id="headerText"
                value={templateData.headerText}
                onChange={(e) => handleInputChange('headerText', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                placeholder="Enter header text"
              />
              <p className="mt-1 text-sm text-gray-500">
                Use {`{{1}}`} for variables
              </p>
            </div>
          )}

          {/* Header Media */}
          {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(templateData.headerType) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Header {templateData.headerType.toLowerCase()} *
              </label>
              
              {templateData.headerMedia ? (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {templateData.headerType === 'IMAGE' && (
                          <img 
                            src={templateData.headerMedia.s3Url} 
                            alt={templateData.headerMedia.originalName}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        )}
                        {templateData.headerType === 'VIDEO' && (
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        {templateData.headerType === 'DOCUMENT' && (
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {templateData.headerMedia.originalName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(templateData.headerMedia.fileSize / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSelectedMedia('header')}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => openMediaUploader('header')}
                      className="flex-1 flex items-center justify-center px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                    >
                      <div className="text-center">
                        <PhotoIcon className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="mt-2 text-sm font-medium text-gray-900">Upload New</p>
                        <p className="text-xs text-gray-500">
                          {templateData.headerType.toLowerCase()} file
                        </p>
                      </div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => openMediaLibrary('header')}
                      className="flex-1 flex items-center justify-center px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                    >
                      <div className="text-center">
                        <FolderOpenIcon className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="mt-2 text-sm font-medium text-gray-900">Choose from Library</p>
                        <p className="text-xs text-gray-500">
                          Previously uploaded files
                        </p>
                      </div>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    {templateData.headerType === 'IMAGE' && 'Supported: JPEG, PNG, GIF, WebP (max 5MB)'}
                    {templateData.headerType === 'VIDEO' && 'Supported: MP4, MPEG, MOV, WebM (max 100MB)'}
                    {templateData.headerType === 'DOCUMENT' && 'Supported: PDF, DOC, XLS, PPT, TXT (max 10MB)'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Body Text */}
          <div>
            <label htmlFor="bodyText" className="block text-sm font-medium text-gray-700">
              Body Text *
            </label>
            <textarea
              id="bodyText"
              required
              rows={4}
              value={templateData.bodyText}
              onChange={(e) => handleInputChange('bodyText', e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              placeholder="Enter the main message content..."
            />
            <p className="mt-1 text-sm text-gray-500">
              Use {`{{1}}`}, {`{{2}}`}, etc. for variables
            </p>
          </div>

          {/* Footer Text */}
          <div>
            <label htmlFor="footerText" className="block text-sm font-medium text-gray-700">
              Footer Text (Optional)
            </label>
            <input
              type="text"
              id="footerText"
              value={templateData.footerText}
              onChange={(e) => handleInputChange('footerText', e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              placeholder="Enter footer text (optional)"
              maxLength={60}
            />
            <p className="mt-1 text-sm text-gray-500">
              Maximum 60 characters
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-medium">Template Review Process</p>
                <p className="mt-1">
                  After submission, your template will be reviewed by WhatsApp and may take 24-48 hours for approval.
                  Make sure to follow WhatsApp&apos;s template guidelines for faster approval.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <Link
              href="/dashboard/templates"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </form>
          </div>
          
          {/* Right Panel - WhatsApp Preview */}
          <div className="lg:sticky lg:top-6 lg:h-fit">
            <WhatsAppPreview templateData={templateData} />
          </div>
        </div>
      </div>

      {/* Simple Media Modal - for testing and debugging */}
      <SimpleMediaModal
        isOpen={showSimpleModal}
        onClose={() => {
          setShowSimpleModal(false);
          setSimpleModalMode(null);
          setMediaSelectionFor(null);
        }}
        mode={simpleModalMode}
        onFileSelect={handleMediaSelect}
      />

      {/* Media Library Modal - Original complex version */}
      {false && (
        <MediaLibraryFixed
          isOpen={showMediaLibrary}
          onClose={() => {
            setShowMediaLibrary(false);
            setMediaSelectionFor(null);
          }}
          onSelect={handleMediaSelect}
          allowMultiple={false}
          fileTypes={mediaSelectionFor === 'header' ? getFileTypeFromHeaderType(templateData.headerType) : ['image', 'video', 'document']}
        />
      )}

      {/* Media Uploader Modal - Original complex version */}
      {false && showMediaUploader && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
                 onClick={() => {
                   setShowMediaUploader(false);
                   setMediaSelectionFor(null);
                 }} />
            
            <div className="inline-block w-full max-w-2xl transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle">
              <div className="bg-white px-6 py-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Upload {templateData.headerType.toLowerCase()} file
                  </h3>
                  <button
                    onClick={() => {
                      setShowMediaUploader(false);
                      setMediaSelectionFor(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                
                <div className="mt-4">
                  <MediaUploaderFixed
                    onUploadComplete={handleMediaUploadComplete}
                    fileTypes={mediaSelectionFor === 'header' ? getFileTypeFromHeaderType(templateData.headerType) : ['image', 'video', 'document']}
                    maxFiles={1}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
