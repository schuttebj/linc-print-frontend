/**
 * Location Management Page for Madagascar LINC Print System
 * Admin interface for managing office locations, provinces, and capacity
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  TablePagination,
  IconButton,
  InputAdornment,
  Stack,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
  PowerSettingsNew as CloseIcon,
  PowerOff as OpenIcon,
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { API_ENDPOINTS, api } from '../../config/api';
import lookupService, { OfficeType, Province } from '../../services/lookupService';

// Location interfaces - Updated to match actual API response
interface Location {
  id: string;
  name: string; // API uses 'name' not 'location_name'
  code: string; // API uses 'code' not 'location_code'
  full_code: string;
  display_code: string;
  province_code: string;
  province_name: string;
  office_number: string;
  office_type: string;
  locality: string;
  street_address: string;
  postal_code: string | null;
  phone_number: string; // API uses 'phone_number' not 'contact_phone'
  email: string; // API uses 'email' not 'contact_email'
  manager_name: string | null;
  is_operational: boolean;
  accepts_applications: boolean;
  accepts_renewals: boolean;
  accepts_collections: boolean;
  max_daily_capacity: number; // API uses 'max_daily_capacity' not 'max_capacity'
  current_staff_count: number; // API uses 'current_staff_count' not 'current_capacity'
  max_staff_capacity: number;
  next_user_number: number;
  operating_hours: string | null;
  operational_schedule: Array<{
    day: string;
    is_open: boolean;
    open_time: string;
    close_time: string;
  }>;
  special_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface LocationListResponse {
  locations: Location[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface ProvinceOption {
  code: string;
  name: string;
}

const LocationManagementPage: React.FC = () => {
  const navigate = useNavigate();
  
  // State management
  const [locations, setLocations] = useState<Location[]>([]);
  const [officeTypes, setOfficeTypes] = useState<OfficeType[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination and filtering - using TablePagination style
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalResults, setTotalResults] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [provinceFilter, setProvinceFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // Delete modal state and success dialog
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Load initial data - only load lookup data, not locations
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load locations when filters change (separate from initial data load)
  useEffect(() => {
    if (!loading) { // Only load locations after initial data is loaded
      loadLocations();
    }
  }, [page, rowsPerPage, searchTerm, provinceFilter, typeFilter, statusFilter, loading]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load only lookup data first
      const [provincesRes, officeTypesRes] = await Promise.all([
        lookupService.getProvinces(),
        lookupService.getOfficeTypes()
      ]);
      
      setProvinces(provincesRes);
      setOfficeTypes(officeTypesRes);
      
      // Load locations after lookup data is ready
      await loadLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const params = new URLSearchParams({
        page: (page + 1).toString(), // Convert from 0-based to 1-based
        per_page: rowsPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(provinceFilter && { province: provinceFilter }),
        ...(typeFilter && { office_type: typeFilter }),
        ...(statusFilter && { operational: statusFilter })
      });

      const response = await api.get<LocationListResponse>(`${API_ENDPOINTS.locations}?${params}`);
      setLocations(response.locations || []);
      setTotalResults(response.total || 0);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load locations');
      throw err;
    }
  };

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when changing rows per page
  };

  const handleDeleteLocation = async () => {
    if (!selectedLocation) return;
    
    try {
      await api.delete(`${API_ENDPOINTS.locationById(selectedLocation.id)}`);
      setSuccessMessage(`Location ${selectedLocation.name} has been deleted successfully.`);
      setShowSuccessDialog(true);
      setShowDeleteModal(false);
      setSelectedLocation(null);
      await loadLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete location');
    }
  };

  const handleToggleOperational = async (location: Location) => {
    try {
      await api.put(`${API_ENDPOINTS.locationById(location.id)}`, {
        is_operational: !location.is_operational
      });
      
      setSuccessMessage(`Location ${location.name} has been ${location.is_operational ? 'closed' : 'opened'} successfully.`);
      setShowSuccessDialog(true);
      await loadLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update location status');
    }
  };

  const getOfficeTypeDisplay = (type: string): { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' } => {
    const officeType = officeTypes.find(t => t.value === type);
    const label = officeType ? officeType.label : type;
    
    switch (type) {
      case 'MAIN': return { label, color: 'primary' };
      case 'BRANCH': return { label, color: 'secondary' };
      case 'KIOSK': return { label, color: 'info' };
      case 'MOBILE': return { label, color: 'warning' };
      case 'TEMPORARY': return { label, color: 'default' };
      default: return { label, color: 'default' };
    }
  };

  const getStatusColor = (isOperational: boolean): 'success' | 'error' => {
    return isOperational ? 'success' : 'error';
  };

  const getProvinceName = (code: string) => {
    const province = provinces.find(p => p.code === code);
    return province ? province.name : code;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const handleCreateLocation = () => {
    navigate('/dashboard/admin/locations/create');
  };

  const handleEditLocation = (location: Location) => {
    navigate(`/dashboard/admin/locations/edit/${location.id}`);
  };

  if (loading && locations.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Location Management
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateLocation}
        >
          Create Location
        </Button>
      </Box>

      <Typography variant="body1" color="text.secondary" gutterBottom>
        Manage office locations, capacity, and operational status for the Madagascar LINC Print system.
      </Typography>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon />
            Search & Filters
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search Locations"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Location name, code, or address"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Province</InputLabel>
                <Select
                  value={provinceFilter}
                  onChange={(e) => setProvinceFilter(e.target.value)}
                  label="Province"
                >
                  <MenuItem value="">All Provinces</MenuItem>
                  {provinces.map(province => (
                    <MenuItem key={province.code} value={province.code}>
                      {province.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Office Type</InputLabel>
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  label="Office Type"
                >
                  <MenuItem value="">All Types</MenuItem>
                  {officeTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="true">Operational</MenuItem>
                  <MenuItem value="false">Closed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Locations Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Location Code</TableCell>
              <TableCell>Location Name</TableCell>
              <TableCell>Office Type</TableCell>
              <TableCell>Province</TableCell>
              <TableCell>Contact Info</TableCell>
              <TableCell>Capacity</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {locations.map((location) => (
              <TableRow key={location.id} hover>
                <TableCell>
                  <Typography variant="body1" color="primary.main" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {location.display_code}
                  </Typography>
                </TableCell>

                <TableCell>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {location.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {location.street_address}
                    </Typography>
                    {location.locality && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {location.locality}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Chip
                    label={getOfficeTypeDisplay(location.office_type).label}
                    color={getOfficeTypeDisplay(location.office_type).color}
                    size="small"
                  />
                </TableCell>

                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {location.province_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ({location.province_code})
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <Stack spacing={0.5}>
                    {location.phone_number ? (
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {location.phone_number}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">No phone</Typography>
                    )}
                    {location.email ? (
                      <Typography variant="caption" color="text.secondary">
                        {location.email}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        No email
                      </Typography>
                    )}
                  </Stack>
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {location.max_daily_capacity}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Daily Capacity
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <Chip
                    label={location.is_operational ? 'Operational' : 'Closed'}
                    color={getStatusColor(location.is_operational)}
                    size="small"
                  />
                </TableCell>
                
                <TableCell align="right">
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleEditLocation(location)}
                      title="Edit Location"
                    >
                      <EditIcon />
                    </IconButton>
                    
                    <IconButton
                      size="small"
                      color={location.is_operational ? 'warning' : 'success'}
                      onClick={() => handleToggleOperational(location)}
                      title={location.is_operational ? 'Close Location' : 'Open Location'}
                    >
                      {location.is_operational ? <CloseIcon /> : <OpenIcon />}
                    </IconButton>
                    
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        setSelectedLocation(location);
                        setShowDeleteModal(true);
                      }}
                      title="Delete Location"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[10, 20, 50, 100]}
        component="div"
        count={totalResults}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
      />

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <DialogTitle sx={{ bgcolor: 'error.main', color: 'white' }}>
          <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon />
            Confirm Location Deletion
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              This action cannot be undone!
            </Typography>
          </Alert>
          
          {selectedLocation && (
            <Typography variant="body1">
              Are you sure you want to delete location <strong>{selectedLocation.name}</strong>? 
              This will affect all associated users and data.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setShowDeleteModal(false)} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleDeleteLocation} variant="contained" color="error">
            Delete Location
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onClose={() => setShowSuccessDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'success.main', color: 'white' }}>
          <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon />
            Success
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="success">
            {successMessage}
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setShowSuccessDialog(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LocationManagementPage; 