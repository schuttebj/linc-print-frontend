/**
 * Main Admin Page for Madagascar LINC Print System
 * Navigation hub for all administrative functions
 */

import React, { useState } from 'react';
import AdminDashboard from './AdminDashboard';
import UserManagementPage from './UserManagementPage';
import LocationManagementPage from './LocationManagementPage';
import AuditLogViewer from './AuditLogViewer';

type AdminPageType = 'dashboard' | 'users' | 'locations' | 'audit';

interface NavigationItem {
  id: AdminPageType;
  title: string;
  icon: string;
  description: string;
}

const AdminPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<AdminPageType>('dashboard');

  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: '📊',
      description: 'System overview and statistics'
    },
    {
      id: 'users',
      title: 'User Management',
      icon: '👥',
      description: 'Manage system users and roles'
    },
    {
      id: 'locations',
      title: 'Location Management',
      icon: '🏢',
      description: 'Manage office locations and capacity'
    },
    {
      id: 'audit',
      title: 'Audit Logs',
      icon: '🔍',
      description: 'Monitor system activity and security'
    }
  ];

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <AdminDashboard onNavigate={setCurrentPage} />;
      case 'users':
        return <UserManagementPage />;
      case 'locations':
        return <LocationManagementPage />;
      case 'audit':
        return <AuditLogViewer />;
      default:
        return <AdminDashboard onNavigate={setCurrentPage} />;
    }
  };

  const getCurrentPageTitle = () => {
    const item = navigationItems.find(item => item.id === currentPage);
    return item ? item.title : 'Admin Dashboard';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Navigation Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo/Title */}
            <div className="flex items-center">
              <div className="text-2xl font-bold text-gray-900">
                🏛️ LINC Admin
              </div>
              <div className="ml-4 text-sm text-gray-500">
                Madagascar Driver's License System
              </div>
            </div>

            {/* User Info */}
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Administrator Panel
              </div>
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                A
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Administration</h3>
              <nav className="space-y-2">
                {navigationItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 ${
                      currentPage === item.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="text-lg mr-3">{item.icon}</span>
                      <div>
                        <div className="font-medium">{item.title}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {item.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </nav>

              {/* Quick Stats in Sidebar */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Stats</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">System Status</span>
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-xs text-green-600 font-medium">Online</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Sessions</span>
                    <span className="text-xs font-medium text-gray-900">12</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Alerts</span>
                    <span className="text-xs font-medium text-orange-600">0</span>
                  </div>
                </div>
              </div>

              {/* System Actions */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">System Actions</h4>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 rounded">
                    🔄 Refresh Data
                  </button>
                  <button className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 rounded">
                    📥 Export Reports
                  </button>
                  <button className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 rounded">
                    ⚙️ System Settings
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Page Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{getCurrentPageTitle()}</h1>
              <div className="mt-1 text-sm text-gray-600">
                {navigationItems.find(item => item.id === currentPage)?.description}
              </div>
            </div>

            {/* Breadcrumb */}
            <div className="mb-6">
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2">
                  <li>
                    <button
                      onClick={() => setCurrentPage('dashboard')}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      🏠 Admin
                    </button>
                  </li>
                  {currentPage !== 'dashboard' && (
                    <>
                      <span className="text-gray-400">/</span>
                      <li className="text-gray-600 font-medium">
                        {getCurrentPageTitle()}
                      </li>
                    </>
                  )}
                </ol>
              </nav>
            </div>

            {/* Dynamic Page Content */}
            <div className="bg-white rounded-lg shadow-sm min-h-96">
              <div className="p-6">
                {renderCurrentPage()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <div>
              © 2024 Madagascar LINC Print System - Administrative Panel
            </div>
            <div className="flex space-x-6">
              <span>Version 2.1.0</span>
              <span>•</span>
              <button className="hover:text-gray-900">Documentation</button>
              <span>•</span>
              <button className="hover:text-gray-900">Support</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage; 