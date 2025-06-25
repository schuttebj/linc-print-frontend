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
  Pagination,
  Alert,
  CircularProgress,
  Badge
} from '@mui/material';
import {
  GetApp as ExportIcon,
  Security as SecurityIcon,
  Assessment as AssessmentIcon
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

const ACTION_TYPES = ['LOGIN', 'LOGOUT', 'CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT', 'PERMISSION_CHANGE'];
const RESOURCE_TYPES = ['USER', 'PERSON', 'LOCATION', 'AUDIT_LOGS', 'SYSTEM_SECURITY'];

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
  
  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadAuditData();
  }, []);

  useEffect(() => {
    if (activeTab === 0) {
      loadAuditLogs();
    }
  }, [currentPage, actionFilter, resourceFilter, startDate, endDate, activeTab]);

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
        page: currentPage.toString(),
        per_page: '50',
        ...(actionFilter && { action_type: actionFilter }),
        ...(resourceFilter && { resource_type: resourceFilter }),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate })
      });

      const response = await api.get<AuditLogResponse>(`${API_ENDPOINTS.audit}?${params}`);
      setAuditLogs(response.logs || []);
      setTotalPages(response.total_pages || 1);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
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
                  <FormControl fullWidth>
                    <Select
                      value={actionFilter}
                      onChange={(e) => setActionFilter(e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="">All Actions</MenuItem>
                      {ACTION_TYPES.map(action => (
                        <MenuItem key={action} value={action}>{action}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <Select
                      value={resourceFilter}
                      onChange={(e) => setResourceFilter(e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="">All Resources</MenuItem>
                      {RESOURCE_TYPES.map(resource => (
                        <MenuItem key={resource} value={resource}>{resource}</MenuItem>
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
                </TableRow>
              </TableHead>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(log.created_at)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {log.username || 'System'}
                      </Typography>
                      {log.user_agent && (
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {log.user_agent}
                        </Typography>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Chip 
                        label={log.action}
                        color={getActionColor(log.action)}
                        size="small"
                      />
                      {log.method && log.endpoint && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {log.method} {log.endpoint}
                        </Typography>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {log.resource && (
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {log.resource}
                          </Typography>
                          {log.resource_id && (
                            <Typography variant="caption" color="text.secondary" noWrap>
                              ID: {log.resource_id}
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
                          {log.error_message}
                        </Typography>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">
                        {log.ip_address || 'Unknown'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination 
                count={totalPages} 
                page={currentPage} 
                onChange={(_, page) => setCurrentPage(page)}
                color="primary"
              />
            </Box>
          )}
        </Box>
      )}

      {/* Statistics Tab */}
      {activeTab === 1 && statistics && (
        <Grid container spacing={3}>
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
                  {statistics.security_events}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Security Events
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
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
    </Box>
  );
};

export default AuditLogViewer; 