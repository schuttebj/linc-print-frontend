/**
 * User Management Page for Madagascar LINC Print System
 * Enhanced with role hierarchy and user type management
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  InputAdornment,
  Stack,
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Lock as LockIcon,
  LockOpen as UnlockIcon,
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config/api';

// Enhanced user interface with new fields
interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  user_type: 'LOCATION_USER' | 'PROVINCIAL_USER' | 'NATIONAL_USER';
  primary_location?: {
    id: string;
    code: string;
    name: string;
    province_code: string;
    province_name: string;
  };
  scope_province?: string;
  roles: Array<{
    id: string;
    name: string;
    display_name: string;
    hierarchy_level: number;
  }>;
  last_login?: string;
  failed_login_attempts: number;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

const UserManagementPage: React.FC = () => {
  const { hasPermission, accessToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination and filtering
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalResults, setTotalResults] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [userTypeFilter, setUserTypeFilter] = useState<string>('');
  const [provinceFilter, setProvinceFilter] = useState<string>('');

  // Modal states (keeping only view, delete, and success dialogs)
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Load users
  useEffect(() => {
    loadUsers();
  }, [page, rowsPerPage, searchTerm, statusFilter, userTypeFilter, provinceFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: (page + 1).toString(),
        per_page: rowsPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
        ...(userTypeFilter && { user_type: userTypeFilter }),
        ...(provinceFilter && { province: provinceFilter }),
      });

      const response = await fetch(`${API_BASE_URL}/api/v1/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load users: ${response.statusText}`);
      }

      const data: UserListResponse = await response.json();
      setUsers(data.users || []);
      setTotalResults(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      setSuccessMessage(`User ${selectedUser.first_name} ${selectedUser.last_name} has been deleted successfully.`);
      setShowSuccessDialog(true);
      setShowDeleteModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      alert(`Failed to delete user: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleToggleLock = async (user: User) => {
    try {
      const action = user.is_locked ? 'unlock' : 'lock';
      const response = await fetch(`${API_BASE_URL}/api/v1/users/${user.id}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} user`);
      }

      setSuccessMessage(`User ${user.first_name} ${user.last_name} has been ${action}ed successfully.`);
      setShowSuccessDialog(true);
      loadUsers();
    } catch (err) {
      alert(`Failed to toggle user lock: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const getUserTypeDisplay = (userType: string): { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' } => {
    switch (userType) {
      case 'LOCATION_USER':
        return { label: 'Location', color: 'primary' };
      case 'PROVINCIAL_USER':
        return { label: 'Provincial', color: 'warning' };
      case 'NATIONAL_USER':
        return { label: 'National', color: 'error' };
      default:
        return { label: userType, color: 'default' };
    }
  };

  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'suspended':
        return 'warning';
      case 'locked':
        return 'error';
      default:
        return 'default';
    }
  };

  const getLocationInfo = (user: User) => {
    if (user.user_type === 'LOCATION_USER' && user.primary_location) {
      return `${user.primary_location.name} (${user.primary_location.code})`;
    } else if (user.user_type === 'PROVINCIAL_USER' && user.scope_province) {
      const provinceNames: { [key: string]: string } = {
        'T': 'ANTANANARIVO',
        'A': 'TOAMASINA',
        'D': 'ANTSIRANANA',
        'F': 'FIANARANTSOA',
        'M': 'MAHAJANGA',
        'U': 'TOLIARA',
      };
      return `${provinceNames[user.scope_province] || user.scope_province} Province`;
    } else if (user.user_type === 'NATIONAL_USER') {
      return 'National Access';
    }
    return 'Not Assigned';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Check for success message from navigation state
  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage);
      setShowSuccessDialog(true);
      // Clear the state to prevent showing the message again
      navigate('/admin/users', { replace: true });
    }
  }, [location.state, navigate]);

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Check permissions
  if (!hasPermission('users.read')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You don't have permission to view users. Contact your administrator.
        </Alert>
      </Box>
    );
  }

  if (loading && users.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          User Management
        </Typography>
        
        {hasPermission('users.create') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/admin/users/create')}
          >
            Create User
          </Button>
        )}
      </Box>

      <Typography variant="body1" color="text.secondary" gutterBottom>
        Manage user accounts, roles, and permissions for the Madagascar LINC Print system.
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
                label="Search Users"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Username, name, or email"
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
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="INACTIVE">Inactive</MenuItem>
                  <MenuItem value="SUSPENDED">Suspended</MenuItem>
                  <MenuItem value="LOCKED">Locked</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>User Type</InputLabel>
                <Select
                  value={userTypeFilter}
                  onChange={(e) => setUserTypeFilter(e.target.value)}
                  label="User Type"
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="LOCATION_USER">Location Users</MenuItem>
                  <MenuItem value="PROVINCIAL_USER">Provincial Users</MenuItem>
                  <MenuItem value="NATIONAL_USER">National Users</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Province</InputLabel>
                <Select
                  value={provinceFilter}
                  onChange={(e) => setProvinceFilter(e.target.value)}
                  label="Province"
                >
                  <MenuItem value="">All Provinces</MenuItem>
                  <MenuItem value="T">Antananarivo</MenuItem>
                  <MenuItem value="A">Toamasina</MenuItem>
                  <MenuItem value="D">Antsiranana</MenuItem>
                  <MenuItem value="F">Fianarantsoa</MenuItem>
                  <MenuItem value="M">Mahajanga</MenuItem>
                  <MenuItem value="U">Toliara</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Users Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Assignment</TableCell>
              <TableCell>Roles</TableCell>
              <TableCell>Status</TableCell>
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
                      {user.first_name?.[0]}{user.last_name?.[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2">
                        {user.first_name} {user.last_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user.email}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {user.username}
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <Chip
                    label={getUserTypeDisplay(user.user_type).label}
                    color={getUserTypeDisplay(user.user_type).color}
                    size="small"
                  />
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">
                    {getLocationInfo(user)}
                  </Typography>
                </TableCell>
                
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {user.roles?.map((role) => (
                      <Chip
                        key={role.id}
                        label={`${role.display_name} (${role.hierarchy_level})`}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </TableCell>
                
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={user.status}
                      color={getStatusColor(user.status)}
                      size="small"
                    />
                    {user.is_locked && (
                      <LockIcon fontSize="small" color="error" />
                    )}
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Typography variant="body2">
                    {user.last_login ? formatDate(user.last_login) : 'Never'}
                  </Typography>
                </TableCell>
                
                <TableCell align="right">
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedUser(user);
                        setShowViewModal(true);
                      }}
                    >
                      <ViewIcon />
                    </IconButton>
                    
                    {hasPermission('users.update') && (
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/admin/users/edit/${user.id}`)}
                      >
                        <EditIcon />
                      </IconButton>
                    )}
                    
                    {hasPermission('users.update') && (
                      <IconButton
                        size="small"
                        onClick={() => handleToggleLock(user)}
                        color={user.is_locked ? 'success' : 'warning'}
                      >
                        {user.is_locked ? <UnlockIcon /> : <LockIcon />}
                      </IconButton>
                    )}
                    
                    {hasPermission('users.delete') && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowDeleteModal(true);
                        }}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
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



      {/* View User Modal */}
      <Dialog open={showViewModal} onClose={() => setShowViewModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>User Details</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="h6">
                  {selectedUser.first_name} {selectedUser.last_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedUser.email}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="subtitle2">Username:</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {selectedUser.username}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="subtitle2">User Type:</Typography>
                <Chip
                  label={getUserTypeDisplay(selectedUser.user_type).label}
                  color={getUserTypeDisplay(selectedUser.user_type).color}
                  size="small"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2">Assignment:</Typography>
                <Typography variant="body2">
                  {getLocationInfo(selectedUser)}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2">Roles:</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                  {selectedUser.roles?.map((role) => (
                    <Chip
                      key={role.id}
                      label={`${role.display_name} (Level ${role.hierarchy_level})`}
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="subtitle2">Status:</Typography>
                <Chip
                  label={selectedUser.status}
                  color={getStatusColor(selectedUser.status)}
                  size="small"
                />
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="subtitle2">Last Login:</Typography>
                <Typography variant="body2">
                  {selectedUser.last_login ? formatDate(selectedUser.last_login) : 'Never'}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowViewModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <DialogTitle sx={{ bgcolor: 'error.main', color: 'white' }}>
          <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon />
            Confirm User Deletion
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              This action cannot be undone!
            </Typography>
          </Alert>
          
          {selectedUser && (
            <Typography variant="body1">
              Are you sure you want to delete user <strong>{selectedUser.first_name} {selectedUser.last_name}</strong>?
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setShowDeleteModal(false)} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleDeleteUser} variant="contained" color="error">
            Delete User
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

export default UserManagementPage; 