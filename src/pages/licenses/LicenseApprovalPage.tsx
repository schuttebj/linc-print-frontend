/**
 * License Approval Page for Madagascar License System
 * For examiners to approve applications after test completion
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Button,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge,
  Stepper,
  Step,
  StepLabel,
  Container
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  Refresh as RefreshIcon,
  Print as PrintIcon,
  CheckBox as CheckBoxIcon,
  Gavel as ExaminerIcon,
  LocalHospital as MedicalIcon,
  DirectionsCar as DrivingIcon,
  Error as ErrorIcon,
  Done as DoneIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

import { useAuth } from '../../contexts/AuthContext';
import { applicationService } from '../../services/applicationService';
import { Application, ApplicationStatus } from '../../types';

interface AuthorizationData {
  // Test attendance
  is_absent: boolean;
  is_failed: boolean;
  absent_failed_reason?: string;
  
  // Test results
  eye_test_result: 'PASS' | 'FAIL' | '';
  eye_test_notes?: string;
  driving_test_result: 'PASS' | 'FAIL' | '';
  driving_test_score?: number;
  driving_test_notes?: string;
  
  // Vehicle restrictions
  vehicle_restriction_none: boolean;
  vehicle_restriction_automatic: boolean;
  vehicle_restriction_electric: boolean;
  vehicle_restriction_disabled: boolean;
  
  // Driver restrictions
  driver_restriction_none: boolean;
  driver_restriction_glasses: boolean;
  driver_restriction_artificial_limb: boolean;
  driver_restriction_glasses_and_limb: boolean;
  
  // Applied restrictions
  applied_restrictions: string[];
  
  // Authorization decision
  authorization_notes?: string;
}

interface ApplicationWithPersonInfo extends Application {
  person_name?: string;
  person_surname?: string;
  person_id_number?: string;
}

const LicenseApprovalPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State management
  const [pendingApplications, setPendingApplications] = useState<ApplicationWithPersonInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithPersonInfo | null>(null);
  const [authorizationDialogOpen, setAuthorizationDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Authorization form state
  const [authorizationData, setAuthorizationData] = useState<AuthorizationData>({
    is_absent: false,
    is_failed: false,
    absent_failed_reason: '',
    eye_test_result: '',
    eye_test_notes: '',
    driving_test_result: '',
    driving_test_score: undefined,
    driving_test_notes: '',
    vehicle_restriction_none: true,
    vehicle_restriction_automatic: false,
    vehicle_restriction_electric: false,
    vehicle_restriction_disabled: false,
    driver_restriction_none: true,
    driver_restriction_glasses: false,
    driver_restriction_artificial_limb: false,
    driver_restriction_glasses_and_limb: false,
    applied_restrictions: [],
    authorization_notes: ''
  });

  // Load pending applications
  const loadPendingApplications = async () => {
    setLoading(true);
    setError(null);

    try {
      const applications = await applicationService.getPendingAuthorizationApplications();
      setPendingApplications(applications);
    } catch (err: any) {
      setError(err.message || 'Failed to load pending applications');
      console.error('Error loading pending applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingApplications();
  }, []);

  // Handle authorization dialog
  const handleOpenAuthorizationDialog = (application: ApplicationWithPersonInfo) => {
    setSelectedApplication(application);
    setAuthorizationData({
      is_absent: false,
      is_failed: false,
      absent_failed_reason: '',
      eye_test_result: '',
      eye_test_notes: '',
      driving_test_result: '',
      driving_test_score: undefined,
      driving_test_notes: '',
      vehicle_restriction_none: true,
      vehicle_restriction_automatic: false,
      vehicle_restriction_electric: false,
      vehicle_restriction_disabled: false,
      driver_restriction_none: true,
      driver_restriction_glasses: false,
      driver_restriction_artificial_limb: false,
      driver_restriction_glasses_and_limb: false,
      applied_restrictions: [],
      authorization_notes: ''
    });
    setAuthorizationDialogOpen(true);
  };

  const handleCloseAuthorizationDialog = () => {
    setAuthorizationDialogOpen(false);
    setSelectedApplication(null);
  };

  // Handle form changes
  const handleAuthorizationChange = (field: keyof AuthorizationData, value: any) => {
    setAuthorizationData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-calculate applied restrictions based on selected restrictions
    if (field.includes('restriction')) {
      const restrictions: string[] = [];
      const updatedData = { ...authorizationData, [field]: value };
      
      if (updatedData.driver_restriction_glasses) restrictions.push('01');
      if (updatedData.driver_restriction_artificial_limb) restrictions.push('02');
      if (updatedData.driver_restriction_glasses_and_limb) restrictions.push('01', '02');
      if (updatedData.vehicle_restriction_automatic) restrictions.push('03');
      if (updatedData.vehicle_restriction_electric) restrictions.push('04');
      if (updatedData.vehicle_restriction_disabled) restrictions.push('05');
      
      setAuthorizationData(prev => ({
        ...prev,
        applied_restrictions: [...new Set(restrictions)] // Remove duplicates
      }));
    }
  };

  // Handle authorization submission
  const handleSubmitAuthorization = async () => {
    if (!selectedApplication) return;

    setSubmitting(true);
    try {
      await applicationService.createApplicationAuthorization(
        selectedApplication.id,
        authorizationData
      );

      // Refresh the pending applications list
      await loadPendingApplications();
      
      handleCloseAuthorizationDialog();
      
      // Show success message
      setError(null);
      
    } catch (err: any) {
      setError(err.message || 'Failed to submit authorization');
      console.error('Error submitting authorization:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Format functions
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  const getStatusChip = (status: ApplicationStatus) => {
    return (
      <Chip
        label={status.replace('_', ' ')}
        color="warning"
        size="small"
        variant="filled"
      />
    );
  };

  const getTestResultChip = (result: string) => {
    if (result === 'PASS') {
      return <Chip label="PASS" color="success" size="small" icon={<DoneIcon />} />;
    } else if (result === 'FAIL') {
      return <Chip label="FAIL" color="error" size="small" icon={<ErrorIcon />} />;
    }
    return <Chip label="PENDING" color="default" size="small" />;
  };

  const canSubmitAuthorization = () => {
    return (
      authorizationData.eye_test_result !== '' &&
      authorizationData.driving_test_result !== '' &&
      !authorizationData.is_absent
    );
  };

  const willBeApproved = () => {
    return (
      !authorizationData.is_absent &&
      !authorizationData.is_failed &&
      authorizationData.eye_test_result === 'PASS' &&
      authorizationData.driving_test_result === 'PASS'
    );
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                License Approval
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Review and approve applications after test completion
              </Typography>
            </Box>
            <Box>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadPendingApplications}
                disabled={loading}
              >
                Refresh
              </Button>
            </Box>
          </Stack>
        </Box>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <AssignmentIcon color="primary" />
                  <Box>
                    <Typography variant="h6">{pendingApplications.length}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending Approval
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <PersonIcon color="secondary" />
                  <Box>
                    <Typography variant="h6">{user?.username}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Logged in as Examiner
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <ExaminerIcon color="success" />
                  <Box>
                    <Typography variant="h6">Authorization</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ready for Review
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Applications Table */}
        <Card>
          <CardHeader
            title="Applications Pending Authorization"
            subheader={`${pendingApplications.length} applications requiring examiner approval`}
          />
          <CardContent>
            {pendingApplications.length === 0 ? (
              <Box textAlign="center" py={4}>
                <Typography variant="h6" color="text.secondary">
                  No applications pending authorization
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Applications will appear here after tests are completed
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Application #</TableCell>
                      <TableCell>Applicant</TableCell>
                      <TableCell>License Category</TableCell>
                      <TableCell>Application Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Submitted Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingApplications.map((application) => (
                      <TableRow key={application.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {application.application_number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack>
                            <Typography variant="body2">
                              {application.person_name || 'Unknown'} {application.person_surname || ''}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {application.person_id_number || 'N/A'}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={application.license_category}
                            color="primary"
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {application.application_type.replace('_', ' ')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {getStatusChip(application.status)}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(application.created_at)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="View Application">
                              <IconButton
                                size="small"
                                onClick={() => navigate(`/applications/${application.id}`)}
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Authorize Application">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleOpenAuthorizationDialog(application)}
                              >
                                <ExaminerIcon />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Authorization Dialog */}
        <Dialog
          open={authorizationDialogOpen}
          onClose={handleCloseAuthorizationDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Stack direction="row" alignItems="center" spacing={2}>
              <ExaminerIcon color="primary" />
              <Box>
                <Typography variant="h6">
                  Authorize Application
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedApplication?.application_number} - {selectedApplication?.license_category}
                </Typography>
              </Box>
            </Stack>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3}>
              {/* Test Attendance */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Test Attendance
                </Typography>
                <FormGroup row>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={authorizationData.is_absent}
                        onChange={(e) => handleAuthorizationChange('is_absent', e.target.checked)}
                      />
                    }
                    label="Applicant was absent"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={authorizationData.is_failed}
                        onChange={(e) => handleAuthorizationChange('is_failed', e.target.checked)}
                      />
                    }
                    label="Applicant failed overall"
                  />
                </FormGroup>
                {(authorizationData.is_absent || authorizationData.is_failed) && (
                  <TextField
                    fullWidth
                    label="Reason for absence/failure"
                    value={authorizationData.absent_failed_reason}
                    onChange={(e) => handleAuthorizationChange('absent_failed_reason', e.target.value)}
                    multiline
                    rows={2}
                    sx={{ mt: 2 }}
                  />
                )}
              </Grid>

              {/* Test Results */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Test Results
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Eye Test Result</InputLabel>
                      <Select
                        value={authorizationData.eye_test_result}
                        onChange={(e) => handleAuthorizationChange('eye_test_result', e.target.value)}
                        label="Eye Test Result"
                      >
                        <MenuItem value="PASS">PASS</MenuItem>
                        <MenuItem value="FAIL">FAIL</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Driving Test Result</InputLabel>
                      <Select
                        value={authorizationData.driving_test_result}
                        onChange={(e) => handleAuthorizationChange('driving_test_result', e.target.value)}
                        label="Driving Test Result"
                      >
                        <MenuItem value="PASS">PASS</MenuItem>
                        <MenuItem value="FAIL">FAIL</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Grid>

              {/* Restrictions */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  License Restrictions
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Driver Restrictions
                    </Typography>
                    <FormGroup>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={authorizationData.driver_restriction_none}
                            onChange={(e) => {
                              handleAuthorizationChange('driver_restriction_none', e.target.checked);
                              if (e.target.checked) {
                                handleAuthorizationChange('driver_restriction_glasses', false);
                                handleAuthorizationChange('driver_restriction_artificial_limb', false);
                                handleAuthorizationChange('driver_restriction_glasses_and_limb', false);
                              }
                            }}
                          />
                        }
                        label="No restrictions"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={authorizationData.driver_restriction_glasses}
                            onChange={(e) => {
                              handleAuthorizationChange('driver_restriction_glasses', e.target.checked);
                              if (e.target.checked) {
                                handleAuthorizationChange('driver_restriction_none', false);
                              }
                            }}
                          />
                        }
                        label="Glasses/contact lenses required"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={authorizationData.driver_restriction_artificial_limb}
                            onChange={(e) => {
                              handleAuthorizationChange('driver_restriction_artificial_limb', e.target.checked);
                              if (e.target.checked) {
                                handleAuthorizationChange('driver_restriction_none', false);
                              }
                            }}
                          />
                        }
                        label="Has artificial limb"
                      />
                    </FormGroup>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Vehicle Restrictions
                    </Typography>
                    <FormGroup>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={authorizationData.vehicle_restriction_none}
                            onChange={(e) => {
                              handleAuthorizationChange('vehicle_restriction_none', e.target.checked);
                              if (e.target.checked) {
                                handleAuthorizationChange('vehicle_restriction_automatic', false);
                                handleAuthorizationChange('vehicle_restriction_electric', false);
                                handleAuthorizationChange('vehicle_restriction_disabled', false);
                              }
                            }}
                          />
                        }
                        label="No restrictions"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={authorizationData.vehicle_restriction_automatic}
                            onChange={(e) => {
                              handleAuthorizationChange('vehicle_restriction_automatic', e.target.checked);
                              if (e.target.checked) {
                                handleAuthorizationChange('vehicle_restriction_none', false);
                              }
                            }}
                          />
                        }
                        label="Automatic transmission only"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={authorizationData.vehicle_restriction_disabled}
                            onChange={(e) => {
                              handleAuthorizationChange('vehicle_restriction_disabled', e.target.checked);
                              if (e.target.checked) {
                                handleAuthorizationChange('vehicle_restriction_none', false);
                              }
                            }}
                          />
                        }
                        label="Adapted for physically disabled"
                      />
                    </FormGroup>
                  </Grid>
                </Grid>
              </Grid>

              {/* Applied Restrictions Summary */}
              {authorizationData.applied_restrictions.length > 0 && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="subtitle2">Applied Restrictions:</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      {authorizationData.applied_restrictions.map((code) => (
                        <Chip key={code} label={`Code ${code}`} size="small" />
                      ))}
                    </Stack>
                  </Alert>
                </Grid>
              )}

              {/* Authorization Notes */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Authorization Notes"
                  value={authorizationData.authorization_notes}
                  onChange={(e) => handleAuthorizationChange('authorization_notes', e.target.value)}
                  multiline
                  rows={3}
                  placeholder="Additional notes for this authorization decision..."
                />
              </Grid>

              {/* Decision Preview */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: willBeApproved() ? 'success.light' : 'error.light' }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    {willBeApproved() ? <ApproveIcon color="success" /> : <RejectIcon color="error" />}
                    <Box>
                      <Typography variant="h6">
                        {willBeApproved() ? 'Application will be APPROVED' : 'Application will be REJECTED'}
                      </Typography>
                      <Typography variant="body2">
                        {willBeApproved() 
                          ? 'License will be generated automatically upon approval'
                          : 'Application will be moved back to test status for retesting'
                        }
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAuthorizationDialog}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmitAuthorization}
              disabled={!canSubmitAuthorization() || submitting}
              startIcon={submitting ? <CircularProgress size={20} /> : <ExaminerIcon />}
            >
              {submitting ? 'Submitting...' : 'Submit Authorization'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default LicenseApprovalPage; 