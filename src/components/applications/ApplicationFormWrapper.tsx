/**
 * ApplicationFormWrapper Component for Madagascar License System
 * 
 * A comprehensive multi-step form wrapper for license applications that integrates
 * with the existing PersonFormWrapper component and follows the same design patterns.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Card,
  CardContent,
  CardHeader,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  TextField,
  FormGroup,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Save as SaveIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  VerifiedUser as VerifiedUserIcon,
  CameraAlt as CameraIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';

import PersonFormWrapper from '../PersonFormWrapper';
import { applicationService } from '../../services/applicationService';
import { useAuth } from '../../contexts/AuthContext';
import {
  Person,
  Application,
  ApplicationCreate,
  ApplicationFormData,
  ApplicationType,
  LicenseCategory,
  ApplicationStatus,
  FeeStructure,
  BiometricCaptureData,
  ApplicationLookups
} from '../../types';

interface ApplicationFormWrapperProps {
  mode?: 'create' | 'edit' | 'continue';
  initialPersonId?: string;
  initialApplicationId?: string;
  onComplete?: (application: Application) => void;
  onCancel?: () => void;
  onSuccess?: (application: Application, isEdit: boolean) => void;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
}

const ApplicationFormWrapper: React.FC<ApplicationFormWrapperProps> = ({
  mode = 'create',
  initialPersonId,
  initialApplicationId,
  onComplete,
  onCancel,
  onSuccess,
  title = 'License Application',
  subtitle = 'Complete driver\'s license application for Madagascar',
  showHeader = true
}) => {
  // State management
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Application data
  const [formData, setFormData] = useState<ApplicationFormData>({
    person: null,
    application_type: ApplicationType.NEW_LICENSE,
    license_categories: [],
    is_urgent: false,
    urgency_reason: '',
    is_temporary_license: false,
    validity_period_days: 90,
    biometric_data: {},
    selected_fees: [],
    total_amount: 0
  });

  // Lookup data
  const [lookups, setLookups] = useState<ApplicationLookups>({
    license_categories: [],
    application_types: [],
    application_statuses: [],
    fee_structures: []
  });

  // Current application (for edit/continue mode)
  const [currentApplication, setCurrentApplication] = useState<Application | null>(null);

  // Auth context
  const { user } = useAuth();

  // Steps configuration
  const steps = [
    {
      label: 'Applicant Details',
      description: 'Find or register the license applicant',
      icon: <PersonIcon />,
      component: 'person'
    },
    {
      label: 'Application Details',
      description: 'License type, categories, and urgency settings',
      icon: <AssignmentIcon />,
      component: 'application'
    },
    {
      label: 'Requirements Check',
      description: 'Medical certificate, parental consent, existing license',
      icon: <VerifiedUserIcon />,
      component: 'requirements'
    },
    {
      label: 'Biometric Capture',
      description: 'Photo, signature, and fingerprint capture',
      icon: <CameraIcon />,
      component: 'biometric'
    },
    {
      label: 'Review & Submit',
      description: 'Review details, calculate fees, and submit application',
      icon: <ReceiptIcon />,
      component: 'review'
    }
  ];

  // Load lookup data and initial application
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // Load lookup data
        const lookupData = await applicationService.getLookupData();
        setLookups(lookupData);

        // Load existing application if in edit/continue mode
        if (initialApplicationId && (mode === 'edit' || mode === 'continue')) {
          const application = await applicationService.getApplication(initialApplicationId);
          setCurrentApplication(application);
          
          // Populate form data from existing application
          setFormData(prev => ({
            ...prev,
            person: application.person || null,
            application_type: application.application_type,
            license_categories: application.license_categories,
            is_urgent: application.is_urgent,
            urgency_reason: application.urgency_reason || '',
            is_temporary_license: application.is_temporary_license,
            validity_period_days: application.validity_period_days || 90
          }));

          // Calculate fees for existing application
          const fees = applicationService.calculateApplicationFees(
            application.application_type,
            application.license_categories,
            lookupData.fee_structures
          );
          
          setFormData(prev => ({
            ...prev,
            selected_fees: fees,
            total_amount: applicationService.calculateTotalAmount(fees)
          }));

          // Set appropriate step based on application status
          setActiveStep(getStepFromStatus(application.status));
        }

      } catch (err: any) {
        setError(err.message || 'Failed to load application data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [initialApplicationId, mode]);

  // Helper function to determine step from application status
  const getStepFromStatus = (status: ApplicationStatus): number => {
    switch (status) {
      case ApplicationStatus.DRAFT:
        return formData.person ? 1 : 0;
      case ApplicationStatus.SUBMITTED:
        return 2; // Ready for requirements check
      case ApplicationStatus.DOCUMENTS_PENDING:
        return 3; // Ready for biometric capture
      default:
        return 4; // Review stage
    }
  };

  // Person selection handler
  const handlePersonSelected = useCallback((person: Person) => {
    setFormData(prev => ({ ...prev, person }));
    setValidationErrors([]);
    
    // Auto-advance to next step
    setTimeout(() => {
      setActiveStep(1);
    }, 500);
  }, []);

  // Application details change handler
  const handleApplicationDetailsChange = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Recalculate fees when application type or categories change
      if (field === 'application_type' || field === 'license_categories') {
        const fees = applicationService.calculateApplicationFees(
          field === 'application_type' ? value : updated.application_type,
          field === 'license_categories' ? value : updated.license_categories,
          lookups.fee_structures
        );
        
        updated.selected_fees = fees;
        updated.total_amount = applicationService.calculateTotalAmount(fees);
      }
      
      return updated;
    });
    
    setValidationErrors([]);
  };

  // Validation for each step
  const validateStep = (step: number): boolean => {
    const errors: string[] = [];
    
    switch (step) {
      case 0: // Person step
        if (!formData.person) {
          errors.push('Please select or create an applicant');
        }
        break;
        
      case 1: // Application details
        if (formData.license_categories.length === 0) {
          errors.push('Please select at least one license category');
        }
        
        if (formData.person?.birth_date) {
          const ageErrors = applicationService.validateAgeRequirements(
            formData.person.birth_date, 
            formData.license_categories
          );
          errors.push(...ageErrors);
        }
        
        if (formData.is_urgent && !formData.urgency_reason?.trim()) {
          errors.push('Please provide a reason for urgent processing');
        }
        break;
        
      case 2: // Requirements
        // Validation handled by individual requirement components
        break;
        
      case 3: // Biometric
        if (!formData.biometric_data.photo) {
          errors.push('Photo capture is required');
        }
        if (!formData.biometric_data.signature) {
          errors.push('Signature capture is required');
        }
        break;
        
      case 4: // Review
        // Final validation
        if (formData.selected_fees.length === 0) {
          errors.push('No applicable fees found - please review application details');
        }
        break;
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Step navigation
  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
    setValidationErrors([]);
  };

  // Save as draft
  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      setError('');
      
      if (!formData.person) {
        throw new Error('Please select an applicant before saving');
      }

      const applicationData: ApplicationCreate = {
        person_id: formData.person.id,
        location_id: user?.primary_location_id || '',
        application_type: formData.application_type,
        license_categories: formData.license_categories,
        is_urgent: formData.is_urgent,
        urgency_reason: formData.urgency_reason,
        is_temporary_license: formData.is_temporary_license,
        validity_period_days: formData.validity_period_days
      };

      let application: Application;
      
      if (currentApplication) {
        // Update existing application
        application = await applicationService.updateApplication(
          currentApplication.id, 
          applicationData
        );
      } else {
        // Create new application
        application = await applicationService.createApplication(applicationData);
        setCurrentApplication(application);
      }

      setSuccess('Application saved as draft successfully');
      
      // Auto-hide success message
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err: any) {
      setError(err.message || 'Failed to save application');
    } finally {
      setSaving(false);
    }
  };

  // Submit application
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      if (!validateStep(4)) {
        throw new Error('Please fix validation errors before submitting');
      }

      let application = currentApplication;
      
      if (!application) {
        // Create application if it doesn't exist
        const applicationData: ApplicationCreate = {
          person_id: formData.person!.id,
          location_id: user?.primary_location_id || '',
          application_type: formData.application_type,
          license_categories: formData.license_categories,
          is_urgent: formData.is_urgent,
          urgency_reason: formData.urgency_reason,
          is_temporary_license: formData.is_temporary_license,
          validity_period_days: formData.validity_period_days
        };

        application = await applicationService.createApplication(applicationData);
      }

      // Update status to SUBMITTED
      application = await applicationService.updateApplicationStatus(
        application.id,
        ApplicationStatus.SUBMITTED,
        'Application submitted by user',
        `Application completed and submitted from ${steps[activeStep]?.label || 'final step'}`
      );

      setSuccess('Application submitted successfully!');
      
      // Call success callback
      if (onSuccess) {
        onSuccess(application, mode === 'edit');
      }
      
      // Call completion callback
      if (onComplete) {
        onComplete(application);
      }

    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  // Confirm dialog handlers
  const handleConfirmSubmit = () => {
    setShowConfirmDialog(false);
    handleSubmit();
  };

  // Render step content
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // Person selection
        return (
          <PersonFormWrapper
            mode="application"
            initialPersonId={initialPersonId}
            onComplete={handlePersonSelected}
            onSuccess={(person) => handlePersonSelected(person)}
            title=""
            subtitle="Select existing person or register new applicant"
            showHeader={false}
          />
        );

      case 1: // Application details
        return renderApplicationDetailsStep();

      case 2: // Requirements
        return renderRequirementsStep();

      case 3: // Biometric capture
        return renderBiometricStep();

      case 4: // Review
        return renderReviewStep();

      default:
        return <Typography>Unknown step</Typography>;
    }
  };

  // Placeholder step renderers (to be implemented in next phase)
  const renderApplicationDetailsStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Application Details</Typography>
      <Alert severity="info">
        Application details form will be implemented in the next development phase.
        This will include license type, categories, urgency settings, and fee calculation.
      </Alert>
    </Box>
  );

  const renderRequirementsStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Requirements Check</Typography>
      <Alert severity="info">
        Requirements validation will be implemented in the next development phase.
        This includes medical certificate and parental consent uploads.
      </Alert>
    </Box>
  );

  const renderBiometricStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Biometric Data Capture</Typography>
      <Alert severity="info">
        Biometric capture will be implemented in the next development phase.
        This includes photo, signature, and fingerprint capture integration.
      </Alert>
    </Box>
  );

  const renderReviewStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Review & Submit</Typography>
      <Alert severity="info">
        Review and submission will be implemented in the next development phase.
        This includes fee calculation, final validation, and application submission.
      </Alert>
    </Box>
  );

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      {showHeader && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {subtitle}
          </Typography>
          {currentApplication && (
            <Box sx={{ mt: 2 }}>
              <Chip 
                label={`Application #${currentApplication.application_number}`} 
                color="primary" 
                variant="outlined" 
              />
              <Chip 
                label={currentApplication.status.replace('_', ' ')} 
                color="info" 
                sx={{ ml: 1 }} 
              />
            </Box>
          )}
        </Paper>
      )}

      {/* Error/Success alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Please fix the following issues:
          </Typography>
          <ul>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Main form */}
      <Paper sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel
                icon={step.icon}
                optional={
                  <Typography variant="caption">
                    {step.description}
                  </Typography>
                }
              >
                {step.label}
              </StepLabel>
              <StepContent>
                <Box sx={{ mt: 2, mb: 1 }}>
                  {renderStepContent(index)}
                </Box>
                
                {/* Step navigation */}
                <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                  <Button
                    disabled={index === 0}
                    onClick={handleBack}
                  >
                    Back
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveDraft}
                    disabled={saving || !formData.person}
                  >
                    {saving ? 'Saving...' : 'Save Draft'}
                  </Button>
                  
                  {index === steps.length - 1 ? (
                    <Button
                      variant="contained"
                      onClick={() => setShowConfirmDialog(true)}
                      disabled={validationErrors.length > 0 || loading}
                    >
                      Submit Application
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={handleNext}
                    >
                      Next
                    </Button>
                  )}
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {/* Completed state */}
        {activeStep === steps.length && (
          <Paper square elevation={0} sx={{ p: 3 }}>
            <Typography>All steps completed - application is ready to submit!</Typography>
            <Button 
              onClick={() => setActiveStep(0)} 
              sx={{ mt: 1, mr: 1 }}
            >
              Reset
            </Button>
          </Paper>
        )}
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)}>
        <DialogTitle>Confirm Application Submission</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to submit this application? Once submitted, 
            it will be processed according to the Madagascar licensing workflow.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmSubmit} 
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Confirm Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel button */}
      {onCancel && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button variant="outlined" onClick={onCancel}>
            Cancel
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ApplicationFormWrapper;