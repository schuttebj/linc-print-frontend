/**
 * Learner's Permit Capture Form Page - COMPACT VERSION
 * Condensed, keyboard-friendly design with no scrolling required
 * 
 * Design Goals:
 * - Fits entirely in viewport (no scrolling)
 * - Keyboard-first navigation
 * - Minimal visual clutter
 * - Standardized layout system
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Alert,
  CircularProgress,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip,
  Divider,
  Paper
} from '@mui/material';
import {
  Person as PersonIcon,
  Description as LicenseIcon,
  CheckCircle as ReviewIcon,
  LocationOn as LocationIcon,
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
  Save as SubmitIcon
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

// Compact reusable components
interface CompactSectionProps {
  title: string;
  children: React.ReactNode;
  required?: boolean;
}

const CompactSection: React.FC<CompactSectionProps> = ({ title, children, required }) => (
  <Box sx={{ mb: 1.5 }}>
    <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
      {title}{required && ' *'}
    </Typography>
    {children}
  </Box>
);

interface InlineFieldProps {
  label: string;
  value: string;
  xs?: number;
  md?: number;
}

const InlineField: React.FC<InlineFieldProps> = ({ label, value, xs = 12, md = 6 }) => (
  <Grid item xs={xs} md={md}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80 }}>
        {label}:
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value || 'N/A'}
      </Typography>
    </Box>
  </Grid>
);

const LearnerPermitCaptureCompactPage: React.FC = () => {
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

  // Refs for keyboard navigation
  const contentRef = useRef<HTMLDivElement>(null);
  const locationSelectRef = useRef<HTMLSelectElement>(null);

  // Step definitions
  const steps = [
    { label: 'Person', icon: <PersonIcon fontSize="small" />, key: 'person' },
    { label: 'License', icon: <LicenseIcon fontSize="small" />, key: 'license' },
    { label: 'Review', icon: <ReviewIcon fontSize="small" />, key: 'review' }
  ];

  // Keyboard navigation hook
  const useKeyboardNavigation = useCallback(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'ArrowLeft':
            event.preventDefault();
            if (activeStep > 0) setActiveStep(activeStep - 1);
            break;
          case 'ArrowRight':
            event.preventDefault();
            if (activeStep < steps.length - 1 && isStepValid(activeStep)) {
              setActiveStep(activeStep + 1);
            }
            break;
          case 'Enter':
            event.preventDefault();
            if (activeStep === steps.length - 1 && isStepValid(activeStep)) {
              handleSubmit();
            } else if (isStepValid(activeStep)) {
              setActiveStep(activeStep + 1);
            }
            break;
        }
      }
    };

    useEffect(() => {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [activeStep]);
  }, [activeStep]);

  // Initialize keyboard navigation
  useKeyboardNavigation();

  // Auto-focus management
  useEffect(() => {
    if (activeStep === 1 && !user?.primary_location_id && locationSelectRef.current) {
      setTimeout(() => locationSelectRef.current?.focus(), 100);
    }
  }, [activeStep, user?.primary_location_id]);

  // Load available locations
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
        return !!selectedPerson?.id;
      case 1:
        const hasLicenseData = !!licenseCaptureData && licenseCaptureData.captured_licenses.length > 0;
        const hasLocation = !!user?.primary_location_id || !!selectedLocationId;
        return hasLicenseData && hasLocation && !!selectedPerson?.id;
      case 2:
        return !!selectedPerson?.id && !!licenseCaptureData && licenseCaptureData.captured_licenses.length > 0;
      default:
        return false;
    }
  };

  const isStepAccessible = (step: number): boolean => {
    if (step === 0) return true;
    if (step === 1) return isStepValid(0);
    if (step === 2) return isStepValid(0) && isStepValid(1);
    return false;
  };

  // Navigation handlers
  const handleStepClick = (event: React.SyntheticEvent, newValue: number) => {
    if (isStepAccessible(newValue)) {
      setActiveStep(newValue);
    }
  };

  const handleNext = () => {
    if (activeStep < steps.length - 1 && isStepValid(activeStep)) {
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

  // Form handlers
  const handlePersonSelected = (person: Person) => {
    setSelectedPerson(person);
    setError('');
    // Auto-advance to next step
    setTimeout(() => setActiveStep(1), 300);
  };

  const handleLicenseCaptureChange = (data: LicenseCaptureData | null) => {
    setLicenseCaptureData(data);
    setError('');
  };

  const handleLocationChange = (event: any) => {
    setSelectedLocationId(event.target.value);
    setError('');
  };

  const getLocationId = (): string => {
    return user?.primary_location_id || selectedLocationId;
  };

  // Initialize license capture with default license
  useEffect(() => {
    if (selectedPerson && !licenseCaptureData) {
      const newLicense: CapturedLicense = {
        id: `license-${Date.now()}`,
        license_category: LicenseCategory.LEARNERS_1,
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

  // Handle submission
  const handleSubmit = async () => {
    if (!selectedPerson || !licenseCaptureData) {
      setError('Missing required data for submission');
      return;
    }

    if (!selectedPerson.id) {
      setError('Person ID is missing. Please go back and reselect the person.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const locationId = getLocationId();
      if (!locationId) {
        setError('Location is required. Please select a location.');
        return;
      }

      const firstCapturedCategory = licenseCaptureData.captured_licenses[0]?.license_category;
      const categoryValue = firstCapturedCategory || LicenseCategory.LEARNERS_1;

      const applicationData = {
        person_id: selectedPerson.id,
        location_id: locationId,
        application_type: ApplicationType.LEARNERS_PERMIT_CAPTURE,
        license_category: categoryValue,
        license_capture: licenseCaptureData
      };

      const application = await applicationService.createApplication(applicationData);
      
      // Complete the workflow
      await applicationService.updateApplicationStatus(application.id, ApplicationStatus.SUBMITTED);
      await applicationService.updateApplicationStatus(application.id, ApplicationStatus.APPROVED);
      await applicationService.updateApplicationStatus(application.id, ApplicationStatus.COMPLETED);
      
      setSuccess('Learner\'s permit capture completed successfully!');
      
      setTimeout(() => {
        navigate('/dashboard/applications/dashboard', {
          state: { 
            message: 'Learner\'s permit capture completed successfully',
            application 
          }
        });
      }, 1500);

    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'Failed to submit learner\'s permit capture');
    } finally {
      setLoading(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // Person step
        return (
          <PersonFormWrapper
            mode="application"
            onSuccess={handlePersonSelected}
            title=""
            subtitle=""
            showHeader={false}
          />
        );

      case 1: // License capture step
        return (
          <Box>
            {/* Location Selection for Admin Users */}
            {user && !user.primary_location_id && (
              <CompactSection title="Processing Location" required>
                <FormControl 
                  size="small" 
                  fullWidth 
                  required 
                  error={!!error && !selectedLocationId}
                  sx={{ mb: 2 }}
                >
                  <InputLabel>Location</InputLabel>
                  <Select
                    ref={locationSelectRef}
                    value={selectedLocationId}
                    onChange={handleLocationChange}
                    label="Location"
                  >
                    {availableLocations.map((location) => (
                      <MenuItem key={location.id} value={location.id}>
                        {location.name} ({location.code})
                      </MenuItem>
                    ))}
                  </Select>
                  {!!error && !selectedLocationId && (
                    <FormHelperText>Please select a processing location</FormHelperText>
                  )}
                </FormControl>
              </CompactSection>
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
            {/* Location */}
            <CompactSection title="Processing Location">
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationIcon fontSize="small" color="primary" />
                {user?.primary_location_id ? (
                  `User's assigned location: ${user.primary_location_id}`
                ) : (
                  availableLocations.find(loc => loc.id === selectedLocationId)?.name || 'No location selected'
                )}
                {selectedLocationId && (
                  <Chip 
                    label={availableLocations.find(loc => loc.id === selectedLocationId)?.code || selectedLocationId} 
                    size="small" 
                    variant="outlined"
                  />
                )}
              </Typography>
            </CompactSection>

            <Divider sx={{ my: 1.5 }} />

            {/* Person Details */}
            <CompactSection title="Permit Holder">
              <Grid container spacing={1}>
                <InlineField 
                  label="Name" 
                  value={`${selectedPerson?.surname}, ${selectedPerson?.first_name} ${selectedPerson?.middle_name || ''}`} 
                />
                <InlineField 
                  label="ID" 
                  value={selectedPerson?.aliases?.find(alias => alias.is_primary)?.document_number} 
                />
                <InlineField 
                  label="Birth Date" 
                  value={selectedPerson?.birth_date} 
                />
                <InlineField 
                  label="Nationality" 
                  value={selectedPerson?.nationality_code} 
                />
              </Grid>
            </CompactSection>

            <Divider sx={{ my: 1.5 }} />

            {/* Captured Licenses */}
            <CompactSection title={`Captured Permits (${licenseCaptureData?.captured_licenses?.length || 0})`}>
              {licenseCaptureData?.captured_licenses?.map((license, index) => (
                <Box 
                  key={license.id} 
                  sx={{ 
                    p: 1, 
                    bgcolor: 'grey.50', 
                    borderRadius: 1, 
                    border: 1, 
                    borderColor: 'grey.200',
                    mb: index < (licenseCaptureData?.captured_licenses?.length || 0) - 1 ? 1 : 0
                  }}
                >
                  <Grid container spacing={1} alignItems="center">
                    <Grid item xs={12} sm={3}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">ID:</Typography>
                        <Chip label={license.id.substring(0, 8)} size="small" />
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">Category:</Typography>
                        <Chip label={license.license_category} size="small" color="primary" />
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">Issued:</Typography>
                        <Typography variant="body2">{license.issue_date}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="caption" color="text.secondary">Restrictions:</Typography>
                        {license.restrictions?.driver_restrictions?.length > 0 || license.restrictions?.vehicle_restrictions?.length > 0 ? (
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {license.restrictions?.driver_restrictions?.map((restriction, rIndex) => (
                              <Chip key={rIndex} label={restriction} size="small" variant="outlined" color="primary" />
                            ))}
                            {license.restrictions?.vehicle_restrictions?.map((restriction, rIndex) => (
                              <Chip key={rIndex} label={restriction} size="small" variant="outlined" color="secondary" />
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">None</Typography>
                        )}
                      </Box>
                    </Grid>
                    {license.verification_notes && (
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">Notes: </Typography>
                        <Typography variant="body2" component="span">{license.verification_notes}</Typography>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              ))}
            </CompactSection>

            <Alert severity="info" sx={{ mt: 2, py: 1 }}>
              <Typography variant="body2">
                <strong>Next:</strong> Captured permits will be created and marked as completed. 
                Permit holder can apply for full licenses based on these credentials.
              </Typography>
            </Alert>
          </Box>
        );

      default:
        return <Typography>Unknown step</Typography>;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 1, px: 2, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Compact Header */}
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 600 }}>
          Learner's Permit Capture
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Capture existing learner's permit details • Use Ctrl+← → to navigate steps • Ctrl+Enter to submit
        </Typography>
      </Box>

      {/* Error/Success Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 1.5, py: 0.5 }}>
          <Typography variant="body2">{error}</Typography>
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 1.5, py: 0.5 }}>
          <Typography variant="body2">{success}</Typography>
        </Alert>
      )}

      {/* Horizontal Step Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs 
          value={activeStep} 
          onChange={handleStepClick}
          variant="fullWidth"
          sx={{ minHeight: 48 }}
        >
          {steps.map((step, index) => (
            <Tab
              key={step.key}
              label={step.label}
              icon={step.icon}
              iconPosition="start"
              disabled={!isStepAccessible(index)}
              sx={{ 
                minHeight: 48,
                textTransform: 'none',
                fontWeight: isStepValid(index) ? 600 : 400,
                '&.Mui-selected': {
                  fontWeight: 600
                }
              }}
            />
          ))}
        </Tabs>
      </Box>

      {/* Content Area */}
      <Paper 
        elevation={1} 
        sx={{ 
          flex: 1, 
          p: 2, 
          overflow: 'auto',
          bgcolor: 'grey.50'
        }}
        ref={contentRef}
      >
        {renderStepContent()}
      </Paper>

      {/* Fixed Bottom Navigation */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          py: 1.5,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
      >
        <Button
          onClick={handleCancel}
          disabled={loading}
          color="secondary"
          size="small"
        >
          Cancel
        </Button>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            disabled={activeStep === 0 || loading}
            onClick={handleBack}
            startIcon={<BackIcon />}
            size="small"
          >
            Back
          </Button>
          
          <Button
            variant="contained"
            onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext}
            disabled={!isStepValid(activeStep) || loading}
            startIcon={loading ? <CircularProgress size={16} /> : undefined}
            endIcon={
              loading ? undefined : 
              activeStep === steps.length - 1 ? <SubmitIcon /> : <NextIcon />
            }
            size="small"
          >
            {loading ? 'Submitting...' : activeStep === steps.length - 1 ? 'Submit' : 'Next'}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default LearnerPermitCaptureCompactPage;