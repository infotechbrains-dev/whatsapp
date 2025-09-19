'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, PhotoIcon, FolderOpenIcon } from '@heroicons/react/24/outline';
import SimpleMediaModal from '@/components/media/SimpleMediaModal';

export default function NewCampaignPage() {
  const [campaignData, setCampaignData] = useState({
    name: '',
    description: '',
    messageType: 'template', // 'template', 'text', 'image', 'video', 'document'
    templateId: '',
    headerValue: '',
    headerMedia: null, // For image/video/document headers
    bodyParameters: [],
    // For direct message types
    textMessage: '',
    messageMedia: null,
    scheduledDate: '',
    contactFilters: {
      tags: [],
      excludeUnsubscribed: true,
    },
  });
  const [templates, setTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaModalMode, setMediaModalMode] = useState(null);
  const router = useRouter();

  useEffect(() => {
    loadTemplates();
    loadContacts();
  }, []);

  const loadTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/templates', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const approvedTemplates = (data.templates || []).filter(t => t.status === 'APPROVED');
        setTemplates(approvedTemplates);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadContacts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/contacts?limit=1000', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts || []);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const handleTemplateChange = (templateId) => {
    const template = templates.find(t => t._id === templateId);
    setSelectedTemplate(template);
    setCampaignData(prev => ({
      ...prev,
      templateId,
      headerValue: '',
      headerMedia: null,
      bodyParameters: template ? new Array(template.bodyParameters?.length || 0).fill('') : [],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: campaignData.name,
          description: campaignData.description,
          messageType: campaignData.messageType,
          templateId: campaignData.templateId || null,
          headerValue: campaignData.headerValue,
          headerMediaId: campaignData.headerMedia?._id || null,
          bodyParameters: campaignData.bodyParameters,
          textMessage: campaignData.textMessage,
          messageMediaId: campaignData.messageMedia?._id || null,
          scheduledDate: campaignData.scheduledDate || null,
          contactFilters: campaignData.contactFilters,
        }),
      });

      if (response.ok) {
        router.push('/dashboard/campaigns');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create campaign');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openMediaUploader = () => {
    setMediaModalMode('upload');
    setShowMediaModal(true);
  };

  const openMediaLibrary = () => {
    setMediaModalMode('library');
    setShowMediaModal(true);
  };

  const handleMediaSelect = (mediaFile) => {
    if (campaignData.messageType === 'template') {
      // For template messages, set header media
      setCampaignData(prev => ({
        ...prev,
        headerMedia: mediaFile
      }));
    } else {
      // For direct messages, set message media
      setCampaignData(prev => ({
        ...prev,
        messageMedia: mediaFile
      }));
    }
    setShowMediaModal(false);
    setMediaModalMode(null);
  };

  const removeSelectedMedia = () => {
    setCampaignData(prev => ({
      ...prev,
      headerMedia: null
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/dashboard/campaigns"
          className="flex items-center text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Campaigns
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create New Campaign</h1>
        <p className="mt-1 text-gray-600">
          Set up a bulk messaging campaign to send to multiple contacts.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Campaign Form */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Campaign Details</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Campaign Name *
              </label>
              <input
                type="text"
                id="name"
                required
                value={campaignData.name}
                onChange={(e) => setCampaignData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                placeholder="Enter campaign name"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={campaignData.description}
                onChange={(e) => setCampaignData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                placeholder="Describe your campaign"
              />
            </div>
          </div>

          {/* Message Type Selection */}
          <div>
            <label htmlFor="messageType" className="block text-sm font-medium text-gray-700">
              Message Type *
            </label>
            <select
              id="messageType"
              required
              value={campaignData.messageType}
              onChange={(e) => {
                setCampaignData(prev => ({ 
                  ...prev, 
                  messageType: e.target.value,
                  templateId: '', // Reset template selection
                  textMessage: '',
                  messageMedia: null
                }));
                setSelectedTemplate(null);
              }}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
            >
              <option value="template">WhatsApp Template</option>
              <option value="text">Text Message</option>
              <option value="image">Image Message</option>
              <option value="video">Video Message</option>
              <option value="document">Document Message</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              {campaignData.messageType === 'template' && 'Use pre-approved WhatsApp templates'}
              {campaignData.messageType === 'text' && 'Send plain text messages'}
              {campaignData.messageType === 'image' && 'Send images with optional caption'}
              {campaignData.messageType === 'video' && 'Send videos with optional caption'}
              {campaignData.messageType === 'document' && 'Send documents with optional caption'}
            </p>
          </div>

          {/* Template Selection - Only show for template message type */}
          {campaignData.messageType === 'template' && (
          <div>
            <label htmlFor="template" className="block text-sm font-medium text-gray-700">
              Select Template *
            </label>
            <select
              id="template"
              required
              value={campaignData.templateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Choose a template...</option>
              {templates.map((template) => (
                <option key={template._id} value={template._id}>
                  {template.name} ({template.language})
                </option>
              ))}
            </select>
            {templates.length === 0 && (
              <p className="mt-1 text-sm text-red-600">
                No approved templates found. Please create and approve templates first.
              </p>
            )}
          </div>
          )}

          {/* Template Parameters */}
          {selectedTemplate && (
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900">Template Parameters</h4>
              
              {/* Header Parameter */}
              {selectedTemplate.headerRequiresParam && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Header {selectedTemplate.headerType.toLowerCase()} *
                  </label>
                  
                  {selectedTemplate.headerType === 'TEXT' ? (
                    <input
                      type="text"
                      value={campaignData.headerValue}
                      onChange={(e) => setCampaignData(prev => ({ ...prev, headerValue: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter header text"
                    />
                  ) : (
                    // Media header (IMAGE, VIDEO, DOCUMENT)
                    <div>
                      {campaignData.headerMedia ? (
                        <div className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                {selectedTemplate.headerType === 'IMAGE' && (
                                  <img 
                                    src={campaignData.headerMedia.s3Url} 
                                    alt={campaignData.headerMedia.originalName}
                                    className="w-16 h-16 object-cover rounded-lg"
                                  />
                                )}
                                {selectedTemplate.headerType === 'VIDEO' && (
                                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                                    <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                                {selectedTemplate.headerType === 'DOCUMENT' && (
                                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {campaignData.headerMedia.originalName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {(campaignData.headerMedia.fileSize / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={removeSelectedMedia}
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
                              onClick={openMediaUploader}
                              className="flex-1 flex items-center justify-center px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                            >
                              <div className="text-center">
                                <PhotoIcon className="mx-auto h-8 w-8 text-gray-400" />
                                <p className="mt-2 text-sm font-medium text-gray-900">Upload New</p>
                                <p className="text-xs text-gray-500">
                                  {selectedTemplate.headerType.toLowerCase()} file
                                </p>
                              </div>
                            </button>
                            
                            <button
                              type="button"
                              onClick={openMediaLibrary}
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
                            Select {selectedTemplate.headerType.toLowerCase()} file for this campaign
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Body Parameters */}
              {selectedTemplate.bodyParameters && selectedTemplate.bodyParameters.map((param, index) => (
                <div key={param.key}>
                  <label className="block text-sm font-medium text-gray-700">
                    {param.name}
                  </label>
                  <input
                    type="text"
                    value={campaignData.bodyParameters[index] || ''}
                    onChange={(e) => {
                      const newParams = [...campaignData.bodyParameters];
                      newParams[index] = e.target.value;
                      setCampaignData(prev => ({ ...prev, bodyParameters: newParams }));
                    }}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    placeholder={param.description}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Direct Message Input - For non-template message types */}
          {campaignData.messageType !== 'template' && (
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900">Message Content</h4>
              
              {/* Text Message */}
              {campaignData.messageType === 'text' && (
                <div>
                  <label htmlFor="textMessage" className="block text-sm font-medium text-gray-700">
                    Message Text *
                  </label>
                  <textarea
                    id="textMessage"
                    required
                    rows={4}
                    value={campaignData.textMessage}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, textMessage: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter your message text..."
                  />
                </div>
              )}

              {/* Media Message (Image/Video/Document) */}
              {['image', 'video', 'document'].includes(campaignData.messageType) && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Select {campaignData.messageType} *
                    </label>
                    
                    {campaignData.messageMedia ? (
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {campaignData.messageType === 'image' && (
                                <img 
                                  src={campaignData.messageMedia.s3Url} 
                                  alt={campaignData.messageMedia.originalName}
                                  className="w-16 h-16 object-cover rounded-lg"
                                />
                              )}
                              {campaignData.messageType === 'video' && (
                                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                                  <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                              {campaignData.messageType === 'document' && (
                                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </div>
                                )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {campaignData.messageMedia.originalName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(campaignData.messageMedia.fileSize / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCampaignData(prev => ({ ...prev, messageMedia: null }))}
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
                            onClick={() => {
                              setMediaModalMode('upload');
                              setShowMediaModal(true);
                            }}
                            className="flex-1 flex items-center justify-center px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                          >
                            <div className="text-center">
                              <PhotoIcon className="mx-auto h-8 w-8 text-gray-400" />
                              <p className="mt-2 text-sm font-medium text-gray-900">Upload New</p>
                              <p className="text-xs text-gray-500">
                                {campaignData.messageType} file
                              </p>
                            </div>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setMediaModalMode('library');
                              setShowMediaModal(true);
                            }}
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
                          Select {campaignData.messageType} file for this campaign
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Caption for media messages */}
                  <div>
                    <label htmlFor="textMessage" className="block text-sm font-medium text-gray-700">
                      Caption (Optional)
                    </label>
                    <textarea
                      id="textMessage"
                      rows={3}
                      value={campaignData.textMessage}
                      onChange={(e) => setCampaignData(prev => ({ ...prev, textMessage: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter optional caption for the media..."
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scheduling */}
          <div>
            <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700">
              Schedule Date (Optional)
            </label>
            <input
              type="datetime-local"
              id="scheduledDate"
              value={campaignData.scheduledDate}
              onChange={(e) => setCampaignData(prev => ({ ...prev, scheduledDate: e.target.value }))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Leave blank to send immediately after creation
            </p>
          </div>

          {/* Contact Filters */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Target Audience</h4>
            
            <div className="flex items-center">
              <input
                id="excludeUnsubscribed"
                type="checkbox"
                checked={campaignData.contactFilters.excludeUnsubscribed}
                onChange={(e) => setCampaignData(prev => ({
                  ...prev,
                  contactFilters: {
                    ...prev.contactFilters,
                    excludeUnsubscribed: e.target.checked
                  }
                }))}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="excludeUnsubscribed" className="ml-2 block text-sm text-gray-900">
                Exclude unsubscribed contacts
              </label>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-800">
                <strong>Contacts:</strong> {contacts.length} total contacts found.
                {campaignData.contactFilters.excludeUnsubscribed && (
                  <span className="block mt-1">
                    Unsubscribed contacts will be automatically excluded from this campaign.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3">
            <Link
              href="/dashboard/campaigns"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || templates.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>

      {/* Media Selection Modal */}
      <SimpleMediaModal
        isOpen={showMediaModal}
        onClose={() => {
          setShowMediaModal(false);
          setMediaModalMode(null);
        }}
        mode={mediaModalMode}
        onFileSelect={handleMediaSelect}
      />
    </div>
  );
}
