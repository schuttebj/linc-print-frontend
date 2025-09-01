/**
 * Professional License Application Page
 * Modernized to match new styling patterns with tabs, PersonFormWrapper integration,
 * multi-select categories, and police clearance requirements
 */

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
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  FormControlLabel,
  Checkbox,
  TextField,
  OutlinedInput,
  SelectChangeEvent,
  Backdrop,
  Snackbar
} from '@mui/material';
import {
  PersonSearch as PersonSearchIcon,
  Assignment as AssignmentIcon,
  LocalHospital as MedicalIcon,
  Security as SecurityIcon,
  CameraAlt as CameraIcon,
  Preview as PreviewIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  LocationOn as LocationOnIcon,
  Warning as WarningIcon,
  DirectionsCar as DirectionsCarIcon,
  LocalShipping as LocalShippingIcon
} from '@mui/icons-material';

import PersonFormWrapper from '../../components/PersonFormWrapper';
import MedicalInformationSection from '../../components/applications/MedicalInformationSection';
import PoliceInformationSection, { PoliceInformation } from '../../components/applications/PoliceInformationSection';
import BiometricCaptureStep, { BiometricData } from '../../components/applications/BiometricCaptureStep';
import { 
  Person, 
  ApplicationType, 
  LicenseCategory, 
  ApplicationCreate,
  MedicalInformation,
  ProfessionalPermitCategory,
  requiresMedicalAlways,
  requiresMedical60Plus
} from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { applicationService } from '../../services/applicationService';
import { lookupService } from '../../services/lookupService';
import type { Location } from '../../services/lookupService';

