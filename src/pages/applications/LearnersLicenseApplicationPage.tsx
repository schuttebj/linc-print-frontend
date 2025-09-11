/**
 * Learner's License Application Page
 * Focused form for LEARNERS_PERMIT applications only
 * 
 * Workflow: Person Selection (A) → Category Selection (B) → Medical Assessment (D) → Review & Submit
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
  FormHelperText,
  FormControlLabel,
  Checkbox,
  TextField,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Stack,
  Collapse,
  IconButton,
  Backdrop
} from '@mui/material';
import {
  PersonSearch as PersonSearchIcon,
  Assignment as AssignmentIcon,
  LocalHospital as MedicalIcon,
  LocalHospital as LocalHospitalIcon,
  CameraAlt as CameraIcon,
  Preview as PreviewIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  LocationOn as LocationOnIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import PersonFormWrapper from '../../components/PersonFormWrapper';
import MedicalInformationSection from '../../components/applications/MedicalInformationSection';
import BiometricCaptureStep, { BiometricData } from '../../components/applications/BiometricCaptureStep';
import { applicationService } from '../../services/applicationService';
import {
  Person,
  ApplicationStatus,
  ApplicationType,
  ApplicationCreate,
  LicenseCategory,
  Location,
  MedicalInformation,
  LEARNERS_PERMIT_RULES,
  requiresMedicalAlways,
  requiresMedical60Plus
} from '../../types';
import { API_ENDPOINTS, getAuthToken } from '../../config/api';

const LearnersLicenseApplicationPage: React.FC = () => {
  const { user } = useAuth();
  const { showSuccess } = useNotification();
  const navigate = useNavigate();

  // Form state
  const [activeStep, setActiveStep] = useState(0);
  const [personStep, setPersonStep] = useState(0);
  const [medicalStep, setMedicalStep] = useState(0);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personFormValid, setPersonFormValid] = useState(false);
  const [medicalFormValid, setMedicalFormValid] = useState(false);
  const [biometricFormValid, setBiometricFormValid] = useState(false);
  const [biometricStep, setBiometricStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<LicenseCategory>('' as LicenseCategory);
  const [neverBeenRefused, setNeverBeenRefused] = useState<boolean>(true);
  const [refusalDetails, setRefusalDetails] = useState<string>('');
  const [medicalInformation, setMedicalInformation] = useState<MedicalInformation | null>(null);
  const [biometricData, setBiometricData] = useState<BiometricData>({});
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const [existingLicenses, setExistingLicenses] = useState<any[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [showExisting, setShowExisting] = useState(false);
  const [visionTestData, setVisionTestData] = useState<any>(null);
  const [medicalDeclarationData, setMedicalDeclarationData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Form validation helper functions
  const getFieldStyling = (fieldName: string, value: any, isRequired: boolean = true) => {
    let fieldState = 'default';
    
    if (isRequired && (!value || (typeof value === 'string' && value.trim() === ''))) {
      fieldState = 'required';
    } else if (value && value.trim() !== '') {
      fieldState = 'valid';
    }

    const baseSx = {
      '& .MuiOutlinedInput-root': {
        '& fieldset': {
          borderWidth: '2px',
          transition: 'border-color 0.2s ease-in-out',
        },
        '&:hover fieldset': {
          borderWidth: '2px',
        },
        '&.Mui-focused fieldset': {
          borderWidth: '2px',
        },
      },
    };

    switch (fieldState) {
      case 'required':
        return {
          sx: {
            ...baseSx,
            '& .MuiOutlinedInput-root': {
              ...baseSx['& .MuiOutlinedInput-root'],
              '& fieldset': {
                ...baseSx['& .MuiOutlinedInput-root']['& fieldset'],
                borderColor: '#ff9800', // Orange for required fields
              },
              '&:hover fieldset': {
                ...baseSx['& .MuiOutlinedInput-root']['&:hover fieldset'],
                borderColor: '#f57c00', // Darker orange on hover
              },
              '&.Mui-focused fieldset': {
                ...baseSx['& .MuiOutlinedInput-root']['&.Mui-focused fieldset'],
                borderColor: '#ff9800', // Orange when focused
              },
            },
          },
          error: false,
          helperText: isRequired ? 'This field is required' : undefined,
        };

      case 'valid':
        return {
          sx: {
            ...baseSx,
            '& .MuiOutlinedInput-root': {
              ...baseSx['& .MuiOutlinedInput-root'],
              '& fieldset': {
                ...baseSx['& .MuiOutlinedInput-root']['& fieldset'],
                borderColor: '#4caf50', // Green for valid fields
              },
              '&:hover fieldset': {
                ...baseSx['& .MuiOutlinedInput-root']['&:hover fieldset'],
                borderColor: '#388e3c', // Darker green on hover
              },
              '&.Mui-focused fieldset': {
                ...baseSx['& .MuiOutlinedInput-root']['&.Mui-focused fieldset'],
                borderColor: '#4caf50', // Green when focused
              },
            },
          },
          error: false,
          helperText: undefined,
        };

      default:
        return {
          sx: baseSx,
          error: false,
          helperText: undefined,
        };
    }
  };

  const getSelectStyling = (fieldName: string, value: any, isRequired: boolean = true) => {
    let fieldState = 'default';
    
    if (isRequired && (!value || value === '')) {
      fieldState = 'required';
    } else if (value && value !== '') {
      fieldState = 'valid';
    }

    const baseSx = {
      '& .MuiOutlinedInput-root': {
        '& fieldset': {
          borderWidth: '2px',
          transition: 'border-color 0.2s ease-in-out',
        },
        '&:hover fieldset': {
          borderWidth: '2px',
        },
        '&.Mui-focused fieldset': {
          borderWidth: '2px',
        },
      },
    };

    switch (fieldState) {
      case 'required':
        return {
          sx: {
            ...baseSx,
            '& .MuiOutlinedInput-root': {
              ...baseSx['& .MuiOutlinedInput-root'],
              '& fieldset': {
                ...baseSx['& .MuiOutlinedInput-root']['& fieldset'],
                borderColor: '#ff9800', // Orange for required fields
              },
              '&:hover fieldset': {
                ...baseSx['& .MuiOutlinedInput-root']['&:hover fieldset'],
                borderColor: '#f57c00', // Darker orange on hover
              },
              '&.Mui-focused fieldset': {
                ...baseSx['& .MuiOutlinedInput-root']['&.Mui-focused fieldset'],
                borderColor: '#ff9800', // Orange when focused
              },
            },
          },
          error: false,
        };

      case 'valid':
        return {
          sx: {
            ...baseSx,
            '& .MuiOutlinedInput-root': {
              ...baseSx['& .MuiOutlinedInput-root'],
              '& fieldset': {
                ...baseSx['& .MuiOutlinedInput-root']['& fieldset'],
                borderColor: '#4caf50', // Green for valid fields
              },
              '&:hover fieldset': {
                ...baseSx['& .MuiOutlinedInput-root']['&:hover fieldset'],
                borderColor: '#388e3c', // Darker green on hover
              },
              '&.Mui-focused fieldset': {
                ...baseSx['& .MuiOutlinedInput-root']['&.Mui-focused fieldset'],
                borderColor: '#4caf50', // Green when focused
              },
            },
          },
          error: false,
        };

      default:
        return {
          sx: baseSx,
          error: false,
        };
    }
  };

  // Steps for learner's license application
  const steps = [
    {
      label: 'Person',
      icon: <PersonSearchIcon />
    },
    {
      label: 'Application Details',
      icon: <AssignmentIcon />
    },
    {
      label: 'Medical Assessment',
      icon: <MedicalIcon />
    },
    {
      label: 'Biometric Data',
      icon: <CameraIcon />
    },
    {
      label: 'Review',
      icon: <PreviewIcon />
    }
  ];

  // Available learner's permit categories
  const getAvailableLearnerCategories = () => {
    return [
      {
        value: LicenseCategory.L1,
        label: `Code 1 - ${LEARNERS_PERMIT_RULES['1']?.description || 'Learner\'s permit for motorcycles'}`,
        minAge: LEARNERS_PERMIT_RULES['1']?.minimum_age || 16,
        description: 'Motor cycle without a sidecar, motor tricycle or motor quadrucycle, with engine of any capacity'
      },
      {
        value: LicenseCategory.L2,
        label: `Code 2 - ${LEARNERS_PERMIT_RULES['2']?.description || 'Learner\'s permit for light vehicles'}`,
        minAge: LEARNERS_PERMIT_RULES['2']?.minimum_age || 17,
        description: 'Light motor vehicle, other than a motor cycle, motor tricycle or motor quadrucycle'
      },
      {
        value: LicenseCategory.L3,
        label: `Code 3 - ${LEARNERS_PERMIT_RULES['3']?.description || 'Learner\'s permit for any motor vehicle'}`,
        minAge: LEARNERS_PERMIT_RULES['3']?.minimum_age || 18,
        description: 'Any motor vehicle other than a motor cycle, motor tricycle or motor quadrucycle'
      }
    ];
  };

  // Calculate age helper
  const calculateAge = (birthDate: string): number => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

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

  // Load existing licenses when person is selected
  const loadExistingLicenses = async (personId: string) => {
    setLoadingExisting(true);
    try {
      console.log('Loading existing licenses for person:', personId);
      const response = await applicationService.getPersonLicenses(personId);
      console.log('Existing licenses response:', response);
      const licenses = response.system_licenses || [];
      setExistingLicenses(licenses);
    } catch (error) {
      console.error('Error loading existing licenses:', error);
      setExistingLicenses([]);
    } finally {
      setLoadingExisting(false);
    }
  };

  // Load existing licenses when person changes
  useEffect(() => {
    if (selectedPerson?.id) {
      loadExistingLicenses(selectedPerson.id);
    }
  }, [selectedPerson?.id]);

  // Tab label renderer with completion indicators
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

  // Step validation
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!selectedPerson && !!selectedPerson.id;
      case 1:
        const hasCategory = !!selectedCategory;
        const hasLocation = !!user?.primary_location_id || !!selectedLocationId;
        const hasRefusalInfo = neverBeenRefused || !!refusalDetails.trim();
        return hasCategory && hasLocation && hasRefusalInfo && !!selectedPerson && !!selectedPerson.id;
      case 2:
        // Medical assessment validation (both vision and medical)
        const age = selectedPerson?.birth_date ? calculateAge(selectedPerson.birth_date) : 0;
        const isMedicalMandatory = requiresMedicalAlways(selectedCategory) || 
                                 (age >= 60 && requiresMedical60Plus(selectedCategory));
        return isMedicalMandatory ? !!medicalInformation?.medical_clearance : true;
      case 3:
        // Biometric step - photo is required for learners permits (signature not needed)
        return !!biometricData.photo;
      case 4:
        return !!selectedPerson && !!selectedPerson.id && !!selectedCategory && !!biometricData.photo;
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

  // PersonFormWrapper callbacks
  const handlePersonValidationChange = (step: number, isValid: boolean) => {
    console.log('🎯 PersonFormWrapper validation callback:', { step, isValid });
    setPersonFormValid(isValid);
  };

  const handlePersonStepChange = (step: number, canAdvance: boolean) => {
    console.log('🎯 PersonFormWrapper step change:', step, 'canAdvance:', canAdvance);
    setPersonStep(step);
  };

  const handleContinueToApplication = () => {
    console.log('🎯 User confirmed to continue to learner\'s license application');
    setActiveStep(1);
  };

  // Medical form callbacks (similar to PersonFormWrapper)
  const handleMedicalValidationChange = (step: number, isValid: boolean) => {
    console.log('🎯 MedicalInformationSection validation callback:', { step, isValid });
    setMedicalFormValid(isValid);
  };

  const handleMedicalStepChange = (step: number, canAdvance: boolean) => {
    console.log('🎯 MedicalInformationSection step change:', step, 'canAdvance:', canAdvance);
    setMedicalStep(step);
  };

  const handleContinueToBiometric = () => {
    console.log('🎯 User confirmed to continue to biometric capture');
    setActiveStep(3);
  };

  // Biometric form callbacks (similar to PersonFormWrapper and MedicalInformationSection)
  const handleBiometricValidationChange = (step: number, isValid: boolean) => {
    console.log('🎯 BiometricCaptureStep validation callback:', { step, isValid });
    setBiometricFormValid(isValid);
  };

  const handleBiometricStepChange = (step: number, canAdvance: boolean) => {
    console.log('🎯 BiometricCaptureStep step change:', step, 'canAdvance:', canAdvance);
    setBiometricStep(step);
  };

  const handleContinueToReview = () => {
    console.log('🎯 User confirmed to continue to review');
    setActiveStep(4);
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
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!selectedPerson || !selectedCategory) {
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

      // Check if medical is mandatory
      const age = selectedPerson?.birth_date ? calculateAge(selectedPerson.birth_date) : 0;
      const isMedicalMandatory = requiresMedicalAlways(selectedCategory) || 
                               (age >= 60 && requiresMedical60Plus(selectedCategory));

      // Clean medical information - only send if mandatory or if properly filled out
      let cleanMedicalInfo = null;
      if (medicalInformation && (isMedicalMandatory || medicalInformation.medical_clearance)) {
        cleanMedicalInfo = {
          ...medicalInformation,
          examination_date: medicalInformation.examination_date && medicalInformation.examination_date.trim() !== '' 
            ? medicalInformation.examination_date 
            : undefined
        };
      }

      // Create application data
      const applicationData: ApplicationCreate = {
        person_id: selectedPerson.id,
        location_id: locationId,
        application_type: ApplicationType.LEARNERS_PERMIT,
        license_category: selectedCategory,
        medical_information: cleanMedicalInfo,
        never_been_refused: neverBeenRefused,
        refusal_details: neverBeenRefused ? undefined : refusalDetails
      };

      console.log('User info:', user);
      console.log('Selected person object:', selectedPerson);
      console.log('Selected person ID:', selectedPerson.id);
      console.log('Selected location ID:', locationId);
      console.log('Selected category:', selectedCategory);
      console.log('Submitting application data:', applicationData);

      const application = await applicationService.createApplication(applicationData);
      
      // Show global success notification and navigate immediately
      showSuccess('Learner\'s license application submitted successfully!');
      
      navigate('/dashboard/applications/dashboard', {
        state: { 
          message: 'Learner\'s license application submitted successfully',
          application 
        }
      });

    } catch (err: any) {
      console.error('Submission error:', err);
      let errorMessage = 'Failed to submit learner\'s license application';
      
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
            key="person-form-wrapper"
            mode="application"
            externalPersonStep={personStep}
            onSuccess={handlePersonSelected}
            onPersonValidationChange={handlePersonValidationChange}
            onPersonStepChange={handlePersonStepChange}
            onContinueToApplication={handleContinueToApplication}
            onCancel={handleCancel}
            showHeader={false}
          />
        );

      case 1: // Application details step - Section B
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
                      <LocationOnIcon color="primary" fontSize="small" />
                      <Typography variant="subtitle1" sx={{ fontSize: '1rem', fontWeight: 600 }}>
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
                    {...getSelectStyling('location', selectedLocationId, true)}
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

            {/* Existing Licenses */}
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
                    <CheckCircleIcon color={existingLicenses.length > 0 ? "success" : "disabled"} fontSize="small" />
                    <Typography variant="subtitle1" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                      Existing Licenses ({existingLicenses.length})
                    </Typography>
                    {existingLicenses.length > 0 && (
                      <Chip 
                        label="Found" 
                        size="small" 
                        color="success" 
                        variant="outlined"
                        sx={{ fontSize: '0.65rem', height: '20px' }}
                      />
                    )}
                    <IconButton 
                      size="small" 
                      onClick={() => setShowExisting(!showExisting)}
                      disabled={loadingExisting}
                    >
                      {showExisting ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>
                }
                subheader={
                  <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                    Current licenses in the system - cannot capture duplicates
                  </Typography>
                }
              />
              <Collapse in={showExisting}>
                <CardContent sx={{ p: 1.5 }}>
                  {loadingExisting ? (
                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Loading existing licenses...</Typography>
                  ) : existingLicenses.length === 0 ? (
                    <Alert severity="info" sx={{ py: 1 }}>
                      <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                        No existing licenses found. All categories are available for application.
                      </Typography>
                    </Alert>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>License ID</TableCell>
                          <TableCell>Categories</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Issue Date</TableCell>
                          <TableCell>Location</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {existingLicenses.map((license) => (
                          <TableRow key={license.id}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.8rem' }}>
                                {license.license_number}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5}>
                                {license.categories?.map((cat: string) => (
                                  <Chip 
                                    key={cat} 
                                    label={cat} 
                                    size="small" 
                                    color="primary"
                                    sx={{ fontSize: '0.65rem', height: '20px' }}
                                  />
                                ))}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={license.status}
                                size="small"
                                color={license.is_active ? 'success' : 'default'}
                                sx={{ fontSize: '0.65rem', height: '20px' }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                {license.issue_date}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                {license.issuing_location}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Collapse>
            </Card>

            {/* Application Details */}
            <Card 
              elevation={0}
              sx={{ 
                bgcolor: 'white',
                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                borderRadius: 2
              }}
            >
              <CardHeader 
                sx={{ p: 1.5 }}
                title={
                  <Box display="flex" alignItems="center" gap={1}>
                    <AssignmentIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle1" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                      Application Details
                    </Typography>
                  </Box>
                }
                subheader="Select learner's permit category and requirements"
              />
              <CardContent sx={{ p: 1.5, pt: 0 }}>
                <Grid container spacing={2}>
              {/* Learner's Permit Category Selection */}
              <Grid item xs={12}>
                                        <FormControl 
                      fullWidth 
                      required 
                      size="small"
                      {...getSelectStyling('category', selectedCategory, true)}
                    >
                      <InputLabel>Learner's Permit Category</InputLabel>
                      <Select
                        value={selectedCategory}
                        onChange={(e) => {
                          setSelectedCategory(e.target.value as LicenseCategory);
                          setError('');
                        }}
                        label="Learner's Permit Category"
                        size="small"
                        renderValue={(selected) => {
                          if (!selected) return '';
                          const selectedCategoryData = getAvailableLearnerCategories().find(cat => cat.value === selected);
                          return selectedCategoryData ? selectedCategoryData.label : selected;
                        }}
                      >
                    {getAvailableLearnerCategories().map((category) => (
                      <MenuItem key={category.value} value={category.value}>
                        <Box>
                              <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.9rem' }}>
                            {category.label}
                          </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            Min age: {category.minAge} years • {category.description}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  {!selectedCategory && (
                    <FormHelperText sx={{ color: '#ff9800' }}>This field is required</FormHelperText>
                  )}
                </FormControl>

              {/* Age validation warning */}
              {selectedPerson && selectedCategory && selectedPerson.birth_date && (
                (() => {
                  const age = calculateAge(selectedPerson.birth_date);
                  const requiredAge = getAvailableLearnerCategories().find(cat => cat.value === selectedCategory)?.minAge || 18;
                  return age < requiredAge ? (
                          <Alert severity="warning" icon={<WarningIcon />} sx={{ mt: 1.5, py: 0.5 }}>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          <strong>Age Requirement:</strong> Applicant is {age} years old, but minimum age for {selectedCategory} is {requiredAge} years.
                        </Typography>
                      </Alert>
                  ) : null;
                })()
              )}
                  </Grid>

              {/* Never been refused declaration */}
              <Grid item xs={12}>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'primary.main', mb: 1 }}>
                        Declaration
                      </Typography>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={neverBeenRefused}
                          onChange={(e) => {
                            setNeverBeenRefused(e.target.checked);
                            if (e.target.checked) {
                              setRefusalDetails('');
                            }
                          }}
                            size="small"
                          />
                        }
                        label={
                          <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                            I have never been refused a driving licence or learner's permit
                          </Typography>
                        }
                    />
                    
                    {!neverBeenRefused && (
                        <Box sx={{ mt: 1.5 }}>
                                                <TextField
                          fullWidth
                          multiline
                          rows={3}
                          label="Please provide details of refusal"
                          value={refusalDetails}
                          onChange={(e) => setRefusalDetails(e.target.value)}
                          required
                          placeholder="Provide details about previous refusal including date, reason, and issuing authority..."
                          size="small"
                          {...getFieldStyling('refusalDetails', refusalDetails, !neverBeenRefused)}
                        />
                      </Box>
                    )}
                    </Box>
              </Grid>
            </Grid>
              </CardContent>
            </Card>
          </Box>
        );

      case 2: // Medical step - handled separately to preserve state
        return null;

      case 3: // Biometric step - handled separately to preserve state
        return null;

      case 4: // Review step
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
                  Please review the learner's license application details before submission.
                      </Typography>
                    </Alert>

              {/* Person Summary - Compact (Name + ID Only) */}
              <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                  Learner's License Applicant
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
                          sx={{ ml: 1, fontSize: '0.7rem', height: '16px' }}
                    />
                  )}
                </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Application Details - Detailed Focus */}
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                Application Details
                    </Typography>
              <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                <Grid container spacing={1}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Category</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      <Chip label={selectedCategory} size="small" color="primary" sx={{ fontSize: '0.7rem', height: '20px' }} />
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Declaration</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {neverBeenRefused ? (
                        <Chip label="Never been refused" size="small" color="success" sx={{ fontSize: '0.7rem', height: '20px' }} />
                      ) : (
                        <Chip label="Previously refused" size="small" color="warning" sx={{ fontSize: '0.7rem', height: '20px' }} />
                      )}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Description</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {getAvailableLearnerCategories().find(cat => cat.value === selectedCategory)?.description}
                    </Typography>
                  </Grid>
                  {!neverBeenRefused && (
                  <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Refusal Details</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                        {refusalDetails}
                          </Typography>
                    </Grid>
                      )}
                  </Grid>
                    </Box>

              {/* Biometric & Medical Data - Comprehensive */}
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                Biometric & Medical Assessment
              </Typography>
              <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                <Grid container spacing={1}>
                  <Grid item xs={12} md={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>License Photo</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                    <Chip 
                      label={biometricData.photo ? 'Captured' : 'Required'} 
                      size="small" 
                      color={biometricData.photo ? 'success' : 'error'} 
                        sx={{ fontSize: '0.7rem', height: '20px' }}
                    />
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Digital Signature</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                    <Chip 
                        label={biometricData.signature ? 'Captured' : 'Required'} 
                      size="small" 
                        color={biometricData.signature ? 'success' : 'error'} 
                        sx={{ fontSize: '0.7rem', height: '20px' }}
                    />
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Fingerprint</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                    <Chip 
                        label={biometricData.fingerprint ? 'Captured' : 'Required'} 
                      size="small" 
                        color={biometricData.fingerprint ? 'success' : 'error'} 
                        sx={{ fontSize: '0.7rem', height: '20px' }}
                    />
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Medical Clearance</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {medicalInformation ? (
                        <Chip 
                          label={medicalInformation.medical_clearance ? 'Cleared' : 'Not Cleared'} 
                          size="small" 
                          color={medicalInformation.medical_clearance ? 'success' : 'error'} 
                          sx={{ fontSize: '0.7rem', height: '20px' }}
                        />
                      ) : (
                        <Chip 
                          label="Required" 
                          size="small" 
                          color="error" 
                          sx={{ fontSize: '0.7rem', height: '20px' }}
                        />
                      )}
                    </Typography>
                </Grid>
                  {medicalInformation && medicalInformation.medical_restrictions.length > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Medical Restrictions</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                        {medicalInformation.medical_restrictions.join(', ')}
                    </Typography>
                    </Grid>
                  )}
                </Grid>
          </Box>
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
          <Box sx={{ p: 2, bgcolor: 'white' }}>
            <Alert severity="error" sx={{ mb: 1 }}>
              {error}
            </Alert>
          </Box>
        )}

        {/* Navigation Tabs - Fixed Height */}
        <Box sx={{ 
          bgcolor: 'white', 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          flexShrink: 0 // Prevent shrinking
        }}>
          <Tabs 
            value={activeStep} 
            onChange={(e, newValue) => setActiveStep(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': { 
                minHeight: 48,
                textTransform: 'none',
                fontSize: '0.875rem'
              }
            }}
          >
            {steps.map((step, index) => (
              <Tab 
                key={step.label}
                label={renderTabLabel(step, index)}
                disabled={index > 0 && !isStepValid(index - 1)}
                sx={{ minWidth: 120 }}
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
              key="person-form-wrapper"
              mode="application"
              externalPersonStep={personStep}
              onSuccess={handlePersonSelected}
              onPersonValidationChange={handlePersonValidationChange}
              onPersonStepChange={handlePersonStepChange}
              onContinueToApplication={handleContinueToApplication}
              onComplete={handleContinueToApplication} // For new persons to advance to next step
              onCancel={handleCancel}
              showHeader={false}
            />
          </Box>
                
          {/* Medical Form - Always rendered but conditionally visible */}
          <Box sx={{ 
            display: activeStep === 2 ? 'flex' : 'none',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0, // Allow flex shrinking
            width: '100%'
          }}>
            <MedicalInformationSection
              key="medical-form-wrapper"
              value={medicalInformation}
              onChange={setMedicalInformation}
              disabled={false}
              isRequired={(() => {
                const age = selectedPerson?.birth_date ? calculateAge(selectedPerson.birth_date) : 0;
                return requiresMedicalAlways(selectedCategory) || (age >= 60 && requiresMedical60Plus(selectedCategory));
              })()}
              selectedCategory={selectedCategory}
              personAge={selectedPerson?.birth_date ? calculateAge(selectedPerson.birth_date) : 0}
              externalMedicalStep={medicalStep}
              onMedicalValidationChange={handleMedicalValidationChange}
              onMedicalStepChange={handleMedicalStepChange}
              onContinueToApplication={handleContinueToBiometric}
              onCancel={handleCancel}
              showHeader={false}
            />
          </Box>

          {/* Biometric Form - Always rendered but conditionally visible */}
          <Box sx={{ 
            display: activeStep === 3 ? 'flex' : 'none',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0, // Allow flex shrinking
            width: '100%'
          }}>
            <BiometricCaptureStep
              key="biometric-form-wrapper"
              value={biometricData}
              onChange={setBiometricData}
              disabled={false}
              externalBiometricStep={biometricStep}
              onBiometricValidationChange={handleBiometricValidationChange}
              onBiometricStepChange={handleBiometricStepChange}
              onContinueToReview={handleContinueToReview}
              onCancel={handleCancel}
              showHeader={false}
              personId={selectedPerson?.id}
              demoMode={import.meta.env.DEV || localStorage.getItem('biometric_demo_mode') === 'true'}
            />
          </Box>
          
          {/* Other step content - Enable scrolling for direct content */}
          {activeStep !== 0 && activeStep !== 2 && activeStep !== 3 && (
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
        {activeStep !== 0 && activeStep !== 2 && activeStep !== 3 && (
          <Box sx={{ 
            p: 2, 
            bgcolor: 'white', 
            borderTop: '1px solid', 
            borderColor: 'divider',
            flexShrink: 0 // Keep footer visible
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                  disabled={activeStep <= 1 || loading}
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
                  {loading ? 'Submitting...' : activeStep === steps.length - 1 ? 'Submit Application' : 'Next'}
                  </Button>
                </Box>
            </Box>
          </Box>
        )}

        {/* Completion Message */}
        {activeStep === steps.length && (
          <Box sx={{ p: 3, bgcolor: 'white', textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Application Submitted Successfully!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Your learner's license application has been submitted and will be processed.
            </Typography>
            <Button 
              variant="contained"
              onClick={() => navigate('/dashboard/applications/dashboard')} 
            >
              Back to Applications
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
            Submitting learner's license application...
          </Typography>
          <Typography variant="body2" color="inherit" sx={{ opacity: 0.8 }}>
            Please wait while we process your submission
          </Typography>
        </Backdrop>

      </Paper>
    </Container>
  );
};

export default LearnersLicenseApplicationPage; 