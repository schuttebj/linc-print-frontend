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
import applicationService, { Application } from '../../services/applicationService';
import personService, { Person } from '../../services/personService';
import licenseService, { License } from '../../services/licenseService';
import printJobService, { PrintJobCreateRequest, PrintJobResponse } from '../../services/printJobService';

interface ApplicationForOrdering extends Application {
  person?: Person;
  person_licenses?: License[];
  can_order_card?: boolean;
  order_reason?: string;
}

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
    location_id: user?.primary_location?.id || ''
  });

  const orderSteps = ['Review Application', 'Confirm Licenses', 'Order Card'];

  // Load applications ready for card ordering
  const loadApplications = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get applications that are ready for card ordering
      const approvedApps = await applicationService.searchApplications({
        status: ['APPROVED'], // NEW_LICENSE and LEARNERS_PERMIT need APPROVED status
        application_type: ['NEW_LICENSE', 'LEARNERS_PERMIT'],
        location_id: searchFilters.location_id || undefined,
        person_name: searchFilters.person_name || undefined,
        application_number: searchFilters.application_number || undefined,
        page: 1,
        size: 50
      });

      const paidApps = await applicationService.searchApplications({
        status: ['PAID'], // Other applications need PAID status
        application_type: ['RENEWAL', 'REPLACEMENT', 'TEMPORARY_LICENSE', 'INTERNATIONAL_PERMIT'],
        location_id: searchFilters.location_id || undefined,
        person_name: searchFilters.person_name || undefined,
        application_number: searchFilters.application_number || undefined,
        page: 1,
        size: 50
      });

      // Combine and filter applications
      const allApps = [...approvedApps.applications, ...paidApps.applications];

      // Enrich applications with person and license data
      const enrichedApps = await Promise.all(
        allApps.map(async (app) => {
          try {
            // Get person details
            const person = await personService.getPersonById(app.person_id);
            
            // Get all person's licenses (excluding learners permits for card)
            const personLicenses = await licenseService.getPersonLicenses(app.person_id, true);
            const cardLicenses = personLicenses.filter(license => 
              license.category !== 'LEARNERS_PERMIT'
            );

            // Check if card can be ordered
            const canOrderCard = cardLicenses.length > 0;
            const orderReason = !canOrderCard ? 'No valid licenses for card' : '';

            return {
              ...app,
              person,
              person_licenses: cardLicenses,
              can_order_card: canOrderCard,
              order_reason: orderReason
            } as ApplicationForOrdering;
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
      location_id: user?.primary_location?.id || ''
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

  // Create print job
  const handleCreatePrintJob = async () => {
    if (!selectedApplication) return;

    setOrderLoading(true);
    try {
      // Check for other pending applications for same person
      const personApplications = applications.filter(app => 
        app.person_id === selectedApplication.person_id && 
        app.id !== selectedApplication.id &&
        app.can_order_card
      );

      const additionalApplicationIds = personApplications.map(app => app.id);

      const printJobRequest: PrintJobCreateRequest = {
        application_id: selectedApplication.id,
        additional_application_ids: additionalApplicationIds.length > 0 ? additionalApplicationIds : undefined,
        card_template: 'MADAGASCAR_STANDARD',
        production_notes: `Card ordered for ${selectedApplication.person?.first_name} ${selectedApplication.person?.last_name}`
      };

      const printJob = await printJobService.createPrintJob(printJobRequest);
      
      setOrderSuccess(printJob);
      setOrderStep(orderSteps.length); // Move to success step
      
      // Refresh applications list
      loadApplications();
    } catch (error) {
      console.error('Error creating print job:', error);
      setError('Failed to create print job. Please try again.');
    } finally {
      setOrderLoading(false);
    }
  };

  // Get application status chip
  const getApplicationStatusChip = (app: ApplicationForOrdering) => {
    if (!app.can_order_card) {
      return <Chip label={app.order_reason} color="error" size="small" />;
    }

    const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      'APPROVED': 'success',
      'PAID': 'success'
    };

    return (
      <Chip 
        label={`${app.status} - Ready for Card`} 
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
                <MenuItem value="PAID">Paid</MenuItem>
              </Select>
            </FormControl>
          </Grid>
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