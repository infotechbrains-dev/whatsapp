'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  HomeIcon, 
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  UsersIcon,
  ChartBarIcon,
  CogIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import CompanySwitcher from './CompanySwitcher';
import WABASwitcher from './WABASwitcher';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Templates', href: '/dashboard/templates', icon: DocumentTextIcon },
  { name: 'Campaigns', href: '/dashboard/campaigns', icon: ChatBubbleLeftRightIcon },
  { name: 'Contacts', href: '/dashboard/contacts', icon: UsersIcon },
  { name: 'Messages', href: '/dashboard/messages', icon: ChatBubbleLeftRightIcon },
  { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: CogIcon },
];

export default function Sidebar({ user, sidebarOpen, setSidebarOpen, onLogout }) {
  const pathname = usePathname();
  const [currentCompany, setCurrentCompany] = useState(null);

  // Handle company/WABA switching
  const handleCompanyChange = (company) => {
    setCurrentCompany(company);
  };

  const handleWABAChange = (waba) => {
    // WABA changed callback
    console.log('WABA changed:', waba?.name);
  };

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
    lg:translate-x-0 lg:static lg:inset-0
    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
  `;

  return (
    <>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={sidebarClasses}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-green-600 rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <span className="ml-2 text-lg font-semibold text-gray-900">WhatsApp SaaS</span>
            </div>
            
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Company and WABA Switchers */}
          <div className="p-4 space-y-3 border-b bg-gray-50">
            <CompanySwitcher 
              user={user} 
              onCompanyChange={handleCompanyChange}
            />
            {currentCompany && (
              <WABASwitcher 
                currentCompanyId={currentCompany._id || user?.preferences?.currentCompanyId}
                onWABAChange={handleWABAChange}
              />
            )}
          </div>

          {/* User info */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-800 font-medium">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {user.fullName}
                </p>
                <p className="text-xs text-gray-500">
                  {user.subscription.plan} plan
                </p>
              </div>
            </div>
            
            <div className="mt-2 text-xs text-gray-500">
              Messages: {user.subscription.messagesUsed} / {user.subscription.messageLimit}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
              <div 
                className="bg-green-600 h-1.5 rounded-full transition-all duration-300" 
                style={{
                  width: `${Math.min((user.subscription.messagesUsed / user.subscription.messageLimit) * 100, 100)}%`
                }}
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${isActive
                      ? 'bg-green-100 text-green-900 border-r-2 border-green-600'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t">
            <button
              onClick={onLogout}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
            >
              <svg className="h-5 w-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
