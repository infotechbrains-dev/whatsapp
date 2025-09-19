'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, PhotoIcon, FolderOpenIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import MediaLibraryFixed from '@/components/media/MediaLibraryFixed';
import MediaUploaderFixed from '@/components/media/MediaUploaderFixed';
import SimpleMediaModal from '@/components/media/SimpleMediaModal';
import WhatsAppPreview from '@/components/templates/WhatsAppPreview';

export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const templateName = decodeURIComponent(params.name);

  const [templateData, setTemplateData] = useState({
    name: '',
    category: 'MARKETING',
    language: 'en_US',
    headerType: 'NONE',
    headerText: '',
    headerMedia: null,
    bodyText: '',
    footerText: '',
    buttons: []
  });

  const [originalTemplate, setOriginalTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [showSimpleModal, setShowSimpleModal] = useState(false);
  const [simpleModalMode, setSimpleModalMode] = useState(null);
  const [mediaSelectionFor, setMediaSelectionFor] = useState(null);
  const [showMediaUploader, setShowMediaUploader] = useState(false);

  // Fetch existing template data
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const token = localStorage.getItem('whatsapp_token');
        if (!token) {
          router.push('/');
          return;
        }

        const response = await fetch(`/api/templates/${templateName}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const template = data.template;
          setOriginalTemplate(template);
          
          // Parse template data for editing
          const parsedTemplate = {
            name: template.name,
            category: template.category || 'MARKETING',
            language: template.language || 'en_US',
            headerType: 'NONE',
            headerText: '',
            headerMedia: null,
            bodyText: '',
            footerText: '',
            buttons: []
          };

          // Parse components
          if (template.components) {
            template.components.forEach(component => {
              switch (component.type) {
                case 'HEADER':
                  parsedTemplate.headerType = component.format || 'TEXT';
                  if (component.format === 'TEXT') {
                    parsedTemplate.headerText = component.text || '';
                  }
                  // For media headers, we would need to reconstruct the media object
                  // This is a limitation since we may not have the original file info
                  break;
                case 'BODY':
                  parsedTemplate.bodyText = component.text || '';
                  break;
                case 'FOOTER':
                  parsedTemplate.footerText = component.text || '';
                  break;
                case 'BUTTONS':
                  parsedTemplate.buttons = component.buttons || [];
                  break;
              }
            });
          }

          setTemplateData(parsedTemplate);
        } else {
          setError('Template not found');
        }
      } catch (err) {
        setError('Failed to fetch template');
      } finally {
        setFetching(false);
      }
    };

    if (templateName) {
      fetchTemplate();
    }
  }, [templateName, router]);

  const handleInputChange = (field, value) => {
    setTemplateData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('whatsapp_token');
      if (!token) {
        router.push('/');
        return;
      }

      // Build components
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

      // First delete the old template
      const deleteResponse = await fetch(`/api/templates/${templateName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!deleteResponse.ok) {
        const deleteError = await deleteResponse.json();
        throw new Error(deleteError.error || 'Failed to delete old template');
      }

      // Then create the new template
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
        setError(errorData.error || 'Failed to update template');
      }
    } catch (err) {
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectMedia = (purpose) => {
    setMediaSelectionFor(purpose);
    setSimpleModalMode('select');
    setShowSimpleModal(true);
  };

  const uploadMedia = (purpose) => {
    setMediaSelectionFor(purpose);
    setShowMediaUploader(true);
  };

  const handleMediaSelect = (selectedMedia) => {
    if (mediaSelectionFor === 'header') {
      setTemplateData(prev => ({ ...prev, headerMedia: selectedMedia }));
    }
    setShowSimpleModal(false);
    setMediaSelectionFor(null);
  };

  const handleMediaUploadComplete = (uploadedFiles) => {
    if (uploadedFiles && uploadedFiles.length > 0 && mediaSelectionFor === 'header') {
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

  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

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
              <h1 className="text-lg font-semibold text-gray-900">Edit Template: {templateName}</h1>
            </div>
            <div className="w-32"></div> {/* Spacer for balance */}
          </div>
        </div>
      </div>

      {/* Warning Notice */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Editing will delete the original template and create a new one. 
                This may affect approval status and require re-approval from WhatsApp.
              </p>
            </div>
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

          {/* Header Content */}
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
                placeholder="Header text..."
              />
            </div>
          )}

          {/* Media Header Selection */}
          {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(templateData.headerType) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Header {templateData.headerType.toLowerCase()}
              </label>
              
              {templateData.headerMedia ? (
                <div className="border-2 border-dashed border-green-300 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {templateData.headerType === 'IMAGE' && templateData.headerMedia.s3Url && (
                        <img src={templateData.headerMedia.s3Url} alt="Selected" className="w-12 h-12 object-cover rounded" />
                      )}
                      {templateData.headerType === 'VIDEO' && (
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM8 8a3 3 0 106 0 3 3 0 00-6 0z" />
                          </svg>
                        </div>
                      )}
                      {templateData.headerType === 'DOCUMENT' && (
                        <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{templateData.headerMedia.originalName}</p>
                        <p className="text-xs text-gray-500">{templateData.headerMedia.mimeType}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSelectedMedia('header')}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <div className="space-y-4">
                    <div className="flex justify-center space-x-4">
                      <button
                        type="button"
                        onClick={() => selectMedia('header')}
                        className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <FolderOpenIcon className="h-4 w-4 mr-2" />
                        Choose from Library
                      </button>
                      <button
                        type="button"
                        onClick={() => uploadMedia('header')}
                        className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                      >
                        <PhotoIcon className="h-4 w-4 mr-2" />
                        Upload New
                      </button>
                    </div>
                    <p className="text-sm text-gray-500">
                      Select a {templateData.headerType.toLowerCase()} file for the template header
                    </p>
                  </div>
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
              placeholder="Hello {{1}}, welcome to our service! We're excited to have you."
            />
            <p className="mt-1 text-sm text-gray-500">
              Use {`{{1}}`}, {`{{2}}`}, etc. for dynamic placeholders
            </p>
          </div>

          {/* Footer Text */}
          <div>
            <label htmlFor="footerText" className="block text-sm font-medium text-gray-700">
              Footer Text
            </label>
            <input
              type="text"
              id="footerText"
              value={templateData.footerText}
              onChange={(e) => handleInputChange('footerText', e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              placeholder="Optional footer text..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
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
              {loading ? 'Updating...' : 'Update Template'}
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

      {/* Simple Media Modal */}
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

      {/* Media Uploader Modal */}
      {showMediaUploader && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
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
      )}
    </div>
  );
}
