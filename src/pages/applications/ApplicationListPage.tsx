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
  Edit as EditIcon,
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
      const [statuses, types] = await Promise.all([
        lookupService.getApplicationStatuses(),
        lookupService.getApplicationTypes()
      ]);
      setStatusOptions(statuses);
      setTypeOptions(types);
    } catch (err: any) {
      console.error('Failed to load lookup data:', err);
      // Use fallback data if lookups fail
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
      case ApplicationStatus.APPROVED:
        return 'success';
      case ApplicationStatus.REJECTED:
      case ApplicationStatus.CANCELLED:
        return 'error';
      case ApplicationStatus.COMPLETED:
        return 'success';
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

  const handleEditApplication = (applicationId: string) => {
    navigate(`/dashboard/applications/edit/${applicationId}`);
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          License Applications
        </Typography>
        {hasPermission('applications.create') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateNew}
          >
            New Application
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search applications"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                  disabled={lookupsLoading}
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
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={typeFilter}
                  label="Type"
                  onChange={(e) => setTypeFilter(e.target.value)}
                  disabled={lookupsLoading}
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
              >
                Filter
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Application ID</TableCell>
              <TableCell>Applicant</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>License Category</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date Created</TableCell>
              <TableCell>Actions</TableCell>
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
                    <Typography variant="body2" fontWeight="bold">
                      {application.id?.substring(0, 8)}...
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {application.person ? 
                        `${application.person.first_name} ${application.person.surname}` : 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {getApplicationTypeLabel(application.application_type)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {application.license_categories.join(', ')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getApplicationStatusLabel(application.status)}
                      color={getStatusColor(application.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
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
                        <ViewIcon />
                      </IconButton>
                      {hasPermission('applications.update') && (
                        <IconButton
                          size="small"
                          onClick={() => handleEditApplication(application.id!)}
                          title="Edit Application"
                        >
                          <EditIcon />
                        </IconButton>
                      )}
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
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(event, newPage) => setPage(newPage)}
            color="primary"
          />
        </Box>
      )}
    </Container>
  );
};

export default ApplicationListPage; 