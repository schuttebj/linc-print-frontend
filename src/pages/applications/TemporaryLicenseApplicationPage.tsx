import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Box,
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
  CircularProgress,
  Stack
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
  AccessTime as AccessTimeIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon
} from '@mui/icons-material';

import PersonFormWrapper from '../../components/PersonFormWrapper';
import MedicalInformationSection from '../../components/applications/MedicalInformationSection';
import BiometricCaptureStep, { BiometricData } from '../../components/applications/BiometricCaptureStep';
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

const steps = [
  {
    label: 'Select Person',
    description: 'Choose existing person or register new applicant',
    icon: <PersonSearchIcon />
  },
  {
    label: 'License Category',
    description: 'Select temporary license category and validity period',
    icon: <AssignmentIcon />
  },
  {
    label: 'Medical Assessment',
    description: 'Complete vision test and medical clearance',
    icon: <MedicalIcon />
  },
  {
    label: 'Biometric Data',
    description: 'Capture photo, signature, and fingerprint',
    icon: <CameraIcon />
  },
  {
    label: 'Review & Submit',
    description: 'Review application details and submit',
    icon: <PreviewIcon />
  }
];

const TemporaryLicenseApplicationPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [activeStep, setActiveStep] = useState(0);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<LicenseCategory | null>(null);
  const [medicalInformation, setMedicalInformation] = useState<MedicalInformation | null>(null);
  const [biometricData, setBiometricData] = useState<BiometricData>({});
  const [neverBeenRefused, setNeverBeenRefused] = useState<boolean>(true);
  const [refusalDetails, setRefusalDetails] = useState<string>('');
  const [validityPeriod, setValidityPeriod] = useState<number>(30); // Default 30 days
  const [tempReason, setTempReason] = useState<string>('');

  // UI State  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');

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

  const getAvailableTemporaryCategories = () => {
    return [
      {
        value: LicenseCategory.B,
        label: 'B - Light Motor Vehicle',
        description: 'Standard passenger cars and light vehicles (up to 3.5t)',
        minAge: 18,
        icon: <DirectionsCarIcon />
      },
      {
        value: LicenseCategory.C,
        label: 'C - Heavy Goods Vehicle',
        description: 'Heavy goods vehicles (over 7.5t)',
        minAge: 21,
        icon: <DirectionsCarIcon />
      },
      {
        value: LicenseCategory.D,
        label: 'D - Passenger Transport',
        description: 'Buses and coaches (over 16 passengers)',
        minAge: 24,
        icon: <DirectionsCarIcon />
      }
    ];
  };

  const getValidityPeriodOptions = () => {
    return [
      { value: 14, label: '14 days' },
      { value: 30, label: '30 days' },
      { value: 60, label: '60 days' },
      { value: 90, label: '90 days' }
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

  // Step validation
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!selectedPerson && !!selectedPerson.id;
      case 1:
        const hasReason = !!tempReason.trim();
        const hasLocation = !!user?.primary_location_id || !!selectedLocationId;
        const hasLicenseVerification = !!selectedCategory;
        const hasEligibleLicenses = selectedCategory !== null;
        return hasReason && hasLocation && hasLicenseVerification && hasEligibleLicenses && !!selectedPerson && !!selectedPerson.id;
      case 2:
        const age = selectedPerson?.birth_date ? calculateAge(selectedPerson.birth_date) : 0;
        const isMedicalMandatory = requiresMedicalAlways(selectedCategory) || 
                                 (age >= 60 && requiresMedical60Plus(selectedCategory));
        return isMedicalMandatory ? !!medicalInformation?.medical_clearance : true;
      case 3:
        // Biometric step - photo and signature required for temporary licenses (card-eligible)
        const hasPhoto = !!biometricData.photo;
        const hasRequiredSignature = !!biometricData.signature; // Required for temporary licenses
        return hasPhoto && hasRequiredSignature;
      case 4:
        const finalHasPhoto = !!biometricData.photo;
        const finalHasRequiredSignature = !!biometricData.signature; // Required for temporary licenses
        return !!selectedPerson && !!selectedPerson.id && !!tempReason && !!selectedCategory && finalHasPhoto && finalHasRequiredSignature;
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
        application_type: ApplicationType.TEMPORARY_LICENSE,
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
      console.log('Validity period:', validityPeriod);
      console.log('Temporary reason:', tempReason);
      console.log('Submitting application data:', applicationData);

      const application = await applicationService.createApplication(applicationData);
      
      setSuccess('Temporary driving license application submitted successfully!');
      
      // Navigate to applications dashboard
      setTimeout(() => {
        navigate('/dashboard/applications/dashboard', {
          state: { 
            message: 'Temporary driving license application submitted successfully',
            application 
          }
        });
      }, 2000);

    } catch (err: any) {
      console.error('Submission error:', err);
      let errorMessage = 'Failed to submit temporary driving license application';
      
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
            subtitle="Select existing person or register new applicant"
            showHeader={false}
          />
        );

      case 1: // Application details step - Section B
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Section B: Temporary License Details
            </Typography>

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

            <Grid container spacing={3}>
              {/* License Category Selection */}
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Temporary License Category</InputLabel>
                  <Select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value as LicenseCategory);
                      setError('');
                    }}
                    label="Temporary License Category"
                  >
                    {getAvailableTemporaryCategories().map((category) => (
                      <MenuItem key={category.value} value={category.value}>
                        <Box display="flex" alignItems="center">
                          {category.icon}
                          <Box sx={{ ml: 2 }}>
                            <Typography variant="body2" fontWeight="bold">
                              {category.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Min age: {category.minAge} years • {category.description}
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Validity Period */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Validity Period</InputLabel>
                  <Select
                    value={validityPeriod}
                    onChange={(e) => setValidityPeriod(e.target.value as number)}
                    label="Validity Period"
                  >
                    {getValidityPeriodOptions().map((period) => (
                      <MenuItem key={period.value} value={period.value}>
                        <Box display="flex" alignItems="center">
                          <AccessTimeIcon sx={{ mr: 1 }} />
                          {period.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Reason for Temporary License */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Reason for Temporary License"
                  value={tempReason}
                  onChange={(e) => setTempReason(e.target.value)}
                  multiline
                  rows={3}
                  required
                  placeholder="Explain why a temporary license is needed (e.g., emergency travel, work requirements, etc.)"
                />
              </Grid>

              {/* Age validation warning */}
              {selectedPerson && selectedCategory && selectedPerson.birth_date && (
                (() => {
                  const age = calculateAge(selectedPerson.birth_date);
                  const requiredAge = getAvailableTemporaryCategories().find(cat => cat.value === selectedCategory)?.minAge || 18;
                  return age < requiredAge ? (
                    <Grid item xs={12}>
                      <Alert severity="warning" icon={<WarningIcon />}>
                        <Typography variant="body2">
                          <strong>Age Requirement Not Met:</strong> Applicant is {age} years old, but category {selectedCategory} requires minimum {requiredAge} years.
                        </Typography>
                      </Alert>
                    </Grid>
                  ) : null;
                })()
              )}

              {/* Never Been Refused Declaration */}
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Declaration - Section B
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
                        />
                      }
                      label="I have never been refused a driving license or had a driving license suspended or revoked"
                    />
                    
                    {!neverBeenRefused && (
                      <TextField
                        fullWidth
                        label="Details of Previous Refusal/Suspension/Revocation"
                        value={refusalDetails}
                        onChange={(e) => setRefusalDetails(e.target.value)}
                        multiline
                        rows={3}
                        sx={{ mt: 2 }}
                        required
                        placeholder="Please provide details of any previous refusal, suspension, or revocation"
                      />
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Information Card */}
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ bgcolor: 'warning.50' }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Section B:</strong> Temporary driving licenses are issued for specific urgent situations. 
                      The validity period is limited and the license cannot be renewed - a full application must be submitted for a permanent license.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );

      case 2: // Medical step - Section D
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Section D: Medical Assessment
            </Typography>
            
            {(() => {
              const age = selectedPerson?.birth_date ? calculateAge(selectedPerson.birth_date) : 0;
              const isMedicalMandatory = requiresMedicalAlways(selectedCategory) || 
                                       (age >= 60 && requiresMedical60Plus(selectedCategory));

              return (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Complete vision test and medical clearance requirements for temporary license
                  </Typography>

                  {isMedicalMandatory && (
                    <Alert severity="info" sx={{ mb: 3 }}>
                      <Typography variant="body2">
                        <strong>Medical assessment is mandatory</strong> for {
                          age >= 60 ? 'applicants 60+ years' : 'this license category'
                        }
                      </Typography>
                    </Alert>
                  )}

                  <MedicalInformationSection
                    value={medicalInformation}
                    onChange={setMedicalInformation}
                    disabled={false}
                    isRequired={isMedicalMandatory}
                  />
                </>
              );
            })()}
          </Box>
        );

      case 3: // Biometric step
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Section E: Biometric Data Capture
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Capture photo, signature, and fingerprint for license production
            </Typography>
            
            <BiometricCaptureStep
              value={biometricData}
              onChange={setBiometricData}
              personId={selectedPerson?.id}
              demoMode={import.meta.env.DEV || localStorage.getItem('biometric_demo_mode') === 'true'}
            />
          </Box>
        );

      case 4: // Review step
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Temporary Driving License Application
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
              <CardHeader title="Applicant Details" />
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
                    <Typography variant="body2" color="text.secondary">Age</Typography>
                    <Typography variant="body1">
                      {selectedPerson?.birth_date ? calculateAge(selectedPerson.birth_date) : 'Unknown'} years
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Nationality</Typography>
                    <Typography variant="body1">{selectedPerson?.nationality_code}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Application Details */}
            <Card sx={{ mb: 3 }}>
              <CardHeader title="Temporary License Details" />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Application Type</Typography>
                    <Typography variant="body1">Temporary Driving License</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Category</Typography>
                    <Chip label={selectedCategory} size="small" color="primary" />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Validity Period</Typography>
                    <Typography variant="body1">{validityPeriod} days</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Reason</Typography>
                    <Typography variant="body1">{tempReason}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Declaration</Typography>
                    <Typography variant="body1">
                      {neverBeenRefused ? (
                        <Chip label="Never been refused" size="small" color="success" />
                      ) : (
                        <>
                          <Chip label="Previously refused" size="small" color="warning" />
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            <strong>Details:</strong> {refusalDetails}
                          </Typography>
                        </>
                      )}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Medical Information */}
            {medicalInformation && (
              <Card sx={{ mb: 3 }}>
                <CardHeader title="Medical Assessment" />
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Medical Clearance</Typography>
                  <Chip 
                    label={medicalInformation.medical_clearance ? 'Cleared' : 'Not Cleared'} 
                    size="small" 
                    color={medicalInformation.medical_clearance ? 'success' : 'error'} 
                  />
                  {medicalInformation.medical_restrictions.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">Restrictions</Typography>
                      <Typography variant="body1">{medicalInformation.medical_restrictions.join(', ')}</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Biometric Information */}
            <Card sx={{ mb: 3 }}>
              <CardHeader title="Biometric Data" />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">License Photo</Typography>
                    <Chip 
                      label={biometricData.photo ? 'Captured' : 'Not Captured'} 
                      size="small" 
                      color={biometricData.photo ? 'success' : 'default'} 
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <EditIcon color={biometricData.signature ? 'success' : 'warning'} />
                      <Typography variant="body2">
                        Signature
                      </Typography>
                      <Chip
                        label={biometricData.signature ? 'Captured' : 'Required'}
                        color={biometricData.signature ? 'success' : 'warning'}
                        size="small"
                      />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">Fingerprint</Typography>
                    <Chip 
                      label={biometricData.fingerprint ? 'Captured' : 'Not Captured'} 
                      size="small" 
                      color={biometricData.fingerprint ? 'success' : 'default'} 
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Summary */}
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Important:</strong> This is a temporary license with limited validity ({validityPeriod} days). 
                For a permanent license, you must submit a full new license application.
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
            Temporary Driving License Application
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Apply for a temporary driving license for urgent situations
          </Typography>
        </Box>

        {/* Error/Success Messages */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
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
                    {loading ? 'Submitting...' : index === steps.length - 1 ? 'Submit Application' : 'Next'}
                  </Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {/* Completion Message */}
        {activeStep === steps.length && (
          <Paper square elevation={0} sx={{ p: 3 }}>
            <Typography>All steps completed - temporary license application submitted successfully!</Typography>
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

export default TemporaryLicenseApplicationPage; 