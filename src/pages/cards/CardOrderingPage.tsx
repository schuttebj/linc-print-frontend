import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  CreditCard as CreditCardIcon,
  CheckCircle as CheckCircleIcon,
  Print as PrintIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import applicationService from '../../services/applicationService';
import personService, { Person } from '../../services/personService';
import licenseService, { License } from '../../services/licenseService';
import printJobService, { PrintJobCreateRequest, PrintJobResponse } from '../../services/printJobService';
import { ApplicationForOrdering, Application } from '../../types';

interface SearchFilters {
  person_name: string;
  application_number: string;
  document_number: string;
  status: string;
  application_type: string;
  location_id: string;
}

const CardOrderingPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState<ApplicationForOrdering[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationForOrdering | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderStep, setOrderStep] = useState(0);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<PrintJobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    person_name: '',
    application_number: '',
    document_number: '',
    status: '',
    application_type: '',
    location_id: user?.primary_location_id || ''
  });
  
  // Add state for accessible locations
  const [accessibleLocations, setAccessibleLocations] = useState<any[]>([]);

  const orderSteps = ['Review Application', 'Confirm Licenses', 'Order Card'];

  // Load accessible locations for admin users
  useEffect(() => {
    if (user && (user.is_superuser || user.user_type === 'SYSTEM_USER' || user.user_type === 'NATIONAL_ADMIN' || user.user_type === 'PROVINCIAL_ADMIN')) {
      loadAccessibleLocations();
    }
  }, [user]);

  const loadAccessibleLocations = async () => {
    try {
      // Get locations based on user access level
      // This would need to be implemented in a locationService
      // For now, we'll use the print job service to get accessible locations
      const queues = await printJobService.getAccessiblePrintQueues();
      setAccessibleLocations(queues.map(queue => ({
        id: queue.location_id,
        name: queue.location_name
      })));
    } catch (error) {
      console.error('Error loading accessible locations:', error);
    }
  };

  // Load applications ready for card ordering
  const loadApplications = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get applications that are ready for card ordering
      // - APPROVED status means all payments completed and ready for card
      // - CARD_PAYMENT_PENDING means test passed but card payment still needed
      const approvedApps = await applicationService.searchApplications({
        status: 'APPROVED',
        location_id: searchFilters.location_id || undefined,
        application_number: searchFilters.application_number || undefined,
        skip: 0,
        limit: 50
      });

      const cardPaymentPendingApps = await applicationService.searchApplications({
        status: 'CARD_PAYMENT_PENDING',
        location_id: searchFilters.location_id || undefined,
        application_number: searchFilters.application_number || undefined,
        skip: 0,
        limit: 50
      });

      // Combine applications
      const allApps = [...approvedApps, ...cardPaymentPendingApps];

      // Enrich applications with person data
      const enrichedApps = await Promise.all(
        allApps.map(async (app) => {
          try {
            // Get person details and licenses in parallel
            const [person, personLicensesResponse] = await Promise.all([
              personService.getPersonById(app.person_id),
              licenseService.getPersonLicenses(app.person_id, true) // Only active licenses
            ]);
            
            // Filter out learners permits (they don't go on cards)
            const cardLicenses = personLicensesResponse.filter(license => 
              license.category !== 'LEARNERS_PERMIT' && 
              license.category !== '1' && 
              license.category !== '2' && 
              license.category !== '3'
            );
            
            // Use backend can_order_card calculation
            let canOrderCard = false;
            let orderReason = '';

            if (app.can_order_card !== undefined) {
              // Use backend calculation (preferred)
              canOrderCard = app.can_order_card;
              if (!canOrderCard) {
                if (app.status === 'CARD_PAYMENT_PENDING') {
                  orderReason = 'Card payment required (38,000 MGA)';
                } else if (app.application_type === 'NEW_LICENSE' && !app.card_payment_completed) {
                  orderReason = 'Card payment required (38,000 MGA)';
                } else if (app.application_type === 'NEW_LICENSE' && app.test_result !== 'PASSED') {
                  orderReason = 'Test not passed yet';
                } else if (cardLicenses.length === 0) {
                  orderReason = 'No valid licenses for card';
                } else {
                  orderReason = 'Not ready for card ordering';
                }
              }
            } else {
              // Fallback if backend doesn't provide can_order_card yet
              if (app.status === 'APPROVED' && cardLicenses.length > 0) {
                canOrderCard = true;
              } else {
                canOrderCard = false;
                orderReason = cardLicenses.length === 0 ? 'No valid licenses for card' : 
                            (app.status === 'CARD_PAYMENT_PENDING' ? 'Card payment required' : 'Not ready for ordering');
              }
            }

            return {
              ...app,
              person,
              person_licenses: cardLicenses, // Add licenses to the application object
              can_order_card: canOrderCard,
              order_reason: orderReason
            } as unknown as ApplicationForOrdering;
          } catch (error) {
            console.error(`Error enriching application ${app.id}:`, error);
            return {
              ...app,
              can_order_card: false,
              order_reason: 'Error loading person data'
            } as ApplicationForOrdering;
          }
        })
      );

      setApplications(enrichedApps);
    } catch (error) {
      console.error('Error loading applications:', error);
      setError('Failed to load applications ready for card ordering');
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = () => {
    loadApplications();
  };

  // Clear search filters
  const handleClearFilters = () => {
    setSearchFilters({
      person_name: '',
      application_number: '',
      document_number: '',
      status: '',
      application_type: '',
      location_id: user?.primary_location_id || ''
    });
  };

  // Open order dialog
  const handleOrderCard = (application: ApplicationForOrdering) => {
    setSelectedApplication(application);
    setOrderDialogOpen(true);
    setOrderStep(0);
    setOrderSuccess(null);
  };

  // Close order dialog
  const handleCloseOrderDialog = () => {
    setOrderDialogOpen(false);
    setSelectedApplication(null);
    setOrderStep(0);
    setOrderSuccess(null);
  };

  // Handle order step navigation
  const handleNextStep = () => {
    if (orderStep < orderSteps.length - 1) {
      setOrderStep(orderStep + 1);
    }
  };

  const handleBackStep = () => {
    if (orderStep > 0) {
      setOrderStep(orderStep - 1);
    }
  };

  // Create print job for application
  const createPrintJob = async (application: ApplicationForOrdering) => {
    if (!application.can_order_card) {
      setError('Application is not ready for card ordering');
      return;
    }

    // Validate user has access to the application's location
    if (!user?.can_access_location(application.location_id)) {
      setError('You do not have permission to create print jobs for this location');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Creating print job for application:', application.id);

      const printJob = await printJobService.createPrintJob({
        application_id: application.id,
        card_template: 'MADAGASCAR_STANDARD'
      });

      console.log('Print job created successfully:', printJob);

      // Show success message
      setOrderSuccess(printJob);
      
      // Refresh applications to update status
      loadApplications();

    } catch (error: any) {
      console.error('Error creating print job:', error);
      
      if (error.response?.status === 403) {
        setError('Access denied: You cannot create print jobs for this location');
      } else if (error.response?.status === 400) {
        setError(error.response?.data?.detail || 'Invalid request for print job creation');
      } else {
        setError('Failed to create print job. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handler for order card button
  const handleCreatePrintJob = () => {
    if (selectedApplication) {
      createPrintJob(selectedApplication);
    }
  };

  // Get application status chip
  const getApplicationStatusChip = (app: ApplicationForOrdering) => {
    if (!app.can_order_card) {
      if (app.status === 'CARD_PAYMENT_PENDING') {
        return <Chip label="Card Payment Required" color="warning" size="small" />;
      }
      return <Chip label={app.order_reason} color="error" size="small" />;
    }

    const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      'APPROVED': 'success',
      'PAID': 'success',
      'CARD_PAYMENT_PENDING': 'warning'
    };

    const statusLabels: Record<string, string> = {
      'APPROVED': 'Ready for Card',
      'PAID': 'Ready for Card',
      'CARD_PAYMENT_PENDING': 'Card Payment Required'
    };

    return (
      <Chip 
        label={statusLabels[app.status] || `${app.status} - Ready for Card`} 
        color={statusColors[app.status] || 'default'} 
        size="small" 
      />
    );
  };

  // Format license categories for display
  const formatLicenseCategories = (licenses: License[]) => {
    return licenses.map(license => license.category).join(', ');
  };

  // Get license count by category
  const getLicenseCountText = (licenses: License[]) => {
    if (licenses.length === 0) return 'No licenses';
    if (licenses.length === 1) return '1 license';
    return `${licenses.length} licenses`;
  };

  useEffect(() => {
    loadApplications();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <CreditCardIcon fontSize="large" />
        Card Ordering
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Search for approved applications and order physical cards for printing
      </Typography>

      {/* Search Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Search Applications
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Person Name"
              value={searchFilters.person_name}
              onChange={(e) => setSearchFilters({...searchFilters, person_name: e.target.value})}
              placeholder="Search by name..."
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Application Number"
              value={searchFilters.application_number}
              onChange={(e) => setSearchFilters({...searchFilters, application_number: e.target.value})}
              placeholder="APP-123..."
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={searchFilters.status}
                onChange={(e) => setSearchFilters({...searchFilters, status: e.target.value})}
                label="Status"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="APPROVED">Approved</MenuItem>
                <MenuItem value="CARD_PAYMENT_PENDING">Card Payment Pending</MenuItem>
                <MenuItem value="PAID">Paid</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {/* Location Selector - Show for System/National/Provincial Admins */}
          {user && (user.is_superuser || user.user_type === 'SYSTEM_USER' || user.user_type === 'NATIONAL_ADMIN' || user.user_type === 'PROVINCIAL_ADMIN') && (
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Location</InputLabel>
                <Select
                  value={searchFilters.location_id || ''}
                  onChange={(e) => setSearchFilters({...searchFilters, location_id: e.target.value})}
                  label="Location"
                >
                  <MenuItem value="">All Accessible Locations</MenuItem>
                  {accessibleLocations.map((location) => (
                    <MenuItem key={location.id} value={location.id}>
                      {location.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
          
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={loading}
            >
              Search
            </Button>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={handleClearFilters}
              disabled={loading}
            >
              Clear
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Applications List */}
      {!loading && applications.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <InfoIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No applications ready for card ordering
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Applications need to be APPROVED (for new licenses/learners permits) or PAID (for other types) to order cards
          </Typography>
        </Paper>
      )}

      {!loading && applications.length > 0 && (
        <Grid container spacing={2}>
          {applications.map((application) => (
            <Grid item xs={12} key={application.id}>
              <Card elevation={2}>
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar>
                          <PersonIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="h6">
                            {application.person?.first_name} {application.person?.last_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {application.person?.id_number || 'No ID number'}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={2}>
                      <Typography variant="body2" color="text.secondary">
                        Application
                      </Typography>
                      <Typography variant="body1">
                        {application.application_number}
                      </Typography>
                      <Typography variant="body2">
                        {application.application_type.replace('_', ' ')}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} md={3}>
                      <Typography variant="body2" color="text.secondary">
                        Licenses for Card
                      </Typography>
                      <Typography variant="body1">
                        {getLicenseCountText(application.person_licenses || [])}
                      </Typography>
                      {application.person_licenses && application.person_licenses.length > 0 && (
                        <Typography variant="body2" color="text.secondary">
                          {formatLicenseCategories(application.person_licenses)}
                        </Typography>
                      )}
                    </Grid>

                    <Grid item xs={12} md={2}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Status
                      </Typography>
                      {getApplicationStatusChip(application)}
                    </Grid>

                    <Grid item xs={12} md={2}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<PrintIcon />}
                        onClick={() => handleOrderCard(application)}
                        disabled={!application.can_order_card}
                      >
                        Order Card
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Order Dialog */}
      <Dialog 
        open={orderDialogOpen} 
        onClose={handleCloseOrderDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Order Card - {selectedApplication?.person?.first_name} {selectedApplication?.person?.last_name}
        </DialogTitle>
        
        <DialogContent>
          {/* Stepper */}
          {orderSuccess ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Print Job Created Successfully!
              </Typography>
              <Typography variant="body1" gutterBottom>
                Job Number: {orderSuccess.job_number}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Card Number: {orderSuccess.card_number}
              </Typography>
              <Alert severity="info" sx={{ mt: 2 }}>
                The card has been added to the print queue and will be processed in order of submission.
              </Alert>
            </Box>
          ) : (
            <>
              <Stepper activeStep={orderStep} sx={{ mb: 3 }}>
                {orderSteps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>

              {/* Step Content */}
              {orderStep === 0 && selectedApplication && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Review Application Details
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Person Information
                      </Typography>
                      <Typography variant="body1">
                        {selectedApplication.person?.first_name} {selectedApplication.person?.last_name}
                      </Typography>
                      <Typography variant="body2">
                        ID: {selectedApplication.person?.id_number}
                      </Typography>
                      <Typography variant="body2">
                        Birth Date: {selectedApplication.person?.birth_date ? 
                          new Date(selectedApplication.person.birth_date).toLocaleDateString() : 'Not specified'}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Application Information
                      </Typography>
                      <Typography variant="body1">
                        {selectedApplication.application_number}
                      </Typography>
                      <Typography variant="body2">
                        Type: {selectedApplication.application_type.replace('_', ' ')}
                      </Typography>
                      <Typography variant="body2">
                        Status: {selectedApplication.status}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {orderStep === 1 && selectedApplication && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Confirm Licenses for Card
                  </Typography>
                  
                  <Alert severity="info" sx={{ mb: 2 }}>
                    All licenses except learners permits will be printed on the card. 
                    Learners permits are not included on physical cards.
                  </Alert>

                  {selectedApplication.person_licenses && selectedApplication.person_licenses.length > 0 ? (
                    <TableContainer component={Paper}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Category</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Issue Date</TableCell>
                            <TableCell>Restrictions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedApplication.person_licenses.map((license) => (
                            <TableRow key={license.id}>
                              <TableCell>{license.category}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={license.status} 
                                  color={license.status === 'ACTIVE' ? 'success' : 'default'}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                {new Date(license.issue_date).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                {license.restrictions && license.restrictions.length > 0 
                                  ? license.restrictions.join(', ') 
                                  : 'None'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Alert severity="warning">
                      No licenses found for this person that can be printed on a card.
                    </Alert>
                  )}
                </Box>
              )}

              {orderStep === 2 && selectedApplication && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Order Confirmation
                  </Typography>
                  
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Please confirm the card order details below. Once ordered, the card will be added to the print queue.
                  </Alert>

                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Card Holder
                      </Typography>
                      <Typography variant="body1">
                        {selectedApplication.person?.first_name} {selectedApplication.person?.last_name}
                      </Typography>
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        License Categories to Print
                      </Typography>
                      <Typography variant="body1">
                        {formatLicenseCategories(selectedApplication.person_licenses || [])}
                      </Typography>
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Card Template
                      </Typography>
                      <Typography variant="body1">
                        Madagascar Standard Template
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions>
          {orderSuccess ? (
            <Button onClick={handleCloseOrderDialog} variant="contained">
              Close
            </Button>
          ) : (
            <>
              <Button onClick={handleCloseOrderDialog}>
                Cancel
              </Button>
              {orderStep > 0 && (
                <Button onClick={handleBackStep}>
                  Back
                </Button>
              )}
              {orderStep < orderSteps.length - 1 ? (
                <Button 
                  onClick={handleNextStep} 
                  variant="contained"
                  disabled={!selectedApplication?.can_order_card}
                >
                  Next
                </Button>
              ) : (
                <Button 
                  onClick={handleCreatePrintJob} 
                  variant="contained"
                  disabled={orderLoading || !selectedApplication?.can_order_card}
                  startIcon={orderLoading ? <CircularProgress size={20} /> : <PrintIcon />}
                >
                  {orderLoading ? 'Ordering...' : 'Order Card'}
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CardOrderingPage; 