/**
 * Driver's License Capture Form Page
 * Focused form for DRIVERS_LICENSE_CAPTURE applications only
 * 
 * Workflow: Person Selection (A) → License Capture → Review & Submit
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';
import {
  PersonSearch as PersonSearchIcon,
  DocumentScanner as DocumentScannerIcon,
  Preview as PreviewIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  LocationOn as LocationOnIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import PersonFormWrapper from '../../components/PersonFormWrapper';
import LicenseCaptureForm from '../../components/applications/LicenseCaptureForm';
import { applicationService } from '../../services/applicationService';
import {
  Person,
  ApplicationStatus,
  ApplicationType,
  ApplicationCreate,
  LicenseCaptureData,
  LicenseCategory,
  Location,
  CapturedLicense
} from '../../types';
import { API_ENDPOINTS, getAuthToken } from '../../config/api';

const DriverLicenseCaptureFormPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [activeStep, setActiveStep] = useState(0);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [licenseCaptureData, setLicenseCaptureData] = useState<LicenseCaptureData | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Steps for driver's license capture
  const steps = [
    {
      label: 'Select Person',
      description: 'Choose existing person or register new license holder',
      icon: <PersonSearchIcon />
    },
    {
      label: 'Capture License Details',
      description: 'Enter existing license information for verification',
      icon: <DocumentScannerIcon />
    },
    {
      label: 'Review & Submit',
      description: 'Review captured information and submit',
      icon: <PreviewIcon />
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

  // Step validation
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!selectedPerson && !!selectedPerson.id;
      case 1:
        // Check license capture data and location for admin users
        const hasLicenseData = !!licenseCaptureData && licenseCaptureData.captured_licenses.length > 0;
        const hasLocation = !!user?.primary_location_id || !!selectedLocationId;
        return hasLicenseData && hasLocation && !!selectedPerson && !!selectedPerson.id;
      case 2:
        return !!selectedPerson && !!selectedPerson.id && !!licenseCaptureData && licenseCaptureData.captured_licenses.length > 0;
      default:
        return false;
    }
  };

  // Handle location selection
  const handleLocationChange = (event: any) => {
    setSelectedLocationId(event.target.value);
    setError('');
  };

  // Get location ID to use
  const getLocationId = (): string => {
    return user?.primary_location_id || selectedLocationId;
  };

  // Navigation handlers
  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  // Person selection handler
  const handlePersonSelected = (person: Person) => {
    console.log('Person selected from PersonFormWrapper:', person);
    console.log('Person ID:', person?.id);
    setSelectedPerson(person);
    setError('');
    
    // Auto-advance to next step
    setTimeout(() => {
      setActiveStep(1);
    }, 500);
  };

  // License capture handler
  const handleLicenseCaptureChange = (data: LicenseCaptureData | null) => {
    setLicenseCaptureData(data);
    setError('');
  };

  // Initialize license capture with one default license when person is selected
  useEffect(() => {
    if (selectedPerson && !licenseCaptureData) {
      const defaultLicense = {
        id: `license-${Date.now()}`,
        license_category: LicenseCategory.B, // Default to B category
        issue_date: '',
        restrictions: [],
        verified: false,
        verification_notes: ''
      };

      setLicenseCaptureData({
        captured_licenses: [defaultLicense],
        application_type: ApplicationType.DRIVERS_LICENSE_CAPTURE
      });
    }
  }, [selectedPerson, licenseCaptureData]);

  // Submit handler
  const handleSubmit = async () => {
    if (!selectedPerson || !licenseCaptureData) {
      setError('Missing required data for submission');
      return;
    }

    // Additional validation for person ID
    if (!selectedPerson.id) {
      console.error('Selected person object:', selectedPerson);
      setError('Person ID is missing. Please go back and reselect the person.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Validate location
      const locationId = getLocationId();
      if (!locationId) {
        setError('Location is required. Please select a location or contact administrator to assign a location to your account.');
        return;
      }

      // Create application with capture data (no mapping needed - backend now accepts SADC codes)
      const applicationData: ApplicationCreate = {
        person_id: selectedPerson.id,
        location_id: locationId,
        application_type: ApplicationType.DRIVERS_LICENSE_CAPTURE,
        license_category: licenseCaptureData.captured_licenses[0]?.license_category || LicenseCategory.B,
        license_capture: licenseCaptureData
      };

      console.log('User info:', user);
      console.log('Selected person object:', selectedPerson);
      console.log('Selected person ID:', selectedPerson.id);
      console.log('Selected location ID:', locationId);
      console.log('User primary_location_id:', user?.primary_location_id);
      console.log('Submitting application data:', applicationData);
      console.log('Capture data:', licenseCaptureData);

      const application = await applicationService.createApplication(applicationData);
      
      // Authorization workflow for license capture applications
      // DRAFT → SUBMITTED → APPROVED → COMPLETED
      await applicationService.updateApplicationStatus(application.id, ApplicationStatus.SUBMITTED);
      await applicationService.updateApplicationStatus(application.id, ApplicationStatus.APPROVED);
      await applicationService.updateApplicationStatus(application.id, ApplicationStatus.COMPLETED);
      
      setSuccess('Driver\'s license capture completed successfully! License records have been created.');
      
      // Navigate to applications dashboard
      setTimeout(() => {
        navigate('/dashboard/applications/dashboard', {
          state: { 
            message: 'License capture completed successfully',
            application 
          }
        });
      }, 2000);

    } catch (err: any) {
      console.error('Submission error:', err);
      let errorMessage = 'Failed to submit license capture';
      
      // Handle validation errors from backend
      if (err.response?.data?.detail) {
        const validationErrors = err.response.data.detail;
        if (Array.isArray(validationErrors)) {
          errorMessage = validationErrors.map((error: any) => {
            const field = error.loc ? error.loc.join('.') : 'field';
            return `${field}: ${error.msg}`;
          }).join('; ');
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Render step content
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // Person step
        return (
          <PersonFormWrapper
            mode="application"
            onSuccess={handlePersonSelected}
            title=""
            subtitle="Select existing person or register new license holder"
            showHeader={false}
          />
        );

      case 1: // License capture step
        return (
          <Box>
            {/* Location Selection for Admin Users */}
            {user && !user.primary_location_id && (
              <Card sx={{ mb: 3 }}>
                <CardHeader 
                  title="Select Processing Location" 
                  avatar={<LocationOnIcon />}
                />
                <CardContent>
                  <FormControl fullWidth required error={!!error && !selectedLocationId}>
                    <InputLabel>Processing Location</InputLabel>
                    <Select
                      value={selectedLocationId}
                      onChange={handleLocationChange}
                      label="Processing Location"
                    >
                      {Array.isArray(availableLocations) && availableLocations.map((location) => (
                        <MenuItem key={location.id} value={location.id}>
                          {location.name} ({location.code})
                        </MenuItem>
                      ))}
                    </Select>
                    {!!error && !selectedLocationId && (
                      <FormHelperText>Please select a processing location</FormHelperText>
                    )}
                  </FormControl>
                </CardContent>
              </Card>
            )}

            <LicenseCaptureForm
              applicationtype={ApplicationType.DRIVERS_LICENSE_CAPTURE}
              value={licenseCaptureData}
              onChange={handleLicenseCaptureChange}
              personBirthDate={selectedPerson?.birth_date}
              personId={selectedPerson?.id}
            />
          </Box>
        );

      case 2: // Review step
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Driver's License Capture
            </Typography>

            {/* Processing Location Display */}
            <Card sx={{ mb: 3 }}>
              <CardHeader 
                title="Processing Location" 
                avatar={<LocationOnIcon />}
              />
              <CardContent>
                <Typography variant="body1">
                  {user?.primary_location_id ? (
                    `User's assigned location: ${user.primary_location_id}`
                  ) : (
                    availableLocations.find(loc => loc.id === selectedLocationId)?.name || 'No location selected'
                  )}
                  {selectedLocationId && (
                    <Chip 
                      label={availableLocations.find(loc => loc.id === selectedLocationId)?.code || selectedLocationId} 
                      size="small" 
                      sx={{ ml: 1 }}
                    />
                  )}
                </Typography>
              </CardContent>
            </Card>
            
            {/* Person Details */}
            <Card sx={{ mb: 3 }}>
              <CardHeader title="License Holder" />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Name</Typography>
                    <Typography variant="body1">
                      {selectedPerson?.surname}, {selectedPerson?.first_name} {selectedPerson?.middle_name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Madagascar ID</Typography>
                    <Typography variant="body1">
                      {selectedPerson?.aliases?.find(alias => alias.is_primary)?.document_number || 'Not available'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Birth Date</Typography>
                    <Typography variant="body1">{selectedPerson?.birth_date}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Nationality</Typography>
                    <Typography variant="body1">{selectedPerson?.nationality_code}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Captured Licenses */}
            <Card sx={{ mb: 3 }}>
              <CardHeader 
                title="Captured Driver's Licenses" 
                subheader={`${licenseCaptureData?.captured_licenses?.length || 0} license(s) captured`}
              />
              <CardContent>
                {licenseCaptureData?.captured_licenses?.map((license, index) => (
                  <Box key={license.id} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={3}>
                        <Typography variant="body2" color="text.secondary">Category</Typography>
                        <Chip label={license.license_category} size="small" color="primary" />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Typography variant="body2" color="text.secondary">Issue Date</Typography>
                        <Typography variant="body1">{license.issue_date}</Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">Restrictions</Typography>
                        {license.restrictions?.length > 0 ? (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {license.restrictions.map((restriction, rIndex) => (
                              <Chip 
                                key={rIndex} 
                                label={restriction} 
                                size="small" 
                                variant="outlined" 
                              />
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body1">None</Typography>
                        )}
                      </Grid>
                      {license.verification_notes && (
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">Verification Notes</Typography>
                          <Typography variant="body1">{license.verification_notes}</Typography>
                        </Grid>
                      )}
                    </Grid>
                    {index < (licenseCaptureData?.captured_licenses?.length || 0) - 1 && (
                      <Divider sx={{ mt: 2 }} />
                    )}
                  </Box>
                ))}
              </CardContent>
            </Card>

            {/* Summary */}
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Next Steps:</strong> After submission, captured license records will be created in the system 
                and marked as completed. The license holder will be able to apply for new Madagascar licenses 
                based on their captured credentials.
              </Typography>
            </Alert>
          </Box>
        );

      default:
        return <Typography>Unknown step</Typography>;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Driver's License Capture
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Capture existing driver's license details for system registration
          </Typography>
        </Box>

        {/* Error/Success Messages */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 3 }} icon={<CheckCircleIcon />}>
            {success}
          </Alert>
        )}

        {/* Stepper */}
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel
                optional={
                  <Typography variant="caption">{step.description}</Typography>
                }
                StepIconComponent={() => (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: activeStep >= index ? 'primary.main' : 'grey.300',
                      color: activeStep >= index ? 'white' : 'grey.600',
                    }}
                  >
                    {step.icon}
                  </Box>
                )}
              >
                {step.label}
              </StepLabel>
              <StepContent>
                <Box sx={{ mt: 2, mb: 2 }}>
                  {renderStepContent(index)}
                </Box>
                
                {/* Navigation Buttons */}
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Button
                    onClick={handleCancel}
                    disabled={loading}
                    color="secondary"
                  >
                    Cancel
                  </Button>
                  
                  <Button
                    disabled={index === 0 || loading}
                    onClick={handleBack}
                    startIcon={<ArrowBackIcon />}
                  >
                    Back
                  </Button>
                  
                  <Button
                    variant="contained"
                    onClick={index === steps.length - 1 ? handleSubmit : handleNext}
                    disabled={!isStepValid(index) || loading}
                    startIcon={loading ? <CircularProgress size={20} /> : undefined}
                    endIcon={index !== steps.length - 1 ? <ArrowForwardIcon /> : undefined}
                  >
                    {loading ? 'Submitting...' : index === steps.length - 1 ? 'Submit Capture' : 'Next'}
                  </Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {/* Completion Message */}
        {activeStep === steps.length && (
          <Paper square elevation={0} sx={{ p: 3 }}>
            <Typography>All steps completed - license capture submitted successfully!</Typography>
            <Button 
              onClick={() => navigate('/dashboard/applications/dashboard')} 
              sx={{ mt: 1, mr: 1 }}
            >
              Back to Applications
            </Button>
          </Paper>
        )}
      </Paper>
    </Container>
  );
};

export default DriverLicenseCaptureFormPage; 