/**
 * Learner's Permit Capture Form Page
 * Focused form for LEARNERS_PERMIT_CAPTURE applications only
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
  Backdrop,
  Snackbar
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
import { CapturedLicense, validateCapturedDataForAuthorization } from '../../components/applications/LicenseCaptureForm';
import { API_ENDPOINTS, getAuthToken } from '../../config/api';
import { useScrollbarDetection } from '../../hooks/useScrollbarDetection';

const LearnerPermitCaptureFormPage: React.FC = () => {
  const { user } = useAuth();
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
  const [success, setSuccess] = useState<string>('');
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);

  // Person form navigation refs - no longer needed with dual navigation
  // const personNextRef = useRef<() => Promise<boolean>>();
  // const personBackRef = useRef<() => boolean>();

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

  // Person step validation state
  const [personFormValid, setPersonFormValid] = useState(false);

  // Scrollbar detection for LicenseCaptureForm
  const scrollableRef = useRef<HTMLDivElement>(null);
  const hasScrollbar = useScrollbarDetection(scrollableRef);
  
  // Person step validation callback from PersonFormWrapper
  const handlePersonValidationChange = (step: number, isValid: boolean) => {
    console.log('🎯 PersonFormWrapper validation callback:', { step, isValid });
    setPersonFormValid(isValid);
  };
  
  const isPersonStepValid = (): boolean => {
    // Use the actual validation state from PersonFormWrapper
    return personFormValid;
  };

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
        const hasLocation = !!user?.primary_location_id || !!selectedLocationId;
        const hasPerson = !!selectedPerson && !!selectedPerson.id;
        
        // Removed excessive validation logging to prevent memory issues
        /*console.log('🔍 Step 1 validation debug:', {
          hasValidLicenseData,
          hasLocation,
          hasPerson,
          userPrimaryLocation: user?.primary_location_id,
          selectedLocationId,
          licenseCaptureData,
          selectedPerson: selectedPerson?.id,
          selectedPersonFull: selectedPerson
        });*/
        
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
    return user?.primary_location_id || selectedLocationId;
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
    console.log('🎯 LearnerPermitCaptureFormPage: handlePersonStepChange called with step:', step, 'canAdvance:', canAdvance);
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
      const newLicense: CapturedLicense = {
        id: `license-${Date.now()}`,
        license_category: LicenseCategory.L1, // Default to L1 (only valid database value)
        issue_date: '',
        restrictions: {
          driver_restrictions: ['00'], // Default to "00 - None"
          vehicle_restrictions: ['00']  // Default to "00 - None"
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
      // Note: Backend expects enum values ('1', '2', '3') not enum keys ('L1')
      const firstCapturedCategory = licenseCaptureData.captured_licenses[0]?.license_category;
      
      // Use the enum value directly (L1 = '1', L2 = '2', L3 = '3')
      const categoryValue = firstCapturedCategory || LicenseCategory.L1;

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
      setShowSuccessSnackbar(true);
      
      // Navigate to applications dashboard after showing success
      setTimeout(() => {
        navigate('/dashboard/applications/dashboard', {
          state: { 
            message: 'Learner\'s permit capture completed successfully',
            application 
          }
        });
      }, 3000);

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

  // Render step content (excluding Person step which is handled separately)
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // Person step - handled separately to preserve state
        return null;

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

            <Box
              ref={scrollableRef}
              sx={{
                // Conditional padding based on scrollbar presence
                pr: hasScrollbar ? 1 : 0,
                // Custom scrollbar styling
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  background: '#f1f1f1',
                  borderRadius: '4px',
                  marginRight: '2px', // Small gap from content
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#c1c1c1',
                  borderRadius: '4px',
                  '&:hover': {
                    background: '#a8a8a8',
                  },
                },
                // Firefox scrollbar
                scrollbarWidth: 'thin',
                scrollbarColor: '#c1c1c1 #f1f1f1',
              }}
            >
              <LicenseCaptureForm
                applicationtype={ApplicationType.LEARNERS_PERMIT_CAPTURE}
                value={licenseCaptureData}
                onChange={handleLicenseCaptureChange}
                personBirthDate={selectedPerson?.birth_date}
              />
            </Box>

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
                  Please review the learner's permit capture details before submission.
                </Typography>
              </Alert>

              {/* Person Summary - Compact */}
              <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                  Permit Holder
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
                      {user?.primary_location_id ? (
                        `User's assigned location: ${user.primary_location_id}`
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
                Captured Learner's Permits ({licenseCaptureData?.captured_licenses?.length || 0})
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
                  <strong>Next Steps:</strong> After submission, captured learner's permit records will be created in the system 
                  and marked as completed. The permit holder will be able to apply for full driver's licenses 
                  based on their captured learner's permit credentials.
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
          overflow: 'hidden', // Let components scroll internally
          p: activeStep === 0 ? 0 : 2,
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
              subtitle="Select existing person or register new learner's permit holder"
              showHeader={false}
            />
          </Box>
          
          {/* Other step content */}
          {activeStep !== 0 && (
            <Box sx={{ flex: 1, minHeight: 0, width: '100%' }}>
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
            Submitting learner's permit capture...
          </Typography>
          <Typography variant="body2" color="inherit" sx={{ opacity: 0.8 }}>
            Please wait while we process your submission
          </Typography>
        </Backdrop>

        {/* Success Snackbar */}
        <Snackbar
          open={showSuccessSnackbar}
          autoHideDuration={5000}
          onClose={() => setShowSuccessSnackbar(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={() => setShowSuccessSnackbar(false)} 
            severity="info" 
            variant="filled"
            sx={{ 
              width: '100%',
              backgroundColor: 'rgb(25, 118, 210)',
              color: 'white',
              '& .MuiAlert-icon': {
                color: 'white'
              },
              '& .MuiAlert-action': {
                color: 'white'
              }
            }}
          >
            Learner's permit capture completed successfully!
          </Alert>
        </Snackbar>
      </Paper>
    </Container>
  );
};

export default LearnerPermitCaptureFormPage; 