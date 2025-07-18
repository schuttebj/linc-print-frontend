/**
 * Person Search Page for Madagascar Driver's License System
 * Search and browse existing person records with full CRUD capabilities
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  TablePagination,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Stack,
  CircularProgress,
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Description as DocumentIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config/api';

// Types for Madagascar person search
interface PersonSearchForm {
  search_text?: string;
  document_number?: string;
  surname?: string;
  first_name?: string;
  locality?: string;
  phone_number?: string;
  document_type?: string;
  is_active?: boolean;
}

interface PersonSearchResult {
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

// Updated constants with proper capitalization
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

const PersonSearchPage: React.FC = () => {
  const { hasPermission, accessToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // State management
  const [searchResults, setSearchResults] = useState<PersonSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Delete dialog states
  const [selectedPerson, setSelectedPerson] = useState<PersonSearchResult | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  

  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Restore search state from URL parameters when returning from edit
  useEffect(() => {
    if (!accessToken) return;

    // Check for encoded filters (from edit navigation)
    const urlFilters = searchParams.get('filters');
    const urlPage = searchParams.get('page');
    const urlRowsPerPage = searchParams.get('rowsPerPage');
    
    if (urlFilters) {
      try {
        const filters = JSON.parse(decodeURIComponent(urlFilters));
        const restoredPage = urlPage ? parseInt(urlPage) : 0;
        const restoredRowsPerPage = urlRowsPerPage ? parseInt(urlRowsPerPage) : 10;
        
        // Restore form values
        searchForm.reset(filters);
        
        // Restore pagination state
        setPage(restoredPage);
        setRowsPerPage(restoredRowsPerPage);
        
        // Perform search with restored state - pass pagination parameters explicitly
        performSearchWithPagination(filters, restoredPage, restoredRowsPerPage);
        
        // Clean up URL parameters after restoration
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        
      } catch (error) {
        console.warn('Failed to restore search state:', error);
      }
    } 
    // Check for direct URL parameters (from browser navigation or external links)
    else {
      const directParams: PersonSearchForm = {};
      let hasParams = false;
      
      // Check each form field for direct URL parameters
      const searchText = searchParams.get('search_text');
      const documentNumber = searchParams.get('document_number');
      const surname = searchParams.get('surname');
      const firstName = searchParams.get('first_name');
      const locality = searchParams.get('locality');
      const phoneNumber = searchParams.get('phone_number');
      const documentType = searchParams.get('document_type');
      const isActive = searchParams.get('is_active');
      
      if (searchText) { directParams.search_text = searchText; hasParams = true; }
      if (documentNumber) { directParams.document_number = documentNumber; hasParams = true; }
      if (surname) { directParams.surname = surname; hasParams = true; }
      if (firstName) { directParams.first_name = firstName; hasParams = true; }
      if (locality) { directParams.locality = locality; hasParams = true; }
      if (phoneNumber) { directParams.phone_number = phoneNumber; hasParams = true; }
      if (documentType) { directParams.document_type = documentType; hasParams = true; }
      if (isActive !== null) { 
        directParams.is_active = isActive === 'true'; 
        hasParams = true; 
      }
      
      if (hasParams) {
        console.log('Restoring search from direct URL parameters:', directParams);
        
        // Restore form values
        searchForm.reset(directParams);
        
        // Perform search with direct parameters
        performSearchWithPagination(directParams, 0, 10);
        
        // Clean up URL parameters after restoration
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [searchParams, accessToken]);

  // Helper function to perform search with explicit pagination
  const performSearchWithPagination = async (data: PersonSearchForm, currentPage = page, currentRowsPerPage = rowsPerPage) => {
    setSearching(true);
    setHasSearched(true);
    
    try {
      console.log('Searching for persons with:', data, 'Page:', currentPage, 'RowsPerPage:', currentRowsPerPage);
      
      // Build search parameters
      const searchParams = new URLSearchParams();
      
      // Add non-empty search parameters
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      
      // Add pagination and include details
      searchParams.append('skip', String(currentPage * currentRowsPerPage));
      searchParams.append('limit', String(currentRowsPerPage));
      searchParams.append('include_details', 'true');
      
      const response = await fetch(`${API_BASE_URL}/api/v1/persons/search?${searchParams}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      
      const searchResult = await response.json();
      console.log('Search result:', searchResult);
      
      if (Array.isArray(searchResult)) {
        setSearchResults(searchResult);
        setTotalResults(searchResult.length);
      } else {
        setSearchResults([]);
        setTotalResults(0);
      }
      
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
      setTotalResults(0);
      setSnackbar({
        open: true,
        message: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setSearching(false);
    }
  };

  // Search form
  const searchForm = useForm<PersonSearchForm>({
    defaultValues: {
      search_text: '',
      document_number: '',
      surname: '',
      first_name: '',
      locality: '',
      phone_number: '',
      document_type: '',
      is_active: true,
    },
  });

  // Perform search with API integration
  const onSearch = async (data: PersonSearchForm) => {
    await performSearchWithPagination(data, page, rowsPerPage);
  };

  // Clear search
  const clearSearch = () => {
    searchForm.reset({
      search_text: '',
      document_number: '',
      surname: '',
      first_name: '',
      locality: '',
      phone_number: '',
      document_type: '',
      is_active: true,
    });
    setSearchResults([]);
    setHasSearched(false);
    setTotalResults(0);
    setPage(0);
  };

  // Handle pagination
  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
    // Re-run search with new page
    if (hasSearched) {
      performSearchWithPagination(searchForm.getValues(), newPage, rowsPerPage);
    }
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    // Re-run search with new page size
    if (hasSearched) {
      performSearchWithPagination(searchForm.getValues(), 0, newRowsPerPage);
    }
  };

  // View person details - navigate to full page
  const viewPersonDetails = (person: PersonSearchResult) => {
    // Encode current search state to preserve when returning
    const currentFilters = searchForm.getValues();
    const searchState = {
      filters: encodeURIComponent(JSON.stringify(currentFilters)),
      query: currentFilters.search_text || '',
      page: page.toString(),
      rowsPerPage: rowsPerPage.toString()
    };
    
    const params = new URLSearchParams(searchState);
    navigate(`/dashboard/persons/detail/${person.id}?returnTo=search&${params.toString()}`);
  };

  // Edit person - navigate to PersonManagementPage
  const editPerson = (person: PersonSearchResult) => {
    // Encode current search state to preserve when returning
    const currentFilters = searchForm.getValues();
    const searchState = {
      filters: encodeURIComponent(JSON.stringify(currentFilters)),
      query: currentFilters.search_text || '',
      page: page.toString(),
      rowsPerPage: rowsPerPage.toString()
    };
    
    const params = new URLSearchParams(searchState);
    navigate(`/dashboard/persons/edit/${person.id}?returnTo=search&${params.toString()}`);
  };

  // Delete person
  const deletePerson = (person: PersonSearchResult) => {
    setSelectedPerson(person);
    setShowDeleteDialog(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!selectedPerson) return;
    
    setDeleteLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/persons/${selectedPerson.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });
      
      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }
      
      // Remove from results and update UI
      setSearchResults(prev => prev.filter(p => p.id !== selectedPerson.id));
      setTotalResults(prev => prev - 1);
      
      setSnackbar({
        open: true,
        message: `Successfully deleted ${selectedPerson.first_name} ${selectedPerson.surname}`,
        severity: 'success'
      });
      
      setShowDeleteDialog(false);
      setSelectedPerson(null);
      
    } catch (error) {
      console.error('Delete failed:', error);
      setSnackbar({
        open: true,
        message: `Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setDeleteLoading(false);
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

  const getPrimaryDocument = (person: PersonSearchResult) => {
    return person.aliases?.find(alias => alias.is_primary);
  };

  const getPrimaryAddress = (person: PersonSearchResult) => {
    return person.addresses?.find(address => address.is_primary);
  };

  // Check permissions
  if (!hasPermission('persons.read')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You don't have permission to search persons. Contact your administrator.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Person Search
        </Typography>
        
        {hasPermission('persons.create') && (
          <Button
            variant="contained"
            onClick={() => navigate('/dashboard/persons/manage')}
            startIcon={<PersonIcon />}
          >
            Add New Person
          </Button>
        )}
      </Box>
      
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Search for existing Madagascar citizens in the system.
      </Typography>

      {/* Search Form */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Search Criteria
          </Typography>
          
          <form onSubmit={searchForm.handleSubmit(onSearch)}>
            <Grid container spacing={3}>
              {/* Quick Search */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="search_text"
                  control={searchForm.control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Quick Search"
                      placeholder="Search by name, document number, or phone"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                        endAdornment: field.value && (
                          <InputAdornment position="end">
                            <IconButton onClick={() => searchForm.setValue('search_text', '')} size="small">
                              <ClearIcon />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="document_number"
                  control={searchForm.control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Document Number"
                      placeholder="Enter exact document number"
                    />
                  )}
                />
              </Grid>

              {/* Advanced Search Fields */}
              <Grid item xs={12} md={4}>
                <Controller
                  name="surname"
                  control={searchForm.control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Surname"
                      placeholder="Family name"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Controller
                  name="first_name"
                  control={searchForm.control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="First Name"
                      placeholder="Given name"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Controller
                  name="locality"
                  control={searchForm.control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Locality"
                      placeholder="Village, quartier, city"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Controller
                  name="phone_number"
                  control={searchForm.control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Phone Number"
                      placeholder="Cell or work phone"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Controller
                  name="document_type"
                  control={searchForm.control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Document Type</InputLabel>
                      <Select {...field} label="Document Type">
                        <MenuItem value="">ALL TYPES</MenuItem>
                        {DOCUMENT_TYPES.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Controller
                  name="is_active"
                  control={searchForm.control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select 
                        {...field} 
                        label="Status"
                        value={field.value === undefined ? "" : String(field.value)}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "") {
                            field.onChange(undefined);
                          } else {
                            field.onChange(value === "true");
                          }
                        }}
                      >
                        <MenuItem value="">ALL STATUSES</MenuItem>
                        <MenuItem value="true">ACTIVE ONLY</MenuItem>
                        <MenuItem value="false">INACTIVE ONLY</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              {/* Search Actions */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={clearSearch}
                    startIcon={<ClearIcon />}
                  >
                    Clear
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={searching}
                    startIcon={searching ? <CircularProgress size={20} /> : <SearchIcon />}
                  >
                    {searching ? 'Searching...' : 'Search'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>

      {/* Search Results */}
      {hasSearched && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Search Results ({totalResults} found)
              </Typography>
            </Box>

            {searchResults.length === 0 ? (
              <Alert severity="info">
                No persons found matching your search criteria. Try adjusting your search terms.
              </Alert>
            ) : (
              <>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Gender</TableCell>
                        <TableCell>Primary Document</TableCell>
                        <TableCell>Contact</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {searchResults
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((person) => {
                          const primaryDoc = getPrimaryDocument(person);
                          const primaryAddress = getPrimaryAddress(person);
                          
                          return (
                            <TableRow key={person.id} hover>
                              <TableCell>
                                <Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    {[person.first_name, person.middle_name, person.surname].filter(Boolean).join(' ')}
                                  </Typography>
                                  {person.birth_date && (
                                    <Typography variant="caption" color="text.secondary">
                                      Born: {formatDate(person.birth_date)}
                                    </Typography>
                                  )}
                                  {primaryAddress && (
                                    <Typography variant="caption" color="text.secondary" display="block">
                                      {primaryAddress.locality}, {primaryAddress.town}
                                    </Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={getPersonNatureDisplay(person.person_nature)}
                                  size="small"
                                  color={person.person_nature === '01' ? 'primary' : 'secondary'}
                                />
                              </TableCell>
                              <TableCell>
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {primaryDoc?.document_number || 'NO DOCUMENT'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {getDocumentTypeDisplay(primaryDoc?.document_type || '')}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box>
                                  {person.cell_phone && (
                                    <Typography variant="body2">
                                      {person.cell_phone_country_code} {person.cell_phone}
                                    </Typography>
                                  )}
                                  {person.email_address && (
                                    <Typography variant="caption" color="text.secondary" display="block">
                                      {person.email_address}
                                    </Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={person.is_active ? 'ACTIVE' : 'INACTIVE'}
                                  color={person.is_active ? 'success' : 'default'}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {formatDate(person.created_at)}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <Tooltip title="View Details">
                                    <IconButton
                                      size="small"
                                      onClick={() => viewPersonDetails(person)}
                                    >
                                      <VisibilityIcon />
                                    </IconButton>
                                  </Tooltip>
                                  {hasPermission('persons.update') && (
                                    <Tooltip title="Edit Person">
                                      <IconButton
                                        size="small"
                                        onClick={() => editPerson(person)}
                                        color="primary"
                                      >
                                        <EditIcon />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  {hasPermission('persons.delete') && (
                                    <Tooltip title="Delete Person">
                                      <IconButton
                                        size="small"
                                        onClick={() => deletePerson(person)}
                                        color="error"
                                      >
                                        <DeleteIcon />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  component="div"
                  count={totalResults}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handlePageChange}
                  onRowsPerPageChange={handleRowsPerPageChange}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}



      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={showDeleteDialog} 
        onClose={() => {}}
        disableEscapeKeyDown
        maxWidth="sm" 
        fullWidth
        slotProps={{
          backdrop: {
            onClick: (event) => {
              console.log('🚨 PersonSearchPage DELETE DIALOG: Backdrop clicked!', event);
              event.stopPropagation();
              event.preventDefault();
            }
          }
        }}
      >
        <DialogTitle>
          <Typography variant="h6" color="error">
            Confirm Delete
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedPerson && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                This action cannot be undone. All associated data will be permanently removed.
              </Alert>
              <Typography variant="body1">
                Are you sure you want to delete the person record for:
              </Typography>
              <Typography variant="h6" sx={{ mt: 1, fontWeight: 600 }}>
                {[selectedPerson.first_name, selectedPerson.middle_name, selectedPerson.surname].filter(Boolean).join(' ')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                This will also delete all associated documents and addresses.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {deleteLoading ? 'Deleting...' : 'Delete Person'}
          </Button>
        </DialogActions>
      </Dialog>



      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PersonSearchPage; 