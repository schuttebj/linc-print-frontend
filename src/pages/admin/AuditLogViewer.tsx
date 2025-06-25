/**
 * Audit Log Viewer for Madagascar LINC Print System
 * Comprehensive interface for viewing audit logs, security events, and system monitoring
 */

import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS, api } from '../../config/api';

// Audit log interfaces
interface AuditLog {
  id: string;
  user_id?: string;
  username?: string;
  action: string;
  resource?: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  endpoint?: string;
  method?: string;
  success: boolean;
  error_message?: string;
  details?: any;
  location_id?: string;
  created_at: string;
}

interface AuditLogResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  filters_applied: {
    action_type?: string;
    resource_type?: string;
    user_id?: string;
    start_date?: string;
    end_date?: string;
    success_only?: boolean;
  };
}

interface AuditStatistics {
  total_actions: number;
  total_users: number;
  success_rate: number;
  top_actions: Array<{ action: string; count: number }>;
  daily_activity: Array<{ date: string; count: number }>;
  failed_actions: number;
  security_events: number;
}

interface SuspiciousActivity {
  user_id: string;
  username: string;
  activity_type: string;
  description: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  event_count: number;
  first_occurrence: string;
  last_occurrence: string;
  ip_addresses: string[];
}

const ACTION_TYPES = [
  'CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 
  'EXPORT', 'PRINT', 'PERMISSION_CHANGE', 'SECURITY_EVENT'
];

const RESOURCE_TYPES = [
  'USER', 'PERSON', 'LOCATION', 'ROLE', 'PERMISSION', 
  'AUDIT_LOGS', 'SYSTEM', 'FILE'
];

