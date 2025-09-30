/**
 * Driver's License Capture Form Page
 * Focused form for DRIVERS_LICENSE_CAPTURE applications only
 * 
 * Workflow: Person Selection (A) → License Capture → Review & Submit
 */

import React, { useState, useEffect, useRef } from 'react';
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
  FormHelperText,
  Backdrop
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
import { useNotification } from '../../contexts/NotificationContext';
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
import { CapturedLicense, validateCapturedDataForAuthorization } from '../../components/applications/LicenseCaptureForm';
import { API_ENDPOINTS, getAuthToken } from '../../config/api';

const DriverLicenseCaptureFormPage: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess } = useNotification();
  const navigate = useNavigate();

  // Form state
  const [activeStep, setActiveStep] = useState(0);
  const [personStep, setPersonStep] = useState(0);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [licenseCaptureData, setLicenseCaptureData] = useState<LicenseCaptureData | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Person form validation state
  const [personFormValid, setPersonFormValid] = useState(false);

  // Steps for driver's license capture
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
      if (user && user.user_type !== 'LOCATION_USER' && !user.primary_location) {
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
        // Person step is valid if we have a person (PersonFormWrapper handles its own validation)
        return !!selectedPerson && !!selectedPerson.id;
      case 1:
        // Check license capture data validation and location for admin users
        const hasValidLicenseData = !!licenseCaptureData && 
          licenseCaptureData.captured_licenses.length > 0 &&
          validateCapturedDataForAuthorization(licenseCaptureData).isValid;
        const hasLocation = !!user?.primary_location?.id || !!selectedLocationId;
        const hasPerson = !!selectedPerson && !!selectedPerson.id;
        
        // Removed excessive validation logging to prevent memory issues
        
        return hasValidLicenseData && hasLocation && hasPerson;
      case 2:
        return !!selectedPerson && !!selectedPerson.id && !!licenseCaptureData && 
          licenseCaptureData.captured_licenses.length > 0 &&
          validateCapturedDataForAuthorization(licenseCaptureData).isValid;
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
    return user?.primary_location?.id || selectedLocationId;
  };

  // Person step validation state
  const handlePersonValidationChange = (step: number, isValid: boolean) => {
    console.log('🎯 PersonFormWrapper validation callback:', { step, isValid });
    setPersonFormValid(isValid);
  };
  
  const isPersonStepValid = (): boolean => {
    // Use the actual validation state from PersonFormWrapper
    return personFormValid;
  };

  // Tab change handler
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    // Allow navigation to previous/completed steps or the next step if current is valid
    if (newValue <= activeStep || (newValue === activeStep + 1 && isStepValid(activeStep))) {
      setActiveStep(newValue);
    }
  };

  // Person step change handler
  const handlePersonStepChange = (step: number, canAdvance: boolean) => {
    console.log('🎯 DriverLicenseCaptureFormPage: handlePersonStepChange called with step:', step, 'canAdvance:', canAdvance);
    setPersonStep(step);
  };

  // Navigation handlers
  const handleNext = () => {
    // Person form handles its own navigation, we only handle non-person steps
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

  // Person selection handler - do NOT auto-advance, let user confirm on review step
  const handlePersonSelected = (person: Person) => {
    console.log('🎯 Person selected from PersonFormWrapper:', person);
    console.log('🎯 Person ID:', person?.id);
    console.log('🎯 Person full data:', JSON.stringify(person, null, 2));
    setSelectedPerson(person);
    setError('');
    
    // Do NOT auto-advance - let PersonFormWrapper handle navigation to review step
    // User will manually click "Continue to License" from review step
    console.log('🎯 Person form completed - staying on person step, user will advance manually from review');
  };

  // Handler for when user confirms to continue to license from person review
  const handleContinueToLicense = () => {
    console.log('🎯 User confirmed to continue to license capture');
    setActiveStep(1);
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
        restrictions: {
          driver_restrictions: ['00'], // Default to "00 - None"
          vehicle_restrictions: ['00']  // Default to "00 - None"
        },
        verified: false,
        verification_notes: ''
      };

      setLicenseCaptureData({
        captured_licenses: [defaultLicense],
        application_type: ApplicationType.DRIVERS_LICENSE_CAPTURE
      });
    }
  }, [selectedPerson, licenseCaptureData]);

  // Helper function to render tab with completion indicator
  const renderTabLabel = (step: any, index: number) => {
    // Only show completed checkmark for steps that are behind the current step AND valid
    // Don't show completed for future steps or the current step
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
      
      // Show global success notification and navigate immediately
      showSuccess('Driver\'s license capture completed successfully! License records have been created.');
      
      navigate('/dashboard/applications/dashboard', {
        state: { 
          message: 'Driver\'s license capture completed successfully',
          application 
        }
      });

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

  // Render step content (excluding Person step which is handled separately)
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // Person step - handled separately to preserve state
        return null;

      case 1: // License capture step
        return (
          <Box>
            {/* Location Selection for Admin Users */}
            {user && user.user_type !== 'LOCATION_USER' && !user.primary_location && (
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
                  <FormControl 
                    fullWidth 
                    required 
                    size="small" 
                    error={!!error && !selectedLocationId}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderWidth: '2px',
                          borderColor: !selectedLocationId ? '#ff9800' : undefined,
                          transition: 'border-color 0.2s ease-in-out',
                        },
                        '&:hover fieldset': {
                          borderWidth: '2px',
                          borderColor: !selectedLocationId ? '#f57c00' : undefined,
                        },
                        '&.Mui-focused fieldset': {
                          borderWidth: '2px',
                          borderColor: !selectedLocationId ? '#ff9800' : undefined,
                        },
                      },
                    }}
                  >
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
                    {!selectedLocationId && (
                      <FormHelperText sx={{ color: '#ff9800' }}>This field is required</FormHelperText>
                    )}
                  </FormControl>
                </CardContent>
              </Card>
            )}

            {/* License Capture Form - scrolling handled by parent container */}
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
          <Paper 
            elevation={0}
            sx={{ 
              bgcolor: 'white',
              boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
              borderRadius: 2
            }}
          >
            <Box sx={{ p: 1.5 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, fontSize: '1rem', mb: 1 }}>
                Review & Submit
              </Typography>

              <Alert severity="info" sx={{ mb: 1.5, py: 0.5 }}>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  Please review the driver's license capture details before submission.
                </Typography>
              </Alert>

              {/* Person Summary - Compact */}
              <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                  License Holder
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Full Name</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {selectedPerson?.surname}, {selectedPerson?.first_name} {selectedPerson?.middle_name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Madagascar ID</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {selectedPerson?.aliases?.find(alias => alias.is_primary)?.document_number || 'Not available'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Processing Location - Compact */}
              <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                  Processing Location
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Location</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {user?.primary_location ? (
                        `User's assigned location: ${user.primary_location.name}`
                      ) : (
                        availableLocations.find(loc => loc.id === selectedLocationId)?.name || 'No location selected'
                      )}
                      {selectedLocationId && (
                        <Chip 
                          label={availableLocations.find(loc => loc.id === selectedLocationId)?.code || selectedLocationId} 
                          size="small" 
                          sx={{ ml: 1, fontSize: '0.6rem', height: '18px' }}
                        />
                      )}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Captured Licenses - Detailed */}
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                Captured Driver's Licenses ({licenseCaptureData?.captured_licenses?.length || 0})
              </Typography>
              {licenseCaptureData?.captured_licenses?.map((license, index) => (
                <Box key={license.id} sx={{ mb: 0.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                  <Grid container spacing={1}>
                    <Grid item xs={12} md={3}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Category</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                          Code {license.license_category}
                        </Typography>
                        <Chip
                          label={license.verified ? 'Verified' : 'Pending'}
                          size="small"
                          color={license.verified ? 'success' : 'warning'}
                          sx={{ fontSize: '0.6rem', height: '18px' }}
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Issue Date</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                        {license.issue_date || 'Not provided'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Restrictions</Typography>
                      {(license.restrictions?.driver_restrictions?.length > 0 || license.restrictions?.vehicle_restrictions?.length > 0) ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                          {license.restrictions?.driver_restrictions?.map((restriction, rIndex) => (
                            <Chip 
                              key={rIndex} 
                              label={restriction} 
                              size="small" 
                              variant="outlined"
                              color="primary"
                              sx={{ fontSize: '0.6rem', height: '18px' }}
                            />
                          ))}
                          {license.restrictions?.vehicle_restrictions?.map((restriction, rIndex) => (
                            <Chip 
                              key={rIndex} 
                              label={restriction} 
                              size="small" 
                              variant="outlined"
                              color="secondary"
                              sx={{ fontSize: '0.6rem', height: '18px' }}
                            />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>None</Typography>
                      )}
                    </Grid>
                    {license.verification_notes && (
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Verification Notes</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                          {license.verification_notes}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              ))}

              {/* Summary */}
              <Alert severity="info" sx={{ mt: 1.5, py: 0.5 }}>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  <strong>Next Steps:</strong> After submission, captured driver's license records will be created in the system 
                  and marked as completed. The license holder will be able to apply for new Madagascar licenses 
                  based on their captured credentials.
                </Typography>
              </Alert>
            </Box>
          </Paper>
        );

      default:
        return <Typography>Unknown step</Typography>;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper 
        elevation={0}
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#f8f9fa',
          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >


        {/* Error Messages */}
        {error && (
          <Alert severity="error" sx={{ mx: 2, mt: 2 }}>
            {error}
          </Alert>
        )}

        {/* Application Tabs - Fixed Height */}
        <Box sx={{ 
          bgcolor: 'white', 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          flexShrink: 0 // Prevent shrinking
        }}>
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
                disabled={index > activeStep + 1 || (index === activeStep + 1 && !isStepValid(activeStep))}
              />
            ))}
          </Tabs>
        </Box>

        {/* Tab Content - Scrollable Area */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'hidden', // Let wrapper components scroll internally
          minHeight: 0, // Allow flex shrinking
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Person Form - Always rendered but conditionally visible */}
          <Box sx={{ 
            display: activeStep === 0 ? 'flex' : 'none',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0, // Allow flex shrinking
            width: '100%'
          }}>
            <PersonFormWrapper
              key="person-form-wrapper" // Stable key to preserve component instance
              mode="application"
              externalPersonStep={personStep}
              onSuccess={handlePersonSelected}
              onPersonValidationChange={handlePersonValidationChange}
              onPersonStepChange={handlePersonStepChange}
              onContinueToApplication={handleContinueToLicense}
              onComplete={handleContinueToLicense} // For new persons to advance to next step
              onCancel={handleCancel}
              title=""
              subtitle="Select existing person or register new driver's license holder"
              showHeader={false}
            />
          </Box>
          
          {/* Other step content - Enable scrolling for direct content */}
          {activeStep !== 0 && (
            <Box sx={{ 
              flex: 1, 
              minHeight: 0, 
              width: '100%',
              overflow: 'auto', // Use global scrollbar styling
              p: 2,
            }}>
              {renderStepContent(activeStep)}
            </Box>
          )}
        </Box>

        {/* Navigation Footer - Fixed at bottom */}
        {activeStep !== 0 && (
          <Box sx={{ 
            p: 2, 
            bgcolor: 'white', 
            borderTop: '1px solid', 
            borderColor: 'divider',
            flexShrink: 0, // Keep footer visible
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: 1 
          }}>
            <Button
              onClick={handleCancel}
              disabled={loading}
              color="secondary"
              size="small"
            >
              Cancel
            </Button>
            
            <Button
              disabled={loading}
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
              {loading ? 'Submitting...' : 
               activeStep === steps.length - 1 ? 'Submit Capture' : 
               'Next'}
            </Button>
          </Box>
        )}

        {/* Loading Backdrop */}
        <Backdrop
          sx={{ 
            color: '#fff', 
            zIndex: (theme) => theme.zIndex.drawer + 1,
            flexDirection: 'column',
            gap: 2
          }}
          open={loading}
        >
          <CircularProgress color="inherit" size={60} />
          <Typography variant="h6" color="inherit">
            Submitting driver's license capture...
          </Typography>
          <Typography variant="body2" color="inherit" sx={{ opacity: 0.8 }}>
            Please wait while we process your submission
          </Typography>
        </Backdrop>

      </Paper>
    </Container>
  );
};

export default DriverLicenseCaptureFormPage; 