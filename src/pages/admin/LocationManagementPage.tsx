/**
 * Location Management Page for Madagascar LINC Print System
 * Admin interface for managing office locations, provinces, and capacity
 */

import React, { useState, useEffect } from 'react';
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
  IconButton
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
  PowerSettingsNew as CloseIcon,
  PowerOff as OpenIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { API_ENDPOINTS, api } from '../../config/api';
import lookupService, { OfficeType, EquipmentStatus, Province } from '../../services/lookupService';
import LocationFormWrapper from '../../components/LocationFormWrapper';

// Location interfaces
interface Location {
  id: string;
  location_code: string;
  location_name: string;
  location_address: string;
  province_code: string;
  office_type: string;
  max_capacity: number;
  current_capacity: number;
  contact_phone: string;
  contact_email: string;
  is_operational: boolean;
  operational_hours: string;
  equipment_status: string;
  notes?: string;
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
  // State management
  const [locations, setLocations] = useState<Location[]>([]);
  const [officeTypes, setOfficeTypes] = useState<OfficeType[]>([]);
  const [equipmentStatuses, setEquipmentStatuses] = useState<EquipmentStatus[]>([]);
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
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  
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
      
      // Load only lookup data first
      const [provincesRes, officeTypesRes, equipmentStatusesRes] = await Promise.all([
        lookupService.getProvinces(),
        lookupService.getOfficeTypes(),
        lookupService.getEquipmentStatuses()
      ]);
      
      setProvinces(provincesRes);
      setOfficeTypes(officeTypesRes);
      setEquipmentStatuses(equipmentStatusesRes);
      
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
      await loadLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update location status');
    }
  };

  const getOfficeTypeColor = (type: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (type) {
      case 'MAIN': return 'primary';
      case 'BRANCH': return 'secondary';
      case 'KIOSK': return 'info';
      case 'MOBILE': return 'warning';
      default: return 'default';
    }
  };

  const getEquipmentStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'OPERATIONAL': return 'success';
      case 'MAINTENANCE': return 'warning';
      case 'OFFLINE': return 'error';
      default: return 'default';
    }
  };

  const getEquipmentStatusInfo = (status: string) => {
    const statusInfo = equipmentStatuses.find(s => s.value === status);
    if (statusInfo) {
      return {
        label: statusInfo.label,
        color: getEquipmentStatusColor(status)
      };
    }
    return { label: 'Not Set', color: 'default' as const };
  };

  const getProvinceName = (code: string) => {
    const province = provinces.find(p => p.code === code);
    return province ? province.name : code;
  };

  const handleCreateSuccess = (location: any) => {
    setShowCreateModal(false);
    loadLocations(); // Refresh the list
  };

  const handleEditSuccess = (location: any) => {
    setShowEditModal(false);
    setSelectedLocation(null);
    loadLocations(); // Refresh the list
  };

  const handleFormCancel = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setSelectedLocation(null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Typography variant="h4" component="h1" gutterBottom>
        Location Management
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage office locations, capacity, and operational status
      </Typography>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary.main">
                {locations.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Locations
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="success.main">
                {locations.filter(l => l.is_operational).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Operational
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="warning.main">
                {locations.reduce((sum, l) => sum + l.current_capacity, 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Current Capacity
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="info.main">
                {locations.reduce((sum, l) => sum + l.max_capacity, 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Max Capacity
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                placeholder="Search locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
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
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  label="Type"
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
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
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
            
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<LocationIcon />}
                onClick={() => setShowCreateModal(true)}
              >
                Add Location
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Locations Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell>Location Details</TableCell>
              <TableCell>Office Type</TableCell>
              <TableCell>Province</TableCell>
              <TableCell>Contact Info</TableCell>
              <TableCell>Capacity</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Equipment</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {locations.map((location) => (
              <TableRow key={location.id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {location.location_name}
                    </Typography>
                    <Typography variant="caption" color="primary.main" fontWeight="medium">
                      {location.location_code}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {location.location_address}
                    </Typography>
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Chip
                    label={officeTypes.find(t => t.value === location.office_type)?.label || location.office_type}
                    color={getOfficeTypeColor(location.office_type)}
                    size="small"
                  />
                </TableCell>

                <TableCell>
                  <Typography variant="body2">
                    {getProvinceName(location.province_code)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ({location.province_code})
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <Box>
                    {location.contact_phone ? (
                      <Typography variant="body2">{location.contact_phone}</Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">No phone</Typography>
                    )}
                    {location.contact_email ? (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {location.contact_email}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary" display="block">
                        No email
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {location.current_capacity} / {location.max_capacity}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Current / Max
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <Chip
                    label={location.is_operational ? 'Operational' : 'Closed'}
                    color={location.is_operational ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                
                <TableCell>
                  {(() => {
                    const statusInfo = getEquipmentStatusInfo(location.equipment_status);
                    return (
                      <Chip
                        label={statusInfo.label}
                        color={statusInfo.color}
                        size="small"
                      />
                    );
                  })()}
                </TableCell>
                
                <TableCell align="right">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => {
                        setSelectedLocation(location);
                        setShowEditModal(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    
                    <IconButton
                      size="small"
                      color={location.is_operational ? 'warning' : 'success'}
                      onClick={() => handleToggleOperational(location)}
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

              {/* Create Location Modal */}
        <Dialog open={showCreateModal} onClose={handleFormCancel} maxWidth="lg" fullWidth>
          <LocationFormWrapper
            mode="modal"
            title="Create New Location"
            subtitle="Add a new office location to the system"
            showHeader={true}
            onSuccess={handleCreateSuccess}
            onCancel={handleFormCancel}
          />
        </Dialog>

        {/* Edit Location Modal */}
        <Dialog open={showEditModal} onClose={handleFormCancel} maxWidth="lg" fullWidth>
          <LocationFormWrapper
            mode="modal"
            title="Edit Location"
            subtitle="Update location information"
            showHeader={true}
            initialLocationId={selectedLocation?.id}
            onSuccess={handleEditSuccess}
            onCancel={handleFormCancel}
          />
        </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete location <strong>{selectedLocation?.location_name}</strong>? 
            This action cannot be undone and will affect all associated users.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleDeleteLocation} color="error" variant="contained">
            Delete Location
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LocationManagementPage; 