const AuditLogViewer: React.FC = () => {
  // State management
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null);
  const [suspiciousActivity, setSuspiciousActivity] = useState<SuspiciousActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'logs' | 'statistics' | 'security'>('logs');
  
  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [resourceFilter, setResourceFilter] = useState<string>('');
  const [userFilter, setUserFilter] = useState<string>('');
  const [successFilter, setSuccessFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Export state
  const [exporting, setExporting] = useState(false);

  // Load initial data
  useEffect(() => {
    loadAuditData();
  }, []);

  // Load data when filters change
  useEffect(() => {
    loadAuditLogs();
  }, [currentPage, actionFilter, resourceFilter, userFilter, successFilter, startDate, endDate]);

  const loadAuditData = async () => {
    try {
      setLoading(true);
      
      const [logsRes, statsRes, securityRes] = await Promise.all([
        loadAuditLogs(),
        loadStatistics(),
        loadSuspiciousActivity()
      ]);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit data');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: '50',
        ...(actionFilter && { action_type: actionFilter }),
        ...(resourceFilter && { resource_type: resourceFilter }),
        ...(userFilter && { user_id: userFilter }),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
        ...(successFilter && { success_only: successFilter })
      });

      const auditEndpoint = API_ENDPOINTS.users.replace('/users', '/audit');
      const response = await api.get<AuditLogResponse>(`${auditEndpoint}?${params}`);
      setAuditLogs(response.logs);
      setTotalPages(response.total_pages);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
      throw err;
    }
  };

  const loadStatistics = async () => {
    try {
      const auditEndpoint = API_ENDPOINTS.users.replace('/users', '/audit');
      const response = await api.get<AuditStatistics>(`${auditEndpoint}/statistics`);
      setStatistics(response);
      return response;
    } catch (err) {
      console.error('Failed to load statistics:', err);
      return null;
    }
  };

  const loadSuspiciousActivity = async () => {
    try {
      const auditEndpoint = API_ENDPOINTS.users.replace('/users', '/audit');
      const response = await api.get<{ suspicious_activities: SuspiciousActivity[] }>(`${auditEndpoint}/security/suspicious-activity`);
      setSuspiciousActivity(response.suspicious_activities);
      return response;
    } catch (err) {
      console.error('Failed to load suspicious activity:', err);
      return null;
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      setExporting(true);
      
      const params = new URLSearchParams({
        export_format: format,
        ...(actionFilter && { action_type: actionFilter }),
        ...(resourceFilter && { resource_type: resourceFilter }),
        ...(userFilter && { user_id: userFilter }),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
        ...(successFilter && { success_only: successFilter })
      });

      const auditEndpoint = API_ENDPOINTS.users.replace('/users', '/audit');
      const response = await fetch(`${auditEndpoint}/export?${params}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Export failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export audit logs');
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create': return 'bg-green-100 text-green-800';
      case 'read': return 'bg-blue-100 text-blue-800';
      case 'update': return 'bg-yellow-100 text-yellow-800';
      case 'delete': return 'bg-red-100 text-red-800';
      case 'login': return 'bg-purple-100 text-purple-800';
      case 'logout': return 'bg-gray-100 text-gray-800';
      case 'security_event': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Audit Log Viewer</h1>
        <p className="text-gray-600">Monitor system activity, security events, and user actions</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-4 text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'logs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Audit Logs
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'statistics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Statistics
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Security Monitoring
            {suspiciousActivity.length > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {suspiciousActivity.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Audit Logs Tab */}
      {activeTab === 'logs' && (
        <div>
          {/* Filters and Export */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Actions</option>
                {ACTION_TYPES.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>
            
            <div>
              <select
                value={resourceFilter}
                onChange={(e) => setResourceFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Resources</option>
                {RESOURCE_TYPES.map(resource => (
                  <option key={resource} value={resource}>{resource}</option>
                ))}
              </select>
            </div>
            
            <div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Export buttons */}
          <div className="mb-6 flex gap-4">
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
            <button
              onClick={() => handleExport('json')}
              disabled={exporting}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : 'Export JSON'}
            </button>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(log.created_at)}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {log.username || 'System'}
                      </div>
                      {log.user_agent && (
                        <div className="text-xs text-gray-500 truncate max-w-40">
                          {log.user_agent}
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                      {log.method && log.endpoint && (
                        <div className="text-xs text-gray-500 mt-1">
                          {log.method} {log.endpoint}
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.resource && (
                        <div>
                          <div className="font-medium">{log.resource}</div>
                          {log.resource_id && (
                            <div className="text-xs text-gray-500 truncate max-w-32">
                              ID: {log.resource_id}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        log.success 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {log.success ? 'Success' : 'Failed'}
                      </span>
                      {!log.success && log.error_message && (
                        <div className="text-xs text-red-600 mt-1 truncate max-w-40">
                          {log.error_message}
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.ip_address || 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'statistics' && statistics && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">{statistics.total_actions.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Actions</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">{statistics.total_users}</div>
              <div className="text-sm text-gray-600">Active Users</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-2xl font-bold text-purple-600">{(statistics.success_rate * 100).toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-2xl font-bold text-red-600">{statistics.security_events}</div>
              <div className="text-sm text-gray-600">Security Events</div>
            </div>
          </div>

          {/* Top Actions */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Most Common Actions</h3>
            <div className="space-y-3">
              {statistics.top_actions.slice(0, 10).map((item, index) => (
                <div key={item.action} className="flex justify-between items-center">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-700 mr-2">#{index + 1}</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(item.action)}`}>
                      {item.action}
                    </span>
                  </div>
                  <span className="text-sm text-gray-900 font-medium">{item.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div>
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Suspicious Activity Detection</h3>
            
            {suspiciousActivity.length === 0 ? (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                ✅ No suspicious activity detected in the last 24 hours.
              </div>
            ) : (
              <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Activity Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Risk Level
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event Count
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IP Addresses
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {suspiciousActivity.map((activity, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {activity.username}
                          </div>
                          <div className="text-xs text-gray-500">{activity.user_id}</div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{activity.activity_type}</div>
                          <div className="text-xs text-gray-500">{activity.description}</div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskLevelColor(activity.risk_level)}`}>
                            {activity.risk_level}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {activity.event_count}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>{formatDate(activity.first_occurrence)}</div>
                          <div className="text-xs">to {formatDate(activity.last_occurrence)}</div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="max-w-32">
                            {activity.ip_addresses.slice(0, 2).join(', ')}
                            {activity.ip_addresses.length > 2 && (
                              <span className="text-xs"> +{activity.ip_addresses.length - 2} more</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogViewer; 