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
  Skeleton,
  Tabs,
  Tab,
  Container,
  FormControlLabel,
  FormGroup,
  Select,
  MenuItem,
  FormHelperText,
  Collapse
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
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
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
  const [showRawMedicalData, setShowRawMedicalData] = useState(false);

  // Location selection for admin users
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [availableLocations, setAvailableLocations] = useState<any[]>([]);

  const steps = [
    {
      label: 'Search & Select',
      icon: <PersonIcon />
    },
    {
      label: 'Review & Approve',
      icon: <GavelIcon />
    }
  ];

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

  // Step validation
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Search & Select
        return !!personSummary && personSummary.applications.length > 0 && !!selectedApplication;
      case 1: // Review & Approve
        return !!approvalOutcome && isLocationValid();
      default:
        return false;
    }
  };

  // Tab change handler
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    // Allow navigation to previous/completed steps or the next step if current is valid
    if (newValue <= activeStep || (newValue === activeStep + 1 && isStepValid(activeStep))) {
      setActiveStep(newValue);
    }
  };

  // Helper function to render tab with completion indicator
  const renderTabLabel = (step: any, index: number) => {
    const isCompleted = index < activeStep && isStepValid(index);
    const isCurrent = activeStep === index;
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          color: isCompleted ? 'success.main' : isCurrent ? 'primary.main' : 'text.secondary' 
        }}>
          {isCompleted ? <CheckCircleIcon fontSize="small" /> : step.icon}
        </Box>
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: isCurrent ? 'bold' : 'normal',
            color: isCompleted ? 'success.main' : isCurrent ? 'primary.main' : 'text.secondary'
          }}
        >
          {step.label}
        </Typography>
      </Box>
    );
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
      }
      // Don't auto-advance - let user manually proceed
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
      // Default to "00" if no pre-selected restrictions
      setSelectedDriverRestrictions(preSelectedDriver.length > 0 ? preSelectedDriver : ['00']);
      setLockedDriverRestrictions(preSelectedDriver);
      setSelectedVehicleRestrictions(['00']); // Default to "00 - None"
    }
    
    setApprovalOutcome('');
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

  // Helper functions for restrictions management similar to LicenseCaptureForm
  const getRestrictionDisplayName = (code: string): string => {
    // Driver restrictions mapping
    const driverRestrictionMap: Record<string, string> = {
      '00': 'None',
      '01': 'Corrective Lenses Required',
      '02': 'Artificial Limb/Prosthetics'
    };
    
    // Vehicle restrictions mapping
    const vehicleRestrictionMap: Record<string, string> = {
      '00': 'None',
      '01': 'Automatic Transmission Only',
      '02': 'Electric Powered Vehicles Only',
      '03': 'Vehicles Adapted for Physical Disabilities',
      '04': 'Tractor Vehicles Only',
      '05': 'Industrial/Agriculture Vehicles Only'
    };
    
    return driverRestrictionMap[code] || vehicleRestrictionMap[code] || `Restriction ${code}`;
  };

  // Helper function to manage automatic "00 - None" default logic
  const updateRestrictions = (restrictionType: 'driver_restrictions' | 'vehicle_restrictions', selectedValues: string[]) => {
    // If no values selected or only "00" is selected when others are added, automatically add "00"
    let finalValues = [...selectedValues];
    
    // If selecting other restrictions while "00" is present, remove "00"
    if (finalValues.length > 1 && finalValues.includes('00')) {
      finalValues = finalValues.filter(value => value !== '00');
    }
    
    // If no restrictions selected, automatically add "00" as default
    if (finalValues.length === 0) {
      finalValues = ['00'];
    }
    
    // Update the appropriate restriction type
    if (restrictionType === 'driver_restrictions') {
      setSelectedDriverRestrictions(finalValues);
    } else {
      setSelectedVehicleRestrictions(finalValues);
    }
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
    setSelectedDriverRestrictions(['00']);
    setSelectedVehicleRestrictions(['00']);
    setLockedDriverRestrictions([]);
    setApprovalOutcome('');
    setError(null);
    setSuccess(null);
    setShowMedicalInfo(false);
    setShowRawMedicalData(false);
    // Reset location selection for admin users
    if (!user?.primary_location_id) {
      setSelectedLocationId('');
    }
  };

  const renderSearchAndSelectStep = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Search Section */}
      <Paper 
        elevation={0}
        sx={{ 
          bgcolor: 'white',
          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
          borderRadius: 2,
          flex: '0 0 auto',
          p: 2
        }}
      >
        <Box display="flex" alignItems="center" mb={2}>
          <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
            Search Person by ID Number
          </Typography>
        </Box>
        
        <Box display="flex" gap={2} alignItems="flex-start" mb={2}>
          <TextField
            label="ID Number"
            value={searchIdNumber}
            onChange={(e) => setSearchIdNumber(e.target.value)}
            placeholder="Enter Madagascar ID or passport number"
            disabled={isSearching}
            onKeyPress={(e) => e.key === 'Enter' && handleSearchPerson()}
            size="small"
            error={!!error && !searchIdNumber.trim()}
            sx={{ 
              flexGrow: 1,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderWidth: '1px',
                  borderColor: !!error && !searchIdNumber.trim() ? '#ff9800' : undefined,
                  transition: 'border-color 0.2s ease-in-out',
                },
                '&:hover fieldset': {
                  borderWidth: '1px',
                  borderColor: !!error && !searchIdNumber.trim() ? '#f57c00' : undefined,
                },
                '&.Mui-focused fieldset': {
                  borderWidth: '1px',
                  borderColor: !!error && !searchIdNumber.trim() ? '#ff9800' : undefined,
                },
              },
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearchPerson}
            disabled={isSearching || !searchIdNumber.trim()}
            startIcon={isSearching ? <CircularProgress size={16} /> : <SearchIcon />}
            size="small"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2, fontSize: '0.8rem' }}>
            {error}
          </Alert>
        )}

        {isSearching && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Skeleton variant="circular" width={24} height={24} />
              <Skeleton variant="text" width="40%" height={20} />
            </Box>
            <Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 1 }} />
          </Box>
        )}
      </Paper>

        {/* Person Information */}
      {personSummary && (
        <Paper 
          elevation={0}
          sx={{ 
            bgcolor: 'white',
            boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
            borderRadius: 2,
            flex: '0 0 auto',
            p: 2
          }}
        >
            <Box display="flex" alignItems="center" mb={1}>
            <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>Person Information</Typography>
            </Box>
          <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
              <strong>Name:</strong> {personSummary.person.name}
            </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
              <strong>ID Number:</strong> {personSummary.person.id_number}
            </Typography>
        </Paper>
      )}

        {/* Applications Pending Approval */}
      {personSummary && (
        <Paper 
          elevation={0}
          sx={{ 
            bgcolor: 'white',
            boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
            borderRadius: 2,
            flex: '0 0 auto',
            p: 2
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
            Applications Pending Approval
          </Typography>

          <Paper 
            elevation={0}
            sx={{ 
              bgcolor: '#fafafa',
              borderRadius: 1,
              overflow: 'hidden'
            }}
          >
            <TableContainer>
              <Table size="small" sx={{ '& .MuiTableCell-root': { borderRadius: 0 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      fontSize: '0.875rem',
                      bgcolor: '#f8f9fa',
                      py: 1, 
                      px: 2
                    }}>Select</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      fontSize: '0.875rem',
                      bgcolor: '#f8f9fa',
                      py: 1, 
                      px: 2
                    }}>Application #</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      fontSize: '0.875rem',
                      bgcolor: '#f8f9fa',
                      py: 1, 
                      px: 2
                    }}>Type</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      fontSize: '0.875rem',
                      bgcolor: '#f8f9fa',
                      py: 1, 
                      px: 2
                    }}>Category</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      fontSize: '0.875rem',
                      bgcolor: '#f8f9fa',
                      py: 1, 
                      px: 2
                    }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {personSummary.applications.map((app) => (
                    <TableRow key={app.id} hover>
                      <TableCell sx={{ py: 1, px: 2 }}>
                        <Checkbox
                          checked={selectedApplication?.id === app.id}
                          onChange={() => handleSelectApplication(app)}
                          size="small"
                          color="primary"
                        />
                      </TableCell>
                      <TableCell sx={{ py: 1, px: 2 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {app.application_number}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1, px: 2 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {app.application_type.replace('_', ' ')}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1, px: 2 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {app.license_category}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1, px: 2 }}>
                        <Chip 
                          label={app.status} 
                          size="small"
                          color="warning" 
                          sx={{ 
                            fontSize: '0.7rem', 
                            height: '24px'
                          }} 
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Paper>
      )}

      {/* Selection Summary */}
      {selectedApplication && (
        <Paper 
          elevation={0}
          sx={{ 
            bgcolor: 'white',
            boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
            borderRadius: 2,
            flex: '0 0 auto',
            p: 2
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
            Selected Application
          </Typography>
          <Box sx={{ bgcolor: '#f8f9fa', p: 1.5, borderRadius: 1 }}>
            <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
              <strong>Application:</strong> {selectedApplication.application_number}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
              <strong>Type:</strong> {selectedApplication.application_type.replace('_', ' ')}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
              <strong>Category:</strong> {selectedApplication.license_category}
            </Typography>
        </Box>
        </Paper>
      )}
      </Box>
    );


  const renderApprovalStep = () => {
    if (!selectedApplication || !personSummary) return null;

    const restrictionInfo = personSummary.restrictions_info[selectedApplication.id];

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Selected Application Summary */}
        <Paper 
          elevation={0}
          sx={{ 
            bgcolor: 'white',
            boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
            borderRadius: 2,
            flex: '0 0 auto',
            p: 2
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
            Selected Application Summary
          </Typography>
          <Box sx={{ bgcolor: '#f8f9fa', p: 1.5, borderRadius: 1, mb: 2 }}>
            <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
              <strong>Person:</strong> {personSummary.person.name} ({personSummary.person.id_number})
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
              <strong>Application:</strong> {selectedApplication.application_number}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
              <strong>Type:</strong> {selectedApplication.application_type.replace('_', ' ')}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
              <strong>Category:</strong> {selectedApplication.license_category}
            </Typography>
          </Box>

              <Button
                variant="outlined"
                onClick={() => setShowMedicalInfo(true)}
                startIcon={<VisibilityIcon />}
            size="small"
            sx={{
              borderWidth: '1px',
              '&:hover': {
                borderWidth: '1px',
              },
            }}
              >
                View Medical Information
              </Button>
        </Paper>

        {/* Location Selection for Admin Users */}
        {user && !user.primary_location_id && (
          <Paper 
            elevation={0}
            sx={{ 
              bgcolor: 'white',
              boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
              borderRadius: 2,
              flex: '0 0 auto',
              p: 2
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
              Processing Location
            </Typography>
            <FormControl 
              fullWidth 
              required 
              size="small"
              error={!!error && !selectedLocationId}
            >
                <InputLabel>Location</InputLabel>
                <Select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  label="Location"
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderWidth: '1px',
                    borderColor: !!error && !selectedLocationId ? '#ff9800' : undefined,
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderWidth: '1px',
                    borderColor: !!error && !selectedLocationId ? '#f57c00' : undefined,
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderWidth: '1px',
                    borderColor: !!error && !selectedLocationId ? '#ff9800' : undefined,
                  },
                }}
                >
                  {availableLocations.map((location) => (
                    <MenuItem key={location.id} value={location.id}>
                      {location.name} ({location.full_code})
                    </MenuItem>
                  ))}
                </Select>
              {!!error && !selectedLocationId && (
                <FormHelperText>Please select a processing location</FormHelperText>
              )}
              </FormControl>
          </Paper>
        )}

        {/* Approval Outcome */}
        <Paper 
          elevation={0}
          sx={{ 
            bgcolor: 'white',
            boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
            borderRadius: 2,
            flex: '0 0 auto',
            p: 2
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
            Approval Outcome
          </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Button
                  fullWidth
                  variant={approvalOutcome === 'PASSED' ? 'contained' : 'outlined'}
                  color="success"
                  onClick={() => setApprovalOutcome('PASSED')}
                  startIcon={<CheckIcon />}
                size="small"
                sx={{
                  borderWidth: '1px',
                  '&:hover': {
                    borderWidth: '1px',
                  },
                  '&.MuiButton-contained': {
                    color: 'white',
                  },
                }}
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
                size="small"
                sx={{
                  borderWidth: '1px',
                  '&:hover': {
                    borderWidth: '1px',
                  },
                }}
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
                size="small"
                sx={{
                  borderWidth: '1px',
                  '&:hover': {
                    borderWidth: '1px',
                  },
                }}
                >
                  ABSENT
                </Button>
              </Grid>
            </Grid>
        </Paper>

        {/* Restrictions (only shown for PASS) */}
        {approvalOutcome === 'PASSED' && restrictionInfo && (
          <Paper 
            elevation={0}
            sx={{ 
              bgcolor: 'white',
              boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
              borderRadius: 2,
              flex: '0 0 auto',
              p: 2
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
              License Restrictions
            </Typography>
              
                          {/* Driver and Vehicle Restrictions Side by Side */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {/* Driver Restrictions */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom color="primary" fontWeight="bold" sx={{ fontSize: '0.9rem' }}>
                    Driver Restrictions
                  </Typography>
                <FormControl fullWidth size="small">
                  <InputLabel>Driver Restrictions</InputLabel>
                  <Select
                    multiple
                    size="small"
                    value={selectedDriverRestrictions}
                    label="Driver Restrictions"
                    onChange={(e) => updateRestrictions('driver_restrictions', Array.isArray(e.target.value) ? e.target.value : [])}
                    sx={{
                      position: 'relative',
                      '& .chip-container .MuiChip-deleteIcon': {
                        pointerEvents: 'auto',
                        zIndex: 10000
                      }
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: { zIndex: 1200 }
                      }
                    }}
                    renderValue={(selected) => (
                      <Box 
                        className="chip-container"
                        data-chip-container="true"
                        sx={{ 
                          display: 'flex', 
                          flexWrap: 'wrap', 
                          gap: 0.5
                        }}
                        onMouseDown={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest('.MuiChip-root') || target.classList.contains('MuiChip-root')) {
                            e.stopPropagation();
                          }
                        }}
                      >
                        {(selected as string[]).map((value) => (
                              <Chip 
                            key={value} 
                            label={`${value} - ${getRestrictionDisplayName(value)}`}
                            size="small"
                            color="primary"
                            sx={{ 
                              fontSize: '0.65rem', 
                              height: '20px',
                              '& .MuiChip-deleteIcon': {
                                pointerEvents: 'auto',
                                zIndex: 10000
                              }
                            }}
                            onDelete={value !== '00' || selected.length > 1 ? (e) => {
                              if (e) {
                                e.preventDefault();
                                e.stopPropagation();
                              }
                              const newValues = selected.filter(v => v !== value);
                              updateRestrictions('driver_restrictions', newValues);
                            } : undefined}
                          />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="00">00 - None</MenuItem>
                    <MenuItem value="01">01 - Corrective Lenses Required</MenuItem>
                    <MenuItem value="02">02 - Artificial Limb/Prosthetics</MenuItem>
                  </Select>
                </FormControl>
                
                {/* Show locked restrictions from medical examination */}
                {restrictionInfo && restrictionInfo.driver_restrictions.filter((r: any) => r.locked).length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'warning.main' }}>
                      <strong>Required by medical examination:</strong>
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                      {restrictionInfo.driver_restrictions.filter((r: any) => r.locked).map((restriction: any) => (
                        <Chip 
                          key={restriction.code}
                          label={`${restriction.code} - ${restriction.description}`}
                          size="small" 
                          color="warning" 
                          variant="outlined"
                          sx={{ 
                            fontSize: '0.65rem', 
                            height: '20px'
                          }}
                        />
                    ))}
                    </Box>
                </Box>
              )}
              </Grid>

              {/* Vehicle Restrictions */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom color="primary" fontWeight="bold" sx={{ fontSize: '0.9rem' }}>
                    Vehicle Restrictions
                  </Typography>
                <FormControl fullWidth size="small">
                  <InputLabel>Vehicle Restrictions</InputLabel>
                  <Select
                    multiple
                    size="small"
                    value={selectedVehicleRestrictions}
                    label="Vehicle Restrictions"
                    onChange={(e) => updateRestrictions('vehicle_restrictions', Array.isArray(e.target.value) ? e.target.value : [])}
                    sx={{
                      position: 'relative',
                      '& .chip-container .MuiChip-deleteIcon': {
                        pointerEvents: 'auto',
                        zIndex: 10000
                      }
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: { zIndex: 1200 }
                      }
                    }}
                    renderValue={(selected) => (
                      <Box 
                        className="chip-container"
                        data-chip-container="true"
                        sx={{ 
                          display: 'flex', 
                          flexWrap: 'wrap', 
                          gap: 0.5
                        }}
                        onMouseDown={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest('.MuiChip-root') || target.classList.contains('MuiChip-root')) {
                            e.stopPropagation();
                          }
                        }}
                      >
                        {(selected as string[]).map((value) => (
                          <Chip 
                            key={value} 
                            label={`${value} - ${getRestrictionDisplayName(value)}`}
                            size="small"
                            color="secondary"
                            sx={{ 
                              fontSize: '0.65rem', 
                              height: '20px',
                              '& .MuiChip-deleteIcon': {
                                pointerEvents: 'auto',
                                zIndex: 10000
                              }
                            }}
                            onDelete={value !== '00' || selected.length > 1 ? (e) => {
                              if (e) {
                                e.preventDefault();
                                e.stopPropagation();
                              }
                              const newValues = selected.filter(v => v !== value);
                              updateRestrictions('vehicle_restrictions', newValues);
                            } : undefined}
                      />
                    ))}
                </Box>
              )}
                  >
                    <MenuItem value="00">00 - None</MenuItem>
                    <MenuItem value="01">01 - Automatic Transmission Only</MenuItem>
                    <MenuItem value="02">02 - Electric Powered Vehicles Only</MenuItem>
                    <MenuItem value="03">03 - Vehicles Adapted for Physical Disabilities</MenuItem>
                    <MenuItem value="04">04 - Tractor Vehicles Only</MenuItem>
                    <MenuItem value="05">05 - Industrial/Agriculture Vehicles Only</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

              {/* Selected Restrictions Summary */}
              {(selectedDriverRestrictions.length > 0 || selectedVehicleRestrictions.length > 0) && (
                <Box mt={2}>
                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontSize: '0.8rem' }}>
                    Selected Restrictions:
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {selectedDriverRestrictions.map((code) => (
                      <Chip 
                        key={`driver-${code}`} 
                        label={`Driver: ${code} - ${getRestrictionDisplayName(code)}`} 
                        size="small" 
                        color="primary" 
                        variant={lockedDriverRestrictions.includes(code) ? "filled" : "outlined"}
                                                  sx={{ 
                            fontSize: '0.7rem', 
                            height: '24px'
                          }}
                      />
                    ))}
                    {selectedVehicleRestrictions.map((code) => (
                      <Chip 
                        key={`vehicle-${code}`} 
                        label={`Vehicle: ${code} - ${getRestrictionDisplayName(code)}`} 
                        size="small" 
                        color="secondary" 
                        variant="outlined"
                        sx={{ 
                          fontSize: '0.7rem', 
                          height: '24px'
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
          </Paper>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2, fontSize: '0.8rem' }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mt: 2, fontSize: '0.8rem' }}>
            {success}
          </Alert>
        )}
      </Box>
    );
  };

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
        {/* Header */}
        <Box sx={{ p: 2, bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h4" gutterBottom sx={{ fontSize: '1.5rem', fontWeight: 600, mb: 0 }}>
        License Application Approval
      </Typography>
        </Box>

        {/* Tab Navigation */}
        <Box sx={{ 
          bgcolor: 'white', 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          flexShrink: 0 
        }}>
          <Tabs
            value={activeStep}
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 'normal',
                minHeight: '48px',
                minWidth: '120px',
                mx: 0.5,
                borderRadius: '8px 8px 0 0',
                '&.Mui-selected': {
                  bgcolor: 'white',
                  color: 'text.primary',
                },
                '&:hover': {
                  bgcolor: 'grey.200',
                  '&.Mui-selected': {
                    bgcolor: 'white',
                  }
                }
              },
              '& .MuiTabs-indicator': {
                display: 'none'
              }
            }}
          >
            {steps.map((step, index) => (
              <Tab
                key={step.label}
                label={renderTabLabel(step, index)}
                disabled={index > activeStep + 1 || (index === activeStep + 1 && !isStepValid(activeStep))}
              />
            ))}
          </Tabs>
      </Box>

        {/* Content Area */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'auto',
          p: 2,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {activeStep === 0 && renderSearchAndSelectStep()}
          {activeStep === 1 && renderApprovalStep()}
        </Box>

        {/* Navigation Footer */}
        <Box sx={{ 
          p: 2, 
          bgcolor: 'white', 
          borderTop: '1px solid', 
          borderColor: 'divider',
          flexShrink: 0,
          display: 'flex', 
          justifyContent: 'space-between', 
          gap: 1 
        }}>
          {activeStep > 0 && (
            <Button
              onClick={() => setActiveStep(activeStep - 1)}
              disabled={isProcessing}
              size="small"
              startIcon={<ArrowBackIcon />}
            >
              Back
            </Button>
          )}
          
          <Box sx={{ flexGrow: 1 }} />

          {activeStep < steps.length - 1 && (
            <Button
              variant="contained"
              onClick={() => setActiveStep(activeStep + 1)}
              disabled={!isStepValid(activeStep) || isProcessing}
              size="small"
              endIcon={<ArrowForwardIcon />}
            >
              {activeStep === 0 ? 'Proceed to Approval' : 'Next'}
            </Button>
          )}

          {activeStep === 1 && (
            <Button
              variant="contained"
              color={approvalOutcome === 'PASSED' ? 'success' : approvalOutcome === 'FAILED' ? 'error' : 'warning'}
              onClick={handleProcessApproval}
              disabled={isProcessing || !approvalOutcome || !isLocationValid()}
              startIcon={isProcessing ? <CircularProgress size={16} /> : <GavelIcon />}
              size="small"
              sx={{
                '&.MuiButton-contained': {
                  color: approvalOutcome === 'PASSED' ? 'white' : undefined,
                },
              }}
            >
              {isProcessing ? 'Processing...' : `Confirm ${approvalOutcome}`}
            </Button>
          )}
        </Box>
      </Paper>

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
            <Box sx={{ mt: 1 }}>
              {/* Vision Test Results */}
              {selectedApplication.medical_information.vision_test && (
                <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                    Vision Test Results
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        <strong>Visual Acuity:</strong> {selectedApplication.medical_information.vision_test.visual_acuity || 'Not recorded'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        <strong>Color Vision:</strong> {selectedApplication.medical_information.vision_test.color_vision || 'Not recorded'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        <strong>Field of Vision:</strong> {selectedApplication.medical_information.vision_test.field_of_vision || 'Not recorded'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        <strong>Night Vision:</strong> {selectedApplication.medical_information.vision_test.night_vision || 'Not recorded'}
                      </Typography>
                    </Grid>
                    {selectedApplication.medical_information.vision_test.corrective_lenses_required && (
                      <Grid item xs={12}>
                        <Alert severity="warning" sx={{ fontSize: '0.8rem' }}>
                          <strong>Corrective Lenses Required:</strong> This person must wear corrective lenses while driving
                        </Alert>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              )}

              {/* Medical Examination */}
              {selectedApplication.medical_information.medical_exam && (
                <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                    Medical Examination
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        <strong>General Health:</strong> {selectedApplication.medical_information.medical_exam.general_health || 'Not recorded'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        <strong>Physical Fitness:</strong> {selectedApplication.medical_information.medical_exam.physical_fitness || 'Not recorded'}
                      </Typography>
                    </Grid>
                    {selectedApplication.medical_information.medical_exam.medical_conditions && (
                      <Grid item xs={12}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          <strong>Medical Conditions:</strong> {selectedApplication.medical_information.medical_exam.medical_conditions}
                        </Typography>
                      </Grid>
                    )}
                    {selectedApplication.medical_information.medical_exam.medications && (
                      <Grid item xs={12}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          <strong>Current Medications:</strong> {selectedApplication.medical_information.medical_exam.medications}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              )}

              {/* Examiner Notes */}
              {selectedApplication.medical_information.examiner_notes && (
                <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                    Examiner Notes
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    {selectedApplication.medical_information.examiner_notes}
                  </Typography>
                </Paper>
              )}

              {/* Pre-Selected Restrictions */}
              {(selectedApplication.medical_information.pre_selected_restrictions?.driver_restrictions?.length > 0 || 
                selectedApplication.medical_information.pre_selected_restrictions?.vehicle_restrictions?.length > 0) && (
                <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: '#fff3e0', borderRadius: 1 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                    Pre-Selected Restrictions (Based on Medical Examination)
                  </Typography>
                  {selectedApplication.medical_information.pre_selected_restrictions.driver_restrictions?.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontSize: '0.9rem', fontWeight: 600, mb: 0.5 }}>
                        Driver Restrictions:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {selectedApplication.medical_information.pre_selected_restrictions.driver_restrictions.map((code: string) => (
                          <Chip 
                            key={code} 
                            label={`${code} - ${code === '01' ? 'Corrective Lenses Required' : code === '02' ? 'Artificial Limb/Prosthetics' : `Restriction ${code}`}`}
                            size="small" 
                            color="warning"
                            sx={{ 
                              fontSize: '0.7rem', 
                              height: '24px'
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                  {selectedApplication.medical_information.pre_selected_restrictions.vehicle_restrictions?.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontSize: '0.9rem', fontWeight: 600, mb: 0.5 }}>
                        Vehicle Restrictions:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {selectedApplication.medical_information.pre_selected_restrictions.vehicle_restrictions.map((code: string) => (
                          <Chip 
                            key={code} 
                            label={`${code} - ${code === '01' ? 'Automatic Transmission Only' : code === '02' ? 'Electric Powered Vehicles Only' : code === '03' ? 'Vehicles Adapted for Physical Disabilities' : `Restriction ${code}`}`}
                            size="small" 
                            color="warning"
                            sx={{ 
                              fontSize: '0.7rem', 
                              height: '24px'
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Paper>
              )}

              {/* Raw Data (Collapsible) */}
              <Box sx={{ mt: 2 }}>
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={() => setShowRawMedicalData(!showRawMedicalData)}
                  startIcon={showRawMedicalData ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                >
                  {showRawMedicalData ? 'Hide' : 'Show'} Raw Medical Data
                </Button>
                <Collapse in={showRawMedicalData}>
                  <Paper elevation={0} sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '12px', margin: 0 }}>
              {JSON.stringify(selectedApplication.medical_information, null, 2)}
            </pre>
                  </Paper>
                </Collapse>
              </Box>
            </Box>
          ) : (
            <Typography>No medical information available</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMedicalInfo(false)} size="small">Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default LicenseApprovalPage; 