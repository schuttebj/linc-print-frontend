/**
 * LicenseCaptureForm Component
 * 
 * Specialized form for capturing existing licenses during DRIVERS_LICENSE_CAPTURE 
 * and LEARNERS_PERMIT_CAPTURE application types.
 * 
 * Key features:
 * - Single license category selection (not multi-select)
 * - Allow multiple licenses via repeater
 * - Simple license details entry
 * - Clerk verification requirements
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Alert,
  IconButton,
  Tooltip,
  Divider,
  Stack,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Collapse
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  VerifiedUser as VerifiedIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

import {
  LicenseCategory,
  ApplicationType,
  LICENSE_CATEGORY_RULES,
  LEARNERS_PERMIT_RULES
} from '../../types';
import { LicenseValidationService } from '../../services/licenseValidationService';
import { applicationService } from '../../services/applicationService';
import { useFieldStyling, useSelectStyling, FieldState } from '../../hooks/useFieldStyling';
import { useDebounceValidation } from '../../hooks/useDebounceValidation';

export interface CapturedLicense {
  id: string; // temp ID for form management
  license_category: LicenseCategory; // Single category only
  issue_date: string;
  restrictions: {
    driver_restrictions: string[];
    vehicle_restrictions: string[];
  }; // License restrictions in new structured format
  verified: boolean;
  verification_notes?: string;
  // license_number field removed as we're no longer capturing it
}

export interface LicenseCaptureData {
  captured_licenses: CapturedLicense[];
  application_type: ApplicationType;
}

interface LicenseCaptureFormProps {
  applicationtype: ApplicationType; // DRIVERS_LICENSE_CAPTURE or LEARNERS_PERMIT_CAPTURE
  value: LicenseCaptureData | null;
  onChange: (data: LicenseCaptureData | null) => void;
  disabled?: boolean;
  personBirthDate?: string; // For age validation
  personId?: string; // For loading existing licenses
}

const LicenseCaptureForm: React.FC<LicenseCaptureFormProps> = ({
  applicationtype,
  value,
  onChange,
  disabled = false,
  personBirthDate,
  personId
}) => {
  const [captureData, setCaptureData] = useState<LicenseCaptureData>({
    captured_licenses: [],
    application_type: applicationtype
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [existingLicenses, setExistingLicenses] = useState<any[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [showExisting, setShowExisting] = useState(false);
  const validationService = new LicenseValidationService();

  // Field validation states for real-time styling
  const [fieldStates, setFieldStates] = useState<Record<string, FieldState>>({});

  // Load existing licenses when person changes
  useEffect(() => {
    if (personId) {
      loadExistingLicenses(personId);
    }
  }, [personId]);

  // Initialize data from props
  useEffect(() => {
    if (value) {
      setCaptureData(value);
    } else {
      // Always start with at least one license for capture forms
      const initialLicense: CapturedLicense = {
        id: `license-${Date.now()}`,
        license_category: applicationtype === ApplicationType.LEARNERS_PERMIT_CAPTURE 
          ? LicenseCategory.LEARNERS_1 
          : LicenseCategory.B,
        issue_date: '',
        restrictions: {
          driver_restrictions: [],
          vehicle_restrictions: []
        },
        verified: false,
        verification_notes: ''
      };

      const initialData = {
        captured_licenses: [initialLicense],
        application_type: applicationtype
      };

      setCaptureData(initialData);
      onChange(initialData);
    }
  }, [value, applicationtype, onChange]);



  const loadExistingLicenses = async (personId: string) => {
    setLoadingExisting(true);
    try {
      console.log('Loading existing licenses for person:', personId);
      const response = await applicationService.getPersonLicenses(personId);
      console.log('Existing licenses response:', response);
      const licenses = response.system_licenses || [];
      setExistingLicenses(licenses);
      
      // Keep existing licenses collapsed by default
    } catch (error) {
      console.error('Error loading existing licenses:', error);
      setExistingLicenses([]);
    } finally {
      setLoadingExisting(false);
    }
  };

  // Get existing license categories including those being captured in current session
  const getExistingCategories = useCallback((currentLicenseId?: string) => {
    // Get categories from existing licenses in the system
    const categories = new Set<string>();
    existingLicenses.forEach(license => {
      license.categories.forEach((cat: string) => categories.add(cat));
    });
    
    // Also include categories being added in the current capture session
    // This allows for adding dependent categories in the same session
    // But exclude the current license being edited to prevent circular dependencies
    captureData.captured_licenses.forEach(license => {
      if (currentLicenseId && license.id === currentLicenseId) return;
      categories.add(license.license_category);
    });
    
    return Array.from(categories);
  }, [existingLicenses, captureData.captured_licenses]);

  // Check if a category has prerequisites met
  const hasPrerequisites = useCallback((category: LicenseCategory, currentLicenseId?: string) => {
    const existingCategories = getExistingCategories(currentLicenseId);
    
    // Prerequisite rules for categories
    const prerequisites: Record<string, string[]> = {
      'C': ['B'],        // C license needs B
      'C1E': ['C1'],     // C1E needs C1
      'CE': ['C'],       // CE needs C
      'D': ['B'],        // D license needs B
      'D1': ['B'],       // D1 license needs B
      'D2': ['D'],       // D2 needs D
      'BE': ['B'],       // BE needs B
    };

    const requiredCategories = prerequisites[category] || [];
    return requiredCategories.every(req => existingCategories.includes(req));
  }, [getExistingCategories]);

  // Validate license data whenever it changes
  const validateLicenseData = useCallback((licenses: CapturedLicense[]) => {
    const errors: Record<string, string[]> = {};
    
    // Get system categories (not including current capture session)
    const systemCategories = new Set<string>();
    existingLicenses.forEach(license => {
      license.categories.forEach((cat: string) => systemCategories.add(cat));
    });

    licenses.forEach((license, index) => {
      const licenseErrors: string[] = [];
      
      // Check for duplicate license categories within the capture
      const duplicateInCapture = licenses.filter(l => 
        l.license_category === license.license_category && l.id !== license.id
      );
      if (duplicateInCapture.length > 0) {
        licenseErrors.push(`Duplicate license category ${license.license_category} - cannot add the same category multiple times`);
      }

      // Check if category already exists in the system
      if (systemCategories.has(license.license_category)) {
        licenseErrors.push(`License category ${license.license_category} already exists in the system - cannot capture duplicate`);
      }

      // Check prerequisites for certain categories
      if (!hasPrerequisites(license.license_category, license.id)) {
        const prerequisites: Record<string, string[]> = {
          'C': ['B'],
          'C1E': ['C1'],
          'CE': ['C'],
          'D': ['B'],
          'D1': ['B'],
          'D2': ['D'],
          'BE': ['B'],
        };
        const required = prerequisites[license.license_category];
        if (required) {
          licenseErrors.push(`Cannot capture ${license.license_category} - prerequisite license(s) ${required.join(', ')} not found in system or current capture`);
        }
      }
      
      if (licenseErrors.length > 0) {
        errors[license.id] = licenseErrors;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [existingLicenses, hasPrerequisites]);

  // Update parent when data changes
  const updateCaptureData = (newData: LicenseCaptureData) => {
    setCaptureData(newData);
    validateLicenseData(newData.captured_licenses);
    onChange(newData);
  };

  // Field validation function for real-time styling
  const validateField = useCallback((licenseId: string, fieldName: string, value: any): { isValid: boolean; state: FieldState; errorMessage?: string } => {
    const fieldKey = `${licenseId}-${fieldName}`;
    
    switch (fieldName) {
      case 'license_category':
        if (!value || value === '') {
          return { isValid: false, state: 'required', errorMessage: 'License category is required' };
        }
        return { isValid: true, state: 'valid' };
        
      case 'issue_date':
        if (!value || value === '') {
          return { isValid: false, state: 'required', errorMessage: 'Issue date is required' };
        }
        
        // Validate date format and constraints
        const dateObj = new Date(value);
        const currentDate = new Date();
        
        if (isNaN(dateObj.getTime())) {
          return { isValid: false, state: 'invalid', errorMessage: 'Invalid date format' };
        }
        
        // For learner's permits, check 6-month rule
        if (applicationtype === ApplicationType.LEARNERS_PERMIT_CAPTURE) {
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
          
          if (dateObj < sixMonthsAgo) {
            return { isValid: false, state: 'invalid', errorMessage: 'Learner\'s permit issue date must be within 6 months of current date' };
          }
          
          if (dateObj > currentDate) {
            return { isValid: false, state: 'invalid', errorMessage: 'Issue date cannot be in the future' };
          }
        }
        
        return { isValid: true, state: 'valid' };
        
      default:
        return { isValid: true, state: 'default' };
    }
  }, [applicationtype]);

  // Debounced validation
  const debouncedValidationHook = useDebounceValidation(
    (fieldName: string, value: any, stepIndex: number) => {
      // For license forms, stepIndex is not used, we pass licenseId via fieldName
      const [actualFieldName, licenseId] = fieldName.includes('|') ? fieldName.split('|') : [fieldName, stepIndex.toString()];
      const result = validateField(licenseId, actualFieldName, value);
      const fieldKey = `${licenseId}-${actualFieldName}`;
      
      setFieldStates(prev => ({
        ...prev,
        [fieldKey]: result.state
      }));
      
      return result;
    },
    300
  );

  // Helper function to call debounced validation with license ID
  const debouncedValidation = (fieldName: string, value: any, licenseId: string) => {
    return debouncedValidationHook.debouncedValidation(`${fieldName}|${licenseId}`, value, 0);
  };

  // Helper to get field styling
  const getFieldStyling = (licenseId: string, fieldName: string, isRequired: boolean = true) => {
    const fieldKey = `${licenseId}-${fieldName}`;
    const fieldState = fieldStates[fieldKey] || 'default';
    return useFieldStyling(fieldState, undefined, isRequired);
  };

  // Helper to get select styling
  const getSelectStyling = (licenseId: string, fieldName: string, isRequired: boolean = true) => {
    const fieldKey = `${licenseId}-${fieldName}`;
    const fieldState = fieldStates[fieldKey] || 'default';
    return useSelectStyling(fieldState, undefined, isRequired);
  };

  // Initialize field states for validation styling
  useEffect(() => {
    const newFieldStates: Record<string, FieldState> = {};
    
    captureData.captured_licenses.forEach(license => {
      // Initialize license category field state
      if (!license.license_category) {
        newFieldStates[`${license.id}-license_category`] = 'required';
      } else {
        newFieldStates[`${license.id}-license_category`] = 'valid';
      }
      
      // Initialize issue date field state
      if (!license.issue_date || license.issue_date === '') {
        newFieldStates[`${license.id}-issue_date`] = 'required';
      } else {
        // Validate the existing date
        const validation = validateField(license.id, 'issue_date', license.issue_date);
        newFieldStates[`${license.id}-issue_date`] = validation.state;
      }
    });
    
    setFieldStates(newFieldStates);
  }, [captureData.captured_licenses, validateField]);

  const getAvailableCategories = (currentLicenseId?: string) => {
    // Get system categories (not including current capture session)
    const systemCategories = new Set<string>();
    existingLicenses.forEach(license => {
      license.categories.forEach((cat: string) => systemCategories.add(cat));
    });
    
    // Get all categories including those being added in current session
    const allExistingCategories = getExistingCategories(currentLicenseId);
    
    if (applicationtype === ApplicationType.LEARNERS_PERMIT_CAPTURE) {
      // Show all learner permit categories
      return [
        {
          value: LicenseCategory.LEARNERS_1,
          label: 'Code 1',
          disabled: systemCategories.has('1')
        },
        {
          value: LicenseCategory.LEARNERS_2,
          label: 'Code 2',
          disabled: systemCategories.has('2')
        },
        {
          value: LicenseCategory.LEARNERS_3,
          label: 'Code 3',
          disabled: systemCategories.has('3')
        }
      ];
    } else {
      // For DRIVERS_LICENSE_CAPTURE, filter based on existing licenses and prerequisites
      return Object.values(LicenseCategory)
        .filter(category => !['1', '2', '3'].includes(category)) // Exclude learner permit codes
        .map(category => {
          const categoryRule = LICENSE_CATEGORY_RULES[category];
          const alreadyExists = systemCategories.has(category);
          const hasPrereqs = hasPrerequisites(category, currentLicenseId);
          
          let disabledReason = '';
          if (alreadyExists) {
            disabledReason = ' (Already exists)';
          } else if (!hasPrereqs) {
            const prerequisites: Record<string, string[]> = {
              'C': ['B'],
              'C1E': ['C1'],
              'CE': ['C'],
              'D': ['B'],
              'D1': ['B'],
              'D2': ['D'],
              'BE': ['B'],
            };
            const required = prerequisites[category];
            if (required) {
              disabledReason = ` (Needs ${required.join(', ')})`;
            }
          }
          
          return {
            value: category,
            label: `${category} - ${categoryRule?.description || 'License category'}${disabledReason}`,
            disabled: alreadyExists || !hasPrereqs
          };
        }).sort((a, b) => {
          // Sort by category order
          const order = ['A1', 'A2', 'A', 'B1', 'B', 'B2', 'BE', 'C1', 'C', 'C1E', 'CE', 'D1', 'D', 'D2'];
          return order.indexOf(a.value) - order.indexOf(b.value);
        });
    }
  };

  const addLicense = () => {
    const newLicense: CapturedLicense = {
      id: `license-${Date.now()}`,
      license_category: applicationtype === ApplicationType.LEARNERS_PERMIT_CAPTURE 
        ? LicenseCategory.LEARNERS_1 
        : LicenseCategory.B,
      issue_date: '',
      restrictions: {
        driver_restrictions: [],
        vehicle_restrictions: []
      },
      verified: false,
      verification_notes: ''
    };

    const newData = {
      ...captureData,
      captured_licenses: [...captureData.captured_licenses, newLicense]
    };

    setCaptureData(newData);
    onChange(newData);
  };

  const updateLicense = (index: number, field: keyof CapturedLicense, value: any) => {
    const updatedLicenses = [...captureData.captured_licenses];
    const oldValue = updatedLicenses[index][field];
    
    updatedLicenses[index] = {
      ...updatedLicenses[index],
      [field]: value
    };

    // If changing license category, we need to reset verification for any dependent licenses
    if (field === 'license_category' && oldValue !== value) {
      // Find any licenses that might depend on this one
      const prerequisites: Record<string, string[]> = {
        'C': ['B'],
        'C1E': ['C1'],
        'CE': ['C'],
        'D': ['B'],
        'D1': ['B'],
        'D2': ['D'],
        'BE': ['B'],
      };
      
      // If this was a prerequisite category that was changed, reset verification on dependent licenses
      updatedLicenses.forEach((license, licenseIndex) => {
        if (licenseIndex !== index) { // Don't check the license we're updating
          const requiredFor = Object.entries(prerequisites)
            .filter(([_, prereqs]) => prereqs.includes(oldValue as string))
            .map(([category]) => category);
            
          if (requiredFor.includes(license.license_category)) {
            // Reset verification if this license depended on the changed category
            updatedLicenses[licenseIndex] = {
              ...updatedLicenses[licenseIndex],
              verified: false
            };
          }
        }
      });
    }

    updateCaptureData({
      ...captureData,
      captured_licenses: updatedLicenses
    });

    // Trigger real-time validation for the updated field
    const licenseId = updatedLicenses[index].id;
    debouncedValidation(field, value, licenseId);
  };

  const removeLicense = (index: number) => {
    const updatedLicenses = captureData.captured_licenses.filter((_, i) => i !== index);
    
    updateCaptureData({
      ...captureData,
      captured_licenses: updatedLicenses
    });
  };

  const formatLicenseNumber = (number: string): string => {
    // Remove non-alphanumeric characters and convert to uppercase
    return number.replace(/[^A-Z0-9]/g, '').toUpperCase();
  };

  const getRestrictionDisplayName = (code: string): string => {
    // Driver restrictions mapping
    const driverRestrictionMap: Record<string, string> = {
      '00': 'No Driver Restrictions',
      '01': 'Corrective Lenses Required',
      '02': 'Artificial Limb/Prosthetics'
    };
    
    // Vehicle restrictions mapping
    const vehicleRestrictionMap: Record<string, string> = {
      '00': 'No Vehicle Restrictions',
      '01': 'Automatic Transmission Only',
      '02': 'Electric Powered Vehicles Only',
      '03': 'Vehicles Adapted for Physical Disabilities',
      '04': 'Tractor Vehicles Only',
      '05': 'Industrial/Agriculture Vehicles Only'
    };
    
    return driverRestrictionMap[code] || vehicleRestrictionMap[code] || `Restriction ${code}`;
  };

  const validateDate = (dateValue: string): string => {
    if (!dateValue) return '';
    
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(dateValue)) return '';
    
    const inputDate = new Date(dateValue);
    const currentDate = new Date();
    const year = inputDate.getFullYear();
    const currentYear = currentDate.getFullYear();
    
    // Basic year validation: between 1900 and current year + 50
    if (year < 1900 || year > currentYear + 50) return '';
    
    // For learner's permits, issue date must be within 6 months of current date
    if (applicationtype === ApplicationType.LEARNERS_PERMIT_CAPTURE) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
      
      if (inputDate < sixMonthsAgo) {
        // Date is older than 6 months - return empty to indicate invalid
        return '';
      }
      
      if (inputDate > currentDate) {
        // Future date - return empty to indicate invalid
        return '';
      }
    }
    
    return dateValue;
  };

  const getDateConstraints = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    // For learner's permits, constrain to 6 months ago to today
    if (applicationtype === ApplicationType.LEARNERS_PERMIT_CAPTURE) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
      
      const minDate = sixMonthsAgo.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const maxDate = currentDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      return {
        min: minDate,
        max: maxDate
      };
    }
    
    // For other license types, use original constraints
    return {
      min: '1900-01-01',
      max: `${currentYear + 50}-12-31`
    };
  };

  const getFormTitle = () => {
    return applicationtype === ApplicationType.LEARNERS_PERMIT_CAPTURE 
      ? "Learner's Permit Capture"
      : "Driver's Licence Capture";
  };

  const getFormDescription = () => {
    return applicationtype === ApplicationType.LEARNERS_PERMIT_CAPTURE
      ? "Capture existing learner's permits that the person currently holds. Each permit should be entered separately with its specific code."
      : "Capture existing driver's licenses that the person currently holds. Each license should be entered separately with its specific category.";
  };

  const dateConstraints = getDateConstraints();

  return (
    <Card 
      elevation={0}
      sx={{ 
        bgcolor: 'white',
        boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
        borderRadius: 2
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* Existing Licenses Section */}
        <Card 
          elevation={0}
          sx={{ 
            mb: 2, 
            bgcolor: 'grey.50',
            boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
            borderRadius: 2
          }}
        >
          <CardHeader
            sx={{ p: 1.5 }}
            title={
              <Box display="flex" alignItems="center" gap={1}>
                <CheckCircleIcon color={existingLicenses.length > 0 ? "success" : "disabled"} />
                <Typography variant="subtitle1" sx={{ fontSize: '1rem' }}>
                  Existing Licenses ({existingLicenses.length})
                </Typography>
                {existingLicenses.length > 0 && (
                  <Chip 
                    label="Found" 
                    size="small" 
                    color="success" 
                    variant="outlined"
                    sx={{ fontSize: '0.65rem', height: '20px' }}
                  />
                )}
                <IconButton 
                  size="small" 
                  onClick={() => setShowExisting(!showExisting)}
                  disabled={loadingExisting}
                >
                  {showExisting ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
            }
            subheader={
              <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                Current licenses in the system - cannot capture duplicates
              </Typography>
            }
          />
          <Collapse in={showExisting}>
            <CardContent sx={{ p: 1.5 }}>
              {loadingExisting ? (
                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Loading existing licenses...</Typography>
              ) : existingLicenses.length === 0 ? (
                <Alert severity="info" sx={{ py: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                    No existing licenses found. All categories are available for capture.
                  </Typography>
                </Alert>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>License ID</TableCell>
                      <TableCell>Categories</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Issue Date</TableCell>
                      <TableCell>Location</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {existingLicenses.map((license) => (
                      <TableRow key={license.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.8rem' }}>
                            {license.license_number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            {license.categories.map((cat: string) => (
                              <Chip 
                                key={cat} 
                                label={cat} 
                                size="small" 
                                color="primary"
                                sx={{ fontSize: '0.65rem', height: '20px' }}
                              />
                            ))}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={license.status}
                            size="small"
                            color={license.is_active ? 'success' : 'default'}
                            sx={{ fontSize: '0.65rem', height: '20px' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {license.issue_date}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {license.issuing_location}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Collapse>
        </Card>

        {captureData.captured_licenses.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2, py: 1 }}>
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
              No {applicationtype === ApplicationType.LEARNERS_PERMIT_CAPTURE ? "learner permits" : "driver licenses"} added yet. 
              Click "Add {applicationtype === ApplicationType.LEARNERS_PERMIT_CAPTURE ? "Learner Permit" : "Driver License"}" to start capturing existing licenses.
            </Typography>
          </Alert>
        ) : null}

        {/* License List */}
        {captureData.captured_licenses.map((license, index) => (
          <Box 
            key={license.id} 
            sx={{ 
              mb: 2, 
              p: 1.5, 
              border: 1, 
              borderColor: 'divider', 
              borderRadius: 2,
              bgcolor: '#fafafa',
              boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px'
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="subtitle1" color="primary" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                  {applicationtype === ApplicationType.LEARNERS_PERMIT_CAPTURE ? "Learner's Permit" : "Driver's License"} {index + 1}
                </Typography>
                <Chip
                  icon={license.verified ? <VerifiedIcon /> : <WarningIcon />}
                  label={license.verified ? 'Verified' : 'Pending'}
                  color={license.verified ? 'success' : 'warning'}
                  size="small"
                  sx={{ fontSize: '0.65rem', height: '20px' }}
                />
              </Box>
              {/* Only show delete button for additional licenses (not the first one) */}
              {index > 0 && (
                <Tooltip title="Remove this license">
                  <IconButton
                    onClick={() => removeLicense(index)}
                    disabled={disabled}
                    color="error"
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            <Grid container spacing={2}>
              {/* License Category - Single Select */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required size="small" {...getSelectStyling(license.id, 'license_category')}>
                  <InputLabel>
                    {applicationtype === ApplicationType.LEARNERS_PERMIT_CAPTURE ? "Permit Code" : "License Category"}
                  </InputLabel>
                  <Select
                    value={license.license_category}
                    onChange={(e) => updateLicense(index, 'license_category', e.target.value)}
                    disabled={disabled}
                    size="small"
                  >
                    {getAvailableCategories(license.id).map((category) => (
                      <MenuItem 
                        key={category.value} 
                        value={category.value}
                        disabled={category.disabled}
                      >
                        {category.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {validationErrors[license.id]?.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      {validationErrors[license.id].map((error, errorIndex) => (
                        <Alert key={errorIndex} severity="error" sx={{ mb: 0.5, py: 0.5 }}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <ErrorIcon fontSize="small" />
                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{error}</Typography>
                          </Box>
                        </Alert>
                      ))}
                    </Box>
                  )}
                </FormControl>
              </Grid>

              {/* Issue Date */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Issue Date"
                  value={license.issue_date}
                  onChange={(e) => updateLicense(index, 'issue_date', validateDate(e.target.value))}
                  disabled={disabled}
                  required
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: dateConstraints.min, max: dateConstraints.max }}
                  helperText={
                    applicationtype === ApplicationType.LEARNERS_PERMIT_CAPTURE
                      ? "Learner's permits are only valid for 6 months from issue date"
                      : undefined
                  }
                  {...getFieldStyling(license.id, 'issue_date')}
                />
              </Grid>

              {/* Driver Restrictions */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Driver Restrictions</InputLabel>
                  <Select
                    multiple
                    size="small"
                    value={license.restrictions?.driver_restrictions || []}
                    label="Driver Restrictions"
                    onChange={(e) => updateLicense(index, 'restrictions', {
                      ...license.restrictions,
                      driver_restrictions: Array.isArray(e.target.value) ? e.target.value : []
                    })}
                    disabled={disabled}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((value) => (
                          <Chip 
                            key={value} 
                            label={getRestrictionDisplayName(value)} 
                            size="small"
                            color="primary"
                            sx={{ fontSize: '0.65rem', height: '20px' }}
                          />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="01">01 - Corrective Lenses Required</MenuItem>
                    <MenuItem value="02">02 - Artificial Limb/Prosthetics</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Vehicle Restrictions */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Vehicle Restrictions</InputLabel>
                  <Select
                    multiple
                    size="small"
                    value={license.restrictions?.vehicle_restrictions || []}
                    label="Vehicle Restrictions"
                    onChange={(e) => updateLicense(index, 'restrictions', {
                      ...license.restrictions,
                      vehicle_restrictions: Array.isArray(e.target.value) ? e.target.value : []
                    })}
                    disabled={disabled}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((value) => (
                          <Chip 
                            key={value} 
                            label={getRestrictionDisplayName(value)} 
                            size="small"
                            color="secondary"
                            sx={{ fontSize: '0.65rem', height: '20px' }}
                          />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="01">01 - Automatic Transmission Only</MenuItem>
                    <MenuItem value="02">02 - Electric Powered Vehicles Only</MenuItem>
                    <MenuItem value="03">03 - Vehicles Adapted for Physical Disabilities</MenuItem>
                    {applicationtype === ApplicationType.DRIVERS_LICENSE_CAPTURE && (
                      <>
                        <MenuItem value="04">04 - Tractor Vehicles Only</MenuItem>
                        <MenuItem value="05">05 - Industrial/Agriculture Vehicles Only</MenuItem>
                      </>
                    )}
                  </Select>
                </FormControl>
              </Grid>

              {/* Verification */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={license.verified}
                      onChange={(e) => updateLicense(index, 'verified', e.target.checked)}
                      disabled={disabled}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                      I have physically verified this license is authentic and valid
                    </Typography>
                  }
                  sx={{ color: license.verified ? 'success.main' : 'warning.main' }}
                />
              </Grid>


            </Grid>


          </Box>
        ))}

        {/* Add License Button */}
        <Button
          variant="outlined"
          size="small"
          onClick={addLicense}
          startIcon={<AddIcon />}
          disabled={disabled}
          sx={{ mt: 2 }}
        >
          Add {applicationtype === ApplicationType.LEARNERS_PERMIT_CAPTURE ? "Learner's Permit" : "Driver's License"}
        </Button>


      </CardContent>
    </Card>
  );
};

export default LicenseCaptureForm;

// Helper function to transform captured license data for authorization endpoint
export const transformCapturedDataForAuthorization = (captureData: LicenseCaptureData): any => {
  if (!captureData.captured_licenses || captureData.captured_licenses.length === 0) {
    return {};
  }

  // For now, take the first captured license (most common case)
  const firstLicense = captureData.captured_licenses[0];
  
  // Auto-add "00" codes if restriction arrays are empty
  const processedRestrictions = {
    driver_restrictions: firstLicense.restrictions?.driver_restrictions?.length > 0 
      ? firstLicense.restrictions.driver_restrictions 
      : ["00"],
    vehicle_restrictions: firstLicense.restrictions?.vehicle_restrictions?.length > 0 
      ? firstLicense.restrictions.vehicle_restrictions 
      : ["00"]
  };
  
  return {
    restrictions: processedRestrictions,
    medical_restrictions: [], // Empty for capture applications
    captured_license_data: {
      original_issue_date: firstLicense.issue_date,
      original_expiry_date: '', // Removed expiry_date
      original_category: firstLicense.license_category,
      verification_status: firstLicense.verified ? 'VERIFIED' : 'PENDING',
      verification_notes: firstLicense.verification_notes || ''
      // No license_number included
    }
  };
};

// Helper function to validate captured license data before authorization
export const validateCapturedDataForAuthorization = (captureData: LicenseCaptureData): { 
  isValid: boolean; 
  errors: string[]; 
} => {
  const errors: string[] = [];
  
  if (!captureData.captured_licenses || captureData.captured_licenses.length === 0) {
    errors.push('No licenses captured');
    return { isValid: false, errors };
  }

  captureData.captured_licenses.forEach((license, index) => {
    if (!license.license_category) {
      errors.push(`License #${index + 1}: License category is required`);
    }
    
    // license_number validation removed

    if (!license.issue_date) {
      errors.push(`License #${index + 1}: Issue date is required`);
    } else {
      // For learner's permits, validate 6-month rule
      if (captureData.application_type === ApplicationType.LEARNERS_PERMIT_CAPTURE) {
        const issueDate = new Date(license.issue_date);
        const currentDate = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
        
        if (issueDate < sixMonthsAgo) {
          errors.push(`License #${index + 1}: Learner's permit issue date must be within 6 months of current date`);
        }
        
        if (issueDate > currentDate) {
          errors.push(`License #${index + 1}: Issue date cannot be in the future`);
        }
      }
    }
    
    if (!license.verified) {
      errors.push(`License #${index + 1}: License must be verified before authorization`);
    }
  });

  return { isValid: errors.length === 0, errors };
}; 