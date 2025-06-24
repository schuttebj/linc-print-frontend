/**
 * Person Search Page for Madagascar Driver's License System
 * Search and browse existing person records
 */

import React, { useState } from 'react';
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
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';

import { useAuth } from '../../contexts/AuthContext';

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
  is_active: boolean;
  primary_document?: string;
  primary_document_type?: string;
  cell_phone?: string;
  email_address?: string;
  created_at: string;
}

const DOCUMENT_TYPES = [
  { value: 'MG_ID', label: 'Madagascar ID (CIN/CNI)' },
  { value: 'PASSPORT', label: 'Passport' },
];

const PERSON_NATURES = [
  { value: '01', label: 'Male (Lehilahy)' },
  { value: '02', label: 'Female (Vehivavy)' },
];

const PersonSearchPage: React.FC = () => {
  const { hasPermission } = useAuth();
  
  // State management
  const [searchResults, setSearchResults] = useState<PersonSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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

  // Perform search
  const onSearch = async (data: PersonSearchForm) => {
    setSearching(true);
    setHasSearched(true);
    
    try {
      console.log('Searching for persons with:', data);
      
      // TODO: Implement API call to search persons
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock search results for demo
      const mockResults: PersonSearchResult[] = [
        {
          id: '1',
          surname: 'RAKOTO',
          first_name: 'Jean',
          middle_name: 'Pierre',
          person_nature: '01',
          birth_date: '1990-05-15',
          nationality_code: 'MG',
          is_active: true,
          primary_document: '123456789012',
          primary_document_type: 'MG_ID',
          cell_phone: '0321234567',
          email_address: 'jean.rakoto@example.mg',
          created_at: '2024-01-15T10:30:00Z',
        },
        {
          id: '2',
          surname: 'RAZAFY',
          first_name: 'Marie',
          person_nature: '02',
          birth_date: '1985-08-22',
          nationality_code: 'MG',
          is_active: true,
          primary_document: 'P123456789',
          primary_document_type: 'PASSPORT',
          cell_phone: '0341234567',
          created_at: '2024-01-10T14:20:00Z',
        },
      ];
      
      setSearchResults(mockResults);
      setTotalResults(mockResults.length);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
      setTotalResults(0);
    } finally {
      setSearching(false);
    }
  };

  // Clear search
  const clearSearch = () => {
    searchForm.reset();
    setSearchResults([]);
    setHasSearched(false);
    setTotalResults(0);
    setPage(0);
  };

  // Handle pagination
  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // View person details
  const viewPersonDetails = (person: PersonSearchResult) => {
    console.log('Viewing person:', person);
    alert(`View details for: ${person.first_name} ${person.surname}\nFeature coming soon!`);
  };

  // Edit person
  const editPerson = (person: PersonSearchResult) => {
    console.log('Editing person:', person);
    alert(`Edit person: ${person.first_name} ${person.surname}\nFeature coming soon!`);
  };

  // Helper functions
  const getPersonNatureDisplay = (personNature: string) => {
    return PERSON_NATURES.find(n => n.value === personNature)?.label || personNature;
  };

  const getDocumentTypeDisplay = (documentType: string) => {
    return DOCUMENT_TYPES.find(d => d.value === documentType)?.label || documentType;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-GB');
    } catch {
      return dateString;
    }
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
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Person Search
      </Typography>
      
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
                        <MenuItem value="">All Types</MenuItem>
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
                        <MenuItem value="">All Statuses</MenuItem>
                        <MenuItem value="true">Active Only</MenuItem>
                        <MenuItem value="false">Inactive Only</MenuItem>
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
                    startIcon={<SearchIcon />}
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
                        <TableCell>Document</TableCell>
                        <TableCell>Contact</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {searchResults
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((person) => (
                          <TableRow key={person.id} hover>
                            <TableCell>
                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  {person.first_name} {person.middle_name} {person.surname}
                                </Typography>
                                {person.birth_date && (
                                  <Typography variant="caption" color="text.secondary">
                                    Born: {formatDate(person.birth_date)}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              {getPersonNatureDisplay(person.person_nature)}
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2">
                                  {person.primary_document}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {getDocumentTypeDisplay(person.primary_document_type || '')}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box>
                                {person.cell_phone && (
                                  <Typography variant="body2">
                                    +261 {person.cell_phone}
                                  </Typography>
                                )}
                                {person.email_address && (
                                  <Typography variant="caption" color="text.secondary">
                                    {person.email_address}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={person.is_active ? 'Active' : 'Inactive'}
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
                                <IconButton
                                  size="small"
                                  onClick={() => viewPersonDetails(person)}
                                  title="View Details"
                                >
                                  <VisibilityIcon />
                                </IconButton>
                                {hasPermission('persons.update') && (
                                  <IconButton
                                    size="small"
                                    onClick={() => editPerson(person)}
                                    title="Edit Person"
                                  >
                                    <EditIcon />
                                  </IconButton>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
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
    </Box>
  );
};

export default PersonSearchPage; 