import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Divider,
  Avatar,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  Print as PrintIcon,
  Person as PersonIcon,
  Badge as BadgeIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

// Types
interface PersonData {
  id: string;
  first_name: string;
  last_name: string;
  id_number: string;
  birth_date?: string;
  nationality?: string;
  photo_path?: string;
  signature_path?: string;
}

interface License {
  id: string;
  category: string;
  status: string;
  issue_date: string;
  expiry_date?: string;
  restrictions?: any;
  medical_restrictions?: string[];
  issuing_location_id: string;
}

interface Application {
  id: string;
  application_number: string;
  application_type: string;
  status: string;
  application_date: string;
  approval_date?: string;
}

interface PrintLocation {
  id: string;
  name: string;
  code: string;
  province_code: string;
}

interface SearchResult {
  person: PersonData;
  card_eligible_licenses: License[];
  learners_permits: License[];
  approved_applications: Application[];
  print_eligibility: {
    can_order_card: boolean;
    issues: string[];
    total_licenses: number;
    card_eligible_count: number;
    learners_permit_count: number;
  };
  accessible_print_locations: PrintLocation[];
}

const CardOrderingByIdPage: React.FC = () => {
  const { user } = useAuth();
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Order confirmation state
  const [selectedApplication, setSelectedApplication] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [detailsConfirmed, setDetailsConfirmed] = useState(false);
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any>(null);

  const searchPerson = async () => {
    if (!searchId.trim()) {
      setError('Please enter an ID number');
      return;
    }

    setLoading(true);
    setError(null);
    setSearchResult(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`https://linc-print-backend.onrender.com/api/v1/printing/card-ordering/search/${searchId.trim()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Search failed');
      }

      const data = await response.json();
      setSearchResult(data);
      
      // Auto-select first application and user's location if available
      if (data.approved_applications.length > 0) {
        setSelectedApplication(data.approved_applications[0].id);
      }
      if (user?.primary_location_id && data.accessible_print_locations.some(loc => loc.id === user.primary_location_id)) {
        setSelectedLocation(user.primary_location_id);
      } else if (data.accessible_print_locations.length === 1) {
        setSelectedLocation(data.accessible_print_locations[0].id);
      }

    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const createPrintJob = async () => {
    if (!searchResult || !selectedApplication || !selectedLocation) {
      setError('Please select an application and print location');
      return;
    }

    if (!detailsConfirmed || !signatureConfirmed) {
      setError('Please confirm all details and signature verification');
      return;
    }

    setOrdering(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('https://linc-print-backend.onrender.com/api/v1/printing/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          application_id: selectedApplication,
          location_id: selectedLocation,
          card_template: 'MADAGASCAR_STANDARD'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Print job creation failed');
      }

      const data = await response.json();
      setOrderSuccess(data);

    } catch (error: any) {
      setError(error.message);
    } finally {
      setOrdering(false);
    }
  };

  const resetForm = () => {
    setSearchId('');
    setSearchResult(null);
    setSelectedApplication('');
    setSelectedLocation('');
    setDetailsConfirmed(false);
    setSignatureConfirmed(false);
    setOrderSuccess(null);
    setError(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Card Ordering System
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Search by ID number to view licenses and order cards
      </Typography>

      {/* Search Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Search Person
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="ID Number"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Enter person's ID number..."
              onKeyPress={(e) => e.key === 'Enter' && searchPerson()}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={searchPerson}
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="outlined"
              onClick={resetForm}
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

      {/* Search Results */}
      {searchResult && (
        <Grid container spacing={3}>
          {/* Person Information */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ mr: 2 }}>
                    <PersonIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">
                      {searchResult.person.first_name} {searchResult.person.last_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ID: {searchResult.person.id_number}
                    </Typography>
                  </Box>
                </Box>
                
                {searchResult.person.birth_date && (
                  <Typography variant="body2" gutterBottom>
                    Birth Date: {new Date(searchResult.person.birth_date).toLocaleDateString()}
                  </Typography>
                )}
                
                {searchResult.person.nationality && (
                  <Typography variant="body2" gutterBottom>
                    Nationality: {searchResult.person.nationality}
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* Print Eligibility */}
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Print Eligibility
                </Typography>
                
                {searchResult.print_eligibility.can_order_card ? (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CheckCircleIcon sx={{ mr: 1 }} />
                      Ready for card ordering
                    </Box>
                  </Alert>
                ) : (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <WarningIcon sx={{ mr: 1 }} />
                      Cannot order card
                    </Box>
                    <ul style={{ margin: '8px 0' }}>
                      {searchResult.print_eligibility.issues.map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  </Alert>
                )}
                
                <Typography variant="body2">
                  Total Licenses: {searchResult.print_eligibility.total_licenses}
                </Typography>
                <Typography variant="body2">
                  Card Eligible: {searchResult.print_eligibility.card_eligible_count}
                </Typography>
                <Typography variant="body2">
                  Learners Permits: {searchResult.print_eligibility.learners_permit_count}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Licenses and Applications */}
          <Grid item xs={12} md={8}>
            {/* Card Eligible Licenses */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">
                  Card Eligible Licenses ({searchResult.card_eligible_licenses.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {searchResult.card_eligible_licenses.length > 0 ? (
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Category</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Issue Date</TableCell>
                          <TableCell>Restrictions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {searchResult.card_eligible_licenses.map((license) => (
                          <TableRow key={license.id}>
                            <TableCell>
                              <Chip 
                                label={license.category} 
                                size="small" 
                                color="primary" 
                              />
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={license.status} 
                                size="small" 
                                color="success" 
                              />
                            </TableCell>
                            <TableCell>
                              {new Date(license.issue_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {license.restrictions && Object.keys(license.restrictions).length > 0 
                                ? JSON.stringify(license.restrictions) 
                                : 'None'
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="warning">
                    No card-eligible licenses found
                  </Alert>
                )}
              </AccordionDetails>
            </Accordion>

            {/* Learners Permits */}
            {searchResult.learners_permits.length > 0 && (
              <Accordion sx={{ mt: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">
                    Learners Permits ({searchResult.learners_permits.length})
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                    (Not printed on cards)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Category</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Issue Date</TableCell>
                          <TableCell>Expiry Date</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {searchResult.learners_permits.map((license) => (
                          <TableRow key={license.id}>
                            <TableCell>
                              <Chip label={license.category} size="small" color="secondary" />
                            </TableCell>
                            <TableCell>
                              <Chip label={license.status} size="small" color="success" />
                            </TableCell>
                            <TableCell>
                              {new Date(license.issue_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {license.expiry_date 
                                ? new Date(license.expiry_date).toLocaleDateString()
                                : 'No expiry'
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Card Ordering Section */}
            {searchResult.print_eligibility.can_order_card && (
              <Card sx={{ mt: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Card Ordering
                  </Typography>

                  <Grid container spacing={3}>
                    {/* Application Selection */}
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Select Application</InputLabel>
                        <Select
                          value={selectedApplication}
                          onChange={(e) => setSelectedApplication(e.target.value)}
                          label="Select Application"
                        >
                          {searchResult.approved_applications.map((app) => (
                            <MenuItem key={app.id} value={app.id}>
                              {app.application_number} ({app.application_type})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* Location Selection (for admins) */}
                    {searchResult.accessible_print_locations.length > 1 && (
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <InputLabel>Print Location</InputLabel>
                          <Select
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            label="Print Location"
                          >
                            {searchResult.accessible_print_locations.map((location) => (
                              <MenuItem key={location.id} value={location.id}>
                                {location.name} ({location.code})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    )}
                  </Grid>

                  {/* Card Preview */}
                  {selectedApplication && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Card Preview (A4 Format)
                      </Typography>
                      
                      <Paper sx={{ p: 3, bgcolor: 'grey.50', border: '2px dashed grey.300' }}>
                        <Typography variant="h5" gutterBottom align="center">
                          🇲🇬 REPUBLIC OF MADAGASCAR
                        </Typography>
                        <Typography variant="h6" gutterBottom align="center">
                          DRIVER'S LICENSE / PERMIS DE CONDUIRE
                        </Typography>
                        
                        <Divider sx={{ my: 2 }} />
                        
                        <Grid container spacing={2}>
                          <Grid item xs={8}>
                            <Typography variant="body1"><strong>Name:</strong> {searchResult.person.first_name} {searchResult.person.last_name}</Typography>
                            <Typography variant="body1"><strong>ID Number:</strong> {searchResult.person.id_number}</Typography>
                            {searchResult.person.birth_date && (
                              <Typography variant="body1">
                                <strong>Birth Date:</strong> {new Date(searchResult.person.birth_date).toLocaleDateString()}
                              </Typography>
                            )}
                            <Typography variant="body1">
                              <strong>Categories:</strong> {searchResult.card_eligible_licenses.map(l => l.category).join(', ')}
                            </Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Box sx={{ border: '1px solid grey.400', height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Typography variant="body2" color="text.secondary">
                                [PHOTO]
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                        
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2">
                            <strong>Restrictions:</strong> {
                              searchResult.card_eligible_licenses.some(l => l.restrictions && Object.keys(l.restrictions).length > 0)
                                ? searchResult.card_eligible_licenses.map(l => JSON.stringify(l.restrictions)).join(', ')
                                : 'None'
                            }
                          </Typography>
                        </Box>
                      </Paper>

                      {/* Confirmation Checkboxes */}
                      <Box sx={{ mt: 3 }}>
                        <Typography variant="h6" gutterBottom>
                          Confirmation Required
                        </Typography>
                        
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={detailsConfirmed}
                              onChange={(e) => setDetailsConfirmed(e.target.checked)}
                            />
                          }
                          label="I confirm that all details on the card preview are correct"
                        />
                        
                        <br />
                        
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={signatureConfirmed}
                              onChange={(e) => setSignatureConfirmed(e.target.checked)}
                            />
                          }
                          label="I confirm that the applicant has signed the physical A4 preview copy"
                        />
                      </Box>

                      {/* Order Button */}
                      <Box sx={{ mt: 3, textAlign: 'center' }}>
                        <Button
                          variant="contained"
                          size="large"
                          startIcon={<PrintIcon />}
                          onClick={createPrintJob}
                          disabled={!detailsConfirmed || !signatureConfirmed || ordering}
                          sx={{ minWidth: 200 }}
                        >
                          {ordering ? 'Creating Print Job...' : 'Order Card'}
                        </Button>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {/* Order Success */}
      {orderSuccess && (
        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Print Job Created Successfully!
          </Typography>
          <Typography>Job Number: {orderSuccess.job_number}</Typography>
          <Typography>Card Number: {orderSuccess.card_number}</Typography>
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={resetForm}>
              Order Another Card
            </Button>
          </Box>
        </Alert>
      )}
    </Box>
  );
};

export default CardOrderingByIdPage; 