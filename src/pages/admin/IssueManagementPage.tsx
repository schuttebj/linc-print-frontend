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
  Tabs,
  Container,
  Menu,
  ButtonGroup
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
  List as ListIcon,
  ArrowForward,
  ArrowBack,
  PlayArrow,
  Warning,
  MoreVert,
  CheckCircle,
  Schedule,
  Build,
  Done,
  Cancel
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [issueToDelete, setIssueToDelete] = useState<Issue | null>(null);
  const [moveMenuAnchor, setMoveMenuAnchor] = useState<HTMLElement | null>(null);
  const [issueToMove, setIssueToMove] = useState<Issue | null>(null);
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [consoleLogsData, setConsoleLogsData] = useState<string | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
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
      await axios.patch(`${API_BASE_URL}/api/v1/issues/${issueId}/status`, { 
        new_status: newStatus 
      }, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
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

  // Delete issue mutation
  const deleteIssueMutation = useMutation({
    mutationFn: async (issueId: string) => {
      await axios.delete(`${API_BASE_URL}/api/v1/issues/${issueId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['issue-stats'] });
      setDeleteDialogOpen(false);
      setIssueToDelete(null);
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

  // Delete handlers
  const handleDeleteClick = (issue: Issue, event: React.MouseEvent) => {
    event.stopPropagation();
    setIssueToDelete(issue);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (issueToDelete) {
      deleteIssueMutation.mutate(issueToDelete.id);
    }
  };

  // Move handlers
  const handleMoveClick = (issue: Issue, event: React.MouseEvent) => {
    event.stopPropagation();
    setIssueToMove(issue);
    setMoveMenuAnchor(event.currentTarget as HTMLElement);
  };

  const handleMoveToStatus = (newStatus: string) => {
    if (issueToMove && issueToMove.status !== newStatus) {
      updateStatusMutation.mutate({ 
        issueId: issueToMove.id, 
        newStatus 
      });
    }
    setMoveMenuAnchor(null);
    setIssueToMove(null);
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const currentIndex = STATUS_COLUMNS.findIndex(col => col.id === currentStatus);
    if (currentIndex < STATUS_COLUMNS.length - 1) {
      return STATUS_COLUMNS[currentIndex + 1].id;
    }
    return null;
  };

  const getPreviousStatus = (currentStatus: string): string | null => {
    const currentIndex = STATUS_COLUMNS.findIndex(col => col.id === currentStatus);
    if (currentIndex > 0) {
      return STATUS_COLUMNS[currentIndex - 1].id;
    }
    return null;
  };

  // Drag and drop handler
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // If dropped outside a droppable area
    if (!destination) {
      return;
    }

    // If dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Find the issue being dragged
    const issue = issues.find(issue => issue.id === draggableId);
    if (!issue) {
      return;
    }

    // Update issue status if dropped in a different column
    if (destination.droppableId !== source.droppableId) {
      const newStatus = destination.droppableId;
      updateStatusMutation.mutate({ 
        issueId: issue.id, 
        newStatus 
      });
    }
  };

  const handleStatusChange = (issueId: string, newStatus: string) => {
    updateStatusMutation.mutate({ issueId, newStatus });
  };

  // Fetch file content with authentication
  const fetchFileContent = async (issueId: string, fileType: 'screenshot' | 'console_logs'): Promise<string | null> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/issues/${issueId}/files/${fileType}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
        responseType: fileType === 'screenshot' ? 'blob' : 'text'
      });
      
      if (fileType === 'screenshot') {
        // Convert blob to data URL for display
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(response.data);
        });
      } else {
        return response.data;
      }
    } catch (error) {
      console.error(`Failed to fetch ${fileType}:`, error);
      return null;
    }
  };

  const handleIssueClick = async (issue: Issue) => {
    setSelectedIssue(issue);
    setScreenshotData(null);
    setConsoleLogsData(null);
    setLoadingFiles(true);

    // Load files if they exist
    const promises: Promise<void>[] = [];
    
    if (issue.screenshot_path) {
      promises.push(
        fetchFileContent(issue.id, 'screenshot').then(data => setScreenshotData(data))
      );
    }
    
    if (issue.console_logs_path) {
      promises.push(
        fetchFileContent(issue.id, 'console_logs').then(data => setConsoleLogsData(data))
      );
    }

    // Wait for all files to load
    await Promise.all(promises);
    setLoadingFiles(false);
  };

  const handleCloseIssueDialog = () => {
    setSelectedIssue(null);
    setScreenshotData(null);
    setConsoleLogsData(null);
    setLoadingFiles(false);
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

  const renderIssueCard = (issue: Issue, index: number) => (
    <Draggable key={issue.id} draggableId={issue.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          sx={{
            mb: 1,
            cursor: snapshot.isDragging ? 'grabbing' : 'grab',
            '&:hover': {
              boxShadow: 'rgba(0, 0, 0, 0.1) 0px 4px 12px',
              '& .issue-actions': {
                opacity: 1
              }
            },
            position: 'relative',
            bgcolor: snapshot.isDragging ? '#f5f5f5' : 'white',
            border: snapshot.isDragging ? '2px solid #2196f3' : '1px solid #e0e0e0',
            borderRadius: 2,
            transition: snapshot.isDragging ? 'none' : 'all 0.2s ease',
            transform: snapshot.isDragging ? 'rotate(3deg)' : 'none',
            boxShadow: snapshot.isDragging 
              ? 'rgba(0, 0, 0, 0.2) 0px 8px 24px' 
              : 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px'
          }}
          onClick={(e) => {
            // Prevent click when dragging
            if (!snapshot.isDragging) {
              handleIssueClick(issue);
            }
          }}
        >
      <CardContent sx={{ p: 1.5, pb: '12px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
          <Avatar sx={{ 
            width: 24, 
            height: 24, 
            mr: 1, 
            bgcolor: CATEGORY_COLORS[issue.category] + '.main',
            fontSize: '0.75rem'
          }}>
            {getCategoryIcon(issue.category)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.85rem', mb: 0.5 }}>
              {issue.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ 
              fontSize: '0.7rem',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {issue.description.substring(0, 100)}...
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
          <Chip
            label={issue.priority}
            size="small"
            color={PRIORITY_COLORS[issue.priority]}
            sx={{ fontSize: '0.65rem', height: '18px', fontWeight: 600 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
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
                <Attachment sx={{ fontSize: 12, color: 'text.secondary' }} />
              </Tooltip>
            )}
            {issue.error_message && (
              <Tooltip title="Has error details">
                <BugReport sx={{ fontSize: 12, color: 'error.main' }} />
              </Tooltip>
            )}
          </Box>
          
          {issue.assigned_to && (
            <Avatar sx={{ width: 18, height: 18 }}>
              <Person sx={{ fontSize: 12 }} />
            </Avatar>
          )}
        </Box>

        {/* Action buttons - shown on hover */}
        <Box 
          className="issue-actions"
          sx={{ 
            position: 'absolute',
            top: 4,
            right: 4,
            opacity: 0,
            transition: 'opacity 0.2s',
            display: 'flex',
            gap: 0.5
          }}
        >
          {/* Quick move buttons */}
          {getPreviousStatus(issue.status) && (
            <Tooltip title={`Move to ${STATUS_COLUMNS.find(col => col.id === getPreviousStatus(issue.status))?.title}`}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  const prevStatus = getPreviousStatus(issue.status);
                  if (prevStatus) handleMoveToStatus(prevStatus);
                }}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.95)', 
                  '&:hover': { bgcolor: 'primary.main', color: 'white' },
                  width: 24,
                  height: 24,
                  boxShadow: 1
                }}
              >
                <ArrowBack sx={{ fontSize: '14px' }} />
              </IconButton>
            </Tooltip>
          )}
          
          {getNextStatus(issue.status) && (
            <Tooltip title={`Move to ${STATUS_COLUMNS.find(col => col.id === getNextStatus(issue.status))?.title}`}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  const nextStatus = getNextStatus(issue.status);
                  if (nextStatus) handleMoveToStatus(nextStatus);
                }}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.95)', 
                  '&:hover': { bgcolor: 'success.main', color: 'white' },
                  width: 24,
                  height: 24,
                  boxShadow: 1
                }}
              >
                <ArrowForward sx={{ fontSize: '14px' }} />
              </IconButton>
            </Tooltip>
          )}

          {/* More actions menu */}
          <Tooltip title="More actions">
            <IconButton
              size="small"
              onClick={(e) => handleMoveClick(issue, e)}
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.95)', 
                '&:hover': { bgcolor: 'info.main', color: 'white' },
                width: 24,
                height: 24,
                boxShadow: 1
              }}
            >
              <MoreVert sx={{ fontSize: '14px' }} />
            </IconButton>
          </Tooltip>
          
          {/* Delete button */}
          <Tooltip title="Delete issue">
            <IconButton
              size="small"
              onClick={(e) => handleDeleteClick(issue, e)}
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.95)', 
                '&:hover': { bgcolor: 'error.main', color: 'white' },
                width: 24,
                height: 24,
                boxShadow: 1
              }}
            >
              <Delete sx={{ fontSize: '14px' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
      )}
    </Draggable>
  );

  const renderKanbanView = () => (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        {STATUS_COLUMNS.map(column => (
          <Grid item xs={12} sm={6} md={2.4} key={column.id}>
            <Paper sx={{ 
              p: 1.5, 
              height: '100%', 
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'white',
              boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
              borderRadius: 2,
              border: '1px solid #e0e0e0'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, pb: 1, borderBottom: '1px solid #f0f0f0' }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: column.color,
                    mr: 1
                  }}
                />
                <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>
                  {column.title}
                </Typography>
                <Badge
                  badgeContent={issuesByStatus[column.id]?.length || 0}
                  color="primary"
                  sx={{ 
                    ml: 'auto',
                    '& .MuiBadge-badge': {
                      fontSize: '0.75rem',
                      minWidth: '18px',
                      height: '18px'
                    }
                  }}
                />
              </Box>
              
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <Box 
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{ 
                      flexGrow: 1, 
                      overflow: 'auto',
                      pr: 0.5,
                      bgcolor: snapshot.isDraggingOver ? 'rgba(33, 150, 243, 0.05)' : 'transparent',
                      border: snapshot.isDraggingOver ? '2px dashed #2196f3' : '2px solid transparent',
                      borderRadius: 1,
                      transition: 'all 0.2s ease',
                      minHeight: '100px',
                      '&::-webkit-scrollbar': {
                        width: '4px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: '#f1f1f1',
                        borderRadius: '4px',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: '#c1c1c1',
                        borderRadius: '4px',
                      }
                    }}
                  >
                    {issuesByStatus[column.id]?.map((issue, index) => renderIssueCard(issue, index))}
                    {(!issuesByStatus[column.id] || issuesByStatus[column.id].length === 0) && (
                      <Box sx={{ 
                        textAlign: 'center', 
                        py: 3, 
                        color: 'text.secondary',
                        fontStyle: 'italic',
                        fontSize: '0.875rem'
                      }}>
                        Drop issues here
                      </Box>
                    )}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </DragDropContext>
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
    <>
      <Container maxWidth="lg" sx={{ py: 1, height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
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
          {/* Header */}
          <Box sx={{ 
            p: 2, 
            bgcolor: 'white', 
            borderBottom: '1px solid', 
            borderColor: 'divider',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <Typography variant="h5" fontWeight={600} sx={{ fontSize: '1.25rem', color: 'primary.main' }}>
              Issue Management
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Tabs 
                value={viewMode} 
                onChange={(_, value) => setViewMode(value)}
                sx={{ 
                  minHeight: 'auto',
                  '& .MuiTab-root': { 
                    minHeight: 'auto', 
                    py: 1, 
                    fontSize: '0.875rem' 
                  }
                }}
              >
                <Tab icon={<Dashboard sx={{ fontSize: '18px' }} />} label="Kanban" value="kanban" />
                <Tab icon={<ListIcon sx={{ fontSize: '18px' }} />} label="List" value="list" />
              </Tabs>
              
              <Button
                variant="outlined"
                size="small"
                startIcon={<FilterList />}
                onClick={() => setFilterDialogOpen(true)}
                sx={{ fontSize: '0.875rem' }}
              >
                Filters
              </Button>
              
              <Button
                variant="outlined"
                size="small"
                startIcon={<Refresh />}
                onClick={() => refetch()}
                sx={{ fontSize: '0.875rem' }}
              >
                Refresh
              </Button>
            </Box>
          </Box>

          {/* Statistics Cards */}
          {stats && (
            <Box sx={{ p: 2, bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ 
                    p: 1.5, 
                    textAlign: 'center', 
                    bgcolor: 'primary.50',
                    border: '1px solid #e3f2fd',
                    borderRadius: 2
                  }}>
                    <Typography variant="h5" color="primary.main" fontWeight={600}>
                      {stats.total_issues}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                      Total Issues
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ 
                    p: 1.5, 
                    textAlign: 'center', 
                    bgcolor: 'warning.50',
                    border: '1px solid #fff3e0',
                    borderRadius: 2
                  }}>
                    <Typography variant="h5" color="warning.main" fontWeight={600}>
                      {stats.open_issues}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                      Open Issues
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ 
                    p: 1.5, 
                    textAlign: 'center', 
                    bgcolor: 'success.50',
                    border: '1px solid #e8f5e8',
                    borderRadius: 2
                  }}>
                    <Typography variant="h5" color="success.main" fontWeight={600}>
                      {stats.resolved_issues}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                      Resolved Issues
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ 
                    p: 1.5, 
                    textAlign: 'center', 
                    bgcolor: 'grey.50',
                    border: '1px solid #f5f5f5',
                    borderRadius: 2
                  }}>
                    <Typography variant="h5" fontWeight={600}>
                      {stats.avg_resolution_time || 'N/A'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                      Avg Resolution Time
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Main Content */}
          <Box sx={{ 
            flexGrow: 1, 
            p: 2, 
            overflow: 'auto'
          }}>
            {viewMode === 'kanban' ? renderKanbanView() : renderListView()}
          </Box>
        </Paper>
      </Container>

      {/* Issue Detail Dialog */}
      <Dialog
        open={!!selectedIssue}
        onClose={handleCloseIssueDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '90vh', maxHeight: '90vh' }
        }}
      >
        {selectedIssue && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getCategoryIcon(selectedIssue.category)}
                  <Typography variant="h6">{selectedIssue.title}</Typography>
                  <Chip
                    label={selectedIssue.priority}
                    size="small"
                    color={PRIORITY_COLORS[selectedIssue.priority]}
                  />
                  <Chip
                    label={selectedIssue.status}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <IconButton onClick={handleCloseIssueDialog} size="small">
                  <Cancel />
                </IconButton>
              </Box>
            </DialogTitle>
            
            <DialogContent sx={{ p: 0 }}>
              <Grid container sx={{ height: '100%' }}>
                {/* Left Panel - Issue Details */}
                <Grid item xs={12} md={6} sx={{ p: 2, borderRight: '1px solid', borderColor: 'divider' }}>
                  <Stack spacing={2}>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {selectedIssue.description}
                    </Typography>
                    
                    <Divider />
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                          Status
                        </Typography>
                        <Typography variant="body2">{selectedIssue.status}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                          Category
                        </Typography>
                        <Typography variant="body2">{selectedIssue.category}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                          Priority
                        </Typography>
                        <Typography variant="body2">{selectedIssue.priority}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                          Report Type
                        </Typography>
                        <Typography variant="body2">{selectedIssue.report_type}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">
                          Reported
                        </Typography>
                        <Typography variant="body2">
                          {format(new Date(selectedIssue.reported_at), 'PPpp')}
                        </Typography>
                      </Grid>
                    </Grid>

                    {selectedIssue.page_url && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Page URL
                        </Typography>
                        <Typography variant="body2" sx={{ 
                          wordBreak: 'break-word',
                          fontSize: '0.875rem',
                          fontFamily: 'monospace',
                          bgcolor: 'grey.100',
                          p: 1,
                          borderRadius: 1
                        }}>
                          {selectedIssue.page_url}
                        </Typography>
                      </Box>
                    )}

                    {selectedIssue.error_message && (
                      <Alert severity="error">
                        <Typography variant="body2">{selectedIssue.error_message}</Typography>
                      </Alert>
                    )}

                    {selectedIssue.steps_to_reproduce && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Steps to Reproduce
                        </Typography>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {selectedIssue.steps_to_reproduce}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Grid>

                {/* Right Panel - Screenshots and Logs */}
                <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                  {loadingFiles && (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                      <Typography>Loading files...</Typography>
                    </Box>
                  )}

                  {/* Screenshot Section */}
                  {selectedIssue.screenshot_path && (
                    <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                        Screenshot
                      </Typography>
                      {screenshotData ? (
                        <Box sx={{ 
                          maxHeight: '300px', 
                          overflow: 'auto',
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1
                        }}>
                          <img 
                            src={screenshotData} 
                            alt="Issue Screenshot" 
                            style={{ 
                              width: '100%', 
                              height: 'auto',
                              display: 'block'
                            }} 
                          />
                        </Box>
                      ) : !loadingFiles ? (
                        <Typography variant="body2" color="text.secondary">
                          Failed to load screenshot
                        </Typography>
                      ) : null}
                    </Box>
                  )}

                  {/* Console Logs Section */}
                  {selectedIssue.console_logs_path && (
                    <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                        Console Logs
                      </Typography>
                      {consoleLogsData ? (
                        <Box sx={{ 
                          flexGrow: 1,
                          overflow: 'auto',
                          bgcolor: '#1e1e1e',
                          color: '#ffffff',
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          p: 1,
                          borderRadius: 1,
                          maxHeight: '300px'
                        }}>
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                            {consoleLogsData}
                          </pre>
                        </Box>
                      ) : !loadingFiles ? (
                        <Typography variant="body2" color="text.secondary">
                          Failed to load console logs
                        </Typography>
                      ) : null}
                    </Box>
                  )}

                  {/* No files message */}
                  {!selectedIssue.screenshot_path && !selectedIssue.console_logs_path && (
                    <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                      <Typography variant="body2">
                        No screenshots or logs available for this issue
                      </Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </DialogContent>
            
            <DialogActions sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Button onClick={handleCloseIssueDialog} variant="outlined">
                Close
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="error" />
            <Typography variant="h6">Delete Issue</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this issue? This action cannot be undone.
          </Typography>
          {issueToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {issueToDelete.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {issueToDelete.description.substring(0, 150)}...
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            color="inherit"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteIssueMutation.isPending}
          >
            {deleteIssueMutation.isPending ? 'Deleting...' : 'Delete Issue'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Move Menu */}
      <Menu
        anchorEl={moveMenuAnchor}
        open={Boolean(moveMenuAnchor)}
        onClose={() => {
          setMoveMenuAnchor(null);
          setIssueToMove(null);
        }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 'rgba(0, 0, 0, 0.1) 0px 4px 12px',
            border: '1px solid #e0e0e0'
          }
        }}
      >
        <Box sx={{ p: 1, minWidth: 200 }}>
          <Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 600, color: 'text.secondary' }}>
            Move to Status
          </Typography>
          {STATUS_COLUMNS.map((column) => {
            const isCurrentStatus = issueToMove?.status === column.id;
            return (
              <MenuItem
                key={column.id}
                onClick={() => handleMoveToStatus(column.id)}
                disabled={isCurrentStatus}
                sx={{
                  borderRadius: 1,
                  mx: 1,
                  my: 0.5,
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: column.color,
                      mr: 2
                    }}
                  />
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    {column.title}
                  </Typography>
                  {isCurrentStatus && (
                    <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                  )}
                </Box>
              </MenuItem>
            );
          })}
        </Box>
      </Menu>
    </>
  );
};

export default IssueManagementPage;
