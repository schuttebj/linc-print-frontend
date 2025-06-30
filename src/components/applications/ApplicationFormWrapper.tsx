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
  ListItemIcon,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell
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
import applicationService from '../../services/applicationService';
import { licenseValidationService } from '../../services/licenseValidationService';
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
  LicenseValidationResult,
  ExistingLicenseCheck,
  LEARNERS_PERMIT_VALIDITY_MONTHS,
  DEFAULT_TEMPORARY_LICENSE_DAYS
} from '../../types';
import type { LookupOption } from '../../types/index';

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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // License validation states
  const [validationResult, setValidationResult] = useState<LicenseValidationResult | null>(null);
  const [existingLicenseCheck, setExistingLicenseCheck] = useState<ExistingLicenseCheck | null>(null);
  const [showExternalLearnerForm, setShowExternalLearnerForm] = useState(false);
  const [showExternalLicenseForm, setShowExternalLicenseForm] = useState(false);

  // Application data
  const [formData, setFormData] = useState<ApplicationFormData>({
    person: null,
    application_type: ApplicationType.NEW_LICENSE,
    license_categories: [],
    is_urgent: false,
    urgency_reason: '',
    is_temporary_license: false,
    validity_period_days: DEFAULT_TEMPORARY_LICENSE_DAYS,
    // External license validation
    external_learners_permit: undefined,
    external_existing_license: undefined,
    biometric_data: {},
    selected_fees: [],
    total_amount: 0,
    // Location selection for admin users
    selected_location_id: undefined
  });

  // Lookup data
  const [lookups, setLookups] = useState<ApplicationLookups>({
    license_categories: [],
    application_types: [],
    application_statuses: [],
    fee_structures: []
  });

  // Location data for external permit form
  const [locations, setLocations] = useState<Location[]>([]);

  // Draft applications for selected person
  const [draftApplications, setDraftApplications] = useState<Application[]>([]);
  const [showDraftDialog, setShowDraftDialog] = useState(false);

  // Current application (for edit/continue mode)
  const [currentApplication, setCurrentApplication] = useState<Application | null>(null);

  // Auth context
  const { user } = useAuth();

  // Helper function to determine if user can select location
  const canSelectLocation = () => {
    if (!user) return false;
    const adminRoles = ['SYSTEM_USER', 'NATIONAL_ADMIN', 'PROVINCIAL_ADMIN'];
    return adminRoles.includes(user.user_type || '');
  };

  // Helper function to get available locations for user
  const getAvailableLocations = () => {
    if (!user) return [];
    
    switch (user.user_type) {
      case 'SYSTEM_USER':
      case 'NATIONAL_ADMIN':
        // Can select any location
        return locations;
        
      case 'PROVINCIAL_ADMIN':
        // Can only select locations in their province
        return locations.filter(loc => loc.province_code === user.scope_province);
        
      default:
        // Location users use their assigned location
        return [];
    }
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

        // Load locations for external permit forms
        const locationsData = await lookupService.getLocations(true); // operational only
        setLocations(locationsData);

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
          setActiveStep(getStepFromStatus(application.status, !!application.person));
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
  const getStepFromStatus = (status: ApplicationStatus, hasPerson: boolean = false): number => {
    switch (status) {
      case ApplicationStatus.DRAFT:
        return hasPerson ? 1 : 0;
      case ApplicationStatus.SUBMITTED:
        return 2; // Ready for requirements check
      case ApplicationStatus.DOCUMENTS_PENDING:
        return 3; // Ready for biometric capture
      default:
        return 4; // Review stage
    }
  };

  // Person selection handler
  const handlePersonSelected = useCallback(async (person: Person) => {
    setFormData(prev => ({ ...prev, person }));
    setValidationErrors([]);
    
    // Check for existing draft applications for this person
    try {
      const existingApplications = await applicationService.searchApplications({
        person_id: person.id,
        status: ApplicationStatus.DRAFT
      });
      
      if (existingApplications.length > 0) {
        setDraftApplications(existingApplications);
        setShowDraftDialog(true);
        return; // Don't auto-advance if there are drafts to review
      }
    } catch (error) {
      console.error('Error checking for draft applications:', error);
      // Continue anyway if check fails
    }
    
    // Auto-advance to next step if no drafts found
    setTimeout(() => {
      setActiveStep(1);
    }, 500);
  }, []);

  // Application details change handler
  const handleApplicationDetailsChange = async (field: string, value: any) => {
    // First update the form data
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

        // Handle application type specific settings
        if (field === 'application_type') {
          if (value === ApplicationType.LEARNERS_PERMIT) {
            // Learner's permits: Fixed 6 months validity, no temporary license option
            updated.validity_period_days = LEARNERS_PERMIT_VALIDITY_MONTHS * 30; // 6 months in days
            updated.is_temporary_license = false;
          } else if (value === ApplicationType.NEW_LICENSE) {
            // Driver's license: Allow temporary license option with default period
            updated.validity_period_days = DEFAULT_TEMPORARY_LICENSE_DAYS;
          } else {
            // Other types: Reset temporary license settings
            updated.is_temporary_license = false;
            updated.validity_period_days = DEFAULT_TEMPORARY_LICENSE_DAYS;
          }
        }
      }

      // Auto-suggest missing prerequisites for license categories
      if (field === 'license_categories' && formData.person?.birth_date) {
        const suggestions = licenseValidationService.getSuggestedCategories(value as LicenseCategory[]);
        if (suggestions.length > 0) {
          const updatedCategories = [...new Set([...value, ...suggestions])];
          if (updatedCategories.length !== value.length) {
            // Add suggested categories with user notification
            setSuccess(`Added prerequisite categories: ${suggestions.join(', ')}`);
            setTimeout(() => setSuccess(''), 3000);
            updated.license_categories = updatedCategories;
          }
        }
      }
      
      return updated;
    });
    
    // Then handle async validation outside of setState
    if (field === 'license_categories' && formData.person?.birth_date) {
      await validateLicenseCategories(
        value as LicenseCategory[], 
        formData.application_type,
        formData.person,
        formData.external_learners_permit,
        formData.external_existing_license
      );
    }
    
    setValidationErrors([]);
  };

  // Validate license categories
  const validateLicenseCategories = useCallback(async (
    categories: LicenseCategory[], 
    applicationType: ApplicationType,
    person: Person | null,
    externalLearnerPermit?: ExternalLicenseDetails,
    externalExistingLicense?: ExternalLicenseDetails
  ) => {
    if (!person?.birth_date || categories.length === 0) {
      setValidationResult(null);
      return;
    }

    try {
      const validation = await licenseValidationService.validateApplication(
        applicationType,
        categories,
        person.birth_date,
        person.id,
        externalLearnerPermit,
        externalExistingLicense
      );

      setValidationResult(validation);

      // Check existing licenses when person is selected
      if (!existingLicenseCheck) {
        const existingCheck = await licenseValidationService.checkExistingLicenses(person.id);
        setExistingLicenseCheck(existingCheck);

        // Show external forms if needed
        if (applicationType === ApplicationType.NEW_LICENSE && !existingCheck.has_learners_permit) {
          setShowExternalLearnerForm(true);
        }
        if ((applicationType === ApplicationType.UPGRADE || applicationType === ApplicationType.RENEWAL) && !existingCheck.has_active_licenses) {
          setShowExternalLicenseForm(true);
        }
      }
    } catch (error) {
      console.error('License validation error:', error);
      setValidationResult({
        is_valid: false,
        message: 'Validation failed - please check requirements',
        missing_prerequisites: [],
        age_violations: [],
        invalid_combinations: []
      });
    }
  }, [existingLicenseCheck]);

  // Get validation errors for a step without updating state (for render-time checks)
  const getStepValidationErrors = (step: number): string[] => {
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
        
        // Check for learner's permit requirement immediately in step 1
        if (formData.application_type === ApplicationType.NEW_LICENSE) {
          const categoriesRequiringLearners = formData.license_categories.filter(cat => 
            LICENSE_CATEGORY_RULES[cat].allows_learners_permit
          );
          
          if (categoriesRequiringLearners.length > 0) {
            // Check if system found valid learner's permit
            const hasSystemLearner = existingLicenseCheck?.has_learners_permit && 
                                   existingLicenseCheck.learners_permit?.is_valid;
            
            // Check if external learner's permit is provided and valid
            const hasValidExternalLearner = formData.external_learners_permit?.license_number?.trim() &&
                                          formData.external_learners_permit?.expiry_date &&
                                          formData.external_learners_permit?.verified_by_clerk &&
                                          new Date(formData.external_learners_permit.expiry_date) >= new Date();
            
            if (!hasSystemLearner && !hasValidExternalLearner) {
              // Only show error if external form isn't being filled out
              if (!showExternalLearnerForm) {
                errors.push('Valid learner\'s permit required for selected categories');
              } else if (formData.external_learners_permit?.license_number && 
                        !/^\d+$/.test(formData.external_learners_permit.license_number)) {
                errors.push('Learner\'s permit number must contain only numbers');
              } else if (formData.external_learners_permit?.expiry_date &&
                        new Date(formData.external_learners_permit.expiry_date) < new Date()) {
                errors.push('Learner\'s permit has expired');
              } else if (!formData.external_learners_permit?.verified_by_clerk) {
                errors.push('Please verify the learner\'s permit details');
              }
            }
          }
        }
        
        // Use validation service for other checks (age requirements, etc.)
        if (formData.person?.birth_date && validationResult && !validationResult.is_valid) {
          // Only add age-related validation errors here (not learner's permit errors)
          if (validationResult.age_violations.length > 0) {
            errors.push(...validationResult.age_violations.map(v => 
              `Minimum age for category ${v.category} is ${v.required_age} years (applicant is ${v.current_age})`
            ));
          }
          
          // Add other validation errors that aren't about learner's permits
          if (validationResult.invalid_combinations.length > 0 && 
              !validationResult.message.includes('learner\'s permit')) {
            errors.push(validationResult.message);
          }
        }
        
        if (formData.is_urgent && !formData.urgency_reason?.trim()) {
          errors.push('Please provide a reason for urgent processing');
        }
        
        // Location validation
        if (canSelectLocation() && !formData.selected_location_id) {
          errors.push('Please select a location for this application');
        } else if (!canSelectLocation() && !user?.primary_location_id) {
          errors.push('User location not configured. Please contact administrator.');
        }
        break;
        
      case 2: // Requirements
        const age = formData.person?.birth_date ? licenseValidationService.calculateAge(formData.person.birth_date) : 0;
        const requiresMedical = age >= 65 || formData.license_categories.some(cat => ['C', 'D', 'E'].includes(cat));
        const requiresParentalConsent = age < 18;
        const requiresExternalLicense = (formData.application_type === ApplicationType.UPGRADE || 
                                        formData.application_type === ApplicationType.RENEWAL) && 
                                       !existingLicenseCheck?.has_active_licenses;

        // Medical certificate validation
        if (requiresMedical && !formData.medical_certificate_file) {
          errors.push('Medical certificate is required');
        }

        // Parental consent validation
        if (requiresParentalConsent && !formData.parental_consent_file) {
          errors.push('Parental consent document is required for applicants under 18');
        }

        // External existing license validation (for upgrades/renewals)
        if (requiresExternalLicense) {
          if (!showExternalLicenseForm) {
            errors.push('Please confirm applicant has presented valid existing license');
          } else if (!formData.external_existing_license?.verified_by_clerk) {
            errors.push('Please verify the external existing license details');
          } else if (!formData.external_existing_license?.license_number?.trim()) {
            errors.push('Existing license number is required');
          }
        }
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
        // Final validation using license validation service
        if (validationResult && !validationResult.is_valid) {
          errors.push('Please resolve validation issues before submitting');
        }
        
        if (formData.selected_fees.length === 0) {
          errors.push('No applicable fees found - please review application details');
        }
        break;
    }
    
    return errors;
  };

  // Validation for each step (updates state for displaying errors)
  const validateStep = (step: number): boolean => {
    const errors = getStepValidationErrors(step);
    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Check if step is valid without updating state (for disabled props)
  const isStepValid = (step: number): boolean => {
    return getStepValidationErrors(step).length === 0;
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

      // Ensure we have a valid location_id
      if (!user?.primary_location_id) {
        throw new Error('User location not found. Please contact administrator.');
      }

      const applicationData: ApplicationCreate = {
        person_id: formData.person.id,
        location_id: user.primary_location_id,
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
        // Ensure we have a valid location_id
        const selectedLocationId = formData.selected_location_id || user?.primary_location_id;
        if (!selectedLocationId) {
          throw new Error('Location not found. Please select a location or contact administrator.');
        }

        const applicationData: ApplicationCreate = {
          person_id: formData.person!.id,
          location_id: selectedLocationId,
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

  // Draft dialog handlers
  const handleContinueDraft = (application: Application) => {
    setCurrentApplication(application);
    setFormData(prev => ({
      ...prev,
      application_type: application.application_type,
      license_categories: application.license_categories,
      is_urgent: application.is_urgent,
      urgency_reason: application.urgency_reason || '',
      is_temporary_license: application.is_temporary_license,
      validity_period_days: application.validity_period_days || DEFAULT_TEMPORARY_LICENSE_DAYS
    }));
    
    // Calculate fees for existing application
    const fees = applicationService.calculateApplicationFees(
      application.application_type,
      application.license_categories,
      lookups.fee_structures
    );
    
    setFormData(prev => ({
      ...prev,
      selected_fees: fees,
      total_amount: applicationService.calculateTotalAmount(fees)
    }));

    // Set appropriate step based on application status
    setActiveStep(getStepFromStatus(application.status, !!application.person));
    setShowDraftDialog(false);
  };

  const handleCreateNewApplication = () => {
    setShowDraftDialog(false);
    // Auto-advance to next step for new application
    setTimeout(() => {
      setActiveStep(1);
    }, 500);
  };

  const handleFinishLater = async () => {
    await handleSaveDraft();
    if (onComplete) {
      onComplete(currentApplication);
    }
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

  // Application Details Form Implementation
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
                {getAvailableLocations().map((location) => (
                  <MenuItem key={location.id} value={location.id}>
                    {location.name} ({location.code}) - {location.province_code}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary' }}>
                {user?.user_type === 'PROVINCIAL_ADMIN' 
                  ? `Showing locations in ${user.scope_province} province`
                  : 'Select the location where this application will be processed'
                }
              </Typography>
            </FormControl>
          </Grid>
        )}

        {/* Current Location Display (for location users) */}
        {!canSelectLocation() && user?.primary_location_id && (
          <Grid item xs={12}>
            <Alert severity="info">
              <Typography variant="body2">
                <strong>Application Location:</strong> {locations.find(loc => loc.id === user.primary_location_id)?.name || 'Current location'}
              </Typography>
            </Alert>
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
              <MenuItem value={ApplicationType.DUPLICATE}>Duplicate License</MenuItem>
              <MenuItem value={ApplicationType.UPGRADE}>License Upgrade</MenuItem>
              <MenuItem value={ApplicationType.TEMPORARY_LICENSE}>Temporary License</MenuItem>
              <MenuItem value={ApplicationType.INTERNATIONAL_PERMIT}>International Permit</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* License Categories */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel>License Categories</InputLabel>
            <Select
              multiple
              value={formData.license_categories}
              onChange={(e) => handleApplicationDetailsChange('license_categories', e.target.value)}
              label="License Categories"
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as LicenseCategory[]).map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {Object.entries(LICENSE_CATEGORY_RULES).map(([category, rules]) => {
                const isDisabled = formData.application_type === ApplicationType.LEARNERS_PERMIT && !rules.allows_learners_permit;
                
                return (
                  <MenuItem key={category} value={category} disabled={isDisabled}>
                    <Checkbox checked={formData.license_categories.includes(category as LicenseCategory)} />
                    <ListItemText 
                      primary={`${category} - ${rules.description}`} 
                      secondary={`Min age: ${rules.min_age}${rules.requires_existing.length > 0 ? ` | Requires: ${rules.requires_existing.join(', ')}` : ''}${isDisabled ? ' | Not available for learner\'s permits' : ''}`}
                    />
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
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

        {/* Temporary License Option - Only for Driver's License applications (not learner's permits) */}
        {formData.application_type === ApplicationType.NEW_LICENSE && (
          <>
            <Grid item xs={12} md={8}>
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
                Temporary license valid while main application is processed
              </Typography>
            </Grid>

            {formData.is_temporary_license && (
              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="subtitle2" gutterBottom>
                    Temporary License Validity
                  </Typography>
                  Temporary licenses are issued with a <strong>fixed validity period of {DEFAULT_TEMPORARY_LICENSE_DAYS} days</strong> from the issue date. 
                  This allows the applicant to drive legally while their main application is being processed.
                </Alert>
              </Grid>
            )}
          </>
        )}

        {/* Learner's Permit Fixed Validity Notice */}
        {formData.application_type === ApplicationType.LEARNERS_PERMIT && (
          <Grid item xs={12}>
            <Alert severity="info">
              <Typography variant="subtitle2" gutterBottom>
                Learner's Permit Validity Period
              </Typography>
              All learner's permits are issued with a <strong>fixed validity period of {LEARNERS_PERMIT_VALIDITY_MONTHS} months</strong> from the issue date. 
              This period is set by administrative policy and cannot be modified during application processing.
              <br /><br />
              <strong>Note:</strong> Validity period settings are managed by system administrators only and will be available 
              in the admin settings once the full admin panel is implemented.
            </Alert>
          </Grid>
        )}

        {/* Real-time Validation Display */}
        {validationResult && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle2" gutterBottom>
                License Category Validation
              </Typography>
              <Alert severity={validationResult.is_valid ? "success" : "warning"}>
                {validationResult.message}
                
                {validationResult.age_violations.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" fontWeight="bold">Age Requirements:</Typography>
                    <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                      {validationResult.age_violations.map((violation, index) => (
                        <li key={index}>
                          Category {violation.category}: Required {violation.required_age}+ years (applicant is {violation.current_age})
                        </li>
                      ))}
                    </ul>
                  </Box>
                )}

                {validationResult.missing_prerequisites.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" fontWeight="bold">Missing Prerequisites:</Typography>
                    <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                      {validationResult.missing_prerequisites.map((prereq, index) => (
                        <li key={index}>Category {prereq} required</li>
                      ))}
                    </ul>
                  </Box>
                )}

                {validationResult.invalid_combinations.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" fontWeight="bold">Combination Issues:</Typography>
                    <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                      {validationResult.invalid_combinations.map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  </Box>
                )}
              </Alert>
            </Paper>
          </Grid>
        )}

        {/* Existing License Information */}
        {existingLicenseCheck && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle2" gutterBottom>
                Existing License Status
              </Typography>
              
              {existingLicenseCheck.has_active_licenses ? (
                <Alert severity="info">
                  <Typography variant="body2" gutterBottom>Active Licenses Found:</Typography>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {existingLicenseCheck.active_licenses.map((license, index) => (
                      <li key={index}>
                        {license.license_number} - Categories: {license.categories.join(', ')} 
                        (Expires: {new Date(license.expiry_date).toLocaleDateString()})
                      </li>
                    ))}
                  </ul>
                </Alert>
              ) : (
                <Alert severity="warning">
                  No active licenses found in system. External license verification may be required.
                </Alert>
              )}

              {existingLicenseCheck.has_learners_permit && (
                <Alert severity="success" sx={{ mt: 1 }}>
                  Valid learner's permit found for categories: {existingLicenseCheck.learners_permit?.categories.join(', ')}
                </Alert>
              )}

              {existingLicenseCheck.must_renew.length > 0 && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  <Typography variant="body2" gutterBottom>Renewal Required:</Typography>
                  Categories {existingLicenseCheck.must_renew.join(', ')} expire within 6 months
                </Alert>
              )}
            </Paper>
          </Grid>
        )}

        {/* Learner's Permit Verification moved to Requirements step */}

        {/* Fee Calculation moved to Review step */}
      </Grid>
    </Box>
  );

  const renderRequirementsStep = () => {
    const age = formData.person?.birth_date ? licenseValidationService.calculateAge(formData.person.birth_date) : 0;
    const requiresMedical = age >= 65 || formData.license_categories.some(cat => ['C', 'D', 'E'].includes(cat));
    const requiresParentalConsent = age < 18;
    const requiresExternalLicense = (formData.application_type === ApplicationType.UPGRADE || 
                                    formData.application_type === ApplicationType.RENEWAL) && 
                                   !existingLicenseCheck?.has_active_licenses;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>Requirements Check</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Complete required document uploads and license verification
        </Typography>

        <Grid container spacing={3}>
          {/* Medical Certificate */}
          {requiresMedical && (
            <Grid item xs={12}>
              <Card>
                <CardHeader 
                  title="Medical Certificate" 
                  subheader={age >= 65 ? "Required for applicants 65+" : "Required for commercial licenses (C, D, E)"} 
                />
                <CardContent>
                  <input
                    accept="image/*,.pdf"
                    style={{ display: 'none' }}
                    id="medical-certificate-upload"
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData(prev => ({ ...prev, medical_certificate_file: file }));
                      }
                    }}
                  />
                  <label htmlFor="medical-certificate-upload">
                    <Button variant="outlined" component="span" startIcon={<AssignmentIcon />}>
                      {formData.medical_certificate_file ? 'Change Medical Certificate' : 'Upload Medical Certificate'}
                    </Button>
                  </label>
                  {formData.medical_certificate_file && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      File: {formData.medical_certificate_file.name}
                    </Typography>
                  )}
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Upload medical certificate dated within the last 6 months
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Parental Consent */}
          {requiresParentalConsent && (
            <Grid item xs={12}>
              <Card>
                <CardHeader 
                  title="Parental Consent" 
                  subheader="Required for applicants under 18 years" 
                />
                <CardContent>
                  <input
                    accept="image/*,.pdf"
                    style={{ display: 'none' }}
                    id="parental-consent-upload"
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData(prev => ({ ...prev, parental_consent_file: file }));
                      }
                    }}
                  />
                  <label htmlFor="parental-consent-upload">
                    <Button variant="outlined" component="span" startIcon={<AssignmentIcon />}>
                      {formData.parental_consent_file ? 'Change Parental Consent' : 'Upload Parental Consent'}
                    </Button>
                  </label>
                  {formData.parental_consent_file && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      File: {formData.parental_consent_file.name}
                    </Typography>
                  )}
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Signed consent form from parent or legal guardian
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Learner's Permit Verification - For Driver's License Applications */}
          {formData.application_type === ApplicationType.NEW_LICENSE && 
           formData.license_categories.some(cat => LICENSE_CATEGORY_RULES[cat].allows_learners_permit) && (
            <Grid item xs={12}>
              <Card>
                <CardHeader 
                  title="Learner's Permit Verification" 
                  subheader="Required for new driver's license applications" 
                />
                <CardContent>
                  {existingLicenseCheck?.has_learners_permit ? (
                    <Alert severity="success">
                      <Typography variant="body2" gutterBottom>System Found Valid Learner's Permit:</Typography>
                      Categories: {existingLicenseCheck.learners_permit?.categories.join(', ')}
                      <br />
                      Expires: {existingLicenseCheck.learners_permit?.expiry_date ? 
                        new Date(existingLicenseCheck.learners_permit.expiry_date).toLocaleDateString() : 'Unknown'}
                    </Alert>
                  ) : (
                    <Box>
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        No valid learner's permit found in system for selected categories. 
                        Manual verification required.
                      </Alert>
                      
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={showExternalLearnerForm}
                            onChange={(e) => setShowExternalLearnerForm(e.target.checked)}
                          />
                        }
                        label="Applicant has presented valid learner's permit"
                        sx={{ mb: 2 }}
                      />
                      
                      {showExternalLearnerForm && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="body2" fontWeight="bold" gutterBottom>
                            External Learner's Permit Details:
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <TextField
                                fullWidth
                                size="small"
                                label="Learner's Permit Number"
                                value={formData.external_learners_permit?.license_number || ''}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, '');
                                  setFormData(prev => ({
                                    ...prev,
                                    external_learners_permit: {
                                      ...prev.external_learners_permit,
                                      license_number: value,
                                      license_type: 'LEARNERS_PERMIT',
                                      categories: formData.license_categories,
                                      issue_date: prev.external_learners_permit?.issue_date || '',
                                      expiry_date: prev.external_learners_permit?.expiry_date || '',
                                      issuing_location: prev.external_learners_permit?.issuing_location || '',
                                      verified_by_clerk: prev.external_learners_permit?.verified_by_clerk || false
                                    } as ExternalLicenseDetails
                                  }));
                                }}
                                placeholder="Enter numbers only"
                                required
                              />
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <TextField
                                fullWidth
                                size="small"
                                label="Expiry Date"
                                type="date"
                                value={formData.external_learners_permit?.expiry_date || ''}
                                onChange={(e) => {
                                  setFormData(prev => ({
                                    ...prev,
                                    external_learners_permit: {
                                      ...prev.external_learners_permit!,
                                      expiry_date: e.target.value
                                    }
                                  }));
                                }}
                                InputLabelProps={{ shrink: true }}
                                required
                              />
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <FormControl fullWidth size="small" required>
                                <InputLabel>Issuing Location</InputLabel>
                                <Select
                                  value={formData.external_learners_permit?.issuing_location || ''}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    external_learners_permit: {
                                      ...prev.external_learners_permit!,
                                      issuing_location: e.target.value
                                    }
                                  }))}
                                  label="Issuing Location"
                                >
                                  <MenuItem value="">
                                    <em>Select issuing location</em>
                                  </MenuItem>
                                  {locations.map((location) => (
                                    <MenuItem key={location.id} value={location.name}>
                                      {location.name} ({location.code})
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={formData.external_learners_permit?.verified_by_clerk || false}
                                    onChange={(e) => {
                                      setFormData(prev => ({
                                        ...prev,
                                        external_learners_permit: {
                                          ...prev.external_learners_permit!,
                                          verified_by_clerk: e.target.checked
                                        }
                                      }));
                                    }}
                                  />
                                }
                                label="Verified valid permit"
                                sx={{ color: 'primary.main', mt: 1 }}
                              />
                            </Grid>
                          </Grid>
                        </Box>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* External Existing License Verification - Enhanced */}
          {requiresExternalLicense && (
            <Grid item xs={12}>
              <Card>
                <CardHeader 
                  title="Existing License Verification" 
                  subheader="No active licenses found in system - manual verification required for upgrade/renewal" 
                />
                <CardContent>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={showExternalLicenseForm}
                        onChange={(e) => setShowExternalLicenseForm(e.target.checked)}
                      />
                    }
                    label="Applicant has presented valid existing license"
                  />
                  
                  {showExternalLicenseForm && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="body2" fontWeight="bold" gutterBottom>
                        External Existing License Details:
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="License Number"
                            value={formData.external_existing_license?.license_number || ''}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              setFormData(prev => ({
                                ...prev,
                                external_existing_license: {
                                  ...prev.external_existing_license,
                                  license_number: value,
                                  license_type: 'DRIVERS_LICENSE',
                                  categories: prev.external_existing_license?.categories || [],
                                  issue_date: prev.external_existing_license?.issue_date || '',
                                  expiry_date: prev.external_existing_license?.expiry_date || '',
                                  issuing_location: prev.external_existing_license?.issuing_location || '',
                                  verified_by_clerk: prev.external_existing_license?.verified_by_clerk || false
                                } as ExternalLicenseDetails
                              }));
                            }}
                            placeholder="Enter numbers only"
                            required
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Issue Date"
                            type="date"
                            value={formData.external_existing_license?.issue_date || ''}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                external_existing_license: {
                                  ...prev.external_existing_license!,
                                  issue_date: e.target.value
                                }
                              }));
                            }}
                            InputLabelProps={{ shrink: true }}
                            required
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Expiry Date"
                            type="date"
                            value={formData.external_existing_license?.expiry_date || ''}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                external_existing_license: {
                                  ...prev.external_existing_license!,
                                  expiry_date: e.target.value
                                }
                              }));
                            }}
                            InputLabelProps={{ shrink: true }}
                            inputProps={{
                              min: new Date().toISOString().split('T')[0]
                            }}
                            required
                            error={formData.external_existing_license?.expiry_date && 
                                   new Date(formData.external_existing_license.expiry_date) < new Date()}
                            helperText={formData.external_existing_license?.expiry_date && 
                                       new Date(formData.external_existing_license.expiry_date) < new Date() 
                                       ? "License must not be expired" : ""}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth size="small" required>
                            <InputLabel>Issuing Location</InputLabel>
                            <Select
                              value={formData.external_existing_license?.issuing_location || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                external_existing_license: {
                                  ...prev.external_existing_license!,
                                  issuing_location: e.target.value
                                }
                              }))}
                              label="Issuing Location"
                            >
                              <MenuItem value="">
                                <em>Select issuing location</em>
                              </MenuItem>
                              {locations.map((location) => (
                                <MenuItem key={location.id} value={location.name}>
                                  {location.name} ({location.code})
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Current License Categories"
                            value={formData.external_existing_license?.categories?.join(', ') || ''}
                                                         onChange={(e) => {
                               const categories = e.target.value.split(',').map(cat => cat.trim().toUpperCase()).filter(cat => cat) as LicenseCategory[];
                               setFormData(prev => ({
                                 ...prev,
                                 external_existing_license: {
                                   ...prev.external_existing_license!,
                                   categories: categories
                                 }
                               }));
                             }}
                            placeholder="e.g., A, B (comma-separated)"
                            helperText="Enter current license categories (e.g., A, B)"
                            required
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={formData.external_existing_license?.verified_by_clerk || false}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  external_existing_license: {
                                    ...prev.external_existing_license!,
                                    verified_by_clerk: e.target.checked
                                  }
                                }))}
                              />
                            }
                            label="I have verified this license is valid and matches the applicant"
                            sx={{ color: 'primary.main' }}
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* No Requirements Message */}
          {!requiresMedical && !requiresParentalConsent && !requiresExternalLicense && (
            <Grid item xs={12}>
              <Alert severity="success">
                No additional requirements needed for this application. You may proceed to the next step.
              </Alert>
            </Grid>
          )}
        </Grid>
      </Box>
    );
  };

  const renderBiometricStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Biometric Data Capture</Typography>
      <Alert severity="info">
        Biometric capture will be implemented in the next development phase.
        This includes photo, signature, and fingerprint capture integration.
      </Alert>
    </Box>
  );

  const renderReviewStep = () => {
    const age = formData.person?.birth_date ? licenseValidationService.calculateAge(formData.person.birth_date) : 0;
    const requiresMedical = age >= 65 || formData.license_categories.some(cat => ['C', 'D', 'E'].includes(cat));
    const requiresParentalConsent = age < 18;
    const requiresExternalLicense = (formData.application_type === ApplicationType.UPGRADE || 
                                    formData.application_type === ApplicationType.RENEWAL) && 
                                   !existingLicenseCheck?.has_active_licenses;
    const requiresExternalLearner = formData.application_type === ApplicationType.NEW_LICENSE && 
                                   formData.license_categories.some(cat => LICENSE_CATEGORY_RULES[cat].allows_learners_permit) && 
                                   !existingLicenseCheck?.has_learners_permit;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>Review & Submit</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Review all details, fees, and requirements before submitting your application
        </Typography>

        <Grid container spacing={3}>
          {/* Application Summary */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Application Summary" />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Applicant:</Typography>
                    <Typography variant="body1">
                      {formData.person?.first_name} {formData.person?.surname}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Application Type:</Typography>
                    <Typography variant="body1">
                      {formData.application_type.replace('_', ' ')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">License Categories:</Typography>
                    <Typography variant="body1">
                      {formData.license_categories.join(', ')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Processing Location:</Typography>
                    <Typography variant="body1">
                      {(() => {
                        const selectedLocationId = formData.selected_location_id || user?.primary_location_id;
                        const location = locations.find(loc => loc.id === selectedLocationId);
                        return location ? `${location.name} (${location.code})` : 'Location not found';
                      })()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Urgency:</Typography>
                    <Typography variant="body1">
                      {formData.is_urgent ? 'Urgent' : 'Standard'}
                    </Typography>
                  </Grid>
                  {formData.notes && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">Notes:</Typography>
                      <Typography variant="body1">{formData.notes}</Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Requirements Checklist */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Requirements Checklist" />
              <CardContent>
                <List>
                  {/* Medical Certificate */}
                  {requiresMedical && (
                    <ListItem>
                      <ListItemIcon>
                        {formData.medical_certificate_file ? 
                          <CheckCircleIcon color="success" /> : 
                          <ErrorIcon color="error" />
                        }
                      </ListItemIcon>
                      <ListItemText 
                        primary="Medical Certificate"
                        secondary={formData.medical_certificate_file ? 
                          `Uploaded: ${formData.medical_certificate_file.name}` : 
                          "Required but not uploaded"
                        }
                      />
                    </ListItem>
                  )}

                  {/* Parental Consent */}
                  {requiresParentalConsent && (
                    <ListItem>
                      <ListItemIcon>
                        {formData.parental_consent_file ? 
                          <CheckCircleIcon color="success" /> : 
                          <ErrorIcon color="error" />
                        }
                      </ListItemIcon>
                      <ListItemText 
                        primary="Parental Consent"
                        secondary={formData.parental_consent_file ? 
                          `Uploaded: ${formData.parental_consent_file.name}` : 
                          "Required but not uploaded"
                        }
                      />
                    </ListItem>
                  )}

                  {/* Learner's Permit Verification */}
                  {requiresExternalLearner && (
                    <ListItem>
                      <ListItemIcon>
                        {formData.external_learners_permit?.verified_by_clerk ? 
                          <CheckCircleIcon color="success" /> : 
                          <ErrorIcon color="error" />
                        }
                      </ListItemIcon>
                      <ListItemText 
                        primary="Learner's Permit Verification"
                        secondary={formData.external_learners_permit?.verified_by_clerk ? 
                          `Verified: ${formData.external_learners_permit.license_number}` : 
                          "Required but not verified"
                        }
                      />
                    </ListItem>
                  )}

                  {/* Existing License Verification */}
                  {requiresExternalLicense && (
                    <ListItem>
                      <ListItemIcon>
                        {formData.external_existing_license?.verified_by_clerk ? 
                          <CheckCircleIcon color="success" /> : 
                          <ErrorIcon color="error" />
                        }
                      </ListItemIcon>
                      <ListItemText 
                        primary="Existing License Verification"
                        secondary={formData.external_existing_license?.verified_by_clerk ? 
                          `Verified: ${formData.external_existing_license.license_number}` : 
                          "Required but not verified"
                        }
                      />
                    </ListItem>
                  )}

                  {/* No requirements case */}
                  {!requiresMedical && !requiresParentalConsent && !requiresExternalLearner && !requiresExternalLicense && (
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="All Requirements Met"
                        secondary="No additional requirements needed for this application"
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Fee Calculation */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Fee Calculation" />
              <CardContent>
                {formData.selected_fees.length > 0 ? (
                  <Box>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Fee Type</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell align="right">Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {formData.selected_fees.map((fee, index) => (
                          <TableRow key={index}>
                            <TableCell>{fee.display_name}</TableCell>
                            <TableCell>{fee.description}</TableCell>
                            <TableCell align="right">
                              {fee.amount.toLocaleString()} {fee.currency}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow sx={{ '& td': { border: 0 } }}>
                          <TableCell colSpan={2}>
                            <Typography variant="h6" sx={{ mt: 2 }}>Total Amount</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="h6" sx={{ mt: 2 }}>
                              {formData.total_amount.toLocaleString()} Ar
                            </Typography>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                    
                    {formData.is_urgent && (
                      <Alert severity="warning" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          <strong>Urgent Processing:</strong> Additional fees may apply for expedited processing.
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                ) : (
                  <Alert severity="info">
                    Fee calculation will be determined based on your application details and requirements.
                    Please ensure all previous steps are completed for accurate fee calculation.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Final Validation */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Final Validation" />
              <CardContent>
                {validationErrors.length > 0 ? (
                  <Alert severity="error">
                    <Typography variant="subtitle2" gutterBottom>
                      Please fix the following issues before submitting:
                    </Typography>
                    <ul>
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </Alert>
                ) : (
                  <Alert severity="success">
                    <Typography variant="body2">
                      ✓ All requirements met and validation passed. Your application is ready to submit.
                    </Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

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
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  {activeStep > 0 && (
                    <Button onClick={handleBack} variant="outlined">
                      Back
                    </Button>
                  )}
                  
                  <Button
                    onClick={handleSaveDraft}
                    disabled={saving || !formData.person}
                    startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                    variant="outlined"
                    color="secondary"
                  >
                    {saving ? 'Saving...' : 'Save Draft'}
                  </Button>

                  {formData.person && (
                    <Button
                      onClick={handleFinishLater}
                      disabled={saving}
                      variant="outlined"
                      color="warning"
                    >
                      Finish Later
                    </Button>
                  )}
                  
                  <Box sx={{ flexGrow: 1 }} />
                  
                  {activeStep < steps.length - 1 ? (
                    <Button 
                      onClick={handleNext} 
                      variant="contained"
                      disabled={!isStepValid(activeStep)}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => setShowConfirmDialog(true)} 
                      variant="contained" 
                      color="primary"
                      disabled={!isStepValid(activeStep)}
                    >
                      Submit Application
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

      {/* Draft Applications Dialog */}
      <Dialog open={showDraftDialog} onClose={() => setShowDraftDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Existing Draft Applications Found
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Found {draftApplications.length} draft application(s) for {formData.person?.first_name} {formData.person?.surname}. 
            You can continue an existing draft or create a new application.
          </Alert>
          
          <Typography variant="h6" gutterBottom>Draft Applications:</Typography>
          
          {draftApplications.map((app, index) => (
            <Card key={app.id} sx={{ mb: 2 }}>
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {app.application_number || `Draft ${index + 1}`}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Type: {app.application_type.replace('_', ' ')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Categories: {app.license_categories.join(', ')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Created: {new Date(app.created_at).toLocaleDateString()}
                    </Typography>
                    {app.is_urgent && (
                      <Chip label="Urgent" size="small" color="warning" />
                    )}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <Button 
                        variant="contained" 
                        onClick={() => handleContinueDraft(app)}
                        size="small"
                      >
                        Continue Draft
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDraftDialog(false)} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleCreateNewApplication} variant="outlined">
            Create New Application
          </Button>
        </DialogActions>
      </Dialog>

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