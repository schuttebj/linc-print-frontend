/**
 * License List Page for Madagascar License System
 * Comprehensive interface for viewing and searching all licenses
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
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
  Alert,
  Stack,
  Skeleton,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Download as ExportIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

import licenseService, { 
  License, 
  LicenseSearchFilters, 
  LicenseListResponse 
} from '../../services/licenseService';
import { useAuth } from '../../contexts/AuthContext';
import FilterBar, { FilterConfig, FilterValues } from '../../components/common/FilterBar';

// Filter configurations for LicenseListPage
const LICENSE_FILTER_CONFIGS: FilterConfig[] = [
  {
    key: 'category',
    label: 'License Category',
    type: 'select',
    options: [
      { value: 'A1', label: 'A1 - Small Motorcycles' },
      { value: 'A2', label: 'A2 - Mid-range Motorcycles' },
      { value: 'A', label: 'A - Unlimited Motorcycles' },
      { value: 'B1', label: 'B1 - Light Quadricycles' },
      { value: 'B', label: 'B - Standard Cars' },
      { value: 'B2', label: 'B2 - Commercial Passenger' },
      { value: 'BE', label: 'BE - Car with Trailer' },
      { value: 'C1', label: 'C1 - Medium Goods' },
      { value: 'C', label: 'C - Heavy Goods' },
      { value: 'C1E', label: 'C1E - Medium with Trailer' },
      { value: 'CE', label: 'CE - Heavy with Trailer' },
      { value: 'D1', label: 'D1 - Small Buses' },
      { value: 'D', label: 'D - Standard Buses' },
      { value: 'D2', label: 'D2 - Specialized Transport' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'ACTIVE', label: 'Active' },
      { value: 'SUSPENDED', label: 'Suspended' },
      { value: 'CANCELLED', label: 'Cancelled' },
    ],
  },
  {
    key: 'has_professional_permit',
    label: 'Has Professional Permit',
    type: 'boolean',
  },
];

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

  // Filter state management for FilterBar
  const [searchValue, setSearchValue] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  
  // Date filters (handled separately until FilterBar supports dates)
  const [dateFilters, setDateFilters] = useState({
    issued_after: '',
    issued_before: '',
  });

  // Load licenses
  const loadLicenses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Combine all filter sources into searchFilters
      const searchFilters: LicenseSearchFilters = {
        page: page + 1, // Backend uses 1-based pagination
        size: rowsPerPage === -1 ? 100 : rowsPerPage, // Handle "All" option
        ...(searchValue && { person_name: searchValue }),
        ...filterValues,
        // Only include date filters if they have actual values (not empty strings)
        ...(dateFilters.issued_after && { issued_after: dateFilters.issued_after }),
        ...(dateFilters.issued_before && { issued_before: dateFilters.issued_before }),
      };

      const response: LicenseListResponse = await licenseService.searchLicenses(searchFilters);

      setLicenses(response.licenses);
      setTotalCount(response.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load licenses');
      console.error('Error loading licenses:', err);
    } finally {
      setLoading(false);
    }
  }, [searchValue, filterValues, dateFilters, page, rowsPerPage]);

  // Initial load
  useEffect(() => {
    loadLicenses();
  }, [loadLicenses]);

  // Handle FilterBar filter changes
  const handleFilterChange = (key: string, value: any) => {
    setFilterValues(prev => ({
      ...prev,
      [key]: value,
    }));
    setPage(0); // Reset to first page when filters change
  };

  // Handle search and clear for FilterBar
  const handleSearch = async () => {
    setPage(0);
    await loadLicenses();
  };

  const handleClear = () => {
    setSearchValue('');
    setFilterValues({});
    setDateFilters({
      issued_after: '',
      issued_before: '',
    });
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

  // Navigation functions
  const handleViewLicense = (license: License) => {
    navigate(`/dashboard/licenses/${license.id}`);
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
      return <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.8rem' }}>None</Typography>;
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

  // Skeleton loader component for license results
  const LicenseResultsSkeleton = () => (
    <TableContainer sx={{ flex: 1 }}>
      <Table stickyHeader sx={{ '& .MuiTableCell-root': { borderRadius: 0 } }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>License ID</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Category</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Issue Date</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Restrictions</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Professional Permit</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Current Card</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: rowsPerPage }).map((_, index) => (
            <TableRow key={index}>
              <TableCell sx={{ py: 1, px: 2 }}>
                <Skeleton variant="text" width="100%" height={20} />
                <Skeleton variant="text" width="70%" height={16} />
              </TableCell>
              <TableCell sx={{ py: 1, px: 2 }}>
                <Skeleton variant="rounded" width={40} height={24} />
              </TableCell>
              <TableCell sx={{ py: 1, px: 2 }}>
                <Skeleton variant="rounded" width={60} height={24} />
              </TableCell>
              <TableCell sx={{ py: 1, px: 2 }}>
                <Skeleton variant="text" width="100%" height={20} />
              </TableCell>
              <TableCell sx={{ py: 1, px: 2 }}>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Skeleton variant="rounded" width={50} height={24} />
                  <Skeleton variant="rounded" width={50} height={24} />
                </Box>
              </TableCell>
              <TableCell sx={{ py: 1, px: 2 }}>
                <Skeleton variant="rounded" width={80} height={24} />
              </TableCell>
              <TableCell sx={{ py: 1, px: 2 }}>
                <Skeleton variant="rounded" width={70} height={24} />
              </TableCell>
              <TableCell sx={{ py: 1, px: 2 }}>
                <Skeleton variant="circular" width={32} height={32} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <>
    <Container maxWidth="lg" sx={{ py: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper 
        elevation={0}
        sx={{ 
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#f8f9fa',
          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        {/* Search and Filter Section */}
        <Box sx={{ 
          bgcolor: 'white', 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          flexShrink: 0,
          p: 2
        }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
              Search Licenses
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                onClick={loadLicenses}
                startIcon={<RefreshIcon />}
                size="small"
                disabled={loading}
              >
                Refresh
              </Button>
              <Button
                variant="outlined"
                startIcon={<ExportIcon />}
                size="small"
                disabled={loading}
                sx={{
                  borderWidth: '1px',
                  '&:hover': { borderWidth: '1px' },
                }}
              >
                Export
              </Button>
            </Stack>
          </Box>
          
          <FilterBar
            searchValue={searchValue}
            searchPlaceholder="Search by person name"
            onSearchChange={setSearchValue}
            filterConfigs={LICENSE_FILTER_CONFIGS}
            filterValues={filterValues}
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
            onClear={handleClear}
            searching={loading}
          />
        </Box>

        {/* Content Area */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'hidden',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ m: 2, flexShrink: 0 }}>
              {error}
            </Alert>
          )}

          {/* License Table */}
          <Paper 
            elevation={0}
            sx={{ 
              bgcolor: 'white',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderRadius: 0
            }}
          >
            {/* Show skeleton while loading */}
            {loading ? (
              <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <LicenseResultsSkeleton />
                <TablePagination
                  component="div"
                  count={0}
                  page={page}
                  onPageChange={() => {}}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={() => {}}
                  rowsPerPageOptions={[10, 25, 50, { value: -1, label: 'All' }]}
                  sx={{
                    bgcolor: 'white',
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    flexShrink: 0,
                    '& .MuiTablePagination-toolbar': {
                      minHeight: '52px',
                    },
                    '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                      fontSize: '0.8rem',
                    },
                    '& .MuiTablePagination-select': {
                      fontSize: '0.8rem',
                    },
                  }}
                />
              </Box>
            ) : (
              /* Show results or no results message only after loading is complete */
              <>
                {licenses.length === 0 ? (
                  <Box sx={{ p: 2 }}>
                    <Alert severity="info">
                      No licenses found matching your search criteria. Try adjusting your search terms.
                    </Alert>
                  </Box>
                ) : (
                  <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <TableContainer sx={{ flex: 1 }}>
                      <Table stickyHeader sx={{ '& .MuiTableCell-root': { borderRadius: 0 } }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>License ID</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Category</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Issue Date</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Restrictions</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Professional Permit</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Current Card</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {licenses.map((license) => (
                            <TableRow key={license.id} hover>
                              <TableCell sx={{ py: 1, px: 2 }}>
                                <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.8rem' }}>
                                  {licenseService.formatLicenseId(license.id)}
                                </Typography>
                                {license.captured_from_license_number && (
                                  <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                                    Originally: {license.captured_from_license_number}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell sx={{ py: 1, px: 2 }}>
                                <Chip 
                                  label={license.category} 
                                  color="primary" 
                                  size="small"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell sx={{ py: 1, px: 2 }}>
                                {getStatusChip(license.status)}
                              </TableCell>
                              <TableCell sx={{ py: 1, px: 2 }}>
                                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                  {formatDate(license.issue_date)}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ py: 1, px: 2 }}>
                                {getRestrictionsDisplay(license.restrictions)}
                              </TableCell>
                              <TableCell sx={{ py: 1, px: 2 }}>
                                {getProfessionalPermitChip(license)}
                              </TableCell>
                              <TableCell sx={{ py: 1, px: 2 }}>
                                {license.current_card ? (
                                  <Chip
                                    label={license.current_card.status}
                                    color={licenseService.getCardStatusColor(license.current_card.status)}
                                    size="small"
                                  />
                                ) : (
                                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.8rem' }}>
                                    No Card
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell sx={{ py: 1, px: 2 }}>
                                <Tooltip title="View License Details">
                                  <IconButton 
                                    size="small"
                                    onClick={() => handleViewLicense(license)}
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

                    <TablePagination
                      component="div"
                      count={totalCount}
                      page={page}
                      onPageChange={handlePageChange}
                      rowsPerPage={rowsPerPage}
                      onRowsPerPageChange={handleRowsPerPageChange}
                      rowsPerPageOptions={[10, 25, 50, { value: -1, label: 'All' }]}
                      sx={{
                        bgcolor: 'white',
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        flexShrink: 0,
                        '& .MuiTablePagination-toolbar': {
                          minHeight: '52px',
                        },
                        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                          fontSize: '0.8rem',
                        },
                        '& .MuiTablePagination-select': {
                          fontSize: '0.8rem',
                        },
                      }}
                    />
                  </Box>
                )}
              </>
            )}
          </Paper>
        </Box>
      </Paper>
    </Container>
    </>
  );
};

export default LicenseListPage; 