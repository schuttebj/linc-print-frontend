/**
 * License List Page for Madagascar License System
 * Comprehensive interface for viewing and searching all licenses
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Stack,
  Autocomplete,
  FormControlLabel,
  Switch,
  Collapse
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  FilterList as FilterIcon,
  Download as ExportIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

import licenseService, { 
  License, 
  LicenseSearchFilters, 
  LicenseListResponse 
} from '../../services/licenseService';
import { useAuth } from '../../contexts/AuthContext';

interface LicenseListPageProps {}

const LicenseListPage: React.FC<LicenseListPageProps> = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State management
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Search and filters
  const [searchFilters, setSearchFilters] = useState<LicenseSearchFilters>({
    page: 1,
    size: 25
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');

  // Load licenses
  const loadLicenses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: LicenseListResponse = await licenseService.searchLicenses({
        ...searchFilters,
        page: page + 1, // Backend uses 1-based pagination
        size: rowsPerPage
      });

      setLicenses(response.licenses);
      setTotalCount(response.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load licenses');
      console.error('Error loading licenses:', err);
    } finally {
      setLoading(false);
    }
  }, [searchFilters, page, rowsPerPage]);

  // Initial load
  useEffect(() => {
    loadLicenses();
  }, [loadLicenses]);

  // Handle search
  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(0); // Reset to first page
    loadLicenses();
  };

  // Handle quick search
  const handleQuickSearch = () => {
    if (quickSearch.trim()) {
      setSearchFilters(prev => ({
        ...prev,
        license_number: quickSearch.trim()
      }));
      setPage(0);
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchFilters({
      page: 1,
      size: rowsPerPage
    });
    setQuickSearch('');
    setPage(0);
  };

  // Handle pagination
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Navigation functions
  const handleViewLicense = (license: License) => {
    navigate(`/licenses/${license.id}`);
  };

  const handleViewPerson = (personId: string) => {
    navigate(`/persons/${personId}`);
  };

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

  const getProfessionalPermitChip = (license: License) => {
    if (!license.has_professional_permit || !license.professional_permit_categories.length) {
      return null;
    }

    return (
      <Chip 
        label={`PrDP: ${license.professional_permit_categories.join(', ')}`}
        color="info"
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

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardHeader
          title="License Management"
          subheader={`${totalCount} licenses found`}
          action={
            <Stack direction="row" spacing={1}>
              <Tooltip title="Refresh">
                <IconButton onClick={loadLicenses} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export">
                <IconButton disabled={loading}>
                  <ExportIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          }
        />
        <CardContent>
          {/* Quick Search */}
          <Box component="form" onSubmit={handleSearch} sx={{ mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Quick Search (License Number)"
                  value={quickSearch}
                  onChange={(e) => setQuickSearch(e.target.value)}
                  placeholder="Enter license number..."
                  InputProps={{
                    endAdornment: (
                      <IconButton 
                        onClick={handleQuickSearch}
                        disabled={loading || !quickSearch.trim()}
                      >
                        <SearchIcon />
                      </IconButton>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Button
                  variant="outlined"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  startIcon={<FilterIcon />}
                  endIcon={showAdvancedFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  fullWidth
                >
                  Advanced Filters
                </Button>
              </Grid>
              <Grid item xs={12} md={3}>
                <Button
                  variant="outlined"
                  onClick={handleClearFilters}
                  startIcon={<ClearIcon />}
                  disabled={loading}
                  fullWidth
                >
                  Clear Filters
                </Button>
              </Grid>
            </Grid>
          </Box>

          {/* Advanced Filters */}
          <Collapse in={showAdvancedFilters}>
            <Card variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Advanced Search Filters
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>License Category</InputLabel>
                    <Select
                      value={searchFilters.category || ''}
                      onChange={(e) => setSearchFilters(prev => ({ 
                        ...prev, 
                        category: e.target.value || undefined 
                      }))}
                      label="License Category"
                    >
                      <MenuItem value="">All Categories</MenuItem>
                      <MenuItem value="A1">A1 - Small Motorcycles</MenuItem>
                      <MenuItem value="A2">A2 - Mid-range Motorcycles</MenuItem>
                      <MenuItem value="A">A - Unlimited Motorcycles</MenuItem>
                      <MenuItem value="B1">B1 - Light Quadricycles</MenuItem>
                      <MenuItem value="B">B - Standard Cars</MenuItem>
                      <MenuItem value="B2">B2 - Commercial Passenger</MenuItem>
                      <MenuItem value="BE">BE - Car with Trailer</MenuItem>
                      <MenuItem value="C1">C1 - Medium Goods</MenuItem>
                      <MenuItem value="C">C - Heavy Goods</MenuItem>
                      <MenuItem value="C1E">C1E - Medium with Trailer</MenuItem>
                      <MenuItem value="CE">CE - Heavy with Trailer</MenuItem>
                      <MenuItem value="D1">D1 - Small Buses</MenuItem>
                      <MenuItem value="D">D - Standard Buses</MenuItem>
                      <MenuItem value="D2">D2 - Specialized Transport</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={searchFilters.status || ''}
                      onChange={(e) => setSearchFilters(prev => ({ 
                        ...prev, 
                        status: e.target.value || undefined 
                      }))}
                      label="Status"
                    >
                      <MenuItem value="">All Statuses</MenuItem>
                      <MenuItem value="ACTIVE">Active</MenuItem>
                      <MenuItem value="SUSPENDED">Suspended</MenuItem>
                      <MenuItem value="CANCELLED">Cancelled</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Issued After"
                    type="date"
                    value={searchFilters.issued_after || ''}
                    onChange={(e) => setSearchFilters(prev => ({ 
                      ...prev, 
                      issued_after: e.target.value || undefined 
                    }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Issued Before"
                    type="date"
                    value={searchFilters.issued_before || ''}
                    onChange={(e) => setSearchFilters(prev => ({ 
                      ...prev, 
                      issued_before: e.target.value || undefined 
                    }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={searchFilters.has_professional_permit || false}
                        onChange={(e) => setSearchFilters(prev => ({ 
                          ...prev, 
                          has_professional_permit: e.target.checked ? true : undefined 
                        }))}
                      />
                    }
                    label="Has Professional Permit Only"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Stack direction="row" spacing={2}>
                    <Button 
                      variant="contained" 
                      onClick={handleSearch}
                      disabled={loading}
                      startIcon={<SearchIcon />}
                    >
                      Apply Filters
                    </Button>
                    <Button 
                      variant="outlined" 
                      onClick={handleClearFilters}
                      disabled={loading}
                    >
                      Clear All
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Card>
          </Collapse>

          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Loading State */}
          {loading && (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          )}

          {/* License Table */}
          {!loading && (
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
                        {getProfessionalPermitChip(license)}
                      </TableCell>
                      <TableCell>
                        {license.current_card ? (
                          <Chip
                            label={license.current_card.status}
                            color={licenseService.getCardStatusColor(license.current_card.status)}
                            size="small"
                          />
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            No Card
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="View Details">
                            <IconButton 
                              size="small"
                              onClick={() => handleViewLicense(license)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View Person">
                            <IconButton 
                              size="small"
                              onClick={() => handleViewPerson(license.person_id)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {licenses.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography variant="body2" color="textSecondary" py={4}>
                          No licenses found matching your criteria
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Pagination */}
          {!loading && totalCount > 0 && (
            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage="Licenses per page:"
            />
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default LicenseListPage; 