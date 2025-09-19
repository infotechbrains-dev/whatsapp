'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  PlusIcon, 
  DocumentTextIcon, 
  CheckCircleIcon, 
  ClockIcon,
  ExclamationCircleIcon 
} from '@heroicons/react/24/outline';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setSyncing(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/templates', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load templates');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return 'text-green-600 bg-green-100';
      case 'PENDING': return 'text-yellow-600 bg-yellow-100';
      case 'REJECTED': return 'text-red-600 bg-red-100';
      case 'PAUSED': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED': return CheckCircleIcon;
      case 'PENDING': return ClockIcon;
      case 'REJECTED': return ExclamationCircleIcon;
      default: return DocumentTextIcon;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="mt-1 text-gray-600">
            Manage your WhatsApp message templates.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadTemplates}
            disabled={syncing}
            className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync Templates'}
          </button>
          <Link
            href="/dashboard/templates/new"
            className="bg-green-600 hover:bg-green-700 text-white rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Template
          </Link>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationCircleIcon className="h-5 w-5 text-red-400 mr-2" />
            <div className="text-sm text-red-800">
              <p className="font-medium">Error loading templates</p>
              <p className="mt-1">{error}</p>
              {error.includes('WhatsApp') && (
                <p className="mt-2">
                  <Link href="/dashboard/settings" className="underline">
                    Configure WhatsApp API credentials
                  </Link> to sync templates.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Templates Grid */}
      {templates.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const StatusIcon = getStatusIcon(template.status);
            
            return (
              <div key={template._id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-8 w-8 text-green-600 mr-3" />
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {template.name}
                        </h3>
                        <p className="text-sm text-gray-500">{template.language}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(template.status)}`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {template.status}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Description:</p>
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {template.description || 'No description available'}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Header: {template.headerType || 'None'}</span>
                      <span>Body Params: {template.bodyParameters?.length || 0}</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex space-x-2">
                    <Link
                      href={`/dashboard/templates/${encodeURIComponent(template.name)}`}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-center px-3 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    >
                      View
                    </Link>
                    <Link
                      href={`/dashboard/templates/${encodeURIComponent(template.name)}/edit`}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center px-3 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Edit
                    </Link>
                    {template.status === 'APPROVED' && (
                      <Link
                        href={`/dashboard/campaigns/new?template=${encodeURIComponent(template.name)}`}
                        className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-center px-3 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                      >
                        Use
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : !error && (
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No templates found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {syncing ? 'Syncing templates...' : 'Get started by creating or syncing your first template.'}
          </p>
          <div className="mt-6 flex justify-center space-x-3">
            <button
              onClick={loadTemplates}
              disabled={syncing}
              className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Sync from WhatsApp'}
            </button>
            <Link
              href="/dashboard/templates/new"
              className="bg-green-600 hover:bg-green-700 text-white rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Create Template
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
