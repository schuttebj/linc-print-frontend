/**
 * Learner's Permit Capture Form Page for Madagascar License System
 * Allows capturing existing learner's permits into the system
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  Button,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Divider
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

import { useAuth } from '../../contexts/AuthContext';
import { PersonFormWrapper } from '../../components/PersonFormWrapper';
import { LicenseCaptureForm } from '../../components/applications/LicenseCaptureForm';
import { applicationService } from '../../services/applicationService';
import { ApplicationStatus, ApplicationType, Person } from '../../types';

const steps = [
  'Select Person',
  'Capture Learner\'s Permit Details',
  'Review & Submit'
];

const LearnerPermitCaptureFormPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [activeStep, setActiveStep] = useState(0);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [licenseCaptureData, setLicenseCaptureData] = useState<any>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [availableLocations, setAvailableLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Load available locations for admin users
  useEffect(() => {
    const loadLocations = async () => {
      try {
        if (!user?.primary_location_id) {
          const response = await fetch('/api/v1/locations');
          const data = await response.json();
          setAvailableLocations(data.locations || []);
        }
      } catch (err) {
        console.error('Failed to load locations:', err);
      }
    };

    loadLocations();
  }, [user?.primary_location_id]);

  // Get location ID (either from user or selected)
  const getLocationId = (): string | null => {
    return user?.primary_location_id || selectedLocationId || null;
  };

  // Step validation
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!selectedPerson && !!selectedPerson.id;
      case 1:
        // Check license capture data and location for admin users
        const hasLicenseData = !!licenseCaptureData && licenseCaptureData.captured_licenses.length > 0;
        const hasLocation = !!user?.primary_location_id || !!selectedLocationId;
        return hasLicenseData && hasLocation && !!selectedPerson && !!selectedPerson.id;
      case 2:
        return !!selectedPerson && !!selectedPerson.id && !!licenseCaptureData && licenseCaptureData.captured_licenses.length > 0;
      default:
        return false;
    }
  };

  // Handle person selection
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

  // Handle license capture data
  const handleLicenseCaptureComplete = (data: any) => {
    console.log('License capture data received:', data);
    setLicenseCaptureData(data);
    setError('');
    
    // Auto-advance to review step
    setTimeout(() => {
      setActiveStep(2);
    }, 500);
  };

  // Handle submission
  const handleSubmit = async () => {
    if (!selectedPerson || !licenseCaptureData) {
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

      // Create application with capture data
      const applicationData = {
        person_id: selectedPerson.id,
        location_id: locationId,
        application_type: ApplicationType.LEARNERS_PERMIT_CAPTURE,
        license_category: licenseCaptureData.captured_licenses[0]?.license_category || 'LEARNERS_1',
        license_capture: licenseCaptureData
      };

      console.log('User primary_location_id:', user?.primary_location_id);
      console.log('Submitting application data:', applicationData);
      console.log('Capture data:', licenseCaptureData);

      const application = await applicationService.createApplication(applicationData);
      
      // Authorization workflow for learner's permit capture applications
      // DRAFT → SUBMITTED → APPROVED → COMPLETED
      await applicationService.updateApplicationStatus(application.id, ApplicationStatus.SUBMITTED);
      await applicationService.updateApplicationStatus(application.id, ApplicationStatus.APPROVED);
      await applicationService.updateApplicationStatus(application.id, ApplicationStatus.COMPLETED);
      
      setSuccess('Learner\'s permit capture completed successfully! License records have been created.');
      
      // Navigate to application details
      setTimeout(() => {
        navigate(`/dashboard/applications/${application.id}`, {
          state: { 
            message: 'Learner\'s permit capture completed successfully',
            application 
          }
        });
      }, 2000);

    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'Failed to submit learner\'s permit capture');
    } finally {
      setLoading(false);
    }
  };

  // Handle navigation
  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleNext = () => {
    if (isStepValid(activeStep)) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  // Render step content
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <PersonFormWrapper
            mode="application"
            onSuccess={handlePersonSelected}
            showHeader={false}
            autoSearch={true}
          />
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Capture Learner's Permit Details
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Enter the details from the existing learner's permit to capture it into the system.
            </Typography>

            {/* Location Selection for Admin Users */}
            {!user?.primary_location_id && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Select Location
                  </Typography>
                  <FormControl fullWidth>
                    <InputLabel>Location</InputLabel>
                    <Select
                      value={selectedLocationId}
                      onChange={(e) => setSelectedLocationId(e.target.value)}
                      label="Location"
                    >
                      {Array.isArray(availableLocations) && availableLocations.map((location) => (
                        <MenuItem key={location.id} value={location.id}>
                          {location.name} ({location.code})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>
            )}

            <LicenseCaptureForm
              applicationType={ApplicationType.LEARNERS_PERMIT_CAPTURE}
              onComplete={handleLicenseCaptureComplete}
              selectedPerson={selectedPerson}
              availableCategories={['LEARNERS_1', 'LEARNERS_2', 'LEARNERS_3']}
            />
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Learner's Permit Capture
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Please review the captured learner's permit details before submitting.
            </Typography>

            {/* Person Information */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Person Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Name
                    </Typography>
                    <Typography variant="body1">
                      {selectedPerson?.surname}, {selectedPerson?.first_name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Madagascar ID
                    </Typography>
                    <Typography variant="body1">
                      {selectedPerson?.aliases?.find(alias => alias.is_primary)?.document_number || 'Not available'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Date of Birth
                    </Typography>
                    <Typography variant="body1">
                      {selectedPerson?.date_of_birth}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Gender
                    </Typography>
                    <Typography variant="body1">
                      {selectedPerson?.gender}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Location Information */}
            {(user?.primary_location_id || selectedLocationId) && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Processing Location
                  </Typography>
                  <Typography variant="body1">
                    {user?.primary_location_id ? 'Your assigned location' : 
                     availableLocations.find(loc => loc.id === selectedLocationId)?.name || 'Selected location'}
                  </Typography>
                  {selectedLocationId && (
                    <Chip 
                      label={availableLocations.find(loc => loc.id === selectedLocationId)?.code || 'Location'} 
                      size="small" 
                      sx={{ mt: 1 }}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {/* Captured Licenses */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Captured Learner's Permits
                </Typography>
                {licenseCaptureData?.captured_licenses?.map((license: any, index: number) => (
                  <Box key={license.id} sx={{ mb: 2 }}>
                    {index > 0 && <Divider sx={{ my: 2 }} />}
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          License Number
                        </Typography>
                        <Typography variant="body1">{license.license_number}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Category
                        </Typography>
                        <Chip label={license.license_category} color="primary" size="small" />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Issue Date
                        </Typography>
                        <Typography variant="body1">{license.issue_date}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Expiry Date
                        </Typography>
                        <Typography variant="body1">{license.expiry_date}</Typography>
                      </Grid>
                      {license.restrictions && license.restrictions.length > 0 && (
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">
                            Restrictions
                          </Typography>
                          <Box sx={{ mt: 1 }}>
                            {license.restrictions.map((restriction: string, idx: number) => (
                              <Chip
                                key={idx}
                                label={restriction}
                                size="small"
                                sx={{ mr: 1, mb: 1 }}
                              />
                            ))}
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                ))}
              </CardContent>
            </Card>

            {/* Submit Button */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                size="large"
                sx={{ minWidth: 200 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Submit Learner\'s Permit Capture'}
              </Button>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleGoToDashboard}
          sx={{ mr: 2 }}
        >
          Back to Dashboard
        </Button>
        <Typography variant="h4" component="h1">
          Learner's Permit Capture
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {/* Stepper */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Step Content */}
          {renderStepContent()}

          {/* Navigation Buttons */}
          {activeStep < 2 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button
                onClick={handleBack}
                disabled={activeStep === 0}
              >
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!isStepValid(activeStep)}
              >
                Next
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default LearnerPermitCaptureFormPage; 