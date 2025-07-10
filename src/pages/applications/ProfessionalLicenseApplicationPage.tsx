import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
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
  TextField
} from '@mui/material';
import {
  LocationOn as LocationOnIcon,
  DirectionsCar as DirectionsCarIcon,
  LocalShipping as LocalShippingIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

import { PersonFormWrapper } from '../../components/PersonFormWrapper';
import { MedicalInformationSection } from '../../components/applications/MedicalInformationSection';
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

const steps = ['Person', 'Professional Categories', 'Medical Assessment', 'Review'];

const ProfessionalLicenseApplicationPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [activeStep, setActiveStep] = useState(0);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<ProfessionalPermitCategory[]>([]);
  const [medicalInformation, setMedicalInformation] = useState<MedicalInformation | null>(null);
  const [neverBeenRefused, setNeverBeenRefused] = useState<boolean>(true);
  const [refusalDetails, setRefusalDetails] = useState<string>('');
  const [professionalPreviousRefusal, setProfessionalPreviousRefusal] = useState<boolean>(false);
  const [professionalRefusalDetails, setProfessionalRefusalDetails] = useState<string>('');

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

  const getAvailableProfessionalCategories = () => {
    return [
      {
        value: ProfessionalPermitCategory.G,
        label: 'G - Goods',
        description: 'Transport of goods (18+ years)',
        minAge: 18,
        icon: <LocalShippingIcon />
      },
      {
        value: ProfessionalPermitCategory.P,
        label: 'P - Passengers', 
        description: 'Transport of passengers (21+ years)',
        minAge: 21,
        icon: <DirectionsCarIcon />
      },
      {
        value: ProfessionalPermitCategory.D,
        label: 'D - Dangerous Goods',
        description: 'Transport of dangerous goods (25+ years, includes G)',
        minAge: 25,
        icon: <WarningIcon />
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

  // Step validation
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Person step
        return selectedPerson !== null && selectedPerson.id !== undefined;
      case 1: // Categories step
        const locationValid = user?.primary_location_id || selectedLocationId;
        return locationValid && selectedCategories.length > 0;
      case 2: // Medical step
        if (!selectedPerson) return false;
        const age = selectedPerson.birth_date ? calculateAge(selectedPerson.birth_date) : 0;
        const isMedicalMandatory = age >= 60; // Professional permits typically require medical for 60+
        return !isMedicalMandatory || (medicalInformation?.medical_clearance === true);
      case 3: // Review step
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

  // Category selection handler
  const handleCategoryToggle = (category: ProfessionalPermitCategory) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        // Remove category
        return prev.filter(c => c !== category);
      } else {
        // Add category and handle dependencies
        const newCategories = [...prev, category];
        
        // If adding D (Dangerous), automatically include G (Goods)
        if (category === ProfessionalPermitCategory.D && !newCategories.includes(ProfessionalPermitCategory.G)) {
          newCategories.push(ProfessionalPermitCategory.G);
        }
        
        return newCategories;
      }
    });
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
        // Note: Professional permit categories will be handled in a separate field if backend supports it
      };

      console.log('User info:', user);
      console.log('Selected person object:', selectedPerson);
      console.log('Selected person ID:', selectedPerson.id);
      console.log('Selected location ID:', locationId);
      console.log('Selected categories:', selectedCategories);
      console.log('Submitting application data:', applicationData);

      const application = await applicationService.createApplication(applicationData);
      
      setSuccess('Professional driving license application submitted successfully!');
      
      // Navigate to application details
      setTimeout(() => {
        navigate(`/dashboard/applications/${application.id}`, {
          state: { 
            message: 'Professional driving license application submitted successfully',
            application 
          }
        });
      }, 2000);

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
      case 0: // Person step
        return (
          <PersonFormWrapper
            mode="application"
            onSuccess={handlePersonSelected}
            title=""
            subtitle="Select existing person or register new professional driver"
            showHeader={false}
          />
        );

      case 1: // Professional categories step - Section B
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Section B: Professional Permit Categories
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
              {/* Professional Categories Selection */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Select Professional Permit Categories
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Choose one or more professional permit categories. Note: Dangerous goods permit automatically includes goods permit.
                </Typography>

                {getAvailableProfessionalCategories().map((category) => {
                  const age = selectedPerson?.birth_date ? calculateAge(selectedPerson.birth_date) : 0;
                  const isAgeValid = age >= category.minAge;
                  const isSelected = selectedCategories.includes(category.value);

                  return (
                    <Card 
                      key={category.value} 
                      variant="outlined" 
                      sx={{ 
                        mb: 2, 
                        cursor: isAgeValid ? 'pointer' : 'not-allowed',
                        bgcolor: isSelected ? 'primary.50' : 'inherit',
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        opacity: isAgeValid ? 1 : 0.6
                      }}
                      onClick={() => isAgeValid && handleCategoryToggle(category.value)}
                    >
                      <CardContent>
                        <Box display="flex" alignItems="center" gap={2}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={isSelected}
                                disabled={!isAgeValid}
                                onChange={() => handleCategoryToggle(category.value)}
                              />
                            }
                            label=""
                            sx={{ m: 0 }}
                          />
                          {category.icon}
                          <Box flex={1}>
                            <Typography variant="h6" gutterBottom>
                              {category.label}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {category.description}
                            </Typography>
                            {!isAgeValid && (
                              <Alert severity="warning" sx={{ mt: 1 }}>
                                <Typography variant="body2">
                                  Minimum age requirement: {category.minAge} years (Current age: {age} years)
                                </Typography>
                              </Alert>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })}

                {selectedCategories.length === 0 && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      Please select at least one professional permit category.
                    </Typography>
                  </Alert>
                )}
              </Grid>

              {/* Declaration - Section B */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardHeader title="Professional License Declaration" />
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
                      label="I have never been refused a professional driving permit"
                    />

                    {!neverBeenRefused && (
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Details of Previous Refusal"
                        value={refusalDetails}
                        onChange={(e) => setRefusalDetails(e.target.value)}
                        placeholder="Please provide details of any previous refusal..."
                        sx={{ mt: 2 }}
                        required
                      />
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
                        />
                      }
                      label="I have never been refused any professional permit in this or any other category"
                      sx={{ display: 'block', mt: 1 }}
                    />

                    {professionalPreviousRefusal && (
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Details of Professional Permit Refusal"
                        value={professionalRefusalDetails}
                        onChange={(e) => setProfessionalRefusalDetails(e.target.value)}
                        placeholder="Please provide details of any professional permit refusal..."
                        sx={{ mt: 2 }}
                        required
                      />
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Information Card */}
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ bgcolor: 'info.50' }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Section B:</strong> This section applies to professional driving permit applications. 
                      Professional permits are required for commercial transport of goods, passengers, or dangerous materials.
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
              const isMedicalMandatory = age >= 60; // Professional permits typically require medical for 60+

              return (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Complete vision test and medical clearance requirements for professional driving permit
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
                        <strong>Enhanced medical assessment is recommended</strong> for professional driving permits. 
                        Standard vision test will be conducted during license collection.
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
              Review Professional Driving License Application
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
              <CardHeader title="Professional License Details" />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Application Type</Typography>
                    <Typography variant="body1">Professional Driving License</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Selected Categories</Typography>
                    <Box sx={{ mt: 1 }}>
                      {selectedCategories.map((category) => {
                        const categoryInfo = getAvailableProfessionalCategories().find(c => c.value === category);
                        return (
                          <Chip 
                            key={category}
                            label={categoryInfo?.label || category} 
                            size="small" 
                            color="primary" 
                            sx={{ mr: 1, mb: 1 }}
                          />
                        );
                      })}
                    </Box>
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

            {/* Summary */}
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Next Steps:</strong> After submission, your professional driving license application will be processed. 
                Additional testing and verification may be required for professional permits.
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
            Professional Driving License Application
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Apply for professional driving permits for commercial transport
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
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step Content */}
        <Box sx={{ mb: 4 }}>
          {renderStepContent(activeStep)}
        </Box>

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
            >
              Back
            </Button>
            
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading || !isStepValid(activeStep)}
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!isStepValid(activeStep)}
              >
                Next
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default ProfessionalLicenseApplicationPage; 