// Helper function to upload police clearance document
const uploadPoliceDocument = async (applicationId: string, policeInfo: PoliceInformation) => {
  if (!policeInfo.police_clearance_file) return;

  const formData = new FormData();
  formData.append('file', policeInfo.police_clearance_file);
  formData.append('document_type', 'POLICE_CLEARANCE');
  formData.append('document_name', 'Police Clearance Certificate');
  
  if (policeInfo.clearance_date) {
    formData.append('issue_date', policeInfo.clearance_date);
  }
  if (policeInfo.report_type) {
    formData.append('notes', `Report Type: ${policeInfo.report_type}`);
  }

  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`/api/v1/applications/${applicationId}/documents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to upload police clearance document');
  }

  return await response.json();
};

const ProfessionalLicenseApplicationPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Core State
  const [activeStep, setActiveStep] = useState(0);
  const [personStep, setPersonStep] = useState(0);
  const [medicalStep, setMedicalStep] = useState(0);
  const [policeStep, setPoliceStep] = useState(0);
  const [biometricStep, setBiometricStep] = useState(0);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personFormValid, setPersonFormValid] = useState(false);
  const [medicalFormValid, setMedicalFormValid] = useState(false);
  const [policeFormValid, setPoliceFormValid] = useState(false);
  const [biometricFormValid, setBiometricFormValid] = useState(false);

  // Application Data
  const [selectedCategories, setSelectedCategories] = useState<ProfessionalPermitCategory[]>([]);
  const [medicalInformation, setMedicalInformation] = useState<MedicalInformation | null>(null);
  const [policeInformation, setPoliceInformation] = useState<PoliceInformation | null>(null);
  const [biometricData, setBiometricData] = useState<BiometricData>({});
  const [neverBeenRefused, setNeverBeenRefused] = useState<boolean>(true);
  const [refusalDetails, setRefusalDetails] = useState<string>('');
  const [professionalPreviousRefusal, setProfessionalPreviousRefusal] = useState<boolean>(false);
  const [professionalRefusalDetails, setProfessionalRefusalDetails] = useState<string>('');

  // UI State  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');

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
    
    if (isRequired && (!value || (Array.isArray(value) && value.length === 0) || value === '')) {
      fieldState = 'required';
    } else if ((Array.isArray(value) && value.length > 0) || (value && value !== '')) {
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

  // Steps for professional license application
  const steps = [
    {
      label: 'Person',
      icon: <PersonSearchIcon />
    },
    {
      label: 'Professional Categories',
      icon: <AssignmentIcon />
    },
    {
      label: 'Medical Assessment',
      icon: <MedicalIcon />
    },
    {
      label: 'Police Clearance',
      icon: <SecurityIcon />
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

  // Load locations on component mount
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const locations = await lookupService.getLocations();
        setAvailableLocations(locations || []);
        
        // Auto-select if user has primary location
        if (user?.primary_location_id) {
          setSelectedLocationId(user.primary_location_id);
        }
      } catch (err) {
        console.error('Failed to load locations:', err);
        setError('Failed to load locations. Please refresh the page.');
      }
    };

    loadLocations();
  }, [user]);

  const getAvailableProfessionalCategories = () => {
    return [
      {
        value: ProfessionalPermitCategory.G,
        label: 'G - Goods',
        description: 'Transport of goods (18+ years)',
        minAge: 18,
        icon: <LocalShippingIcon />,
        requiresPolice: false
      },
      {
        value: ProfessionalPermitCategory.P,
        label: 'P - Passengers', 
        description: 'Transport of passengers (21+ years)',
        minAge: 21,
        icon: <DirectionsCarIcon />,
        requiresPolice: true
      },
      {
        value: ProfessionalPermitCategory.D,
        label: 'D - Dangerous Goods',
        description: 'Transport of dangerous goods (25+ years, includes G)',
        minAge: 25,
        icon: <WarningIcon />,
        requiresPolice: true
      }
    ];
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

  // Check if police clearance is required for selected categories
  const isPoliceRequired = () => {
    const categoriesRequiringPolice = getAvailableProfessionalCategories()
      .filter(cat => cat.requiresPolice)
      .map(cat => cat.value);
    
    return selectedCategories.some(cat => categoriesRequiringPolice.includes(cat));
  };

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
      case 0: // Person step
        return !!selectedPerson && !!selectedPerson.id;
      case 1: // Professional categories step
        const locationValid = user?.primary_location_id || selectedLocationId;
        const hasCategories = selectedCategories.length > 0;
        const hasRefusalInfo = neverBeenRefused || !!refusalDetails.trim();
        return locationValid && hasCategories && hasRefusalInfo;
      case 2: // Medical step
        if (!selectedPerson) return false;
        const age = selectedPerson.birth_date ? calculateAge(selectedPerson.birth_date) : 0;
        const isMedicalMandatory = age >= 60; // Professional permits typically require medical for 60+
        return !isMedicalMandatory || (medicalInformation?.medical_clearance === true);
      case 3: // Police step
        return !isPoliceRequired() || (policeInformation?.police_clearance_obtained === true);
      case 4: // Biometric step
        const hasPhoto = !!biometricData.photo;
        const hasRequiredSignature = !!biometricData.signature; // Required for professional licenses
        return hasPhoto && hasRequiredSignature;
      case 5: // Review step
        const finalHasPhoto = !!biometricData.photo;
        const finalHasRequiredSignature = !!biometricData.signature;
        const finalPoliceValid = !isPoliceRequired() || !!policeInformation?.police_clearance_obtained;
        return !!selectedPerson && !!selectedPerson.id && selectedCategories.length > 0 && 
               finalHasPhoto && finalHasRequiredSignature && finalPoliceValid;
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
    console.log('🎯 User confirmed to continue to professional license application');
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

  const handleContinueToPolice = () => {
    console.log('🎯 User confirmed to continue to police clearance');
    setActiveStep(3);
  };

  // Police form callbacks
  const handlePoliceValidationChange = (step: number, isValid: boolean) => {
    console.log('🎯 PoliceInformationSection validation callback:', { step, isValid });
    setPoliceFormValid(isValid);
  };

  const handlePoliceStepChange = (step: number, canAdvance: boolean) => {
    console.log('🎯 PoliceInformationSection step change:', step, 'canAdvance:', canAdvance);
    setPoliceStep(step);
  };

  const handleContinueToBiometric = () => {
    console.log('🎯 User confirmed to continue to biometric capture');
    setActiveStep(4);
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
    setActiveStep(5);
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

  // Category selection handler (now multi-select)
  const handleCategoryChange = (event: SelectChangeEvent<typeof selectedCategories>) => {
    const value = event.target.value;
    let newCategories = typeof value === 'string' ? value.split(',') as ProfessionalPermitCategory[] : value as ProfessionalPermitCategory[];
    
    // Handle D category dependency (automatically include G)
    if (newCategories.includes(ProfessionalPermitCategory.D) && !newCategories.includes(ProfessionalPermitCategory.G)) {
      newCategories.push(ProfessionalPermitCategory.G);
    }
    
    setSelectedCategories(newCategories);
    setError('');
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!selectedPerson || selectedCategories.length === 0) {
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
      const isMedicalMandatory = age >= 60; // Professional permits typically require medical for 60+

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

      // Use primary category for application (backend will handle multiple categories)
      const primaryCategory = selectedCategories.includes(ProfessionalPermitCategory.D) 
        ? LicenseCategory.D // Dangerous goods is highest level
        : selectedCategories.includes(ProfessionalPermitCategory.P)
        ? LicenseCategory.D1 // Passenger transport 
        : LicenseCategory.C; // Goods transport

      // Create application data
      const applicationData: ApplicationCreate = {
        person_id: selectedPerson.id,
        location_id: locationId,
        application_type: ApplicationType.PROFESSIONAL_LICENSE,
        license_category: primaryCategory,
        medical_information: cleanMedicalInfo,
        never_been_refused: neverBeenRefused,
        refusal_details: neverBeenRefused ? undefined : refusalDetails
        // Note: Professional permit categories and police clearance will be handled separately
        // TODO: Add license verification for professional licenses that require existing licenses
      };

      console.log('Submitting application data:', applicationData);

      const application = await applicationService.createApplication(applicationData);
      
      // Store biometric data if captured
      if (biometricData.photo || biometricData.signature || biometricData.fingerprint) {
        try {
          console.log('Storing biometric data for application:', application.id);
          await applicationService.storeBiometricDataForApplication(application.id, biometricData);
        } catch (biometricError) {
          console.error('Biometric storage error (non-critical):', biometricError);
        }
      }

      // Store police clearance documents if provided
      if (policeInformation?.police_clearance_file) {
        try {
          console.log('Storing police clearance document for application:', application.id);
          await uploadPoliceDocument(application.id, policeInformation);
        } catch (documentError) {
          console.error('Document storage error (non-critical):', documentError);
        }
      }
      
      setSuccess('Professional driving license application submitted successfully!');
      setShowSuccessSnackbar(true);
      
      // Navigate to applications dashboard
      setTimeout(() => {
        navigate('/dashboard/applications/dashboard', {
          state: { 
            message: 'Professional driving license application submitted successfully',
            application 
          }
        });
      }, 3000);

    } catch (err: any) {
      console.error('Submission error:', err);
      let errorMessage = 'Failed to submit professional driving license application';
      
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
      case 1: // Professional categories step
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

            {/* Professional Categories Selection */}
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
                      Professional Permit Categories
                    </Typography>
                  </Box>
                }
                subheader="Select one or more professional permit categories"
              />
              <CardContent sx={{ p: 1.5, pt: 0 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl 
                      fullWidth 
                      required 
                      size="small"
                      {...getSelectStyling('categories', selectedCategories, true)}
                    >
                      <InputLabel>Professional Permit Categories</InputLabel>
                      <Select
                        multiple
                        value={selectedCategories}
                        onChange={handleCategoryChange}
                        input={<OutlinedInput label="Professional Permit Categories" />}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => {
                              const category = getAvailableProfessionalCategories().find(cat => cat.value === value);
                              return (
                                <Chip 
                                  key={value} 
                                  label={category?.label || value} 
                                  size="small" 
                                  color="primary"
                                  sx={{ fontSize: '0.7rem', height: '20px' }}
                                />
                              );
                            })}
                          </Box>
                        )}
                        size="small"
                      >
                        {getAvailableProfessionalCategories().map((category) => {
                          const age = selectedPerson?.birth_date ? calculateAge(selectedPerson.birth_date) : 0;
                          const isAgeValid = age >= category.minAge;
                          
                          return (
                            <MenuItem 
                              key={category.value} 
                              value={category.value}
                              disabled={!isAgeValid}
                              sx={{
                                opacity: isAgeValid ? 1 : 0.5,
                                backgroundColor: isAgeValid ? 'inherit' : '#f5f5f5'
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                {category.icon}
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                    {category.label}
                                  </Typography>
                                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }} color="text.secondary">
                                    {category.description}
                                    {category.requiresPolice && ' • Requires police clearance'}
                                  </Typography>
                                  {!isAgeValid && (
                                    <Typography variant="caption" color="error" sx={{ fontSize: '0.7rem' }}>
                                      Minimum age: {category.minAge} years (Current: {age} years)
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            </MenuItem>
                          );
                        })}
                      </Select>
                      {selectedCategories.length === 0 && (
                        <FormHelperText sx={{ color: '#ff9800' }}>Please select at least one category</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>

                  {/* Police Clearance Notice */}
                  {isPoliceRequired() && (
                    <Grid item xs={12}>
                      <Alert severity="info" sx={{ py: 0.5 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          <strong>Police clearance required:</strong> Selected categories require police clearance certificate.
                        </Typography>
                      </Alert>
                    </Grid>
                  )}

                  {/* Declaration */}
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
                            I have never been refused a professional driving permit
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

                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={professionalPreviousRefusal}
                            onChange={(e) => {
                              setProfessionalPreviousRefusal(e.target.checked);
                              if (e.target.checked) {
                                setProfessionalRefusalDetails('');
                              }
                            }}
                            size="small"
                          />
                        }
                        label={
                          <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                            I have never been refused any professional permit in this or any other category
                          </Typography>
                        }
                        sx={{ display: 'block', mt: 1 }}
                      />

                      {professionalPreviousRefusal && (
                        <Box sx={{ mt: 1.5 }}>
                          <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Details of Professional Permit Refusal"
                            value={professionalRefusalDetails}
                            onChange={(e) => setProfessionalRefusalDetails(e.target.value)}
                            placeholder="Please provide details of any professional permit refusal..."
                            size="small"
                            required
                            {...getFieldStyling('professionalRefusalDetails', professionalRefusalDetails, professionalPreviousRefusal)}
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

      case 5: // Review step
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
                  Please review the professional driving license application details before submission.
                </Typography>
              </Alert>

              {/* Person Summary - Compact (Name + ID Only) */}
              <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                  Professional License Applicant
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

              {/* Professional Categories - Detailed Focus */}
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                Professional Categories ({selectedCategories.length})
              </Typography>
              {selectedCategories.map((category, index) => {
                const categoryInfo = getAvailableProfessionalCategories().find(c => c.value === category);
                return (
                  <Box key={category} sx={{ mb: 0.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                    <Grid container spacing={1}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Category</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                          <Chip label={categoryInfo?.label || category} size="small" color="primary" sx={{ fontSize: '0.7rem', height: '20px' }} />
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Requirements</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                          {categoryInfo?.requiresPolice && (
                            <Chip label="Police clearance" size="small" color="warning" sx={{ fontSize: '0.7rem', height: '20px', mr: 0.5 }} />
                          )}
                          <Chip label={`Min age: ${categoryInfo?.minAge}+`} size="small" color="default" sx={{ fontSize: '0.7rem', height: '20px' }} />
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                );
              })}

              {/* Assessments & Data - Comprehensive */}
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                Assessments & Biometric Data
              </Typography>
              <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                <Grid container spacing={1}>
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
                          label="Not Required" 
                          size="small" 
                          color="default" 
                          sx={{ fontSize: '0.7rem', height: '20px' }}
                        />
                      )}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Police Clearance</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {isPoliceRequired() ? (
                        <Chip 
                          label={policeInformation?.police_clearance_obtained ? 'Obtained' : 'Required'} 
                          size="small"
                          color={policeInformation?.police_clearance_obtained ? 'success' : 'error'} 
                          sx={{ fontSize: '0.7rem', height: '20px' }}
                        />
                      ) : (
                        <Chip 
                          label="Not Required" 
                          size="small" 
                          color="default" 
                          sx={{ fontSize: '0.7rem', height: '20px' }}
                        />
                      )}
                    </Typography>
                  </Grid>
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
                </Grid>
              </Box>

              {/* Summary Alert */}
              <Alert severity="info" sx={{ mt: 1.5, py: 0.5 }}>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  <strong>Next Steps:</strong> After submission, your professional driving license application will be processed. 
                  Additional testing and verification may be required for professional permits.
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
          overflow: (activeStep === 0 || activeStep === 2 || activeStep === 3 || activeStep === 4) ? 'hidden' : 'auto',
          p: (activeStep === 0 || activeStep === 2 || activeStep === 3 || activeStep === 4) ? 0 : 2
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
              onComplete={handleContinueToApplication}
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
                return age >= 60; // Professional permits typically require medical for 60+
              })()}
              selectedCategory={selectedCategories.join(', ')}
              personAge={selectedPerson?.birth_date ? calculateAge(selectedPerson.birth_date) : 0}
              externalMedicalStep={medicalStep}
              onMedicalValidationChange={handleMedicalValidationChange}
              onMedicalStepChange={handleMedicalStepChange}
              onContinueToApplication={handleContinueToPolice}
              onCancel={handleCancel}
              showHeader={false}
            />
          </Box>

          {/* Police Form - Always rendered but conditionally visible */}
          <Box sx={{ display: activeStep === 3 ? 'block' : 'none' }}>
            <PoliceInformationSection
              key="police-form-wrapper"
              value={policeInformation}
              onChange={setPoliceInformation}
              disabled={false}
              isRequired={isPoliceRequired()}
              selectedCategories={selectedCategories}
              personAge={selectedPerson?.birth_date ? calculateAge(selectedPerson.birth_date) : 0}
              externalPoliceStep={policeStep}
              onPoliceValidationChange={handlePoliceValidationChange}
              onPoliceStepChange={handlePoliceStepChange}
              onContinueToApplication={handleContinueToBiometric}
              onCancel={handleCancel}
              showHeader={false}
            />
          </Box>

          {/* Biometric Form - Always rendered but conditionally visible */}
          <Box sx={{ display: activeStep === 4 ? 'block' : 'none' }}>
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
          {activeStep !== 0 && activeStep !== 2 && activeStep !== 3 && activeStep !== 4 && renderStepContent(activeStep)}
        </Box>

        {/* Navigation Footer - Only shown when not on person, medical, police, or biometric step */}
        {activeStep !== 0 && activeStep !== 2 && activeStep !== 3 && activeStep !== 4 && (
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
            Submitting professional license application...
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
            Professional license application submitted successfully!
          </Alert>
        </Snackbar>
      </Paper>
    </Container>
  );
};

export default ProfessionalLicenseApplicationPage;