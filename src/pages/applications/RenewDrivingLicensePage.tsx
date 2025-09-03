/**
 * Renew Driving License Page
 * Focused form for RENEWAL applications only
 * 
 * Workflow: Person Selection (A) → Renewal Details (C) → Medical Assessment (D) → Review & Submit
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
  Backdrop,
  Snackbar
} from '@mui/material';
import {
  PersonSearch as PersonSearchIcon,
  Refresh as RenewalIcon,
  LocalHospital as MedicalIcon,
  LocalHospital as LocalHospitalIcon,
  CameraAlt as CameraIcon,
  Preview as PreviewIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  LocationOn as LocationOnIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import PersonFormWrapper from '../../components/PersonFormWrapper';
import MedicalInformationSection from '../../components/applications/MedicalInformationSection';
import PoliceInformationSection, { PoliceInformation } from '../../components/applications/PoliceInformationSection';
import BiometricCaptureStep, { BiometricData } from '../../components/applications/BiometricCaptureStep';
import LicenseVerificationSection from '../../components/applications/LicenseVerificationSection';
import { applicationService } from '../../services/applicationService';
import {
  Person,
  ApplicationStatus,
  ApplicationType,
  ApplicationCreate,
  LicenseCategory,
  Location,
  MedicalInformation,
  LicenseVerificationData,
  ReplacementReason,
  requiresMedicalAlways,
  requiresMedical60Plus,
  ProfessionalPermitCategory,
  isCommercialLicense
} from '../../types';
import { API_ENDPOINTS, getAuthToken } from '../../config/api';

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

  const token = getAuthToken();
  if (!token) throw new Error('No authentication token available');

  const response = await fetch(`${API_ENDPOINTS.applications}/${applicationId}/documents`, {
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

  return response.json();
};

const RenewDrivingLicensePage: React.FC = () => {
  const { user } = useAuth();
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
  const [replacementReason, setReplacementReason] = useState<ReplacementReason | ''>('');

  const [licenseVerification, setLicenseVerification] = useState<LicenseVerificationData | null>(null);
  const [medicalInformation, setMedicalInformation] = useState<MedicalInformation | null>(null);
  const [policeInformation, setPoliceInformation] = useState<PoliceInformation | null>(null);
  const [biometricData, setBiometricData] = useState<BiometricData>({});
  const [policeStep, setPoliceStep] = useState(0);
  const [policeFormValid, setPoliceFormValid] = useState(false);
  const [skipProfessionalPermits, setSkipProfessionalPermits] = useState(false);
  const [hasProfessionalPermits, setHasProfessionalPermits] = useState(false);
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

  // Replacement reason mapping - Frontend labels to Backend enum values (for renewals)
  const replacementReasonOptions = [
    { value: ReplacementReason.STOLEN, label: 'Theft', frontendValue: 'theft' },
    { value: ReplacementReason.LOST, label: 'Loss', frontendValue: 'loss' },
    { value: ReplacementReason.DAMAGED, label: 'Destruction', frontendValue: 'destruction' },
    { value: ReplacementReason.OTHER, label: 'Recovery', frontendValue: 'recovery' },
    { value: ReplacementReason.OTHER, label: 'New Card', frontendValue: 'new_card' }
  ];

  // Steps for renewal application
  const steps = [
    {
      label: 'Person',
      icon: <PersonSearchIcon />
    },
    {
      label: 'Renewal Details',
      icon: <RenewalIcon />
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

  // Helper function to check if user has professional permits
  const checkHasProfessionalPermits = (licenses: any[]): boolean => {
    return licenses.some((license) => {
      const categories = license.categories || [];
      // Check for commercial categories (B2, C, C1, CE, C1E, D, D1, D2) or professional permit categories
      return categories.some((cat: string) => 
        isCommercialLicense(cat as LicenseCategory) || 
        ['P', 'D', 'G'].includes(cat)
      );
    });
  };

  // Helper function to get professional permit categories from existing licenses
  const getProfessionalPermitCategories = (licenses: any[]): string[] => {
    const professionalCategories: string[] = [];
    licenses.forEach((license) => {
      const categories = license.categories || [];
      categories.forEach((cat: string) => {
        if (['P', 'D', 'G'].includes(cat) && !professionalCategories.includes(cat)) {
          professionalCategories.push(cat);
        }
      });
    });
    return professionalCategories;
  };

  // Helper function to check if police clearance is required
  const isPoliceRequired = (): boolean => {
    if (skipProfessionalPermits) return false;
    return hasProfessionalPermits && !skipProfessionalPermits;
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

  // Load existing licenses when person is selected - filter for driving licenses only (not permits)
  const loadExistingLicenses = async (personId: string) => {
    setLoadingExisting(true);
    try {
      console.log('Loading existing licenses for person:', personId);
      const response = await applicationService.getPersonLicenses(personId);
      console.log('Existing licenses response:', response);
      const licenses = response.system_licenses || [];
      
      // Filter to only include driving licenses (not learner's permits)
      const drivingLicenses = licenses.filter((license: any) => {
        const categories = license.categories || [];
        // Check if any category is NOT a learner's permit (1, 2, 3)
        return categories.some((cat: string) => !['1', '2', '3'].includes(cat));
      });
      
      setExistingLicenses(drivingLicenses);
      
      // Check if user has professional permits
      const hasProfessional = checkHasProfessionalPermits(drivingLicenses);
      setHasProfessionalPermits(hasProfessional);
      
    } catch (error) {
      console.error('Error loading existing licenses:', error);
      setExistingLicenses([]);
      setHasProfessionalPermits(false);
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
    console.log('🎯 User confirmed to continue to renewal application');
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

  const handleContinueFromMedical = () => {
    console.log('🎯 User confirmed to continue from medical');
    // Go to police clearance if required, otherwise skip to biometric
    if (isPoliceRequired()) {
      setActiveStep(3); // Police clearance step
    } else {
      setActiveStep(4); // Biometric step
    }
  };

  const handleContinueToBiometric = () => {
    console.log('🎯 User confirmed to continue to biometric capture');
    setActiveStep(4);
  };

  // Police form callbacks (similar to PersonFormWrapper and MedicalInformationSection)
  const handlePoliceValidationChange = (step: number, isValid: boolean) => {
    console.log('🎯 PoliceInformationSection validation callback:', { step, isValid });
    setPoliceFormValid(isValid);
  };

  const handlePoliceStepChange = (step: number, canAdvance: boolean) => {
    console.log('🎯 PoliceInformationSection step change:', step, 'canAdvance:', canAdvance);
    setPoliceStep(step);
  };

  const handleContinueToPolice = () => {
    console.log('🎯 User confirmed to continue to police clearance');
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
    setActiveStep(5); // Updated to account for police clearance step
  };

  // Step validation
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!selectedPerson && !!selectedPerson.id;
      case 1:
        const hasValidLicenses = existingLicenses.length > 0;
        const hasLocation = !!user?.primary_location_id || !!selectedLocationId;
        const hasRenewalReason = !!replacementReason;
        return hasValidLicenses && hasLocation && hasRenewalReason && !!selectedPerson && !!selectedPerson.id;
      case 2:
        const age = selectedPerson?.birth_date ? calculateAge(selectedPerson.birth_date) : 0;
        const isMedicalMandatory = licenseVerification?.all_license_categories?.some(cat => requiresMedicalAlways(cat as LicenseCategory)) || 
                                 (age >= 60 && licenseVerification?.all_license_categories?.some(cat => requiresMedical60Plus(cat as LicenseCategory)));
        return isMedicalMandatory ? !!medicalInformation?.medical_clearance : true;
      case 3:
        // Police clearance step - only validate if required
        if (!isPoliceRequired()) {
          return true; // Skip validation if not required
        }
        return !!policeInformation?.police_clearance_obtained;
      case 4:
        // Biometric step - photo and signature required for driving license renewals (card-eligible)
        const hasPhoto = !!biometricData.photo;
        const hasRequiredSignature = !!biometricData.signature; // Always required for renewals
        return hasPhoto && hasRequiredSignature;
      case 5:
        // Final review step
        const finalHasPhoto = !!biometricData.photo;
        const finalHasRequiredSignature = !!biometricData.signature; // Always required for renewals
        const finalPoliceValid = !isPoliceRequired() || !!policeInformation?.police_clearance_obtained;
        return !!selectedPerson && !!selectedPerson.id && !!licenseVerification && finalHasPhoto && finalHasRequiredSignature && finalPoliceValid;
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
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!selectedPerson || !replacementReason || !licenseVerification) {
      setError('Missing required data for submission');
      return;
    }

    // Additional validation for person ID
    if (!selectedPerson.id) {
      console.error('Selected person object:', selectedPerson);
      setError('Person ID is missing. Please go back and reselect the person.');
      return;
    }

    // Check if there are licenses to renew
    if (!licenseVerification.all_license_categories || licenseVerification.all_license_categories.length === 0) {
      setError('No existing licenses found to renew. Person must have active licenses to renew.');
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

      // For renewal, use the highest/most comprehensive license category from existing licenses
      const primaryCategory = licenseVerification.all_license_categories[0] as LicenseCategory;

      // Check if medical is mandatory for renewal
      const age = selectedPerson?.birth_date ? calculateAge(selectedPerson.birth_date) : 0;
      const isMedicalMandatory = age >= 60 || 
                               licenseVerification?.all_license_categories?.some(cat => requiresMedicalAlways(cat as LicenseCategory));

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
        application_type: ApplicationType.RENEWAL,
        license_category: primaryCategory, // System will determine what to renew
        medical_information: cleanMedicalInfo,
        license_verification: licenseVerification,
        replacement_reason: replacementReason
      };

      console.log('User info:', user);
      console.log('Selected person object:', selectedPerson);
      console.log('Selected person ID:', selectedPerson.id);
      console.log('Selected location ID:', locationId);
      console.log('License verification:', licenseVerification);
      console.log('Submitting application data:', applicationData);

      const application = await applicationService.createApplication(applicationData);
      
      // Store police clearance documents if provided
      if (policeInformation?.police_clearance_file) {
        try {
          console.log('Storing police clearance document for application:', application.id);
          await uploadPoliceDocument(application.id, policeInformation);
        } catch (documentError) {
          console.error('Document storage error (non-critical):', documentError);
        }
      }
      
      setSuccess('Driving license renewal submitted successfully!');
      setShowSuccessSnackbar(true);
      
      // Navigate to applications dashboard after showing success
      setTimeout(() => {
        navigate('/dashboard/applications/dashboard', {
          state: { 
            message: 'Driving license renewal submitted successfully',
            application 
          }
        });
      }, 3000);

    } catch (err: any) {
      console.error('Submission error:', err);
      let errorMessage = 'Failed to submit driving license renewal';
      
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

      case 1: // Renewal details step - Section C
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

            {/* Existing Licenses - Driving Licenses Only */}
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
                      Driving Licenses ({existingLicenses.length})
                    </Typography>
                    {existingLicenses.length > 0 && (
                      <Chip 
                        label="Eligible for Renewal" 
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
                    Current driving licenses eligible for renewal (excludes learner's permits)
                  </Typography>
                }
              />
              <Collapse in={showExisting}>
                <CardContent sx={{ p: 1.5 }}>
                  {loadingExisting ? (
                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Loading existing licenses...</Typography>
                  ) : existingLicenses.length === 0 ? (
                    <Alert severity="warning" sx={{ py: 1 }}>
                      <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                        No driving licenses found for renewal. Person must have active driving licenses to proceed with renewal.
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
                                {license.categories?.filter((cat: string) => !['1', '2', '3'].includes(cat)).map((cat: string) => (
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

            {/* Renewal Details */}
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
                    <RenewalIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle1" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                      Renewal Information
                    </Typography>
                  </Box>
                }
                subheader="Provide renewal details and reason"
              />
              <CardContent sx={{ p: 1.5, pt: 0 }}>
                <Grid container spacing={2}>
                  {/* Renewal Reason */}
                  <Grid item xs={12}>
                    <FormControl 
                      fullWidth 
                      required 
                      size="small"
                      {...getSelectStyling('renewalReason', replacementReason, true)}
                    >
                      <InputLabel>Reason for Renewal</InputLabel>
                      <Select
                        value={replacementReason}
                        onChange={(e) => {
                          setReplacementReason(e.target.value as ReplacementReason);
                          setError('');
                        }}
                        label="Reason for Renewal"
                        size="small"
                      >
                        {replacementReasonOptions.map((option) => (
                          <MenuItem key={option.value + option.frontendValue} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {!replacementReason && (
                        <FormHelperText sx={{ color: '#ff9800' }}>This field is required</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>

                  {/* Professional Permits Options */}
                  {hasProfessionalPermits && (
                    <Grid item xs={12}>
                      <Alert 
                        severity="info" 
                        sx={{ mb: 2 }}
                        icon={<SecurityIcon />}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                          Professional Driving Permits Detected
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                          You have the following professional permit categories: {getProfessionalPermitCategories(existingLicenses).join(', ')}
                        </Typography>
                        <Typography variant="caption">
                          Professional permit renewals require police clearance certificates.
                        </Typography>
                      </Alert>

                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={skipProfessionalPermits}
                            onChange={(e) => {
                              setSkipProfessionalPermits(e.target.checked);
                              if (e.target.checked) {
                                // Clear police information if skipping professional permits
                                setPoliceInformation(null);
                              }
                            }}
                            color="primary"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              Skip professional permits renewal
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Check this if you no longer need professional permits and only want to renew your regular license
                            </Typography>
                          </Box>
                        }
                      />
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Box>
        );

      case 2: // Medical step - handled separately to preserve state
        return null;

      case 3: // Police clearance step - handled separately to preserve state
        return null;

      case 4: // Biometric step - handled separately to preserve state
        return null;

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
                  Please review the driving license renewal details before submission.
                </Typography>
              </Alert>

              {/* Person Summary - Compact (Name + ID Only) */}
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

              {/* Renewal Details - Detailed Focus */}
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                Renewal Details
              </Typography>
              <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                <Grid container spacing={1}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Renewal Reason</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                    <Chip 
                        label={replacementReasonOptions.find(opt => opt.value === replacementReason)?.label || replacementReason} 
                      size="small" 
                        color="primary" 
                        sx={{ fontSize: '0.7rem', height: '20px' }} 
                    />
                    </Typography>
                  </Grid>

                </Grid>
              </Box>

              {/* Current Licenses to Renew */}
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                Licenses for Renewal
              </Typography>
              <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                <Grid container spacing={1}>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Driving License Categories</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {existingLicenses.length > 0 ? (
                        existingLicenses.flatMap(license => 
                          license.categories?.filter((cat: string) => !['1', '2', '3'].includes(cat)) || []
                        ).map((cat: string, index: number) => (
                          <Chip 
                            key={index} 
                            label={cat} 
                            size="small" 
                            color="success" 
                            sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem', height: '20px' }} 
                          />
                        ))
                      ) : (
                        <Chip 
                          label="No licenses found" 
                          size="small" 
                          color="error" 
                          sx={{ fontSize: '0.7rem', height: '20px' }} 
                        />
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Police Clearance Details - Show if required */}
              {hasProfessionalPermits && (
                <>
                  <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                    Professional Permits & Police Clearance
                  </Typography>
                  <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                    <Grid container spacing={1}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Professional Permits</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                          {skipProfessionalPermits ? (
                            <Chip 
                              label="Skipping Professional Permits" 
                              size="small" 
                              color="warning" 
                              sx={{ fontSize: '0.7rem', height: '20px' }}
                            />
                          ) : (
                            <Box>
                              {getProfessionalPermitCategories(existingLicenses).map((cat) => (
                                <Chip 
                                  key={cat}
                                  label={cat} 
                                  size="small" 
                                  color="primary" 
                                  sx={{ mr: 0.5, fontSize: '0.7rem', height: '20px' }}
                                />
                              ))}
                            </Box>
                          )}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Police Clearance</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                          {skipProfessionalPermits ? (
                            <Chip 
                              label="Not Required" 
                              size="small" 
                              color="default" 
                              sx={{ fontSize: '0.7rem', height: '20px' }}
                            />
                          ) : policeInformation?.police_clearance_obtained ? (
                            <Chip 
                              label="Provided" 
                              size="small" 
                              color="success" 
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
                      {policeInformation && policeInformation.police_clearance_obtained && !skipProfessionalPermits && (
                        <>
                          {policeInformation.clearance_date && (
                            <Grid item xs={12} md={6}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Clearance Date</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                                {policeInformation.clearance_date}
                              </Typography>
                            </Grid>
                          )}
                          {policeInformation.report_type && (
                            <Grid item xs={12} md={6}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Report Type</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                                {policeInformation.report_type}
                              </Typography>
                            </Grid>
                          )}
                        </>
                      )}
                    </Grid>
                  </Box>
                </>
              )}

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
                        label={biometricData.fingerprint ? 'Captured' : 'Optional'} 
                        size="small" 
                        color={biometricData.fingerprint ? 'success' : 'default'} 
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
                          label="Not Required" 
                          size="small" 
                          color="default" 
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

        {/* Tab Content - Scrollable Area */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'hidden', // Let components scroll internally

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
                const existingCategories = existingLicenses.flatMap(license => license.categories || []);
                return age >= 60 || existingCategories.some(cat => requiresMedicalAlways(cat as LicenseCategory));
              })()}
              selectedCategory={null}
              personAge={selectedPerson?.birth_date ? calculateAge(selectedPerson.birth_date) : 0}
              externalMedicalStep={medicalStep}
              onMedicalValidationChange={handleMedicalValidationChange}
              onMedicalStepChange={handleMedicalStepChange}
              onContinueToApplication={handleContinueFromMedical}
              onCancel={handleCancel}
              showHeader={false}
            />
          </Box>

          {/* Police Clearance Form - Always rendered but conditionally visible */}
          <Box sx={{ 
            display: activeStep === 3 ? 'flex' : 'none',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0, // Allow flex shrinking
            width: '100%'
          }}>
            <PoliceInformationSection
              key="police-form-wrapper"
              value={policeInformation}
              onChange={setPoliceInformation}
              disabled={false}
              isRequired={isPoliceRequired()}
              externalPoliceStep={policeStep}
              onPoliceValidationChange={handlePoliceValidationChange}
              onPoliceStepChange={handlePoliceStepChange}
              onContinueToApplication={handleContinueToBiometric}
              onCancel={handleCancel}
              showHeader={false}
            />
          </Box>

          {/* Biometric Form - Always rendered but conditionally visible */}
          <Box sx={{ 
            display: activeStep === 4 ? 'flex' : 'none',
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
          {activeStep !== 0 && activeStep !== 2 && activeStep !== 3 && activeStep !== 4 && (
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
                  {loading ? 'Submitting...' : activeStep === steps.length - 1 ? 'Submit Renewal' : 'Next'}
                </Button>
              </Box>
            </Box>
          </Box>
        )}

        {/* Completion Message */}
        {activeStep === steps.length && (
          <Box sx={{ p: 3, bgcolor: 'white', textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Renewal Submitted Successfully!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Your driving license renewal has been submitted and will be processed.
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
            Submitting license renewal...
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
            Driving license renewal submitted successfully!
          </Alert>
        </Snackbar>
      </Paper>
    </Container>
  );
};

export default RenewDrivingLicensePage; 