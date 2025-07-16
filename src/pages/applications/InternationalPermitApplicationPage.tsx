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
  CircularProgress
} from '@mui/material';
import {
  PersonSearch as PersonSearchIcon,
  Assignment as AssignmentIcon,
  LocalHospital as MedicalIcon,
  CameraAlt as CameraIcon,
  Preview as PreviewIcon,
  LocationOn as LocationOnIcon,
  Language as LanguageIcon,
  Warning as WarningIcon,
  FlightTakeoff as FlightTakeoffIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

import PersonFormWrapper from '../../components/PersonFormWrapper';
import LicenseVerificationSection from '../../components/applications/LicenseVerificationSection';
import MedicalInformationSection from '../../components/applications/MedicalInformationSection';
import BiometricCaptureStep, { BiometricData } from '../../components/applications/BiometricCaptureStep';
import { 
  Person, 
  ApplicationType, 
  LicenseCategory, 
  ApplicationCreate,
  MedicalInformation,
  LicenseVerificationData,
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
    label: 'License Verification',
    description: 'Verify existing licenses for international permit eligibility',
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

const InternationalPermitApplicationPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [activeStep, setActiveStep] = useState(0);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [licenseVerification, setLicenseVerification] = useState<LicenseVerificationData | null>(null);
  const [medicalInformation, setMedicalInformation] = useState<MedicalInformation | null>(null);
  const [biometricData, setBiometricData] = useState<BiometricData>({});
  const [neverBeenRefused, setNeverBeenRefused] = useState<boolean>(true);
  const [refusalDetails, setRefusalDetails] = useState<string>('');
  
  // International permit specific
  const [travelPurpose, setTravelPurpose] = useState<string>('');
  const [travelCountries, setTravelCountries] = useState<string>('');
  const [travelStartDate, setTravelStartDate] = useState<string>('');
  const [travelEndDate, setTravelEndDate] = useState<string>('');

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

  const getTravelPurposeOptions = () => {
    return [
      'Business Travel',
      'Tourism',
      'Work Assignment',
      'Study/Education',
      'Medical Treatment',
      'Family Visit',
      'Other'
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
      case 0: // Person step
        return selectedPerson !== null && selectedPerson.id !== undefined;
      case 1: // License verification step
        const locationValid = user?.primary_location_id || selectedLocationId;
        return locationValid && 
               licenseVerification !== null && 
               licenseVerification.all_license_categories.length > 0 &&
               travelPurpose.trim() !== '' &&
               travelCountries.trim() !== '' &&
               travelStartDate.trim() !== '' &&
               travelEndDate.trim() !== '';
      case 2: // Medical step
        if (!selectedPerson) return false;
        const age = selectedPerson.birth_date ? calculateAge(selectedPerson.birth_date) : 0;
        // International permits typically require medical for 60+ or specific license categories
        const isMedicalMandatory = age >= 60 || 
                                 licenseVerification?.all_license_categories?.some(cat => requiresMedicalAlways(cat as LicenseCategory));
        return !isMedicalMandatory || (medicalInformation?.medical_clearance === true);
      case 3: // Biometric step
        return !!biometricData.photo;
      case 4: // Review step
        return true;
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
    if (!selectedPerson || !licenseVerification) {
      setError('Missing required data for submission');
      return;
    }

    // Check if there are valid licenses
    if (!licenseVerification.all_license_categories || licenseVerification.all_license_categories.length === 0) {
      setError('No existing licenses found. You must have a valid Madagascar driving license to apply for an International Permit.');
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

      // Use the primary license category for the international permit
      const primaryCategory = licenseVerification.all_license_categories[0] as LicenseCategory;

      // Check if medical is mandatory
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
        application_type: ApplicationType.INTERNATIONAL_PERMIT,
        license_category: primaryCategory,
        medical_information: cleanMedicalInfo,
        license_verification: licenseVerification,
        never_been_refused: neverBeenRefused,
        refusal_details: neverBeenRefused ? undefined : refusalDetails
      };

      console.log('User info:', user);
      console.log('Selected person object:', selectedPerson);
      console.log('Selected person ID:', selectedPerson.id);
      console.log('Selected location ID:', locationId);
      console.log('License verification:', licenseVerification);
      console.log('Travel details:', {
        purpose: travelPurpose,
        countries: travelCountries,
        startDate: travelStartDate,
        endDate: travelEndDate
      });
      console.log('Submitting application data:', applicationData);

      const application = await applicationService.createApplication(applicationData);
      
      setSuccess('International driving permit application submitted successfully!');
      
      // Navigate to application details
      setTimeout(() => {
        navigate(`/dashboard/applications/${application.id}`, {
          state: { 
            message: 'International driving permit application submitted successfully',
            application 
          }
        });
      }, 2000);

    } catch (err: any) {
      console.error('Submission error:', err);
      let errorMessage = 'Failed to submit international driving permit application';
      
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
            subtitle="Select existing person who needs international permit"
            showHeader={false}
          />
        );

      case 1: // License verification step - Section B
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Section B: License Verification & Travel Details
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

            {/* License Verification Section */}
            {selectedPerson && (
              <Card sx={{ mb: 3 }}>
                <CardHeader title="Current License Verification" />
                <CardContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Verify existing Madagascar licenses that will be covered by the international permit
                  </Typography>
                  <LicenseVerificationSection
                    personId={selectedPerson.id}
                    value={licenseVerification}
                    onChange={setLicenseVerification}
                    locations={availableLocations}
                    currentLicenseCategory={null}
                    currentApplicationType={ApplicationType.INTERNATIONAL_PERMIT}
                    disabled={false}
                  />
                  
                  {licenseVerification && licenseVerification.all_license_categories.length === 0 && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        <strong>No valid licenses found.</strong> You must have a valid Madagascar driving license to apply for an International Permit.
                      </Typography>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Travel Details */}
            <Card sx={{ mb: 3 }}>
              <CardHeader title="Travel Details" avatar={<FlightTakeoffIcon />} />
              <CardContent>
                <Grid container spacing={3}>
                  {/* Travel Purpose */}
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Purpose of Travel</InputLabel>
                      <Select
                        value={travelPurpose}
                        onChange={(e) => setTravelPurpose(e.target.value)}
                        label="Purpose of Travel"
                      >
                        {getTravelPurposeOptions().map((purpose) => (
                          <MenuItem key={purpose} value={purpose}>
                            {purpose}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Travel Start Date */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Travel Start Date"
                      value={travelStartDate}
                      onChange={(e) => setTravelStartDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      required
                    />
                  </Grid>

                  {/* Travel End Date */}
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Travel End Date"
                      value={travelEndDate}
                      onChange={(e) => setTravelEndDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      required
                    />
                  </Grid>

                  {/* Countries to Visit */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Countries to Visit"
                      value={travelCountries}
                      onChange={(e) => setTravelCountries(e.target.value)}
                      multiline
                      rows={3}
                      required
                      placeholder="List all countries you plan to visit (e.g., South Africa, Botswana, Zimbabwe)"
                    />
                  </Grid>

                  {/* Travel Date Validation */}
                  {travelStartDate && travelEndDate && (
                    (() => {
                      const startDate = new Date(travelStartDate);
                      const endDate = new Date(travelEndDate);
                      const today = new Date();
                      
                      if (startDate <= today) {
                        return (
                          <Grid item xs={12}>
                            <Alert severity="warning" icon={<WarningIcon />}>
                              <Typography variant="body2">
                                <strong>Travel Start Date:</strong> The travel start date should be in the future to allow processing time.
                              </Typography>
                            </Alert>
                          </Grid>
                        );
                      } else if (endDate <= startDate) {
                        return (
                          <Grid item xs={12}>
                            <Alert severity="error" icon={<WarningIcon />}>
                              <Typography variant="body2">
                                <strong>Invalid Date Range:</strong> Travel end date must be after the start date.
                              </Typography>
                            </Alert>
                          </Grid>
                        );
                      }
                      return null;
                    })()
                  )}
                </Grid>
              </CardContent>
            </Card>

            {/* Never Been Refused Declaration */}
            <Card variant="outlined" sx={{ bgcolor: 'grey.50', mb: 3 }}>
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
                  label="I have never been refused an international driving permit or had one suspended or revoked"
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

            {/* Information Card */}
            <Card variant="outlined" sx={{ bgcolor: 'info.50' }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Section B:</strong> International Driving Permits are issued based on valid Madagascar licenses. 
                  The permit is valid for one year and allows driving in countries that recognize the 1968 Vienna Convention.
                </Typography>
              </CardContent>
            </Card>
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
              const isMedicalMandatory = age >= 60 || 
                                       licenseVerification?.all_license_categories?.some(cat => requiresMedicalAlways(cat as LicenseCategory));

              return (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Complete medical clearance requirements for international permit (if required)
                  </Typography>

                  {isMedicalMandatory ? (
                    <Alert severity="info" sx={{ mb: 3 }}>
                      <Typography variant="body2">
                        <strong>Medical assessment is mandatory</strong> for {
                          age >= 60 ? 'applicants 60+ years' : 'commercial license categories'
                        }
                      </Typography>
                    </Alert>
                  ) : (
                    <Alert severity="success" sx={{ mb: 3 }}>
                      <Typography variant="body2">
                        <strong>Medical assessment is optional</strong> for this application. 
                        Your existing license medical clearance covers the international permit.
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
              Review International Permit Application
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

            {/* Current Licenses */}
            {licenseVerification && (
              <Card sx={{ mb: 3 }}>
                <CardHeader title="Current Licenses (to be covered by International Permit)" />
                <CardContent>
                  <Typography variant="body2" color="text.secondary">License Categories</Typography>
                  <Box sx={{ mt: 1 }}>
                    {licenseVerification.all_license_categories.map((category) => (
                      <Chip 
                        key={category} 
                        label={category} 
                        size="small" 
                        color="primary" 
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Travel Details */}
            <Card sx={{ mb: 3 }}>
              <CardHeader title="Travel Details" avatar={<FlightTakeoffIcon />} />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Purpose</Typography>
                    <Typography variant="body1">{travelPurpose}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Travel Period</Typography>
                    <Typography variant="body1">{travelStartDate} to {travelEndDate}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Countries to Visit</Typography>
                    <Typography variant="body1">{travelCountries}</Typography>
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
                      All required biometric data has been captured for permit production.
                    </Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Summary */}
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Important:</strong> The International Driving Permit is valid for one year from issue date. 
                It must be carried alongside your original Madagascar license when driving abroad.
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
            International Driving Permit Application
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Apply for an International Driving Permit for overseas travel
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
            <Typography>All steps completed - international permit application submitted successfully!</Typography>
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

export default InternationalPermitApplicationPage; 