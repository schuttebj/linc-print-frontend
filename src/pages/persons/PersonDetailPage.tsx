/**
 * Person Detail Page for Madagascar Driver's License System
 * Full page view of person details with related records
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Stack,
  Divider,
  Alert,
  CircularProgress,
  Button,
  IconButton,
  Tab,
  Tabs,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  Edit as EditIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Description as DocumentIcon,
  CalendarToday as CalendarIcon,
  CreditCard as LicenseIcon,
  Assignment as ApplicationIcon,
  Receipt as TransactionIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';

import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config/api';

// Types
interface PersonDetail {
  id: string;
  surname: string;
  first_name: string;
  middle_name?: string;
  person_nature: string;
  birth_date?: string;
  nationality_code: string;
  preferred_language: string;
  email_address?: string;
  work_phone?: string;
  cell_phone_country_code: string;
  cell_phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  aliases?: Array<{
    id: string;
    document_type: string;
    document_number: string;
    country_of_issue: string;
    name_in_document?: string;
    is_primary: boolean;
    is_current: boolean;
    expiry_date?: string;
  }>;
  addresses?: Array<{
    id: string;
    address_type: string;
    street_line1?: string;
    street_line2?: string;
    locality: string;
    postal_code: string;
    town: string;
    country: string;
    province_code?: string;
    is_primary: boolean;
  }>;
}

interface License {
  id: string;
  license_category: string;
  license_type: string;
  issue_date: string;
  expiry_date?: string;
  status: string;
  created_at: string;
}

interface Application {
  id: string;
  application_type: string;
  license_category: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Card {
  id: string;
  card_type: string;
  card_number: string;
  issue_date: string;
  expiry_date: string;
  status: string;
  created_at: string;
}

// Constants
const DOCUMENT_TYPES = [
  { value: 'MG_ID', label: 'MADAGASCAR ID (CIN/CNI)' },
  { value: 'PASSPORT', label: 'PASSPORT' },
];

const PERSON_NATURES = [
  { value: '01', label: 'MALE (LEHILAHY)' },
  { value: '02', label: 'FEMALE (VEHIVAVY)' },
];

const LANGUAGES = [
  { value: 'mg', label: 'MALAGASY' },
  { value: 'fr', label: 'FRANÇAIS' },
  { value: 'en', label: 'ENGLISH' },
];

const PersonDetailPage: React.FC = () => {
  const { personId } = useParams<{ personId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasPermission, accessToken } = useAuth();

  // State
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);

  // Load person details
  useEffect(() => {
    if (!personId || !accessToken) return;
    
    loadPersonDetails();
  }, [personId, accessToken]);

  const loadPersonDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load person details
      const personResponse = await fetch(`${API_BASE_URL}/api/v1/persons/${personId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });

      if (!personResponse.ok) {
        throw new Error(`Failed to load person: ${personResponse.statusText}`);
      }

      const personData = await personResponse.json();
      setPerson(personData);

      // Load related data in parallel
      await Promise.allSettled([
        loadLicenses(),
        loadApplications(),
        loadCards(),
      ]);

    } catch (err) {
      console.error('Failed to load person details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load person details');
    } finally {
      setLoading(false);
    }
  };

  const loadLicenses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/persons/${personId}/licenses`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLicenses(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load licenses:', err);
    }
  };

  const loadApplications = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/applications?person_id=${personId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setApplications(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load applications:', err);
    }
  };

  const loadCards = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/persons/${personId}/cards`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCards(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load cards:', err);
    }
  };

  // Helper functions
  const getPersonNatureDisplay = (personNature: string) => {
    return PERSON_NATURES.find(n => n.value === personNature)?.label || personNature;
  };

  const getDocumentTypeDisplay = (documentType: string) => {
    return DOCUMENT_TYPES.find(d => d.value === documentType)?.label || documentType;
  };

  const getLanguageDisplay = (language: string) => {
    return LANGUAGES.find(l => l.value === language)?.label || language?.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-GB');
    } catch {
      return dateString;
    }
  };

  const getPrimaryDocument = () => {
    return person?.aliases?.find(alias => alias.is_primary);
  };

  const getPrimaryAddress = () => {
    return person?.addresses?.find(address => address.is_primary);
  };

  const handleBack = () => {
    // Check if we should return to search with preserved state
    const returnTo = searchParams.get('returnTo');
    const filters = searchParams.get('filters');
    const query = searchParams.get('query');
    const page = searchParams.get('page');
    const rowsPerPage = searchParams.get('rowsPerPage');

    if (returnTo === 'search' && filters) {
      // Return to search with preserved state
      const params = new URLSearchParams();
      params.set('filters', filters);
      if (query) params.set('query', query);
      if (page) params.set('page', page);
      if (rowsPerPage) params.set('rowsPerPage', rowsPerPage);
      
      navigate(`/dashboard/persons/search?${params.toString()}`);
    } else {
      // Default navigation
      navigate('/dashboard/persons/search');
    }
  };

  const handleEdit = () => {
    if (!person) return;
    
    // Preserve return state for edit navigation
    const currentUrl = new URL(window.location.href);
    const editParams = new URLSearchParams();
    editParams.set('returnTo', 'detail');
    editParams.set('personId', person.id);
    
    // Copy existing search params if they exist
    const returnTo = searchParams.get('returnTo');
    const filters = searchParams.get('filters');
    const query = searchParams.get('query');
    const page = searchParams.get('page');
    const rowsPerPage = searchParams.get('rowsPerPage');
    
    if (returnTo) editParams.set('originalReturnTo', returnTo);
    if (filters) editParams.set('filters', filters);
    if (query) editParams.set('query', query);
    if (page) editParams.set('page', page);
    if (rowsPerPage) editParams.set('rowsPerPage', rowsPerPage);

    navigate(`/dashboard/persons/edit/${person.id}?${editParams.toString()}`);
  };

  const handleViewApplication = (applicationId: string) => {
    navigate(`/dashboard/applications/${applicationId}`);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // Check permissions
  if (!hasPermission('persons.read')) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          You don't have permission to view person details. Contact your administrator.
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={48} />
        </Box>
      </Container>
    );
  }

  if (error || !person) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert 
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={loadPersonDetails}>
              Retry
            </Button>
          }
        >
          <Typography variant="h6">Error loading person details</Typography>
          <Typography variant="body2">{error || 'Person not found'}</Typography>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton onClick={handleBack} color="primary">
            <ArrowBack />
          </IconButton>
          <PersonIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" component="h1">
            {[person.first_name, person.middle_name, person.surname].filter(Boolean).join(' ')}
          </Typography>
          {hasPermission('persons.update') && (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={handleEdit}
              sx={{ ml: 'auto' }}
            >
              Edit Person
            </Button>
          )}
        </Box>
        <Typography variant="body1" color="text.secondary">
          Complete person record with all associated data
        </Typography>
      </Box>

      {/* Personal Information Card */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="primary">
            Personal Information
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="text.secondary">Gender</Typography>
              <Typography variant="body1">
                {getPersonNatureDisplay(person.person_nature)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="text.secondary">Birth Date</Typography>
              <Typography variant="body1">
                {person.birth_date ? formatDate(person.birth_date) : 'NOT PROVIDED'}
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="text.secondary">Nationality</Typography>
              <Typography variant="body1">
                {person.nationality_code === 'MG' ? 'MALAGASY' : person.nationality_code}
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="text.secondary">Language</Typography>
              <Typography variant="body1">
                {getLanguageDisplay(person.preferred_language)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">Status</Typography>
              <Chip
                label={person.is_active ? 'ACTIVE' : 'INACTIVE'}
                color={person.is_active ? 'success' : 'default'}
                size="small"
              />
            </Grid>
          </Grid>

          {/* Contact Information */}
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" gutterBottom color="primary">
            <PhoneIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Contact Information
          </Typography>
          <Grid container spacing={3}>
            {person.email_address && (
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmailIcon fontSize="small" />
                  {person.email_address}
                </Typography>
              </Grid>
            )}
            {person.cell_phone && (
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Cell Phone</Typography>
                <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PhoneIcon fontSize="small" />
                  {person.cell_phone_country_code} {person.cell_phone}
                </Typography>
              </Grid>
            )}
            {person.work_phone && (
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Work Phone</Typography>
                <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PhoneIcon fontSize="small" />
                  {person.work_phone}
                </Typography>
              </Grid>
            )}
          </Grid>

          {/* Documents */}
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" gutterBottom color="primary">
            <DocumentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Documents ({person.aliases?.length || 0})
          </Typography>
          {person.aliases?.map((alias) => (
            <Box key={alias.id} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">Document Type</Typography>
                  <Typography variant="body1">
                    {getDocumentTypeDisplay(alias.document_type)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">Document Number</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {alias.document_number}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                  <Stack direction="row" spacing={1}>
                    {alias.is_primary && <Chip label="PRIMARY" size="small" color="primary" />}
                    {alias.is_current && <Chip label="CURRENT" size="small" color="success" />}
                  </Stack>
                </Grid>
                {alias.name_in_document && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Name in Document</Typography>
                    <Typography variant="body1">
                      {alias.name_in_document}
                    </Typography>
                  </Grid>
                )}
                {alias.expiry_date && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">Expiry Date</Typography>
                    <Typography variant="body1">
                      {formatDate(alias.expiry_date)}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          ))}

          {/* Addresses */}
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" gutterBottom color="primary">
            <LocationIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Addresses ({person.addresses?.length || 0})
          </Typography>
          {person.addresses?.map((address) => (
            <Box key={address.id} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    {address.address_type === 'RESIDENTIAL' ? 'RESIDENTIAL ADDRESS' : 'POSTAL ADDRESS'}
                    {address.is_primary && <Chip label="PRIMARY" size="small" color="primary" sx={{ ml: 1 }} />}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Full Address</Typography>
                  <Typography variant="body1">
                    {[address.street_line1, address.street_line2, address.locality, address.town].filter(Boolean).join(', ')}
                    {address.postal_code && ` - ${address.postal_code}`}
                    <br />
                    {address.country}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          ))}
        </CardContent>
      </Card>

      {/* Related Records Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange} aria-label="person related records">
            <Tab icon={<LicenseIcon />} label={`Licenses (${licenses.length})`} />
            <Tab icon={<CreditCard />} label={`Cards (${cards.length})`} />
            <Tab icon={<ApplicationIcon />} label={`Applications (${applications.length})`} />
            <Tab icon={<TransactionIcon />} label="Transactions (0)" />
          </Tabs>
        </Box>

        <CardContent>
          {/* Licenses Tab */}
          {currentTab === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                License Records
              </Typography>
              {licenses.length === 0 ? (
                <Alert severity="info">No licenses found for this person.</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Category</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Issue Date</TableCell>
                        <TableCell>Expiry Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {licenses.map((license) => (
                        <TableRow key={license.id}>
                          <TableCell>{license.license_category}</TableCell>
                          <TableCell>{license.license_type}</TableCell>
                          <TableCell>{formatDate(license.issue_date)}</TableCell>
                          <TableCell>{license.expiry_date ? formatDate(license.expiry_date) : 'N/A'}</TableCell>
                          <TableCell>
                            <Chip label={license.status} size="small" color="success" />
                          </TableCell>
                          <TableCell>
                            <Tooltip title="View License">
                              <IconButton size="small">
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {/* Cards Tab */}
          {currentTab === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Card Records
              </Typography>
              {cards.length === 0 ? (
                <Alert severity="info">No cards found for this person.</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Card Number</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Issue Date</TableCell>
                        <TableCell>Expiry Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cards.map((card) => (
                        <TableRow key={card.id}>
                          <TableCell>{card.card_number}</TableCell>
                          <TableCell>{card.card_type}</TableCell>
                          <TableCell>{formatDate(card.issue_date)}</TableCell>
                          <TableCell>{formatDate(card.expiry_date)}</TableCell>
                          <TableCell>
                            <Chip label={card.status} size="small" color="success" />
                          </TableCell>
                          <TableCell>
                            <Tooltip title="View Card">
                              <IconButton size="small">
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {/* Applications Tab */}
          {currentTab === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Application Records
              </Typography>
              {applications.length === 0 ? (
                <Alert severity="info">No applications found for this person.</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Application ID</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {applications.map((application) => (
                        <TableRow key={application.id}>
                          <TableCell>{application.id.substring(0, 8)}...</TableCell>
                          <TableCell>{application.application_type.replace(/_/g, ' ')}</TableCell>
                          <TableCell>{application.license_category}</TableCell>
                          <TableCell>
                            <Chip label={application.status} size="small" color="primary" />
                          </TableCell>
                          <TableCell>{formatDate(application.created_at)}</TableCell>
                          <TableCell>
                            <Tooltip title="View Application">
                              <IconButton 
                                size="small"
                                onClick={() => handleViewApplication(application.id)}
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {/* Transactions Tab */}
          {currentTab === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Transaction Records
              </Typography>
              <Alert severity="info">
                Transactions section will be implemented in a future update. This will show all financial transactions related to this person's applications and services.
              </Alert>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Audit Information */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="primary">
            <CalendarIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Audit Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">Created</Typography>
              <Typography variant="body1">
                {formatDate(person.created_at)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">Last Updated</Typography>
              <Typography variant="body1">
                {formatDate(person.updated_at)}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
};

export default PersonDetailPage; 