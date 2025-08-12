/**
 * Foreign License Capture Form Component
 * Handles capture of foreign license details for conversion applications
 * Similar structure to LicenseCaptureForm but focused on foreign license data
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  IconButton,
  Alert,
  Chip,
  FormHelperText
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Language as LanguageIcon,
  Assignment as AssignmentIcon,
  DateRange as DateRangeIcon,
  Flag as FlagIcon
} from '@mui/icons-material';
import { LicenseCategory } from '../../types';
import { useDebounceValidation } from '../../hooks/useDebounceValidation';

export interface ForeignLicense {
  id: string; // temp ID for form management
  country_of_issue: string;
  license_number: string;
  license_category_foreign: string; // Foreign country's license code/category
  license_category_madagascar: LicenseCategory; // Madagascar equivalent category
  issue_date: string;
  expiry_date: string;
  verified: boolean;
  verification_notes?: string;
}

export interface ForeignLicenseCaptureData {
  foreign_licenses: ForeignLicense[];
}

interface ForeignLicenseCaptureFormProps {
  value: ForeignLicenseCaptureData | null;
  onChange: (data: ForeignLicenseCaptureData | null) => void;
  disabled?: boolean;
  personBirthDate?: string; // For age validation
}

const ForeignLicenseCaptureForm: React.FC<ForeignLicenseCaptureFormProps> = ({
  value,
  onChange,
  disabled = false,
  personBirthDate
}) => {
  const captureData = value || { foreign_licenses: [] };
  const [fieldStates, setFieldStates] = useState<{ [key: string]: 'valid' | 'invalid' | 'required' | 'default' }>({});

  // Common countries for foreign license conversion
  const getCommonCountries = () => {
    return [
      { code: 'ZAF', name: 'South Africa' },
      { code: 'FRA', name: 'France' },
      { code: 'GBR', name: 'United Kingdom' },
      { code: 'USA', name: 'United States' },
      { code: 'CAN', name: 'Canada' },
      { code: 'AUS', name: 'Australia' },
      { code: 'DEU', name: 'Germany' },
      { code: 'ITA', name: 'Italy' },
      { code: 'ESP', name: 'Spain' },
      { code: 'BEL', name: 'Belgium' },
      { code: 'NLD', name: 'Netherlands' },
      { code: 'CHE', name: 'Switzerland' },
      { code: 'OTHER', name: 'Other' }
    ];
  };

  // Available Madagascar license categories for conversion
  const getAvailableMadagascarCategories = () => {
    return [
      { value: LicenseCategory.A1, label: 'A1 - Motorcycle up to 125cc' },
      { value: LicenseCategory.A2, label: 'A2 - Motorcycle up to 35kW' },
      { value: LicenseCategory.A, label: 'A - Motorcycle (unrestricted)' },
      { value: LicenseCategory.B1, label: 'B1 - Quadricycle' },
      { value: LicenseCategory.B, label: 'B - Light Motor Vehicle' },
      { value: LicenseCategory.B2, label: 'B2 - Agricultural Tractor' },
      { value: LicenseCategory.BE, label: 'BE - Light Vehicle with Trailer' },
      { value: LicenseCategory.C1, label: 'C1 - Medium Goods Vehicle' },
      { value: LicenseCategory.C, label: 'C - Heavy Goods Vehicle' },
      { value: LicenseCategory.C1E, label: 'C1E - Medium Goods with Trailer' },
      { value: LicenseCategory.CE, label: 'CE - Heavy Goods with Trailer' },
      { value: LicenseCategory.D1, label: 'D1 - Minibus' },
      { value: LicenseCategory.D, label: 'D - Bus/Coach' },
      { value: LicenseCategory.D2, label: 'D2 - Large Bus' }
    ];
  };

  // Debounced validation hook
  const debouncedValidationHook = useDebounceValidation(
    (fieldName: string, value: any, stepIndex: number) => {
      const [actualFieldName, licenseId] = fieldName.includes('|') ? fieldName.split('|') : [fieldName, stepIndex.toString()];
      const result = validateField(licenseId, actualFieldName, value);
      const fieldKey = `${licenseId}-${actualFieldName}`;
      
      setFieldStates(prev => ({
        ...prev,
        [fieldKey]: result.state as 'valid' | 'invalid' | 'required' | 'default'
      }));
      
      return result;
    },
    300 // 300ms delay
  );

  // Helper function to call debounced validation
  const debouncedValidation = (fieldName: string, value: any, licenseId: string) => {
    return debouncedValidationHook.debouncedValidation(`${fieldName}|${licenseId}`, value, 0);
  };

  // Field validation
  const validateField = (licenseId: string, fieldName: string, value: any) => {
    switch (fieldName) {
      case 'country_of_issue':
        if (!value || value.trim() === '') {
          return { isValid: false, state: 'required', errorMessage: 'Country of issue is required' };
        }
        return { isValid: true, state: 'valid' };

      case 'license_number':
        if (!value || value.trim() === '') {
          return { isValid: false, state: 'required', errorMessage: 'Foreign license number is required' };
        }
        return { isValid: true, state: 'valid' };

      case 'license_category_foreign':
        if (!value || value.trim() === '') {
          return { isValid: false, state: 'required', errorMessage: 'Foreign license category is required' };
        }
        return { isValid: true, state: 'valid' };

      case 'license_category_madagascar':
        if (!value) {
          return { isValid: false, state: 'required', errorMessage: 'Madagascar equivalent category is required' };
        }
        return { isValid: true, state: 'valid' };

      case 'issue_date':
        if (!value || value === '') {
          return { isValid: false, state: 'required', errorMessage: 'Issue date is required' };
        }
        
        const dateObj = new Date(value);
        const currentDate = new Date();
        
        if (isNaN(dateObj.getTime())) {
          return { isValid: false, state: 'invalid', errorMessage: 'Invalid date format' };
        }
        
        if (dateObj > currentDate) {
          return { isValid: false, state: 'invalid', errorMessage: 'Issue date cannot be in the future' };
        }
        
        return { isValid: true, state: 'valid' };

      case 'expiry_date':
        if (!value || value === '') {
          return { isValid: false, state: 'required', errorMessage: 'Expiry date is required' };
        }
        
        const expiryDateObj = new Date(value);
        
        if (isNaN(expiryDateObj.getTime())) {
          return { isValid: false, state: 'invalid', errorMessage: 'Invalid date format' };
        }
        
        return { isValid: true, state: 'valid' };

      default:
        return { isValid: true, state: 'default' };
    }
  };

  // Field styling helper
  const getFieldStyling = (licenseId: string, fieldName: string, isRequired: boolean = true) => {
    const fieldKey = `${licenseId}-${fieldName}`;
    const fieldState = fieldStates[fieldKey] || 'default';
    
    switch (fieldState) {
      case 'required':
        return {
          sx: {
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: '#ff9800', // Orange
                borderWidth: '2px',
              },
            },
          },
          error: false,
          helperText: 'This field is required',
          color: 'warning' as const,
        };
      case 'invalid':
        return {
          sx: {
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: '#f44336', // Red
                borderWidth: '2px',
              },
            },
          },
          error: true,
          color: 'error' as const,
        };
      case 'valid':
        return {
          sx: {
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: '#4caf50', // Green
                borderWidth: '2px',
              },
            },
          },
          error: false,
          color: 'success' as const,
        };
      default:
        return {
          sx: {},
          error: false,
          color: 'primary' as const,
        };
    }
  };

  // Select styling helper
  const getSelectStyling = (licenseId: string, fieldName: string, isRequired: boolean = true) => {
    const fieldKey = `${licenseId}-${fieldName}`;
    const fieldState = fieldStates[fieldKey] || 'default';
    
    switch (fieldState) {
      case 'required':
        return {
          sx: {
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: '#ff9800', // Orange
                borderWidth: '2px',
              },
            },
          },
          error: false,
        };
      case 'invalid':
        return {
          sx: {
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: '#f44336', // Red
                borderWidth: '2px',
              },
            },
          },
          error: true,
        };
      case 'valid':
        return {
          sx: {
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: '#4caf50', // Green
                borderWidth: '2px',
              },
            },
          },
          error: false,
        };
      default:
        return {
          sx: {},
          error: false,
        };
    }
  };

  // Update capture data
  const updateCaptureData = (newData: ForeignLicenseCaptureData) => {
    onChange(newData);
  };

  // Add new foreign license
  const addForeignLicense = () => {
    const newLicense: ForeignLicense = {
      id: `foreign-license-${Date.now()}`,
      country_of_issue: '',
      license_number: '',
      license_category_foreign: '',
      license_category_madagascar: '' as LicenseCategory,
      issue_date: '',
      expiry_date: '',
      verified: false,
      verification_notes: ''
    };

    updateCaptureData({
      foreign_licenses: [...captureData.foreign_licenses, newLicense]
    });
  };

  // Update foreign license
  const updateForeignLicense = (index: number, field: keyof ForeignLicense, value: any) => {
    const updatedLicenses = [...captureData.foreign_licenses];
    updatedLicenses[index] = {
      ...updatedLicenses[index],
      [field]: value
    };

    updateCaptureData({
      foreign_licenses: updatedLicenses
    });

    // Trigger real-time validation for the updated field
    const licenseId = updatedLicenses[index].id;
    debouncedValidation(field, value, licenseId);
  };

  // Remove foreign license
  const removeForeignLicense = (index: number) => {
    const updatedLicenses = captureData.foreign_licenses.filter((_, i) => i !== index);
    updateCaptureData({
      foreign_licenses: updatedLicenses
    });
  };

  // Initialize with one license if empty
  useEffect(() => {
    if (captureData.foreign_licenses.length === 0) {
      addForeignLicense();
    }
  }, []);

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
        Foreign License Details
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enter details for each foreign license you want to convert to a Madagascar license
      </Typography>

      {captureData.foreign_licenses.map((license, index) => (
        <Card 
          key={license.id}
          elevation={0}
          sx={{ 
            mb: 2,
            bgcolor: 'white',
            boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
            borderRadius: 2
          }}
        >
          <CardHeader
            sx={{ p: 1.5 }}
            title={
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center" gap={1}>
                  <FlagIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle1" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                    Foreign License #{index + 1}
                  </Typography>
                  {license.verified && (
                    <Chip label="Verified" size="small" color="success" />
                  )}
                </Box>
                {captureData.foreign_licenses.length > 1 && (
                  <IconButton
                    size="small"
                    onClick={() => removeForeignLicense(index)}
                    disabled={disabled}
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            }
          />
          <CardContent sx={{ p: 1.5, pt: 0 }}>
            <Grid container spacing={2}>
              {/* Country of Issue */}
              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth 
                  required 
                  size="small"
                  {...getSelectStyling(license.id, 'country_of_issue')}
                >
                  <InputLabel>Country of Issue</InputLabel>
                  <Select
                    value={license.country_of_issue}
                    onChange={(e) => updateForeignLicense(index, 'country_of_issue', e.target.value)}
                    label="Country of Issue"
                    disabled={disabled}
                    size="small"
                  >
                    {getCommonCountries().map((country) => (
                      <MenuItem key={country.code} value={country.code}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <LanguageIcon fontSize="small" />
                          {country.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  {!license.country_of_issue && (
                    <FormHelperText sx={{ color: '#ff9800' }}>This field is required</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              {/* Foreign License Number */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Foreign License Number"
                  value={license.license_number}
                  onChange={(e) => updateForeignLicense(index, 'license_number', e.target.value)}
                  disabled={disabled}
                  required
                  size="small"
                  placeholder="Enter your foreign license number"
                  {...getFieldStyling(license.id, 'license_number')}
                />
              </Grid>

              {/* Foreign License Category/Code */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Foreign License Category/Code"
                  value={license.license_category_foreign}
                  onChange={(e) => updateForeignLicense(index, 'license_category_foreign', e.target.value)}
                  disabled={disabled}
                  required
                  size="small"
                  placeholder="e.g., Class C, Category B, etc."
                  helperText="Enter the category/class as shown on your foreign license"
                  {...getFieldStyling(license.id, 'license_category_foreign')}
                />
              </Grid>

              {/* Madagascar Equivalent Category */}
              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth 
                  required 
                  size="small"
                  {...getSelectStyling(license.id, 'license_category_madagascar')}
                >
                  <InputLabel>Madagascar Equivalent Category</InputLabel>
                  <Select
                    value={license.license_category_madagascar}
                    onChange={(e) => updateForeignLicense(index, 'license_category_madagascar', e.target.value)}
                    label="Madagascar Equivalent Category"
                    disabled={disabled}
                    size="small"
                  >
                    {getAvailableMadagascarCategories().map((category) => (
                      <MenuItem key={category.value} value={category.value}>
                        {category.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {!license.license_category_madagascar && (
                    <FormHelperText sx={{ color: '#ff9800' }}>This field is required</FormHelperText>
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
                  onChange={(e) => updateForeignLicense(index, 'issue_date', e.target.value)}
                  disabled={disabled}
                  required
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  {...getFieldStyling(license.id, 'issue_date')}
                />
              </Grid>

              {/* Expiry Date */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Expiry Date"
                  value={license.expiry_date}
                  onChange={(e) => updateForeignLicense(index, 'expiry_date', e.target.value)}
                  disabled={disabled}
                  required
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  {...getFieldStyling(license.id, 'expiry_date')}
                />
              </Grid>

              {/* Verification Notes */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Verification Notes (Optional)"
                  value={license.verification_notes}
                  onChange={(e) => updateForeignLicense(index, 'verification_notes', e.target.value)}
                  disabled={disabled}
                  size="small"
                  placeholder="Any additional notes about this foreign license..."
                  {...getFieldStyling(license.id, 'verification_notes', false)}
                />
              </Grid>

              {/* Expiry Warning */}
              {license.expiry_date && (
                (() => {
                  const expiryDate = new Date(license.expiry_date);
                  const today = new Date();
                  const isExpired = expiryDate < today;
                  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  
                  if (isExpired) {
                    return (
                      <Grid item xs={12}>
                        <Alert severity="error">
                          <Typography variant="body2">
                            <strong>Expired License:</strong> This foreign license expired on {license.expiry_date}. 
                            Additional documentation may be required for conversion.
                          </Typography>
                        </Alert>
                      </Grid>
                    );
                  } else if (daysUntilExpiry <= 30) {
                    return (
                      <Grid item xs={12}>
                        <Alert severity="warning">
                          <Typography variant="body2">
                            <strong>License Expires Soon:</strong> This foreign license expires in {daysUntilExpiry} days. 
                            Consider completing the conversion process promptly.
                          </Typography>
                        </Alert>
                      </Grid>
                    );
                  }
                  return null;
                })()
              )}
            </Grid>
          </CardContent>
        </Card>
      ))}

      {/* Add License Button */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={addForeignLicense}
          disabled={disabled}
          size="small"
        >
          Add Another Foreign License
        </Button>
      </Box>

      {/* Information Card */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Note:</strong> You must provide the original foreign license documents and supporting materials 
          for verification. Theory or practical tests may be required depending on the country of issue and license category.
        </Typography>
      </Alert>
    </Box>
  );
};

export default ForeignLicenseCaptureForm;

// Export validation function for use in parent component
export const validateForeignLicenseCaptureData = (data: ForeignLicenseCaptureData): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (!data.foreign_licenses || data.foreign_licenses.length === 0) {
    errors.push('At least one foreign license is required');
    return { isValid: false, errors };
  }
  
  data.foreign_licenses.forEach((license, index) => {
    if (!license.country_of_issue) {
      errors.push(`License ${index + 1}: Country of issue is required`);
    }
    if (!license.license_number) {
      errors.push(`License ${index + 1}: License number is required`);
    }
    if (!license.license_category_foreign) {
      errors.push(`License ${index + 1}: Foreign license category is required`);
    }
    if (!license.license_category_madagascar) {
      errors.push(`License ${index + 1}: Madagascar equivalent category is required`);
    }
    if (!license.issue_date) {
      errors.push(`License ${index + 1}: Issue date is required`);
    }
    if (!license.expiry_date) {
      errors.push(`License ${index + 1}: Expiry date is required`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
