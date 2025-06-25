/**
 * Audit Log Viewer for Madagascar LINC Print System
 * Comprehensive interface for viewing system audit logs, statistics, and security monitoring
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
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
  timestamp: string;
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

const AuditLogViewer: React.FC = () => {
  // State management
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null);
  const [suspiciousActivity, setSuspiciousActivity] = useState<SuspiciousActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  
  // Tab management
  const [activeTab, setActiveTab] = useState(0);
  
  // Pagination and filtering - using TablePagination style
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalResults, setTotalResults] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // View log details
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showLogDetails, setShowLogDetails] = useState(false);

  useEffect(() => {
    loadAuditData();
  }, []);

  useEffect(() => {
    if (activeTab === 0) {
      loadAuditLogs();
    }
  }, [page, rowsPerPage, actionFilter, resourceFilter, startDate, endDate, activeTab]);

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
      setAuditLogs(response.logs || []);
      setTotalResults(response.total || 0);
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
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Typography variant="h4" component="h1" gutterBottom>
        Audit Log Viewer
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Monitor system activity, security events, and user actions
      </Typography>

      {/* Main Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab 
            label="Audit Logs" 
            icon={<AssessmentIcon />}
            iconPosition="start"
          />
          <Tab 
            label="Statistics" 
            icon={<AssessmentIcon />}
            iconPosition="start"
          />
          <Tab 
            label={
              <Badge badgeContent={suspiciousActivity?.length || 0} color="error">
                Security Monitoring
              </Badge>
            }
            icon={<SecurityIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Audit Logs Tab */}
      {activeTab === 0 && (
        <Box>
          {/* Filters */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Filters & Export
              </Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Action</InputLabel>
                    <Select
                      value={actionFilter}
                      onChange={(e) => setActionFilter(e.target.value)}
                      label="Action"
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
                    >
                      <MenuItem value="">All Resources</MenuItem>
                      {RESOURCE_TYPES.map(resource => (
                        <MenuItem key={resource.value} value={resource.value}>{resource.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <TextField
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    fullWidth
                    size="small"
                    label="Start Date"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <TextField
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    fullWidth
                    size="small"
                    label="End Date"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>

              {/* Export buttons */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<ExportIcon />}
                  onClick={() => handleExport('csv')}
                  disabled={exporting}
                >
                  {exporting ? 'Exporting...' : 'Export CSV'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ExportIcon />}
                  onClick={() => handleExport('json')}
                  disabled={exporting}
                >
                  {exporting ? 'Exporting...' : 'Export JSON'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Audit Logs Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'grey.50' }}>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Resource</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>IP Address</TableCell>
                  <TableCell align="center">Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(log.timestamp)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {log.username || 'System'}
                      </Typography>
                      {log.user_agent && (
                        <Typography variant="caption" color="text.secondary" noWrap>
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
                          <Typography variant="caption" color="text.secondary" display="block">
                            {log.method}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      {log.resource && (
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {RESOURCE_TYPES.find(r => r.value === log.resource)?.label || log.resource}
                          </Typography>
                          {log.resource_id && (
                            <Typography variant="caption" color="text.secondary" noWrap>
                              ID: {log.resource_id.substring(0, 8)}...
                            </Typography>
                          )}
                        </Box>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Chip 
                        label={log.success ? 'Success' : 'Failed'}
                        color={log.success ? 'success' : 'error'}
                        size="small"
                      />
                      {!log.success && log.error_message && (
                        <Typography variant="caption" color="error.main" display="block" noWrap>
                          {log.error_message.substring(0, 30)}...
                        </Typography>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">
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

          {/* Pagination */}
          <TablePagination
            rowsPerPageOptions={[25, 50, 100, 200]}
            component="div"
            count={totalResults}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        </Box>
      )}

      {/* Statistics Tab */}
      {activeTab === 1 && statistics && (
        <Box>
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="primary.main">
                    {statistics.total_actions}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Actions
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="success.main">
                    {(statistics.success_rate * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Success Rate
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="info.main">
                    {statistics.total_users}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Users
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="error.main">
                    {statistics.failed_actions}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Failed Actions
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Top Actions */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Most Common Actions
                  </Typography>
                  {statistics.top_actions && statistics.top_actions.length > 0 ? (
                    <Box>
                      {statistics.top_actions.slice(0, 10).map((action, index) => (
                        <Box key={action.action} sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2" fontWeight="medium">
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
                    <Typography variant="body2" color="text.secondary">
                      No action data available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Daily Activity */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Daily Activity (Last 7 Days)
                  </Typography>
                  {statistics.daily_activity && statistics.daily_activity.length > 0 ? (
                    <Box>
                      {statistics.daily_activity.slice(-7).map((day, index) => (
                        <Box key={day.date} sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2" fontWeight="medium">
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
                    <Typography variant="body2" color="text.secondary">
                      No daily activity data available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* System Health */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    System Health Overview
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h3" color="success.main">
                          {((statistics.total_actions - statistics.failed_actions) / statistics.total_actions * 100).toFixed(1)}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          System Uptime
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h3" color="warning.main">
                          {statistics.security_events}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Security Events
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h3" color="info.main">
                          {Math.round(statistics.total_actions / 30)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
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
      {activeTab === 1 && !statistics && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading Statistics...
          </Typography>
        </Box>
      )}

      {/* Security Monitoring Tab */}
      {activeTab === 2 && (
        <Box>
          {suspiciousActivity && suspiciousActivity.length > 0 ? (
            <Grid container spacing={2}>
              {suspiciousActivity.map((activity, index) => (
                <Grid item xs={12} key={index}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="h6">{activity.activity_type}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            User: {activity.username}
                          </Typography>
                          <Typography variant="body2">
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
            <Alert severity="success">
              <Typography variant="h6">No Suspicious Activity Detected</Typography>
              <Typography variant="body2">All system activity appears normal.</Typography>
            </Alert>
          )}
        </Box>
      )}

      {/* Log Details Dialog */}
      <Dialog open={showLogDetails} onClose={() => setShowLogDetails(false)} maxWidth="md" fullWidth>
        <DialogTitle>Audit Log Details</DialogTitle>
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
              {selectedLog.user_agent && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">User Agent:</Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                    {selectedLog.user_agent}
                  </Typography>
                </Grid>
              )}
              {selectedLog.details && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Additional Details:</Typography>
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
    </Box>
  );
};

export default AuditLogViewer; 