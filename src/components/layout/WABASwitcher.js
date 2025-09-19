'use client';

import { useState, useEffect } from 'react';
import { ChevronDownIcon, CheckIcon, PhoneIcon, PlusIcon, WifiIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

const WABASwitcher = ({ currentCompanyId, onWABAChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [wabas, setWabas] = useState([]);
  const [currentWABA, setCurrentWABA] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentCompanyId) {
      fetchCompanyWABAs();
    }
  }, [currentCompanyId]);

  const fetchCompanyWABAs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('whatsapp_token');
      const response = await fetch(`/api/companies/${currentCompanyId}/wabas`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWabas(data.wabas || []);
        
        // Set current WABA (default one or first one)
        const current = data.wabas.find(waba => waba.isDefault) || data.wabas[0];
        setCurrentWABA(current);
      }
    } catch (error) {
      console.error('Error fetching WABAs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWABASwitch = async (waba) => {
    try {
      const token = localStorage.getItem('whatsapp_token');
      const response = await fetch('/api/user/switch-waba', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          wabaId: waba._id 
        }),
      });

      if (response.ok) {
        setCurrentWABA(waba);
        setIsOpen(false);
        
        // Callback to parent to refresh data
        if (onWABAChange) {
          onWABAChange(waba);
        }
        
        // Refresh the page to update all data
        window.location.reload();
      }
    } catch (error) {
      console.error('Error switching WABA:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'setup_required':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getQualityColor = (quality) => {
    switch (quality) {
      case 'GREEN':
        return 'text-green-600';
      case 'YELLOW':
        return 'text-yellow-600';
      case 'RED':
        return 'text-red-600';
      default:
        return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg animate-pulse">
        <div className="w-6 h-6 bg-gray-300 rounded"></div>
        <div className="w-32 h-4 bg-gray-300 rounded"></div>
      </div>
    );
  }

  if (!wabas.length) {
    return (
      <Link
        href={`/dashboard/companies/${currentCompanyId}/wabas/new`}
        className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <PlusIcon className="w-5 h-5" />
        <span className="text-sm font-medium">Add WhatsApp Number</span>
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-w-[220px]"
      >
        <div className="flex items-center space-x-3 flex-1">
          <div className="flex items-center space-x-2">
            <PhoneIcon className="w-5 h-5 text-gray-400" />
            <div 
              className={`w-2 h-2 rounded-full ${
                currentWABA?.healthStatus?.isConnected 
                  ? 'bg-green-500' 
                  : 'bg-red-500'
              }`}
            />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900 truncate">
              {currentWABA?.whatsappConfig?.displayPhoneNumber || 'Select Number'}
            </p>
            <p className="text-xs text-gray-500">
              {currentWABA?.name || 'No WABA selected'}
            </p>
          </div>
        </div>
        <ChevronDownIcon 
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto">
            <div className="py-1">
              {wabas.map((waba) => (
                <button
                  key={waba._id}
                  onClick={() => handleWABASwitch(waba)}
                  className="w-full flex items-center justify-between px-3 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <PhoneIcon className="w-5 h-5 text-gray-400" />
                      <div 
                        className={`w-2 h-2 rounded-full ${
                          waba.healthStatus?.isConnected 
                            ? 'bg-green-500' 
                            : 'bg-red-500'
                        }`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900">
                          {waba.whatsappConfig.displayPhoneNumber}
                        </p>
                        {waba.isDefault && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <p className="text-xs text-gray-500">
                          {waba.name}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(waba.status)}`}>
                          {waba.status}
                        </span>
                        {waba.whatsappConfig.qualityRating && (
                          <div className={`flex items-center space-x-1 ${getQualityColor(waba.whatsappConfig.qualityRating)}`}>
                            <WifiIcon className="w-3 h-3" />
                            <span className="text-xs">{waba.whatsappConfig.qualityRating}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {currentWABA?._id === waba._id && (
                    <CheckIcon className="w-5 h-5 text-blue-600" />
                  )}
                </button>
              ))}
              
              {/* Divider */}
              <div className="border-t border-gray-200 my-1"></div>
              
              {/* Add new WABA */}
              <Link
                href={`/dashboard/companies/${currentCompanyId}/wabas/new`}
                className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                onClick={() => setIsOpen(false)}
              >
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 bg-gray-200 text-gray-500 rounded flex items-center justify-center">
                    <PlusIcon className="w-3 h-3" />
                  </div>
                  <div className="w-2 h-2"></div> {/* Spacer for alignment */}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Add WhatsApp Number
                  </p>
                  <p className="text-xs text-gray-500">
                    Connect another WABA
                  </p>
                </div>
              </Link>
              
              {/* Manage WABAs */}
              <Link
                href={`/dashboard/companies/${currentCompanyId}/wabas`}
                className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                onClick={() => setIsOpen(false)}
              >
                <div className="flex items-center space-x-2">
                  <PhoneIcon className="w-5 h-5 text-gray-500" />
                  <div className="w-2 h-2"></div> {/* Spacer for alignment */}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Manage Numbers
                  </p>
                  <p className="text-xs text-gray-500">
                    Settings and configuration
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WABASwitcher;
