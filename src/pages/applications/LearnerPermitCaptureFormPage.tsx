/**
 * Learner's Permit Capture Form Page
 * Focused form for LEARNERS_PERMIT_CAPTURE applications only
 * 
 * Workflow: Person Selection (A) → License Capture → Review & Submit
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
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
  Location
} from '../../types';
import { CapturedLicense } from '../../components/applications/LicenseCaptureForm';
import { API_ENDPOINTS, getAuthToken } from '../../config/api';

const LearnerPermitCaptureFormPage: React.FC = () => {
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

  // Steps for learner's permit capture
  const steps = [
    {
      label: 'Person',
      icon: <PersonSearchIcon />
    },
    {
      label: 'License Capture',
      icon: <DocumentScannerIcon />
    },
    {
      label: 'Review',
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

  // Tab change handler
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    // Allow navigation to completed steps or current step
    if (newValue <= activeStep || isStepValid(newValue - 1)) {
      setActiveStep(newValue);
    }
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
      const newLicense: CapturedLicense = {
        id: `license-${Date.now()}`,
        license_category: LicenseCategory.LEARNERS_1, // Default to LEARNERS_1 (only valid database value)
        issue_date: '',
        restrictions: {
          driver_restrictions: [],
          vehicle_restrictions: []
        },
        verified: false,
        verification_notes: ''
      };

      setLicenseCaptureData({
        captured_licenses: [newLicense],
        application_type: ApplicationType.LEARNERS_PERMIT_CAPTURE
      });
    }
  }, [selectedPerson, licenseCaptureData]);

  // Helper function to render tab with completion indicator
  const renderTabLabel = (step: any, index: number) => {
    const isCompleted = isStepValid(index);
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

  // Handle submission
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

      // Create application with capture data
      // Note: Backend expects enum values ('1', '2', '3') not enum keys ('LEARNERS_1')
      const firstCapturedCategory = licenseCaptureData.captured_licenses[0]?.license_category;
      
      // Use the enum value directly (LEARNERS_1 = '1', LEARNERS_2 = '2', LEARNERS_3 = '3')
      const categoryValue = firstCapturedCategory || LicenseCategory.LEARNERS_1;

      const applicationData = {
        person_id: selectedPerson.id,
        location_id: locationId,
        application_type: ApplicationType.LEARNERS_PERMIT_CAPTURE,
        license_category: categoryValue, // Send the enum value ('1', '2', '3')
        license_capture: licenseCaptureData
      };

      console.log('User primary_location_id:', user?.primary_location_id);
      console.log('Submitting application data:', applicationData);
      console.log('Capture data:', licenseCaptureData);

      const application = await applicationService.createApplication(applicationData);
      
      // Authorization workflow for learner's permit capture applications
      // DRAFT → SUBMITTED → APPROVED → COMPLETED
      await applicationService.updateApplicationStatus(application.id, ApplicationStatus.SUBMITTED);
      await applicationService.updateApplicationStatus(application.id, ApplicationStatus.APPROVED);
      await applicationService.updateApplicationStatus(application.id, ApplicationStatus.COMPLETED);
      
      setSuccess('Learner\'s permit capture completed successfully! License records have been created.');
      
      // Navigate to applications dashboard
      setTimeout(() => {
        navigate('/dashboard/applications/dashboard', {
          state: { 
            message: 'Learner\'s permit capture completed successfully',
            application 
          }
        });
      }, 2000);

    } catch (err: any) {
      console.error('Submission error:', err);
      let errorMessage = 'Failed to submit learner\'s permit capture';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
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
            subtitle="Select existing person or register new learner's permit holder"
            showHeader={false}
          />
        );

      case 1: // License capture step
        return (
          <Box>
            {/* Location Selection for Admin Users */}
            {user && !user.primary_location_id && (
              <Card 
                elevation={0}
                sx={{ 
                  mb: 2,
                  bgcolor: 'white',
                  boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                  borderRadius: 2
                }}
              >
                <CardHeader 
                  sx={{ p: 1.5 }}
                  title={
                    <Box display="flex" alignItems="center" gap={1}>
                      <LocationOnIcon color="primary" />
                      <Typography variant="subtitle1" sx={{ fontSize: '1rem' }}>
                        Select Processing Location
                      </Typography>
                    </Box>
                  }
                />
                <CardContent sx={{ p: 1.5, pt: 0 }}>
                  <FormControl fullWidth required size="small" error={!!error && !selectedLocationId}>
                    <InputLabel>Processing Location</InputLabel>
                    <Select
                      value={selectedLocationId}
                      onChange={handleLocationChange}
                      label="Processing Location"
                      size="small"
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
              applicationtype={ApplicationType.LEARNERS_PERMIT_CAPTURE}
              value={licenseCaptureData}
              onChange={handleLicenseCaptureChange}
              personBirthDate={selectedPerson?.birth_date}
            />
          </Box>
        );

      case 2: // Review step
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Learner's Permit Capture
            </Typography>

            {/* Processing Location Display */}
            <Card 
              elevation={0}
              sx={{ 
                mb: 2,
                bgcolor: 'white',
                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                borderRadius: 2
              }}
            >
              <CardHeader 
                sx={{ p: 1.5 }}
                title={
                  <Box display="flex" alignItems="center" gap={1}>
                    <LocationOnIcon color="primary" />
                    <Typography variant="subtitle1" sx={{ fontSize: '1rem' }}>
                      Processing Location
                    </Typography>
                  </Box>
                }
              />
              <CardContent sx={{ p: 1.5, pt: 0 }}>
                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                  {user?.primary_location_id ? (
                    `User's assigned location: ${user.primary_location_id}`
                  ) : (
                    availableLocations.find(loc => loc.id === selectedLocationId)?.name || 'No location selected'
                  )}
                  {selectedLocationId && (
                    <Chip 
                      label={availableLocations.find(loc => loc.id === selectedLocationId)?.code || selectedLocationId} 
                      size="small" 
                      sx={{ ml: 1, fontSize: '0.65rem', height: '20px' }}
                    />
                  )}
                </Typography>
              </CardContent>
            </Card>
            
            {/* Person Details */}
            <Card 
              elevation={0}
              sx={{ 
                mb: 2,
                bgcolor: 'white',
                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                borderRadius: 2
              }}
            >
              <CardHeader 
                sx={{ p: 1.5 }}
                title={
                  <Typography variant="subtitle1" sx={{ fontSize: '1rem' }}>
                    Learner's Permit Holder
                  </Typography>
                }
              />
              <CardContent sx={{ p: 1.5, pt: 0 }}>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary">Name</Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                      {selectedPerson?.surname}, {selectedPerson?.first_name} {selectedPerson?.middle_name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary">Madagascar ID</Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                      {selectedPerson?.aliases?.find(alias => alias.is_primary)?.document_number || 'Not available'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary">Birth Date</Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{selectedPerson?.birth_date}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary">Nationality</Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{selectedPerson?.nationality_code}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Captured Licenses */}
            <Card 
              elevation={0}
              sx={{ 
                mb: 2,
                bgcolor: 'white',
                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                borderRadius: 2
              }}
            >
              <CardHeader 
                sx={{ p: 1.5 }}
                title={
                  <Typography variant="subtitle1" sx={{ fontSize: '1rem' }}>
                    Captured Learner's Permits
                  </Typography>
                }
                subheader={
                  <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                    {`${licenseCaptureData?.captured_licenses?.length || 0} permit(s) captured`}
                  </Typography>
                }
              />
              <CardContent sx={{ p: 1.5, pt: 0 }}>
                {licenseCaptureData?.captured_licenses?.map((license, index) => (
                  <Box key={license.id} sx={{ mb: 1.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} md={3}>
                        <Typography variant="caption" color="text.secondary">License ID</Typography>
                        <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.8rem' }}>
                          {license.id.substring(0, 8)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Typography variant="caption" color="text.secondary">Category</Typography>
                        <Box sx={{ mt: 0.5 }}>
                          <Chip 
                            label={license.license_category} 
                            size="small" 
                            color="primary"
                            sx={{ fontSize: '0.65rem', height: '20px' }}
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Typography variant="caption" color="text.secondary">Issue Date</Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{license.issue_date}</Typography>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Typography variant="caption" color="text.secondary">Restrictions</Typography>
                        {(license.restrictions?.driver_restrictions?.length > 0 || license.restrictions?.vehicle_restrictions?.length > 0) ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {license.restrictions?.driver_restrictions?.length > 0 && (
                              <Box>
                                <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.5 }}>Driver:</Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {license.restrictions.driver_restrictions.map((restriction, rIndex) => (
                                    <Chip 
                                      key={rIndex} 
                                      label={restriction} 
                                      size="small" 
                                      variant="outlined"
                                      color="primary"
                                      sx={{ fontSize: '0.65rem', height: '18px' }}
                                    />
                                  ))}
                                </Box>
                              </Box>
                            )}
                            {license.restrictions?.vehicle_restrictions?.length > 0 && (
                              <Box>
                                <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.5 }}>Vehicle:</Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {license.restrictions.vehicle_restrictions.map((restriction, rIndex) => (
                                    <Chip 
                                      key={rIndex} 
                                      label={restriction} 
                                      size="small" 
                                      variant="outlined"
                                      color="secondary"
                                      sx={{ fontSize: '0.65rem', height: '18px' }}
                                    />
                                  ))}
                                </Box>
                              </Box>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>None</Typography>
                        )}
                      </Grid>
                      {license.verification_notes && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">Verification Notes</Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{license.verification_notes}</Typography>
                        </Grid>
                      )}
                    </Grid>
                    {index < (licenseCaptureData?.captured_licenses?.length || 0) - 1 && (
                      <Divider sx={{ mt: 1.5 }} />
                    )}
                  </Box>
                ))}
              </CardContent>
            </Card>

            {/* Summary */}
            <Alert severity="info" sx={{ mb: 2, py: 1 }}>
              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                <strong>Next Steps:</strong> After submission, captured learner's permit records will be created in the system 
                and marked as completed. The permit holder will be able to apply for full driver's licenses 
                based on their captured learner's permit credentials.
              </Typography>
            </Alert>
          </Box>
        );

      default:
        return <Typography>Unknown step</Typography>;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 2, height: '100vh', display: 'flex', flexDirection: 'column' }}>
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
          <Typography variant="h5" gutterBottom sx={{ mb: 1 }}>
            Learner's Permit Capture
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Capture existing learner's permit details for system registration
          </Typography>
        </Box>

        {/* Error/Success Messages */}
        {error && (
          <Alert severity="error" sx={{ mx: 2, mt: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mx: 2, mt: 2 }} icon={<CheckCircleIcon />}>
            {success}
          </Alert>
        )}

        {/* Application Tabs */}
        <Box sx={{ bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tabs
            value={activeStep}
            onChange={handleTabChange}
            sx={{
              px: 2,
              '& .MuiTab-root': {
                minHeight: 48,
                textTransform: 'none',
                fontSize: '0.875rem',
                color: 'text.secondary',
                bgcolor: 'grey.100',
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
                disabled={index > activeStep && !isStepValid(index)}
              />
            ))}
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          {renderStepContent(activeStep)}
        </Box>

        {/* Navigation Buttons */}
        <Box sx={{ p: 2, bgcolor: 'white', borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button
            onClick={handleCancel}
            disabled={loading}
            color="secondary"
            size="small"
          >
            Cancel
          </Button>
          
          <Button
            disabled={activeStep === 0 || loading}
            onClick={handleBack}
            startIcon={<ArrowBackIcon />}
            size="small"
          >
            Back
          </Button>
          
          <Button
            variant="contained"
            onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext}
            disabled={!isStepValid(activeStep) || loading}
            startIcon={loading ? <CircularProgress size={20} /> : undefined}
            endIcon={activeStep !== steps.length - 1 ? <ArrowForwardIcon /> : undefined}
            size="small"
          >
            {loading ? 'Submitting...' : activeStep === steps.length - 1 ? 'Submit Capture' : 'Next'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default LearnerPermitCaptureFormPage; 