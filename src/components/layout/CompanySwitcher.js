'use client';

import { useState, useEffect } from 'react';
import { ChevronDownIcon, CheckIcon, BuildingOfficeIcon, PlusIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

const CompanySwitcher = ({ user, onCompanyChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserCompanies();
  }, []);

  const fetchUserCompanies = async () => {
    try {
      const token = localStorage.getItem('whatsapp_token');
      if (!token) {
        setLoading(false);
        return;
      }
      
      const response = await fetch('/api/companies', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
        
        // Set current company based on user preferences or first company
        const current = data.companies.find(company => 
          company._id === user?.preferences?.currentCompanyId
        ) || data.companies[0];
        
        setCurrentCompany(current);
      } else {
        console.error('Failed to fetch companies:', response.status);
        // Try again after a short delay if first attempt fails
        setTimeout(() => {
          fetchUserCompanies();
        }, 1000);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      // Try again after a short delay if request fails
      setTimeout(() => {
        fetchUserCompanies();
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySwitch = async (company) => {
    try {
      const token = localStorage.getItem('whatsapp_token');
      const response = await fetch('/api/user/switch-company', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          companyId: company._id,
          wabaId: null // Reset WABA when switching companies
        }),
      });

      if (response.ok) {
        setCurrentCompany(company);
        setIsOpen(false);
        
        // Callback to parent to refresh data
        if (onCompanyChange) {
          onCompanyChange(company);
        }
        
        // Refresh the page to update all data
        window.location.reload();
      }
    } catch (error) {
      console.error('Error switching company:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg animate-pulse">
        <div className="w-8 h-8 bg-gray-300 rounded"></div>
        <div className="w-24 h-4 bg-gray-300 rounded"></div>
      </div>
    );
  }

  if (!companies.length) {
    return (
      <Link
        href="/dashboard/companies/new"
        className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        <PlusIcon className="w-5 h-5" />
        <span className="text-sm font-medium">Create Company</span>
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-w-[200px]"
      >
        <div className="flex items-center space-x-3 flex-1">
          <div className="w-8 h-8 bg-green-600 text-white rounded flex items-center justify-center text-sm font-semibold">
            {currentCompany?.name?.charAt(0)?.toUpperCase() || 'C'}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900 truncate">
              {currentCompany?.name || 'Select Company'}
            </p>
            <p className="text-xs text-gray-500">
              {companies.length} {companies.length === 1 ? 'company' : 'companies'}
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
              {companies.map((company) => (
                <button
                  key={company._id}
                  onClick={() => handleCompanySwitch(company)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-600 text-white rounded flex items-center justify-center text-sm font-semibold">
                      {company.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {company.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {company.subscription?.plan || 'Free'} Plan
                      </p>
                    </div>
                  </div>
                  {currentCompany?._id === company._id && (
                    <CheckIcon className="w-5 h-5 text-green-600" />
                  )}
                </button>
              ))}
              
              {/* Divider */}
              <div className="border-t border-gray-200 my-1"></div>
              
              {/* Add new company */}
              <Link
                href="/dashboard/companies/new"
                className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                onClick={() => setIsOpen(false)}
              >
                <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded flex items-center justify-center">
                  <PlusIcon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Create New Company
                  </p>
                  <p className="text-xs text-gray-500">
                    Add another business
                  </p>
                </div>
              </Link>
              
              {/* Manage companies */}
              <Link
                href="/dashboard/companies"
                className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                onClick={() => setIsOpen(false)}
              >
                <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded flex items-center justify-center">
                  <BuildingOfficeIcon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Manage Companies
                  </p>
                  <p className="text-xs text-gray-500">
                    Settings and users
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

export default CompanySwitcher;
