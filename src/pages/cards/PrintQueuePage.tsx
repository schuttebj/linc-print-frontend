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
  LinearProgress
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
  Schedule as ScheduleIcon
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

  // Auto-refresh interval (30 seconds)
  const REFRESH_INTERVAL = 30000;

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

  // Handle job action (assign, start, complete, etc.)
  const handleJobAction = async (job: PrintJobResponse, action: string) => {
    setSelectedJob(null);
    
    // Load full job details
    try {
      const jobDetails = await printJobService.getPrintJob(job.id);
      setSelectedJob(jobDetails);
    } catch (error) {
      console.error('Error loading job details:', error);
    }

    setActionType(action);
    setActionReason('');
    setActionDialogOpen(true);
  };

  // Execute job action
  const executeJobAction = async () => {
    if (!selectedJob) return;

    setActionLoading(true);
    try {
      switch (actionType) {
        case 'assign':
          await printJobService.assignJobToPrinter(selectedJob.id, user?.id || '');
          break;
        case 'start':
          await printJobService.startPrintingJob(selectedJob.id);
          break;
        case 'complete':
          await printJobService.completePrintingJob(selectedJob.id, actionReason);
          break;
        case 'move_top':
          await printJobService.moveJobToTop(selectedJob.id, actionReason);
          break;
        case 'qa_start':
          await printJobService.startQualityCheck(selectedJob.id);
          break;
        case 'qa_pass':
          await printJobService.completeQualityCheck(selectedJob.id, 'PASSED', actionReason);
          break;
        case 'qa_fail':
          await printJobService.completeQualityCheck(selectedJob.id, 'FAILED_PRINTING', actionReason);
          break;
      }

      setActionDialogOpen(false);
      loadPrintQueue(); // Refresh queue
    } catch (error) {
      console.error('Error executing job action:', error);
      setError('Failed to execute action. Please try again.');
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

  // Get available actions for a job
  const getAvailableActions = (job: PrintJobResponse) => {
    const actions = [];

    switch (job.status) {
      case 'QUEUED':
        actions.push({ 
          action: 'assign', 
          label: 'Assign to Me', 
          icon: <AssignIcon />, 
          color: 'primary' as const 
        });
        actions.push({ 
          action: 'move_top', 
          label: 'Move to Top', 
          icon: <MoveUpIcon />, 
          color: 'warning' as const 
        });
        break;
      case 'ASSIGNED':
        if (job.assigned_to_user_id === user?.id) {
          actions.push({ 
            action: 'start', 
            label: 'Start Printing', 
            icon: <StartIcon />, 
            color: 'success' as const 
          });
        }
        break;
      case 'PRINTING':
        if (job.assigned_to_user_id === user?.id) {
          actions.push({ 
            action: 'complete', 
            label: 'Complete Printing', 
            icon: <CompleteIcon />, 
            color: 'success' as const 
          });
        }
        break;
      case 'PRINTED':
        actions.push({ 
          action: 'qa_start', 
          label: 'Start QA', 
          icon: <QualityIcon />, 
          color: 'info' as const 
        });
        break;
      case 'QUALITY_CHECK':
        actions.push({ 
          action: 'qa_pass', 
          label: 'QA Pass', 
          icon: <CompleteIcon />, 
          color: 'success' as const 
        });
        actions.push({ 
          action: 'qa_fail', 
          label: 'QA Fail', 
          icon: <WarningIcon />, 
          color: 'error' as const 
        });
        break;
    }

    return actions;
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

  // Check if user has printer permission or permissions
  const hasQueueAccess = () => {
    // Check for printing.read permission (minimum required)
    return hasPermission?.('printing.read') || user?.is_superuser;
  };

  // Check specific printing permissions
  const canAssignJobs = () => hasPermission?.('printing.assign') || user?.is_superuser;
  const canStartPrinting = () => hasPermission?.('printing.print') || user?.is_superuser;
  const canManageQueue = () => hasPermission?.('printing.queue_manage') || user?.is_superuser;
  const canPerformQA = () => hasPermission?.('printing.quality_check') || user?.is_superuser;

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

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
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
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadPrintQueue}
              disabled={loading}
            >
              Refresh Queue
            </Button>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Auto-refresh: 30s
            </Typography>
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

      {/* Queue Sections */}
      {queueData && (
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

      {/* Action Dialog */}
      <Dialog 
        open={actionDialogOpen} 
        onClose={() => setActionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Confirm Action
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to {actionType.replace('_', ' ')} this print job?
          </Typography>
          
          {(actionType === 'move_top' || actionType === 'complete' || actionType.includes('qa')) && (
            <TextField
              fullWidth
              multiline
              rows={3}
              label={
                actionType === 'move_top' ? 'Reason for moving to top' :
                actionType === 'complete' ? 'Production notes' :
                'Quality check notes'
              }
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              margin="normal"
              required={actionType === 'move_top' || actionType === 'qa_fail'}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={executeJobAction}
            variant="contained"
            disabled={actionLoading || ((actionType === 'move_top' || actionType === 'qa_fail') && !actionReason.trim())}
          >
            {actionLoading ? <CircularProgress size={20} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PrintQueuePage; 