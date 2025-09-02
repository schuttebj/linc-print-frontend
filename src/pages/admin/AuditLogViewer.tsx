/**
 * Audit Log Viewer for Madagascar LINC Print System
 * Comprehensive interface for viewing system audit logs, statistics, and security monitoring
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Grid,
  FormControl,
  Select,
  MenuItem,
  TextField,
  Card,
  CardContent,
  TablePagination,
  Alert,
  CircularProgress,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputLabel
} from '@mui/material';
import {
  GetApp as ExportIcon,
  Security as SecurityIcon,
  Assessment as AssessmentIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { API_ENDPOINTS, api } from '../../config/api';

// Transaction audit log interfaces (CRUD operations)
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
  timestamp: string;
  // Enhanced audit fields for old/new value tracking
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  changed_fields?: string[];
  screen_reference?: string;
  transaction_id?: string;
}

// API Request log interfaces (Middleware logs)
interface ApiRequestLog {
  id: string;
  request_id: string;
  method: string;
  endpoint: string;
  query_params?: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  status_code: number;
  response_size_bytes?: number;
  duration_ms: number;
  location_id?: string;
  error_message?: string;
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

interface ApiRequestLogResponse {
  logs: ApiRequestLog[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  filters_applied: {
    method?: string;
    endpoint?: string;
    user_id?: string;
    status_code?: number;
    min_duration?: number;
    max_duration?: number;
    start_date?: string;
    end_date?: string;
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

// Constants - simplified and user-friendly
const ACTION_TYPES = [
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'CREATE', label: 'Create' },
  { value: 'READ', label: 'View/Search' },
  { value: 'UPDATE', label: 'Edit/Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'EXPORT', label: 'Export Data' },
  { value: 'PERMISSION_CHANGE', label: 'Permission Change' }
];

const RESOURCE_TYPES = [
  { value: 'USER', label: 'Users' },
  { value: 'PERSON', label: 'Persons' },
  { value: 'LOCATION', label: 'Locations' },
  { value: 'AUDIT_LOGS', label: 'Audit Logs' },
  { value: 'SYSTEM_SECURITY', label: 'System Security' }
];

const HTTP_METHODS = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' }
];

const STATUS_CODES = [
  { value: 200, label: '200 - OK' },
  { value: 201, label: '201 - Created' },
  { value: 400, label: '400 - Bad Request' },
  { value: 401, label: '401 - Unauthorized' },
  { value: 403, label: '403 - Forbidden' },
  { value: 404, label: '404 - Not Found' },
  { value: 500, label: '500 - Server Error' }
];

const AuditLogViewer: React.FC = () => {
  // State management - Transaction audit logs (CRUD)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null);
  const [suspiciousActivity, setSuspiciousActivity] = useState<SuspiciousActivity[]>([]);
  
  // State management - API request logs (Middleware)
  const [apiRequestLogs, setApiRequestLogs] = useState<ApiRequestLog[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  
  // Tab management (0: Transaction Logs, 1: API Request Logs, 2: Statistics, 3: Security)
  const [activeTab, setActiveTab] = useState(0);
  
  // Pagination and filtering - Transaction audit logs
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalResults, setTotalResults] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination and filtering - API request logs
  const [apiPage, setApiPage] = useState(0);
  const [apiRowsPerPage, setApiRowsPerPage] = useState(50);
  const [apiTotalResults, setApiTotalResults] = useState(0);
  const [methodFilter, setMethodFilter] = useState('');
  const [endpointFilter, setEndpointFilter] = useState('');
  const [statusCodeFilter, setStatusCodeFilter] = useState('');
  const [minDurationFilter, setMinDurationFilter] = useState('');
  const [maxDurationFilter, setMaxDurationFilter] = useState('');
  const [apiStartDate, setApiStartDate] = useState('');
  const [apiEndDate, setApiEndDate] = useState('');

  // View log details
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [selectedApiLog, setSelectedApiLog] = useState<ApiRequestLog | null>(null);
  const [showLogDetails, setShowLogDetails] = useState(false);
  const [showApiLogDetails, setShowApiLogDetails] = useState(false);

  useEffect(() => {
    loadAuditData();
  }, []);

  useEffect(() => {
    if (activeTab === 0) {
      loadAuditLogs();
    } else if (activeTab === 1) {
      loadApiRequestLogs();
    }
  }, [page, rowsPerPage, actionFilter, resourceFilter, startDate, endDate, activeTab]);

  useEffect(() => {
    if (activeTab === 1) {
      loadApiRequestLogs();
    }
  }, [apiPage, apiRowsPerPage, methodFilter, endpointFilter, statusCodeFilter, minDurationFilter, maxDurationFilter, apiStartDate, apiEndDate, activeTab]);

  const loadAuditData = async () => {
    try {
      setLoading(true);
      await Promise.all([
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
        page: (page + 1).toString(), // Convert from 0-based to 1-based
        per_page: rowsPerPage.toString(),
        ...(actionFilter && { action_type: actionFilter }),
        ...(resourceFilter && { resource_type: resourceFilter }),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate })
      });

      const response = await api.get<AuditLogResponse>(`${API_ENDPOINTS.audit}?${params}`);
      
      // Filter to show business operations and security events relevant to fraud detection
      const allLogs = response.logs || [];
      const filteredLogs = allLogs.filter(log => {
        // EXCLUDE only pure system noise (keep security events for fraud detection)
        const excludeActions = ['TOKEN_REFRESH']; // Only exclude token refresh spam
        const excludeEndpoints = ['/api/v1/auth/refresh']; // Only exclude refresh endpoint
        const excludeResources = ['API_REQUEST_LOGS']; // Don't show API request log access
        
        // INCLUDE business resources, security events, and CRUD operations
        const businessResources = [
          'APPLICATION', 'PERSON', 'TRANSACTION', 'CARD_ORDER', 'FEE_STRUCTURE', 
          'LICENSE', 'USER', 'AUTHENTICATION', 'SYSTEM_SECURITY' // Keep security events!
        ];
        const fraudRelevantActions = [
          'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 
          'PERMISSION_CHANGE', 'SECURITY_EVENT', 'EXPORT', 'PRINT'
        ];
        
        return (
          // Include business and security resources
          (log.resource && businessResources.includes(log.resource)) ||
          // Include fraud-relevant actions
          (log.action && fraudRelevantActions.includes(log.action)) ||
          // Include business operation endpoints
          (log.endpoint && (
            log.endpoint.includes('/applications') ||
            log.endpoint.includes('/persons') ||
            log.endpoint.includes('/transactions') ||
            log.endpoint.includes('/card-orders') ||
            log.endpoint.includes('/fee-structures') ||
            log.endpoint.includes('/licenses') ||
            log.endpoint.includes('/users') ||
            log.endpoint.includes('/auth/login') ||
            log.endpoint.includes('/auth/logout')
          ))
        ) && (
          // Exclude only pure system noise
          !excludeActions.includes(log.action) &&
          !excludeResources.includes(log.resource || '') &&
          !excludeEndpoints.some(endpoint => log.endpoint?.includes(endpoint))
        );
      });
      
      setAuditLogs(filteredLogs);
      setTotalResults(filteredLogs.length); // Update total to reflect filtered results
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await api.get<AuditStatistics>(`${API_ENDPOINTS.auditStatistics}`);
      setStatistics(response);
    } catch (err) {
      console.error('Failed to load statistics:', err);
    }
  };

  const loadSuspiciousActivity = async () => {
    try {
      const response = await api.get<SuspiciousActivity[]>(`${API_ENDPOINTS.auditSecurity}`);
      setSuspiciousActivity(response || []);
    } catch (err) {
      console.error('Failed to load suspicious activity:', err);
    }
  };

  const loadApiRequestLogs = async () => {
    try {
      const params = new URLSearchParams({
        page: (apiPage + 1).toString(), // Convert from 0-based to 1-based
        per_page: apiRowsPerPage.toString(),
        ...(methodFilter && { method: methodFilter }),
        ...(endpointFilter && { endpoint: endpointFilter }),
        ...(statusCodeFilter && { status_code: statusCodeFilter }),
        ...(minDurationFilter && { min_duration: minDurationFilter }),
        ...(maxDurationFilter && { max_duration: maxDurationFilter }),
        ...(apiStartDate && { start_date: apiStartDate }),
        ...(apiEndDate && { end_date: apiEndDate })
      });

      const response = await api.get<ApiRequestLogResponse>(`${API_ENDPOINTS.apiRequestLogs}?${params}`);
      setApiRequestLogs(response.logs || []);
      setApiTotalResults(response.total || 0);
    } catch (err) {
      console.error('Failed to load API request logs:', err);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      setExporting(true);
      const response = await api.post<string>(`${API_ENDPOINTS.auditExport}`, {
        format,
        action_type: actionFilter,
        resource_type: resourceFilter,
        start_date: startDate,
        end_date: endDate
      });
      
      // Handle file download
      const blob = new Blob([response], { type: format === 'csv' ? 'text/csv' : 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when changing rows per page
  };

  // API Request Log pagination handlers
  const handleApiPageChange = (_event: unknown, newPage: number) => {
    setApiPage(newPage);
  };

  const handleApiRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setApiRowsPerPage(parseInt(event.target.value, 10));
    setApiPage(0); // Reset to first page when changing rows per page
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Invalid Date';
      
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (error) {
      console.error('Date formatting error:', error, 'for dateString:', dateString);
      return 'Invalid Date';
    }
  };

  const getActionColor = (action: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (action.toLowerCase()) {
      case 'create': return 'success';
      case 'read': return 'info';
      case 'update': return 'warning';
      case 'delete': return 'error';
      case 'login': return 'primary';
      case 'logout': return 'secondary';
      default: return 'default';
    }
  };

  const getRiskLevelColor = (level: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (level.toLowerCase()) {
      case 'low': return 'info';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const getHumanReadableAction = (log: AuditLog) => {
    // Create human-readable action descriptions
    if (log.action === 'read' && log.endpoint) {
      if (log.endpoint.includes('/audit')) return 'Viewed Audit Logs';
      if (log.endpoint.includes('/users') && log.endpoint.includes('search')) return 'Searched Users';
      if (log.endpoint.includes('/users')) return 'Viewed Users';
      if (log.endpoint.includes('/persons') && log.endpoint.includes('search')) return 'Searched Persons';
      if (log.endpoint.includes('/persons')) return 'Viewed Persons';
      if (log.endpoint.includes('/locations')) return 'Viewed Locations';
    }
    
    if (log.action === 'CREATE') {
      if (log.resource === 'USER') return 'Created User';
      if (log.resource === 'PERSON') return 'Created Person';
      if (log.resource === 'LOCATION') return 'Created Location';
    }
    
    if (log.action === 'UPDATE') {
      if (log.resource === 'USER') return 'Updated User';
      if (log.resource === 'PERSON') return 'Updated Person';
      if (log.resource === 'LOCATION') return 'Updated Location';
    }
    
    if (log.action === 'DELETE') {
      if (log.resource === 'USER') return 'Deleted User';
      if (log.resource === 'PERSON') return 'Deleted Person';
      if (log.resource === 'LOCATION') return 'Deleted Location';
    }
    
    // Default to the action name with proper formatting
    const actionType = ACTION_TYPES.find(a => a.value === log.action);
    return actionType ? actionType.label : log.action;
  };

  const getHumanReadableActionFromString = (actionString: string) => {
    // Helper function for statistics display
    const actionType = ACTION_TYPES.find(a => a.value === actionString);
    return actionType ? actionType.label : actionString.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDateOnly = (dateString: string) => {
    try {
      if (!dateString) return 'Invalid Date';
      
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error, 'for dateString:', dateString);
      return 'Invalid Date';
    }
  };

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setShowLogDetails(true);
  };

  const handleViewApiDetails = (log: ApiRequestLog) => {
    setSelectedApiLog(log);
    setShowApiLogDetails(true);
  };

  const getStatusCodeColor = (statusCode: number): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    if (statusCode >= 200 && statusCode < 300) return 'success';
    if (statusCode >= 300 && statusCode < 400) return 'info';
    if (statusCode >= 400 && statusCode < 500) return 'warning';
    if (statusCode >= 500) return 'error';
    return 'default';
  };

  const getMethodColor = (method: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (method.toUpperCase()) {
      case 'GET': return 'info';
      case 'POST': return 'success';
      case 'PUT': return 'warning';
      case 'PATCH': return 'warning';
      case 'DELETE': return 'error';
      default: return 'default';
    }
  };

  const formatDuration = (durationMs: number): string => {
    if (durationMs < 1000) return `${durationMs}ms`;
    return `${(durationMs / 1000).toFixed(2)}s`;
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        <Typography variant="h6">Error loading audit data</Typography>
        <Typography variant="body2">{error}</Typography>
      </Alert>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper 
        elevation={0}
        sx={{ 
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#f8f9fa',
          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        {/* Navigation Tabs */}
        <Box sx={{ bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': { 
                minHeight: 48,
                textTransform: 'none',
                fontSize: '0.875rem'
              }
            }}
          >
            <Tab 
              label="Transaction Logs" 
              icon={<AssessmentIcon />}
              iconPosition="start"
              sx={{ minWidth: 140 }}
            />
            <Tab 
              label="API Request Logs" 
              icon={<AssessmentIcon />}
              iconPosition="start"
              sx={{ minWidth: 140 }}
            />
            <Tab 
              label="Statistics" 
              icon={<AssessmentIcon />}
              iconPosition="start"
              sx={{ minWidth: 120 }}
            />
            <Tab 
              label={
                <Badge badgeContent={suspiciousActivity?.length || 0} color="error">
                  Security Monitoring
                </Badge>
              }
              icon={<SecurityIcon />}
              iconPosition="start"
              sx={{ minWidth: 160 }}
            />
          </Tabs>
        </Box>

        {/* Content Area */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'auto',
          p: 2,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Transaction Logs Tab (CRUD operations) */}
          {activeTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {/* Filters */}
              <Box sx={{ 
                bgcolor: 'white', 
                borderBottom: '1px solid', 
                borderColor: 'divider',
                flexShrink: 0,
                p: 2,
                mb: 2,
                borderRadius: 2,
                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px'
              }}>
                <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Action</InputLabel>
                      <Select
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                        label="Action"
                        sx={{
                          '& .MuiOutlinedInput-notchedOutline': { borderWidth: '1px' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderWidth: '1px' },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: '1px' },
                        }}
                      >
                        <MenuItem value="">All Actions</MenuItem>
                        {ACTION_TYPES.map(action => (
                          <MenuItem key={action.value} value={action.value}>{action.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Resource</InputLabel>
                      <Select
                        value={resourceFilter}
                        onChange={(e) => setResourceFilter(e.target.value)}
                        label="Resource"
                        sx={{
                          '& .MuiOutlinedInput-notchedOutline': { borderWidth: '1px' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderWidth: '1px' },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: '1px' },
                        }}
                      >
                        <MenuItem value="">All Resources</MenuItem>
                        {RESOURCE_TYPES.map(resource => (
                          <MenuItem key={resource.value} value={resource.value}>{resource.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={2}>
                    <TextField
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      fullWidth
                      size="small"
                      label="Start Date"
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderWidth: '1px' },
                          '&:hover fieldset': { borderWidth: '1px' },
                          '&.Mui-focused fieldset': { borderWidth: '1px' },
                        },
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={2}>
                    <TextField
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      fullWidth
                      size="small"
                      label="End Date"
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderWidth: '1px' },
                          '&:hover fieldset': { borderWidth: '1px' },
                          '&.Mui-focused fieldset': { borderWidth: '1px' },
                        },
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={2}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        startIcon={<ExportIcon />}
                        onClick={() => handleExport('csv')}
                        disabled={exporting}
                        size="small"
                        fullWidth
                      >
                        {exporting ? 'Exporting...' : 'CSV'}
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<ExportIcon />}
                        onClick={() => handleExport('json')}
                        disabled={exporting}
                        size="small"
                        sx={{
                          borderWidth: '1px',
                          '&:hover': { borderWidth: '1px' },
                        }}
                      >
                        JSON
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Audit Logs Table */}
              <Paper 
                elevation={0}
                sx={{ 
                  bgcolor: 'white',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  borderRadius: 0,
                  boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px'
                }}
              >
                <TableContainer sx={{ flex: 1 }}>
                  <Table stickyHeader sx={{ '& .MuiTableCell-root': { borderRadius: 0 } }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Timestamp</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>User</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Action</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Resource</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Changes</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>IP Address</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id} hover sx={{ '& > *': { py: 0, px: 2 } }}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                              {formatDate(log.timestamp)}
                            </Typography>
                          </TableCell>
                          
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.8rem' }}>
                              {log.username || 'System'}
                            </Typography>
                            {log.user_agent && (
                              <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.7rem' }}>
                                {log.user_agent.substring(0, 30)}...
                              </Typography>
                            )}
                          </TableCell>
                    
                          
                          <TableCell>
                            <Box>
                              <Chip 
                                label={getHumanReadableAction(log)}
                                color={getActionColor(log.action)}
                                size="small"
                              />
                              {log.method && (
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>
                                  {log.method}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          
                          <TableCell>
                            {log.resource && (
                              <Box>
                                <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.8rem' }}>
                                  {RESOURCE_TYPES.find(r => r.value === log.resource)?.label || log.resource}
                                </Typography>
                                {log.resource_id && (
                                  <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.7rem' }}>
                                    ID: {log.resource_id.substring(0, 8)}...
                                  </Typography>
                                )}
                              </Box>
                            )}
                          </TableCell>

                          {/* Changes Column - Show changed fields for CRUD operations */}
                          <TableCell>
                            <Box>
                              {log.changed_fields && log.changed_fields.length > 0 ? (
                                <Box>
                                  <Typography variant="caption" color="primary" fontWeight="medium" sx={{ fontSize: '0.7rem' }}>
                                    {log.changed_fields.length} field{log.changed_fields.length > 1 ? 's' : ''} changed
                                  </Typography>
                                  <Box sx={{ mt: 0.5 }}>
                                    {log.changed_fields.slice(0, 2).map((field, index) => (
                                      <Chip 
                                        key={index}
                                        label={field} 
                                        size="small" 
                                        color="primary" 
                                        variant="outlined"
                                        sx={{ mr: 0.5, mb: 0.5, fontSize: '0.6rem', height: '18px' }}
                                      />
                                    ))}
                                    {log.changed_fields.length > 2 && (
                                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                        +{log.changed_fields.length - 2} more
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                              ) : log.action === 'CREATE' ? (
                                <Typography variant="caption" color="success.main" sx={{ fontSize: '0.7rem' }}>
                                  New record
                                </Typography>
                              ) : log.action === 'DELETE' ? (
                                <Typography variant="caption" color="error.main" sx={{ fontSize: '0.7rem' }}>
                                  Record deleted
                                </Typography>
                              ) : (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                  -
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          
                          <TableCell>
                            <Chip 
                              label={log.success ? 'Success' : 'Failed'}
                              color={log.success ? 'success' : 'error'}
                              size="small"
                            />
                            {!log.success && log.error_message && (
                              <Typography variant="caption" color="error.main" display="block" noWrap sx={{ fontSize: '0.7rem' }}>
                                {log.error_message.substring(0, 30)}...
                              </Typography>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                              {log.ip_address || 'Unknown'}
                            </Typography>
                          </TableCell>

                          <TableCell align="center">
                            <Button
                              size="small"
                              startIcon={<ViewIcon />}
                              onClick={() => handleViewDetails(log)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  rowsPerPageOptions={[25, 50, 100, 200]}
                  component="div"
                  count={totalResults}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handlePageChange}
                  onRowsPerPageChange={handleRowsPerPageChange}
                  sx={{
                    bgcolor: 'white',
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    flexShrink: 0,
                    '& .MuiTablePagination-toolbar': {
                      minHeight: '52px',
                    },
                    '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                      fontSize: '0.8rem',
                    },
                    '& .MuiTablePagination-select': {
                      fontSize: '0.8rem',
                    },
                  }}
                />
              </Paper>
            </Box>
          )}

          {/* API Request Logs Tab (Middleware logs) */}
          {activeTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {/* Filters */}
              <Box sx={{ 
                bgcolor: 'white', 
                borderBottom: '1px solid', 
                borderColor: 'divider',
                flexShrink: 0,
                p: 2,
                mb: 2,
                borderRadius: 2,
                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px'
              }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Method</InputLabel>
                      <Select
                        value={methodFilter}
                        onChange={(e) => setMethodFilter(e.target.value)}
                        label="Method"
                        sx={{
                          '& .MuiOutlinedInput-notchedOutline': { borderWidth: '1px' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderWidth: '1px' },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: '1px' },
                        }}
                      >
                        <MenuItem value="">All Methods</MenuItem>
                        {HTTP_METHODS.map(method => (
                          <MenuItem key={method.value} value={method.value}>{method.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={3}>
                    <TextField
                      value={endpointFilter}
                      onChange={(e) => setEndpointFilter(e.target.value)}
                      fullWidth
                      size="small"
                      label="Endpoint Contains"
                      placeholder="e.g. /api/v1/users"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderWidth: '1px' },
                          '&:hover fieldset': { borderWidth: '1px' },
                          '&.Mui-focused fieldset': { borderWidth: '1px' },
                        },
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Status Code</InputLabel>
                      <Select
                        value={statusCodeFilter}
                        onChange={(e) => setStatusCodeFilter(e.target.value)}
                        label="Status Code"
                        sx={{
                          '& .MuiOutlinedInput-notchedOutline': { borderWidth: '1px' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderWidth: '1px' },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: '1px' },
                        }}
                      >
                        <MenuItem value="">All Status</MenuItem>
                        {STATUS_CODES.map(status => (
                          <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={2}>
                    <TextField
                      type="number"
                      value={minDurationFilter}
                      onChange={(e) => setMinDurationFilter(e.target.value)}
                      fullWidth
                      size="small"
                      label="Min Duration (ms)"
                      placeholder="0"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderWidth: '1px' },
                          '&:hover fieldset': { borderWidth: '1px' },
                          '&.Mui-focused fieldset': { borderWidth: '1px' },
                        },
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <TextField
                      type="number"
                      value={maxDurationFilter}
                      onChange={(e) => setMaxDurationFilter(e.target.value)}
                      fullWidth
                      size="small"
                      label="Max Duration (ms)"
                      placeholder="5000"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderWidth: '1px' },
                          '&:hover fieldset': { borderWidth: '1px' },
                          '&.Mui-focused fieldset': { borderWidth: '1px' },
                        },
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={2}>
                    <TextField
                      type="date"
                      value={apiStartDate}
                      onChange={(e) => setApiStartDate(e.target.value)}
                      fullWidth
                      size="small"
                      label="Start Date"
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderWidth: '1px' },
                          '&:hover fieldset': { borderWidth: '1px' },
                          '&.Mui-focused fieldset': { borderWidth: '1px' },
                        },
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={2}>
                    <TextField
                      type="date"
                      value={apiEndDate}
                      onChange={(e) => setApiEndDate(e.target.value)}
                      fullWidth
                      size="small"
                      label="End Date"
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderWidth: '1px' },
                          '&:hover fieldset': { borderWidth: '1px' },
                          '&.Mui-focused fieldset': { borderWidth: '1px' },
                        },
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* API Request Logs Table */}
              <Paper 
                elevation={0}
                sx={{ 
                  bgcolor: 'white',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  borderRadius: 0,
                  boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px'
                }}
              >
                <TableContainer sx={{ flex: 1 }}>
                  <Table stickyHeader sx={{ '& .MuiTableCell-root': { borderRadius: 0 } }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Timestamp</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Method</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Endpoint</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Duration</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>User</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Response Size</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {apiRequestLogs.map((log) => (
                        <TableRow key={log.id} hover sx={{ '& > *': { py: 0, px: 2 } }}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                              {formatDate(log.created_at)}
                            </Typography>
                          </TableCell>
                          
                          <TableCell>
                            <Chip 
                              label={log.method}
                              color={getMethodColor(log.method)}
                              size="small"
                            />
                          </TableCell>
                          
                          <TableCell>
                            <Typography variant="body2" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.8rem' }}>
                              {log.endpoint}
                            </Typography>
                            {log.query_params && (
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>
                                Query params present
                              </Typography>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            <Chip 
                              label={log.status_code}
                              color={getStatusCodeColor(log.status_code)}
                              size="small"
                            />
                            {log.error_message && (
                              <Typography variant="caption" color="error.main" display="block" noWrap sx={{ fontSize: '0.7rem' }}>
                                Error: {log.error_message.substring(0, 30)}...
                              </Typography>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.8rem' }}>
                              {formatDuration(log.duration_ms)}
                            </Typography>
                            <Typography variant="caption" color={log.duration_ms > 2000 ? 'error.main' : 'text.secondary'} sx={{ fontSize: '0.7rem' }}>
                              {log.duration_ms > 2000 ? 'Slow' : log.duration_ms > 1000 ? 'Normal' : 'Fast'}
                            </Typography>
                          </TableCell>
                          
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                              {log.user_id ? `User ${log.user_id.substring(0, 8)}...` : 'Anonymous'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              {log.ip_address || 'Unknown IP'}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                              {formatFileSize(log.response_size_bytes)}
                            </Typography>
                          </TableCell>

                          <TableCell align="center">
                            <Button
                              size="small"
                              startIcon={<ViewIcon />}
                              onClick={() => handleViewApiDetails(log)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  rowsPerPageOptions={[25, 50, 100, 200]}
                  component="div"
                  count={apiTotalResults}
                  rowsPerPage={apiRowsPerPage}
                  page={apiPage}
                  onPageChange={handleApiPageChange}
                  onRowsPerPageChange={handleApiRowsPerPageChange}
                  sx={{
                    bgcolor: 'white',
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    flexShrink: 0,
                    '& .MuiTablePagination-toolbar': {
                      minHeight: '52px',
                    },
                    '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                      fontSize: '0.8rem',
                    },
                    '& .MuiTablePagination-select': {
                      fontSize: '0.8rem',
                    },
                  }}
                />
              </Paper>
            </Box>
          )}

          {/* Statistics Tab */}
          {activeTab === 2 && statistics && (
            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {/* Summary Cards */}
              <Grid container spacing={3} sx={{ mb: 2 }}>
                <Grid item xs={12} md={3}>
                  <Card sx={{ boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px' }}>
                    <CardContent>
                      <Typography variant="h4" color="primary.main">
                        {statistics.total_actions}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                        Total Actions
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card sx={{ boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px' }}>
                    <CardContent>
                      <Typography variant="h4" color="success.main">
                        {(statistics.success_rate * 100).toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                        Success Rate
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card sx={{ boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px' }}>
                    <CardContent>
                      <Typography variant="h4" color="info.main">
                        {statistics.total_users}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                        Active Users
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card sx={{ boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px' }}>
                    <CardContent>
                      <Typography variant="h4" color="error.main">
                        {statistics.failed_actions}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                        Failed Actions
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
          </Grid>

              {/* Top Actions */}
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                        Most Common Actions
                      </Typography>
                      {statistics.top_actions && statistics.top_actions.length > 0 ? (
                        <Box>
                          {statistics.top_actions.slice(0, 10).map((action, index) => (
                            <Box key={action.action} sx={{ mb: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.8rem' }}>
                                  {getHumanReadableActionFromString(action.action)}
                                </Typography>
                                <Chip 
                                  label={action.count} 
                                  size="small" 
                                  color="primary"
                                />
                              </Box>
                              <Box sx={{ width: '100%', height: 8, backgroundColor: 'grey.200', borderRadius: 1 }}>
                                <Box 
                                  sx={{ 
                                    width: `${(action.count / statistics.top_actions[0].count) * 100}%`, 
                                    height: '100%', 
                                    backgroundColor: 'primary.main', 
                                    borderRadius: 1 
                                  }} 
                                />
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                          No action data available
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Daily Activity */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                        Daily Activity (Last 7 Days)
                      </Typography>
                      {statistics.daily_activity && statistics.daily_activity.length > 0 ? (
                        <Box>
                          {statistics.daily_activity.slice(-7).map((day, index) => (
                            <Box key={day.date} sx={{ mb: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.8rem' }}>
                                  {formatDateOnly(day.date)}
                                </Typography>
                                <Chip 
                                  label={day.count} 
                                  size="small" 
                                  color="info"
                                />
                              </Box>
                              <Box sx={{ width: '100%', height: 8, backgroundColor: 'grey.200', borderRadius: 1 }}>
                                <Box 
                                  sx={{ 
                                    width: statistics.daily_activity.length > 0 
                                      ? `${(day.count / Math.max(...statistics.daily_activity.map(d => d.count))) * 100}%` 
                                      : '0%', 
                                    height: '100%', 
                                    backgroundColor: 'info.main', 
                                    borderRadius: 1 
                                  }} 
                                />
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                          No daily activity data available
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* System Health */}
                <Grid item xs={12}>
                  <Card sx={{ boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                        System Health Overview
                      </Typography>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h3" color="success.main">
                              {((statistics.total_actions - statistics.failed_actions) / statistics.total_actions * 100).toFixed(1)}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                              System Uptime
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h3" color="warning.main">
                              {statistics.security_events}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                              Security Events
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h3" color="info.main">
                              {Math.round(statistics.total_actions / 30)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                              Avg Daily Actions
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Statistics Loading State */}
          {activeTab === 2 && !statistics && (
            <Box sx={{ textAlign: 'center', py: 4, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress />
              <Typography variant="h6" sx={{ mt: 2, fontSize: '1.1rem', fontWeight: 600 }}>
                Loading Statistics...
              </Typography>
            </Box>
          )}

          {/* Security Monitoring Tab */}
          {activeTab === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {suspiciousActivity && suspiciousActivity.length > 0 ? (
                <Grid container spacing={2}>
                  {suspiciousActivity.map((activity, index) => (
                    <Grid item xs={12} key={index}>
                      <Card sx={{ boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                              <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>{activity.activity_type}</Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                User: {activity.username}
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                {activity.description}
                              </Typography>
                            </Box>
                            <Chip 
                              label={activity.risk_level}
                              color={getRiskLevelColor(activity.risk_level)}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Alert severity="success" sx={{ boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px' }}>
                  <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>No Suspicious Activity Detected</Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>All system activity appears normal.</Typography>
                </Alert>
              )}
            </Box>
          )}
        </Box>
      </Paper>

      {/* Log Details Dialog */}
      <Dialog open={showLogDetails} onClose={() => setShowLogDetails(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontSize: '1.1rem', fontWeight: 600 }}>Audit Log Details</DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Timestamp:</Typography>
                <Typography variant="body2">{formatDate(selectedLog.timestamp)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">User:</Typography>
                <Typography variant="body2">{selectedLog.username || 'System'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Action:</Typography>
                <Typography variant="body2">{getHumanReadableAction(selectedLog)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Resource:</Typography>
                <Typography variant="body2">{selectedLog.resource || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Method:</Typography>
                <Typography variant="body2">{selectedLog.method || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Endpoint:</Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                  {selectedLog.endpoint || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">IP Address:</Typography>
                <Typography variant="body2">{selectedLog.ip_address || 'Unknown'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Success:</Typography>
                <Typography variant="body2">{selectedLog.success ? 'Yes' : 'No'}</Typography>
              </Grid>
              {!selectedLog.success && selectedLog.error_message && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Error Message:</Typography>
                  <Typography variant="body2" color="error.main">
                    {selectedLog.error_message}
                  </Typography>
                </Grid>
              )}
              {selectedLog.screen_reference && (
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Screen/Form:</Typography>
                  <Typography variant="body2">{selectedLog.screen_reference}</Typography>
                </Grid>
              )}
              {selectedLog.transaction_id && (
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Transaction ID:</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {selectedLog.transaction_id}
                  </Typography>
                </Grid>
              )}
              {selectedLog.user_agent && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">User Agent:</Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                    {selectedLog.user_agent}
                  </Typography>
                </Grid>
              )}

              {/* Data Changes Section - Enhanced for CRUD operations */}
              {(selectedLog.old_values || selectedLog.new_values || selectedLog.changed_fields) && (
                <Grid item xs={12}>
                  <Paper elevation={1} sx={{ p: 2, backgroundColor: 'grey.50', mt: 2 }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Data Changes
                    </Typography>
                    
                    {selectedLog.changed_fields && selectedLog.changed_fields.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2">Changed Fields:</Typography>
                        <Box sx={{ mt: 1 }}>
                          {selectedLog.changed_fields.map((field, index) => (
                            <Chip 
                              key={index} 
                              label={field} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                              sx={{ mr: 1, mb: 1 }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}

                    <Grid container spacing={2}>
                      {selectedLog.old_values && Object.keys(selectedLog.old_values).length > 0 && (
                        <Grid item xs={6}>
                          <Typography variant="subtitle2" color="warning.main">Previous Values:</Typography>
                          <Paper variant="outlined" sx={{ p: 1, mt: 1, maxHeight: 200, overflow: 'auto' }}>
                            <Typography component="pre" sx={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                              {JSON.stringify(selectedLog.old_values, null, 2)}
                            </Typography>
                          </Paper>
                        </Grid>
                      )}
                      
                      {selectedLog.new_values && Object.keys(selectedLog.new_values).length > 0 && (
                        <Grid item xs={6}>
                          <Typography variant="subtitle2" color="success.main">New Values:</Typography>
                          <Paper variant="outlined" sx={{ p: 1, mt: 1, maxHeight: 200, overflow: 'auto' }}>
                            <Typography component="pre" sx={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                              {JSON.stringify(selectedLog.new_values, null, 2)}
                            </Typography>
                          </Paper>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>
                </Grid>
              )}

              {selectedLog.details && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Technical Details:</Typography>
                  <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem', maxHeight: 200, overflow: 'auto' }}>
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLogDetails(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* API Request Log Details Dialog */}
      <Dialog open={showApiLogDetails} onClose={() => setShowApiLogDetails(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontSize: '1.1rem', fontWeight: 600 }}>API Request Log Details</DialogTitle>
        <DialogContent>
          {selectedApiLog && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Timestamp:</Typography>
                <Typography variant="body2">{formatDate(selectedApiLog.created_at)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Request ID:</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{selectedApiLog.request_id}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Method:</Typography>
                <Chip 
                  label={selectedApiLog.method}
                  color={getMethodColor(selectedApiLog.method)}
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Status Code:</Typography>
                <Chip 
                  label={selectedApiLog.status_code}
                  color={getStatusCodeColor(selectedApiLog.status_code)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Endpoint:</Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {selectedApiLog.endpoint}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Duration:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {formatDuration(selectedApiLog.duration_ms)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">Response Size:</Typography>
                <Typography variant="body2">
                  {formatFileSize(selectedApiLog.response_size_bytes)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">User ID:</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {selectedApiLog.user_id || 'Anonymous'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2">IP Address:</Typography>
                <Typography variant="body2">{selectedApiLog.ip_address || 'Unknown'}</Typography>
              </Grid>
              {selectedApiLog.query_params && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Query Parameters:</Typography>
                  <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem', maxHeight: 200, overflow: 'auto', backgroundColor: 'grey.100', p: 1, borderRadius: 1 }}>
                    {JSON.stringify(JSON.parse(selectedApiLog.query_params), null, 2)}
                  </Typography>
                </Grid>
              )}
              {selectedApiLog.error_message && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Error Message:</Typography>
                  <Typography variant="body2" color="error.main">
                    {selectedApiLog.error_message}
                  </Typography>
                </Grid>
              )}
              {selectedApiLog.user_agent && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">User Agent:</Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all', fontSize: '0.875rem' }}>
                    {selectedApiLog.user_agent}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowApiLogDetails(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AuditLogViewer; 