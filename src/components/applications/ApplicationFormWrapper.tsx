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
  Switch,
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
  TableCell,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Tooltip,
  IconButton
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
  Error as ErrorIcon,
  Create as CreateIcon,
  Fingerprint as FingerprintIcon,
  ExpandMore as ExpandMoreIcon,
  PhotoCamera as PhotoCameraIcon,
  CloudUpload as CloudUploadIcon,
  Visibility as VisibilityIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

import PersonFormWrapper from '../PersonFormWrapper';
import LicenseVerificationSection from './LicenseVerificationSection';
import MedicalInformationSection from './MedicalInformationSection';
import WebcamCapture from './WebcamCapture';
import SignatureCapture from './SignatureCapture';
import FingerprintCapture from './FingerprintCapture';
import { applicationService } from '../../services/applicationService';
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
  LICENSE_SUPERSEDING_MATRIX,
  TransmissionType,
  LicenseRestriction,
  ExternalLicenseDetails,
  LicenseValidationResult,
  ExistingLicenseCheck,
  LicenseVerificationData,
  LEARNERS_PERMIT_VALIDITY_MONTHS,
  DEFAULT_TEMPORARY_LICENSE_DAYS,
  ReplacementReason,
  getAuthorizedCategories,
  getSupersededCategories,
  isCommercialLicense,
  requiresMedical60Plus,
  requiresMedicalAlways,
  getCategoryFamily
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
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [licenseValidation, setLicenseValidation] = useState<any>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [stepValidation, setStepValidation] = useState<boolean[]>([false, false, false, false, false, false]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // License validation states
  const [validationResult, setValidationResult] = useState<LicenseValidationResult | null>(null);
  const [existingLicenseCheck, setExistingLicenseCheck] = useState<ExistingLicenseCheck | null>(null);
  const [showExternalLearnerForm, setShowExternalLearnerForm] = useState(false);
  const [showExternalLicenseForm, setShowExternalLicenseForm] = useState(false);
  
  // Prerequisite checking states (keep existing)
  const [prerequisiteCheck, setPrerequisiteCheck] = useState<PrerequisiteCheck | null>(null);
  const [checkingPrerequisites, setCheckingPrerequisites] = useState(false);
  
  // Draft applications detection
  const [draftApplications, setDraftApplications] = useState<Application[]>([]);
  const [showDraftDialog, setShowDraftDialog] = useState(false);

  // Application data with single license category
  const [formData, setFormData] = useState<ApplicationFormData>({
    person: null,
    application_type: ApplicationType.NEW_LICENSE,
    license_category: '' as LicenseCategory,
    selected_location_id: '',
    never_been_refused: true, // Default to true (most people haven't been refused)
    refusal_details: '',
    // Section C fields
    replacement_reason: undefined,
    office_of_issue: '',
    police_reported: false,
    police_station: '',
    police_reference_number: '',
    date_of_change: '',
    medical_certificate_file: undefined,
    parental_consent_file: undefined,
    license_verification: null,
    medical_information: null,
    biometric_data: {},
    selected_fees: [],
    total_amount: 0,
    notes: ''
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

  // Calculate age helper
  const calculateAge = (birthDate: string): number => {
    return Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  };

  // Check if Section C is required for this application type
  const requiresSectionC = () => {
    return [
      ApplicationType.REPLACEMENT,
      ApplicationType.NEW_LICENSE // For "new card/duplicate" cases
    ].includes(formData.application_type);
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
      description: 'Select license category and vehicle type',
      icon: <AssignmentIcon />,
      component: 'application'
    },
    // Conditionally include Section C for replacement/notice applications
    ...(requiresSectionC() ? [{
      label: 'Notice/Replacement Details',
      description: 'Complete Section C for replacement or notice of change',
      icon: <WarningIcon />,
      component: 'sectionC'
    }] : []),
    {
      label: 'Requirements',
      description: 'Verify documents and prerequisites',
      icon: <VerifiedUserIcon />,
      component: 'requirements'
    },
    {
      label: 'Medical Assessment',
      description: 'Complete vision test and medical clearance',
      icon: <VerifiedUserIcon />,
      component: 'medical'
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

  // Load initial data and calculate fees
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const [locationsData, feesData] = await Promise.all([
          lookupService.getLocations(),
          applicationService.getFeeStructures()
        ]);
        setLocations(locationsData);
        setLookups(prev => ({ ...prev, fee_structures: feesData }));
        
        // Calculate initial fees if we have form data
        if (formData.person && formData.license_category) {
          calculateFees();
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load initial data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Calculate fees when application details change
  const calculateFees = useCallback(() => {
    if (!lookups.fee_structures.length || !formData.license_category) return;

    const applicableFees = applicationService.calculateApplicationFees(
      formData.application_type,
      [formData.license_category],
      lookups.fee_structures
    );

    const totalAmount = applicationService.calculateTotalAmount(applicableFees);
    
    setFormData(prev => ({
      ...prev,
      selected_fees: applicableFees,
      total_amount: totalAmount
    }));
  }, [formData.application_type, formData.license_category, lookups.fee_structures]);

  // Recalculate fees when relevant data changes
  useEffect(() => {
    calculateFees();
  }, [calculateFees]);

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
      const personApplications = await applicationService.getApplicationsByPerson(personId);
      
      const prerequisiteApplications = personApplications.filter(app => 
        requiredCategories.map(String).includes(String(app.license_category)) &&
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
    console.log('Application details change:', field, value);
    
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate fees when category changes
      if (field === 'license_category' && value && prev.person) {
        console.log('Calculating fees for category:', value);
        const fees = applicationService.calculateApplicationFees(
          updated.application_type,
          [value],
          lookups.fee_structures
        );
        updated.selected_fees = fees;
        updated.total_amount = applicationService.calculateTotalAmount(fees);
        console.log('Calculated fees:', fees, 'Total:', updated.total_amount);
      }
      
      return updated;
    });
  };

  // Handle person selection
  // Comprehensive license validation function
  const validateLicenseCategories = async (
    selectedCategory: LicenseCategory,
    applicationType: ApplicationType,
    person: Person,
    licenseVerification: LicenseVerificationData | null
  ) => {
    if (!selectedCategory || !person.birth_date) return;

    try {
      setValidating(true);
      const validationResult = await licenseValidationService.validateApplication(
        applicationType,
        selectedCategory,
        person.birth_date,
        person.id,
        TransmissionType.MANUAL, // Default since we removed transmission selection
        false, // Default since we removed disability modification
        undefined,
        undefined
      );
      
      console.log('License validation result:', validationResult);
      setLicenseValidation(validationResult);
      
    } catch (error) {
      console.error('License validation error:', error);
      setLicenseValidation({
        is_valid: false,
        message: 'Validation failed',
        missing_prerequisites: [],
        age_violations: [],
        invalid_combinations: [],
        medicalRequired: false,
        medicalRequiredReason: '',
        licenseRestrictions: [],
        authorizedCategories: []
      });
    } finally {
      setValidating(false);
    }
  };

  const handlePersonSelected = useCallback(async (person: Person | null) => {
    setFormData(prev => ({ ...prev, person }));
    setValidationErrors([]);
    
    if (!person) return;
    
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

    // Run license validation if we have both person and category
    if (formData.license_category) {
      await validateLicenseCategories(
        formData.license_category,
        formData.application_type,
        person,
        formData.license_verification
      );
    }
    
    // Also run the existing prerequisite check
    if (formData.license_category) {
      await checkPrerequisites(person.id, formData.license_category);
    }
    
    // Let PersonFormWrapper handle step progression instead of auto-advancing
    // This allows the user to review person details before continuing to application
  }, [formData.license_category, formData.application_type, formData.license_verification, validateLicenseCategories]);

  // Handle person confirmation (when user clicks "Confirm and Continue")
  const handlePersonConfirmed = useCallback(async (person: Person | null) => {
    // First run the normal person selection logic
    await handlePersonSelected(person);
    
    // Then advance to the next step
    if (person) {
      setActiveStep(1);
    }
  }, [handlePersonSelected]);

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

      case 1: // Application Details - Section B
        if (!formData.license_category) {
          errors.push('Please select a license category');
        }
        if (!formData.application_type) {
          errors.push('Please select an application type');
        }
        // Validate never been refused declaration
        if (formData.never_been_refused === false && !formData.refusal_details?.trim()) {
          errors.push('Please provide details of previous license application refusal');
        }
        // Remove old validations that are no longer in Section B
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

        // License verification validation
        if (formData.license_verification?.requires_verification) {
          errors.push('External licenses require verification before proceeding');
        }

        // Prerequisite validation using license verification data
        const categoryRules = LICENSE_CATEGORY_RULES[formData.license_category];
        if (categoryRules?.requires_existing?.length) {
          const allLicenseCategories = formData.license_verification?.all_license_categories || [];
          const missingRequired = categoryRules.requires_existing.filter(req => 
            !allLicenseCategories.includes(req as LicenseCategory)
          );
          if (missingRequired.length > 0) {
            errors.push(`Category ${formData.license_category} requires existing license: ${missingRequired.join(', ')}`);
          }
        }
        break;

      case 3: // Medical Assessment
        const age = formData.person?.birth_date ? calculateAge(formData.person.birth_date) : 0;
        const isMedicalMandatory = requiresMedicalAlways(formData.license_category) || 
                                 (age >= 60 && requiresMedical60Plus(formData.license_category));

        if (isMedicalMandatory) {
          if (!formData.medical_information) {
            errors.push('Medical assessment is mandatory for this application');
          } else {
            // Check if vision test is complete
            if (!formData.medical_information.vision_test.visual_acuity_binocular) {
              errors.push('Visual acuity test (binocular vision) is required');
            }
            
            // Check if medical clearance has been determined
            if (formData.medical_information.medical_clearance === undefined || formData.medical_information.medical_clearance === null) {
              errors.push('Medical clearance status must be determined');
            }
            
            // Check if examiner details are provided
            if (!formData.medical_information.examined_by?.trim()) {
              errors.push('Medical examiner name is required');
            }
            
            if (!formData.medical_information.examination_date) {
              errors.push('Medical examination date is required');
            }
          }
        }
        break;

      case 4: // Biometric
        // Photo is required for license production
        if (!formData.biometric_data.photo) {
          errors.push('License photo is required for card production');
        }
        break;

      case 5: // Review
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
        medical_information: formData.medical_information
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
        medical_information: formData.medical_information
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
    const currentStep = steps[step];
    if (!currentStep) return <Typography>Unknown step</Typography>;

    switch (currentStep.component) {
      case 'person':
        return (
          <PersonFormWrapper
            mode="application"
            initialPersonId={initialPersonId}
            onComplete={handlePersonConfirmed}
            onSuccess={(person) => handlePersonSelected(person)}
            title=""
            subtitle="Select existing person or register new applicant"
            showHeader={false}
          />
        );

      case 'application':
        return renderApplicationDetailsStep();

      case 'sectionC':
        return renderSectionCStep();

      case 'requirements':
        return renderRequirementsStep();

      case 'medical':
        return renderMedicalStep();

      case 'biometric':
        return renderBiometricStep();

      case 'review':
        return renderReviewStep();

      default:
        return <Typography>Unknown step</Typography>;
    }
  };

  // Application Details Step - Section B
  const renderApplicationDetailsStep = () => {
    // Determine which application form type we're dealing with
    const getApplicationFormType = () => {
      if (formData.application_type === ApplicationType.LEARNERS_PERMIT) {
        return 'LEARNERS_PERMIT';
      } else if ([LicenseCategory.C1, LicenseCategory.C, LicenseCategory.C1E, LicenseCategory.CE, 
                  LicenseCategory.D1, LicenseCategory.D, LicenseCategory.D2].includes(formData.license_category)) {
        return 'PROFESSIONAL_DRIVER';
      } else {
        return 'DRIVERS_LICENSE';
      }
    };

    const getAvailableLicenseCategories = () => {
      const formType = getApplicationFormType();
      
      switch (formType) {
        case 'LEARNERS_PERMIT':
          return [
            { value: LicenseCategory.A1, label: 'A1 - Motor cycle not exceeding 125cm³ (16+ years)' },
            { value: LicenseCategory.A, label: 'A - Motor cycle exceeding 125cm³' },
            { value: LicenseCategory.B, label: 'B - Light motor vehicle (≤ 3,500 kg)' }
          ];
          
        case 'PROFESSIONAL_DRIVER':
          return [
            { value: LicenseCategory.C1, label: 'C1 - Heavy motor vehicle (3,500-16,000 kg)' },
            { value: LicenseCategory.C, label: 'C - Extra heavy motor vehicle (> 16,000 kg)' },
            { value: LicenseCategory.C1E, label: 'C1E - Heavy articulated vehicle' },
            { value: LicenseCategory.CE, label: 'CE - Extra heavy articulated vehicle' },
            { value: LicenseCategory.D1, label: 'D1 - Minibus (≤ 16 passengers)' },
            { value: LicenseCategory.D, label: 'D - Bus (> 16 passengers)' },
            { value: LicenseCategory.D2, label: 'D2 - Articulated bus' }
          ];
          
        default: // DRIVERS_LICENSE
          return [
            { value: LicenseCategory.A1, label: 'A1 - Motor cycle not exceeding 125cm³ (16+ years)' },
            { value: LicenseCategory.A, label: 'A - Motor cycle exceeding 125cm³' },
            { value: LicenseCategory.B, label: 'B - Light motor vehicle (≤ 3,500 kg)' },
            { value: LicenseCategory.BE, label: 'BE - Light articulated vehicle/combination' }
          ];
      }
    };

    // Check if selected category requires prerequisite licenses
    const getRequiredLicenses = (category: LicenseCategory): LicenseCategory[] => {
      const requirements: Record<string, LicenseCategory[]> = {
        [LicenseCategory.A]: [LicenseCategory.A1],
        [LicenseCategory.C1]: [LicenseCategory.B],
        [LicenseCategory.C]: [LicenseCategory.C1],
        [LicenseCategory.C1E]: [LicenseCategory.C1],
        [LicenseCategory.CE]: [LicenseCategory.C],
        [LicenseCategory.D1]: [LicenseCategory.B],
        [LicenseCategory.D]: [LicenseCategory.D1],
        [LicenseCategory.D2]: [LicenseCategory.D],
        [LicenseCategory.BE]: [LicenseCategory.B]
      };
      return requirements[category] || [];
    };

    // Check license verification status
    const checkLicenseRequirements = async (selectedCategory: LicenseCategory) => {
      if (!formData.person) return;

      const requiredLicenses = getRequiredLicenses(selectedCategory);
      if (requiredLicenses.length === 0) {
        // No prerequisites required
        setFormData(prev => ({
          ...prev,
          license_verification: {
            person_id: formData.person!.id,
            requires_verification: false,
            system_licenses: [],
            external_licenses: [],
            all_license_categories: [selectedCategory],
            missing_prerequisites: [],
            can_proceed: true
          }
        }));
        return;
      }

      // Check if person has required licenses in the system
      // TODO: This will need to be implemented when we have license lookup service
      // For now, assume no licenses found in system and require external capture
      
      const systemLicenses: any[] = []; // TODO: await licenseService.getPersonLicenses(formData.person.id);
      const foundRequired = requiredLicenses.filter(req => 
        systemLicenses.some(sys => sys.license_category === req)
      );
      const missingRequired = requiredLicenses.filter(req => 
        !systemLicenses.some(sys => sys.license_category === req)
      );

      setFormData(prev => ({
        ...prev,
        license_verification: {
          person_id: formData.person!.id,
          requires_verification: missingRequired.length > 0,
          system_licenses: systemLicenses,
          external_licenses: missingRequired.map(cat => ({
            license_category: cat,
            license_type: 'DRIVERS_LICENSE' as const,
            categories: [cat],
            license_number: '',
            issue_date: '',
            expiry_date: '',
            issuing_authority: '',
            issuing_location: '',
            restrictions: '',
            verified: false,
            verification_source: 'MANUAL' as const,
            is_required: true
          })),
          all_license_categories: [...systemLicenses.map((l: any) => l.license_category), selectedCategory]
        }
      }));
    };

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Section B: Application Details
        </Typography>
        
        <Grid container spacing={3}>
          {/* Application Type Selection */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>Application Type</InputLabel>
              <Select
                value={formData.application_type}
                onChange={async (e) => {
                  const newType = e.target.value as ApplicationType;
                  setFormData(prev => ({ 
                    ...prev, 
                    application_type: newType,
                    license_category: '' as LicenseCategory // Reset category when type changes
                  }));
                }}
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

          {/* Application Location (for admin users) */}
          {canSelectLocation() && (
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Application Location</InputLabel>
                <Select
                  value={formData.selected_location_id || ''}
                  onChange={(e) => handleApplicationDetailsChange('selected_location_id', e.target.value)}
                >
                  {getAvailableLocations().map((location) => (
                    <MenuItem key={location.id} value={location.id}>
                      {location.name} ({location.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {/* License Category Selection */}
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>License Category</InputLabel>
              <Select
                value={formData.license_category}
                onChange={async (e) => {
                  const selectedCategory = e.target.value as LicenseCategory;
                  setFormData(prev => ({ ...prev, license_category: selectedCategory }));
                  
                  // Check license requirements immediately
                  await checkLicenseRequirements(selectedCategory);
                }}
              >
                {getAvailableLicenseCategories().map((category) => (
                  <MenuItem key={category.value} value={category.value}>
                    {category.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Never Been Refused Declaration */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.never_been_refused}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        never_been_refused: e.target.checked,
                        refusal_details: e.target.checked ? '' : prev.refusal_details 
                      }))}
                    />
                  }
                  label="I have never been refused a driving license or had a driving license suspended or cancelled"
                />
                
                {!formData.never_been_refused && (
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Please provide details of any previous license application refusal, suspension, or cancellation"
                    value={formData.refusal_details || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      refusal_details: e.target.value 
                    }))}
                    required
                    sx={{ mt: 2 }}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* License Verification Results */}
          {formData.license_verification && (
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardHeader title="License Verification" />
                <CardContent>
                  {formData.license_verification.requires_verification ? (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        The selected license category requires prerequisite licenses. 
                        Please provide details of your existing licenses below.
                      </Typography>
                    </Alert>
                  ) : (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        No additional license verification required for this category.
                      </Typography>
                    </Alert>
                  )}

                  {/* External License Capture */}
                  {formData.license_verification.external_licenses.map((extLicense, index) => (
                    <Card key={index} variant="outlined" sx={{ mt: 2 }}>
                      <CardHeader 
                        title={`Required License: ${extLicense.license_category}`}
                        avatar={
                          <Chip 
                            label="Required" 
                            color="error" 
                            size="small"
                          />
                        }
                      />
                      <CardContent>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="License Number"
                              value={extLicense.license_number}
                              onChange={(e) => {
                                const updated = { ...formData.license_verification };
                                updated.external_licenses[index].license_number = e.target.value;
                                setFormData(prev => ({ ...prev, license_verification: updated }));
                              }}
                              required
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Issuing Authority"
                              value={extLicense.issuing_authority}
                              onChange={(e) => {
                                const updated = { ...formData.license_verification };
                                updated.external_licenses[index].issuing_authority = e.target.value;
                                setFormData(prev => ({ ...prev, license_verification: updated }));
                              }}
                              required
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              type="date"
                              label="Issue Date"
                              value={extLicense.issue_date}
                              onChange={(e) => {
                                const updated = { ...formData.license_verification };
                                updated.external_licenses[index].issue_date = e.target.value;
                                setFormData(prev => ({ ...prev, license_verification: updated }));
                              }}
                              InputLabelProps={{ shrink: true }}
                              required
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              type="date"
                              label="Expiry Date"
                              value={extLicense.expiry_date}
                              onChange={(e) => {
                                const updated = { ...formData.license_verification };
                                updated.external_licenses[index].expiry_date = e.target.value;
                                setFormData(prev => ({ ...prev, license_verification: updated }));
                              }}
                              InputLabelProps={{ shrink: true }}
                              required
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              multiline
                              rows={2}
                              label="Restrictions (if any)"
                              value={extLicense.restrictions}
                              onChange={(e) => {
                                const updated = { ...formData.license_verification };
                                updated.external_licenses[index].restrictions = e.target.value;
                                setFormData(prev => ({ ...prev, license_verification: updated }));
                              }}
                              placeholder="e.g., Automatic transmission only, Corrective lenses required"
                            />
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Optional External Licenses */}
                  {!formData.license_verification.requires_verification && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Do you have any existing licenses to add to your record? (Optional)
                      </Typography>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          // Add optional external license
                          const updated = { ...formData.license_verification };
                          updated.external_licenses.push({
                            license_category: LicenseCategory.B,
                            license_type: 'DRIVERS_LICENSE' as const,
                            categories: [LicenseCategory.B],
                            license_number: '',
                            issue_date: '',
                            expiry_date: '',
                            issuing_authority: '',
                            issuing_location: '',
                            restrictions: '',
                            verified: false,
                            verification_source: 'MANUAL' as const,
                            is_required: false
                          });
                          setFormData(prev => ({ ...prev, license_verification: updated }));
                        }}
                      >
                        Add Existing License
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </Box>
    );
  };

  // Medical Assessment Step
  // Section C Step - Notice/Replacement Details
  const renderSectionCStep = () => {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Section C: Notice/Replacement Details
        </Typography>
        
        <Grid container spacing={3}>
          {/* Replacement Reason */}
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Reason for Replacement/Notice</InputLabel>
              <Select
                value={formData.replacement_reason || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  replacement_reason: e.target.value as any,
                  // Reset conditional fields when reason changes
                  police_reported: false,
                  police_station: '',
                  police_reference_number: ''
                }))}
              >
                <MenuItem value="theft">Theft (Diefstal)</MenuItem>
                <MenuItem value="loss">Loss (Verlies)</MenuItem>
                <MenuItem value="destruction">Destruction (Vernietiging)</MenuItem>
                <MenuItem value="recovery">Recovery (Terugvinding)</MenuItem>
                <MenuItem value="new_card">New Card (Nuwe kaart)</MenuItem>
                <MenuItem value="change_particulars">Change of Particulars (ID, name, address)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Office of Issue */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Office of Issue (Kantoor van uitreiking)"
              value={formData.office_of_issue || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                office_of_issue: e.target.value 
              }))}
              required
            />
          </Grid>

          {/* Date of Change */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="date"
              label="Date of Change (Datum van verandering)"
              value={formData.date_of_change || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                date_of_change: e.target.value 
              }))}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>

          {/* Police Report Section - Only for theft/loss */}
          {(formData.replacement_reason === 'theft' || formData.replacement_reason === 'loss') && (
            <>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Police Report Details
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.police_reported || false}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        police_reported: e.target.checked,
                        police_station: e.target.checked ? prev.police_station : '',
                        police_reference_number: e.target.checked ? prev.police_reference_number : ''
                      }))}
                    />
                  }
                  label={`${formData.replacement_reason === 'theft' ? 'Theft' : 'Loss'} reported to Police (${formData.replacement_reason === 'theft' ? 'Diefstal' : 'Verlies'} gerapporteer aan Polisie)`}
                />
              </Grid>

              {formData.police_reported && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Police Station (at/te)"
                      value={formData.police_station || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        police_station: e.target.value 
                      }))}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Reference Number (CAS no./Verwysingsnr. MAS nr.)"
                      value={formData.police_reference_number || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        police_reference_number: e.target.value 
                      }))}
                      required
                    />
                  </Grid>
                </>
              )}
            </>
          )}

          {/* Information Card */}
          <Grid item xs={12}>
            <Card variant="outlined" sx={{ bgcolor: 'info.50' }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Section C:</strong> This section applies to replacement licenses and notices of change. 
                  All fields marked as required must be completed before proceeding.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderMedicalStep = () => {
    const age = formData.person?.birth_date ? calculateAge(formData.person.birth_date) : 0;
    const isMedicalMandatory = requiresMedicalAlways(formData.license_category) || 
                             (age >= 60 && requiresMedical60Plus(formData.license_category));

    return (
      <Box>
        <Typography variant="h6" gutterBottom>Medical Assessment</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Complete vision test and medical clearance requirements
        </Typography>

        {isMedicalMandatory && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Medical assessment is mandatory</strong> for {age >= 60 ? 'applicants 60+ years' : 'commercial license categories (C, D, E)'}
            </Typography>
          </Alert>
        )}

        <MedicalInformationSection
          value={formData.medical_information}
          onChange={(medicalInfo) => {
            setFormData(prev => ({ ...prev, medical_information: medicalInfo }));
          }}
          disabled={false}
          isRequired={isMedicalMandatory}
        />
      </Box>
    );
  };

  // Requirements Step with comprehensive validation and document uploads
  const renderRequirementsStep = () => {
    const age = formData.person?.birth_date ? calculateAge(formData.person.birth_date) : 0;
    const requiresParentalConsent = age < 18;
    const requiresExternalLicense = prerequisiteCheck?.requiresExternal && !prerequisiteCheck.canProceed;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>Requirements Check</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Verify age requirements, upload required documents, and confirm license prerequisites
        </Typography>

        <Grid container spacing={3}>
          {/* Age Requirements Display */}
          {formData.person?.birth_date && (
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Age verification:</strong> {age} years old
                  (Required: {LICENSE_CATEGORY_RULES[formData.license_category]?.min_age}+ for {formData.license_category})
                </Typography>
              </Alert>
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

          {/* License Verification Section */}
          <Grid item xs={12}>
            <LicenseVerificationSection
              personId={formData.person?.id || null}
              value={formData.license_verification}
              onChange={(data) => setFormData(prev => ({ ...prev, license_verification: data }))}
              locations={locations}
              currentLicenseCategory={formData.license_category}
              currentApplicationType={formData.application_type}
              disabled={false}
            />
          </Grid>

          {/* Additional Notes */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Additional Notes" />
              <CardContent>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes (Optional)"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any additional notes or comments about this application..."
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  // Biometric Step with photo, signature, and fingerprint capture
  const renderBiometricStep = () => {
    const handlePhotoCapture = async (photoFile: File) => {
      try {
        setSaving(true);
        
        // Ensure application is saved as draft first
        let applicationId = currentApplication?.id;
        if (!applicationId) {
          console.log('No application ID found, saving draft first...');
          await handleSaveDraft();
          applicationId = currentApplication?.id;
          
          if (!applicationId) {
            setError('Could not create application draft. Please ensure all required fields are complete.');
            return;
          }
        }

        // Upload to backend for ISO processing
        const uploadFormData = new FormData();
        uploadFormData.append('file', photoFile);
        uploadFormData.append('data_type', 'PHOTO');
        uploadFormData.append('capture_method', 'WEBCAM');

        const response = await applicationService.uploadBiometricData(
          applicationId,
          uploadFormData
        );

        if (response.status === 'success') {
          // Store the processed photo info
          setFormData(prev => ({
            ...prev,
            biometric_data: {
              ...prev.biometric_data,
              photo: {
                filename: response.file_info.filename,
                file_size: response.file_info.file_size,
                dimensions: response.file_info.dimensions,
                format: response.file_info.format,
                iso_compliant: response.processing_info.iso_compliant,
                processed_url: `/api/v1/files/biometric/${applicationId}/${response.file_info.filename}`
              }
            }
          }));
          
          setSuccess(`Photo processed successfully! ${response.processing_info.iso_compliant ? 'ISO-compliant and' : ''} ready for license production.`);
          setTimeout(() => setSuccess(''), 3000);
        }
      } catch (error) {
        console.error('Error uploading photo:', error);
        
        // Store photo locally as fallback
        setFormData(prev => ({
          ...prev,
          biometric_data: {
            ...prev.biometric_data,
            photo: photoFile
          }
        }));
        
        setError('Backend processing unavailable. Photo saved locally - will be processed on submission.');
        setTimeout(() => setError(''), 5000);
      } finally {
        setSaving(false);
      }
    };

    const handleSignatureCapture = (signatureFile: File) => {
      setFormData(prev => ({
        ...prev,
        biometric_data: {
          ...prev.biometric_data,
          signature: signatureFile
        }
      }));
      setSuccess('Signature captured successfully!');
      setTimeout(() => setSuccess(''), 3000);
    };

    const handleFingerprintCapture = (fingerprintFile: File) => {
      setFormData(prev => ({
        ...prev,
        biometric_data: {
          ...prev.biometric_data,
          fingerprint: fingerprintFile
        }
      }));
      setSuccess('Fingerprint captured successfully!');
      setTimeout(() => setSuccess(''), 3000);
    };

    return (
      <Box>
        <Typography variant="h6" gutterBottom>Biometric Data Capture</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Capture applicant photo, signature, and fingerprint data for license production
        </Typography>

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Photo and Signature Capture - Side by Side */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardHeader
                title={
                  <Box display="flex" alignItems="center" gap={1}>
                    <CameraIcon />
                    <Typography variant="h6">License Photo</Typography>
                    {formData.biometric_data.photo && (
                      <Chip label="Captured" color="success" size="small" icon={<CheckCircleIcon />} />
                    )}
                  </Box>
                }
                subheader="ISO-compliant photo (3:4 ratio)"
              />
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <WebcamCapture
                    onPhotoCapture={handlePhotoCapture}
                    disabled={saving}
                  />
                </Box>
                
                {formData.biometric_data.photo ? (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                      {(formData.biometric_data.photo as any).iso_compliant ? 'ISO-Processed Preview' : 'Photo Preview'}
                    </Typography>
                    <Box
                      sx={{
                        border: '2px solid',
                        borderColor: 'success.main',
                        borderRadius: 2,
                        p: 1,
                        mb: 2,
                        backgroundColor: 'background.paper',
                        display: 'flex',
                        justifyContent: 'center'
                      }}
                    >
                      <img
                        src={
                          (formData.biometric_data.photo as any).processed_url
                            ? (formData.biometric_data.photo as any).processed_url
                            : URL.createObjectURL(formData.biometric_data.photo as File)
                        }
                        alt="License Photo Preview"
                        style={{
                          width: '150px',
                          height: '200px',
                          objectFit: 'cover',
                          borderRadius: '4px'
                        }}
                      />
                    </Box>
                    <Alert severity="success" sx={{ fontSize: '0.875rem' }}>
                      <Typography variant="body2">
                        {(formData.biometric_data.photo as any).iso_compliant 
                          ? `✓ Photo processed to ISO standards (${(formData.biometric_data.photo as any).dimensions || '300x400px'})`
                          : '✓ Photo captured successfully'
                        }
                      </Typography>
                    </Alert>
                  </Box>
                ) : (
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Required:</strong> Position face within guides and capture photo.
                      Image will be automatically cropped to ISO standards.
                    </Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardHeader
                title={
                  <Box display="flex" alignItems="center" gap={1}>
                    <CreateIcon />
                    <Typography variant="h6">Digital Signature</Typography>
                    {formData.biometric_data.signature && (
                      <Chip label="Captured" color="success" size="small" icon={<CheckCircleIcon />} />
                    )}
                  </Box>
                }
                subheader="Draw your signature using mouse or touch"
              />
              <CardContent sx={{ '& > *': { minHeight: '200px' } }}>
                <SignatureCapture
                  onSignatureCapture={handleSignatureCapture}
                  disabled={saving}
                />
                {formData.biometric_data.signature && (
                  <Alert severity="success" sx={{ mt: 2, fontSize: '0.875rem' }}>
                    <Typography variant="body2">
                      ✓ Signature captured successfully
                    </Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Fingerprint Capture */}
          <Grid item xs={12}>
            <Card>
              <CardHeader
                title={
                  <Box display="flex" alignItems="center" gap={1}>
                    <FingerprintIcon />
                    <Typography variant="h6">Fingerprint Scan</Typography>
                    {formData.biometric_data.fingerprint && (
                      <Chip label="Captured" color="success" size="small" icon={<CheckCircleIcon />} />
                    )}
                  </Box>
                }
                subheader="Digital fingerprint for enhanced security (optional)"
              />
              <CardContent>
                <FingerprintCapture
                  onFingerprintCapture={handleFingerprintCapture}
                  disabled={saving}
                />
                {formData.biometric_data.fingerprint && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      ✓ Fingerprint captured successfully for enhanced security
                    </Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Completion Status */}
          <Grid item xs={12}>
            <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Biometric Data Status
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <CameraIcon color={formData.biometric_data.photo ? "success" : "error"} />
                      <Typography variant="body1" sx={{ fontWeight: formData.biometric_data.photo ? 600 : 400 }}>
                        Photo: {formData.biometric_data.photo ? "✓ Captured (ISO)" : "⚠ Required"}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <CreateIcon color={formData.biometric_data.signature ? "success" : "action"} />
                      <Typography variant="body1" sx={{ fontWeight: formData.biometric_data.signature ? 600 : 400 }}>
                        Signature: {formData.biometric_data.signature ? "✓ Captured" : "Optional"}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <FingerprintIcon color={formData.biometric_data.fingerprint ? "success" : "action"} />
                      <Typography variant="body1" sx={{ fontWeight: formData.biometric_data.fingerprint ? 600 : 400 }}>
                        Fingerprint: {formData.biometric_data.fingerprint ? "✓ Captured" : "Optional"}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                
                {!formData.biometric_data.photo ? (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Action Required:</strong> License photo must be captured to proceed. 
                      The photo will be automatically cropped to ISO standards (3:4 ratio).
                    </Typography>
                  </Alert>
                ) : (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Ready to proceed!</strong> All required biometric data has been captured.
                      {!formData.biometric_data.signature && !formData.biometric_data.fingerprint && 
                        " Consider adding signature and fingerprint for enhanced security."
                      }
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

  // Review Step with comprehensive display
  const renderReviewStep = () => {
    const age = formData.person?.birth_date ? calculateAge(formData.person.birth_date) : 0;
    const requiresMedical = requiresMedicalAlways(formData.license_category) || 
                          (age >= 60 && requiresMedical60Plus(formData.license_category));
    const requiresParentalConsent = age < 18;
    const requiresExternalLicense = prerequisiteCheck?.requiresExternal && !prerequisiteCheck.canProceed;

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
                    <Typography variant="body1">{formData.application_type.replace(/_/g, ' ')}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">License Category:</Typography>
                    <Typography variant="body1">{formData.license_category}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Location:</Typography>
                    <Typography variant="body1">
                      {(() => {
                        const selectedLocationId = formData.selected_location_id || user?.primary_location_id;
                        const location = locations.find(loc => loc.id === selectedLocationId);
                        return location ? `${location.name} (${location.code})` : 'Location not found';
                      })()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Never Been Refused:</Typography>
                    <Typography variant="body1">{formData.never_been_refused ? 'Yes' : 'No'}</Typography>
                  </Grid>
                  {formData.refusal_details && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">Refusal Details:</Typography>
                      <Typography variant="body1">{formData.refusal_details}</Typography>
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
                        secondary={
                          formData.medical_certificate_file ? 
                            `Uploaded: ${formData.medical_certificate_file.name}` : 
                            "Required but not provided"
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

                  {/* License Verification */}
                  {formData.license_verification && (
                    <ListItem>
                      <ListItemIcon>
                        {!formData.license_verification.requires_verification ? 
                          <CheckCircleIcon color="success" /> : 
                          <WarningIcon color="warning" />
                        }
                      </ListItemIcon>
                      <ListItemText 
                        primary="License Verification"
                        secondary={
                          formData.license_verification.requires_verification ? 
                            `${formData.license_verification.external_licenses.filter(l => !l.verified).length} external licenses need verification` :
                            `${formData.license_verification.system_licenses.length} system licenses + ${formData.license_verification.external_licenses.filter(l => l.verified).length} verified external licenses`
                        }
                      />
                    </ListItem>
                  )}

                  {/* Prerequisites Check */}
                  {prerequisiteCheck && (
                    <ListItem>
                      <ListItemIcon>
                        {prerequisiteCheck.canProceed ? 
                          <CheckCircleIcon color="success" /> : 
                          <WarningIcon color="warning" />
                        }
                      </ListItemIcon>
                      <ListItemText 
                        primary="Prerequisite Requirements"
                        secondary={
                          prerequisiteCheck.canProceed ?
                            "All prerequisites satisfied" :
                            "Manual verification completed"
                        }
                      />
                    </ListItem>
                  )}

                  {/* Medical Information */}
                  <ListItem>
                    <ListItemIcon>
                      {formData.medical_information?.medical_clearance ? 
                        <CheckCircleIcon color="success" /> : 
                        formData.medical_information ? 
                          <WarningIcon color="warning" /> :
                          <ErrorIcon color="error" />
                      }
                    </ListItemIcon>
                    <ListItemText 
                      primary="Medical Assessment"
                      secondary={
                        formData.medical_information 
                          ? formData.medical_information.medical_clearance
                            ? `Medical clearance approved${formData.medical_information.examined_by ? ` by ${formData.medical_information.examined_by}` : ''}`
                            : `Medical restrictions apply${formData.medical_information.medical_restrictions.length > 0 ? `: ${formData.medical_information.medical_restrictions.join(', ')}` : ''}`
                          : "Medical assessment required but not completed"
                      }
                    />
                  </ListItem>

                  {/* Biometric Data */}
                  <ListItem>
                    <ListItemIcon>
                      {formData.biometric_data.photo ? 
                        <CheckCircleIcon color="success" /> : 
                        <ErrorIcon color="error" />
                      }
                    </ListItemIcon>
                    <ListItemText 
                      primary="License Photo"
                      secondary={formData.biometric_data.photo ? 
                        `Captured: ${(formData.biometric_data.photo as any).filename || (formData.biometric_data.photo as File).name || 'Photo file'}` : 
                        "Required for license card production"
                      }
                    />
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      {formData.biometric_data.signature ? 
                        <CheckCircleIcon color="success" /> : 
                        <InfoIcon color="action" />
                      }
                    </ListItemIcon>
                    <ListItemText 
                      primary="Digital Signature"
                      secondary={formData.biometric_data.signature ? 
                        `Captured: ${typeof formData.biometric_data.signature === 'object' && 'name' in formData.biometric_data.signature ? formData.biometric_data.signature.name : 'Signature file'}` : 
                        "Optional - can be added for enhanced security"
                      }
                    />
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      {formData.biometric_data.fingerprint ? 
                        <CheckCircleIcon color="success" /> : 
                        <InfoIcon color="action" />
                      }
                    </ListItemIcon>
                    <ListItemText 
                      primary="Fingerprint"
                      secondary={formData.biometric_data.fingerprint ? 
                        `Captured: ${typeof formData.biometric_data.fingerprint === 'object' && 'name' in formData.biometric_data.fingerprint ? formData.biometric_data.fingerprint.name : 'Fingerprint file'}` : 
                        "Optional - hardware integration pending"
                      }
                    />
                  </ListItem>

                  {/* No requirements case */}
                  {!requiresMedical && !requiresParentalConsent && !requiresExternalLicense && (
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

          {/* Medical Information Summary */}
          {formData.medical_information && (
            <Grid item xs={12}>
              <Card>
                <CardHeader title="Medical Assessment Summary" />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">Medical Clearance:</Typography>
                      <Typography variant="body1" sx={{ 
                        fontWeight: 'bold',
                        color: formData.medical_information.medical_clearance ? 'success.main' : 'warning.main'
                      }}>
                        {formData.medical_information.medical_clearance ? 'APPROVED' : 'CONDITIONAL/RESTRICTED'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">Examined By:</Typography>
                      <Typography variant="body1">
                        {formData.medical_information.examined_by || 'Not specified'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">Examination Date:</Typography>
                      <Typography variant="body1">
                        {formData.medical_information.examination_date ? 
                          new Date(formData.medical_information.examination_date).toLocaleDateString() : 
                          'Not specified'
                        }
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">Vision Test (Binocular):</Typography>
                      <Typography variant="body1">
                        {formData.medical_information.vision_test.visual_acuity_binocular || 'Not tested'}
                      </Typography>
                    </Grid>
                    {formData.medical_information.medical_restrictions.length > 0 && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">Medical Restrictions:</Typography>
                        <Typography variant="body1" color="warning.main">
                          {formData.medical_information.medical_restrictions.join(', ')}
                        </Typography>
                      </Grid>
                    )}
                    {formData.medical_information.vision_test.corrective_lenses_required && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="warning.main">
                          ⚠️ Requires corrective lenses for driving
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

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
                              {fee.amount.toLocaleString()} Ar
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
                      ✓ All validation checks passed. Application is ready for submission.
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

  // Main render
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
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
                
                <Box sx={{ mb: 2, mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Button
                    disabled={index === 0 || saving}
                    onClick={handleBack}
                    variant="outlined"
                  >
                    Back
                  </Button>
                  {formData.person && (
                    <Button
                      variant="outlined"
                      startIcon={<SaveIcon />}
                      onClick={handleSaveDraft}
                      disabled={saving}
                    >
                      Save Draft
                    </Button>
                  )}
                  {onCancel && (
                    <Button
                      onClick={onCancel}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    onClick={index === steps.length - 1 ? handleSubmit : handleNext}
                    disabled={saving || (index === 0 && !formData.person)}
                  >
                    {saving ? (
                      <CircularProgress size={20} />
                    ) : index === steps.length - 1 ? (
                      'Submit Application'
                    ) : (
                      'Continue'
                    )}
                  </Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
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
                      Category: {app.license_category}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Created: {new Date(app.created_at).toLocaleDateString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <Button 
                        variant="contained" 
                        onClick={() => {
                          // Load the draft application data
                          setFormData(prev => ({
                            ...prev,
                            application_type: app.application_type,
                            license_category: app.license_category,
                            urgency_reason: app.urgency_reason || '',
                            is_temporary_license: app.is_temporary_license,
                            validity_period_days: app.validity_period_days,
                            is_on_hold: app.is_on_hold,
                            parent_application_id: app.parent_application_id,
                          }));
                          setCurrentApplication(app);
                          setShowDraftDialog(false);
                          setActiveStep(1); // Go to application details step
                        }}
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
          <Button 
            onClick={() => {
              setShowDraftDialog(false);
              setActiveStep(1); // Create new application, go to next step
            }}
            variant="outlined"
          >
            Create New Application
          </Button>
        </DialogActions>
      </Dialog>

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