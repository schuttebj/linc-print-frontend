import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  Button,
  Alert,
  Grid,
  Card,
  CardHeader,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip,
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
  CircularProgress,
  Backdrop,
  Snackbar
} from '@mui/material';
import {
  PersonSearch as PersonSearchIcon,
  Assignment as AssignmentIcon,
  LocalHospital as MedicalIcon,
  CameraAlt as CameraIcon,
  Preview as PreviewIcon,
  LocationOn as LocationOnIcon,
  DirectionsCar as DirectionsCarIcon,
  Warning as WarningIcon,
  Language as LanguageIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';

import PersonFormWrapper from '../../components/PersonFormWrapper';
import MedicalInformationSection from '../../components/applications/MedicalInformationSection';
import BiometricCaptureStep, { BiometricData } from '../../components/applications/BiometricCaptureStep';
import ForeignLicenseCaptureForm, { 
  ForeignLicenseCaptureData, 
  validateForeignLicenseCaptureData 
} from '../../components/applications/ForeignLicenseCaptureForm';
import { 
  Person, 
  ApplicationType, 
  LicenseCategory, 
  ApplicationCreate,
  MedicalInformation,
  requiresMedicalAlways,
  requiresMedical60Plus
} from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { applicationService } from '../../services/applicationService';
import { lookupService } from '../../services/lookupService';
import type { Location } from '../../services/lookupService';
import { API_ENDPOINTS, getAuthToken } from '../../config/api';

const steps = [
  {
    label: 'Person',
    icon: <PersonSearchIcon />
  },
  {
    label: 'Foreign License Details',
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

const ForeignConversionApplicationPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Form state
  const [activeStep, setActiveStep] = useState(0);
  const [personStep, setPersonStep] = useState(0);
  const [medicalStep, setMedicalStep] = useState(0);
  const [biometricStep, setBiometricStep] = useState(0);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personFormValid, setPersonFormValid] = useState(false);
  const [medicalFormValid, setMedicalFormValid] = useState(false);
  const [biometricFormValid, setBiometricFormValid] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<LicenseCategory | null>(null);
  const [medicalInformation, setMedicalInformation] = useState<MedicalInformation | null>(null);
  const [biometricData, setBiometricData] = useState<BiometricData>({});
  const [neverBeenRefused, setNeverBeenRefused] = useState<boolean>(true);
  const [refusalDetails, setRefusalDetails] = useState<string>('');
  const [foreignLicenseCaptureData, setForeignLicenseCaptureData] = useState<ForeignLicenseCaptureData | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const [existingLicenses, setExistingLicenses] = useState<any[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [showExisting, setShowExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);

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

  // Common countries for foreign license conversion (matching ForeignLicenseCaptureForm)
  const getCommonCountries = () => {
    return [
      { code: 'ZAF', name: 'South Africa' },
      { code: 'FRA', name: 'France' },
      { code: 'GBR', name: 'United Kingdom' },
      { code: 'USA', name: 'United States' },
      { code: 'CAN', name: 'Canada' },
      { code: 'AUS', name: 'Australia' },
      { code: 'DEU', name: 'Germany' },
      { code: 'ITA', name: 'Italy' },
      { code: 'ESP', name: 'Spain' },
      { code: 'BEL', name: 'Belgium' },
      { code: 'NLD', name: 'Netherlands' },
      { code: 'CHE', name: 'Switzerland' },
      { code: 'OTHER', name: 'Other' }
    ];
  };

  // Step validation
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Person step
        return !!selectedPerson && !!selectedPerson.id;
      case 1: // Foreign license details step
        const hasLocation = !!user?.primary_location_id || !!selectedLocationId;
        const hasValidForeignLicenseData = !!foreignLicenseCaptureData && 
          validateForeignLicenseCaptureData(foreignLicenseCaptureData).isValid;
        const hasRefusalInfo = neverBeenRefused || !!refusalDetails.trim();
        return hasLocation && hasValidForeignLicenseData && hasRefusalInfo && !!selectedPerson && !!selectedPerson.id;
      case 2: // Medical step
        if (!selectedPerson || !selectedCategory) return false;
        const age = selectedPerson.birth_date ? calculateAge(selectedPerson.birth_date) : 0;
        const isMedicalMandatory = requiresMedicalAlways(selectedCategory) || 
                                 (age >= 60 && requiresMedical60Plus(selectedCategory));
        return !isMedicalMandatory || (medicalInformation?.medical_clearance === true);
      case 3: // Biometric step
        // Photo and signature required for foreign conversion (card-eligible)
        const hasPhoto = !!biometricData.photo;
        const hasRequiredSignature = !!biometricData.signature; // Required for foreign conversions
        return hasPhoto && hasRequiredSignature;
      case 4: // Review step
        const finalHasPhoto = !!biometricData.photo;
        const finalHasRequiredSignature = !!biometricData.signature; 
        const finalHasValidForeignLicenseData = !!foreignLicenseCaptureData && 
          validateForeignLicenseCaptureData(foreignLicenseCaptureData).isValid;
        return !!selectedPerson && !!selectedPerson.id && !!selectedCategory && 
               finalHasValidForeignLicenseData && finalHasPhoto && finalHasRequiredSignature;
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
    console.log('🎯 User confirmed to continue to foreign license conversion');
    setActiveStep(1);
  };

  // Medical form callbacks
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

  // Biometric form callbacks
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

  // Foreign license capture handler
  const handleForeignLicenseCaptureChange = (data: ForeignLicenseCaptureData | null) => {
    setForeignLicenseCaptureData(data);
    
    // Auto-select category from first foreign license if available
    if (data && data.foreign_licenses.length > 0 && data.foreign_licenses[0].license_category_madagascar) {
      setSelectedCategory(data.foreign_licenses[0].license_category_madagascar);
    }
    
    setError('');
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!selectedPerson || !selectedCategory || !foreignLicenseCaptureData) {
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
        application_type: ApplicationType.FOREIGN_CONVERSION,
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
      console.log('Foreign license capture data:', foreignLicenseCaptureData);
      console.log('Submitting application data:', applicationData);

      const application = await applicationService.createApplication(applicationData);
      
      // Store biometric data if captured
      if (biometricData.photo || biometricData.signature || biometricData.fingerprint) {
        try {
          console.log('Storing biometric data for application:', application.id);
          const biometricResult = await applicationService.storeBiometricDataForApplication(
            application.id,
            biometricData
          );
          
          if (biometricResult.success) {
            console.log('✅ Biometric data stored successfully:', biometricResult);
          } else {
            console.warn('⚠️ Some biometric data failed to store:', biometricResult.errors);
          }
        } catch (biometricError) {
          console.error('Biometric storage error (non-critical):', biometricError);
          // Don't fail the entire application for biometric storage issues
        }
      }
      
      setSuccess('Foreign driving license conversion application submitted successfully!');
      setShowSuccessSnackbar(true);
      
      // Navigate to applications dashboard after showing success
      setTimeout(() => {
        navigate('/dashboard/applications/dashboard', {
          state: { 
            message: 'Foreign driving license conversion application submitted successfully',
            application 
          }
        });
      }, 3000);

    } catch (err: any) {
      console.error('Submission error:', err);
      let errorMessage = 'Failed to submit foreign driving license conversion application';
      
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
      case 0: // Person step - handled separately to preserve state
        return null;

      case 1: // Foreign license details step
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
                    Current licenses in the system - for foreign license conversion reference
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
                        No existing licenses found. This is a new license conversion application.
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

            {/* Foreign License Conversion Details */}
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
                    <LanguageIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle1" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                      Foreign License Conversion
                    </Typography>
                  </Box>
                }
                subheader="Provide details for each foreign license you want to convert to a Madagascar license"
              />
              <CardContent sx={{ p: 1.5, pt: 0 }}>
                <ForeignLicenseCaptureForm
                  value={foreignLicenseCaptureData}
                  onChange={handleForeignLicenseCaptureChange}
                  disabled={loading}
                  personBirthDate={selectedPerson?.birth_date}
                  personId={selectedPerson?.id}
                />
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
                  Please review the foreign license conversion application details before submission.
                      </Typography>
                    </Alert>

              {/* Person Summary - Compact */}
              <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                  Foreign License Conversion Applicant
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

              {/* Foreign Licenses - Detailed Focus */}
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                Foreign Licenses for Conversion ({foreignLicenseCaptureData?.foreign_licenses?.length || 0})
              </Typography>
              {foreignLicenseCaptureData?.foreign_licenses?.map((license, index) => (
                <Box key={license.id} sx={{ mb: 0.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                  <Grid container spacing={1}>
                  <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Country of Issue</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                        {getCommonCountries().find(c => c.code === license.country_of_issue)?.name || license.country_of_issue}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Madagascar Category</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                        <Chip label={license.license_category_madagascar} size="small" color="primary" sx={{ fontSize: '0.6rem', height: '18px' }} />
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Foreign Category</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                        {license.license_category_foreign}
                      </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Issue Date</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                        {license.issue_date}
                    </Typography>
                  </Grid>
                  </Grid>
                </Box>
              ))}

              {/* Declaration */}
              <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                  Declaration
                </Typography>
                <Grid container spacing={1}>
                    <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Previous Refusals</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {neverBeenRefused ? (
                        <Chip label="Never been refused" size="small" color="success" sx={{ fontSize: '0.6rem', height: '18px' }} />
                      ) : (
                        <>
                          <Chip label="Previously refused" size="small" color="warning" sx={{ fontSize: '0.6rem', height: '18px' }} />
                          <Typography variant="body2" sx={{ mt: 0.5, fontSize: '0.75rem' }}>
                            <strong>Details:</strong> {refusalDetails}
                          </Typography>
                        </>
                      )}
                    </Typography>
                  </Grid>
                </Grid>
                    </Box>

              {/* Medical & Biometric Data - Comprehensive */}
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                Medical Assessment & Biometric Data
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
                        sx={{ fontSize: '0.6rem', height: '18px' }}
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
                        sx={{ fontSize: '0.6rem', height: '18px' }}
                    />
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Fingerprint</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                    <Chip 
                        label={biometricData.fingerprint ? 'Captured' : 'Optional'}
                      size="small" 
                      color={biometricData.fingerprint ? 'success' : 'default'} 
                        sx={{ fontSize: '0.6rem', height: '18px' }}
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
                          sx={{ fontSize: '0.6rem', height: '18px' }}
                        />
                      ) : (
                        <Chip 
                          label="Not Required" 
                          size="small" 
                          color="default" 
                          sx={{ fontSize: '0.6rem', height: '18px' }}
                        />
                      )}
                    </Typography>
                </Grid>
                </Grid>
              </Box>

            {/* Summary */}
              <Alert severity="info" sx={{ mt: 1.5, py: 0.5 }}>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                <strong>Next Steps:</strong> After submission, you must provide the original foreign license and supporting documents. 
                  A theory test may be required depending on the country of issue and license category.
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
    <Container maxWidth="lg" sx={{ py: 1, height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
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
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 0.5 }}>
            Foreign License Conversion Application
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Convert your foreign driving license to a Madagascar license
          </Typography>
        </Box>

        {/* Error/Success Messages */}
        {(error || success) && (
          <Box sx={{ p: 2, bgcolor: 'white' }}>
        {error && (
              <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}
        
        {success && (
              <Alert severity="success" sx={{ mb: 1 }} icon={<CheckCircleIcon />}>
            {success}
          </Alert>
            )}
          </Box>
        )}

        {/* Navigation Tabs */}
        <Box sx={{ bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider' }}>
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

        {/* Tab Content */}
        <Box sx={{ 
          flexGrow: 1, 
          overflow: (activeStep === 0 || activeStep === 2 || activeStep === 3) ? 'hidden' : 'auto',
          p: (activeStep === 0 || activeStep === 2 || activeStep === 3) ? 0 : 2
        }}>
          {/* Person Form - Always rendered but conditionally visible */}
          <Box sx={{ display: activeStep === 0 ? 'block' : 'none' }}>
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
          <Box sx={{ display: activeStep === 2 ? 'block' : 'none' }}>
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
          <Box sx={{ display: activeStep === 3 ? 'block' : 'none' }}>
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
          
          {/* Other step content */}
          {activeStep !== 0 && activeStep !== 2 && activeStep !== 3 && renderStepContent(activeStep)}
        </Box>

        {/* Navigation Footer - Only shown when not on person, medical, or biometric step */}
        {activeStep !== 0 && activeStep !== 2 && activeStep !== 3 && (
          <Box sx={{ p: 2, bgcolor: 'white', borderTop: '1px solid', borderColor: 'divider' }}>
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
            Submitting foreign license conversion application...
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
            Foreign license conversion application submitted successfully!
          </Alert>
        </Snackbar>
      </Paper>
    </Container>
  );
};

export default ForeignConversionApplicationPage; 