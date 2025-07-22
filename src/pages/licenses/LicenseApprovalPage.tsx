/**
 * License Approval Page for Madagascar License System
 * For examiners to approve applications after test completion
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  FormControl,
  InputLabel,
  Alert,
  Chip,
  Divider,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  FormControlLabel,
  FormGroup,
  Select,
  MenuItem
} from '@mui/material';
import {
  Search as SearchIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  Gavel as GavelIcon,
  Visibility as VisibilityIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthToken, API_ENDPOINTS } from '../../config/api';

interface PersonApprovalSummary {
  person: {
    id: string;
    name: string;
    id_number: string;
  };
  applications: ApplicationForApproval[];
  restrictions_info: Record<string, RestrictionInfo>;
}

interface ApplicationForApproval {
  id: string;
  application_number: string;
  application_type: string;
  license_category: string;
  status: string;
  medical_information: any;
}

interface RestrictionInfo {
  driver_restrictions: RestrictionOption[];
  vehicle_restrictions: RestrictionOption[];
  pre_selected_driver_restrictions: string[];
}

interface RestrictionOption {
  code: string;
  description: string;
  pre_selected?: boolean;
  locked?: boolean;
}

interface ApprovalOutcome {
  outcome: 'PASSED' | 'FAILED' | 'ABSENT';
  restrictions: {
    driver_restrictions: string[];
    vehicle_restrictions: string[];
  };
  location_id: string;
}

const LicenseApprovalPage: React.FC = () => {
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [searchIdNumber, setSearchIdNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [personSummary, setPersonSummary] = useState<PersonApprovalSummary | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationForApproval | null>(null);
  const [selectedDriverRestrictions, setSelectedDriverRestrictions] = useState<string[]>([]);
  const [selectedVehicleRestrictions, setSelectedVehicleRestrictions] = useState<string[]>([]);
  const [lockedDriverRestrictions, setLockedDriverRestrictions] = useState<string[]>([]);
  const [approvalOutcome, setApprovalOutcome] = useState<'PASSED' | 'FAILED' | 'ABSENT' | ''>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showMedicalInfo, setShowMedicalInfo] = useState(false);

  // Location selection for admin users
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [availableLocations, setAvailableLocations] = useState<any[]>([]);

  const steps = ['Search Person', 'Select Application', 'Review & Approve'];

  // Load available locations for admin users
  useEffect(() => {
    const loadLocations = async () => {
      if (user && !user.primary_location_id) {
        try {
          const token = getAuthToken();
          if (!token) return;

          const response = await fetch(API_ENDPOINTS.locations, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if (response.ok) {
            const data = await response.json();
            setAvailableLocations(data.locations || []);
          }
        } catch (error) {
          console.error('Error loading locations:', error);
        }
      }
    };
    loadLocations();
  }, [user]);

  // Get location ID to use
  const getLocationId = (): string => {
    return user?.primary_location_id || selectedLocationId;
  };

  // Check if location is required and valid
  const isLocationValid = (): boolean => {
    return !!user?.primary_location_id || !!selectedLocationId;
  };

  const handleSearchPerson = async () => {
    if (!searchIdNumber.trim()) {
      setError('Please enter an ID number');
      return;
    }

    setIsSearching(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${API_ENDPOINTS.applications}/search-for-approval/${searchIdNumber.trim()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to search for person');
      }

      const summary = await response.json();
      setPersonSummary(summary);
      
      if (summary.applications.length === 0) {
        setError('No applications pending approval found for this person');
      } else {
        setActiveStep(1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search for person');
      setPersonSummary(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectApplication = (application: ApplicationForApproval) => {
    setSelectedApplication(application);
    
    // Get restriction info for this application
    if (personSummary) {
      const restrictionInfo = personSummary.restrictions_info[application.id];
      const preSelectedDriver = restrictionInfo?.pre_selected_driver_restrictions || [];
      
      // Set pre-selected and locked restrictions based on medical information
      setSelectedDriverRestrictions(preSelectedDriver);
      setLockedDriverRestrictions(preSelectedDriver);
      setSelectedVehicleRestrictions([]);
    }
    
    setApprovalOutcome('');
    setActiveStep(2);
  };

  const handleDriverRestrictionToggle = (restrictionCode: string) => {
    // Don't allow toggling locked restrictions
    if (lockedDriverRestrictions.includes(restrictionCode)) {
      return;
    }
    
    setSelectedDriverRestrictions(prev => 
      prev.includes(restrictionCode)
        ? prev.filter(code => code !== restrictionCode)
        : [...prev, restrictionCode]
    );
  };

  const handleVehicleRestrictionToggle = (restrictionCode: string) => {
    setSelectedVehicleRestrictions(prev => 
      prev.includes(restrictionCode)
        ? prev.filter(code => code !== restrictionCode)
        : [...prev, restrictionCode]
    );
  };

  const handleProcessApproval = async () => {
    if (!selectedApplication || !approvalOutcome) {
      setError('Please select an outcome');
      return;
    }

    if (!isLocationValid()) {
      setError('Please select a location before proceeding');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const token = getAuthToken();
      if (!token) throw new Error('No authentication token');

      const approvalData: ApprovalOutcome = {
        outcome: approvalOutcome,
        restrictions: approvalOutcome === 'PASSED' ? {
          driver_restrictions: selectedDriverRestrictions,
          vehicle_restrictions: selectedVehicleRestrictions
        } : {
          driver_restrictions: [],
          vehicle_restrictions: []
        },
        location_id: getLocationId()
      };

      const response = await fetch(`${API_ENDPOINTS.applications}/process-approval/${selectedApplication.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(approvalData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process approval');
      }

      const result = await response.json();
      setSuccess(result.message);
      
      // Reset form for next approval
      setTimeout(() => {
        handleStartNewApproval();
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Failed to process approval');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartNewApproval = () => {
    setActiveStep(0);
    setSearchIdNumber('');
    setPersonSummary(null);
    setSelectedApplication(null);
    setSelectedDriverRestrictions([]);
    setSelectedVehicleRestrictions([]);
    setLockedDriverRestrictions([]);
    setApprovalOutcome('');
    setError(null);
    setSuccess(null);
    setShowMedicalInfo(false);
    // Reset location selection for admin users
    if (!user?.primary_location_id) {
      setSelectedLocationId('');
    }
  };

  const renderSearchStep = () => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <PersonIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Search Person by ID Number</Typography>
        </Box>
        
        <Box display="flex" gap={2} alignItems="center">
          <TextField
            label="ID Number"
            value={searchIdNumber}
            onChange={(e) => setSearchIdNumber(e.target.value)}
            placeholder="Enter Madagascar ID or passport number"
            disabled={isSearching}
            onKeyPress={(e) => e.key === 'Enter' && handleSearchPerson()}
            sx={{ flexGrow: 1 }}
          />
          <Button
            variant="contained"
            onClick={handleSearchPerson}
            disabled={isSearching || !searchIdNumber.trim()}
            startIcon={isSearching ? <CircularProgress size={20} /> : <SearchIcon />}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const renderApplicationSelection = () => {
    if (!personSummary) return null;

    return (
      <Box>
        {/* Person Information */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <PersonIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Person Information</Typography>
            </Box>
            <Typography variant="body1">
              <strong>Name:</strong> {personSummary.person.name}
            </Typography>
            <Typography variant="body1">
              <strong>ID Number:</strong> {personSummary.person.id_number}
            </Typography>
          </CardContent>
        </Card>

        {/* Applications Pending Approval */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Applications Pending Approval</Typography>

            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Application #</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {personSummary.applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>{app.application_number}</TableCell>
                      <TableCell>{app.application_type.replace('_', ' ')}</TableCell>
                      <TableCell>{app.license_category}</TableCell>
                      <TableCell>
                        <Chip label={app.status} size="small" color="warning" />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleSelectApplication(app)}
                          startIcon={<AssignmentIcon />}
                        >
                          Select for Approval
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <Box mt={2} display="flex" justifyContent="space-between">
          <Button onClick={() => setActiveStep(0)}>
            Back to Search
          </Button>
        </Box>
      </Box>
    );
  };

  const renderApprovalStep = () => {
    if (!selectedApplication || !personSummary) return null;

    const restrictionInfo = personSummary.restrictions_info[selectedApplication.id];

    return (
      <Box>
        {/* Application Summary */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Application Details</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Application Number</Typography>
                <Typography variant="body1" fontWeight="bold">{selectedApplication.application_number}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Type</Typography>
                <Typography variant="body1" fontWeight="bold">{selectedApplication.application_type.replace('_', ' ')}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">License Category</Typography>
                <Typography variant="body1" fontWeight="bold">{selectedApplication.license_category}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Status</Typography>
                <Chip label={selectedApplication.status} size="small" color="warning" />
              </Grid>
            </Grid>

            <Box mt={2}>
              <Button
                variant="outlined"
                onClick={() => setShowMedicalInfo(true)}
                startIcon={<VisibilityIcon />}
              >
                View Medical Information
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Location Selection for Admin Users */}
        {user && !user.primary_location_id && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Processing Location</Typography>
              <FormControl fullWidth required>
                <InputLabel>Location</InputLabel>
                <Select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  label="Location"
                >
                  {availableLocations.map((location) => (
                    <MenuItem key={location.id} value={location.id}>
                      {location.name} ({location.full_code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        )}

        {/* Approval Outcome */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Approval Outcome</Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Button
                  fullWidth
                  variant={approvalOutcome === 'PASSED' ? 'contained' : 'outlined'}
                  color="success"
                  onClick={() => setApprovalOutcome('PASSED')}
                  startIcon={<CheckIcon />}
                  size="large"
                >
                  PASS
                </Button>
              </Grid>
              <Grid item xs={4}>
                <Button
                  fullWidth
                  variant={approvalOutcome === 'FAILED' ? 'contained' : 'outlined'}
                  color="error"
                  onClick={() => setApprovalOutcome('FAILED')}
                  startIcon={<CancelIcon />}
                  size="large"
                >
                  FAIL
                </Button>
              </Grid>
              <Grid item xs={4}>
                <Button
                  fullWidth
                  variant={approvalOutcome === 'ABSENT' ? 'contained' : 'outlined'}
                  color="warning"
                  onClick={() => setApprovalOutcome('ABSENT')}
                  startIcon={<WarningIcon />}
                  size="large"
                >
                  ABSENT
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Restrictions (only shown for PASS) */}
        {approvalOutcome === 'PASSED' && restrictionInfo && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>License Restrictions</Typography>
              
              {/* Driver Restrictions */}
              {restrictionInfo.driver_restrictions.length > 0 && (
                <Box mb={3}>
                  <Typography variant="subtitle1" gutterBottom color="primary" fontWeight="bold">
                    Driver Restrictions
                  </Typography>
                  <FormGroup>
                    {restrictionInfo.driver_restrictions.map((restriction) => (
                      <FormControlLabel
                        key={restriction.code}
                        control={
                          <Checkbox
                            checked={selectedDriverRestrictions.includes(restriction.code)}
                            onChange={() => handleDriverRestrictionToggle(restriction.code)}
                            disabled={restriction.locked}
                          />
                        }
                        label={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography>{restriction.description}</Typography>
                            {restriction.locked && (
                              <Chip 
                                label="Required by vision test" 
                                size="small" 
                                color="warning" 
                                variant="outlined"
                              />
                            )}
                          </Box>
                        }
                      />
                    ))}
                  </FormGroup>
                </Box>
              )}

              {/* Vehicle Restrictions */}
              {restrictionInfo.vehicle_restrictions.length > 0 && (
                <Box mb={2}>
                  <Typography variant="subtitle1" gutterBottom color="primary" fontWeight="bold">
                    Vehicle Restrictions
                  </Typography>
                  <FormGroup>
                    {restrictionInfo.vehicle_restrictions.map((restriction) => (
                      <FormControlLabel
                        key={restriction.code}
                        control={
                          <Checkbox
                            checked={selectedVehicleRestrictions.includes(restriction.code)}
                            onChange={() => handleVehicleRestrictionToggle(restriction.code)}
                          />
                        }
                        label={restriction.description}
                      />
                    ))}
                  </FormGroup>
                </Box>
              )}

              {/* Selected Restrictions Summary */}
              {(selectedDriverRestrictions.length > 0 || selectedVehicleRestrictions.length > 0) && (
                <Box mt={2}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Selected Restrictions:
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {selectedDriverRestrictions.map((code) => (
                      <Chip 
                        key={`driver-${code}`} 
                        label={`Driver: ${code}`} 
                        size="small" 
                        color="primary" 
                        variant={lockedDriverRestrictions.includes(code) ? "filled" : "outlined"}
                      />
                    ))}
                    {selectedVehicleRestrictions.map((code) => (
                      <Chip 
                        key={`vehicle-${code}`} 
                        label={`Vehicle: ${code}`} 
                        size="small" 
                        color="secondary" 
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        <Box display="flex" justifyContent="space-between">
          <Button onClick={() => setActiveStep(1)}>
            Back to Applications
          </Button>
          <Button
            variant="contained"
            color={approvalOutcome === 'PASSED' ? 'success' : approvalOutcome === 'FAILED' ? 'error' : 'warning'}
            onClick={handleProcessApproval}
            disabled={isProcessing || !approvalOutcome || !isLocationValid()}
            startIcon={isProcessing ? <CircularProgress size={20} /> : <GavelIcon />}
            size="large"
          >
            {isProcessing ? 'Processing...' : `Confirm ${approvalOutcome}`}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {success}
          </Alert>
        )}
      </Box>
    );
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        License Application Approval
      </Typography>

      <Box mb={4}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {activeStep === 0 && renderSearchStep()}
      {activeStep === 1 && renderApplicationSelection()}
      {activeStep === 2 && renderApprovalStep()}

      {/* Medical Information Dialog */}
      <Dialog
        open={showMedicalInfo}
        onClose={() => setShowMedicalInfo(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Medical Information</DialogTitle>
        <DialogContent>
          {selectedApplication?.medical_information ? (
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '12px' }}>
              {JSON.stringify(selectedApplication.medical_information, null, 2)}
            </pre>
          ) : (
            <Typography>No medical information available</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMedicalInfo(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LicenseApprovalPage; 