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
  Pagination,
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

const ApplicationListPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  // State
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
      
      const params = {
        skip: (page - 1) * 20,
        limit: 20,
        ...(statusFilter && { status: statusFilter }),
        ...(typeFilter && { application_type: typeFilter })
      };
      
      const data = await applicationService.getApplications(params);
      setApplications(data);
      
      // Calculate total pages (assuming 20 items per page)
      setTotalPages(Math.ceil(data.length / 20));
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
  }, [page, statusFilter, typeFilter, lookupsLoading]);

  // Status color mapping
  const getStatusColor = (status: ApplicationStatus): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case ApplicationStatus.DRAFT:
        return 'default';
      case ApplicationStatus.SUBMITTED:
        return 'info';
      case ApplicationStatus.PAID:
        return 'primary';
      case ApplicationStatus.PASSED:
        return 'success';
      case ApplicationStatus.FAILED:
      case ApplicationStatus.ABSENT:
      case ApplicationStatus.REJECTED:
      case ApplicationStatus.CANCELLED:
        return 'error';
      case ApplicationStatus.ON_HOLD:
        return 'warning';
      case ApplicationStatus.APPROVED:
      case ApplicationStatus.COMPLETED:
        return 'success';
      case ApplicationStatus.SENT_TO_PRINTER:
      case ApplicationStatus.CARD_PRODUCTION:
        return 'primary';
      case ApplicationStatus.READY_FOR_COLLECTION:
        return 'info';
      default:
        return 'primary';
    }
  };

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
    navigate('/dashboard/applications/create');
  };

  const handleViewApplication = (applicationId: string) => {
    navigate(`/dashboard/applications/${applicationId}`);
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
    <Container maxWidth="lg" sx={{ py: 1, height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
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
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
              Filter Applications
            </Typography>
            {hasPermission('applications.create') && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateNew}
                size="small"
              >
                New Application
              </Button>
            )}
          </Box>
          
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
                      borderWidth: '2px',
                      transition: 'border-color 0.2s ease-in-out',
                    },
                    '&:hover fieldset': {
                      borderWidth: '2px',
                    },
                    '&.Mui-focused fieldset': {
                      borderWidth: '2px',
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
                      borderWidth: '2px',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderWidth: '2px',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderWidth: '2px',
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
                      borderWidth: '2px',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderWidth: '2px',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderWidth: '2px',
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
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={loadApplications}
                size="small"
                sx={{
                  borderWidth: '2px',
                  '&:hover': {
                    borderWidth: '2px',
                  },
                }}
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Content Area - Applications Table */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'auto',
          p: 2,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Paper 
            elevation={0}
            sx={{ 
              bgcolor: 'white',
              boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
              borderRadius: 2,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <TableContainer sx={{ flex: 1 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Application ID</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Applicant</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>License Category</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Date Created</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {applications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body1" color="text.secondary" sx={{ py: 4 }}>
                          No applications found. 
                          {hasPermission('applications.create') && (
                            <>
                              {' '}
                              <Button variant="text" onClick={handleCreateNew}>
                                Create your first application
                              </Button>
                            </>
                          )}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    applications.map((application) => (
                      <TableRow key={application.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.8rem' }}>
                            {application.id?.substring(0, 8)}...
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {application.person ? 
                              `${application.person.first_name} ${application.person.surname}` : 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {getApplicationTypeLabel(application.application_type)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {application.license_category || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getApplicationStatusLabel(application.status)}
                            color={getStatusColor(application.status)}
                            size="small"
                            sx={{ fontSize: '0.7rem', height: '20px' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {application.created_at ? new Date(application.created_at).toLocaleDateString() : 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
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

            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'white' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(event, newPage) => setPage(newPage)}
                    color="primary"
                    size="small"
                  />
                </Box>
              </Box>
            )}
          </Paper>
        </Box>
      </Paper>
    </Container>
  );
};

export default ApplicationListPage; 