/**
 * LicenseVerificationSection Component
 * 
 * Shows existing system licenses (trusted, no verification needed) and allows 
 * manual addition of external licenses (requires verification).
 * 
 * Follows the same UI pattern as aliases and addresses in PersonFormWrapper.
 */

import React, { useState, useEffect } from 'react';
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
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Tooltip,
  Divider,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  VerifiedUser as VerifiedIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

import {
  SystemLicense,
  ExternalLicense,
  LicenseVerificationData,
  LicenseCategory,
  LicenseStatus,
  LICENSE_CATEGORY_RULES,
  LEARNERS_PERMIT_RULES,
  LEARNERS_PERMIT_MAPPING,
  LICENSE_TO_LEARNERS_MAPPING,
  ApplicationType,
  getAuthorizedCategories
} from '../../types';
import type { Location } from '../../services/lookupService';
import { applicationService } from '../../services/applicationService';

interface LicenseVerificationSectionProps {
  personId: string | null;
  value: LicenseVerificationData | null;
  onChange: (data: LicenseVerificationData | null) => void;
  locations: Location[];
  currentLicenseCategory: LicenseCategory | null; // Current category being applied for
  currentApplicationType: ApplicationType | null; // Current application type being applied for
  disabled?: boolean;
}

const LicenseVerificationSection: React.FC<LicenseVerificationSectionProps> = ({
  personId,
  value,
  onChange,
  locations,
  currentLicenseCategory,
  currentApplicationType,
  disabled = false
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Initialize empty data if null
  const licenseData: LicenseVerificationData = value || {
    person_id: personId || '',
    system_licenses: [],
    external_licenses: [],
    all_license_categories: [],
    requires_verification: false
  };

  // Load system licenses when person or license category changes
  useEffect(() => {
    if (personId) {
      loadSystemLicenses(personId);
    }
  }, [personId, currentLicenseCategory]);

  const loadSystemLicenses = async (personId: string) => {
    setLoading(true);
    setError('');
    
    try {
      // Get current issued licenses (separate from applications)
      const [licensesResponse, applicationsResponse] = await Promise.all([
        applicationService.getPersonLicenses(personId), // Current system for backward compatibility
        applicationService.getApplicationsByPerson(personId) // Current applications
      ]);

      // Separate current licenses from applications for better clarity
      const currentLicenses: SystemLicense[] = licensesResponse.system_licenses || [];
      const currentApplications = applicationsResponse || [];

      console.log('Loaded current licenses:', currentLicenses);
      console.log('Loaded current applications:', currentApplications);

      // Auto-populate external licenses for missing prerequisites
      // But preserve any external licenses already created by ApplicationFormWrapper
      const hasAutoPopulatedLicenses = licenseData.external_licenses.some(license => license.is_auto_populated);
      
      let finalExternalLicenses: ExternalLicense[];
      if (hasAutoPopulatedLicenses) {
        // Keep existing auto-populated licenses from ApplicationFormWrapper
        console.log('Preserving auto-populated licenses from ApplicationFormWrapper:', licenseData.external_licenses);
        finalExternalLicenses = licenseData.external_licenses;
      } else {
        // No auto-populated licenses exist, create them based on system requirements
        finalExternalLicenses = createAutoPopulatedExternalLicenses(
          currentLicenses,
          licenseData.external_licenses
        );
        console.log('Auto-populated external licenses:', finalExternalLicenses);
      }

      updateLicenseData({
        ...licenseData,
        person_id: personId,
        system_licenses: currentLicenses,
        external_licenses: finalExternalLicenses,
        all_license_categories: getAllCategories(currentLicenses, finalExternalLicenses)
      });

    } catch (err: any) {
      console.error('Error loading licenses and applications:', err);
      
      // If API call fails, still preserve auto-populated licenses or create new ones
      const hasAutoPopulatedLicenses = licenseData.external_licenses.some(license => license.is_auto_populated);
      
      let finalExternalLicenses: ExternalLicense[];
      if (hasAutoPopulatedLicenses) {
        // Keep existing auto-populated licenses from ApplicationFormWrapper
        finalExternalLicenses = licenseData.external_licenses;
      } else {
        // If API call fails, still try to auto-populate based on requirements
        finalExternalLicenses = createAutoPopulatedExternalLicenses(
          [],
          licenseData.external_licenses
        );
      }

      updateLicenseData({
        ...licenseData,
        person_id: personId,
        system_licenses: [],
        external_licenses: finalExternalLicenses,
        all_license_categories: getAllCategories([], finalExternalLicenses)
      });

      // Only show error if it's not a 404 (person has no licenses)
      if (err.response?.status !== 404) {
        setError('Failed to load existing data. Auto-populating requirements based on license category.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getAllCategories = (systemLicenses: SystemLicense[], externalLicenses: ExternalLicense[]): LicenseCategory[] => {
    const allCategories = new Set<LicenseCategory>();
    
    // Add categories from system licenses
    systemLicenses.forEach(license => {
      license.categories.forEach(cat => allCategories.add(cat));
    });
    
    // Add categories from verified external licenses
    externalLicenses
      .filter(license => license.verified)
      .forEach(license => {
        license.categories.forEach(cat => allCategories.add(cat));
      });
    
    return Array.from(allCategories);
  };

  const updateLicenseData = (newData: LicenseVerificationData) => {
    const updatedData: LicenseVerificationData = {
      ...newData,
      all_license_categories: getAllCategories(newData.system_licenses, newData.external_licenses),
      requires_verification: newData.external_licenses.some(license => !license.verified)
    };
    
    onChange(updatedData);
  };

  const addExternalLicense = () => {
    const tempId = `temp-${Date.now()}`;
    
    // Default license type based on application type
    let defaultLicenseType: 'LEARNERS_PERMIT' | 'DRIVERS_LICENSE';
    let defaultCategories: LicenseCategory[];
    
    if ([ApplicationType.NEW_LICENSE, ApplicationType.CONVERSION, ApplicationType.PROFESSIONAL_LICENSE, ApplicationType.FOREIGN_CONVERSION].includes(currentApplicationType!)) {
      defaultLicenseType = 'DRIVERS_LICENSE';
      defaultCategories = [LicenseCategory.B];
    } else if ([ApplicationType.TEMPORARY_LICENSE, ApplicationType.RENEWAL].includes(currentApplicationType!)) {
      defaultLicenseType = 'DRIVERS_LICENSE';
      defaultCategories = []; // Start empty, user will select their categories
    } else {
      defaultLicenseType = 'DRIVERS_LICENSE';
      defaultCategories = [LicenseCategory.B];
    }

    const newExternalLicense: ExternalLicense = {
      id: tempId,
      license_number: '',
      license_type: defaultLicenseType,
      license_category: defaultCategories[0] || LicenseCategory.B,
      categories: defaultCategories,
      issue_date: '',
      expiry_date: '',
      issuing_authority: '', // Keep for compatibility but won't show in form
      issuing_location: '', // Keep for compatibility but won't show in form  
      restrictions: '',
      verified: false,
      verification_source: 'MANUAL',
      verification_notes: '',
      is_required: false
    };

    updateLicenseData({
      ...licenseData,
      external_licenses: [...licenseData.external_licenses, newExternalLicense]
    });
  };

  const updateExternalLicense = (index: number, field: keyof ExternalLicense, value: any) => {
    const updatedExternalLicenses = [...licenseData.external_licenses];
    updatedExternalLicenses[index] = {
      ...updatedExternalLicenses[index],
      [field]: value
    };

    updateLicenseData({
      ...licenseData,
      external_licenses: updatedExternalLicenses
    });
  };

  const removeExternalLicense = (index: number) => {
    // Only allow deletion of manually added licenses
    // Auto-populated licenses should not have delete buttons
    const license = licenseData.external_licenses[index];
    if (license.is_auto_populated) {
      console.warn('Attempted to delete auto-populated license - this should not be possible');
      return;
    }
    
    const updatedExternalLicenses = licenseData.external_licenses.filter((_, i) => i !== index);
    
    updateLicenseData({
      ...licenseData,
      external_licenses: updatedExternalLicenses
    });
  };

  const formatLicenseNumber = (number: string): string => {
    // Remove non-alphanumeric characters and convert to uppercase
    return number.replace(/[^A-Z0-9]/g, '').toUpperCase();
  };

  const isLicenseExpired = (expiryDate: string): boolean => {
    return new Date(expiryDate) < new Date();
  };

  /**
   * Validate and format date to ensure YYYY-MM-DD format with 4-digit year
   */
  const validateAndFormatDate = (dateValue: string): string => {
    if (!dateValue) return '';
    
    // If date is in invalid format or has wrong year length, return empty
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(dateValue)) return '';
    
    const year = parseInt(dateValue.substring(0, 4));
    const currentYear = new Date().getFullYear();
    
    // Year must be between 1900 and current year + 50
    if (year < 1900 || year > currentYear + 50) return '';
    
    return dateValue;
  };

  /**
   * Handle date input changes with validation
   */
  const handleDateChange = (index: number, field: 'issue_date' | 'expiry_date', value: string) => {
    const validatedDate = validateAndFormatDate(value);
    updateExternalLicense(index, field, validatedDate);
  };

  /**
   * Get min/max dates for date inputs
   */
  const getDateConstraints = () => {
    const currentYear = new Date().getFullYear();
    return {
      min: '1900-01-01',
      max: `${currentYear + 50}-12-31`
    };
  };

  const getLicenseStatusColor = (license: SystemLicense): 'success' | 'warning' | 'error' => {
    if (license.status === LicenseStatus.ACTIVE && !isLicenseExpired(license.expiry_date)) {
      return 'success';
    } else if (license.status === LicenseStatus.EXPIRED || isLicenseExpired(license.expiry_date)) {
      return 'warning';
    } else {
      return 'error';
    }
  };

  /**
   * Auto-populate external licenses for missing prerequisites
   */
  const createAutoPopulatedExternalLicenses = (
    systemLicenses: SystemLicense[], 
    existingExternalLicenses: ExternalLicense[]
  ): ExternalLicense[] => {
    if (!currentLicenseCategory && ![ApplicationType.TEMPORARY_LICENSE, ApplicationType.RENEWAL].includes(currentApplicationType!)) {
      return existingExternalLicenses;
    }

    // For TEMPORARY_LICENSE and RENEWAL, if no system licenses found, show info message
    if ([ApplicationType.TEMPORARY_LICENSE, ApplicationType.RENEWAL].includes(currentApplicationType!) && systemLicenses.length === 0) {
      // No auto-population needed - user will manually add their existing licenses
      return existingExternalLicenses.filter(license => !license.is_auto_populated);
    }

    // For learner's permit applications, no auto-population needed
    if (currentApplicationType === ApplicationType.LEARNERS_PERMIT) {
      return existingExternalLicenses.filter(license => !license.is_auto_populated);
    }

    // Continue with existing logic for NEW_LICENSE applications
    if (!currentLicenseCategory) {
      return existingExternalLicenses;
    }

    // Get category rules (check both regular and learner's permit rules)
    const categoryRules = LICENSE_CATEGORY_RULES[currentLicenseCategory] || 
                         (currentLicenseCategory.toString() in LEARNERS_PERMIT_RULES ? 
                          LEARNERS_PERMIT_RULES[currentLicenseCategory.toString()] : null);
                          
    if (!categoryRules) {
      return existingExternalLicenses;
    }

    // Get categories available from system licenses
    const systemCategories = new Set<LicenseCategory>();
    systemLicenses.forEach(license => {
      license.categories.forEach(cat => systemCategories.add(cat));
    });

    // Separate manually added from auto-populated external licenses
    const manualExternalLicenses = existingExternalLicenses.filter(license => !license.is_auto_populated);

    // Get categories available from manual external licenses
    const manualExternalCategories = new Set<LicenseCategory>();
    manualExternalLicenses.forEach(license => {
      license.categories.forEach(cat => manualExternalCategories.add(cat));
    });

    // Find missing required categories using new superseding logic
    const missingCategories: LicenseCategory[] = [];
    
    // Special check for NEW_LICENSE applications that require learner's permit
    if ([ApplicationType.NEW_LICENSE, ApplicationType.CONVERSION, ApplicationType.PROFESSIONAL_LICENSE, ApplicationType.FOREIGN_CONVERSION].includes(currentApplicationType!) && categoryRules.requires_learners_permit) {
      // Get the corresponding learner's permit code for this category
      const learnerCodeString = LICENSE_TO_LEARNERS_MAPPING[currentLicenseCategory];
      
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
        
        // Check if person has valid learner's permit for this category
        const hasSystemLearnerPermit = systemLicenses.some(license => 
          license.license_type === 'LEARNERS_PERMIT' && 
          (license.categories.includes(learnerCategory) || 
           license.categories.includes(currentLicenseCategory)) &&
          license.status === 'ACTIVE' &&
          !isLicenseExpired(license.expiry_date)
        );
        
        const hasExternalLearnerPermit = manualExternalLicenses.some(license =>
          license.license_type === 'LEARNERS_PERMIT' &&
          (license.categories.includes(learnerCategory) ||
           license.categories.includes(currentLicenseCategory)) &&
          license.verified &&
          !isLicenseExpired(license.expiry_date)
        );
        
        // If no valid learner's permit found, require external verification using learner's code
        if (!hasSystemLearnerPermit && !hasExternalLearnerPermit) {
          missingCategories.push(learnerCategory);
        }
      }
    }
    
    // Handle regular prerequisites if any
    if (categoryRules.prerequisites) {
      categoryRules.prerequisites.forEach(requiredCat => {
        // Check if the required category is available directly
        const hasDirectCategory = systemCategories.has(requiredCat as LicenseCategory) || 
                                 manualExternalCategories.has(requiredCat as LicenseCategory);
        
        if (!hasDirectCategory) {
          // Check if any existing license supersedes this required category
          let hasSupersedingLicense = false;
          
          // Check system licenses
          for (const license of systemLicenses) {
            for (const licenseCat of license.categories) {
              const authorizedCategories = getAuthorizedCategories(licenseCat);
              if (authorizedCategories.includes(requiredCat as LicenseCategory)) {
                hasSupersedingLicense = true;
                break;
              }
            }
            if (hasSupersedingLicense) break;
          }
          
          // Check manual external licenses if not found in system
          if (!hasSupersedingLicense) {
            for (const license of manualExternalLicenses) {
              for (const licenseCat of license.categories) {
                const authorizedCategories = getAuthorizedCategories(licenseCat);
                if (authorizedCategories.includes(requiredCat as LicenseCategory)) {
                  hasSupersedingLicense = true;
                  break;
                }
              }
              if (hasSupersedingLicense) break;
            }
          }
          
          // If still not found, add to missing categories
          if (!hasSupersedingLicense && !missingCategories.includes(requiredCat as LicenseCategory)) {
            missingCategories.push(requiredCat as LicenseCategory);
          }
        }
      });
    }

    // Create external license entries for missing categories
    const autoPopulatedLicenses = missingCategories.map((category, index) => {
      const tempId = `auto-${Date.now()}-${index}`;
      
      // Determine correct license type based on what's needed
      let licenseType: 'LEARNERS_PERMIT' | 'DRIVERS_LICENSE';
      let requiredDescription = '';
      
      // Check if this is a learner's permit code (1, 2, or 3)
      if (['1', '2', '3'].includes(category.toString())) {
        licenseType = 'LEARNERS_PERMIT';
        const learnerRule = LEARNERS_PERMIT_RULES[category.toString()];
        requiredDescription = `Required learner's permit: ${learnerRule?.description || 'Learner\'s permit required'}`;
      } else {
        // Regular license category
        if ([ApplicationType.NEW_LICENSE, ApplicationType.CONVERSION, ApplicationType.PROFESSIONAL_LICENSE, ApplicationType.FOREIGN_CONVERSION].includes(currentApplicationType!)) {
          // For NEW_LICENSE and similar applications
          const catRule = LICENSE_CATEGORY_RULES[category];
          if (catRule?.allows_learners_permit) {
            // Categories that allow learner's permit need learner's permit first
            licenseType = 'LEARNERS_PERMIT';
            requiredDescription = `Required prerequisite learner's permit for ${category}`;
          } else {
            // Advanced categories (C, D families) need existing driver's license
            licenseType = 'DRIVERS_LICENSE';
            requiredDescription = `Required prerequisite ${category} driver's license`;
          }
        } else {
          // For other application types (RENEWAL, TEMPORARY_LICENSE), they need existing driver's license
          licenseType = 'DRIVERS_LICENSE';
          requiredDescription = `Required prerequisite ${category} driver's license`;
        }
      }

      return {
        id: tempId,
        license_number: '',
        license_type: licenseType,
        license_category: category,
        categories: [category],
        issue_date: '',
        expiry_date: '',
        issuing_authority: '',
        issuing_location: '',
        restrictions: '',
        verified: false,
        verification_source: 'MANUAL' as const,
        verification_notes: requiredDescription,
        is_required: true,
        // Auto-population fields
        is_auto_populated: true,
        required_for_category: currentLicenseCategory
      };
    });

    return [...manualExternalLicenses, ...autoPopulatedLicenses];
  };

  /**
   * Validate date logic (expiry after issue)
   */
  const validateDateLogic = (license: ExternalLicense): { hasError: boolean; message: string } => {
    if (!license.issue_date || !license.expiry_date) {
      return { hasError: false, message: '' };
    }

    const issueDate = new Date(license.issue_date);
    const expiryDate = new Date(license.expiry_date);

    if (expiryDate <= issueDate) {
      return { hasError: true, message: 'Expiry date must be after issue date' };
    }

    if (isLicenseExpired(license.expiry_date)) {
      return { hasError: true, message: 'License is expired' };
    }

    return { hasError: false, message: 'Format: YYYY-MM-DD (must be future date for valid licenses)' };
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2">Loading existing licenses...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        License Verification & Prerequisites
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        This section shows current licenses, pending applications, and allows adding external licenses for prerequisite verification.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Current Licenses (Issued & Active) */}
      <Card sx={{ mb: 3 }}>
        <CardHeader 
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <VerifiedIcon color="success" />
              <Typography variant="h6">
                Current Licenses ({licenseData.system_licenses.length})
              </Typography>
            </Box>
          }
          subheader="Active licenses issued by the system - trusted and verified"
        />
        <CardContent>
          {licenseData.system_licenses.length === 0 ? (
            <Alert severity="info">
              No existing licenses found in the system for this person.
            </Alert>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>License Number</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Categories</TableCell>
                  <TableCell>Issue Date</TableCell>
                  <TableCell>Expiry Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Location</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {licenseData.system_licenses.map((license, index) => (
                  <TableRow key={license.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {license.license_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={license.license_type === 'LEARNERS_PERMIT' ? 'Learner\'s Permit' : 'Driver\'s License'}
                        size="small"
                        color={license.license_type === 'LEARNERS_PERMIT' ? 'warning' : 'primary'}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        {license.categories.map(cat => (
                          <Chip key={cat} label={cat} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>{license.issue_date}</TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        color={isLicenseExpired(license.expiry_date) ? 'error' : 'text.primary'}
                      >
                        {license.expiry_date}
                        {isLicenseExpired(license.expiry_date) && ' (EXPIRED)'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={license.status}
                        size="small"
                        color={getLicenseStatusColor(license)}
                      />
                    </TableCell>
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
      </Card>

      {/* External Licenses (Require Verification) */}
      <Card>
        <CardHeader 
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <WarningIcon color="warning" />
              <Typography variant="h6">
                External Licenses ({licenseData.external_licenses.length})
              </Typography>
            </Box>
          }
          subheader={
            [ApplicationType.TEMPORARY_LICENSE, ApplicationType.RENEWAL].includes(currentApplicationType!) 
              ? "Add all your current licenses for temporary/renewal license processing"
              : "Manually added licenses that require clerk verification"
          }
        />
        <CardContent>
          {/* Info for TEMPORARY_LICENSE and RENEWAL applications */}
          {[ApplicationType.TEMPORARY_LICENSE, ApplicationType.RENEWAL].includes(currentApplicationType!) && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold">
                {currentApplicationType === ApplicationType.TEMPORARY_LICENSE ? 'Temporary License' : 'Renewal License'} Process
              </Typography>
              <Typography variant="body2">
                Please add all your current licenses below. You can select multiple categories for each license. 
                This information will be used to {currentApplicationType === ApplicationType.TEMPORARY_LICENSE ? 'issue temporary license(s)' : 'renew your license'}.
              </Typography>
            </Alert>
          )}

          {licenseData.external_licenses.map((license, index) => (
            <Box 
              key={license.id || index} 
              sx={{ 
                mb: 3, 
                p: 2, 
                border: '1px solid #e0e0e0', 
                borderRadius: 1, 
                backgroundColor: license.verified ? '#f0f8f0' : '#fff8e1' 
              }}
            >
              <Box display="flex" justifyContent="between" alignItems="start" sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    External License #{index + 1}
                    {license.is_auto_populated && (
                      <Chip 
                        label="REQUIRED" 
                        size="small" 
                        color="warning" 
                        icon={<InfoIcon />}
                        sx={{ ml: 1 }}
                      />
                    )}
                    {license.verified && (
                      <Chip 
                        label="VERIFIED" 
                        size="small" 
                        color="success" 
                        icon={<CheckCircleIcon />}
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Typography>
                  {license.is_auto_populated && (
                    <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
                      ⚠️ This license is required for {license.required_for_category} category
                    </Typography>
                  )}
                </Box>
                {!license.is_auto_populated && (
                  <IconButton 
                    color="error" 
                    size="small"
                    onClick={() => removeExternalLicense(index)}
                    disabled={disabled}
                    title="Remove external license"
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>

              <Grid container spacing={2}>
                {/* License Number */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="License Number"
                    value={license.license_number}
                    onChange={(e) => updateExternalLicense(index, 'license_number', formatLicenseNumber(e.target.value))}
                    disabled={disabled}
                    required
                  />
                </Grid>

                {/* License Type - Different logic for different application types */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>License Type</InputLabel>
                    <Select
                      value={license.license_type}
                      label="License Type"
                      onChange={(e) => updateExternalLicense(index, 'license_type', e.target.value)}
                      disabled={disabled || license.is_auto_populated || 
                               (currentApplicationType === ApplicationType.NEW_LICENSE && !license.is_auto_populated)}
                      sx={{
                        backgroundColor: (license.is_auto_populated || 
                                        (currentApplicationType === ApplicationType.NEW_LICENSE && !license.is_auto_populated)) 
                                        ? '#f5f5f5' : 'inherit',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: (license.is_auto_populated || 
                                      (currentApplicationType === ApplicationType.NEW_LICENSE && !license.is_auto_populated)) 
                                      ? '#ffa726' : 'inherit'
                        }
                      }}
                    >
                      <MenuItem value="LEARNERS_PERMIT">Learner's Permit</MenuItem>
                      <MenuItem value="DRIVERS_LICENSE">Driver's License</MenuItem>
                    </Select>
                    {license.is_auto_populated && (
                      <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, fontWeight: 600 }}>
                        🔒 Type locked for required license
                      </Typography>
                    )}
                    {currentApplicationType === ApplicationType.NEW_LICENSE && !license.is_auto_populated && (
                      <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, fontWeight: 600 }}>
                        🔒 Driver's License required for NEW_LICENSE applications
                      </Typography>
                    )}
                    {[ApplicationType.TEMPORARY_LICENSE, ApplicationType.RENEWAL].includes(currentApplicationType!) && (
                      <Typography variant="caption" color="info.main" sx={{ mt: 0.5, fontWeight: 600 }}>
                        ℹ️ Select the type of license you currently hold
                      </Typography>
                    )}
                  </FormControl>
                </Grid>

                {/* Categories - LOCKED for auto-populated */}
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Categories</InputLabel>
                    <Select
                      multiple
                      value={license.categories}
                      label="Categories"
                      onChange={(e) => updateExternalLicense(index, 'categories', e.target.value)}
                      disabled={disabled || license.is_auto_populated}
                      sx={{
                        backgroundColor: license.is_auto_populated ? '#f5f5f5' : 'inherit',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: license.is_auto_populated ? '#ffa726' : 'inherit'
                        }
                      }}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(selected as LicenseCategory[]).map((value) => {
                            if (license.license_type === 'LEARNERS_PERMIT') {
                              // For learner's permits, show the code number
                              const codeNumber = value; // '1', '2', or '3'
                              return (
                                <Chip key={value} label={`Code ${codeNumber}`} size="small" />
                              );
                            } else {
                              // For regular licenses, show the category
                              return (
                                <Chip key={value} label={value} size="small" />
                              );
                            }
                          })}
                        </Box>
                      )}
                    >
                      {license.license_type === 'LEARNERS_PERMIT' ? [
                        // Show learner's permit codes for learner's permits
                        <MenuItem key={LicenseCategory.LEARNERS_1} value={LicenseCategory.LEARNERS_1}>
                          Code 1 - Motor cycles, motor tricycles and motor quadricycles with engine of any capacity
                        </MenuItem>,
                        <MenuItem key={LicenseCategory.LEARNERS_2} value={LicenseCategory.LEARNERS_2}>
                          Code 2 - Light motor vehicles, other than motor cycles, motor tricycles or motor quadricycles
                        </MenuItem>,
                        <MenuItem key={LicenseCategory.LEARNERS_3} value={LicenseCategory.LEARNERS_3}>
                          Code 3 - Any motor vehicle other than motor cycles, motor tricycles or motor quadricycles
                        </MenuItem>
                      ] : (
                        // Show regular license categories for driver's licenses
                        Object.values(LicenseCategory).filter(cat => !['1', '2', '3'].includes(cat)).map((category) => (
                          <MenuItem key={category} value={category}>
                            {category} - {LICENSE_CATEGORY_RULES[category]?.description || 'Standard license category'}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                    {license.is_auto_populated && (
                      <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, fontWeight: 600 }}>
                        🔒 Categories locked for required license: {license.required_for_category ? `Required for ${license.required_for_category}` : 'System required'}
                        <br />
                        Debug: categories={JSON.stringify(license.categories)}, license_type={license.license_type}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>

                {/* Date fields side by side */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Issue Date"
                    type="date"
                    value={license.issue_date}
                    onChange={(e) => handleDateChange(index, 'issue_date', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                      min: getDateConstraints().min,
                      max: getDateConstraints().max
                    }}
                    disabled={disabled}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Expiry Date"
                    type="date"
                    value={license.expiry_date}
                    onChange={(e) => handleDateChange(index, 'expiry_date', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                      min: getDateConstraints().min,
                      max: getDateConstraints().max
                    }}
                    disabled={disabled}
                  />
                </Grid>

                {/* License Restrictions - Multi-select with only specific options */}
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>License Restrictions</InputLabel>
                    <Select
                      multiple
                      value={license.restrictions ? license.restrictions.split(',').map(r => r.trim()).filter(r => r) : []}
                      label="License Restrictions"
                      onChange={(e) => {
                        const selectedRestrictions = Array.isArray(e.target.value) ? e.target.value : [];
                        updateExternalLicense(index, 'restrictions', selectedRestrictions.join(', '));
                      }}
                      disabled={disabled}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(selected as string[]).map((value) => (
                            <Chip key={value} label={
                              value === 'CORRECTIVE_LENSES' ? 'Corrective Lenses' :
                              value === 'MODIFIED_VEHICLE_ONLY' ? 'Modified Vehicle' :
                              value
                            } size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      <MenuItem value="CORRECTIVE_LENSES">
                        Corrective Lenses Required - Must wear glasses or contact lenses while driving
                      </MenuItem>
                      <MenuItem value="MODIFIED_VEHICLE_ONLY">
                        Modified Vehicle Required - Vehicle must have disability modifications/adaptations
                      </MenuItem>
                    </Select>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      Select all restrictions that apply to this license
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
                        onChange={(e) => updateExternalLicense(index, 'verified', e.target.checked)}
                        disabled={disabled}
                      />
                    }
                    label="I have verified this license is authentic and valid"
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
                    onChange={(e) => updateExternalLicense(index, 'verification_notes', e.target.value)}
                    disabled={disabled}
                    placeholder="Note how the license was verified (physical inspection, phone verification, etc.)"
                  />
                </Grid>
              </Grid>
            </Box>
          ))}

          {/* Add External License Button */}
          <Button
            variant="outlined"
            onClick={addExternalLicense}
            startIcon={<AddIcon />}
            disabled={disabled}
            sx={{ mt: 2 }}
          >
            Add External License
          </Button>

          {licenseData.external_licenses.length === 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              No external licenses added. Click "Add External License" if the person has licenses from other sources.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {(licenseData.system_licenses.length > 0 || licenseData.external_licenses.length > 0) && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2" fontWeight="bold">
            License Summary:
          </Typography>
          <Typography variant="body2">
            • System licenses: {licenseData.system_licenses.length} (trusted)
            <br />
            • External licenses: {licenseData.external_licenses.filter(l => l.verified).length} verified, {licenseData.external_licenses.filter(l => !l.verified).length} pending verification
            <br />
            • All categories: {licenseData.all_license_categories.join(', ') || 'None'}
            {licenseData.requires_verification && (
              <>
                <br />
                <strong>⚠️ External licenses require verification before proceeding</strong>
              </>
            )}
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default LicenseVerificationSection; 