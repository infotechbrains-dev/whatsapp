'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, PencilIcon, TrashIcon, CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline';
import WhatsAppPreview from '@/components/templates/WhatsAppPreview';

export default function TemplatePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const templateName = decodeURIComponent(params.name);

  const [template, setTemplate] = useState(null);
  const [templateData, setTemplateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // Fetch template data
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
          setTemplate(template);
          
          // Parse template data for preview
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
                  } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(component.format) && component.example?.header_handle) {
                    // Create a mock media object for preview
                    parsedTemplate.headerMedia = {
                      s3Url: component.example.header_handle[0],
                      originalName: `Media File.${component.format.toLowerCase()}`,
                      mimeType: `${component.format.toLowerCase()}/example`
                    };
                  }
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
        setLoading(false);
      }
    };

    if (templateName) {
      fetchTemplate();
    }
  }, [templateName, router]);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete the template "${templateName}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const token = localStorage.getItem('whatsapp_token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch(`/api/templates/${templateName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        router.push('/dashboard/templates');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete template');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'PENDING':
        return <ClockIcon className="h-5 w-5 text-yellow-600" />;
      case 'REJECTED':
        return <XCircleIcon className="h-5 w-5 text-red-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error}</p>
          <Link
            href="/dashboard/templates"
            className="mt-4 inline-flex items-center text-green-600 hover:text-green-700"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Templates
          </Link>
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
              <h1 className="text-lg font-semibold text-gray-900">Template Preview: {templateName}</h1>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                href={`/dashboard/templates/${encodeURIComponent(templateName)}/edit`}
                className="flex items-center px-3 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200"
              >
                <PencilIcon className="h-4 w-4 mr-1" />
                Edit
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 disabled:opacity-50"
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Template Info and Preview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Template Information */}
          <div className="space-y-6">
            {/* Template Details Card */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Template Information</h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Name</label>
                    <p className="mt-1 text-sm text-gray-900">{template.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1 flex items-center space-x-2">
                      {getStatusIcon(template.status)}
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(template.status)}`}>
                        {template.status || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Category</label>
                    <p className="mt-1 text-sm text-gray-900">{template.category}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Language</label>
                    <p className="mt-1 text-sm text-gray-900">{template.language}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Template Components */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Template Components</h3>
              </div>
              <div className="px-6 py-4">
                {template.components && template.components.length > 0 ? (
                  <div className="space-y-4">
                    {template.components.map((component, index) => (
                      <div key={index} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-gray-700">{component.type}</h4>
                          {component.format && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {component.format}
                            </span>
                          )}
                        </div>
                        {component.text && (
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{component.text}</p>
                        )}
                        {component.buttons && (
                          <div className="mt-2 space-y-1">
                            {component.buttons.map((button, btnIndex) => (
                              <div key={btnIndex} className="flex items-center space-x-2 text-xs">
                                <span className={`px-2 py-1 rounded ${button.type === 'URL' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                  {button.type}
                                </span>
                                <span className="text-gray-600">{button.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No components found</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Panel - WhatsApp Preview */}
          <div className="lg:sticky lg:top-6 lg:h-fit">
            {templateData && <WhatsAppPreview templateData={templateData} />}
          </div>
        </div>
      </div>
    </div>
  );
}
