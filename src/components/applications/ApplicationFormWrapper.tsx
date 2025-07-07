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
  SUPERSEDING_MATRIX,
  LicenseCategoryRule,
  TransmissionType,
  LicenseRestriction,
  ExternalLicenseDetails,
  LicenseValidationResult,
  ExistingLicenseCheck,
  LicenseVerificationData,
  LEARNERS_PERMIT_VALIDITY_MONTHS,
  DEFAULT_TEMPORARY_LICENSE_DAYS,

  getAuthorizedCategories,
  getSupersededCategories,
  isCommercialLicense,
  requiresMedical60Plus,
  requiresMedicalAlways,
  getCategoryFamily,
  LEARNERS_PERMIT_RULES,
  LEARNERS_PERMIT_MAPPING,
  LICENSE_TO_LEARNERS_MAPPING,
  ExternalLicense,
  SystemLicense,
  ActiveLicense,
  LicenseStatus,
  MedicalInformation,
  VisionTestData,
  MedicalConditions,
  ProcessedBiometricFile,
  ProfessionalPermitCategory
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
  const [stepValidation, setStepValidation] = useState<boolean[]>([false, false, false, false, false]);
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
    // Professional permit fields
    professional_permit_categories: [],
    professional_permit_previous_refusal: false,
    professional_permit_refusal_details: '',
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
      ApplicationType.RENEWAL, // Section C required for renewal (replacement functionality)
      ApplicationType.LEARNERS_PERMIT_DUPLICATE, // Section C required for learner's permit duplicates
      ApplicationType.PROFESSIONAL_LICENSE // Section C required for professional permits (notice of change)
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
    // Conditionally include Section C for renewal applications (includes replacement functionality)
    ...(requiresSectionC() ? [{
      label: 'Notice/Renewal Details',
      description: 'Complete Section C for renewal or notice of change',
      icon: <WarningIcon />,
      component: 'sectionC'
    }] : []),
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
    if (!categoryRules?.prerequisites?.length) {
      setPrerequisiteCheck(null);
      return;
    }

    try {
      setCheckingPrerequisites(true);
      
      // Check for existing applications for required categories
      const requiredCategories = categoryRules.prerequisites;
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
    const currentStep = steps[step];

    switch (currentStep?.component) {
      case 'person': // Person
        if (!formData.person) {
          errors.push('Please select or create an applicant');
        }
        break;

      case 'application': // Application Details - Section B
                      // License category required for all except TEMPORARY_LICENSE and RENEWAL
        if (!formData.license_category && ![ApplicationType.TEMPORARY_LICENSE, ApplicationType.RENEWAL].includes(formData.application_type)) {
          errors.push('Please select a license category');
        }
        if (!formData.application_type) {
          errors.push('Please select an application type');
        }
        // Validate never been refused declaration
        if (formData.never_been_refused === false && !formData.refusal_details?.trim()) {
          errors.push('Please provide details of previous license application refusal');
        }
        // Validate age requirements here since Requirements step is removed
        // Skip age validation for TEMPORARY_LICENSE, RENEWAL, and LEARNERS_PERMIT_DUPLICATE applications
        if (formData.person?.birth_date && formData.license_category && 
            ![ApplicationType.TEMPORARY_LICENSE, ApplicationType.RENEWAL, ApplicationType.LEARNERS_PERMIT_DUPLICATE].includes(formData.application_type)) {
          const age = Math.floor((Date.now() - new Date(formData.person.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
          const minAge = LICENSE_CATEGORY_RULES[formData.license_category]?.minimum_age || 18;
          if (age < minAge) {
            errors.push(`Applicant must be at least ${minAge} years old for category ${formData.license_category}`);
          }
          // Validate parental consent for under 18
          if (age < 18 && !formData.parental_consent_file) {
            errors.push('Parental consent file is required for applicants under 18');
        }
        }
        // License verification validation
        if (formData.license_verification?.requires_verification) {
          const unverifiedLicenses = formData.license_verification.external_licenses.filter(license => 
            license.is_required && !license.verified
          );
          if (unverifiedLicenses.length > 0) {
            errors.push('All required external licenses must be verified before proceeding');
          }
        }
        
        // Professional permit specific validations
        if (formData.application_type === ApplicationType.PROFESSIONAL_LICENSE) {
          if (formData.professional_permit_categories.length === 0) {
            errors.push('At least one professional permit category is required');
          }
          if (formData.professional_permit_previous_refusal && !formData.professional_permit_refusal_details?.trim()) {
            errors.push('Professional permit refusal details are required when you have been refused before');
          }
          
          // Age validation for professional permit categories
          if (formData.person?.birth_date) {
            const age = calculateAge(formData.person.birth_date);
            formData.professional_permit_categories.forEach(category => {
              switch (category) {
                case ProfessionalPermitCategory.P:
                  if (age < 21) {
                    errors.push('Minimum age for Category P (Passengers) is 21 years');
                  }
                  break;
                case ProfessionalPermitCategory.D:
                  if (age < 25) {
                    errors.push('Minimum age for Category D (Dangerous goods) is 25 years');
                  }
                  break;
                case ProfessionalPermitCategory.G:
                  if (age < 18) {
                    errors.push('Minimum age for Category G (Goods) is 18 years');
                  }
                  break;
              }
            });
          }
        }
        break;

      case 'sectionC': // Section C - Notice/Renewal/Duplicate Details
        if (!formData.replacement_reason) {
          const reasonType = formData.application_type === ApplicationType.LEARNERS_PERMIT_DUPLICATE 
            ? 'duplicate request' 
            : 'renewal/notice';
          errors.push(`Please select a reason for ${reasonType}`);
        }
        if (!formData.office_of_issue?.trim()) {
          errors.push('Office of issue is required');
        }
        if (!formData.date_of_change) {
          errors.push('Date of change is required');
        }
        // Police report validation for theft/loss
        if ((formData.replacement_reason === 'theft' || formData.replacement_reason === 'loss') && formData.police_reported) {
          if (!formData.police_station?.trim()) {
            errors.push('Police station is required when theft/loss is reported');
          }
          if (!formData.police_reference_number?.trim()) {
            errors.push('Police reference number is required when theft/loss is reported');
          }
        }
        break;

      case 'medical': // Medical Assessment
        const age = formData.person?.birth_date ? calculateAge(formData.person.birth_date) : 0;
        
        // For TEMPORARY_LICENSE and RENEWAL, determine medical requirements from external licenses
        let isMedicalMandatory = false;
        
        if ([ApplicationType.TEMPORARY_LICENSE, ApplicationType.RENEWAL].includes(formData.application_type)) {
          // Check if any external licenses require medical assessment
          const externalCategories = formData.license_verification?.external_licenses?.flatMap(license => license.categories) || [];
          isMedicalMandatory = externalCategories.some(category => 
            requiresMedicalAlways(category) || (age >= 60 && requiresMedical60Plus(category))
          );
        } else if (formData.license_category) {
          // Standard logic for other application types
          isMedicalMandatory = requiresMedicalAlways(formData.license_category) || 
                             (age >= 60 && requiresMedical60Plus(formData.license_category)) ||
                             formData.application_type === ApplicationType.PROFESSIONAL_LICENSE;
        }

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

      case 'biometric': // Biometric
        // Photo is required for license production
        if (!formData.biometric_data.photo) {
          errors.push('License photo is required for card production');
        }
        break;

      case 'review': // Review
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
        license_category: formData.license_category || LicenseCategory.B, // Default for TEMPORARY_LICENSE/RENEWAL
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
      
      // Prepare medical information with all required fields
      let medicalInformation = null;
      if (formData.medical_information) {
        medicalInformation = {
          ...formData.medical_information,
          // Add required medical_conditions with default values
          medical_conditions: formData.medical_information.medical_conditions || {
            epilepsy: false,
            epilepsy_controlled: false,
            epilepsy_medication: null,
            seizures_last_occurrence: null,
            mental_illness: false,
            mental_illness_type: null,
            mental_illness_controlled: false,
            mental_illness_medication: null,
            heart_condition: false,
            heart_condition_type: null,
            blood_pressure_controlled: true,
            diabetes: false,
            diabetes_type: null,
            diabetes_controlled: false,
            diabetes_medication: null,
            alcohol_dependency: false,
            drug_dependency: false,
            substance_treatment_program: false,
            fainting_episodes: false,
            dizziness_episodes: false,
            muscle_coordination_issues: false,
            medications_affecting_driving: false,
            current_medications: [],
            medically_fit_to_drive: true,
            conditions_requiring_monitoring: []
          },
          // Add required physical_assessment with default values
          physical_assessment: formData.medical_information.physical_assessment || {
            hearing_adequate: true,
            hearing_aid_required: false,
            limb_disabilities: false,
            limb_disability_details: null,
            adaptive_equipment_required: false,
            adaptive_equipment_type: [],
            mobility_impairment: false,
            mobility_aid_required: false,
            mobility_aid_type: null,
            reaction_time_adequate: true,
            physically_fit_to_drive: true,
            physical_restrictions: []
          },
          // Format examination_date properly (convert empty string to null)
          examination_date: formData.medical_information.examination_date || null
        };
      }
      
      const applicationData: ApplicationCreate = {
        person_id: formData.person!.id,
        location_id: formData.selected_location_id || user?.primary_location_id || '',
        application_type: formData.application_type,
        license_category: formData.license_category || LicenseCategory.B, // Default for TEMPORARY_LICENSE/RENEWAL
        medical_information: medicalInformation
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

  // Auto-trigger license verification for TEMPORARY_LICENSE and RENEWAL applications
  useEffect(() => {
    if (formData.person && [ApplicationType.TEMPORARY_LICENSE, ApplicationType.RENEWAL].includes(formData.application_type)) {
      // Auto-check for existing licenses for temporary/renewal applications
      checkExistingLicensesForReplacementOrTemporary();
    }
  }, [formData.application_type, formData.person]);

  const checkExistingLicensesForReplacementOrTemporary = async () => {
    if (!formData.person) return;

    try {
      // This will trigger the license verification section to load system licenses
      // and show external license form if no system licenses found
      setFormData(prev => ({
        ...prev,
        license_verification: {
          person_id: formData.person!.id,
          requires_verification: true, // Force showing external license form
          system_licenses: [],
          external_licenses: [],
          all_license_categories: []
        }
      }));
    } catch (error) {
      console.error('Error checking existing licenses:', error);
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
      // For learner's permit applications, show only learner's permit codes
      if ([ApplicationType.LEARNERS_PERMIT, ApplicationType.LEARNERS_PERMIT_DUPLICATE].includes(formData.application_type)) {
        return [
          {
            value: LicenseCategory.LEARNERS_1,
            label: `Code 1 - ${LEARNERS_PERMIT_RULES['1']?.description || 'Learner\'s permit for motorcycles'}`,
            minAge: LEARNERS_PERMIT_RULES['1']?.minimum_age || 16,
            prerequisites: [],
            allowsLearners: true
          },
          {
            value: LicenseCategory.LEARNERS_2,
            label: `Code 2 - ${LEARNERS_PERMIT_RULES['2']?.description || 'Learner\'s permit for light vehicles'}`,
            minAge: LEARNERS_PERMIT_RULES['2']?.minimum_age || 17,
            prerequisites: [],
            allowsLearners: true
          },
          {
            value: LicenseCategory.LEARNERS_3,
            label: `Code 3 - ${LEARNERS_PERMIT_RULES['3']?.description || 'Learner\'s permit for any motor vehicle'}`,
            minAge: LEARNERS_PERMIT_RULES['3']?.minimum_age || 18,
            prerequisites: [],
            allowsLearners: true
          }
        ];
      }
      
      // For other application types (NEW_LICENSE, RENEWAL, etc.), show regular license categories
      return Object.values(LicenseCategory)
        .filter(category => !['1', '2', '3'].includes(category)) // Exclude learner's permit codes
        .map(category => {
          const categoryRule = LICENSE_CATEGORY_RULES[category];
          return {
            value: category,
            label: `${category} - ${categoryRule?.description || 'License category'}`,
            minAge: categoryRule?.minimum_age || 18,
            prerequisites: categoryRule?.prerequisites || [],
            allowsLearners: categoryRule?.allows_learners_permit || false
          };
        }).sort((a, b) => {
          // Sort by category order (A1, A2, A, B1, B, B2, BE, C1, C, C1E, CE, D1, D, D2)
          const order = ['A1', 'A2', 'A', 'B1', 'B', 'B2', 'BE', 'C1', 'C', 'C1E', 'CE', 'D1', 'D', 'D2'];
          return order.indexOf(a.value) - order.indexOf(b.value);
        });
    };

    // Check if selected category requires prerequisite licenses
    const getRequiredLicenses = (category: LicenseCategory): LicenseCategory[] => {
      // Use the comprehensive license category rules
      const categoryRule = LICENSE_CATEGORY_RULES[category];
      return categoryRule?.prerequisites || [];
    };

    // Check license verification status
    const checkLicenseRequirements = async (selectedCategory: LicenseCategory) => {
      if (!formData.person) return;

      const categoryRule = LICENSE_CATEGORY_RULES[selectedCategory];
      if (!categoryRule) return;

      const requiredLicenses = categoryRule?.prerequisites || [];
      const requiresLearners = categoryRule?.requires_learners_permit || false;

      // Special handling for NEW_LICENSE applications that require learner's permits
      if ([ApplicationType.NEW_LICENSE, ApplicationType.CONVERSION, ApplicationType.PROFESSIONAL_LICENSE, ApplicationType.FOREIGN_CONVERSION].includes(formData.application_type) && requiresLearners) {
        // Get the corresponding learner's permit code for this category
        const learnerCodeString = LICENSE_TO_LEARNERS_MAPPING[selectedCategory];
        
        if (learnerCodeString) {
          // Map the string code to the correct LicenseCategory enum
          let learnerCategory: LicenseCategory;
          switch (learnerCodeString) {
            case '1':
              learnerCategory = LicenseCategory.LEARNERS_1;
              break;
            case '2':
              learnerCategory = LicenseCategory.LEARNERS_2;
              break;
            case '3':
              learnerCategory = LicenseCategory.LEARNERS_3;
              break;
            default:
              learnerCategory = LicenseCategory.LEARNERS_2; // Default fallback
          }

          // Create auto-populated external license for the required learner's permit
          const externalLicenses: ExternalLicense[] = [{
            id: `auto-learners-${selectedCategory}`,
            license_category: learnerCategory,
            license_type: 'LEARNERS_PERMIT' as const,
            categories: [learnerCategory],
            license_number: '',
            issue_date: '',
            expiry_date: '',
            issuing_authority: '',
            issuing_location: '',
            restrictions: '',
            verified: false,
            verification_source: 'MANUAL' as const,
            is_auto_populated: true,
            required_for_category: selectedCategory,
            is_required: true
          }];

          setFormData(prev => ({
            ...prev,
            license_verification: {
              person_id: formData.person!.id,
              requires_verification: true,
              system_licenses: [],
              external_licenses: externalLicenses,
              all_license_categories: [selectedCategory]
            }
          }));
          return;
        }
      }

      // Handle regular prerequisite requirements
      if (requiredLicenses.length === 0 && !requiresLearners) {
        // No prerequisites required
        setFormData(prev => ({
          ...prev,
          license_verification: {
            person_id: formData.person!.id,
            requires_verification: false,
            system_licenses: [],
            external_licenses: [],
            all_license_categories: [selectedCategory]
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

      // Create external license forms for missing prerequisites
      const externalLicenses = missingRequired.map(cat => {
        const catRule = LICENSE_CATEGORY_RULES[cat];
        return {
          license_category: cat,
          license_type: catRule?.requires_learners_permit ? 'LEARNERS_PERMIT' as const : 'DRIVERS_LICENSE' as const,
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
        };
      });

      setFormData(prev => ({
        ...prev,
        license_verification: {
          person_id: formData.person!.id,
          requires_verification: missingRequired.length > 0,
          system_licenses: systemLicenses,
          external_licenses: externalLicenses,
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
                          <MenuItem value={ApplicationType.LEARNERS_PERMIT}>Learner's Licence Application</MenuItem>
            <MenuItem value={ApplicationType.LEARNERS_PERMIT_DUPLICATE}>Duplicate of learner's licence</MenuItem>
            <MenuItem value={ApplicationType.NEW_LICENSE}>Driving Licence Application</MenuItem>
            <MenuItem value={ApplicationType.CONVERSION}>Driving Licence Conversion</MenuItem>
            <MenuItem value={ApplicationType.RENEWAL}>Renew Driving Licence Card</MenuItem>
            <MenuItem value={ApplicationType.PROFESSIONAL_LICENSE}>Professional Driving Licence Application</MenuItem>
            <MenuItem value={ApplicationType.TEMPORARY_LICENSE}>Temporary Driving Licence Application</MenuItem>
            <MenuItem value={ApplicationType.FOREIGN_CONVERSION}>Convert Foreign Driving Licence</MenuItem>
            <MenuItem value={ApplicationType.INTERNATIONAL_PERMIT}>International Driving Permit Application</MenuItem>
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

          {/* License Category Selection - Hidden for TEMPORARY_LICENSE and RENEWAL */}
          {![ApplicationType.TEMPORARY_LICENSE, ApplicationType.RENEWAL].includes(formData.application_type) && (
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
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {category.label}
                            </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Min age: {category.minAge} years
                            {category.prerequisites.length > 0 && ` • Requires: ${category.prerequisites.join(', ')}`}
                            {category.allowsLearners && ' • Allows learner\'s permit'}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {/* Info for TEMPORARY_LICENSE and RENEWAL applications */}
          {[ApplicationType.TEMPORARY_LICENSE, ApplicationType.RENEWAL].includes(formData.application_type) && (
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2" fontWeight="bold">
                  {formData.application_type === ApplicationType.TEMPORARY_LICENSE ? 'Temporary License' : 'Renewal License'} Application
                </Typography>
                <Typography variant="body2">
                  {formData.application_type === ApplicationType.TEMPORARY_LICENSE
                    ? 'System will check for existing licenses to issue temporary license. If none found, you will need to verify external licenses.'
                    : 'System will check for existing licenses to renew. If none found, you will need to verify external licenses.'
                  }
                </Typography>
              </Alert>
            </Grid>
          )}

          {/* Professional Driving Permit Categories - Only for PROFESSIONAL_LICENSE applications */}
          {formData.application_type === ApplicationType.PROFESSIONAL_LICENSE && (
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardHeader 
                  title="Professional Driving Permit Categories" 
                  subheader="Select the category(ies) for which a professional driving permit is required"
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Note: Category D (Dangerous goods) automatically includes Category G (Goods)
                  </Typography>
                  
                  <FormControl component="fieldset" fullWidth>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={formData.professional_permit_categories.includes(ProfessionalPermitCategory.P)}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                setFormData(prev => ({
                                  ...prev,
                                  professional_permit_categories: isChecked
                                    ? [...prev.professional_permit_categories, ProfessionalPermitCategory.P]
                                    : prev.professional_permit_categories.filter(cat => cat !== ProfessionalPermitCategory.P)
                                }));
                              }}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" fontWeight="bold">P - Passengers</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Minimum age: 21 years
                              </Typography>
                            </Box>
                          }
                        />
                      </Grid>
                      
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={formData.professional_permit_categories.includes(ProfessionalPermitCategory.D)}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                setFormData(prev => {
                                  let newCategories = isChecked
                                    ? [...prev.professional_permit_categories, ProfessionalPermitCategory.D]
                                    : prev.professional_permit_categories.filter(cat => cat !== ProfessionalPermitCategory.D);
                                  
                                  // D automatically includes G
                                  if (isChecked && !newCategories.includes(ProfessionalPermitCategory.G)) {
                                    newCategories.push(ProfessionalPermitCategory.G);
                                  }
                                  
                                  return { ...prev, professional_permit_categories: newCategories };
                                });
                              }}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" fontWeight="bold">D - Dangerous Goods</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Minimum age: 25 years • Automatically includes G
                              </Typography>
                            </Box>
                          }
                        />
                      </Grid>
                      
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={formData.professional_permit_categories.includes(ProfessionalPermitCategory.G)}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                setFormData(prev => {
                                  let newCategories = isChecked
                                    ? [...prev.professional_permit_categories, ProfessionalPermitCategory.G]
                                    : prev.professional_permit_categories.filter(cat => cat !== ProfessionalPermitCategory.G);
                                  
                                  // If unchecking G, also uncheck D (since D includes G)
                                  if (!isChecked) {
                                    newCategories = newCategories.filter(cat => cat !== ProfessionalPermitCategory.D);
                                  }
                                  
                                  return { ...prev, professional_permit_categories: newCategories };
                                });
                              }}
                              disabled={formData.professional_permit_categories.includes(ProfessionalPermitCategory.D)}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" fontWeight="bold">G - Goods</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Minimum age: 18 years
                              </Typography>
                            </Box>
                          }
                        />
                      </Grid>
                    </Grid>
                  </FormControl>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Professional Permit Previous Refusal Declaration - Only for PROFESSIONAL_LICENSE */}
          {formData.application_type === ApplicationType.PROFESSIONAL_LICENSE && (
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={!formData.professional_permit_previous_refusal}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          professional_permit_previous_refusal: !e.target.checked,
                          professional_permit_refusal_details: e.target.checked ? '' : prev.professional_permit_refusal_details 
                        }))}
                      />
                    }
                    label="I have never had a previous application for a professional driving permit refused"
                  />
                  
                  {formData.professional_permit_previous_refusal && (
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Please provide details of any previous professional driving permit application refusal (where, when, and reasons)"
                      value={formData.professional_permit_refusal_details || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        professional_permit_refusal_details: e.target.value 
                      }))}
                      required
                      sx={{ mt: 2 }}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}

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

          {/* License Verification Section - Hidden for learner's permit applications */}
          {![ApplicationType.LEARNERS_PERMIT, ApplicationType.LEARNERS_PERMIT_DUPLICATE].includes(formData.application_type) && (
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
          )}

          {/* Parental Consent - For applicants under 18 */}
          {formData.person?.birth_date && calculateAge(formData.person.birth_date) < 18 && (
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

  // Medical Assessment Step
  // Section C Step - Notice/Replacement Details
  const renderSectionCStep = () => {
    return (
              <Box>
        <Typography variant="h6" gutterBottom>
          {formData.application_type === ApplicationType.LEARNERS_PERMIT_DUPLICATE 
            ? 'Section C: Duplicate Request Details'
            : 'Section C: Notice Details'
          }
                </Typography>
        
        <Grid container spacing={3}>
          {/* Replacement Reason */}
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>
                {formData.application_type === ApplicationType.LEARNERS_PERMIT_DUPLICATE 
                  ? 'Reason for Duplicate Request'
                  : 'Reason for Notice'
                }
              </InputLabel>
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
                <MenuItem value="theft">Theft</MenuItem>
                <MenuItem value="loss">Loss</MenuItem>
                <MenuItem value="destruction">Destruction</MenuItem>
                <MenuItem value="recovery">Recovery</MenuItem>
                {/* Additional options for renewal applications only */}
                {formData.application_type === ApplicationType.RENEWAL && [
                  <MenuItem key="new_card" value="new_card">New Card</MenuItem>,
                  <MenuItem key="change_particulars" value="change_particulars">Change of Particulars (ID, name, address)</MenuItem>
                ]}
              </Select>
            </FormControl>
          </Grid>

          {/* Office of Issue */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Office of Issue"
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
              label="Date of Change"
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
                  label={`${formData.replacement_reason === 'theft' ? 'Theft' : 'Loss'} reported to Police`}
                />
        </Grid>

              {formData.police_reported && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Police Station"
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
                      label="Reference Number (CAS no.)"
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
                  <strong>Section C:</strong> {formData.application_type === ApplicationType.LEARNERS_PERMIT_DUPLICATE 
                    ? 'This section applies to duplicate learner\'s licence requests. Please specify the reason for requesting a duplicate.'
                    : 'This section applies to replacement licenses and notices of change.'
                  } All fields marked as required must be completed before proceeding.
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
                             (age >= 60 && requiresMedical60Plus(formData.license_category)) ||
                             formData.application_type === ApplicationType.PROFESSIONAL_LICENSE;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>Medical Assessment</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Complete vision test and medical clearance requirements
        </Typography>

        {isMedicalMandatory && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Medical assessment is mandatory</strong> for {
                formData.application_type === ApplicationType.PROFESSIONAL_LICENSE 
                  ? 'professional driving permit applications'
                  : age >= 60 
                    ? 'applicants 60+ years' 
                    : 'commercial license categories (C, D, E)'
              }
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


  // Biometric Step with photo, signature, and fingerprint capture
  const renderBiometricStep = () => {
    const handlePhotoCapture = async (photoFile: File) => {
      try {
        setSaving(true);
        
        // Process image directly without requiring an application
        const response = await applicationService.processImage(photoFile, 'PHOTO');

        if (response.status === 'success') {
          // Store the processed photo data in the form
          setFormData(prev => ({
            ...prev,
            biometric_data: {
              ...prev.biometric_data,
              photo: {
                filename: `processed_photo_${Date.now()}.jpg`,
                file_size: response.processed_image.file_size,
                dimensions: response.processed_image.dimensions || '300x400',
                format: response.processed_image.format,
                iso_compliant: response.processing_info?.iso_compliant || true,
                processed_url: `data:image/jpeg;base64,${response.processed_image.data}`,
                base64_data: response.processed_image.data // Store base64 for submission
              }
            }
          }));
          
          const compressionInfo = response.processing_info?.compression_ratio 
            ? ` (${response.processing_info.compression_ratio}% compression)`
            : '';
          
          setSuccess(`Photo processed successfully! ISO-compliant and ready for license production${compressionInfo}.`);
          setTimeout(() => setSuccess(''), 3000);
        }
      } catch (error) {
        console.error('Error processing photo:', error);
        
        // Store photo locally as fallback
        setFormData(prev => ({
          ...prev,
          biometric_data: {
            ...prev.biometric_data,
            photo: photoFile
          }
        }));
        
        setError('Image processing failed. Photo saved locally - will be processed on submission.');
        setTimeout(() => setError(''), 5000);
      } finally {
        setSaving(false);
      }
    };

    const handleSignatureCapture = async (signatureFile: File) => {
      try {
        setSaving(true);
        
        // Process signature image
        const response = await applicationService.processImage(signatureFile, 'SIGNATURE');

        if (response.status === 'success') {
          // Store the processed signature data
          setFormData(prev => ({
            ...prev,
            biometric_data: {
              ...prev.biometric_data,
              signature: {
                filename: `processed_signature_${Date.now()}.${response.processed_image.format.toLowerCase()}`,
                file_size: response.processed_image.file_size,
                format: response.processed_image.format,
                processed_url: `data:image/${response.processed_image.format.toLowerCase()};base64,${response.processed_image.data}`,
                base64_data: response.processed_image.data // Store base64 for submission
              }
            }
          }));
          
          setSuccess('Signature processed successfully!');
          setTimeout(() => setSuccess(''), 3000);
        }
      } catch (error) {
        console.error('Error processing signature:', error);
        
        // Store signature locally as fallback
        setFormData(prev => ({
          ...prev,
          biometric_data: {
            ...prev.biometric_data,
            signature: signatureFile
          }
        }));
        
        setError('Signature processing failed. Signature saved locally - will be processed on submission.');
        setTimeout(() => setError(''), 5000);
      } finally {
        setSaving(false);
      }
    };

    const handleFingerprintCapture = async (fingerprintFile: File) => {
      try {
        setSaving(true);
        
        // Process fingerprint image
        const response = await applicationService.processImage(fingerprintFile, 'FINGERPRINT');

        if (response.status === 'success') {
          // Store the processed fingerprint data
          setFormData(prev => ({
            ...prev,
            biometric_data: {
              ...prev.biometric_data,
              fingerprint: {
                filename: `processed_fingerprint_${Date.now()}.${response.processed_image.format.toLowerCase()}`,
                file_size: response.processed_image.file_size,
                format: response.processed_image.format,
                processed_url: `data:image/${response.processed_image.format.toLowerCase()};base64,${response.processed_image.data}`,
                base64_data: response.processed_image.data // Store base64 for submission
              }
            }
          }));
          
          setSuccess('Fingerprint processed successfully!');
          setTimeout(() => setSuccess(''), 3000);
        }
      } catch (error) {
        console.error('Error processing fingerprint:', error);
        
        // Store fingerprint locally as fallback
        setFormData(prev => ({
          ...prev,
          biometric_data: {
            ...prev.biometric_data,
            fingerprint: fingerprintFile
          }
        }));
        
        setError('Fingerprint processing failed. Fingerprint saved locally - will be processed on submission.');
        setTimeout(() => setError(''), 5000);
      } finally {
        setSaving(false);
      }
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
          {/* License Photo - Full Width */}
          <Grid item xs={12}>
            <Card sx={{ mb: 3 }}>
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
                        onError={(e) => {
                          console.error('Image preview error:', e);
                          // If processed_url fails, try the blob URL
                          if ((formData.biometric_data.photo as any).processed_url) {
                            e.currentTarget.src = URL.createObjectURL(formData.biometric_data.photo as File);
                          }
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

          {/* Digital Signature - Full Width */}
          <Grid item xs={12}>
            <Card>
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
                  
                  {/* Professional Permit Details */}
                  {formData.application_type === ApplicationType.PROFESSIONAL_LICENSE && (
                    <>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">Professional Permit Categories:</Typography>
                        <Typography variant="body1">
                          {formData.professional_permit_categories.map(category => {
                            switch(category) {
                              case ProfessionalPermitCategory.P:
                                return 'P - Passengers';
                              case ProfessionalPermitCategory.D:
                                return 'D - Dangerous Goods';
                              case ProfessionalPermitCategory.G:
                                return 'G - Goods';
                              default:
                                return category;
                            }
                          }).join(', ')}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">Previous Professional Permit Refusal:</Typography>
                        <Typography variant="body1">{formData.professional_permit_previous_refusal ? 'Yes' : 'No'}</Typography>
                      </Grid>
                      {formData.professional_permit_refusal_details && (
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">Professional Permit Refusal Details:</Typography>
                          <Typography variant="body1">{formData.professional_permit_refusal_details}</Typography>
                        </Grid>
                      )}
                    </>
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