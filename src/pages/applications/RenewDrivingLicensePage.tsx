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
  TextField
} from '@mui/material';
import {
  PersonSearch as PersonSearchIcon,
  Refresh as RenewalIcon,
  LocalHospital as MedicalIcon,
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
  requiresMedicalAlways,
  requiresMedical60Plus
} from '../../types';
import { API_ENDPOINTS, getAuthToken } from '../../config/api';

const RenewDrivingLicensePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [activeStep, setActiveStep] = useState(0);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [replacementReason, setReplacementReason] = useState<string>('');
  const [officeOfIssue, setOfficeOfIssue] = useState<string>('');
  const [dateOfChange, setDateOfChange] = useState<string>('');
  const [licenseVerification, setLicenseVerification] = useState<LicenseVerificationData | null>(null);
  const [medicalInformation, setMedicalInformation] = useState<MedicalInformation | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Steps for renewal application
  const steps = [
    {
      label: 'Select Person',
      description: 'Choose person whose license needs renewal',
      icon: <PersonSearchIcon />
    },
    {
      label: 'Renewal Details',
      description: 'Provide renewal information and verify existing licenses',
      icon: <RenewalIcon />
    },
    {
      label: 'Medical Assessment',
      description: 'Complete medical clearance if required',
      icon: <MedicalIcon />
    },
    {
      label: 'Review & Submit',
      description: 'Review renewal details and submit',
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
        const hasLicenseVerification = !!licenseVerification;
        const hasRenewableLicenses = licenseVerification?.all_license_categories?.length > 0;
        return hasReason && hasOffice && hasDate && hasLocation && hasLicenseVerification && hasRenewableLicenses && !!selectedPerson && !!selectedPerson.id;
      case 2:
        const age = selectedPerson?.birth_date ? calculateAge(selectedPerson.birth_date) : 0;
        // For renewals, medical assessment is required for age 60+ or if existing license requires it
        const isMedicalMandatory = age >= 60 || 
                                 licenseVerification?.all_license_categories?.some(cat => requiresMedicalAlways(cat as LicenseCategory));
        return isMedicalMandatory ? !!medicalInformation?.medical_clearance : true;
      case 3:
        return !!selectedPerson && !!selectedPerson.id && !!replacementReason && !!licenseVerification;
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

      // Create application data
      const applicationData: ApplicationCreate = {
        person_id: selectedPerson.id,
        location_id: locationId,
        application_type: ApplicationType.RENEWAL,
        license_category: primaryCategory, // System will determine what to renew
        medical_information: medicalInformation,
        license_verification: licenseVerification,
        replacement_reason: replacementReason as any,
        office_of_issue: officeOfIssue,
        date_of_change: dateOfChange
      };

      console.log('User info:', user);
      console.log('Selected person object:', selectedPerson);
      console.log('Selected person ID:', selectedPerson.id);
      console.log('Selected location ID:', locationId);
      console.log('License verification:', licenseVerification);
      console.log('Submitting application data:', applicationData);

      const application = await applicationService.createApplication(applicationData);
      
      setSuccess('Driving license renewal submitted successfully!');
      
      // Navigate to application details
      setTimeout(() => {
        navigate(`/dashboard/applications/${application.id}`, {
          state: { 
            message: 'Driving license renewal submitted successfully',
            application 
          }
        });
      }, 2000);

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
            mode="application"
            onSuccess={handlePersonSelected}
            title=""
            subtitle="Select person whose license needs renewal"
            showHeader={false}
          />
        );

      case 1: // Renewal details step - Section C
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Section C: Renewal Details
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
              {/* Renewal Reason */}
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Reason for Renewal</InputLabel>
                  <Select
                    value={replacementReason}
                    onChange={(e) => {
                      setReplacementReason(e.target.value);
                      setError('');
                    }}
                    label="Reason for Renewal"
                  >
                    <MenuItem value="new_card">New Card (Standard Renewal)</MenuItem>
                    <MenuItem value="change_particulars">Change of Particulars (ID, name, address)</MenuItem>
                    <MenuItem value="recovery">Recovery (after suspension/revocation)</MenuItem>
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
                  placeholder="Enter the office where the current license was issued"
                />
              </Grid>

              {/* Date of Change */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date of Change/Renewal Request"
                  value={dateOfChange}
                  onChange={(e) => setDateOfChange(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>

              {/* License Verification Section */}
              {selectedPerson && (
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardHeader title="Current License Verification" />
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Verify existing licenses to determine what can be renewed
                      </Typography>
                      <LicenseVerificationSection
                        personId={selectedPerson.id}
                        value={licenseVerification}
                        onChange={setLicenseVerification}
                        locations={availableLocations}
                        currentLicenseCategory={null}
                        currentApplicationType={ApplicationType.RENEWAL}
                        disabled={false}
                      />
                      
                      {licenseVerification && licenseVerification.all_license_categories.length === 0 && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                          <Typography variant="body2">
                            <strong>No active licenses found.</strong> This person must have existing valid licenses to renew. 
                            If they have licenses from an external system, please verify them above.
                          </Typography>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Information Card */}
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ bgcolor: 'info.50' }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Section C:</strong> This section applies to driving license renewals. 
                      Please specify the reason for renewal and verify the person's current licenses. 
                      Only licenses that are currently active or recently expired can be renewed.
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
              const isMedicalMandatory = age >= 60 || 
                                       licenseVerification?.all_license_categories?.some(cat => requiresMedicalAlways(cat as LicenseCategory));

              return (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Medical assessment for license renewal
                  </Typography>

                  {isMedicalMandatory ? (
                    <Alert severity="info" sx={{ mb: 3 }}>
                      <Typography variant="body2">
                        <strong>Medical assessment is mandatory</strong> for {
                          age >= 60 ? 'applicants 60+ years' : 'commercial license categories being renewed'
                        }
                      </Typography>
                    </Alert>
                  ) : (
                    <Alert severity="success" sx={{ mb: 3 }}>
                      <Typography variant="body2">
                        <strong>Medical assessment is optional</strong> for this renewal. 
                        Standard vision test may be conducted during license collection.
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

      case 3: // Review step
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Driving License Renewal
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
              <CardHeader title="License Holder Details" />
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

            {/* Renewal Details */}
            <Card sx={{ mb: 3 }}>
              <CardHeader title="Renewal Details" />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Application Type</Typography>
                    <Typography variant="body1">Driving License Renewal</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Renewal Reason</Typography>
                    <Chip 
                      label={replacementReason.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} 
                      size="small" 
                      color="info" 
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Office of Issue</Typography>
                    <Typography variant="body1">{officeOfIssue}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Date of Renewal Request</Typography>
                    <Typography variant="body1">{dateOfChange}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Current Licenses */}
            {licenseVerification && (
              <Card sx={{ mb: 3 }}>
                <CardHeader title="Current Licenses to Renew" />
                <CardContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Verified License Categories
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    {licenseVerification.all_license_categories.length > 0 ? (
                      licenseVerification.all_license_categories.map((cat, index) => (
                        <Chip key={index} label={cat} size="small" color="primary" sx={{ mr: 1, mb: 1 }} />
                      ))
                    ) : (
                      <Alert severity="warning">
                        <Typography variant="body2">No existing licenses found to renew</Typography>
                      </Alert>
                    )}
                  </Box>
                  
                  {licenseVerification.all_license_categories.length > 0 && (
                    <Alert severity="success">
                      <Typography variant="body2">
                        {licenseVerification.all_license_categories.length} license categor{licenseVerification.all_license_categories.length === 1 ? 'y' : 'ies'} eligible for renewal
                      </Typography>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

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

            {/* Summary */}
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Next Steps:</strong> After submission, your license renewal will be processed. 
                The system will generate a new license card with updated information and extended validity. 
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
            Renew Driving License Card
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Renew existing driving license for Madagascar
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
                    {loading ? 'Submitting...' : index === steps.length - 1 ? 'Submit Renewal' : 'Next'}
                  </Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {/* Completion Message */}
        {activeStep === steps.length && (
          <Paper square elevation={0} sx={{ p: 3 }}>
            <Typography>All steps completed - driving license renewal submitted successfully!</Typography>
            <Button 
              onClick={() => navigate('/dashboard/applications')} 
              sx={{ mt: 1, mr: 1 }}
            >
              View Applications
            </Button>
          </Paper>
        )}
      </Paper>
    </Container>
  );
};

export default RenewDrivingLicensePage; 