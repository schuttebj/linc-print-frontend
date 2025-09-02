/**
 * ApplicationListPage for Madagascar License System
 * Main page for viewing and managing license applications
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  TablePagination,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';

import { useAuth } from '../../contexts/AuthContext';
import { applicationService } from '../../services/applicationService';
import { Application, ApplicationStatus, ApplicationType } from '../../types';
import { lookupService, ApplicationStatus as LookupApplicationStatus, ApplicationType as LookupApplicationType } from '../../services/lookupService';
import { StatusChip, LicenseChip, CodeChip } from '../../components/ui/StatusChip';

const ApplicationListPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  // State
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0); // TablePagination uses 0-based indexing
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  
  // Lookup data state
  const [statusOptions, setStatusOptions] = useState<LookupApplicationStatus[]>([]);
  const [typeOptions, setTypeOptions] = useState<LookupApplicationType[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);

  // Load lookup data
  const loadLookups = async () => {
    try {
      setLookupsLoading(true);
      const allLookups = await lookupService.getAllLookups();
      setStatusOptions(allLookups.application_statuses);
      setTypeOptions(allLookups.application_types);
    } catch (err: any) {
      console.error('Failed to load lookup data:', err);
      // Use fallback data if lookups fail
      setStatusOptions([
        { value: 'DRAFT', label: 'Draft' },
        { value: 'SUBMITTED', label: 'Submitted' },
        { value: 'PAID', label: 'Paid' },
        { value: 'PASSED', label: 'Passed' },
        { value: 'FAILED', label: 'Failed' },
        { value: 'ABSENT', label: 'Absent' },
        { value: 'ON_HOLD', label: 'On Hold' },
        { value: 'APPROVED', label: 'Approved' },
        { value: 'SENT_TO_PRINTER', label: 'Sent to Printer' },
        { value: 'CARD_PRODUCTION', label: 'Card Production' },
        { value: 'READY_FOR_COLLECTION', label: 'Ready for Collection' },
        { value: 'COMPLETED', label: 'Completed' },
        { value: 'REJECTED', label: 'Rejected' },
        { value: 'CANCELLED', label: 'Cancelled' }
      ]);
      setTypeOptions([
        { value: 'NEW_LICENSE', label: 'New License' },
        { value: 'RENEWAL', label: 'Renewal' },
        { value: 'DUPLICATE', label: 'Duplicate' },
        { value: 'TEMPORARY_LICENSE', label: 'Temporary License' },
        { value: 'DRIVERS_LICENSE_CAPTURE', label: "Driver's License Capture" },
        { value: 'LEARNERS_PERMIT_CAPTURE', label: "Learner's Permit Capture" }
      ]);
    } finally {
      setLookupsLoading(false);
    }
  };

  // Load applications
  const loadApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const limit = rowsPerPage === -1 ? 1000 : rowsPerPage; // Use large number for "All"
      const skip = rowsPerPage === -1 ? 0 : page * rowsPerPage; // No skip for "All"
      const params = {
        skip: skip,
        limit: limit,
        include_person: true, // Try to include person data
        ...(statusFilter && { status: statusFilter }),
        ...(typeFilter && { application_type: typeFilter })
      };
      
      const data = await applicationService.getApplications(params);
      
      // Debug: Check what data we're actually getting
      console.log('🔍 Applications data received:', {
        count: data.length,
        firstApplication: data[0],
        personData: data[0]?.person,
        allPersonData: data.map(app => ({ id: app.id, person: app.person }))
      });
      
      setApplications(data);
      
      // For now, estimate total count based on returned data
      // In a real app, the backend should return total count
      if (rowsPerPage === -1) {
        setTotalCount(data.length); // For "All", total is what we got
      } else {
        setTotalCount(data.length < limit ? skip + data.length : skip + data.length + 1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    if (!lookupsLoading) {
      loadApplications();
    }
  }, [page, rowsPerPage, statusFilter, typeFilter, lookupsLoading]);



  // Get display label for application type
  const getApplicationTypeLabel = (value: string): string => {
    const option = typeOptions.find(type => type.value === value);
    return option?.label || value.replace(/_/g, ' ');
  };

  // Get display label for application status
  const getApplicationStatusLabel = (value: string): string => {
    const option = statusOptions.find(status => status.value === value);
    return option?.label || value.replace(/_/g, ' ');
  };

  // Handle navigation
  const handleCreateNew = () => {
    navigate('/dashboard/applications/dashboard');
  };

  const handleViewApplication = (applicationId: string) => {
    navigate(`/dashboard/applications/${applicationId}`);
  };

  // Pagination handlers
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value === 'All' ? -1 : parseInt(event.target.value, 10);
    setRowsPerPage(value);
    setPage(0); // Reset to first page when changing rows per page
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={48} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={loadApplications}>
              Retry
            </Button>
          }
        >
          <Typography variant="h6">Error loading applications</Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
      </Container>
    );
  }

  return (
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
        {/* Filter Section - Top Area */}
        <Box sx={{ 
          bgcolor: 'white', 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          flexShrink: 0,
          p: 2
        }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search applications"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderWidth: '1px',
                      transition: 'border-color 0.2s ease-in-out',
                    },
                    '&:hover fieldset': {
                      borderWidth: '1px',
                    },
                    '&.Mui-focused fieldset': {
                      borderWidth: '1px',
                    },
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                  disabled={lookupsLoading}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderWidth: '1px',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderWidth: '1px',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderWidth: '1px',
                    },
                  }}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  {statusOptions.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={typeFilter}
                  label="Type"
                  onChange={(e) => setTypeFilter(e.target.value)}
                  disabled={lookupsLoading}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderWidth: '1px',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderWidth: '1px',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderWidth: '1px',
                    },
                  }}
                >
                  <MenuItem value="">All Types</MenuItem>
                  {typeOptions.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<FilterIcon />}
                onClick={loadApplications}
                size="small"
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Content Area - Applications Table */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'hidden',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column'
        }}>
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
            <TableContainer sx={{ flex: 1 }}>
              <Table stickyHeader sx={{ '& .MuiTableCell-root': { borderRadius: 0 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Applicant</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>License Category</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Date Created</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {applications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body1" color="text.secondary" sx={{ py: 4 }}>
                          No applications found. 
                          {hasPermission('applications.create') && (
                            <>
                              {' '}
                              <Button variant="text" onClick={handleCreateNew}>
                                Go to Applications Dashboard
                              </Button>
                            </>
                          )}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    applications.map((application) => (
                      <TableRow key={application.id} hover>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {getApplicationTypeLabel(application.application_type)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {application.person ? 
                              `${application.person.first_name || ''} ${application.person.surname || ''}`.trim() || 'N/A'
                              : application.person_id ? 'Person data not available' : 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          {application.license_capture?.captured_licenses ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {application.license_capture.captured_licenses.map((license, index) => (
                                <LicenseChip
                                  key={index}
                                  category={license.license_category}
                                  chipType="license"
                                />
                              ))}
                            </Box>
                          ) : application.license_category ? (
                            <LicenseChip
                              category={application.license_category}
                              chipType="license"
                            />
                          ) : (
                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                              N/A
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <StatusChip
                            status={application.status}
                            statusLabel={getApplicationStatusLabel(application.status)}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {application.created_at ? new Date(application.created_at).toLocaleDateString() : 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Stack direction="row" spacing={1}>
                            <IconButton
                              size="small"
                              onClick={() => handleViewApplication(application.id!)}
                              title="View Application"
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>

        {/* Table Pagination - Bottom of wrapper */}
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 50, { value: -1, label: 'All' }]}
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
      </Paper>
    </Container>
  );
};

export default ApplicationListPage; 