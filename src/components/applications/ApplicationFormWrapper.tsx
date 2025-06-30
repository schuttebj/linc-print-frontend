/**
 * ApplicationFormWrapper Component for Madagascar License System
 * 
 * A comprehensive multi-step form wrapper for license applications that integrates
 * with the existing PersonFormWrapper component and follows the same design patterns.
 * 
 * Updated for single license category selection and enhanced prerequisite checking.
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
  ListItemIcon,
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
  AttachMoney as MoneyIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

import PersonFormWrapper from '../PersonFormWrapper';
import { applicationService } from '../../services/applicationService';
import lookupService from '../../services/lookupService';
import type { Location } from '../../services/lookupService';
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
  ApplicationLookups,
  LICENSE_CATEGORY_RULES,
  ExternalLicenseDetails,
  LEARNERS_PERMIT_VALIDITY_MONTHS,
  DEFAULT_TEMPORARY_LICENSE_DAYS,
  ReplacementReason
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

interface PrerequisiteCheck {
  hasCompleted: boolean;
  hasOnHold: boolean;
  completedApplications: Application[];
  onHoldApplications: Application[];
  canProceed: boolean;
  requiresExternal: boolean;
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

  // Prerequisite checking states
  const [prerequisiteCheck, setPrerequisiteCheck] = useState<PrerequisiteCheck | null>(null);
  const [checkingPrerequisites, setCheckingPrerequisites] = useState(false);
  const [showExternalLicenseForm, setShowExternalLicenseForm] = useState(false);

  // Application data with single license category
  const [formData, setFormData] = useState<ApplicationFormData>({
    person: null,
    application_type: ApplicationType.NEW_LICENSE,
    license_category: LicenseCategory.B,
    is_urgent: false,
    urgency_reason: '',
    is_temporary_license: false,
    validity_period_days: DEFAULT_TEMPORARY_LICENSE_DAYS,
    is_on_hold: false,
    parent_application_id: undefined,
    replacement_reason: '',
    external_learners_permit: undefined,
    external_existing_license: undefined,
    biometric_data: {},
    selected_fees: [],
    total_amount: 0,
    selected_location_id: undefined
  });

  // Lookup data
  const [lookups, setLookups] = useState<ApplicationLookups>({
    license_categories: [],
    application_types: [],
    application_statuses: [],
    fee_structures: []
  });

  // Location data
  const [locations, setLocations] = useState<Location[]>([]);
  const [currentApplication, setCurrentApplication] = useState<Application | null>(null);

  // Auth context
  const { user } = useAuth();

  // Helper function to determine if user can select location
  const canSelectLocation = () => {
    if (!user) return false;
    const adminRoles = ['SYSTEM_USER', 'NATIONAL_ADMIN', 'PROVINCIAL_ADMIN'];
    return adminRoles.includes(user.user_type || '');
  };

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
      description: 'Select license category and application type',
      icon: <AssignmentIcon />,
      component: 'application'
    },
    {
      label: 'Requirements',
      description: 'Verify documents and prerequisites',
      icon: <VerifiedUserIcon />,
      component: 'requirements'
    },
    {
      label: 'Biometric Data',
      description: 'Capture photo and signature',
      icon: <CameraIcon />,
      component: 'biometric'
    },
    {
      label: 'Review & Submit',
      description: 'Review application and submit',
      icon: <ReceiptIcon />,
      component: 'review'
    }
  ];

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const [locationsData] = await Promise.all([
          lookupService.getLocations()
        ]);
        setLocations(locationsData);
      } catch (err: any) {
        setError(err.message || 'Failed to load initial data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Check prerequisites when person and license category change
  const checkPrerequisites = useCallback(async (personId: string, category: LicenseCategory) => {
    if (!personId || !category) return;

    // Only check for categories that require prerequisites
    const categoryRules = LICENSE_CATEGORY_RULES[category];
    if (!categoryRules?.requires_existing?.length) {
      setPrerequisiteCheck(null);
      return;
    }

    try {
      setCheckingPrerequisites(true);
      
      // Check for existing applications for required categories
      const requiredCategories = categoryRules.requires_existing;
      const personApplications = await applicationService.searchApplicationsByPerson(personId);
      
      const prerequisiteApplications = personApplications.filter(app => 
        requiredCategories.includes(app.license_category) &&
        ['COMPLETED', 'ON_HOLD'].includes(app.status)
      );

      const completedApplications = prerequisiteApplications.filter(app => app.status === 'COMPLETED');
      const onHoldApplications = prerequisiteApplications.filter(app => app.status === 'ON_HOLD');

      const hasCompleted = completedApplications.length > 0;
      const hasOnHold = onHoldApplications.length > 0;
      const canProceed = hasCompleted || hasOnHold;

      setPrerequisiteCheck({
        hasCompleted,
        hasOnHold,
        completedApplications,
        onHoldApplications,
        canProceed,
        requiresExternal: !canProceed
      });

      // If no prerequisites found, offer external license verification
      if (!canProceed) {
        setShowExternalLicenseForm(true);
      }

    } catch (err: any) {
      console.error('Failed to check prerequisites:', err);
      setPrerequisiteCheck({
        hasCompleted: false,
        hasOnHold: false,
        completedApplications: [],
        onHoldApplications: [],
        canProceed: false,
        requiresExternal: true
      });
      setShowExternalLicenseForm(true);
    } finally {
      setCheckingPrerequisites(false);
    }
  }, []);

  // Handle application details changes
  const handleApplicationDetailsChange = async (field: string, value: any) => {
    const updatedFormData = { ...formData, [field]: value };
    setFormData(updatedFormData);

    // Check prerequisites when license category changes
    if (field === 'license_category' && formData.person?.id) {
      await checkPrerequisites(formData.person.id, value);
    }
  };

  // Handle person selection
  const handlePersonSelected = async (person: Person | null) => {
    setFormData(prev => ({ ...prev, person }));
    
    if (person?.id && formData.license_category) {
      await checkPrerequisites(person.id, formData.license_category);
    }
  };

  // Validation functions
  const validateStep = (step: number): boolean => {
    const errors = getStepValidationErrors(step);
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const getStepValidationErrors = (step: number): string[] => {
    const errors: string[] = [];

    switch (step) {
      case 0: // Person
        if (!formData.person) {
          errors.push('Please select or create an applicant');
        }
        break;

      case 1: // Application Details
        if (!formData.license_category) {
          errors.push('Please select a license category');
        }
        if (formData.is_urgent && !formData.urgency_reason?.trim()) {
          errors.push('Please provide urgency reason');
        }
        if (formData.application_type === ApplicationType.REPLACEMENT && !formData.replacement_reason?.trim()) {
          errors.push('Please provide replacement reason');
        }
        break;

      case 2: // Requirements
        // Age validation
        if (formData.person?.birth_date) {
          const age = Math.floor((Date.now() - new Date(formData.person.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
          const minAge = LICENSE_CATEGORY_RULES[formData.license_category]?.min_age || 18;
          if (age < minAge) {
            errors.push(`Applicant must be at least ${minAge} years old for category ${formData.license_category}`);
          }
        }

        // Prerequisite validation
        const categoryRules = LICENSE_CATEGORY_RULES[formData.license_category];
        if (categoryRules?.requires_existing?.length && prerequisiteCheck && !prerequisiteCheck.canProceed && !formData.external_existing_license) {
          errors.push(`Category ${formData.license_category} requires existing license: ${categoryRules.requires_existing.join(', ')}`);
        }
        break;

      case 3: // Biometric
        // Optional validation for biometric data
        break;

      case 4: // Review
        if (formData.selected_fees.length === 0) {
          errors.push('Please select applicable fees');
        }
        break;
    }

    return errors;
  };

  // Navigation handlers
  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  // Save as draft
  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      
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
        replacement_reason: formData.replacement_reason
      };

      const application = await applicationService.createApplication(applicationData);
      setSuccess('Application draft saved successfully');
      
      if (onSuccess) {
        onSuccess(application, false);
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  // Submit application
  const handleSubmit = async () => {
    try {
      setSaving(true);
      
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
        replacement_reason: formData.replacement_reason
      };

      const application = await applicationService.createApplication(applicationData);
      
      // Update status to submitted
      await applicationService.updateApplicationStatus(application.id, ApplicationStatus.SUBMITTED);
      
      setSuccess('Application submitted successfully');
      
      if (onSuccess) {
        onSuccess(application, false);
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setSaving(false);
    }
  };

  // Render step content
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // Person
        return (
          <PersonFormWrapper
            mode={mode === 'create' ? 'select' : 'view'}
            onPersonSelected={handlePersonSelected}
            initialPersonId={initialPersonId}
            showCreateNew={true}
            showHeader={false}
          />
        );

      case 1: // Application Details
        return renderApplicationDetailsStep();

      case 2: // Requirements
        return renderRequirementsStep();

      case 3: // Biometric
        return renderBiometricStep();

      case 4: // Review
        return renderReviewStep();

      default:
        return <Typography>Unknown step</Typography>;
    }
  };

  // Application Details Step
  const renderApplicationDetailsStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Application Details</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Complete the application details and license category selection
      </Typography>

      <Grid container spacing={3}>
        {/* Location Selection (for admin users) */}
        {canSelectLocation() && (
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Application Location</InputLabel>
              <Select
                value={formData.selected_location_id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, selected_location_id: e.target.value }))}
                label="Application Location"
              >
                <MenuItem value="">
                  <em>Select location for this application</em>
                </MenuItem>
                {locations.map((location) => (
                  <MenuItem key={location.id} value={location.id}>
                    {location.name} ({location.code}) - {location.province_code}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}

        {/* Application Type */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel>Application Type</InputLabel>
            <Select
              value={formData.application_type}
              onChange={(e) => handleApplicationDetailsChange('application_type', e.target.value)}
              label="Application Type"
            >
              <MenuItem value={ApplicationType.LEARNERS_PERMIT}>Learner's Permit</MenuItem>
              <MenuItem value={ApplicationType.NEW_LICENSE}>Driver's License</MenuItem>
              <MenuItem value={ApplicationType.RENEWAL}>License Renewal</MenuItem>
              <MenuItem value={ApplicationType.REPLACEMENT}>Replacement License</MenuItem>
              <MenuItem value={ApplicationType.TEMPORARY_LICENSE}>Temporary License</MenuItem>
              <MenuItem value={ApplicationType.INTERNATIONAL_PERMIT}>International Permit</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Replacement Reason */}
        {formData.application_type === ApplicationType.REPLACEMENT && (
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Replacement Reason</InputLabel>
              <Select
                value={formData.replacement_reason || ''}
                onChange={(e) => handleApplicationDetailsChange('replacement_reason', e.target.value)}
                label="Replacement Reason"
              >
                <MenuItem value={ReplacementReason.LOST}>Lost</MenuItem>
                <MenuItem value={ReplacementReason.STOLEN}>Stolen</MenuItem>
                <MenuItem value={ReplacementReason.DAMAGED}>Damaged</MenuItem>
                <MenuItem value={ReplacementReason.NAME_CHANGE}>Name Change</MenuItem>
                <MenuItem value={ReplacementReason.ADDRESS_CHANGE}>Address Change</MenuItem>
                <MenuItem value={ReplacementReason.OTHER}>Other</MenuItem>
              </Select>
            </FormControl>
            {(formData.replacement_reason === ReplacementReason.OTHER || 
              formData.replacement_reason === ReplacementReason.STOLEN) && (
              <TextField
                fullWidth
                label={formData.replacement_reason === ReplacementReason.STOLEN ? "Police Report Details" : "Other Reason Details"}
                value={formData.urgency_reason || ''}
                onChange={(e) => handleApplicationDetailsChange('urgency_reason', e.target.value)}
                placeholder={formData.replacement_reason === ReplacementReason.STOLEN ? 
                  "Police report number and details" : "Please specify the replacement reason"}
                multiline
                rows={2}
                sx={{ mt: 2 }}
                required
              />
            )}
          </Grid>
        )}

        {/* License Category - Single Select */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel>License Category</InputLabel>
            <Select
              value={formData.license_category}
              onChange={(e) => handleApplicationDetailsChange('license_category', e.target.value)}
              label="License Category"
            >
              {Object.entries(LICENSE_CATEGORY_RULES).map(([category, rules]) => {
                const isDisabled = formData.application_type === ApplicationType.LEARNERS_PERMIT && !rules.allows_learners_permit;
                
                return (
                  <MenuItem key={category} value={category} disabled={isDisabled}>
                    {category} - {rules.description} (Min age: {rules.min_age}
                    {rules.requires_existing.length > 0 && `, Requires: ${rules.requires_existing.join(', ')}`})
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </Grid>

        {/* Hold for Printing Checkbox */}
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.is_on_hold || false}
                onChange={(e) => handleApplicationDetailsChange('is_on_hold', e.target.checked)}
              />
            }
            label="Hold application (do not send to printer)"
          />
          <Typography variant="caption" display="block" color="text.secondary">
            Check this to prevent the license from being sent to the printer. 
            This is useful when you want to accumulate multiple categories before printing a combined card.
          </Typography>
        </Grid>

        {/* Urgency Settings */}
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.is_urgent}
                onChange={(e) => handleApplicationDetailsChange('is_urgent', e.target.checked)}
              />
            }
            label="Urgent Processing Required"
          />
          {formData.is_urgent && (
            <TextField
              fullWidth
              label="Urgency Reason"
              value={formData.urgency_reason || ''}
              onChange={(e) => handleApplicationDetailsChange('urgency_reason', e.target.value)}
              placeholder="Please explain why urgent processing is required"
              multiline
              rows={2}
              sx={{ mt: 2 }}
              required
            />
          )}
        </Grid>

        {/* Temporary License Option */}
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
          <Typography variant="caption" display="block" color="text.secondary">
            Temporary license can be issued independently of application status ({DEFAULT_TEMPORARY_LICENSE_DAYS} days validity)
          </Typography>
        </Grid>

        {/* Prerequisite Check Display */}
        {checkingPrerequisites && (
          <Grid item xs={12}>
            <Alert severity="info">
              <Typography variant="body2">
                <CircularProgress size={16} sx={{ mr: 1 }} />
                Checking prerequisites for {formData.license_category}...
              </Typography>
            </Alert>
          </Grid>
        )}
        
        {prerequisiteCheck && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle2" gutterBottom>
                Prerequisite Check Results
              </Typography>
              
              {prerequisiteCheck.canProceed ? (
                <Alert severity="success">
                  <Typography variant="body2" gutterBottom>
                    Prerequisites satisfied for {formData.license_category}:
                  </Typography>
                  {prerequisiteCheck.hasCompleted && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" fontWeight="bold">Completed Applications:</Typography>
                      <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                        {prerequisiteCheck.completedApplications.map((app, index) => (
                          <li key={index}>
                            {app.license_category} - {app.application_number} (Completed)
                          </li>
                        ))}
                      </ul>
                    </Box>
                  )}
                  {prerequisiteCheck.hasOnHold && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" fontWeight="bold">On-Hold Applications:</Typography>
                      <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                        {prerequisiteCheck.onHoldApplications.map((app, index) => (
                          <li key={index}>
                            {app.license_category} - {app.application_number} (On Hold)
                          </li>
                        ))}
                      </ul>
                    </Box>
                  )}
                </Alert>
              ) : (
                <Alert severity="warning">
                  <Typography variant="body2" gutterBottom>
                    No completed or on-hold {LICENSE_CATEGORY_RULES[formData.license_category]?.requires_existing.join(' or ')} application found.
                  </Typography>
                  <Typography variant="body2">
                    You can still proceed by verifying external license details in the Requirements section.
                  </Typography>
                </Alert>
              )}
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );

  // Requirements Step (simplified)
  const renderRequirementsStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Requirements Verification</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Verify required documents and prerequisites
      </Typography>

      <Grid container spacing={3}>
        {/* Age Requirements */}
        {formData.person?.birth_date && (
          <Grid item xs={12}>
            <Alert severity="info">
              <Typography variant="body2">
                Age verification: {Math.floor((Date.now() - new Date(formData.person.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25))} years old
                (Required: {LICENSE_CATEGORY_RULES[formData.license_category]?.min_age}+ for {formData.license_category})
              </Typography>
            </Alert>
          </Grid>
        )}

        {/* External License Verification (if needed) */}
        {prerequisiteCheck?.requiresExternal && !prerequisiteCheck.canProceed && (
          <Grid item xs={12}>
            <Card>
              <CardHeader title="External License Verification" />
              <CardContent>
                <Typography variant="body2" gutterBottom>
                  Since no {LICENSE_CATEGORY_RULES[formData.license_category]?.requires_existing.join(' or ')} application was found in the system, 
                  please verify the applicant's existing license manually:
                </Typography>
                
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Existing License Number"
                      placeholder="Enter license number to verify"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Issuing Location"
                      placeholder="Where was the license issued?"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={<Checkbox />}
                      label="I have manually verified the existing license and it is valid"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Medical Certificate (for drivers 65+ or C/D/E categories) */}
        {formData.person?.birth_date && (
          <>
            {(Math.floor((Date.now() - new Date(formData.person.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) >= 65 ||
              ['C', 'D', 'E'].includes(formData.license_category)) && (
              <Grid item xs={12}>
                <Alert severity="warning">
                  <Typography variant="body2">
                    Medical certificate required for this application
                    ({Math.floor((Date.now() - new Date(formData.person.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) >= 65 ? 'Age 65+' : `Category ${formData.license_category}`})
                  </Typography>
                </Alert>
              </Grid>
            )}
          </>
        )}
      </Grid>
    </Box>
  );

  // Biometric Step (placeholder)
  const renderBiometricStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Biometric Data Capture</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Capture applicant photo and signature
      </Typography>
      
      <Alert severity="info">
        <Typography variant="body2">
          Biometric capture component will be integrated here.
          This will reuse the existing WebcamCapture.tsx functionality.
        </Typography>
      </Alert>
    </Box>
  );

  // Review Step
  const renderReviewStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Review & Submit</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review all application details before submission
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Application Summary" />
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
                  <Typography variant="body2" color="text.secondary">Hold for Printing:</Typography>
                  <Typography variant="body1">{formData.is_on_hold ? 'Yes' : 'No'}</Typography>
                </Grid>
                {formData.replacement_reason && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Replacement Reason:</Typography>
                    <Typography variant="body1">{formData.replacement_reason}</Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  // Main render
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
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
          <Typography variant="subtitle2" gutterBottom>Please fix the following issues:</Typography>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      <Paper elevation={2} sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
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
                
                {renderStepContent(index)}
                
                <Box sx={{ mb: 2, mt: 3 }}>
                  <div>
                    <Button
                      variant="contained"
                      onClick={index === steps.length - 1 ? handleSubmit : handleNext}
                      sx={{ mt: 1, mr: 1 }}
                      disabled={saving}
                    >
                      {saving ? (
                        <CircularProgress size={20} />
                      ) : index === steps.length - 1 ? (
                        'Submit Application'
                      ) : (
                        'Continue'
                      )}
                    </Button>
                    <Button
                      disabled={index === 0 || saving}
                      onClick={handleBack}
                      sx={{ mt: 1, mr: 1 }}
                    >
                      Back
                    </Button>
                    {formData.person && (
                      <Button
                        variant="outlined"
                        startIcon={<SaveIcon />}
                        onClick={handleSaveDraft}
                        sx={{ mt: 1, mr: 1 }}
                        disabled={saving}
                      >
                        Save Draft
                      </Button>
                    )}
                    {onCancel && (
                      <Button
                        onClick={onCancel}
                        sx={{ mt: 1 }}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)}>
        <DialogTitle>Confirm Application Submission</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to submit this application? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" autoFocus>
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApplicationFormWrapper;