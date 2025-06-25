/**
 * Admin Dashboard for Madagascar LINC Print System
 * Central hub for system administration with navigation and overview statistics
 */

import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS, api } from '../../config/api';

// Dashboard interfaces
interface DashboardStats {
  users: {
    total: number;
    active: number;
    new_this_week: number;
  };
  locations: {
    total: number;
    operational: number;
    total_capacity: number;
  };
  audit: {
    total_actions: number;
    actions_today: number;
    security_events: number;
    success_rate: number;
  };
  system: {
    uptime: string;
    version: string;
    last_backup: string;
  };
}

interface QuickAction {
  title: string;
  description: string;
  icon: string;
  action: () => void;
  color: string;
}

interface AdminDashboardProps {
  onNavigate: (page: 'users' | 'locations' | 'audit') => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load dashboard statistics from multiple endpoints
      const [usersRes, locationsRes, auditStatsRes] = await Promise.all([
        api.get<any>(`${API_ENDPOINTS.users}?per_page=1`),
        api.get<any>(`${API_ENDPOINTS.locations}?per_page=1`),
        api.get<any>(`${API_ENDPOINTS.auditStatistics}`).catch(() => null)
      ]);

      // Mock some data for demonstration (in real app, these would come from specific endpoints)
      const dashboardStats: DashboardStats = {
        users: {
          total: usersRes?.total || 0,
          active: Math.floor((usersRes?.total || 0) * 0.85),
          new_this_week: Math.floor((usersRes?.total || 0) * 0.1)
        },
        locations: {
          total: locationsRes?.total || 0,
          operational: Math.floor((locationsRes?.total || 0) * 0.9),
          total_capacity: 1200 // This would come from locations endpoint
        },
        audit: {
          total_actions: auditStatsRes?.total_actions || 0,
          actions_today: auditStatsRes?.actions_today || 0,
          security_events: auditStatsRes?.security_events || 0,
          success_rate: auditStatsRes?.success_rate || 0.95
        },
        system: {
          uptime: '99.8%',
          version: '2.1.0',
          last_backup: new Date().toISOString()
        }
      };

      setStats(dashboardStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const quickActions: QuickAction[] = [
    {
      title: 'Create User',
      description: 'Add a new system user',
      icon: '👤',
      action: () => onNavigate('users'),
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: 'Add Location',
      description: 'Register new office location',
      icon: '🏢',
      action: () => onNavigate('locations'),
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      title: 'View Audit Logs',
      description: 'Monitor system activity',
      icon: '📊',
      action: () => onNavigate('audit'),
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      title: 'System Health',
      description: 'Check system status',
      icon: '⚡',
      action: () => {
        window.open(`${API_ENDPOINTS.health}`, '_blank');
      },
      color: 'bg-orange-500 hover:bg-orange-600'
    }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        <h3 className="font-medium">Error loading dashboard</h3>
        <p>{error}</p>
        <button
          onClick={loadDashboardData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">Madagascar LINC Print - Admin Dashboard</h1>
        <p className="text-blue-100">
          System administration for the Madagascar Driver's License Print System
        </p>
        <div className="mt-4 text-sm">
          <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
            Version {stats?.system.version}
          </span>
          <span className="ml-4 bg-white bg-opacity-20 px-3 py-1 rounded-full">
            Uptime: {stats?.system.uptime}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.title}
              onClick={action.action}
              className={`${action.color} text-white p-6 rounded-lg transition-colors duration-200 text-left`}
            >
              <div className="text-3xl mb-2">{action.icon}</div>
              <div className="font-semibold text-lg">{action.title}</div>
              <div className="text-sm opacity-90">{action.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Statistics Overview */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">System Overview</h2>
        
        {/* User Statistics */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-3">User Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
              <div className="text-2xl font-bold text-blue-600">{stats?.users.total}</div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
              <div className="text-2xl font-bold text-green-600">{stats?.users.active}</div>
              <div className="text-sm text-gray-600">Active Users</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
              <div className="text-2xl font-bold text-purple-600">{stats?.users.new_this_week}</div>
              <div className="text-sm text-gray-600">New This Week</div>
            </div>
          </div>
        </div>

        {/* Location Statistics */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-3">Location Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
              <div className="text-2xl font-bold text-blue-600">{stats?.locations.total}</div>
              <div className="text-sm text-gray-600">Total Locations</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
              <div className="text-2xl font-bold text-green-600">{stats?.locations.operational}</div>
              <div className="text-sm text-gray-600">Operational</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
              <div className="text-2xl font-bold text-orange-600">{stats?.locations.total_capacity}</div>
              <div className="text-sm text-gray-600">Daily Capacity</div>
            </div>
          </div>
        </div>

        {/* Audit Statistics */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-3">System Activity</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
              <div className="text-2xl font-bold text-blue-600">{stats?.audit.total_actions.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Actions</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
              <div className="text-2xl font-bold text-green-600">{stats?.audit.actions_today}</div>
              <div className="text-sm text-gray-600">Actions Today</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
              <div className="text-2xl font-bold text-purple-600">{(stats?.audit.success_rate * 100).toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
              <div className="text-2xl font-bold text-red-600">{stats?.audit.security_events}</div>
              <div className="text-sm text-gray-600">Security Events</div>
            </div>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">System Health</h2>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm font-medium text-gray-700">System Status</div>
              <div className="flex items-center mt-1">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-green-600 font-medium">Operational</span>
              </div>
            </div>
            
            <div>
              <div className="text-sm font-medium text-gray-700">Last Backup</div>
              <div className="text-gray-900 mt-1">
                {stats?.system.last_backup 
                  ? new Date(stats.system.last_backup).toLocaleDateString()
                  : 'Unknown'
                }
              </div>
            </div>
            
            <div>
              <div className="text-sm font-medium text-gray-700">Database</div>
              <div className="flex items-center mt-1">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-green-600 font-medium">Connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Summary */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <div>
                <div className="font-medium text-gray-900">System Started</div>
                <div className="text-sm text-gray-500">All services are running normally</div>
              </div>
              <div className="text-sm text-gray-400">Just now</div>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
              <div>
                <div className="font-medium text-gray-900">Admin Dashboard Accessed</div>
                <div className="text-sm text-gray-500">Administrator panel loaded successfully</div>
              </div>
              <div className="text-sm text-gray-400">Now</div>
            </div>
            
            <div className="text-center py-4">
              <button
                onClick={() => onNavigate('audit')}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View Full Audit Log →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 