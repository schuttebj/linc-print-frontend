/**
 * PersonLicensesView Component
 * Displays all licenses for a specific person with comprehensive details
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Stack,
  Button,
  IconButton,
  Tooltip,
  Divider,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Print as PrintIcon,
  CardGiftcard as CardIcon,
  History as HistoryIcon,
  Security as SecurityIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

import licenseService, { 
  License, 
  PersonLicensesSummary 
} from '../../services/licenseService';

interface PersonLicensesViewProps {
  personId: string;
  showHeader?: boolean;
  onCreateApplication?: () => void;
}

const PersonLicensesView: React.FC<PersonLicensesViewProps> = ({
  personId,
  showHeader = true,
  onCreateApplication
}) => {
  const navigate = useNavigate();

  // State management
  const [licenses, setLicenses] = useState<License[]>([]);
  const [summary, setSummary] = useState<PersonLicensesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Load person's licenses
  const loadLicenses = async () => {
    setLoading(true);
    setError(null);

    try {
      const [licensesData, summaryData] = await Promise.all([
        licenseService.getPersonLicenses(personId, showActiveOnly),
        licenseService.getPersonLicensesSummary(personId)
      ]);

      setLicenses(licensesData);
      setSummary(summaryData);
    } catch (err: any) {
      setError(err.message || 'Failed to load person licenses');
      console.error('Error loading person licenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLicenses();
  }, [personId, showActiveOnly]);

  // Format functions
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  };

  const getStatusChip = (status: string) => {
    const color = licenseService.getStatusColor(status);
    return (
      <Chip 
        label={status} 
        color={color} 
        size="small"
        variant="filled"
      />
    );
  };

  const getCardStatusChip = (status: string) => {
    const color = licenseService.getCardStatusColor(status);
    return (
      <Chip 
        label={status.replace(/_/g, ' ')} 
        color={color} 
        size="small"
        variant="outlined"
      />
    );
  };

  const getRestrictionsDisplay = (restrictions: string[]) => {
    if (!restrictions.length) {
      return <Typography variant="body2" color="textSecondary">None</Typography>;
    }

    return (
      <Stack direction="row" spacing={0.5} flexWrap="wrap">
        {restrictions.map((code) => (
          <Chip
            key={code}
            label={licenseService.getRestrictionDisplayName(code)}
            size="small"
            variant="outlined"
            color="warning"
          />
        ))}
      </Stack>
    );
  };

  const getProfessionalPermitDisplay = (license: License) => {
    if (!license.has_professional_permit || !license.professional_permit_categories.length) {
      return null;
    }

    return (
      <Stack direction="row" spacing={0.5} flexWrap="wrap">
        {license.professional_permit_categories.map((category) => (
          <Chip
            key={category}
            label={licenseService.getProfessionalPermitDisplayName(category)}
            size="small"
            variant="outlined"
            color="info"
          />
        ))}
      </Stack>
    );
  };

  const handleViewLicense = (license: License) => {
    navigate(`/licenses/${license.id}`);
  };

  const handleCreateApplication = () => {
    if (onCreateApplication) {
      onCreateApplication();
    } else {
      navigate(`/applications/new?personId=${personId}`);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {showHeader && (
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" component="h2">
              Person Licenses
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={() => setShowActiveOnly(!showActiveOnly)}
                size="small"
              >
                {showActiveOnly ? 'Show All' : 'Active Only'}
              </Button>
              <Button
                variant="outlined"
                onClick={loadLicenses}
                startIcon={<RefreshIcon />}
                size="small"
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                onClick={handleCreateApplication}
                startIcon={<AddIcon />}
                size="small"
              >
                New Application
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}

      {/* Summary Card */}
      {summary && (
        <Card sx={{ mb: 3 }}>
          <CardHeader
            title="License Summary"
            subheader={`${summary.person_name} - ${summary.total_licenses} licenses`}
            avatar={<PersonIcon />}
          />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main">
                    {summary.active_licenses}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Active
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="warning.main">
                    {summary.suspended_licenses}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Suspended
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="error.main">
                    {summary.cancelled_licenses}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Cancelled
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="info.main">
                    {summary.cards_ready_for_collection}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Cards Ready
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Categories Held
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                  {summary.categories.map((category) => (
                    <Chip
                      key={category}
                      label={category}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                  {summary.categories.length === 0 && (
                    <Typography variant="body2" color="textSecondary">
                      No categories
                    </Typography>
                  )}
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Latest Activity
                </Typography>
                <Typography variant="body2">
                  {summary.latest_license_date 
                    ? `${formatDate(summary.latest_license_date)} (${summary.latest_license_number})`
                    : 'No recent activity'
                  }
                </Typography>
              </Grid>
            </Grid>

            {summary.cards_near_expiry > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {summary.cards_near_expiry} card(s) expiring soon
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Licenses Table */}
      <Card>
        <CardHeader
          title="License History"
          subheader={`${licenses.length} licenses found`}
        />
        <CardContent>
          {licenses.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="textSecondary">
                No licenses found for this person
              </Typography>
              <Button
                variant="contained"
                onClick={handleCreateApplication}
                startIcon={<AddIcon />}
                sx={{ mt: 2 }}
              >
                Create First License Application
              </Button>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>License Number</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Issue Date</TableCell>
                    <TableCell>Restrictions</TableCell>
                    <TableCell>Professional Permit</TableCell>
                    <TableCell>Current Card</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {licenses.map((license) => (
                    <TableRow key={license.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {licenseService.formatLicenseNumber(license.license_number)}
                        </Typography>
                        {license.captured_from_license_number && (
                          <Typography variant="caption" color="textSecondary">
                            Originally: {license.captured_from_license_number}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={license.category} 
                          color="primary" 
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {getStatusChip(license.status)}
                      </TableCell>
                      <TableCell>
                        {formatDate(license.issue_date)}
                      </TableCell>
                      <TableCell>
                        {getRestrictionsDisplay(license.restrictions)}
                      </TableCell>
                      <TableCell>
                        {getProfessionalPermitDisplay(license)}
                      </TableCell>
                      <TableCell>
                        {license.current_card ? (
                          <Box>
                            {getCardStatusChip(license.current_card.status)}
                            {license.current_card.is_near_expiry && (
                              <Badge 
                                badgeContent="!" 
                                color="warning"
                                sx={{ ml: 1 }}
                              >
                                <Typography variant="caption">
                                  Exp: {formatDate(license.current_card.expiry_date)}
                                </Typography>
                              </Badge>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            No Card
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="View License Details">
                            <IconButton 
                              size="small"
                              onClick={() => handleViewLicense(license)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          {license.current_card && license.current_card.status === 'READY_FOR_COLLECTION' && (
                            <Tooltip title="Print Collection Notice">
                              <IconButton size="small">
                                <PrintIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Additional Information */}
      {licenses.length > 0 && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">License Categories Guide</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="textSecondary">
                  <strong>Categories:</strong> A1-A (Motorcycles), B (Cars), C (Trucks), D (Buses)
                  <br />
                  <strong>Professional Permits:</strong> P (Passengers), D (Dangerous Goods), G (Goods)
                  <br />
                  <strong>Restrictions:</strong> Numbered codes (01-07) for various driving limitations
                  <br />
                  <strong>Cards:</strong> 5-year validity, separate from license (lifetime)
                </Typography>
              </AccordionDetails>
            </Accordion>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default PersonLicensesView; 