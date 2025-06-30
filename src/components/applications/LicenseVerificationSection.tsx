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
  LicenseStatus
} from '../../types';
import { applicationService } from '../../services/applicationService';

interface LicenseVerificationSectionProps {
  personId: string | null;
  value: LicenseVerificationData | null;
  onChange: (data: LicenseVerificationData | null) => void;
  disabled?: boolean;
}

const LicenseVerificationSection: React.FC<LicenseVerificationSectionProps> = ({
  personId,
  value,
  onChange,
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

  // Load system licenses when person changes
  useEffect(() => {
    if (personId) {
      loadSystemLicenses(personId);
    }
  }, [personId]);

  const loadSystemLicenses = async (personId: string) => {
    setLoading(true);
    setError('');
    
    try {
      // TODO: Replace with actual API call to get person's existing licenses
      // For now, mock some system licenses based on applications
      const mockSystemLicenses: SystemLicense[] = [
        // Example: Person has a learner's permit from previous application
        // {
        //   id: 'sys-001',
        //   license_number: 'LP12345678',
        //   license_type: 'LEARNERS_PERMIT',
        //   categories: [LicenseCategory.B],
        //   issue_date: '2024-01-15',
        //   expiry_date: '2025-01-15',
        //   status: LicenseStatus.ACTIVE,
        //   issuing_location: 'Antananarivo Central',
        //   application_id: 'app-001',
        //   verified: true,
        //   verification_source: 'SYSTEM'
        // }
      ];

      updateLicenseData({
        ...licenseData,
        person_id: personId,
        system_licenses: mockSystemLicenses,
        all_license_categories: getAllCategories(mockSystemLicenses, licenseData.external_licenses)
      });

    } catch (err) {
      setError('Failed to load existing licenses');
      console.error('Error loading system licenses:', err);
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
      verification_notes: ''
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

  const getLicenseStatusColor = (license: SystemLicense): 'success' | 'warning' | 'error' => {
    if (license.status === LicenseStatus.ACTIVE && !isLicenseExpired(license.expiry_date)) {
      return 'success';
    } else if (license.status === LicenseStatus.EXPIRED || isLicenseExpired(license.expiry_date)) {
      return 'warning';
    } else {
      return 'error';
    }
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
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  External License #{index + 1}
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
                <IconButton 
                  color="error" 
                  size="small"
                  onClick={() => removeExternalLicense(index)}
                  disabled={disabled}
                >
                  <DeleteIcon />
                </IconButton>
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

                {/* License Type */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>License Type</InputLabel>
                    <Select
                      value={license.license_type}
                      label="License Type"
                      onChange={(e) => updateExternalLicense(index, 'license_type', e.target.value)}
                      disabled={disabled}
                    >
                      <MenuItem value="LEARNERS_PERMIT">Learner's Permit</MenuItem>
                      <MenuItem value="DRIVERS_LICENSE">Driver's License</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Categories */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Categories</InputLabel>
                    <Select
                      multiple
                      value={license.categories}
                      label="Categories"
                      onChange={(e) => updateExternalLicense(index, 'categories', e.target.value)}
                      disabled={disabled}
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
                  </FormControl>
                </Grid>

                {/* Issuing Location */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Issuing Location"
                    value={license.issuing_location}
                    onChange={(e) => updateExternalLicense(index, 'issuing_location', e.target.value)}
                    disabled={disabled}
                    required
                  />
                </Grid>

                {/* Issue Date */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Issue Date"
                    type="date"
                    value={license.issue_date}
                    onChange={(e) => updateExternalLicense(index, 'issue_date', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    disabled={disabled}
                    required
                  />
                </Grid>

                {/* Expiry Date */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Expiry Date"
                    type="date"
                    value={license.expiry_date}
                    onChange={(e) => updateExternalLicense(index, 'expiry_date', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    disabled={disabled}
                    required
                    error={license.expiry_date && isLicenseExpired(license.expiry_date)}
                    helperText={license.expiry_date && isLicenseExpired(license.expiry_date) ? 'License is expired' : ''}
                  />
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