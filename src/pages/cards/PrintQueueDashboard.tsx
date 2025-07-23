import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Card,
  CardContent,
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
  Tabs,
  Tab,
  Checkbox,
  FormControlLabel,
  Fab,
  Collapse,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch
} from '@mui/material';
import {
  Print as PrintIcon,
  Queue as QueueIcon,
  PlayArrow as StartIcon,
  CheckCircle as CompleteIcon,
  Warning as WarningIcon,
  KeyboardArrowUp as MoveUpIcon,
  Assignment as AssignIcon,
  QualityAssurance as QualityIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Speed as SpeedIcon,
  Assessment as AssessmentIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  FilterList as FilterIcon,
  ViewList as ViewListIcon,
  GridView as GridViewIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  BatchPrediction as BatchIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import printJobService, { 
  PrintJobResponse, 
  PrintQueueResponse, 
  PrintJobDetailResponse,
  PrintJobStatistics
} from '../../services/printJobService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`queue-tabpanel-${index}`}
      aria-labelledby={`queue-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const PrintQueueDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [queueData, setQueueData] = useState<PrintQueueResponse | null>(null);
  const [statistics, setStatistics] = useState<PrintJobStatistics | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>(user?.primary_location?.id || '');
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [tabValue, setTabValue] = useState(0);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    priority: '',
    status: '',
    assignedTo: '',
    dateRange: 'today'
  });

  // Dialog states
  const [batchActionDialog, setBatchActionDialog] = useState(false);
  const [batchAction, setBatchAction] = useState('');
  const [batchReason, setBatchReason] = useState('');
  const [jobDetailDialog, setJobDetailDialog] = useState(false);
  const [selectedJobDetail, setSelectedJobDetail] = useState<PrintJobDetailResponse | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Auto-refresh settings
  const REFRESH_INTERVAL = 15000; // 15 seconds for dashboard
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    if (!selectedLocation) return;

    setLoading(true);
    setError(null);

    try {
      // Load queue and statistics in parallel
      const [queueResponse, statsResponse] = await Promise.all([
        printJobService.getPrintQueue(selectedLocation),
        printJobService.getPrintStatistics(selectedLocation, 7) // Last 7 days
      ]);

      setQueueData(queueResponse);
      setStatistics(statsResponse);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [selectedLocation]);

  // Handle job selection
  const handleJobSelection = (jobId: string, selected: boolean) => {
    const newSelection = new Set(selectedJobs);
    if (selected) {
      newSelection.add(jobId);
    } else {
      newSelection.delete(jobId);
    }
    setSelectedJobs(newSelection);
  };

  // Handle select all/none
  const handleSelectAll = (selectAll: boolean) => {
    if (selectAll && queueData) {
      const allJobIds = [
        ...queueData.queued_jobs.map(job => job.id),
        ...queueData.in_progress_jobs.map(job => job.id)
      ];
      setSelectedJobs(new Set(allJobIds));
    } else {
      setSelectedJobs(new Set());
    }
  };

  // Handle batch actions
  const handleBatchAction = async (action: string) => {
    if (selectedJobs.size === 0) return;

    setBatchAction(action);
    setBatchActionDialog(true);
  };

  // Execute batch action
  const executeBatchAction = async () => {
    try {
      setLoading(true);
      
      const promises = Array.from(selectedJobs).map(jobId => {
        switch (batchAction) {
          case 'assign':
            return printJobService.assignJobToPrinter(jobId, user?.id || '');
          case 'move_top':
            return printJobService.moveJobToTop(jobId, batchReason);
          default:
            return Promise.resolve();
        }
      });

      await Promise.all(promises);
      
      setBatchActionDialog(false);
      setBatchReason('');
      setSelectedJobs(new Set());
      loadDashboardData();
    } catch (error) {
      console.error('Error executing batch action:', error);
      setError('Failed to execute batch action');
    } finally {
      setLoading(false);
    }
  };

  // View job details
  const viewJobDetails = async (job: PrintJobResponse) => {
    try {
      const jobDetails = await printJobService.getPrintJob(job.id);
      setSelectedJobDetail(jobDetails);
      setJobDetailDialog(true);
    } catch (error) {
      console.error('Error loading job details:', error);
      setError('Failed to load job details');
    }
  };

  // Download card files
  const downloadCardFile = async (jobId: string, fileType: 'front' | 'back' | 'combined-pdf') => {
    try {
      const response = await fetch(`/api/v1/printing/jobs/${jobId}/files/${fileType}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `card_${fileType}_${jobId}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Failed to download file');
    }
  };

  // Get dashboard statistics
  const getDashboardStats = () => {
    if (!queueData || !statistics) return null;

    const totalActive = queueData.queued_jobs.length + queueData.in_progress_jobs.length;
    const completionRate = statistics.total_jobs > 0 ? 
      (statistics.completed_jobs / statistics.total_jobs * 100).toFixed(1) : '0';
    
    const avgProcessingTime = queueData.average_processing_time_minutes || 0;
    const estimatedCompletion = totalActive > 0 && avgProcessingTime > 0 ?
      new Date(Date.now() + totalActive * avgProcessingTime * 60000) : null;

    return {
      totalActive,
      completionRate,
      avgProcessingTime,
      estimatedCompletion,
      qaPassRate: statistics.qa_pass_rate.toFixed(1)
    };
  };

  // Setup auto-refresh
  useEffect(() => {
    if (selectedLocation && autoRefresh) {
      loadDashboardData();
      
      const interval = setInterval(loadDashboardData, REFRESH_INTERVAL);
      setRefreshInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [selectedLocation, autoRefresh, loadDashboardData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [refreshInterval]);

  const dashboardStats = getDashboardStats();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <QueueIcon fontSize="large" />
            Print Queue Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Real-time card production monitoring and management
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                color="primary"
              />
            }
            label="Auto-refresh"
          />
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadDashboardData}
            disabled={loading}
          >
            Refresh
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Settings
          </Button>
        </Box>
      </Box>

      {/* Enhanced Statistics Dashboard */}
      {dashboardStats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <QueueIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h4" color="primary">
                  {dashboardStats.totalActive}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Jobs
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h4" color="success.main">
                  {dashboardStats.completionRate}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completion Rate
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <SpeedIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h4" color="info.main">
                  {Math.round(dashboardStats.avgProcessingTime)}m
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg Time
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <QualityIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                <Typography variant="h4" color="warning.main">
                  {dashboardStats.qaPassRate}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  QA Pass Rate
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <ScheduleIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
                <Typography variant="body1" color="secondary.main" sx={{ fontSize: '1.2rem' }}>
                  {dashboardStats.estimatedCompletion ? 
                    dashboardStats.estimatedCompletion.toLocaleTimeString('en-GB', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    }) : 'N/A'
                  }
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Est. Complete
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <NotificationsIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                <Typography variant="h4" color="error.main">
                  {statistics?.failed_jobs || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Failed Jobs
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Print Location</InputLabel>
              <Select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                label="Print Location"
              >
                {user?.primary_location && (
                  <MenuItem value={user.primary_location.id}>
                    {user.primary_location.name}
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>View</InputLabel>
              <Select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as 'table' | 'cards')}
                label="View"
              >
                <MenuItem value="table">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ViewListIcon /> Table
                  </Box>
                </MenuItem>
                <MenuItem value="cards">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GridViewIcon /> Cards
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              {selectedJobs.size > 0 && (
                <>
                  <Button
                    variant="contained"
                    startIcon={<AssignIcon />}
                    onClick={() => handleBatchAction('assign')}
                    size="small"
                  >
                    Assign Selected ({selectedJobs.size})
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<MoveUpIcon />}
                    onClick={() => handleBatchAction('move_top')}
                    size="small"
                  >
                    Move to Top
                  </Button>
                </>
              )}
              
              <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center', ml: 2 }}>
                Last updated: {lastRefresh.toLocaleTimeString()}
              </Typography>
            </Box>
          </Grid>
        </Grid>
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

      {/* Queue Tabs */}
      {queueData && (
        <Paper sx={{ mb: 3 }}>
          <Tabs 
            value={tabValue} 
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab 
              icon={<Badge badgeContent={queueData.queued_jobs.length} color="info"><QueueIcon /></Badge>}
              label="Queue" 
            />
            <Tab 
              icon={<Badge badgeContent={queueData.in_progress_jobs.length} color="warning"><PrintIcon /></Badge>}
              label="In Progress" 
            />
            <Tab 
              icon={<Badge badgeContent={statistics?.completed_jobs || 0} color="success"><CompleteIcon /></Badge>}
              label="Statistics" 
            />
          </Tabs>

          {/* Queue Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    indeterminate={selectedJobs.size > 0 && selectedJobs.size < queueData.queued_jobs.length}
                    checked={selectedJobs.size === queueData.queued_jobs.length && queueData.queued_jobs.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                }
                label={`Select All (${queueData.queued_jobs.length} jobs)`}
              />
            </Box>

            {queueData.queued_jobs.length === 0 ? (
              <Alert severity="info">No jobs in queue</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox"></TableCell>
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
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedJobs.has(job.id)}
                            onChange={(e) => handleJobSelection(job.id, e.target.checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={job.queue_position} 
                            color="primary" 
                            size="small"
                          />
                        </TableCell>
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
                            <Tooltip title="Assign to me">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleBatchAction('assign')}
                              >
                                <AssignIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Download PDF">
                              <IconButton
                                size="small"
                                color="secondary"
                                onClick={() => downloadCardFile(job.id, 'combined-pdf')}
                              >
                                <DownloadIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={() => viewJobDetails(job)}
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* In Progress Tab */}
          <TabPanel value={tabValue} index={1}>
            {queueData.in_progress_jobs.length === 0 ? (
              <Alert severity="info">No jobs in progress</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Job Number</TableCell>
                      <TableCell>Person</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Assigned To</TableCell>
                      <TableCell>Started</TableCell>
                      <TableCell>Progress</TableCell>
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={
                                job.status === 'ASSIGNED' ? 25 :
                                job.status === 'PRINTING' ? 50 :
                                job.status === 'PRINTED' ? 75 :
                                job.status === 'QUALITY_CHECK' ? 90 :
                                job.status === 'COMPLETED' ? 100 : 0
                              }
                              sx={{ width: '100px' }}
                            />
                            <Typography variant="caption">
                              {job.status === 'ASSIGNED' ? '25%' :
                               job.status === 'PRINTING' ? '50%' :
                               job.status === 'PRINTED' ? '75%' :
                               job.status === 'QUALITY_CHECK' ? '90%' :
                               job.status === 'COMPLETED' ? '100%' : '0%'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Download PDF">
                              <IconButton
                                size="small"
                                color="secondary"
                                onClick={() => downloadCardFile(job.id, 'combined-pdf')}
                              >
                                <DownloadIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={() => viewJobDetails(job)}
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Statistics Tab */}
          <TabPanel value={tabValue} index={2}>
            {statistics && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Production Summary (Last 7 Days)
                      </Typography>
                      <List>
                        <ListItem>
                          <ListItemIcon><AssessmentIcon /></ListItemIcon>
                          <ListItemText 
                            primary="Total Jobs Processed" 
                            secondary={statistics.total_jobs}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CompleteIcon color="success" /></ListItemIcon>
                          <ListItemText 
                            primary="Successfully Completed" 
                            secondary={`${statistics.completed_jobs} (${statistics.total_jobs > 0 ? (statistics.completed_jobs / statistics.total_jobs * 100).toFixed(1) : 0}%)`}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><WarningIcon color="error" /></ListItemIcon>
                          <ListItemText 
                            primary="Failed Jobs" 
                            secondary={statistics.failed_jobs}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><QualityIcon color="warning" /></ListItemIcon>
                          <ListItemText 
                            primary="QA Pass Rate" 
                            secondary={`${statistics.qa_pass_rate.toFixed(1)}%`}
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Today's Performance
                      </Typography>
                      <List>
                        <ListItem>
                          <ListItemIcon><TimelineIcon /></ListItemIcon>
                          <ListItemText 
                            primary="Jobs Submitted Today" 
                            secondary={statistics.jobs_submitted_today}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                          <ListItemText 
                            primary="Jobs Completed Today" 
                            secondary={statistics.jobs_completed_today}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><SpeedIcon /></ListItemIcon>
                          <ListItemText 
                            primary="Average Processing Time" 
                            secondary={statistics.average_completion_time_hours ? 
                              `${statistics.average_completion_time_hours.toFixed(1)} hours` : 'N/A'}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><BatchIcon /></ListItemIcon>
                          <ListItemText 
                            primary="Reprint Jobs" 
                            secondary={statistics.reprint_jobs}
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </TabPanel>
        </Paper>
      )}

      {/* Batch Action Dialog */}
      <Dialog 
        open={batchActionDialog} 
        onClose={() => setBatchActionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Batch Action: {batchAction.replace('_', ' ').toUpperCase()}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            You are about to {batchAction.replace('_', ' ')} {selectedJobs.size} selected jobs.
          </Typography>
          
          {(batchAction === 'move_top') && (
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Reason for priority change"
              value={batchReason}
              onChange={(e) => setBatchReason(e.target.value)}
              margin="normal"
              required
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBatchActionDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={executeBatchAction}
            variant="contained"
            disabled={loading || (batchAction === 'move_top' && !batchReason.trim())}
          >
            {loading ? <CircularProgress size={20} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Job Detail Dialog */}
      <Dialog 
        open={jobDetailDialog} 
        onClose={() => setJobDetailDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Print Job Details - {selectedJobDetail?.job_number}
        </DialogTitle>
        <DialogContent>
          {selectedJobDetail && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Job Information
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Status" secondary={
                      <Chip 
                        label={printJobService.getStatusDisplayName(selectedJobDetail.status)}
                        color={printJobService.getStatusColor(selectedJobDetail.status)}
                        size="small"
                      />
                    } />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Priority" secondary={
                      <Chip 
                        label={printJobService.getPriorityDisplayName(selectedJobDetail.priority)}
                        color={printJobService.getPriorityColor(selectedJobDetail.priority)}
                        size="small"
                      />
                    } />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Card Number" 
                      secondary={selectedJobDetail.card_number} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Submitted" 
                      secondary={printJobService.formatDate(selectedJobDetail.submitted_at)} 
                    />
                  </ListItem>
                </List>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Person Information
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Name" 
                      secondary={selectedJobDetail.person_name || 'Unknown'} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Location" 
                      secondary={selectedJobDetail.print_location_name || 'Unknown'} 
                    />
                  </ListItem>
                  {selectedJobDetail.assigned_to_user_name && (
                    <ListItem>
                      <ListItemText 
                        primary="Assigned To" 
                        secondary={selectedJobDetail.assigned_to_user_name} 
                      />
                    </ListItem>
                  )}
                </List>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Licenses on Card
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {selectedJobDetail.licenses?.map((license) => (
                    <Chip 
                      key={license.license_id}
                      label={`${license.category} (${license.status})`}
                      color={license.status === 'ACTIVE' ? 'success' : 'default'}
                      size="small"
                    />
                  ))}
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Card Files
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => downloadCardFile(selectedJobDetail.id, 'front')}
                  >
                    Front Image
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => downloadCardFile(selectedJobDetail.id, 'back')}
                  >
                    Back Image
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={() => downloadCardFile(selectedJobDetail.id, 'combined-pdf')}
                  >
                    Combined PDF
                  </Button>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJobDetailDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Auto-refresh indicator */}
      {autoRefresh && (
        <Fab
          color="primary"
          size="small"
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 20,
            zIndex: 1000,
            opacity: 0.7
          }}
        >
          <RefreshIcon />
        </Fab>
      )}
    </Box>
  );
};

export default PrintQueueDashboard; 