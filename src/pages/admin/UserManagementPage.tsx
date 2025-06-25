/**
 * User Management Page for Madagascar LINC Print System
 * Admin interface for managing users, roles, permissions, and locations
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
  Card,
  CardContent,
  Grid,
  Avatar,
  IconButton,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Lock as LockIcon,
  LockOpen as UnlockIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { API_ENDPOINTS, api } from '../../config/api';
import lookupService, { UserStatus, OfficeType, Province } from '../../services/lookupService';

// User-related interfaces
interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  primary_location: {
    id: string;
    location_code: string;
    location_name: string;
    province_code: string;
    office_type: string;
  };
  permissions: string[];
  last_login?: string;
  failed_login_attempts: number;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

interface UserCreateData {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  status: string;
  primary_location_id: string;
  permissions: string[];
}

interface UserUpdateData {
  first_name?: string;
  last_name?: string;
  email?: string;
  status?: string;
  primary_location_id?: string;
  permissions?: string[];
}

interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface Location {
  id: string;
  location_code: string;
  location_name: string;
  province_code: string;
  office_type: string;
}

const UserManagementPage: React.FC = () => {
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [userStatuses, setUserStatuses] = useState<UserStatus[]>([]);
  const [officeTypes, setOfficeTypes] = useState<OfficeType[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination and filtering - using TablePagination style
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalResults, setTotalResults] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form data
  const [createForm, setCreateForm] = useState<UserCreateData>({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    status: 'ACTIVE',
    primary_location_id: '',
    permissions: []
  });

  const [editForm, setEditForm] = useState<UserUpdateData>({});

  // Available permissions
  const AVAILABLE_PERMISSIONS = [
    'READ_USERS',
    'WRITE_USERS',
    'DELETE_USERS',
    'READ_PERSONS',
    'WRITE_PERSONS',
    'DELETE_PERSONS',
    'READ_LOCATIONS',
    'WRITE_LOCATIONS',
    'VIEW_AUDIT_LOGS',
    'EXPORT_DATA',
    'SYSTEM_ADMIN'
  ];

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load users when filters change
  useEffect(() => {
    if (!loading) {
      loadUsers();
    }
  }, [page, rowsPerPage, searchTerm, statusFilter, locationFilter, loading]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      const [usersRes, statusesRes, officeTypesRes, provincesRes, locationsRes] = await Promise.all([
        loadUsers(),
        lookupService.getUserStatuses(),
        lookupService.getOfficeTypes(),
        lookupService.getProvinces(),
        api.get<{ locations: Location[] }>(`${API_ENDPOINTS.locations}?per_page=100`)
      ]);
      
      setUserStatuses(statusesRes);
      setOfficeTypes(officeTypesRes);
      setProvinces(provincesRes);
      setLocations(locationsRes.locations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const params = new URLSearchParams({
        page: (page + 1).toString(), // Convert from 0-based to 1-based
        per_page: rowsPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
        ...(locationFilter && { location_id: locationFilter })
      });

      const response = await api.get<UserListResponse>(`${API_ENDPOINTS.users}?${params}`);
      setUsers(response.users || []);
      setTotalResults(response.total || 0);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      throw err;
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(API_ENDPOINTS.users, createForm);
      setShowCreateModal(false);
      setCreateForm({
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        status: 'ACTIVE',
        primary_location_id: '',
        permissions: []
      });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    try {
      await api.put(`${API_ENDPOINTS.userById(selectedUser.id)}`, editForm);
      setShowEditModal(false);
      setSelectedUser(null);
      setEditForm({});
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      await api.delete(`${API_ENDPOINTS.userById(selectedUser.id)}`);
      setShowDeleteModal(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const handleToggleLock = async (user: User) => {
    try {
      await api.put(`${API_ENDPOINTS.userById(user.id)}/lock`, {
        is_locked: !user.is_locked
      });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user lock status');
    }
  };

  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'INACTIVE': return 'warning';
      case 'SUSPENDED': return 'error';
      default: return 'default';
    }
  };

  const getLocationInfo = (user: User) => {
    if (!user.primary_location) return 'No Location';
    return `${user.primary_location.location_name} (${user.primary_location.location_code})`;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Never';
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  const handleEditUserClick = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      status: user.status,
      primary_location_id: user.primary_location?.id || '',
      permissions: user.permissions || []
    });
    setShowEditModal(true);
  };

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when changing rows per page
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Typography variant="h4" component="h1" gutterBottom>
        User Management
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage system users, roles, permissions, and access controls
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
                {users.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="success.main">
                {users.filter(u => u.status === 'ACTIVE').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="warning.main">
                {users.filter(u => u.is_locked).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Locked Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="info.main">
                {users.filter(u => u.last_login).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Recently Active
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
              />
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
                  {userStatuses.map(status => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Location</InputLabel>
                <Select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  label="Location"
                >
                  <MenuItem value="">All Locations</MenuItem>
                  {locations.map(location => (
                    <MenuItem key={location.id} value={location.id}>
                      {location.location_name} ({location.location_code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowCreateModal(true)}
              >
                Add User
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Users Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell>User</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Permissions</TableCell>
              <TableCell>Last Login</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <PersonIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {user.first_name} {user.last_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        @{user.username}
                      </Typography>
                      {user.is_locked && (
                        <Chip 
                          label="Locked" 
                          size="small" 
                          color="error" 
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">
                    {user.email}
                  </Typography>
                  {user.failed_login_attempts > 0 && (
                    <Typography variant="caption" color="warning.main">
                      {user.failed_login_attempts} failed attempts
                    </Typography>
                  )}
                </TableCell>
                
                <TableCell>
                  <Chip
                    label={userStatuses.find(s => s.value === user.status)?.label || user.status}
                    color={getStatusColor(user.status)}
                    size="small"
                  />
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">
                    {getLocationInfo(user)}
                  </Typography>
                  {user.primary_location && (
                    <Typography variant="caption" color="text.secondary">
                      {user.primary_location.office_type}
                    </Typography>
                  )}
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">
                    {user.permissions?.length || 0} permissions
                  </Typography>
                  {user.permissions?.includes('SYSTEM_ADMIN') && (
                    <Chip 
                      label="Admin" 
                      size="small" 
                      color="primary" 
                      sx={{ mt: 0.5 }}
                    />
                  )}
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">
                    {user.last_login ? formatDate(user.last_login) : 'Never'}
                  </Typography>
                </TableCell>
                
                <TableCell align="right">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <IconButton
                      size="small"
                      color="info"
                      onClick={() => handleViewUser(user)}
                    >
                      <ViewIcon />
                    </IconButton>
                    
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleEditUserClick(user)}
                    >
                      <EditIcon />
                    </IconButton>
                    
                    <IconButton
                      size="small"
                      color={user.is_locked ? 'success' : 'warning'}
                      onClick={() => handleToggleLock(user)}
                    >
                      {user.is_locked ? <UnlockIcon /> : <LockIcon />}
                    </IconButton>
                    
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        setSelectedUser(user);
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

      {/* Create User Modal */}
      <Dialog open={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New User</DialogTitle>
        <form onSubmit={handleCreateUser}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Username"
                  required
                  value={createForm.username}
                  onChange={(e) => setCreateForm({...createForm, username: e.target.value})}
                />
              </Grid>
              
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                />
              </Grid>
              
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  required
                  value={createForm.first_name}
                  onChange={(e) => setCreateForm({...createForm, first_name: e.target.value})}
                />
              </Grid>
              
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  required
                  value={createForm.last_name}
                  onChange={(e) => setCreateForm({...createForm, last_name: e.target.value})}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                />
              </Grid>
              
              <Grid item xs={6}>
                <FormControl fullWidth required>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({...createForm, status: e.target.value})}
                    label="Status"
                  >
                    {userStatuses.map(status => (
                      <MenuItem key={status.value} value={status.value}>
                        {status.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={6}>
                <FormControl fullWidth required>
                  <InputLabel>Location</InputLabel>
                  <Select
                    value={createForm.primary_location_id}
                    onChange={(e) => setCreateForm({...createForm, primary_location_id: e.target.value})}
                    label="Location"
                  >
                    {locations.map(location => (
                      <MenuItem key={location.id} value={location.id}>
                        {location.location_name} ({location.location_code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Permissions:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {AVAILABLE_PERMISSIONS.map(permission => (
                    <FormControlLabel
                      key={permission}
                      control={
                        <Switch
                          checked={createForm.permissions.includes(permission)}
                          onChange={(e) => {
                            const updatedPermissions = e.target.checked
                              ? [...createForm.permissions, permission]
                              : createForm.permissions.filter(p => p !== permission);
                            setCreateForm({...createForm, permissions: updatedPermissions});
                          }}
                        />
                      }
                      label={permission.replace(/_/g, ' ')}
                    />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              Create User
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={showEditModal} onClose={() => setShowEditModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit User: {selectedUser?.username}</DialogTitle>
        <form onSubmit={handleEditUser}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  required
                  value={editForm.first_name || ''}
                  onChange={(e) => setEditForm({...editForm, first_name: e.target.value})}
                />
              </Grid>
              
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  required
                  value={editForm.last_name || ''}
                  onChange={(e) => setEditForm({...editForm, last_name: e.target.value})}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  required
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                />
              </Grid>
              
              <Grid item xs={6}>
                <FormControl fullWidth required>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={editForm.status || ''}
                    onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                    label="Status"
                  >
                    {userStatuses.map(status => (
                      <MenuItem key={status.value} value={status.value}>
                        {status.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={6}>
                <FormControl fullWidth required>
                  <InputLabel>Location</InputLabel>
                  <Select
                    value={editForm.primary_location_id || ''}
                    onChange={(e) => setEditForm({...editForm, primary_location_id: e.target.value})}
                    label="Location"
                  >
                    {locations.map(location => (
                      <MenuItem key={location.id} value={location.id}>
                        {location.location_name} ({location.location_code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Permissions:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {AVAILABLE_PERMISSIONS.map(permission => (
                    <FormControlLabel
                      key={permission}
                      control={
                        <Switch
                          checked={editForm.permissions?.includes(permission) || false}
                          onChange={(e) => {
                            const currentPermissions = editForm.permissions || [];
                            const updatedPermissions = e.target.checked
                              ? [...currentPermissions, permission]
                              : currentPermissions.filter(p => p !== permission);
                            setEditForm({...editForm, permissions: updatedPermissions});
                          }}
                        />
                      }
                      label={permission.replace(/_/g, ' ')}
                    />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              Update User
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View User Modal */}
      <Dialog open={showViewModal} onClose={() => setShowViewModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>User Details: {selectedUser?.username}</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Full Name
                </Typography>
                <Typography variant="body1">
                  {selectedUser.first_name} {selectedUser.last_name}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1">
                  {selectedUser.email}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={userStatuses.find(s => s.value === selectedUser.status)?.label || selectedUser.status}
                  color={getStatusColor(selectedUser.status)}
                  size="small"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Account Status
                </Typography>
                <Typography variant="body1">
                  {selectedUser.is_locked ? 'Locked' : 'Active'}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Primary Location
                </Typography>
                <Typography variant="body1">
                  {getLocationInfo(selectedUser)}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Last Login
                </Typography>
                <Typography variant="body1">
                  {selectedUser.last_login ? formatDate(selectedUser.last_login) : 'Never'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Failed Login Attempts
                </Typography>
                <Typography variant="body1">
                  {selectedUser.failed_login_attempts}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Permissions
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedUser.permissions?.length > 0 ? (
                    selectedUser.permissions.map(permission => (
                      <Chip
                        key={permission}
                        label={permission.replace(/_/g, ' ')}
                        size="small"
                        color={permission === 'SYSTEM_ADMIN' ? 'primary' : 'default'}
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No permissions assigned
                    </Typography>
                  )}
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body1">
                  {formatDate(selectedUser.created_at)}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Last Updated
                </Typography>
                <Typography variant="body1">
                  {formatDate(selectedUser.updated_at)}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowViewModal(false)}>
            Close
          </Button>
          <Button 
            variant="contained"
            onClick={() => {
              setShowViewModal(false);
              if (selectedUser) {
                handleEditUserClick(selectedUser);
              }
            }}
          >
            Edit User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user <strong>{selectedUser?.username}</strong>? 
            This action cannot be undone and will remove all associated data.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained">
            Delete User
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagementPage; 