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
  ApplicationType
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
      // Call the actual API to get person's existing licenses
      const response = await applicationService.getPersonLicenses(personId);
      const systemLicenses: SystemLicense[] = response.system_licenses || [];

      console.log('Loaded system licenses:', systemLicenses);

      // Auto-populate external licenses for missing prerequisites
      const autoPopulatedExternalLicenses = createAutoPopulatedExternalLicenses(
        systemLicenses,
        licenseData.external_licenses
      );

      console.log('Auto-populated external licenses:', autoPopulatedExternalLicenses);

      updateLicenseData({
        ...licenseData,
        person_id: personId,
        system_licenses: systemLicenses,
        external_licenses: autoPopulatedExternalLicenses,
        all_license_categories: getAllCategories(systemLicenses, autoPopulatedExternalLicenses)
      });

    } catch (err: any) {
      console.error('Error loading system licenses:', err);
      // If API call fails, still try to auto-populate based on requirements
      const autoPopulatedExternalLicenses = createAutoPopulatedExternalLicenses(
        [],
        licenseData.external_licenses
      );

      updateLicenseData({
        ...licenseData,
        person_id: personId,
        system_licenses: [],
        external_licenses: autoPopulatedExternalLicenses,
        all_license_categories: getAllCategories([], autoPopulatedExternalLicenses)
      });

      // Only show error if it's not a 404 (person has no licenses)
      if (err.response?.status !== 404) {
        setError('Failed to load existing licenses. Auto-populating requirements based on license category.');
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
    const newExternalLicense: ExternalLicense = {
      id: tempId,
      license_number: '',
      license_type: 'LEARNERS_PERMIT',
      categories: [LicenseCategory.B],
      issue_date: '',
      expiry_date: '',
      issuing_location: '',
      verified: false,
      verification_source: 'MANUAL',
      verification_notes: '',
      // Manual license - not auto-populated
      is_auto_populated: false
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
    if (!currentLicenseCategory) {
      return existingExternalLicenses;
    }

    const categoryRules = LICENSE_CATEGORY_RULES[currentLicenseCategory];
    if (!categoryRules?.requires_existing?.length) {
      // No requirements - keep only manually added licenses (remove auto-populated ones)
      return existingExternalLicenses.filter(license => !license.is_auto_populated);
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

    // Find missing required categories - special handling for A'/A/B sharing
    const missingCategories: LicenseCategory[] = [];
    const baseCategories = [LicenseCategory.A_PRIME, LicenseCategory.A, LicenseCategory.B];
    
    categoryRules.requires_existing.forEach(requiredCat => {
      const isBaseCategory = baseCategories.includes(requiredCat as LicenseCategory);
      
      if (isBaseCategory) {
        // For base categories, check if any A'/A/B is available
        const hasAnyBase = baseCategories.some(baseCat => 
          systemCategories.has(baseCat) || manualExternalCategories.has(baseCat)
        );
        if (!hasAnyBase && !missingCategories.some(cat => baseCategories.includes(cat))) {
          // Add the most common one (B) if no base category exists
          missingCategories.push(LicenseCategory.B);
        }
      } else {
        // For non-base categories, exact match required
        if (!systemCategories.has(requiredCat as LicenseCategory) && 
            !manualExternalCategories.has(requiredCat as LicenseCategory)) {
          missingCategories.push(requiredCat as LicenseCategory);
        }
      }
    });

    // Create external license entries for missing categories
    const autoPopulatedLicenses = missingCategories.map((category, index) => {
      const tempId = `auto-${Date.now()}-${index}`;
      
      // Determine correct license type based on what's needed
      let licenseType: 'LEARNERS_PERMIT' | 'DRIVERS_LICENSE';
      
      if (currentApplicationType === ApplicationType.NEW_LICENSE) {
        // For NEW_LICENSE applications, check if the missing category allows learner's permit
        const categoryRules = LICENSE_CATEGORY_RULES[category];
        if (categoryRules.allows_learners_permit) {
          // Base categories (A', A, B) need learner's permit first
          licenseType = 'LEARNERS_PERMIT';
        } else {
          // Advanced categories (C, D, E) need existing driver's license
          licenseType = 'DRIVERS_LICENSE';
        }
      } else {
        // For other application types (RENEWAL, REPLACEMENT), they need existing driver's license
        licenseType = 'DRIVERS_LICENSE';
      }
      
      return {
        id: tempId,
        license_number: '',
        license_type: licenseType,
        categories: [category],
        issue_date: '',
        expiry_date: '',
        issuing_location: '',
        verified: false,
        verification_source: 'MANUAL' as const,
        verification_notes: '',
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
        License Verification
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        System records are trusted and don't require verification. External licenses require clerk verification.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* System Licenses (Trusted) */}
      <Card sx={{ mb: 3 }}>
        <CardHeader 
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <VerifiedIcon color="success" />
              <Typography variant="h6">
                System Licenses ({licenseData.system_licenses.length})
              </Typography>
            </Box>
          }
          subheader="Licenses found in the system - trusted and verified"
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
          subheader="Manually added licenses that require clerk verification"
        />
        <CardContent>
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

                {/* License Type - LOCKED for auto-populated */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>License Type</InputLabel>
                    <Select
                      value={license.license_type}
                      label="License Type"
                      onChange={(e) => updateExternalLicense(index, 'license_type', e.target.value)}
                      disabled={disabled || license.is_auto_populated}
                      sx={{
                        backgroundColor: license.is_auto_populated ? '#f5f5f5' : 'inherit',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: license.is_auto_populated ? '#ffa726' : 'inherit'
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
                  </FormControl>
                </Grid>

                {/* Categories - LOCKED for auto-populated */}
                <Grid item xs={12} md={6}>
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
                          {(selected as LicenseCategory[]).map((value) => (
                            <Chip key={value} label={value} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      {Object.values(LicenseCategory).map((cat) => (
                        <MenuItem key={cat} value={cat}>
                          {cat}
                        </MenuItem>
                      ))}
                    </Select>
                    {license.is_auto_populated && (
                      <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, fontWeight: 600 }}>
                        🔒 Category locked for required license
                      </Typography>
                    )}
                  </FormControl>
                </Grid>

                {/* Issuing Location */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Issuing Location</InputLabel>
                    <Select
                      value={license.issuing_location}
                      label="Issuing Location"
                      onChange={(e) => updateExternalLicense(index, 'issuing_location', e.target.value)}
                      disabled={disabled}
                    >
                      {locations.map((location) => (
                        <MenuItem key={location.id} value={location.name}>
                          {location.name} ({location.code})
                        </MenuItem>
                      ))}
                      <MenuItem value="Other">Other (Non-Madagascar)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Issue Date */}
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
                    required
                    helperText="Format: YYYY-MM-DD (between 1900 and current year)"
                  />
                </Grid>

                {/* Expiry Date */}
                <Grid item xs={12} md={6}>
                  {(() => {
                    const dateValidation = validateDateLogic(license);
                    return (
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
                        required
                        error={dateValidation.hasError}
                        helperText={dateValidation.message || 'Format: YYYY-MM-DD (must be future date for valid licenses)'}
                      />
                    );
                  })()}
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