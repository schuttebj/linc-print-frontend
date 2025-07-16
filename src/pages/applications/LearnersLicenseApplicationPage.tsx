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
  FormHelperText,
  FormControlLabel,
  Checkbox,
  TextField
} from '@mui/material';
import {
  PersonSearch as PersonSearchIcon,
  Assignment as AssignmentIcon,
  LocalHospital as MedicalIcon,
  CameraAlt as CameraIcon,
  Preview as PreviewIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  LocationOn as LocationOnIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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
  const navigate = useNavigate();

  // Form state
  const [activeStep, setActiveStep] = useState(0);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<LicenseCategory>('' as LicenseCategory);
  const [neverBeenRefused, setNeverBeenRefused] = useState<boolean>(true);
  const [refusalDetails, setRefusalDetails] = useState<string>('');
  const [medicalInformation, setMedicalInformation] = useState<MedicalInformation | null>(null);
  const [biometricData, setBiometricData] = useState<BiometricData>({});
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Steps for learner's license application
  const steps = [
    {
      label: 'Select Person',
      description: 'Choose existing person or register new learner',
      icon: <PersonSearchIcon />
    },
    {
      label: 'Application Details',
      description: 'Select learner\'s permit category and requirements',
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

  // Available learner's permit categories
  const getAvailableLearnerCategories = () => {
    return [
      {
        value: LicenseCategory.LEARNERS_1,
        label: `Code 1 - ${LEARNERS_PERMIT_RULES['1']?.description || 'Learner\'s permit for motorcycles'}`,
        minAge: LEARNERS_PERMIT_RULES['1']?.minimum_age || 16,
        description: 'Motor cycle without a sidecar, motor tricycle or motor quadrucycle, with engine of any capacity'
      },
      {
        value: LicenseCategory.LEARNERS_2,
        label: `Code 2 - ${LEARNERS_PERMIT_RULES['2']?.description || 'Learner\'s permit for light vehicles'}`,
        minAge: LEARNERS_PERMIT_RULES['2']?.minimum_age || 17,
        description: 'Light motor vehicle, other than a motor cycle, motor tricycle or motor quadrucycle'
      },
      {
        value: LicenseCategory.LEARNERS_3,
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
        const age = selectedPerson?.birth_date ? calculateAge(selectedPerson.birth_date) : 0;
        const isMedicalMandatory = requiresMedicalAlways(selectedCategory) || 
                                 (age >= 60 && requiresMedical60Plus(selectedCategory));
        return isMedicalMandatory ? !!medicalInformation?.medical_clearance : true;
      case 3:
        // Biometric step - photo is required
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
      
      setSuccess('Learner\'s license application submitted successfully!');
      
      // Navigate to applications dashboard
      setTimeout(() => {
        navigate('/dashboard/applications/dashboard', {
          state: { 
            message: 'Learner\'s license application submitted successfully',
            application 
          }
        });
      }, 2000);

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
            mode="application"
            onSuccess={handlePersonSelected}
            title=""
            subtitle="Select existing person or register new learner"
            showHeader={false}
          />
        );

      case 1: // Application details step - Section B
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Section B: Application Details
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
              {/* Learner's Permit Category Selection */}
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Learner's Permit Category</InputLabel>
                  <Select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value as LicenseCategory);
                      setError('');
                    }}
                    label="Learner's Permit Category"
                  >
                    {getAvailableLearnerCategories().map((category) => (
                      <MenuItem key={category.value} value={category.value}>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {category.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Min age: {category.minAge} years • {category.description}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Age validation warning */}
              {selectedPerson && selectedCategory && selectedPerson.birth_date && (
                (() => {
                  const age = calculateAge(selectedPerson.birth_date);
                  const requiredAge = getAvailableLearnerCategories().find(cat => cat.value === selectedCategory)?.minAge || 18;
                  return age < requiredAge ? (
                    <Grid item xs={12}>
                      <Alert severity="warning" icon={<WarningIcon />}>
                        <Typography variant="body2">
                          <strong>Age Requirement:</strong> Applicant is {age} years old, but minimum age for {selectedCategory} is {requiredAge} years.
                        </Typography>
                      </Alert>
                    </Grid>
                  ) : null;
                })()
              )}

              {/* Never been refused declaration */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardHeader title="Declaration" />
                  <CardContent>
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
                      label="I have never been refused a driving licence or learner's permit"
                    />
                    
                    {!neverBeenRefused && (
                      <Box sx={{ mt: 2 }}>
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          label="Please provide details of refusal"
                          value={refusalDetails}
                          onChange={(e) => setRefusalDetails(e.target.value)}
                          required
                          placeholder="Provide details about previous refusal including date, reason, and issuing authority..."
                        />
                      </Box>
                    )}
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
                    Complete vision test and medical clearance requirements
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
          <BiometricCaptureStep
            value={biometricData}
            onChange={setBiometricData}
            disabled={false}
          />
        );

      case 4: // Review step
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Learner's License Application
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
              <CardHeader title="Application Details" />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Application Type</Typography>
                    <Typography variant="body1">Learner's License Application</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Category</Typography>
                    <Chip label={selectedCategory} size="small" color="primary" />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Category Description</Typography>
                    <Typography variant="body1">
                      {getAvailableLearnerCategories().find(cat => cat.value === selectedCategory)?.description}
                    </Typography>
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

            {/* Biometric Data */}
            <Card sx={{ mb: 3 }}>
              <CardHeader title="Biometric Data" />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">License Photo</Typography>
                    <Chip 
                      label={biometricData.photo ? 'Captured' : 'Required'} 
                      size="small" 
                      color={biometricData.photo ? 'success' : 'error'} 
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">Digital Signature</Typography>
                    <Chip 
                      label={biometricData.signature ? 'Captured' : 'Optional'} 
                      size="small" 
                      color={biometricData.signature ? 'success' : 'default'} 
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">Fingerprint</Typography>
                    <Chip 
                      label={biometricData.fingerprint ? 'Captured' : 'Optional'} 
                      size="small" 
                      color={biometricData.fingerprint ? 'success' : 'default'} 
                    />
                  </Grid>
                </Grid>
                {biometricData.photo && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      All required biometric data has been captured for license production.
                    </Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Summary */}
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Next Steps:</strong> After submission, your learner's license application will be processed. 
                You will be notified when it's ready for collection or if additional documentation is required.
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
            Learner's License Application
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Apply for a new learner's permit for Madagascar
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
            <Typography>All steps completed - learner's license application submitted successfully!</Typography>
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

export default LearnersLicenseApplicationPage; 