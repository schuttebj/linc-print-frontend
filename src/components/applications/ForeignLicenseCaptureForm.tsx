/**
 * Foreign License Capture Form Component
 * Handles capture of foreign license details for conversion applications
 * Similar structure to LicenseCaptureForm but focused on foreign license data
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
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
  FormHelperText,
  Tooltip,
  Divider,
  FormControlLabel,
  Checkbox,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Language as LanguageIcon,
  Assignment as AssignmentIcon,
  DateRange as DateRangeIcon,
  Flag as FlagIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  VerifiedUser as VerifiedIcon
} from '@mui/icons-material';
import { LicenseCategory } from '../../types';
import { useDebounceValidation } from '../../hooks/useDebounceValidation';
import { lookupService, Country } from '../../services/lookupService';

export interface ForeignLicense {
  id: string; // temp ID for form management
  country_of_issue: string;
  license_category_foreign: string; // Foreign country's license code/category
  license_category_madagascar: LicenseCategory; // Madagascar equivalent category
  issue_date: string;
  restrictions: {
    driver_restrictions: string[];
    vehicle_restrictions: string[];
  }; // License restrictions in structured format
  verified: boolean;
}

export interface ForeignLicenseCaptureData {
  foreign_licenses: ForeignLicense[];
}

interface ForeignLicenseCaptureFormProps {
  value: ForeignLicenseCaptureData | null;
  onChange: (data: ForeignLicenseCaptureData | null) => void;
  disabled?: boolean;
  personBirthDate?: string; // For age validation
  personId?: string; // For loading existing licenses
}

const ForeignLicenseCaptureForm: React.FC<ForeignLicenseCaptureFormProps> = ({
  value,
  onChange,
  disabled = false,
  personBirthDate,
  personId
}) => {
  const [captureData, setCaptureData] = useState<ForeignLicenseCaptureData>(value || { foreign_licenses: [] });
  const [fieldStates, setFieldStates] = useState<{ [key: string]: 'valid' | 'invalid' | 'required' | 'default' }>({});
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);

  // Load countries from lookup service
  const loadCountries = async () => {
    setLoadingCountries(true);
    try {
      const countryData = await lookupService.getCountries();
      // Sort countries alphabetically by label
      const sortedCountries = countryData.sort((a, b) => a.label.localeCompare(b.label));
      setCountries(sortedCountries);
    } catch (error) {
      console.error('Error loading countries:', error);
      // Fallback to basic list (also sorted)
      setCountries([
        { value: 'FR', label: 'France' },
        { value: 'MG', label: 'Madagascar' },
        { value: 'OTHER', label: 'Other' },
        { value: 'ZA', label: 'South Africa' },
        { value: 'GB', label: 'United Kingdom' },
        { value: 'US', label: 'United States' }
      ].sort((a, b) => a.label.localeCompare(b.label)));
    } finally {
      setLoadingCountries(false);
    }
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
    setCaptureData(newData);
    onChange(newData);
  };

  // Add new foreign license
  const addForeignLicense = () => {
    const newLicense: ForeignLicense = {
      id: `foreign-license-${Date.now()}`,
      country_of_issue: '',
      license_category_foreign: '',
      license_category_madagascar: '' as LicenseCategory,
      issue_date: '',
      restrictions: {
        driver_restrictions: ['00'], // Default to "00 - None"
        vehicle_restrictions: ['00']  // Default to "00 - None"
      },
      verified: false
    };

    updateCaptureData({
      foreign_licenses: [...captureData.foreign_licenses, newLicense]
    });
  };

  // Helper function to get restriction display name
  const getRestrictionDisplayName = (code: string): string => {
    // Driver restrictions mapping
    const driverRestrictionMap: Record<string, string> = {
      '00': 'None',
      '01': 'Corrective Lenses Required',
      '02': 'Artificial Limb/Prosthetics'
    };
    
    // Vehicle restrictions mapping
    const vehicleRestrictionMap: Record<string, string> = {
      '00': 'None',
      '01': 'Automatic Transmission Only',
      '02': 'Electric Powered Vehicles Only',
      '03': 'Vehicles Adapted for Physical Disabilities',
      '04': 'Tractor Vehicles Only',
      '05': 'Industrial/Agriculture Vehicles Only'
    };
    
    return driverRestrictionMap[code] || vehicleRestrictionMap[code] || `Restriction ${code}`;
  };

  // Helper function to manage automatic "00 - None" default logic
  const updateRestrictions = (licenseIndex: number, restrictionType: 'driver_restrictions' | 'vehicle_restrictions', selectedValues: string[]) => {
    const license = captureData.foreign_licenses[licenseIndex];
    
    // If no values selected or only "00" is selected when others are added, automatically add "00"
    let finalValues = [...selectedValues];
    
    // If selecting other restrictions while "00" is present, remove "00"
    if (finalValues.length > 1 && finalValues.includes('00')) {
      finalValues = finalValues.filter(value => value !== '00');
    }
    
    // If no restrictions selected, automatically add "00" as default
    if (finalValues.length === 0) {
      finalValues = ['00'];
    }
    
    // Update the license with new restrictions
    updateForeignLicense(licenseIndex, 'restrictions', {
      ...license.restrictions,
      [restrictionType]: finalValues
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



  // Load countries on component mount
  useEffect(() => {
    loadCountries();
  }, []);

  // Initialize data from props
  useEffect(() => {
    if (value) {
      // Ensure existing data has default restrictions if empty
      const processedValue = {
        ...value,
        foreign_licenses: value.foreign_licenses.map(license => ({
          ...license,
          restrictions: {
            driver_restrictions: license.restrictions?.driver_restrictions?.length > 0 
              ? license.restrictions.driver_restrictions 
              : ['00'],
            vehicle_restrictions: license.restrictions?.vehicle_restrictions?.length > 0 
              ? license.restrictions.vehicle_restrictions 
              : ['00']
          }
        }))
      };
      setCaptureData(processedValue);
    }
  }, [value]);

  // Initialize with one license if empty
  useEffect(() => {
    if (captureData.foreign_licenses.length === 0) {
      addForeignLicense();
    }
  }, []);

  return (
    <>
      {captureData.foreign_licenses.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2, py: 1 }}>
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            No foreign licenses added yet. Click "Add Foreign License" to get started.
          </Typography>
        </Alert>
      ) : null}

        {/* Foreign License List */}
        {captureData.foreign_licenses.map((license, index) => (
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
                  Foreign License {index + 1}
                </Typography>
                <Chip
                  icon={license.verified ? <CheckCircleIcon /> : <WarningIcon />}
                  label={license.verified ? 'Verified' : 'Pending'}
                  color={license.verified ? 'success' : 'warning'}
                  size="small"
                  sx={{ fontSize: '0.65rem', height: '20px' }}
                />
              </Box>
              {/* Only show delete button for additional licenses (not the first one) */}
              {index > 0 && (
                <Tooltip title="Remove this foreign license">
                  <IconButton
                    onClick={() => removeForeignLicense(index)}
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
              {/* Country of Issue */}
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={countries}
                  getOptionLabel={(option) => option.label}
                  value={countries.find(country => country.value === license.country_of_issue) || null}
                  onChange={(event, newValue) => {
                    updateForeignLicense(index, 'country_of_issue', newValue?.value || '');
                  }}
                  disabled={disabled || loadingCountries}
                  loading={loadingCountries}
                  size="small"
                  componentsProps={{
                    popper: {
                      sx: { zIndex: 1200 } // Above chips (1100) but below modals (1300+)
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Country of Issue"
                      required
                      {...getFieldStyling(license.id, 'country_of_issue')}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: <LanguageIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />,
                        endAdornment: (
                          <>
                            {loadingCountries ? <div>Loading...</div> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                      onBlur={() => debouncedValidation('country_of_issue', license.country_of_issue, license.id)}
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} display="flex" alignItems="center" gap={1}>
                      <LanguageIcon fontSize="small" />
                      {option.label}
                    </Box>
                  )}
                />
              </Grid>

              {/* Foreign License Category/Code */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Foreign License Category/Code"
                  value={license.license_category_foreign}
                  onChange={(e) => updateForeignLicense(index, 'license_category_foreign', e.target.value)}
                  onBlur={() => debouncedValidation('license_category_foreign', license.license_category_foreign, license.id)}
                  disabled={disabled}
                  required
                  size="small"
                  placeholder="e.g., Class C, Category B, etc."
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
                    onBlur={() => debouncedValidation('license_category_madagascar', license.license_category_madagascar, license.id)}
                    label="Madagascar Equivalent Category"
                    disabled={disabled}
                    size="small"
                    MenuProps={{
                      PaperProps: {
                        sx: { zIndex: 1200 } // Above chips (1100) but below modals (1300+)
                      }
                    }}
                  >
                    {getAvailableMadagascarCategories().map((category) => (
                      <MenuItem key={category.value} value={category.value}>
                        {category.label}
                      </MenuItem>
                    ))}
                  </Select>
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
                  onBlur={() => debouncedValidation('issue_date', license.issue_date, license.id)}
                  disabled={disabled}
                  required
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{
                    max: new Date().toISOString().split('T')[0], // Prevent future dates
                    min: '1900-01-01' // Reasonable minimum date
                  }}
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
                    value={license.restrictions?.driver_restrictions || ['00']}
                    label="Driver Restrictions"
                    onChange={(e) => updateRestrictions(index, 'driver_restrictions', Array.isArray(e.target.value) ? e.target.value : [])}
                    disabled={disabled}
                    sx={{
                      zIndex: 100, // Below chips (1100) so delete buttons work
                      position: 'relative'
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: { zIndex: 1200 } // Above chips (1100) when dropdown is open
                      }
                    }}
                    renderValue={(selected) => (
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          flexWrap: 'wrap', 
                          gap: 0.5,
                          zIndex: 1100, // Above Select inputs (~1000) but below dropdowns (1200)
                          position: 'relative' // Ensure z-index takes effect
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }} // Prevent Select from opening when clicking on the Box
                      >
                        {(selected as string[]).map((value) => (
                          <Chip 
                            key={value} 
                            label={`${value} - ${getRestrictionDisplayName(value)}`}
                            size="small"
                            color="primary"
                            sx={{ 
                              fontSize: '0.65rem', 
                              height: '20px',
                              zIndex: 1100, // Above Select inputs (~1000) but below dropdowns (1200)
                              position: 'relative' // Ensure z-index takes effect
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onDelete={value !== '00' || selected.length > 1 ? (e) => {
                              if (e) {
                                e.preventDefault();
                                e.stopPropagation();
                              }
                              const newValues = selected.filter(v => v !== value);
                              updateRestrictions(index, 'driver_restrictions', newValues);
                            } : undefined}
                          />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="00">00 - None</MenuItem>
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
                    value={license.restrictions?.vehicle_restrictions || ['00']}
                    label="Vehicle Restrictions"
                    onChange={(e) => updateRestrictions(index, 'vehicle_restrictions', Array.isArray(e.target.value) ? e.target.value : [])}
                    disabled={disabled}
                    sx={{
                      zIndex: 100, // Below chips (1100) so delete buttons work
                      position: 'relative'
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: { zIndex: 1200 } // Above chips (1100) when dropdown is open
                      }
                    }}
                    renderValue={(selected) => (
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          flexWrap: 'wrap', 
                          gap: 0.5,
                          zIndex: 1100, // Above Select inputs (~1000) but below dropdowns (1200)
                          position: 'relative' // Ensure z-index takes effect
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }} // Prevent Select from opening when clicking on the Box
                      >
                        {(selected as string[]).map((value) => (
                          <Chip 
                            key={value} 
                            label={`${value} - ${getRestrictionDisplayName(value)}`}
                            size="small"
                            color="secondary"
                            sx={{ 
                              fontSize: '0.65rem', 
                              height: '20px',
                              zIndex: 1100, // Above Select inputs (~1000) but below dropdowns (1200)
                              position: 'relative' // Ensure z-index takes effect
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onDelete={value !== '00' || selected.length > 1 ? (e) => {
                              if (e) {
                                e.preventDefault();
                                e.stopPropagation();
                              }
                              const newValues = selected.filter(v => v !== value);
                              updateRestrictions(index, 'vehicle_restrictions', newValues);
                            } : undefined}
                          />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="00">00 - None</MenuItem>
                    <MenuItem value="01">01 - Automatic Transmission Only</MenuItem>
                    <MenuItem value="02">02 - Electric Powered Vehicles Only</MenuItem>
                    <MenuItem value="03">03 - Vehicles Adapted for Physical Disabilities</MenuItem>
                    <MenuItem value="04">04 - Tractor Vehicles Only</MenuItem>
                    <MenuItem value="05">05 - Industrial/Agriculture Vehicles Only</MenuItem>
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
                      onChange={(e) => updateForeignLicense(index, 'verified', e.target.checked)}
                      disabled={disabled}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                      I have physically verified this foreign license is authentic and valid
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
        onClick={addForeignLicense}
        startIcon={<AddIcon />}
        disabled={disabled}
        sx={{ mt: 2 }}
      >
        Add Foreign License
      </Button>
    </>
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
    if (!license.license_category_foreign) {
      errors.push(`License ${index + 1}: Foreign license category is required`);
    }
    if (!license.license_category_madagascar) {
      errors.push(`License ${index + 1}: Madagascar equivalent category is required`);
    }
    if (!license.issue_date) {
      errors.push(`License ${index + 1}: Issue date is required`);
    }
    if (!license.restrictions?.driver_restrictions?.length) {
      errors.push(`License ${index + 1}: Driver restrictions are required`);
    }
    if (!license.restrictions?.vehicle_restrictions?.length) {
      errors.push(`License ${index + 1}: Vehicle restrictions are required`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
