import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  IconButton,
  Tooltip,
  Badge,
  Tabs,
  Tab,
  LinearProgress,
  Divider,
  Container,
  Skeleton,
  TablePagination
} from '@mui/material';
import {
  Print as PrintIcon,
  Queue as QueueIcon,
  PlayArrow as StartIcon,
  CheckCircle as CompleteIcon,
  Warning as WarningIcon,
  KeyboardArrowUp as MoveUpIcon,
  Assignment as AssignIcon,
  AssignmentTurnedIn as QualityIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Clear as ClearIcon,
  CheckCircle as CheckCircle
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import printJobService, { 
  PrintJobResponse, 
  PrintQueueResponse, 
  PrintJobDetailResponse,
  QualityCheckRequest
} from '../../services/printJobService';
import FilterBar, { FilterConfig, FilterValues } from '../../components/common/FilterBar';

const PrintQueuePage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [queueData, setQueueData] = useState<PrintQueueResponse | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [accessibleLocations, setAccessibleLocations] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<PrintJobDetailResponse | null>(null);
  const [jobDetailDialogOpen, setJobDetailDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<string>('');
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Enhanced features state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PrintJobResponse[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // Print preview state
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [previewJob, setPreviewJob] = useState<PrintJobDetailResponse | null>(null);
  const [cardImages, setCardImages] = useState<{front?: string, back?: string}>({});
  
  // Admin location selection
  const [adminSelectedLocation, setAdminSelectedLocation] = useState<string>('');
  const [availableLocations, setAvailableLocations] = useState<any[]>([]);

  // FilterBar state management
  const [searchValue, setSearchValue] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalJobs, setTotalJobs] = useState(0);

  // Auto-refresh interval (30 seconds)
  const REFRESH_INTERVAL = 30000;

  // Filter configurations for FilterBar
  const PRINT_QUEUE_FILTER_CONFIGS: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'QUEUED', label: 'Queued' },
        { value: 'ASSIGNED', label: 'Assigned' },
        { value: 'PRINTING', label: 'Printing' },
        { value: 'PRINTED', label: 'Printed' },
        { value: 'COMPLETED', label: 'Completed' }
      ]
    },
    {
      key: 'priority',
      label: 'Priority',
      type: 'select',
      options: [
        { value: 'LOW', label: 'Low' },
        { value: 'NORMAL', label: 'Normal' },
        { value: 'HIGH', label: 'High' },
        { value: 'URGENT', label: 'Urgent' }
      ]
    },
    {
      key: 'job_number',
      label: 'Job Number',
      type: 'text',
      placeholder: 'Enter job number'
    },
    {
      key: 'person_name',
      label: 'Person Name',
      type: 'text',
      placeholder: 'Enter person name'
    }
  ];

  // Role-based UI controls
  const isLocationUser = () => user?.user_type === 'LOCATION_USER' || user?.primary_location_id;
  const isAdmin = () => ['NATIONAL_ADMIN', 'PROVINCIAL_ADMIN', 'SYSTEM_USER'].includes(user?.user_type || '');

  // Load accessible locations based on user role
  const loadAccessibleLocations = async () => {
    try {
      setLoading(true);
      
      // For location roles (printer, supervisor, clerk), they can only see their assigned location
      if (user?.primary_location_id && 
          (user?.user_type === 'LOCATION_USER' || !user?.user_type)) {
        // Location users see only their assigned location
        setAccessibleLocations([{
          id: user.primary_location_id,
          name: user.primary_location || `Location ${user.primary_location_id}`,
          current_queue_size: 0
        }]);
        setSelectedLocation(user.primary_location_id);
      } else {
        // For admins (national, provincial, system), load all accessible queues
        const queues = await printJobService.getAccessiblePrintQueues();
        setAccessibleLocations(queues);
        
        // Auto-select first location if available
        if (queues.length > 0) {
          setSelectedLocation(queues[0].location_id);
        }
      }
    } catch (error) {
      console.error('Error loading accessible locations:', error);
      setError('Failed to load accessible locations');
    } finally {
      setLoading(false);
    }
  };

  // Load print queue
  const loadPrintQueue = async () => {
    if (!selectedLocation) return;

    setLoading(true);
    setError(null);

    try {
      const queueResponse = await printJobService.getPrintQueue(selectedLocation);
      setQueueData(queueResponse);
      
      // Update total jobs count for pagination
      const total = (queueResponse.queued_jobs?.length || 0) + (queueResponse.in_progress_jobs?.length || 0);
      setTotalJobs(total);
    } catch (error) {
      console.error('Error loading print queue:', error);
      setError('Failed to load print queue');
    } finally {
      setLoading(false);
    }
  };

  // Get available actions for a job based on new simplified workflow
  const getAvailableActions = (job: PrintJobResponse) => {
    const actions = [];

    // Always show view/details action
    actions.push({
      action: 'view',
      label: 'View Details',
      icon: <InfoIcon />,
      color: 'info' as const
    });

    switch (job.status) {
      case 'QUEUED':
        // Only show start printing if user has print permission
        if (canStartPrinting()) {
          actions.push({ 
            action: 'start_print', 
            label: 'Start Printing', 
            icon: <StartIcon />, 
            color: 'success' as const 
          });
        }
        
        // Show preview for anyone with read access
        actions.push({
          action: 'preview',
          label: 'Preview Card',
          icon: <VisibilityIcon />,
          color: 'primary' as const
        });
        break;
        
      case 'ASSIGNED':
      case 'PRINTING':
        // Show complete button if user is assigned to this job
        if (job.assigned_to_user_id === user?.id && canStartPrinting()) {
          actions.push({ 
            action: 'complete', 
            label: 'Mark Complete', 
            icon: <CompleteIcon />, 
            color: 'success' as const 
          });
        }
        
        // Show preview
        actions.push({
          action: 'preview',
          label: 'Preview Card',
          icon: <VisibilityIcon />,
          color: 'primary' as const
        });
        break;
        
      case 'PRINTED':
        // Ready for QA - show in info color
        actions.push({
          action: 'view',
          label: 'Ready for QA',
          icon: <QualityIcon />,
          color: 'warning' as const
        });
        break;
        
      case 'COMPLETED':
        // Show completed status
        actions.push({
          action: 'view',
          label: 'Completed',
          icon: <CheckCircle />,
          color: 'success' as const
        });
        break;
    }

    return actions;
  };

  // Handle job actions - simplified workflow
  const handleJobAction = async (job: PrintJobResponse, action: string) => {
    switch (action) {
      case 'start_print':
        await handleStartPrinting(job);
        break;
        
      case 'preview':
        await handlePreviewCard(job);
        break;
        
      case 'complete':
        await handleCompletePrinting(job);
        break;
        
      case 'view':
      default:
        await viewJobDetails(job);
        break;
    }
  };

  // Preview card without starting printing
  const handlePreviewCard = async (job: PrintJobResponse) => {
    try {
      const jobDetails = await printJobService.getPrintJob(job.id);
      setPreviewJob(jobDetails);
      await loadCardImages(job.id);
      setPrintPreviewOpen(true);
    } catch (error) {
      console.error('Error loading card preview:', error);
      setError('Failed to load card preview');
    }
  };

  // Complete printing job
  const handleCompletePrinting = async (job: PrintJobResponse) => {
    try {
      setActionLoading(true);
      await printJobService.completePrintingJob(job.id, 'Printing completed');
      loadPrintQueue(); // Refresh queue
    } catch (error) {
      console.error('Error completing print job:', error);
      setError('Failed to complete print job');
    } finally {
      setActionLoading(false);
    }
  };

  // View job details
  const viewJobDetails = async (job: PrintJobResponse) => {
    try {
      const jobDetails = await printJobService.getPrintJob(job.id);
      setSelectedJob(jobDetails);
      setJobDetailDialogOpen(true);
    } catch (error) {
      console.error('Error loading job details:', error);
      setError('Failed to load job details');
    }
  };

  // Get queue statistics
  const getQueueStats = () => {
    if (!queueData) return null;

    const totalJobs = queueData.queued_jobs.length + queueData.in_progress_jobs.length;
    const avgTime = queueData.average_processing_time_minutes;

    return {
      totalJobs,
      queuedJobs: queueData.queued_jobs.length,
      inProgressJobs: queueData.in_progress_jobs.length,
      completedToday: queueData.completed_today,
      avgProcessingTime: avgTime ? `${Math.round(avgTime)} min` : 'N/A'
    };
  };

  // Permission-based access checks
  const hasQueueAccess = () => hasPermission('printing.read') || user?.is_superuser;
  const canAssignJobs = () => hasPermission('printing.assign') || user?.is_superuser;
  const canStartPrinting = () => hasPermission('printing.print') || user?.is_superuser;
  const canManageQueue = () => hasPermission('printing.queue_manage') || user?.is_superuser;
  const canPerformQA = () => hasPermission('printing.quality_check') || user?.is_superuser;

  // FilterBar state management
  const handleFilterChange = (key: string, value: any) => {
    setFilterValues(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // FilterBar search handler
  const handleSearch = async () => {
    if (!searchValue.trim() && Object.keys(filterValues).length === 0) {
      setHasSearched(false);
      return;
    }

    try {
      setSearching(true);
      setHasSearched(true);
      
      // Prepare search parameters
      const searchParams: any = {};
      
      if (searchValue.trim()) {
        searchParams.search = searchValue;
      }
      
      // Add filter values
      Object.entries(filterValues).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams[key] = value;
        }
      });
      
      // Add location filter for location users
      if (isLocationUser() && user?.primary_location_id) {
        searchParams.location_id = user.primary_location_id;
      } else if (selectedLocation) {
        searchParams.location_id = selectedLocation;
      }

      const response = await printJobService.searchPrintJobs(searchParams);
      setSearchResults(response.jobs || []);
    } catch (error) {
      console.error('Error searching print jobs:', error);
      setError('Failed to search print jobs');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // FilterBar clear handler
  const handleClear = () => {
    setSearchValue('');
    setFilterValues({});
    setSearchResults([]);
    setHasSearched(false);
    setSearching(false);
  };

  // Legacy search functions for compatibility
  const clearSearch = () => {
    handleClear();
  };

  // Pagination handlers
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value === 'All' ? -1 : parseInt(event.target.value, 10);
    setRowsPerPage(value);
    setPage(0);
  };

  // Get paginated jobs for current tab
  const getPaginatedJobs = (jobs: any[]) => {
    if (rowsPerPage === -1) return jobs; // Show all
    const startIndex = page * rowsPerPage;
    return jobs.slice(startIndex, startIndex + rowsPerPage);
  };

  // Load card images for preview
  const loadCardImages = async (jobId: string) => {
    try {
      // Get the API base URL (same pattern as printJobService)
      const getApiBaseUrl = (): string => {
        const env = (import.meta as any).env;
        
        if (env?.VITE_API_BASE_URL) {
          return env.VITE_API_BASE_URL;
        }
        
        if (env?.DEV || env?.MODE === 'development') {
          return 'http://localhost:8000';
        }
        
        return 'https://linc-print-backend.onrender.com';
      };
      
      const baseURL = getApiBaseUrl();
      const token = localStorage.getItem('access_token');
      
      // Load front and back card images
      const [frontResponse, backResponse] = await Promise.all([
        fetch(`${baseURL}/api/v1/printing/jobs/${jobId}/files/front`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${baseURL}/api/v1/printing/jobs/${jobId}/files/back`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const images: {front?: string, back?: string} = {};
      
      if (frontResponse.ok) {
        const frontBlob = await frontResponse.blob();
        images.front = URL.createObjectURL(frontBlob);
      }
      
      if (backResponse.ok) {
        const backBlob = await backResponse.blob();
        images.back = URL.createObjectURL(backBlob);
      }

      setCardImages(images);
    } catch (error) {
      console.error('Error loading card images:', error);
      setError('Failed to load card images');
    }
  };

  // Start printing with preview
  const handleStartPrinting = async (job: PrintJobResponse) => {
    try {
      // Load full job details
      const jobDetails = await printJobService.getPrintJob(job.id);
      setPreviewJob(jobDetails);
      
      // Load card images
      await loadCardImages(job.id);
      
      // Show preview dialog
      setPrintPreviewOpen(true);
    } catch (error) {
      console.error('Error starting print preview:', error);
      setError('Failed to load print preview');
    }
  };

  // Confirm printing start (auto-assigns to current user)
  const confirmStartPrinting = async () => {
    if (!previewJob) return;

    try {
      setActionLoading(true);
      
      // Auto-assign job to current user and start printing
      await printJobService.assignJobToPrinter(previewJob.id, user?.id || '');
      await printJobService.startPrintingJob(previewJob.id);
      
      setPrintPreviewOpen(false);
      setPreviewJob(null);
      
      // Cleanup image URLs
      Object.values(cardImages).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
      setCardImages({});
      
      // Refresh queue
      loadPrintQueue();
      
    } catch (error) {
      console.error('Error starting printing:', error);
      setError('Failed to start printing');
    } finally {
      setActionLoading(false);
    }
  };

  // Load locations on mount
  useEffect(() => {
    loadAccessibleLocations();
  }, [user]);

  // Setup auto-refresh when location is selected
  useEffect(() => {
    if (selectedLocation) {
      loadPrintQueue();
      
      // Set up auto-refresh
      const interval = setInterval(loadPrintQueue, REFRESH_INTERVAL);
      setRefreshInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [selectedLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [refreshInterval]);

  // Render functions for modernized UI
  const renderSearchSkeleton = () => (
    <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Skeleton variant="text" width={200} height={24} />
      </Box>
      <TableContainer sx={{ flex: 1 }}>
        <Table stickyHeader sx={{ '& .MuiTableCell-root': { borderRadius: 0 } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa', py: 1, px: 2 }}>Job Number</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa', py: 1, px: 2 }}>Person</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa', py: 1, px: 2 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa', py: 1, px: 2 }}>Priority</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa', py: 1, px: 2 }}>Location</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa', py: 1, px: 2 }}>Submitted</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa', py: 1, px: 2 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell sx={{ py: 1, px: 2 }}>
                  <Skeleton variant="text" width="80%" height={20} />
                </TableCell>
                <TableCell sx={{ py: 1, px: 2 }}>
                  <Skeleton variant="text" width="100%" height={20} />
                </TableCell>
                <TableCell sx={{ py: 1, px: 2 }}>
                  <Skeleton variant="rounded" width={80} height={24} />
                </TableCell>
                <TableCell sx={{ py: 1, px: 2 }}>
                  <Skeleton variant="rounded" width={60} height={24} />
                </TableCell>
                <TableCell sx={{ py: 1, px: 2 }}>
                  <Skeleton variant="text" width="90%" height={20} />
                </TableCell>
                <TableCell sx={{ py: 1, px: 2 }}>
                  <Skeleton variant="text" width="70%" height={20} />
                </TableCell>
                <TableCell align="center" sx={{ py: 1, px: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <Skeleton variant="circular" width={32} height={32} />
                    <Skeleton variant="circular" width={32} height={32} />
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderSearchResultsTable = () => (
    <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <TableContainer sx={{ flex: 1 }}>
        <Table stickyHeader sx={{ '& .MuiTableCell-root': { borderRadius: 0 } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa', py: 1, px: 2 }}>Job Number</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa', py: 1, px: 2 }}>Person</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa', py: 1, px: 2 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa', py: 1, px: 2 }}>Priority</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa', py: 1, px: 2 }}>Location</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa', py: 1, px: 2 }}>Submitted</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa', py: 1, px: 2 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {searchResults.map((job) => (
              <TableRow key={job.id} hover>
                <TableCell sx={{ py: 1, px: 2 }}>
                  <Button
                    variant="text"
                    onClick={() => viewJobDetails(job)}
                    sx={{ fontSize: '0.8rem' }}
                  >
                    {job.job_number}
                  </Button>
                </TableCell>
                <TableCell sx={{ py: 1, px: 2 }}>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    {job.person_name || 'Unknown'}
                  </Typography>
                </TableCell>
                <TableCell sx={{ py: 1, px: 2 }}>
                  <Chip 
                    label={job.status}
                    color={printJobService.getStatusColor(job.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell sx={{ py: 1, px: 2 }}>
                  <Chip 
                    label={printJobService.getPriorityDisplayName(job.priority)}
                    color={printJobService.getPriorityColor(job.priority)}
                    size="small"
                  />
                </TableCell>
                <TableCell sx={{ py: 1, px: 2 }}>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    {job.print_location_name || 'Unknown'}
                  </Typography>
                </TableCell>
                <TableCell sx={{ py: 1, px: 2 }}>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    {printJobService.formatShortDate(job.submitted_at)}
                  </Typography>
                </TableCell>
                <TableCell align="center" sx={{ py: 1, px: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    {getAvailableActions(job).map((action) => (
                      <Tooltip key={action.action} title={action.label}>
                        <IconButton
                          size="small"
                          color={action.color}
                          onClick={() => handleJobAction(job, action.action)}
                        >
                          {action.icon}
                        </IconButton>
                      </Tooltip>
                    ))}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderCompactStats = () => {
    const stats = getQueueStats();
    if (!stats) return null;

    return (
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#f8f9fa' }}>
        <Grid container spacing={2}>
          <Grid item xs={6} md={2.4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary" sx={{ fontSize: '1.1rem' }}>
                {stats.totalJobs}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                Total Jobs
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={2.4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="info.main" sx={{ fontSize: '1.1rem' }}>
                {stats.queuedJobs}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                Queued
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={2.4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="warning.main" sx={{ fontSize: '1.1rem' }}>
                {stats.inProgressJobs}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                In Progress
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={2.4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="success.main" sx={{ fontSize: '1.1rem' }}>
                {stats.completedToday}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                Completed Today
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={2.4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
                {stats.avgProcessingTime}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                Avg Time
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderQueueTable = (jobs: PrintJobResponse[], isQueuedJobs: boolean = false) => (
    <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <TableContainer sx={{ flex: 1 }}>
        <Table stickyHeader sx={{ '& .MuiTableCell-root': { borderRadius: 0 } }}>
          <TableHead>
            <TableRow>
              {isQueuedJobs && (
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa', py: 1, px: 2 }}>Position</TableCell>
              )}
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa', py: 1, px: 2 }}>Job Number</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa', py: 1, px: 2 }}>Person</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa', py: 1, px: 2 }}>Card Number</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa', py: 1, px: 2 }}>
                {isQueuedJobs ? 'Priority' : 'Status'}
              </TableCell>
              {!isQueuedJobs && (
                <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa', py: 1, px: 2 }}>Assigned To</TableCell>
              )}
              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa', py: 1, px: 2 }}>
                {isQueuedJobs ? 'Submitted' : 'Started'}
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa', py: 1, px: 2 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isQueuedJobs ? 7 : 7} align="center" sx={{ py: 4, px: 2 }}>
                  <Alert severity="info">
                    {isQueuedJobs ? 'No jobs in queue' : 'No jobs in progress'}
                  </Alert>
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
                <TableRow key={job.id} hover>
                  {isQueuedJobs && (
                    <TableCell sx={{ py: 1, px: 2 }}>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                        {job.queue_position}
                      </Typography>
                    </TableCell>
                  )}
                  <TableCell sx={{ py: 1, px: 2 }}>
                    <Button
                      variant="text"
                      onClick={() => viewJobDetails(job)}
                      sx={{ fontSize: '0.8rem' }}
                    >
                      {job.job_number}
                    </Button>
                  </TableCell>
                  <TableCell sx={{ py: 1, px: 2 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                      {job.person_name || 'Unknown'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1, px: 2 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                      {job.card_number}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1, px: 2 }}>
                    {isQueuedJobs ? (
                      <Chip 
                        label={printJobService.getPriorityDisplayName(job.priority)}
                        color={printJobService.getPriorityColor(job.priority)}
                        size="small"
                      />
                    ) : (
                      <Chip 
                        label={printJobService.getStatusDisplayName(job.status)}
                        color={printJobService.getStatusColor(job.status)}
                        size="small"
                      />
                    )}
                  </TableCell>
                  {!isQueuedJobs && (
                    <TableCell sx={{ py: 1, px: 2 }}>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        {job.assigned_to_user_name || 'Unassigned'}
                      </Typography>
                    </TableCell>
                  )}
                  <TableCell sx={{ py: 1, px: 2 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                      {isQueuedJobs 
                        ? printJobService.formatShortDate(job.submitted_at)
                        : (job.printing_started_at ? printJobService.formatShortDate(job.printing_started_at) : 'Not started')
                      }
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ py: 1, px: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      {getAvailableActions(job).map((action) => (
                        <Tooltip key={action.action} title={action.label}>
                          <IconButton
                            size="small"
                            color={action.color}
                            onClick={() => handleJobAction(job, action.action)}
                          >
                            {action.icon}
                          </IconButton>
                        </Tooltip>
                      ))}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderTabContent = () => {
    if (loading) {
      return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Compact Stats Skeleton */}
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#f8f9fa' }}>
            <Grid container spacing={2}>
              {[...Array(5)].map((_, index) => (
                <Grid item xs={6} md={2.4} key={index}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Skeleton variant="text" width="60%" height={24} sx={{ mx: 'auto' }} />
                    <Skeleton variant="text" width="80%" height={16} sx={{ mx: 'auto' }} />
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
          {/* Table Skeleton */}
          {renderSearchSkeleton()}
        </Box>
      );
    }

    if (!queueData) {
      return (
        <Box sx={{ p: 2 }}>
          <Alert severity="info">
            {selectedLocation ? 'No queue data available' : 'Please select a location to view print queue.'}
          </Alert>
        </Box>
      );
    }

    return (
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Compact Stats */}
        {renderCompactStats()}
        
        {/* Tab Content */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeTab === 0 && renderQueueTable(getPaginatedJobs(queueData.queued_jobs), true)}
          {activeTab === 1 && renderQueueTable(getPaginatedJobs(queueData.in_progress_jobs), false)}
        </Box>
        
        {/* Pagination with Refresh Controls */}
        <Box sx={{ 
          borderTop: '1px solid', 
          borderColor: 'divider', 
          bgcolor: 'white',
          flexShrink: 0,
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          pl: 2,
          pr: 0
        }}>
          {/* Left side - Refresh button and timestamp */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              onClick={loadPrintQueue}
              disabled={loading}
              size="small"
              sx={{
                '&:disabled': {
                  opacity: 0.5
                }
              }}
            >
              <RefreshIcon />
            </IconButton>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              Auto-refresh: 30s | Last updated: {new Date().toLocaleTimeString()}
            </Typography>
          </Box>
          
          {/* Right side - Pagination */}
          <TablePagination
            component="div"
            count={activeTab === 0 ? queueData.queued_jobs?.length || 0 : queueData.in_progress_jobs?.length || 0}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, { value: -1, label: 'All' }]}
            disabled={loading}
            sx={{
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
        </Box>
      </Box>
    );
  };

  const stats = getQueueStats();

  // Check if user has access to print queues
  if (!hasQueueAccess()) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          <Typography variant="h6" gutterBottom>
            Access Restricted
          </Typography>
          <Typography>
            Print queue access is restricted to users with Printer, Supervisor, or Admin roles.
            Please contact your system administrator if you believe you should have access.
          </Typography>
        </Alert>
      </Box>
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


        {/* Filter Section */}
        <Box sx={{ 
          bgcolor: 'white', 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          flexShrink: 0,
          p: 2
        }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
              Search Print Jobs
            </Typography>
            {/* Location Selector for Admin Users */}
            {isAdmin() && (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Print Location</InputLabel>
                <Select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  label="Print Location"
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': { borderWidth: '1px' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderWidth: '1px' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: '1px' },
                  }}
                >
                  {accessibleLocations.map((loc) => (
                    <MenuItem key={loc.id || loc.location_id} value={loc.id || loc.location_id}>
                      {loc.name} {loc.code && `(${loc.code})`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            
            {/* Location Users Info */}
            {isLocationUser() && (
              <Box sx={{ p: 1.5, bgcolor: 'primary.50', borderRadius: 1 }}>
                <Typography variant="body2" color="primary" sx={{ fontSize: '0.8rem' }}>
                  <strong>Location:</strong> {user?.primary_location || 'Your Location'}
                </Typography>
              </Box>
            )}
          </Box>
          
          <FilterBar
            searchValue={searchValue}
            searchPlaceholder="Search by job number, person name, or card number"
            onSearchChange={setSearchValue}
            filterConfigs={PRINT_QUEUE_FILTER_CONFIGS}
            filterValues={filterValues}
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
            onClear={handleClear}
            searching={searching}
          />
        </Box>

        {/* Tab Navigation */}
        <Box sx={{ 
          bgcolor: 'white', 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          flexShrink: 0 
        }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => {
              setActiveTab(newValue);
              setPage(0); // Reset pagination when switching tabs
            }}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.9rem'
              }
            }}
          >
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <QueueIcon fontSize="small" />
                  <span>Queued Jobs</span>
                  {queueData && (
                    <Badge badgeContent={queueData.queued_jobs.length} color="info" />
                  )}
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PrintIcon fontSize="small" />
                  <span>In Progress</span>
                  {queueData && (
                    <Badge badgeContent={queueData.in_progress_jobs.length} color="warning" />
                  )}
                </Box>
              } 
            />
          </Tabs>
        </Box>

        {/* Content Area */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'auto',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Search Results */}
          {(hasSearched || searching) ? (
            <Paper 
              elevation={0}
              sx={{ 
                bgcolor: 'white',
                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                borderRadius: 2,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              {searching ? (
                renderSearchSkeleton()
              ) : (
                <>
                  {searchResults.length === 0 ? (
                    <Box sx={{ p: 2 }}>
                      <Alert severity="info">
                        No print jobs found matching your search criteria. Try adjusting your search terms.
                      </Alert>
                    </Box>
                  ) : (
                    <>
                      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                          Search Results ({searchResults.length} jobs found)
                        </Typography>
                      </Box>
                      {renderSearchResultsTable()}
                    </>
                  )}
                </>
              )}
            </Paper>
          ) : (
            /* Queue Content */
            <Paper 
              elevation={0}
              sx={{ 
                bgcolor: 'white',
                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                borderRadius: 2,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              {renderTabContent()}
            </Paper>
          )}
        </Box>

        {/* Job Detail Dialog */}
      <Dialog 
        open={jobDetailDialogOpen} 
        onClose={() => setJobDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Print Job Details - {selectedJob?.job_number}
        </DialogTitle>
        <DialogContent>
          {selectedJob && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Person Information
                </Typography>
                <Typography variant="body1">
                  {selectedJob.person_name || 'Unknown'}
                </Typography>
                <Typography variant="body2">
                  ID: {selectedJob.person_id}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Card Information
                </Typography>
                <Typography variant="body1">
                  {selectedJob.card_number}
                </Typography>
                <Typography variant="body2">
                  Template: {selectedJob.card_template}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Licenses on Card
                </Typography>
                {selectedJob.licenses?.map((license) => (
                  <Chip 
                    key={license.license_id}
                    label={license.category}
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                  />
                ))}
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Timeline
                </Typography>
                <Typography variant="body2">
                  Submitted: {printJobService.formatDate(selectedJob.submitted_at)}
                </Typography>
                {selectedJob.assigned_at && (
                  <Typography variant="body2">
                    Assigned: {printJobService.formatDate(selectedJob.assigned_at)}
                  </Typography>
                )}
                {selectedJob.printing_started_at && (
                  <Typography variant="body2">
                    Started: {printJobService.formatDate(selectedJob.printing_started_at)}
                  </Typography>
                )}
                {selectedJob.completed_at && (
                  <Typography variant="body2">
                    Completed: {printJobService.formatDate(selectedJob.completed_at)}
                  </Typography>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJobDetailDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Print Preview Dialog */}
      <Dialog
        open={printPreviewOpen}
        onClose={() => setPrintPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Print Card Preview
          {previewJob && (
            <Typography variant="subtitle2" color="text.secondary">
              Job: {previewJob.job_number} | Person: {previewJob.person_name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {cardImages.front || cardImages.back ? (
            <Grid container spacing={2}>
              {cardImages.front && (
                <Grid item xs={12} md={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>Card Front</Typography>
                    <img 
                      src={cardImages.front} 
                      alt="Card Front" 
                      style={{ 
                        maxWidth: '100%', 
                        height: 'auto', 
                        border: '1px solid #ccc',
                        borderRadius: '8px'
                      }} 
                    />
                  </Box>
                </Grid>
              )}
              {cardImages.back && (
                <Grid item xs={12} md={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>Card Back</Typography>
                    <img 
                      src={cardImages.back} 
                      alt="Card Back" 
                      style={{ 
                        maxWidth: '100%', 
                        height: 'auto', 
                        border: '1px solid #ccc',
                        borderRadius: '8px'
                      }} 
                    />
                  </Box>
                </Grid>
              )}
            </Grid>
          ) : (
            <Alert severity="info">
              Card images are being loaded...
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintPreviewOpen(false)}>
            Close Preview
          </Button>
          {previewJob?.status === 'QUEUED' && canStartPrinting() && (
            <Button
              onClick={confirmStartPrinting}
              variant="contained"
              color="success"
              disabled={actionLoading}
              startIcon={actionLoading ? <CircularProgress size={20} /> : <StartIcon />}
            >
              {actionLoading ? 'Starting...' : 'Start Printing'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      </Paper>
    </Container>
  );
};

export default PrintQueuePage; 