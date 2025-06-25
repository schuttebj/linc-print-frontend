/**
 * User Management Page for Madagascar LINC Print System
 * Comprehensive admin interface for managing users, roles, and permissions
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
  Avatar,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Pagination,
  IconButton
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  PowerSettingsNew as DeactivateIcon,
  PowerOff as ActivateIcon
} from '@mui/icons-material';
import { API_ENDPOINTS, api } from '../../config/api';
import lookupService, { UserStatus } from '../../services/lookupService';

// User interfaces
interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  madagascar_id_number: string;
  employee_id?: string;
  department?: string;
  position?: string;
  status: string;
  is_active: boolean;
  is_superuser: boolean;
  roles: Role[];
  primary_location?: Location;
  assigned_locations: Location[];
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  is_system_role: boolean;
}

interface Location {
  id: string;
  location_code: string;
  location_name: string;
  province_code: string;
  office_type: string;
}

interface UserCreateData {
  email: string;
  first_name: string;
  last_name: string;
  madagascar_id_number: string;
  employee_id?: string;
  department?: string;
  position?: string;
  phone_number?: string;
  password: string;
}

interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

const UserManagementPage: React.FC = () => {
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [userStatuses, setUserStatuses] = useState<UserStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Form data
  const [createForm, setCreateForm] = useState<UserCreateData>({
    email: '',
    first_name: '',
    last_name: '',
    madagascar_id_number: '',
    employee_id: '',
    department: '',
    position: '',
    phone_number: '',
    password: ''
  });

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load data when filters change
  useEffect(() => {
    loadUsers();
  }, [currentPage, searchTerm, statusFilter, roleFilter, departmentFilter]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes, locationsRes, userStatusesRes] = await Promise.all([
        loadUsers(),
        api.get<Role[]>(`${API_ENDPOINTS.users.replace('/users', '/roles')}`),
        api.get<Location[]>(`${API_ENDPOINTS.users.replace('/users', '/locations')}`),
        lookupService.getUserStatuses()
      ]);
      
      setRoles(rolesRes);
      setLocations(locationsRes);
      setUserStatuses(userStatusesRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
        ...(roleFilter && { role: roleFilter }),
        ...(departmentFilter && { department: departmentFilter })
      });

      const response = await api.get<UserListResponse>(`${API_ENDPOINTS.users}?${params}`);
      setUsers(response.users);
      setTotalPages(response.total_pages);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      throw err;
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // For now, assign to first location - in real implementation, this would be selected
      const locationId = locations[0]?.id;
      if (!locationId) {
        setError('No locations available for user assignment');
        return;
      }

      await api.post(`${API_ENDPOINTS.users}?location_id=${locationId}`, createForm);
      setShowCreateModal(false);
      setCreateForm({
        email: '',
        first_name: '',
        last_name: '',
        madagascar_id_number: '',
        employee_id: '',
        department: '',
        position: '',
        phone_number: '',
        password: ''
      });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const handleEditUser = async (userData: Partial<User>) => {
    if (!selectedUser) return;
    
    try {
      await api.put(`${API_ENDPOINTS.userById(selectedUser.id)}`, userData);
      setShowEditModal(false);
      setSelectedUser(null);
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

  const handleActivateUser = async (user: User) => {
    try {
      await api.put(`${API_ENDPOINTS.userById(user.id)}`, { status: 'ACTIVE' });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate user');
    }
  };

  const handleDeactivateUser = async (user: User) => {
    try {
      await api.put(`${API_ENDPOINTS.userById(user.id)}`, { status: 'INACTIVE' });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate user');
    }
  };

  const getStatusChipColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'INACTIVE': return 'default';
      case 'SUSPENDED': return 'error';
      case 'LOCKED': return 'warning';
      case 'PENDING_ACTIVATION': return 'info';
      default: return 'default';
    }
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
        User Management
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage system users, roles, and permissions
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

      {/* Filters and Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={2}>
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
                  <MenuItem value="">All Statuses</MenuItem>
                  {userStatuses.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Role</InputLabel>
                <Select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  label="Role"
                >
                  <MenuItem value="">All Roles</MenuItem>
                  {roles.map(role => (
                    <MenuItem key={role.id} value={role.name}>{role.display_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                placeholder="Department"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                size="small"
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={() => setShowCreateModal(true)}
              >
                Create User
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
              <TableCell>Contact</TableCell>
              <TableCell>Roles</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Last Login</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                      {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {user.first_name} {user.last_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        @{user.username}
                      </Typography>
                      {user.employee_id && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          ID: {user.employee_id}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">{user.email}</Typography>
                  {user.department && (
                    <Typography variant="caption" color="text.secondary">
                      {user.department}
                    </Typography>
                  )}
                </TableCell>
                
                <TableCell>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {user.roles.map((role) => (
                      <Chip
                        key={role.id}
                        label={role.display_name}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                    {user.is_superuser && (
                      <Chip
                        label="Super Admin"
                        size="small"
                        color="secondary"
                      />
                    )}
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Chip
                    label={user.status}
                    color={getStatusChipColor(user.status)}
                    size="small"
                  />
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">
                    {user.primary_location?.location_name || 'Not assigned'}
                  </Typography>
                  {user.assigned_locations.length > 1 && (
                    <Typography variant="caption" color="text.secondary">
                      +{user.assigned_locations.length - 1} more
                    </Typography>
                  )}
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {user.last_login_at 
                      ? new Date(user.last_login_at).toLocaleDateString()
                      : 'Never'
                    }
                  </Typography>
                </TableCell>
                
                <TableCell align="right">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowEditModal(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    
                    {user.status === 'ACTIVE' ? (
                      <IconButton
                        size="small"
                        color="warning"
                        onClick={() => handleDeactivateUser(user)}
                      >
                        <DeactivateIcon />
                      </IconButton>
                    ) : (
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleActivateUser(user)}
                      >
                        <ActivateIcon />
                      </IconButton>
                    )}
                    
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
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination 
            count={totalPages} 
            page={currentPage} 
            onChange={(_, page) => setCurrentPage(page)}
            color="primary"
          />
        </Box>
      )}

      {/* Create User Modal */}
      <Dialog open={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New User</DialogTitle>
        <form onSubmit={handleCreateUser}>
          <DialogContent>
            <Grid container spacing={2}>
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
                  label="Madagascar ID Number"
                  required
                  value={createForm.madagascar_id_number}
                  onChange={(e) => setCreateForm({...createForm, madagascar_id_number: e.target.value})}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Employee ID"
                  value={createForm.employee_id}
                  onChange={(e) => setCreateForm({...createForm, employee_id: e.target.value})}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Department"
                  value={createForm.department}
                  onChange={(e) => setCreateForm({...createForm, department: e.target.value})}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                />
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

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user <strong>{selectedUser?.first_name} {selectedUser?.last_name}</strong>? 
            This action cannot be undone.
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