/**
 * Driver's License Capture Form Page
 * Focused form for DRIVERS_LICENSE_CAPTURE applications only
 * 
 * Workflow: Person Selection (A) → License Capture → Review & Submit
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Box,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Chip
} from '@mui/material';
import {
  Person as PersonIcon,
  CameraAlt as CameraIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';

import PersonFormWrapper from '../../components/PersonFormWrapper';
import LicenseCaptureForm from '../../components/applications/LicenseCaptureForm';
import { applicationService } from '../../services/applicationService';
import { useAuth } from '../../contexts/AuthContext';
import {
  Person,
  Application,
  ApplicationType,
  ApplicationStatus,
  ApplicationCreate,
  LicenseCaptureData,
  LicenseCategory
} from '../../types';

const DriverLicenseCaptureFormPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form data
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [licenseCaptureData, setLicenseCaptureData] = useState<LicenseCaptureData | null>(null);

  // Steps for driver's license capture
  const steps = [
    {
      label: 'Applicant Details',
      description: 'Find or register the license holder',
      icon: <PersonIcon />,
      component: 'person'
    },
    {
      label: 'License Capture',
      description: 'Capture existing driver\'s license details',
      icon: <CameraIcon />,
      component: 'capture'
    },
    {
      label: 'Review & Submit',
      description: 'Review captured licenses and submit',
      icon: <ReceiptIcon />,
      component: 'review'
    }
  ];

  // Step validation
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Person step
        return !!selectedPerson;
      case 1: // Capture step
        return !!(licenseCaptureData?.captured_licenses?.length);
      case 2: // Review step
        return true; // Always valid if we reached here
      default:
        return false;
    }
  };

  // Navigation handlers
  const handleNext = () => {
    if (isStepValid(activeStep)) {
      setActiveStep(prev => prev + 1);
      setError('');
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
    setError('');
  };

  const handleCancel = () => {
    navigate('/dashboard/applications');
  };

  // Person selection handler
  const handlePersonSelected = useCallback((person: Person) => {
    setSelectedPerson(person);
    setError('');
  }, []);

  // License capture handler
  const handleLicenseCaptureChange = useCallback((data: LicenseCaptureData | null) => {
    setLicenseCaptureData(data);
    setError('');
  }, []);

  // Submit handler
  const handleSubmit = async () => {
    if (!selectedPerson || !licenseCaptureData) {
      setError('Missing required data for submission');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Create application with capture data
      const applicationData: ApplicationCreate = {
        person_id: selectedPerson.id,
        location_id: user?.primary_location_id || '',
        application_type: ApplicationType.DRIVERS_LICENSE_CAPTURE,
        license_category: licenseCaptureData.captured_licenses[0]?.license_category || LicenseCategory.B, // Use first captured license category or default to B
        license_capture: licenseCaptureData
        // Note: license_category is required by schema but not meaningful for capture applications
      };

      const application = await applicationService.createApplication(applicationData);
      
      // Mark as completed since this is a capture operation
      await applicationService.updateApplicationStatus(application.id, ApplicationStatus.COMPLETED);
      
      setSuccess('Driver\'s license capture completed successfully! License records have been created.');
      
      // Navigate to application details
      setTimeout(() => {
        navigate(`/dashboard/applications/${application.id}`, {
          state: { 
            message: 'License capture completed successfully',
            application 
          }
        });
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Failed to submit license capture');
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
            subtitle="Select existing person or register new license holder"
            showHeader={false}
          />
        );

      case 1: // License capture step
        return (
          <LicenseCaptureForm
            applicationtype={ApplicationType.DRIVERS_LICENSE_CAPTURE}
            value={licenseCaptureData}
            onChange={handleLicenseCaptureChange}
          />
        );

      case 2: // Review step
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Driver's License Capture
            </Typography>
            
            {/* Person Details */}
            <Card sx={{ mb: 3 }}>
              <CardHeader title="License Holder" />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Name</Typography>
                    <Typography variant="body1">
                      {selectedPerson?.surname}, {selectedPerson?.first_name} {selectedPerson?.middle_name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">ID Number</Typography>
                    <Typography variant="body1">{selectedPerson?.id}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Birth Date</Typography>
                    <Typography variant="body1">{selectedPerson?.birth_date}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Nationality</Typography>
                    <Typography variant="body1">{selectedPerson?.nationality_code}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Captured Licenses */}
            <Card sx={{ mb: 3 }}>
              <CardHeader 
                title="Captured Driver's Licenses" 
                subheader={`${licenseCaptureData?.captured_licenses?.length || 0} license(s) captured`}
              />
              <CardContent>
                {licenseCaptureData?.captured_licenses?.map((license, index) => (
                  <Box key={license.id} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={3}>
                        <Typography variant="body2" color="text.secondary">License Number</Typography>
                        <Typography variant="body1" fontWeight="bold">{license.license_number}</Typography>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Typography variant="body2" color="text.secondary">Category</Typography>
                        <Chip label={license.license_category} size="small" color="primary" />
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Typography variant="body2" color="text.secondary">Issue Date</Typography>
                        <Typography variant="body1">{license.issue_date}</Typography>
                      </Grid>
                      <Grid item xs={12} md={2}>
                        <Typography variant="body2" color="text.secondary">Expiry Date</Typography>
                        <Typography variant="body1">{license.expiry_date}</Typography>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <Typography variant="body2" color="text.secondary">Status</Typography>
                        <Chip 
                          label={license.verified ? 'Verified' : 'Pending Verification'} 
                          size="small" 
                          color={license.verified ? 'success' : 'warning'} 
                        />
                      </Grid>
                      {license.restrictions.length > 0 && (
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">Restrictions</Typography>
                          <Typography variant="body1">{license.restrictions.join(', ')}</Typography>
                        </Grid>
                      )}
                      {license.verification_notes && (
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">Verification Notes</Typography>
                          <Typography variant="body1">{license.verification_notes}</Typography>
                        </Grid>
                      )}
                    </Grid>
                    {index < (licenseCaptureData?.captured_licenses?.length || 0) - 1 && (
                      <Divider sx={{ mt: 2 }} />
                    )}
                  </Box>
                ))}
              </CardContent>
            </Card>

            {/* Summary */}
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Next Steps:</strong> After submission, captured license records will be created in the system 
                and marked as completed. The license holder will be able to apply for new Madagascar licenses 
                based on their captured credentials.
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
            Driver's License Capture
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Capture existing driver's license details for system registration
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
                <Box sx={{ mb: 2 }}>
                  <Button
                    variant="contained"
                    onClick={index === steps.length - 1 ? handleSubmit : handleNext}
                    disabled={!isStepValid(index) || loading}
                    startIcon={loading ? <CircularProgress size={20} /> : undefined}
                    sx={{ mr: 1 }}
                  >
                    {loading ? 'Submitting...' : index === steps.length - 1 ? 'Submit Capture' : 'Next'}
                  </Button>
                  
                  <Button
                    disabled={index === 0 || loading}
                    onClick={handleBack}
                    startIcon={<ArrowBackIcon />}
                    sx={{ mr: 1 }}
                  >
                    Back
                  </Button>
                  
                  <Button
                    onClick={handleCancel}
                    disabled={loading}
                    color="secondary"
                  >
                    Cancel
                  </Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {/* Completion Message */}
        {activeStep === steps.length && (
          <Paper square elevation={0} sx={{ p: 3 }}>
            <Typography>All steps completed - license capture submitted successfully!</Typography>
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

export default DriverLicenseCaptureFormPage; 