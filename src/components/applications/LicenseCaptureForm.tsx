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

export interface CapturedLicense {
  id: string; // temp ID for form management
  license_category: LicenseCategory; // Single category only
  issue_date: string;
  restrictions: string[]; // License restrictions (corrective lenses, disability modifications)
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
      setCaptureData({
        captured_licenses: [],
        application_type: applicationtype
      });
    }
  }, [value, applicationtype]);

  const loadExistingLicenses = async (personId: string) => {
    setLoadingExisting(true);
    try {
      console.log('Loading existing licenses for person:', personId);
      const response = await applicationService.getPersonLicenses(personId);
      console.log('Existing licenses response:', response);
      const licenses = response.system_licenses || [];
      setExistingLicenses(licenses);
      
      // Auto-expand if licenses are found
      if (licenses.length > 0) {
        setShowExisting(true);
      }
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

  const getAvailableCategories = (currentLicenseId?: string) => {
    // Get system categories (not including current capture session)
    const systemCategories = new Set<string>();
    existingLicenses.forEach(license => {
      license.categories.forEach((cat: string) => systemCategories.add(cat));
    });
    
    // Get all categories including those being added in current session
    const allExistingCategories = getExistingCategories(currentLicenseId);
    
    if (applicationtype === ApplicationType.LEARNERS_PERMIT_CAPTURE) {
      // Show all learner's permit categories
      return [
        {
          value: LicenseCategory.LEARNERS_1,
          label: `Code 1 - ${LEARNERS_PERMIT_RULES['1']?.description || 'Motorcycles and mopeds'}`,
          disabled: systemCategories.has('1')
        },
        {
          value: LicenseCategory.LEARNERS_2,
          label: `Code 2 - ${LEARNERS_PERMIT_RULES['2']?.description || 'Light motor vehicles'}`,
          disabled: systemCategories.has('2')
        },
        {
          value: LicenseCategory.LEARNERS_3,
          label: `Code 3 - ${LEARNERS_PERMIT_RULES['3']?.description || 'All motor vehicles'}`,
          disabled: systemCategories.has('3')
        }
      ];
    } else {
      // For DRIVERS_LICENSE_CAPTURE, filter based on existing licenses and prerequisites
      return Object.values(LicenseCategory)
        .filter(category => !['1', '2', '3'].includes(category)) // Exclude learner's permit codes
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
    const tempId = `license-${Date.now()}`;
    const availableCategories = getAvailableCategories(tempId);
    
    const newLicense: CapturedLicense = {
      id: tempId,
      license_category: availableCategories[0]?.value || LicenseCategory.B,
      issue_date: '',
      restrictions: [],
      verified: false,
      verification_notes: ''
      // license_number field removed
    };

    updateCaptureData({
      ...captureData,
      captured_licenses: [...captureData.captured_licenses, newLicense]
    });
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
    const restrictionMap: Record<string, string> = {
      '01': 'Corrective Lenses Required',
      '02': 'Prosthetics',
      '03': 'Automatic Transmission Only',
      '04': 'Electric Vehicles Only',
      '05': 'Disability Adapted Vehicles',
      '06': 'Tractor Vehicles Only',
      '07': 'Industrial/Agriculture Only'
    };
    return restrictionMap[code] || `Restriction ${code}`;
  };

  const validateDate = (dateValue: string): string => {
    if (!dateValue) return '';
    
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(dateValue)) return '';
    
    const year = parseInt(dateValue.substring(0, 4));
    const currentYear = new Date().getFullYear();
    
    // Year must be between 1900 and current year + 50
    if (year < 1900 || year > currentYear + 50) return '';
    
    return dateValue;
  };

  const getDateConstraints = () => {
    const currentYear = new Date().getFullYear();
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
    <Card>
      <CardHeader 
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <VerifiedIcon color="primary" />
            <Typography variant="h6">
              {getFormTitle()}
            </Typography>
          </Box>
        }
        subheader={getFormDescription()}
      />
      <CardContent>
        {/* Existing Licenses Section */}
        <Card sx={{ mb: 3, bgcolor: 'grey.50' }}>
          <CardHeader
            title={
              <Box display="flex" alignItems="center" gap={1}>
                <CheckCircleIcon color={existingLicenses.length > 0 ? "success" : "disabled"} />
                <Typography variant="h6">
                  Existing Licenses ({existingLicenses.length})
                </Typography>
                {existingLicenses.length > 0 && (
                  <Chip 
                    label="Found" 
                    size="small" 
                    color="success" 
                    variant="outlined"
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
            subheader="Current licenses in the system - cannot capture duplicates"
          />
          <Collapse in={showExisting}>
            <CardContent>
              {loadingExisting ? (
                <Typography variant="body2">Loading existing licenses...</Typography>
              ) : existingLicenses.length === 0 ? (
                <Alert severity="info">
                  No existing licenses found. All categories are available for capture.
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
                          <Typography variant="body2" fontWeight="bold">
                            {license.license_number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            {license.categories.map((cat: string) => (
                              <Chip key={cat} label={cat} size="small" color="primary" />
                            ))}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={license.status}
                            size="small"
                            color={license.is_active ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>{license.issue_date}</TableCell>
                        <TableCell>
                          <Typography variant="body2">
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
          <Alert severity="info" sx={{ mb: 2 }}>
            No {applicationtype === ApplicationType.LEARNERS_PERMIT_CAPTURE ? "learner's permits" : "driver's licenses"} added yet. 
            Click "Add {applicationtype === ApplicationType.LEARNERS_PERMIT_CAPTURE ? "Learner's Permit" : "Driver's License"}" to start capturing existing licenses.
          </Alert>
        ) : (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold">
              Clerk Verification Required
            </Typography>
            <Typography variant="body2">
              All captured licenses must be physically verified by the clerk before proceeding.
            </Typography>
          </Alert>
        )}

        {/* License List */}
        {captureData.captured_licenses.map((license, index) => (
          <Box key={license.id} sx={{ mb: 3, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6" color="primary">
                {applicationtype === ApplicationType.LEARNERS_PERMIT_CAPTURE ? "Learner's Permit" : "Driver's License"} {index + 1}
              </Typography>
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
            </Box>

            <Grid container spacing={2}>
              {/* License Category - Single Select */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>
                    {applicationtype === ApplicationType.LEARNERS_PERMIT_CAPTURE ? "Permit Code" : "License Category"}
                  </InputLabel>
                  <Select
                    value={license.license_category}
                    onChange={(e) => updateLicense(index, 'license_category', e.target.value)}
                    disabled={disabled}
                    error={validationErrors[license.id]?.length > 0}
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
                        <Alert key={errorIndex} severity="error" sx={{ mb: 0.5 }}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <ErrorIcon fontSize="small" />
                            <Typography variant="body2">{error}</Typography>
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
                  type="date"
                  label="Issue Date"
                  value={license.issue_date}
                  onChange={(e) => updateLicense(index, 'issue_date', validateDate(e.target.value))}
                  disabled={disabled}
                  required
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: dateConstraints.min, max: dateConstraints.max }}
                  helperText="Format: YYYY-MM-DD"
                />
              </Grid>

              {/* License Restrictions */}
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>License Restrictions</InputLabel>
                  <Select
                    multiple
                    value={license.restrictions || []}
                    label="License Restrictions"
                    onChange={(e) => updateLicense(index, 'restrictions', Array.isArray(e.target.value) ? e.target.value : [])}
                    disabled={disabled}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((value) => (
                          <Chip 
                            key={value} 
                            label={getRestrictionDisplayName(value)} 
                            size="small" 
                          />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="01">
                      01 - Corrective Lenses Required
                    </MenuItem>
                    <MenuItem value="02">
                      02 - Prosthetics Required
                    </MenuItem>
                    <MenuItem value="03">
                      03 - Automatic Transmission Only
                    </MenuItem>
                    <MenuItem value="04">
                      04 - Electric Vehicles Only
                    </MenuItem>
                    <MenuItem value="05">
                      05 - Disability Adapted Vehicles
                    </MenuItem>
                    <MenuItem value="06">
                      06 - Tractor Vehicles Only
                    </MenuItem>
                    <MenuItem value="07">
                      07 - Industrial/Agriculture Only
                    </MenuItem>
                  </Select>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    Select all restrictions that apply to this license (all 7 codes available for capture applications)
                  </Typography>
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
                    />
                  }
                  label="I have physically verified this license is authentic and valid"
                  sx={{ color: license.verified ? 'success.main' : 'warning.main' }}
                />
              </Grid>

              {/* Verification Notes */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Verification Notes"
                  multiline
                  rows={2}
                  value={license.verification_notes || ''}
                  onChange={(e) => updateLicense(index, 'verification_notes', e.target.value)}
                  disabled={disabled}
                  placeholder="Note how the license was verified (physical inspection, condition, etc.)"
                />
              </Grid>
            </Grid>

            {/* License Status Indicator */}
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                icon={license.verified ? <VerifiedIcon /> : <WarningIcon />}
                label={license.verified ? 'Verified' : 'Pending Verification'}
                color={license.verified ? 'success' : 'warning'}
                size="small"
              />
            </Box>
          </Box>
        ))}

        {/* Add License Button */}
        <Button
          variant="outlined"
          onClick={addLicense}
          startIcon={<AddIcon />}
          disabled={disabled}
          sx={{ mt: 2 }}
        >
          Add {applicationtype === ApplicationType.LEARNERS_PERMIT_CAPTURE ? "Learner's Permit" : "Driver's License"}
        </Button>

        {/* Summary */}
        {captureData.captured_licenses.length > 0 && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Capture Summary
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Total licenses: {captureData.captured_licenses.length}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Verified: {captureData.captured_licenses.filter(l => l.verified).length} / {captureData.captured_licenses.length}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {applicationtype === ApplicationType.LEARNERS_PERMIT_CAPTURE ? "Permit Codes:" : "License Categories:"}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {Array.from(new Set(captureData.captured_licenses.map(l => l.license_category))).map((category) => (
                  <Chip
                    key={category}
                    label={
                      applicationtype === ApplicationType.LEARNERS_PERMIT_CAPTURE
                        ? `Code ${category}` // For learner's permits, show "Code 1", "Code 2", etc.
                        : category // For driver's licenses, show the category letter
                    }
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          </Box>
        )}
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
  
  return {
    restrictions: firstLicense.restrictions || [],
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
    }
    
    if (!license.verified) {
      errors.push(`License #${index + 1}: License must be verified before authorization`);
    }
  });

  return { isValid: errors.length === 0, errors };
}; 