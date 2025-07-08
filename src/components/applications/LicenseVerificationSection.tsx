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

      updateLicenseData({
        ...licenseData,
        person_id: personId,
        system_licenses: currentLicenses,
        external_licenses: [], // Remove external licenses
        all_license_categories: getAllCategories(currentLicenses, [])
      });

    } catch (err: any) {
      console.error('Error loading licenses and applications:', err);
      
      updateLicenseData({
        ...licenseData,
        person_id: personId,
        system_licenses: [],
        external_licenses: [], // Remove external licenses
        all_license_categories: []
      });

      // Only show error if it's not a 404 (person has no licenses)
      if (err.response?.status !== 404) {
        setError('Failed to load existing licenses.');
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
    
    return Array.from(allCategories);
  };

  const updateLicenseData = (newData: LicenseVerificationData) => {
    const updatedData: LicenseVerificationData = {
      ...newData,
      all_license_categories: getAllCategories(newData.system_licenses, []),
      requires_verification: false // No external licenses means no verification needed
    };
    
    onChange(updatedData);
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
    </Box>
  );
};

export default LicenseVerificationSection; 