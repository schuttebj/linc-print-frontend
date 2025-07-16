/**
 * Duplicate of Learner's Licence Page
 * Focused form for LEARNERS_PERMIT_DUPLICATE applications only
 * 
 * Workflow: Person Selection (A) → Notice Details (C) → Medical Assessment (D) → Review & Submit
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
  Receipt as NoticeIcon,
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
  requiresMedicalAlways,
  requiresMedical60Plus
} from '../../types';
import { API_ENDPOINTS, getAuthToken } from '../../config/api';

const DuplicateLearnersLicensePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [activeStep, setActiveStep] = useState(0);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [replacementReason, setReplacementReason] = useState<string>('');
  const [officeOfIssue, setOfficeOfIssue] = useState<string>('');
  const [dateOfChange, setDateOfChange] = useState<string>('');
  const [policeReported, setPoliceReported] = useState<boolean>(false);
  const [policeStation, setPoliceStation] = useState<string>('');
  const [policeReferenceNumber, setPoliceReferenceNumber] = useState<string>('');
  const [medicalInformation, setMedicalInformation] = useState<MedicalInformation | null>(null);
  const [biometricData, setBiometricData] = useState<BiometricData>({});
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Steps for duplicate learner's license
  const steps = [
    {
      label: 'Select Person',
      description: 'Choose existing person who needs duplicate learner\'s licence',
      icon: <PersonSearchIcon />
    },
    {
      label: 'Duplicate Request Details',
      description: 'Provide details about the duplicate request',
      icon: <NoticeIcon />
    },
    {
      label: 'Medical Assessment',
      description: 'Complete vision test and medical clearance if required',
      icon: <MedicalIcon />
    },
    {
      label: 'Biometric Data',
      description: 'Capture photo, signature, and fingerprint',
      icon: <CameraIcon />
    },
    {
      label: 'Review & Submit',
      description: 'Review request details and submit',
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
        const hasReason = !!replacementReason;
        const hasOffice = !!officeOfIssue.trim();
        const hasDate = !!dateOfChange;
        const hasLocation = !!user?.primary_location_id || !!selectedLocationId;
        const hasPoliceInfo = !['theft', 'loss'].includes(replacementReason) || 
                             !policeReported || 
                             (!!policeStation.trim() && !!policeReferenceNumber.trim());
        return hasReason && hasOffice && hasDate && hasLocation && hasPoliceInfo && !!selectedPerson && !!selectedPerson.id;
      case 2:
        const age = selectedPerson?.birth_date ? calculateAge(selectedPerson.birth_date) : 0;
        // For duplicates, medical might not be as strict, but keep the same logic
        const isMedicalMandatory = age >= 60; // Simplified for duplicates
        return isMedicalMandatory ? !!medicalInformation?.medical_clearance : true;
      case 3:
        return !!biometricData.photo;
      case 4:
        return !!selectedPerson && !!selectedPerson.id && !!replacementReason;
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
    if (!selectedPerson || !replacementReason) {
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

      // Check if medical is mandatory for duplicate
      const age = selectedPerson?.birth_date ? calculateAge(selectedPerson.birth_date) : 0;
      const isMedicalMandatory = age >= 60; // For duplicates, typically only age-based

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

      // Create application data - Note: For duplicates, we don't need to specify license_category
      // The system will look up the person's existing learner's permit
      const applicationData: ApplicationCreate = {
        person_id: selectedPerson.id,
        location_id: locationId,
        application_type: ApplicationType.LEARNERS_PERMIT_DUPLICATE,
        license_category: LicenseCategory.LEARNERS_1, // Temporary - backend should determine from existing permit
        medical_information: cleanMedicalInfo,
        replacement_reason: replacementReason as any,
        office_of_issue: officeOfIssue,
        date_of_change: dateOfChange,
        police_reported: policeReported,
        police_station: policeReported ? policeStation : undefined,
        police_reference_number: policeReported ? policeReferenceNumber : undefined
      };

      console.log('User info:', user);
      console.log('Selected person object:', selectedPerson);
      console.log('Selected person ID:', selectedPerson.id);
      console.log('Selected location ID:', locationId);
      console.log('Submitting application data:', applicationData);

      const application = await applicationService.createApplication(applicationData);
      
      setSuccess('Duplicate learner\'s license request submitted successfully!');
      
      // Navigate to applications dashboard
      setTimeout(() => {
        navigate('/dashboard/applications/dashboard', {
          state: { 
            message: 'Duplicate learner\'s license request submitted successfully',
            application 
          }
        });
      }, 2000);

    } catch (err: any) {
      console.error('Submission error:', err);
      let errorMessage = 'Failed to submit duplicate learner\'s license request';
      
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
            subtitle="Select existing person who needs duplicate learner's licence"
            showHeader={false}
          />
        );

      case 1: // Notice details step - Section C
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Section C: Duplicate Request Details
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
              {/* Replacement Reason */}
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Reason for Duplicate Request</InputLabel>
                  <Select
                    value={replacementReason}
                    onChange={(e) => {
                      setReplacementReason(e.target.value);
                      // Reset police fields when reason changes
                      setPoliceReported(false);
                      setPoliceStation('');
                      setPoliceReferenceNumber('');
                      setError('');
                    }}
                    label="Reason for Duplicate Request"
                  >
                    <MenuItem value="theft">Theft</MenuItem>
                    <MenuItem value="loss">Loss</MenuItem>
                    <MenuItem value="destruction">Destruction</MenuItem>
                    <MenuItem value="recovery">Recovery</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Office of Issue */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Office of Issue"
                  value={officeOfIssue}
                  onChange={(e) => setOfficeOfIssue(e.target.value)}
                  required
                  placeholder="Enter the office where the original learner's permit was issued"
                />
              </Grid>

              {/* Date of Change */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date of Change/Incident"
                  value={dateOfChange}
                  onChange={(e) => setDateOfChange(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>

              {/* Police Report Section - Only for theft/loss */}
              {(replacementReason === 'theft' || replacementReason === 'loss') && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                      Police Report Details
                    </Typography>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={policeReported}
                          onChange={(e) => {
                            setPoliceReported(e.target.checked);
                            if (!e.target.checked) {
                              setPoliceStation('');
                              setPoliceReferenceNumber('');
                            }
                          }}
                        />
                      }
                      label={`${replacementReason === 'theft' ? 'Theft' : 'Loss'} reported to Police`}
                    />
                  </Grid>

                  {policeReported && (
                    <>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Police Station"
                          value={policeStation}
                          onChange={(e) => setPoliceStation(e.target.value)}
                          required
                          placeholder="Name of police station where report was made"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Reference Number (CAS no.)"
                          value={policeReferenceNumber}
                          onChange={(e) => setPoliceReferenceNumber(e.target.value)}
                          required
                          placeholder="Police case reference number"
                        />
                      </Grid>
                    </>
                  )}
                </>
              )}

              {/* Information Card */}
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ bgcolor: 'info.50' }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Section C:</strong> This section applies to duplicate learner's licence requests. 
                      Please specify the reason for requesting a duplicate and provide all required details. 
                      If the permit was lost or stolen, police reporting is recommended for security purposes.
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
              const isMedicalMandatory = age >= 60; // Simplified for duplicates

              return (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Medical assessment for duplicate learner's licence requests
                  </Typography>

                  {isMedicalMandatory ? (
                    <Alert severity="info" sx={{ mb: 3 }}>
                      <Typography variant="body2">
                        <strong>Medical assessment is mandatory</strong> for applicants 60+ years
                      </Typography>
                    </Alert>
                  ) : (
                    <Alert severity="success" sx={{ mb: 3 }}>
                      <Typography variant="body2">
                        <strong>Medical assessment is optional</strong> for this duplicate request. 
                        You may skip this step unless specifically required.
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
            />
          </Box>
        );

      case 4: // Review step
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Duplicate Learner's License Request
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

            {/* Duplicate Request Details */}
            <Card sx={{ mb: 3 }}>
              <CardHeader title="Duplicate Request Details" />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Request Type</Typography>
                    <Typography variant="body1">Duplicate Learner's License</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Reason</Typography>
                    <Chip 
                      label={replacementReason.charAt(0).toUpperCase() + replacementReason.slice(1)} 
                      size="small" 
                      color={['theft', 'loss'].includes(replacementReason) ? 'warning' : 'info'} 
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Office of Issue</Typography>
                    <Typography variant="body1">{officeOfIssue}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Date of Change/Incident</Typography>
                    <Typography variant="body1">{dateOfChange}</Typography>
                  </Grid>
                  
                  {['theft', 'loss'].includes(replacementReason) && (
                    <>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">Police Reported</Typography>
                        <Chip 
                          label={policeReported ? 'Yes' : 'No'} 
                          size="small" 
                          color={policeReported ? 'success' : 'default'} 
                        />
                      </Grid>
                      {policeReported && (
                        <>
                          <Grid item xs={12} md={6}>
                            <Typography variant="body2" color="text.secondary">Police Station</Typography>
                            <Typography variant="body1">{policeStation}</Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary">Police Reference Number</Typography>
                            <Typography variant="body1">{policeReferenceNumber}</Typography>
                          </Grid>
                        </>
                      )}
                    </>
                  )}
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
                    <Typography variant="body2" color="text.secondary">Digital Signature</Typography>
                    <Chip 
                      label={biometricData.signature ? 'Captured' : 'Not Captured'} 
                      size="small" 
                      color={biometricData.signature ? 'success' : 'default'} 
                    />
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
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Next Steps:</strong> After submission, your duplicate learner's license request will be processed. 
                The system will verify your existing learner's permit details and issue a duplicate card. 
                You will be notified when it's ready for collection.
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
            Duplicate of Learner's Licence
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Request a duplicate learner's permit for Madagascar
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
                    {loading ? 'Submitting...' : index === steps.length - 1 ? 'Submit Request' : 'Next'}
                  </Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {/* Completion Message */}
        {activeStep === steps.length && (
          <Paper square elevation={0} sx={{ p: 3 }}>
            <Typography>All steps completed - duplicate learner's license request submitted successfully!</Typography>
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

export default DuplicateLearnersLicensePage; 