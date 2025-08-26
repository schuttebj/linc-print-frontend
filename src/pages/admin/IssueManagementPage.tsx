/**
 * Issue Management Page - Kanban Dashboard
 * 
 * Comprehensive issue tracking and management interface for admins.
 * Features drag-and-drop Kanban board, filtering, statistics, and bulk actions.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Button,
  IconButton,
  Avatar,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Divider,
  Stack,
  Alert,
  Badge,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Tab,
  Tabs
} from '@mui/material';
import {
  BugReport,
  Assignment,
  Person,
  CalendarToday,
  FilterList,
  Refresh,
  GetApp,
  Settings,
  Analytics,
  Add,
  Edit,
  Delete,
  Comment,
  Attachment,
  OpenInNew,
  DragIndicator,
  Dashboard,
  List as ListIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { API_BASE_URL } from '../../config/api';

// Types
interface Issue {
  id: string;
  title: string;
  description: string;
  category: 'BUG' | 'FEATURE_REQUEST' | 'PERFORMANCE' | 'UI_ISSUE' | 'DATA_ERROR' | 'OTHER';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'NEW' | 'IN_PROGRESS' | 'TESTING' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
  report_type: 'USER_REPORTED' | 'AUTO_REPORTED_JS_ERROR' | 'AUTO_REPORTED_API_ERROR';
  page_url?: string;
  error_message?: string;
  assigned_to?: string;
  reported_by?: string;
  reported_at: string;
  resolved_at?: string;
  screenshot_path?: string;
  console_logs_path?: string;
}

interface IssueStats {
  total_issues: number;
  open_issues: number;
  resolved_issues: number;
  avg_resolution_time?: string;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
  by_report_type: Record<string, number>;
}

// Category and Priority colors
const CATEGORY_COLORS = {
  BUG: 'error',
  FEATURE_REQUEST: 'info',
  PERFORMANCE: 'warning',
  UI_ISSUE: 'primary',
  DATA_ERROR: 'error',
  OTHER: 'default'
} as const;

const PRIORITY_COLORS = {
  CRITICAL: 'error',
  HIGH: 'warning',
  MEDIUM: 'info',
  LOW: 'success'
} as const;

const STATUS_COLUMNS = [
  { id: 'NEW', title: 'New', color: '#f44336' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: '#ff9800' },
  { id: 'TESTING', title: 'Testing', color: '#2196f3' },
  { id: 'RESOLVED', title: 'Resolved', color: '#4caf50' },
  { id: 'CLOSED', title: 'Closed', color: '#9e9e9e' }
];

const IssueManagementPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: [] as string[],
    category: [] as string[],
    priority: [] as string[],
    report_type: [] as string[],
    search: ''
  });

  const queryClient = useQueryClient();

  // Fetch issues
  const { data: issues = [], isLoading, refetch } = useQuery({
    queryKey: ['issues', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters.status.length) params.append('status', filters.status.join(','));
      if (filters.category.length) params.append('category', filters.category.join(','));
      if (filters.priority.length) params.append('priority', filters.priority.join(','));
      if (filters.report_type.length) params.append('report_type', filters.report_type.join(','));
      if (filters.search) params.append('search', filters.search);
      
      const response = await axios.get(`${API_BASE_URL}/api/v1/issues/?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      return response.data.items;
    }
  });

  // Fetch statistics
  const { data: stats } = useQuery<IssueStats>({
    queryKey: ['issue-stats'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/v1/issues/stats/overview`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      return response.data;
    }
  });

  // Update issue status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ issueId, newStatus }: { issueId: string; newStatus: string }) => {
      await axios.patch(`${API_BASE_URL}/api/v1/issues/${issueId}/status`, { new_status: newStatus }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['issue-stats'] });
    }
  });

  // Assign issue mutation
  const assignIssueMutation = useMutation({
    mutationFn: async ({ issueId, assignedTo }: { issueId: string; assignedTo: string }) => {
      await axios.patch(`${API_BASE_URL}/api/v1/issues/${issueId}/assign`, { assigned_to: assignedTo }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    }
  });

  // Group issues by status for Kanban
  const issuesByStatus = React.useMemo(() => {
    const grouped: Record<string, Issue[]> = {};
    STATUS_COLUMNS.forEach(column => {
      grouped[column.id] = issues.filter(issue => issue.status === column.id);
    });
    return grouped;
  }, [issues]);

  const handleStatusChange = (issueId: string, newStatus: string) => {
    updateStatusMutation.mutate({ issueId, newStatus });
  };

  const handleIssueClick = (issue: Issue) => {
    setSelectedIssue(issue);
  };

  const handleCloseIssueDialog = () => {
    setSelectedIssue(null);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'BUG': return <BugReport />;
      case 'FEATURE_REQUEST': return <Add />;
      case 'PERFORMANCE': return <Analytics />;
      case 'UI_ISSUE': return <Dashboard />;
      case 'DATA_ERROR': return <Assignment />;
      default: return <BugReport />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return format(date, 'MMM dd, yyyy');
  };

  const renderIssueCard = (issue: Issue) => (
    <Card
      key={issue.id}
      sx={{
        mb: 1,
        cursor: 'pointer',
        '&:hover': {
          boxShadow: 3,
        }
      }}
      onClick={() => handleIssueClick(issue)}
    >
      <CardContent sx={{ pb: '8px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
          <Avatar sx={{ width: 24, height: 24, mr: 1, bgcolor: CATEGORY_COLORS[issue.category] + '.main' }}>
            {getCategoryIcon(issue.category)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight="medium" noWrap>
              {issue.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {issue.description.substring(0, 80)}...
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
          <Chip
            label={issue.priority}
            size="small"
            color={PRIORITY_COLORS[issue.priority]}
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
          <Typography variant="caption" color="text.secondary">
            {formatTimeAgo(issue.reported_at)}
          </Typography>
        </Box>

        {issue.report_type !== 'USER_REPORTED' && (
          <Chip
            label="Auto"
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.6rem', height: 16, mt: 0.5 }}
          />
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {issue.screenshot_path && (
              <Tooltip title="Has screenshot">
                <Attachment sx={{ fontSize: 14, color: 'text.secondary' }} />
              </Tooltip>
            )}
            {issue.error_message && (
              <Tooltip title="Has error details">
                <BugReport sx={{ fontSize: 14, color: 'error.main' }} />
              </Tooltip>
            )}
          </Box>
          
          {issue.assigned_to && (
            <Avatar sx={{ width: 20, height: 20 }}>
              <Person sx={{ fontSize: 14 }} />
            </Avatar>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  const renderKanbanView = () => (
    <Grid container spacing={2}>
      {STATUS_COLUMNS.map(column => (
        <Grid item xs={12} sm={6} md={2.4} key={column.id}>
          <Paper sx={{ p: 2, height: '70vh', overflow: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: column.color,
                  mr: 1
                }}
              />
              <Typography variant="subtitle2" fontWeight="bold">
                {column.title}
              </Typography>
              <Badge
                badgeContent={issuesByStatus[column.id]?.length || 0}
                color="primary"
                sx={{ ml: 'auto' }}
              />
            </Box>
            
            <Box>
              {issuesByStatus[column.id]?.map(issue => renderIssueCard(issue))}
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );

  const renderListView = () => (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {issues.map(issue => (
          <Paper
            key={issue.id}
            variant="outlined"
            sx={{ p: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
            onClick={() => handleIssueClick(issue)}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getCategoryIcon(issue.category)}
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {issue.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {issue.description.substring(0, 100)}...
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={3} md={2}>
                <Chip label={issue.status} size="small" />
              </Grid>
              <Grid item xs={3} md={2}>
                <Chip
                  label={issue.priority}
                  size="small"
                  color={PRIORITY_COLORS[issue.priority]}
                />
              </Grid>
              <Grid item xs={3} md={2}>
                <Typography variant="caption">
                  {formatTimeAgo(issue.reported_at)}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        ))}
      </Box>
    </Paper>
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography>Loading issues...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Issue Management
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Tabs value={viewMode} onChange={(_, value) => setViewMode(value)}>
            <Tab icon={<Dashboard />} label="Kanban" value="kanban" />
            <Tab icon={<ListIcon />} label="List" value="list" />
          </Tabs>
          
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setFilterDialogOpen(true)}
          >
            Filters
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary">
                  {stats.total_issues}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Issues
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="warning.main">
                  {stats.open_issues}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Open Issues
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="success.main">
                  {stats.resolved_issues}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Resolved Issues
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">
                  {stats.avg_resolution_time || 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg Resolution Time
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Main Content */}
      {viewMode === 'kanban' ? renderKanbanView() : renderListView()}

      {/* Issue Detail Dialog */}
      <Dialog
        open={!!selectedIssue}
        onClose={handleCloseIssueDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedIssue && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getCategoryIcon(selectedIssue.category)}
                <Typography variant="h6">{selectedIssue.title}</Typography>
                <Chip
                  label={selectedIssue.priority}
                  size="small"
                  color={PRIORITY_COLORS[selectedIssue.priority]}
                />
              </Box>
            </DialogTitle>
            
            <DialogContent>
              <Stack spacing={2}>
                <Typography variant="body1">{selectedIssue.description}</Typography>
                
                <Divider />
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Status
                    </Typography>
                    <Typography variant="body2">{selectedIssue.status}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Category
                    </Typography>
                    <Typography variant="body2">{selectedIssue.category}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Reported
                    </Typography>
                    <Typography variant="body2">
                      {format(new Date(selectedIssue.reported_at), 'PPpp')}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Report Type
                    </Typography>
                    <Typography variant="body2">{selectedIssue.report_type}</Typography>
                  </Grid>
                </Grid>

                {selectedIssue.page_url && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Page URL
                    </Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                      {selectedIssue.page_url}
                    </Typography>
                  </Box>
                )}

                {selectedIssue.error_message && (
                  <Alert severity="error">
                    <Typography variant="body2">{selectedIssue.error_message}</Typography>
                  </Alert>
                )}

                <Box sx={{ display: 'flex', gap: 1 }}>
                  {selectedIssue.screenshot_path && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<OpenInNew />}
                      onClick={() => window.open(`${API_BASE_URL}/api/v1/issues/${selectedIssue.id}/files/screenshot`, '_blank')}
                    >
                      View Screenshot
                    </Button>
                  )}
                  {selectedIssue.console_logs_path && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<GetApp />}
                      onClick={() => window.open(`${API_BASE_URL}/api/v1/issues/${selectedIssue.id}/files/console_logs`, '_blank')}
                    >
                      Download Logs
                    </Button>
                  )}
                </Box>
              </Stack>
            </DialogContent>
            
            <DialogActions>
              <Button onClick={handleCloseIssueDialog}>Close</Button>
              <Button variant="contained" onClick={handleCloseIssueDialog}>
                Edit Issue
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Filter Dialog */}
      <Dialog open={filterDialogOpen} onClose={() => setFilterDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Filter Issues</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Search"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              fullWidth
            />
            
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                multiple
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as string[] }))}
                input={<OutlinedInput label="Status" />}
              >
                {STATUS_COLUMNS.map(status => (
                  <MenuItem key={status.id} value={status.id}>
                    {status.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                multiple
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value as string[] }))}
                input={<OutlinedInput label="Priority" />}
              >
                {Object.keys(PRIORITY_COLORS).map(priority => (
                  <MenuItem key={priority} value={priority}>
                    {priority}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFilters({ status: [], category: [], priority: [], report_type: [], search: '' })}>
            Clear All
          </Button>
          <Button onClick={() => setFilterDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IssueManagementPage;
