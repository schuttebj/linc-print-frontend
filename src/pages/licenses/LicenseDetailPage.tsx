/**
 * License Detail Page for Madagascar License System
 * Comprehensive view of a specific license with all related information
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
  Button,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Stack,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Tab,
  Tabs,

} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Print as PrintIcon,
  Block as SuspendIcon,
  CheckCircle as ActivateIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  History as HistoryIcon,
  CreditCard as CardIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Security as SecurityIcon,
  Assignment as AssignmentIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

import licenseService, { 
  LicenseDetail, 
  LicenseCard, 
  LicenseStatusHistory,
  LicenseStatusUpdate,
  LicenseRestrictionsUpdate,
  CardCreate,
  CardStatusUpdate
} from '../../services/licenseService';
import { useAuth } from '../../contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanelComponent: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const LicenseDetailPage: React.FC = () => {
  const { licenseId } = useParams<{ licenseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State management
  const [license, setLicense] = useState<LicenseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // Dialog states
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [restrictionsDialogOpen, setRestrictionsDialogOpen] = useState(false);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);

  // Form states
  const [statusUpdate, setStatusUpdate] = useState<LicenseStatusUpdate>({
    status: '',
    reason: '',
    notes: ''
  });
  const [restrictionsUpdate, setRestrictionsUpdate] = useState<LicenseRestrictionsUpdate>({
    restrictions: [],
    reason: ''
  });
  const [newCard, setNewCard] = useState<CardCreate>({
    license_id: licenseId || '',
    card_type: 'STANDARD',
    expiry_years: 5
  });

  // Load license data
  const loadLicense = async () => {
    if (!licenseId) return;

    setLoading(true);
    setError(null);

    try {
      const licenseData = await licenseService.getLicense(licenseId);
      setLicense(licenseData);
    } catch (err: any) {
      setError(err.message || 'Failed to load license details');
      console.error('Error loading license:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLicense();
  }, [licenseId]);

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!license) return;

    try {
      await licenseService.updateLicenseStatus(license.id, statusUpdate);
      setStatusDialogOpen(false);
      loadLicense(); // Refresh data
    } catch (err: any) {
      setError(err.message || 'Failed to update license status');
    }
  };

  // Handle restrictions update
  const handleRestrictionsUpdate = async () => {
    if (!license) return;

    try {
      await licenseService.updateLicenseRestrictions(license.id, restrictionsUpdate);
      setRestrictionsDialogOpen(false);
      loadLicense(); // Refresh data
    } catch (err: any) {
      setError(err.message || 'Failed to update restrictions');
    }
  };

  // Handle card creation
  const handleCardCreate = async () => {
    try {
      await licenseService.createCard(newCard);
      setCardDialogOpen(false);
      loadLicense(); // Refresh data
    } catch (err: any) {
      setError(err.message || 'Failed to create card');
    }
  };

  // Format functions
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  const formatShortDate = (dateString: string) => {
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
        size="medium"
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!license) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">License not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <IconButton onClick={() => navigate('/dashboard/licenses/list')}>
            <BackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            License Details
          </Typography>
          <Chip 
            label={licenseService.formatLicenseNumber(license.license_number)}
            color="primary"
            variant="outlined"
            size="medium"
          />
          {getStatusChip(license.status)}
        </Stack>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadLicense}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setStatusDialogOpen(true)}
          >
            Update Status
          </Button>
          <Button
            variant="outlined"
            startIcon={<SecurityIcon />}
            onClick={() => setRestrictionsDialogOpen(true)}
          >
            Manage Restrictions
          </Button>
          <Button
            variant="outlined"
            startIcon={<CardIcon />}
            onClick={() => setCardDialogOpen(true)}
          >
            Order New Card
          </Button>
          <Button
            variant="outlined"
            startIcon={<PersonIcon />}
            onClick={() => navigate(`/persons/${license.person_id}`)}
          >
            View Person
          </Button>
        </Stack>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Card>
        <CardHeader
          title="License Information"
          subheader={`Issued: ${formatShortDate(license.issue_date)}`}
        />
        <CardContent>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Overview" icon={<AssignmentIcon />} />
            <Tab label="Cards" icon={<CardIcon />} />
            <Tab label="History" icon={<HistoryIcon />} />
            <Tab label="Compliance" icon={<SecurityIcon />} />
          </Tabs>

          {/* Overview Tab */}
          <TabPanelComponent value={tabValue} index={0}>
            <Grid container spacing={3}>
              {/* Basic Information */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardHeader title="Basic Information" />
                  <CardContent>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="subtitle2" color="textSecondary">
                          License Number
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {licenseService.formatLicenseNumber(license.license_number)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="textSecondary">
                          Category
                        </Typography>
                        <Chip label={license.category} color="primary" size="small" />
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="textSecondary">
                          Status
                        </Typography>
                        {getStatusChip(license.status)}
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="textSecondary">
                          Issue Date
                        </Typography>
                        <Typography variant="body1">
                          {formatShortDate(license.issue_date)}
                        </Typography>
                      </Box>
                      {license.captured_from_license_number && (
                        <Box>
                          <Typography variant="subtitle2" color="textSecondary">
                            Original License Number
                          </Typography>
                          <Typography variant="body1">
                            {license.captured_from_license_number}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Restrictions & Professional Permits */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardHeader title="Restrictions & Permits" />
                  <CardContent>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="subtitle2" color="textSecondary">
                          Restrictions
                        </Typography>
                        {license.restrictions.length > 0 ? (
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            {license.restrictions.map((code) => (
                              <Chip
                                key={code}
                                label={licenseService.getRestrictionDisplayName(code)}
                                size="small"
                                variant="outlined"
                                color="warning"
                              />
                            ))}
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            No restrictions
                          </Typography>
                        )}
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="textSecondary">
                          Professional Permit
                        </Typography>
                        {license.has_professional_permit && license.professional_permit_categories.length > 0 ? (
                          <Stack direction="row" spacing={1} flexWrap="wrap">
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
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            No professional permit
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Current Card */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardHeader title="Current Card" />
                  <CardContent>
                    {license.current_card ? (
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="subtitle2" color="textSecondary">
                            Card Number
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {license.current_card.card_number}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" color="textSecondary">
                            Status
                          </Typography>
                          {getCardStatusChip(license.current_card.status)}
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" color="textSecondary">
                            Expiry Date
                          </Typography>
                          <Typography variant="body1">
                            {formatShortDate(license.current_card.expiry_date)}
                          </Typography>
                        </Box>
                        {license.current_card.is_near_expiry && (
                          <Alert severity="warning">
                            Card expires in {license.current_card.days_until_expiry} days
                          </Alert>
                        )}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        No current card
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* License Statistics */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardHeader title="License Statistics" />
                  <CardContent>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="subtitle2" color="textSecondary">
                          Total Cards Issued
                        </Typography>
                        <Typography variant="body1">
                          {license.cards.length}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="textSecondary">
                          Active Since
                        </Typography>
                        <Typography variant="body1">
                          {formatShortDate(license.created_at)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="textSecondary">
                          Last Updated
                        </Typography>
                        <Typography variant="body1">
                          {formatShortDate(license.updated_at)}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanelComponent>

          {/* Cards Tab */}
          <TabPanelComponent value={tabValue} index={1}>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Card Number</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Issue Date</TableCell>
                    <TableCell>Expiry Date</TableCell>
                    <TableCell>Current</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {license.cards.map((card) => (
                    <TableRow key={card.id}>
                      <TableCell>{card.card_number}</TableCell>
                      <TableCell>{getCardStatusChip(card.status)}</TableCell>
                      <TableCell>{formatShortDate(card.issue_date)}</TableCell>
                      <TableCell>{formatShortDate(card.expiry_date)}</TableCell>
                      <TableCell>
                        {card.is_current && (
                          <Chip label="Current" color="success" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button size="small" variant="outlined">
                            View
                          </Button>
                          {card.status === 'READY_FOR_COLLECTION' && (
                            <Button size="small" variant="contained" color="success">
                              Mark Collected
                            </Button>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {license.cards.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="textSecondary">
                          No cards issued for this license
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanelComponent>

          {/* History Tab */}
          <TabPanelComponent value={tabValue} index={2}>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>From Status</TableCell>
                    <TableCell>To Status</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell>System</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {license.status_history.map((history) => (
                    <TableRow key={history.id}>
                      <TableCell>{formatDate(history.changed_at)}</TableCell>
                      <TableCell>
                        {history.from_status && getStatusChip(history.from_status)}
                      </TableCell>
                      <TableCell>{getStatusChip(history.to_status)}</TableCell>
                      <TableCell>{history.reason || '-'}</TableCell>
                      <TableCell>{history.notes || '-'}</TableCell>
                      <TableCell>
                        {history.system_initiated ? (
                          <Chip label="System" color="info" size="small" />
                        ) : (
                          <Chip label="Manual" color="default" size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {license.status_history.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="textSecondary">
                          No status history available
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanelComponent>

          {/* Compliance Tab */}
          <TabPanelComponent value={tabValue} index={3}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardHeader title="SADC Compliance" />
                  <CardContent>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="subtitle2" color="textSecondary">
                          SADC Compliance Verified
                        </Typography>
                        <Chip
                          label={license.sadc_compliance_verified ? 'Verified' : 'Not Verified'}
                          color={license.sadc_compliance_verified ? 'success' : 'error'}
                          size="small"
                        />
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="textSecondary">
                          International Validity
                        </Typography>
                        <Chip
                          label={license.international_validity ? 'Valid' : 'Not Valid'}
                          color={license.international_validity ? 'success' : 'error'}
                          size="small"
                        />
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="textSecondary">
                          Vienna Convention Compliant
                        </Typography>
                        <Chip
                          label={license.vienna_convention_compliant ? 'Compliant' : 'Not Compliant'}
                          color={license.vienna_convention_compliant ? 'success' : 'error'}
                          size="small"
                        />
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardHeader title="ISO Standards" />
                  <CardContent>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="subtitle2" color="textSecondary">
                          ISO 18013 Compliance
                        </Typography>
                        <Chip
                          label="ISO 18013-1:2018"
                          color="info"
                          size="small"
                        />
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="textSecondary">
                          Card Template
                        </Typography>
                        <Typography variant="body2">
                          {license.current_card?.card_template || 'No current card'}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanelComponent>
        </CardContent>
      </Card>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update License Status</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>New Status</InputLabel>
              <Select
                value={statusUpdate.status}
                onChange={(e) => setStatusUpdate(prev => ({ ...prev, status: e.target.value }))}
                label="New Status"
              >
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="SUSPENDED">Suspended</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Reason"
              value={statusUpdate.reason}
              onChange={(e) => setStatusUpdate(prev => ({ ...prev, reason: e.target.value }))}
              required
            />
            <TextField
              fullWidth
              label="Additional Notes"
              value={statusUpdate.notes}
              onChange={(e) => setStatusUpdate(prev => ({ ...prev, notes: e.target.value }))}
              multiline
              rows={3}
            />
            {statusUpdate.status === 'SUSPENDED' && (
              <>
                <TextField
                  fullWidth
                  label="Suspension Start Date"
                  type="date"
                  value={statusUpdate.suspension_start_date}
                  onChange={(e) => setStatusUpdate(prev => ({ ...prev, suspension_start_date: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  label="Suspension End Date"
                  type="date"
                  value={statusUpdate.suspension_end_date}
                  onChange={(e) => setStatusUpdate(prev => ({ ...prev, suspension_end_date: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleStatusUpdate} variant="contained" disabled={!statusUpdate.status || !statusUpdate.reason}>
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restrictions Update Dialog */}
      <Dialog open={restrictionsDialogOpen} onClose={() => setRestrictionsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Manage License Restrictions</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="textSecondary">
              Select restrictions that apply to this license
            </Typography>
            {/* Restriction checkboxes would go here */}
            <TextField
              fullWidth
              label="Reason for Change"
              value={restrictionsUpdate.reason}
              onChange={(e) => setRestrictionsUpdate(prev => ({ ...prev, reason: e.target.value }))}
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestrictionsDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRestrictionsUpdate} variant="contained" disabled={!restrictionsUpdate.reason}>
            Update Restrictions
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Card Dialog */}
      <Dialog open={cardDialogOpen} onClose={() => setCardDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Order New Card</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Card Type</InputLabel>
              <Select
                value={newCard.card_type}
                onChange={(e) => setNewCard(prev => ({ ...prev, card_type: e.target.value }))}
                label="Card Type"
              >
                <MenuItem value="STANDARD">Standard</MenuItem>
                <MenuItem value="REPLACEMENT">Replacement</MenuItem>
                <MenuItem value="DUPLICATE">Duplicate</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Card Validity (Years)"
              type="number"
              value={newCard.expiry_years}
              onChange={(e) => setNewCard(prev => ({ ...prev, expiry_years: parseInt(e.target.value) }))}
              inputProps={{ min: 1, max: 10 }}
            />
            {newCard.card_type !== 'STANDARD' && (
              <TextField
                fullWidth
                label="Replacement Reason"
                value={newCard.replacement_reason}
                onChange={(e) => setNewCard(prev => ({ ...prev, replacement_reason: e.target.value }))}
                multiline
                rows={2}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCardDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCardCreate} variant="contained">
            Order Card
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LicenseDetailPage; 