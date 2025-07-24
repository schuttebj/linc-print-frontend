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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Divider
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

  // Auto-refresh interval (30 seconds)
  const REFRESH_INTERVAL = 30000;

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

  // Search for print jobs by ID or person details
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setShowSearchResults(false);
      return;
    }

    try {
      setLoading(true);
      
      // Search for jobs using the search API
      const response = await printJobService.searchPrintJobs({
        job_number: searchQuery,  // Search by job number
        // Add location filter for location users
        ...(isLocationUser() && user?.primary_location_id && {
          location_id: user.primary_location_id
        })
      });

      setSearchResults(response.jobs);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error searching print jobs:', error);
      setError('Failed to search print jobs');
    } finally {
      setLoading(false);
    }
  };

  // Clear search results
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
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
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <QueueIcon fontSize="large" />
        Print Queue Management
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Manage print jobs and card production workflow
      </Typography>

      {/* Queue Statistics */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={2.4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {stats.totalJobs}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Jobs
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={2.4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="info.main">
                  {stats.queuedJobs}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Queued
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={2.4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {stats.inProgressJobs}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  In Progress
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={2.4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {stats.completedToday}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completed Today
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={2.4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4">
                  {stats.avgProcessingTime}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg Time
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Enhanced Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Search Bar */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search Jobs"
              placeholder="Search by ID number, person name, or job number"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                endAdornment: (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton onClick={handleSearch} disabled={loading}>
                      <SearchIcon />
                    </IconButton>
                    {showSearchResults && (
                      <IconButton onClick={clearSearch}>
                        <ClearIcon />
                      </IconButton>
                    )}
                  </Box>
                )
              }}
            />
          </Grid>

          {/* Location Selector - Only for Admin Users */}
          {isAdmin() && (
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Print Location</InputLabel>
                <Select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  label="Print Location"
                >
                  {accessibleLocations.map((loc) => (
                    <MenuItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {/* Location Users Info */}
          {isLocationUser() && (
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                <Typography variant="body2" color="primary">
                  <strong>Location:</strong> {user?.primary_location || 'Your Location'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Showing jobs for your assigned location only
                </Typography>
              </Box>
            </Grid>
          )}

          {/* Controls */}
          <Grid item xs={12} md={isAdmin() ? 4 : 8}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadPrintQueue}
                disabled={loading}
              >
                Refresh
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                Auto-refresh: 30s
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Search Results Indicator */}
        {showSearchResults && (
          <Box sx={{ mt: 2, p: 1, bgcolor: 'info.50', borderRadius: 1 }}>
            <Typography variant="body2" color="info.main">
              <SearchIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
              Showing {searchResults.length} search results for "{searchQuery}"
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
        </Box>
      )}

      {/* Search Results */}
      {showSearchResults ? (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Search Results ({searchResults.length} jobs found)
            </Typography>
            {searchResults.length === 0 ? (
              <Alert severity="info">No jobs found matching your search criteria</Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Job Number</TableCell>
                      <TableCell>Person</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Submitted</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {searchResults.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <Button
                            variant="text"
                            onClick={() => viewJobDetails(job)}
                          >
                            {job.job_number}
                          </Button>
                        </TableCell>
                        <TableCell>{job.person_name || 'Unknown'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={job.status}
                            color={printJobService.getStatusColor(job.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{job.print_location_name || 'Unknown'}</TableCell>
                        <TableCell>
                          {printJobService.formatShortDate(job.submitted_at)}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
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
            )}
          </CardContent>
        </Card>
      ) : (
        /* Queue Sections - Regular View */
        queueData && (
          <>
            {/* Queued Jobs */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">
                  <Badge badgeContent={queueData.queued_jobs.length} color="info">
                    Queued Jobs
                  </Badge>
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {queueData.queued_jobs.length === 0 ? (
                  <Alert severity="info">No jobs in queue</Alert>
                ) : (
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Position</TableCell>
                          <TableCell>Job Number</TableCell>
                          <TableCell>Person</TableCell>
                          <TableCell>Card Number</TableCell>
                          <TableCell>Priority</TableCell>
                          <TableCell>Submitted</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {queueData.queued_jobs.map((job) => (
                          <TableRow key={job.id}>
                            <TableCell>{job.queue_position}</TableCell>
                            <TableCell>
                              <Button
                                variant="text"
                                onClick={() => viewJobDetails(job)}
                              >
                                {job.job_number}
                              </Button>
                            </TableCell>
                            <TableCell>{job.person_name || 'Unknown'}</TableCell>
                            <TableCell>{job.card_number}</TableCell>
                            <TableCell>
                              <Chip 
                                label={printJobService.getPriorityDisplayName(job.priority)}
                                color={printJobService.getPriorityColor(job.priority)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {printJobService.formatShortDate(job.submitted_at)}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 1 }}>
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
                )}
              </AccordionDetails>
            </Accordion>

            {/* In Progress Jobs */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">
                  <Badge badgeContent={queueData.in_progress_jobs.length} color="warning">
                    In Progress Jobs
                  </Badge>
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {queueData.in_progress_jobs.length === 0 ? (
                  <Alert severity="info">No jobs in progress</Alert>
                ) : (
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Job Number</TableCell>
                          <TableCell>Person</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Assigned To</TableCell>
                          <TableCell>Started</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {queueData.in_progress_jobs.map((job) => (
                          <TableRow key={job.id}>
                            <TableCell>
                              <Button
                                variant="text"
                                onClick={() => viewJobDetails(job)}
                              >
                                {job.job_number}
                              </Button>
                            </TableCell>
                            <TableCell>{job.person_name || 'Unknown'}</TableCell>
                            <TableCell>
                              <Chip 
                                label={printJobService.getStatusDisplayName(job.status)}
                                color={printJobService.getStatusColor(job.status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {job.assigned_to_user_name || 'Unassigned'}
                            </TableCell>
                            <TableCell>
                              {job.printing_started_at ? 
                                printJobService.formatShortDate(job.printing_started_at) : 
                                'Not started'
                              }
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 1 }}>
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
                )}
              </AccordionDetails>
            </Accordion>
          </>
        )
      )}

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
    </Box>
  );
};

export default PrintQueuePage; 