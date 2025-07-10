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
  Warning as WarningIcon,
  Language as LanguageIcon
} from '@mui/icons-material';

import PersonFormWrapper from '../../components/PersonFormWrapper';
import MedicalInformationSection from '../../components/applications/MedicalInformationSection';
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

const steps = ['Person', 'Foreign License Details', 'Medical Assessment', 'Review'];

const ForeignConversionApplicationPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [activeStep, setActiveStep] = useState(0);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<LicenseCategory | null>(null);
  const [medicalInformation, setMedicalInformation] = useState<MedicalInformation | null>(null);
  const [neverBeenRefused, setNeverBeenRefused] = useState<boolean>(true);
  const [refusalDetails, setRefusalDetails] = useState<string>('');
  
  // Foreign license details
  const [foreignLicenseNumber, setForeignLicenseNumber] = useState<string>('');
  const [foreignCountry, setForeignCountry] = useState<string>('');
  const [foreignIssueDate, setForeignIssueDate] = useState<string>('');
  const [foreignExpiryDate, setForeignExpiryDate] = useState<string>('');
  const [foreignLicenseType, setForeignLicenseType] = useState<string>('');

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

  const getAvailableConversionCategories = () => {
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

  const getCommonCountries = () => {
    return [
      'South Africa',
      'France',
      'United Kingdom',
      'United States',
      'Canada',
      'Australia',
      'Germany',
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
      case 1: // Foreign license details step
        const locationValid = user?.primary_location_id || selectedLocationId;
        return locationValid && selectedCategory !== null && 
               foreignLicenseNumber.trim() !== '' && 
               foreignCountry.trim() !== '' && 
               foreignIssueDate.trim() !== '' && 
               foreignExpiryDate.trim() !== '';
      case 2: // Medical step
        if (!selectedPerson || !selectedCategory) return false;
        const age = selectedPerson.birth_date ? calculateAge(selectedPerson.birth_date) : 0;
        const isMedicalMandatory = requiresMedicalAlways(selectedCategory) || 
                                 (age >= 60 && requiresMedical60Plus(selectedCategory));
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
      console.log('Foreign license details:', {
        number: foreignLicenseNumber,
        country: foreignCountry,
        issueDate: foreignIssueDate,
        expiryDate: foreignExpiryDate,
        type: foreignLicenseType
      });
      console.log('Submitting application data:', applicationData);

      const application = await applicationService.createApplication(applicationData);
      
      setSuccess('Foreign driving license conversion application submitted successfully!');
      
      // Navigate to application details
      setTimeout(() => {
        navigate(`/dashboard/applications/${application.id}`, {
          state: { 
            message: 'Foreign driving license conversion application submitted successfully',
            application 
          }
        });
      }, 2000);

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

      case 1: // Foreign license details step - Section B
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Section B: Foreign License Conversion Details
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
              {/* Madagascar License Category Selection */}
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Madagascar License Category (to convert to)</InputLabel>
                  <Select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value as LicenseCategory);
                      setError('');
                    }}
                    label="Madagascar License Category (to convert to)"
                  >
                    {getAvailableConversionCategories().map((category) => (
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

              {/* Foreign License Details */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Foreign License Details
                </Typography>
              </Grid>

              {/* Foreign License Number */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Foreign License Number"
                  value={foreignLicenseNumber}
                  onChange={(e) => setForeignLicenseNumber(e.target.value)}
                  required
                  placeholder="Enter foreign license number"
                />
              </Grid>

              {/* Country of Issue */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Country of Issue</InputLabel>
                  <Select
                    value={foreignCountry}
                    onChange={(e) => setForeignCountry(e.target.value)}
                    label="Country of Issue"
                  >
                    {getCommonCountries().map((country) => (
                      <MenuItem key={country} value={country}>
                        <Box display="flex" alignItems="center">
                          <LanguageIcon sx={{ mr: 1 }} />
                          {country}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Issue Date */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Foreign License Issue Date"
                  value={foreignIssueDate}
                  onChange={(e) => setForeignIssueDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>

              {/* Expiry Date */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Foreign License Expiry Date"
                  value={foreignExpiryDate}
                  onChange={(e) => setForeignExpiryDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>

              {/* Foreign License Type/Categories */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Foreign License Type/Categories"
                  value={foreignLicenseType}
                  onChange={(e) => setForeignLicenseType(e.target.value)}
                  placeholder="Enter the categories/classes from your foreign license (e.g., Class C, Category B, etc.)"
                  multiline
                  rows={2}
                />
              </Grid>

              {/* Age validation warning */}
              {selectedPerson && selectedCategory && selectedPerson.birth_date && (
                (() => {
                  const age = calculateAge(selectedPerson.birth_date);
                  const requiredAge = getAvailableConversionCategories().find(cat => cat.value === selectedCategory)?.minAge || 18;
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

              {/* Foreign License Expiry Warning */}
              {foreignExpiryDate && (
                (() => {
                  const expiryDate = new Date(foreignExpiryDate);
                  const today = new Date();
                  const isExpired = expiryDate < today;
                  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  
                  if (isExpired) {
                    return (
                      <Grid item xs={12}>
                        <Alert severity="error" icon={<WarningIcon />}>
                          <Typography variant="body2">
                            <strong>Expired Foreign License:</strong> Your foreign license expired on {foreignExpiryDate}. 
                            Additional documentation may be required.
                          </Typography>
                        </Alert>
                      </Grid>
                    );
                  } else if (daysUntilExpiry <= 30) {
                    return (
                      <Grid item xs={12}>
                        <Alert severity="warning" icon={<WarningIcon />}>
                          <Typography variant="body2">
                            <strong>Foreign License Expires Soon:</strong> Your foreign license expires in {daysUntilExpiry} days. 
                            Consider completing the conversion process promptly.
                          </Typography>
                        </Alert>
                      </Grid>
                    );
                  }
                  return null;
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
                      label="I have never been refused a driving license or had a driving license suspended or revoked in any country"
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
                        placeholder="Please provide details of any previous refusal, suspension, or revocation in any country"
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
                      <strong>Section B:</strong> Foreign license conversion allows holders of valid foreign driving licenses 
                      to convert to a Madagascar license. You must provide the original foreign license and supporting documents.
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
                    Complete vision test and medical clearance requirements for license conversion
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

      case 3: // Review step
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Foreign License Conversion Application
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
              <CardHeader title="Conversion Details" />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Application Type</Typography>
                    <Typography variant="body1">Foreign License Conversion</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Madagascar Category</Typography>
                    <Chip label={selectedCategory} size="small" color="primary" />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Foreign License Number</Typography>
                    <Typography variant="body1">{foreignLicenseNumber}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Country of Issue</Typography>
                    <Typography variant="body1">{foreignCountry}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Issue Date</Typography>
                    <Typography variant="body1">{foreignIssueDate}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Expiry Date</Typography>
                    <Typography variant="body1">{foreignExpiryDate}</Typography>
                  </Grid>
                  {foreignLicenseType && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">Foreign License Type</Typography>
                      <Typography variant="body1">{foreignLicenseType}</Typography>
                    </Grid>
                  )}
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
                <strong>Next Steps:</strong> After submission, you must provide the original foreign license and supporting documents. 
                A theory test may be required depending on the country of issue.
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
            Foreign License Conversion Application
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Convert your foreign driving license to a Madagascar license
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
        {renderStepContent(activeStep)}

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            variant="outlined"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          
          <Box>
            <Button
              onClick={handleBack}
              disabled={activeStep === 0 || loading}
              sx={{ mr: 1 }}
            >
              Back
            </Button>
            
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={!isStepValid(activeStep) || loading}
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!isStepValid(activeStep) || loading}
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

export default ForeignConversionApplicationPage; 