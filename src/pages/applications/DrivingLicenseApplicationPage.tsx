/**
 * Driving License Application Page
 * Focused form for NEW_LICENSE applications only
 * 
 * Workflow: Person Selection (A) → Category Selection with Prerequisites (B) → Medical Assessment (D) → Review & Submit
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
  Assignment as AssignmentIcon,
  LocalHospital as MedicalIcon,
  Preview as PreviewIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  LocationOn as LocationOnIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
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
  LICENSE_CATEGORY_RULES,
  requiresMedicalAlways,
  requiresMedical60Plus,
  LicenseVerificationData
} from '../../types';
import { API_ENDPOINTS, getAuthToken } from '../../config/api';

const DrivingLicenseApplicationPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [activeStep, setActiveStep] = useState(0);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<LicenseCategory>('' as LicenseCategory);
  const [neverBeenRefused, setNeverBeenRefused] = useState<boolean>(true);
  const [refusalDetails, setRefusalDetails] = useState<string>('');
  const [licenseVerification, setLicenseVerification] = useState<LicenseVerificationData | null>(null);
  const [medicalInformation, setMedicalInformation] = useState<MedicalInformation | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [prerequisiteErrors, setPrerequisiteErrors] = useState<string[]>([]);

  // Steps for driving license application
  const steps = [
    {
      label: 'Select Person',
      description: 'Choose existing person or register new driver',
      icon: <PersonSearchIcon />
    },
    {
      label: 'Application Details',
      description: 'Select driving license category and verify prerequisites',
      icon: <AssignmentIcon />
    },
    {
      label: 'Medical Assessment',
      description: 'Complete vision test and medical clearance',
      icon: <MedicalIcon />
    },
    {
      label: 'Review & Submit',
      description: 'Review application details and submit',
      icon: <PreviewIcon />
    }
  ];

  // Available driving license categories (excluding learner's permit codes)
  const getAvailableDrivingCategories = () => {
    return Object.values(LicenseCategory)
      .filter(category => !['1', '2', '3'].includes(category)) // Exclude learner's permit codes
      .map(category => {
        const categoryRule = LICENSE_CATEGORY_RULES[category];
        return {
          value: category,
          label: `${category} - ${categoryRule?.description || 'License category'}`,
          minAge: categoryRule?.minimum_age || 18,
          prerequisites: categoryRule?.prerequisites || [],
          description: categoryRule?.description || '',
          requiresLearners: categoryRule?.requires_learners_permit || false
        };
      }).sort((a, b) => {
        // Sort by category order (A1, A2, A, B1, B, B2, BE, C1, C, C1E, CE, D1, D, D2)
        const order = ['A1', 'A2', 'A', 'B1', 'B', 'B2', 'BE', 'C1', 'C', 'C1E', 'CE', 'D1', 'D', 'D2'];
        return order.indexOf(a.value) - order.indexOf(b.value);
      });
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

  // Check license prerequisites when category changes
  useEffect(() => {
    if (selectedCategory && selectedPerson && licenseVerification) {
      const categoryRule = LICENSE_CATEGORY_RULES[selectedCategory];
      const errors: string[] = [];

      // Check age requirement
      const age = selectedPerson.birth_date ? calculateAge(selectedPerson.birth_date) : 0;
      if (age < (categoryRule?.minimum_age || 18)) {
        errors.push(`Minimum age for ${selectedCategory} is ${categoryRule?.minimum_age || 18} years (applicant is ${age} years)`);
      }

      // Check prerequisites
      if (categoryRule?.prerequisites && categoryRule.prerequisites.length > 0) {
        const hasPrerequisites = categoryRule.prerequisites.every(reqCategory => 
          licenseVerification.all_license_categories.includes(reqCategory)
        );
        if (!hasPrerequisites) {
          errors.push(`${selectedCategory} requires existing license(s): ${categoryRule.prerequisites.join(', ')}`);
        }
      }

      // Check for learner's permit requirement
      if (categoryRule?.requires_learners_permit) {
        const hasLearnersPermit = licenseVerification.all_license_categories.some(cat => 
          ['1', '2', '3'].includes(cat)
        );
        if (!hasLearnersPermit) {
          errors.push(`${selectedCategory} requires a valid learner's permit`);
        }
      }

      setPrerequisiteErrors(errors);
    }
  }, [selectedCategory, selectedPerson, licenseVerification]);

  // Step validation
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!selectedPerson && !!selectedPerson.id;
      case 1:
        const hasCategory = !!selectedCategory;
        const hasLocation = !!user?.primary_location_id || !!selectedLocationId;
        const hasRefusalInfo = neverBeenRefused || !!refusalDetails.trim();
        const hasValidPrerequisites = prerequisiteErrors.length === 0;
        const hasLicenseVerification = !!licenseVerification;
        return hasCategory && hasLocation && hasRefusalInfo && hasValidPrerequisites && hasLicenseVerification && !!selectedPerson && !!selectedPerson.id;
      case 2:
        const age = selectedPerson?.birth_date ? calculateAge(selectedPerson.birth_date) : 0;
        const isMedicalMandatory = requiresMedicalAlways(selectedCategory) || 
                                 (age >= 60 && requiresMedical60Plus(selectedCategory));
        return isMedicalMandatory ? !!medicalInformation?.medical_clearance : true;
      case 3:
        return !!selectedPerson && !!selectedPerson.id && !!selectedCategory && prerequisiteErrors.length === 0;
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

    // Check prerequisites one more time
    if (prerequisiteErrors.length > 0) {
      setError('Please resolve prerequisite requirements before submitting');
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
        application_type: ApplicationType.NEW_LICENSE,
        license_category: selectedCategory,
        medical_information: cleanMedicalInfo,
        license_verification: licenseVerification,
        never_been_refused: neverBeenRefused,
        refusal_details: neverBeenRefused ? undefined : refusalDetails
      };

      console.log('User info:', user);
      console.log('Selected person object:', selectedPerson);
      console.log('Selected person ID:', selectedPerson.id);
      console.log('Selected location ID:', locationId);
      console.log('Selected category:', selectedCategory);
      console.log('License verification:', licenseVerification);
      console.log('Submitting application data:', applicationData);

      const application = await applicationService.createApplication(applicationData);
      
      setSuccess('Driving license application submitted successfully!');
      
      // Navigate to application details
      setTimeout(() => {
        navigate(`/dashboard/applications/${application.id}`, {
          state: { 
            message: 'Driving license application submitted successfully',
            application 
          }
        });
      }, 2000);

    } catch (err: any) {
      console.error('Submission error:', err);
      let errorMessage = 'Failed to submit driving license application';
      
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
            subtitle="Select existing person or register new driver"
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
              {/* Driving License Category Selection */}
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Driving License Category</InputLabel>
                  <Select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value as LicenseCategory);
                      setError('');
                    }}
                    label="Driving License Category"
                  >
                    {getAvailableDrivingCategories().map((category) => (
                      <MenuItem key={category.value} value={category.value}>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {category.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Min age: {category.minAge} years
                            {category.prerequisites.length > 0 && ` • Requires: ${category.prerequisites.join(', ')}`}
                            {category.requiresLearners && ` • Requires learner's permit`}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Age and prerequisite validation warnings */}
              {selectedPerson && selectedCategory && prerequisiteErrors.length > 0 && (
                <Grid item xs={12}>
                  <Alert severity="error" icon={<ErrorIcon />}>
                    <Typography variant="body2" fontWeight="bold" gutterBottom>
                      Prerequisites Not Met:
                    </Typography>
                    {prerequisiteErrors.map((error, index) => (
                      <Typography key={index} variant="body2">
                        • {error}
                      </Typography>
                    ))}
                  </Alert>
                </Grid>
              )}

              {/* License Verification Section */}
              {selectedPerson && (
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardHeader title="License Verification" />
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Verify existing licenses and learner's permits to check prerequisites for {selectedCategory || 'selected category'}
                      </Typography>
                      <LicenseVerificationSection
                        personId={selectedPerson.id}
                        value={licenseVerification}
                        onChange={setLicenseVerification}
                        locations={availableLocations}
                        currentLicenseCategory={selectedCategory}
                        currentApplicationType={ApplicationType.NEW_LICENSE}
                        disabled={false}
                      />
                    </CardContent>
                  </Card>
                </Grid>
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
                          requiresMedicalAlways(selectedCategory) ? 'commercial license categories (C, D, E)' :
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

      case 3: // Review step
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Driving License Application
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
                    <Typography variant="body1">Driving License Application</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Category</Typography>
                    <Chip label={selectedCategory} size="small" color="primary" />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Category Description</Typography>
                    <Typography variant="body1">
                      {getAvailableDrivingCategories().find(cat => cat.value === selectedCategory)?.description}
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

            {/* License Verification Summary */}
            {licenseVerification && (
              <Card sx={{ mb: 3 }}>
                <CardHeader title="License Verification" />
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Verified License Categories</Typography>
                  <Box sx={{ mt: 1, mb: 2 }}>
                    {licenseVerification.all_license_categories.length > 0 ? (
                      licenseVerification.all_license_categories.map((cat, index) => (
                        <Chip key={index} label={cat} size="small" sx={{ mr: 1, mb: 1 }} />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">No existing licenses found</Typography>
                    )}
                  </Box>
                  
                  {prerequisiteErrors.length === 0 ? (
                    <Alert severity="success">
                      <Typography variant="body2">All prerequisites for {selectedCategory} have been met</Typography>
                    </Alert>
                  ) : (
                    <Alert severity="error">
                      <Typography variant="body2">Prerequisites not met - application cannot proceed</Typography>
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
                <strong>Next Steps:</strong> After submission, your driving license application will be processed. 
                Theory and practical tests may be required depending on the license category. 
                You will be notified when it's ready for collection or if additional steps are required.
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
            Driving License Application
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Apply for a new driving license for Madagascar
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
            <Typography>All steps completed - driving license application submitted successfully!</Typography>
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

export default DrivingLicenseApplicationPage; 