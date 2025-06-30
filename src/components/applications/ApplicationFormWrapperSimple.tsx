/**
 * ApplicationFormWrapper Component for Madagascar License System
 * 
 * A multi-step form wrapper for license applications that integrates
 * with the existing PersonFormWrapper component.
 * 
 * New Requirements:
 * - Single license category selection (not multiple)
 * - Hold system for prerequisite applications
 * - Prerequisite checking (system first, then external verification)
 * - Replacement applications with reason tracking
 * - Independent temporary license option
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
  Chip,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  TextField,
  List,
  ListItem,
  ListItemText,
  RadioGroup,
  Radio,
  FormLabel
} from '@mui/material';
import {
  Save as SaveIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  VerifiedUser as VerifiedUserIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';

import PersonFormWrapper from '../PersonFormWrapper';
import applicationService from '../../services/applicationService';
import { useAuth } from '../../contexts/AuthContext';
import {
  Person,
  Application,
  ApplicationCreate,
  ApplicationType,
  LicenseCategory,
  ApplicationStatus,
  FeeStructure,
  ApplicationLookups
} from '../../types';

interface ApplicationFormWrapperProps {
  mode?: 'create' | 'edit' | 'continue';
  initialPersonId?: string;
  initialApplicationId?: string;
  onComplete?: (application: Application | null) => void;
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
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Application data
  const [formData, setFormData] = useState({
    person: null as Person | null,
    application_type: ApplicationType.NEW_LICENSE,
    license_category: LicenseCategory.B,
    is_urgent: false,
    urgency_reason: '',
    is_temporary_license: false,
    validity_period_days: 90,
    is_on_hold: false,
    parent_application_id: undefined as string | undefined,
    replacement_reason: undefined as string | undefined,
    police_report_number: undefined as string | undefined,
    selected_location_id: undefined as string | undefined
  });

  // Lookup data
  const [lookups, setLookups] = useState<ApplicationLookups>({
    license_categories: [],
    application_types: [],
    application_statuses: [],
    fee_structures: []
  });

  // Prerequisite checking
  const [prerequisiteApplications, setPrerequisiteApplications] = useState<Application[]>([]);
  const [showExternalVerification, setShowExternalVerification] = useState(false);
  const [externalLicenseDetails, setExternalLicenseDetails] = useState({
    license_number: '',
    issue_date: '',
    expiry_date: '',
    issuing_location: '',
    verified_by_clerk: false,
    verification_notes: ''
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
      icon: <PersonIcon />
    },
    {
      label: 'Application Details',
      description: 'Select application type and license category',
      icon: <AssignmentIcon />
    },
    {
      label: 'Requirements',
      description: 'Verify prerequisites and documents',
      icon: <VerifiedUserIcon />
    },
    {
      label: 'Review & Submit',
      description: 'Review application and submit',
      icon: <ReceiptIcon />
    }
  ];

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
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
            license_category: application.license_category,
            is_urgent: application.is_urgent,
            urgency_reason: application.urgency_reason || '',
            is_temporary_license: application.is_temporary_license,
            validity_period_days: application.validity_period_days || 90,
            is_on_hold: application.is_on_hold,
            parent_application_id: application.parent_application_id,
            replacement_reason: application.replacement_reason,
            police_report_number: application.police_report_number
          }));

          // Set appropriate step based on application status
          if (application.person) {
            setActiveStep(1);
          }
        }

      } catch (err: any) {
        setError(err.message || 'Failed to load application data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [initialApplicationId, mode]);

  // Person selection handler
  const handlePersonSelected = useCallback(async (person: Person) => {
    setFormData(prev => ({ ...prev, person }));
    setValidationErrors([]);
    
    // Auto-advance to next step
    setTimeout(() => {
      setActiveStep(1);
    }, 500);
  }, []);

  // Check for prerequisite applications
  const checkPrerequisites = async (licenseCategory: LicenseCategory, personId: string) => {
    if (licenseCategory === 'C' || licenseCategory === 'D' || licenseCategory === 'E') {
      try {
        // Check for B license application (completed or on hold)
        const applications = await applicationService.searchApplications({
          person_id: personId,
          license_categories: ['B']
        });
        
        const prerequisiteApp = applications.find(app => 
          app.status === ApplicationStatus.COMPLETED || app.is_on_hold
        );
        
        if (prerequisiteApp) {
          setPrerequisiteApplications([prerequisiteApp]);
          return true;
        } else {
          setShowExternalVerification(true);
          return false;
        }
      } catch (error) {
        console.error('Error checking prerequisites:', error);
        setShowExternalVerification(true);
        return false;
      }
    }
    return true;
  };

  // Application details change handler
  const handleApplicationDetailsChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationErrors([]);
    
    // Check prerequisites when license category changes
    if (field === 'license_category' && formData.person) {
      checkPrerequisites(value as LicenseCategory, formData.person.id);
    }
  };

  // Validation
  const validateStep = (step: number): string[] => {
    const errors: string[] = [];
    
    switch (step) {
      case 0: // Person details
        if (!formData.person) {
          errors.push('Please select or create an applicant');
        }
        break;
        
      case 1: // Application details
        if (!formData.application_type) {
          errors.push('Please select an application type');
        }
        if (!formData.license_category) {
          errors.push('Please select a license category');
        }
        if (formData.is_urgent && !formData.urgency_reason) {
          errors.push('Please provide a reason for urgent processing');
        }
        if (formData.application_type === ApplicationType.REPLACEMENT && !formData.replacement_reason) {
          errors.push('Please provide a reason for replacement');
        }
        break;
        
      case 2: // Requirements
        if (showExternalVerification && !externalLicenseDetails.license_number) {
          errors.push('Please provide external license details');
        }
        break;
    }
    
    return errors;
  };

  const isStepValid = (step: number): boolean => {
    return validateStep(step).length === 0;
  };

  // Navigation handlers
  const handleNext = () => {
    const errors = validateStep(activeStep);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors([]);
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  // Submit handler
  const handleSubmit = async () => {
    const errors = validateStep(activeStep);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setSaving(true);
    try {
      const applicationData: ApplicationCreate = {
        person_id: formData.person!.id,
        location_id: formData.selected_location_id || user?.primary_location_id || '',
        application_type: formData.application_type,
        license_category: formData.license_category,
        is_urgent: formData.is_urgent,
        urgency_reason: formData.urgency_reason,
        is_temporary_license: formData.is_temporary_license,
        validity_period_days: formData.validity_period_days,
        is_on_hold: formData.is_on_hold,
        parent_application_id: formData.parent_application_id,
        replacement_reason: formData.replacement_reason,
        police_report_number: formData.police_report_number
      };

      let application: Application;
      if (mode === 'edit' && currentApplication) {
        application = await applicationService.updateApplication(currentApplication.id, applicationData);
      } else {
        application = await applicationService.createApplication(applicationData);
      }

      setSuccess(`Application ${mode === 'edit' ? 'updated' : 'created'} successfully!`);
      
      if (onSuccess) {
        onSuccess(application, mode === 'edit');
      } else if (onComplete) {
        onComplete(application);
      }

    } catch (err: any) {
      setError(err.message || `Failed to ${mode === 'edit' ? 'update' : 'create'} application`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      {showHeader && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {validationErrors.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">Please correct the following:</Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={index}>
              <StepLabel
                optional={
                  index === steps.length - 1 ? (
                    <Typography variant="caption">Last step</Typography>
                  ) : null
                }
                icon={step.icon}
              >
                {step.label}
              </StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {step.description}
                </Typography>
                
                {/* Step Content */}
                {index === 0 && (
                  <PersonFormWrapper
                    mode={formData.person ? 'edit' : 'create'}
                    initialPersonId={initialPersonId}
                    onPersonSelected={handlePersonSelected}
                    onCancel={onCancel}
                    showHeader={false}
                    autoSelectIfSingle={true}
                  />
                )}

                {index === 1 && (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Application Type</InputLabel>
                        <Select
                          value={formData.application_type}
                          label="Application Type"
                          onChange={(e) => handleApplicationDetailsChange('application_type', e.target.value)}
                        >
                          {Object.values(ApplicationType).map((type) => (
                            <MenuItem key={type} value={type}>
                              {type.replace(/_/g, ' ')}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>License Category</InputLabel>
                        <Select
                          value={formData.license_category}
                          label="License Category"
                          onChange={(e) => handleApplicationDetailsChange('license_category', e.target.value)}
                        >
                          {Object.values(LicenseCategory).map((category) => (
                            <MenuItem key={category} value={category}>
                              {category} - {getCategoryDescription(category)}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.is_urgent}
                            onChange={(e) => handleApplicationDetailsChange('is_urgent', e.target.checked)}
                          />
                        }
                        label="Urgent Processing"
                      />
                    </Grid>

                    {formData.is_urgent && (
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Urgency Reason"
                          value={formData.urgency_reason}
                          onChange={(e) => handleApplicationDetailsChange('urgency_reason', e.target.value)}
                          multiline
                          rows={2}
                        />
                      </Grid>
                    )}

                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.is_temporary_license}
                            onChange={(e) => handleApplicationDetailsChange('is_temporary_license', e.target.checked)}
                          />
                        }
                        label="Issue Temporary License"
                      />
                    </Grid>

                    {formData.application_type === ApplicationType.REPLACEMENT && (
                      <>
                        <Grid item xs={12}>
                          <FormControl fullWidth>
                            <FormLabel>Replacement Reason</FormLabel>
                            <RadioGroup
                              value={formData.replacement_reason || ''}
                              onChange={(e) => handleApplicationDetailsChange('replacement_reason', e.target.value)}
                            >
                              <FormControlLabel value="LOST" control={<Radio />} label="Lost" />
                              <FormControlLabel value="STOLEN" control={<Radio />} label="Stolen" />
                              <FormControlLabel value="DAMAGED" control={<Radio />} label="Damaged" />
                            </RadioGroup>
                          </FormControl>
                        </Grid>

                        {(formData.replacement_reason === 'LOST' || formData.replacement_reason === 'STOLEN') && (
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="Police Report Number"
                              value={formData.police_report_number || ''}
                              onChange={(e) => handleApplicationDetailsChange('police_report_number', e.target.value)}
                              helperText="Required for lost or stolen licenses"
                            />
                          </Grid>
                        )}
                      </>
                    )}

                    {/* Hold System for C/D/E Applications */}
                    {(['C', 'D', 'E'].includes(formData.license_category)) && (
                      <Grid item xs={12}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={formData.is_on_hold}
                              onChange={(e) => handleApplicationDetailsChange('is_on_hold', e.target.checked)}
                            />
                          }
                          label="Hold this application (applicant will complete B license first)"
                        />
                      </Grid>
                    )}
                  </Grid>
                )}

                {index === 2 && (
                  <Box>
                    {/* Prerequisites Check */}
                    {(['C', 'D', 'E'].includes(formData.license_category)) && (
                      <Card sx={{ mb: 3 }}>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            License Category {formData.license_category} Prerequisites
                          </Typography>
                          
                          {prerequisiteApplications.length > 0 ? (
                            <Box>
                              <Alert severity="success" sx={{ mb: 2 }}>
                                ✓ Found valid B license application
                              </Alert>
                              {prerequisiteApplications.map((app) => (
                                <Box key={app.id} sx={{ p: 2, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                                  <Typography variant="body2">
                                    Application: {app.application_number} | Status: {app.status}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          ) : showExternalVerification ? (
                            <Box>
                              <Alert severity="warning" sx={{ mb: 2 }}>
                                No B license found in system. Please verify external license details.
                              </Alert>
                              <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                  <TextField
                                    fullWidth
                                    label="License Number"
                                    value={externalLicenseDetails.license_number}
                                    onChange={(e) => setExternalLicenseDetails(prev => ({ ...prev, license_number: e.target.value }))}
                                  />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <TextField
                                    fullWidth
                                    label="Issuing Location"
                                    value={externalLicenseDetails.issuing_location}
                                    onChange={(e) => setExternalLicenseDetails(prev => ({ ...prev, issuing_location: e.target.value }))}
                                  />
                                </Grid>
                                <Grid item xs={12}>
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        checked={externalLicenseDetails.verified_by_clerk}
                                        onChange={(e) => setExternalLicenseDetails(prev => ({ ...prev, verified_by_clerk: e.target.checked }))}
                                      />
                                    }
                                    label="I have verified this license documentation"
                                  />
                                </Grid>
                              </Grid>
                            </Box>
                          ) : (
                            <Alert severity="info">
                              Checking for prerequisite applications...
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Other Requirements */}
                    <Typography variant="body1">
                      All requirements verified. Ready to submit application.
                    </Typography>
                  </Box>
                )}

                {index === 3 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>Application Summary</Typography>
                    <Card>
                      <CardContent>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Applicant:</Typography>
                            <Typography variant="body1">
                              {formData.person ? `${formData.person.first_name} ${formData.person.surname}` : 'N/A'}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Application Type:</Typography>
                            <Typography variant="body1">{formData.application_type.replace(/_/g, ' ')}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">License Category:</Typography>
                            <Typography variant="body1">{formData.license_category}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Urgent:</Typography>
                            <Typography variant="body1">{formData.is_urgent ? 'Yes' : 'No'}</Typography>
                          </Grid>
                          {formData.is_on_hold && (
                            <Grid item xs={12}>
                              <Alert severity="info">
                                This application will be held pending completion of prerequisites.
                              </Alert>
                            </Grid>
                          )}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Box>
                )}

                {/* Step Actions */}
                <Box sx={{ mb: 1, mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={index === steps.length - 1 ? handleSubmit : handleNext}
                    disabled={!isStepValid(index) || saving}
                    startIcon={index === steps.length - 1 ? <SaveIcon /> : undefined}
                    sx={{ mr: 1 }}
                  >
                    {saving ? <CircularProgress size={20} /> : (index === steps.length - 1 ? 'Submit Application' : 'Continue')}
                  </Button>
                  <Button
                    disabled={index === 0}
                    onClick={handleBack}
                    sx={{ mr: 1 }}
                  >
                    Back
                  </Button>
                  {onCancel && (
                    <Button onClick={onCancel} color="secondary">
                      Cancel
                    </Button>
                  )}
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>
    </Box>
  );
};

// Helper function for license category descriptions
const getCategoryDescription = (category: LicenseCategory): string => {
  const descriptions = {
    [LicenseCategory.A_PRIME]: 'Moped (16+)',
    [LicenseCategory.A]: 'Motorcycle (18+)',
    [LicenseCategory.B]: 'Light Vehicle (18+)',
    [LicenseCategory.C]: 'Heavy Goods (21+)',
    [LicenseCategory.D]: 'Passenger Transport (21+)',
    [LicenseCategory.E]: 'Large Trailers (21+)'
  };
  return descriptions[category] || '';
};

export default ApplicationFormWrapper; 