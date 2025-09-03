/**
 * User Management Page for Madagascar LINC Print System
 * Enhanced with role hierarchy and user type management
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Paper,
  Chip,
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
  Stack,
  Skeleton,
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  PlayArrow as ActivateIcon,
  Pause as DeactivateIcon,
} from '@mui/icons-material';

import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config/api';
import FilterBar, { FilterConfig, FilterValues } from '../../components/common/FilterBar';

// Filter configurations for UserManagementPage
const USER_FILTER_CONFIGS: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'ACTIVE', label: 'Active' },
      { value: 'INACTIVE', label: 'Inactive' },
      { value: 'SUSPENDED', label: 'Suspended' }
    ],
  },
  {
    key: 'user_type',
    label: 'User Type',
    type: 'select',
    options: [
      { value: 'SYSTEM_USER', label: 'System User' },
      { value: 'NATIONAL_ADMIN', label: 'National Admin' },
      { value: 'PROVINCIAL_ADMIN', label: 'Provincial Admin' },
      { value: 'LOCATION_USER', label: 'Location User' }
    ],
  },
  {
    key: 'province',
    label: 'Province',
    type: 'select',
    options: [
      { value: 'T', label: 'Antananarivo' },
      { value: 'A', label: 'Toamasina' },
      { value: 'D', label: 'Antsiranana' },
      { value: 'F', label: 'Fianarantsoa' },
      { value: 'M', label: 'Mahajanga' },
      { value: 'U', label: 'Toliara' }
    ],
  },
];

// Enhanced user interface with new fields
interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  user_type: 'SYSTEM_USER' | 'NATIONAL_ADMIN' | 'PROVINCIAL_ADMIN' | 'LOCATION_USER';
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

  // Filter state management for FilterBar
  const [searchValue, setSearchValue] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [filterConfigs] = useState<FilterConfig[]>(USER_FILTER_CONFIGS);

  // Modal states (keeping only view, delete, and success dialogs)
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Load users
  useEffect(() => {
    loadUsers();
  }, [page, rowsPerPage, searchValue, filterValues]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: (page + 1).toString(),
        per_page: rowsPerPage.toString(),
        ...(searchValue && { search: searchValue }),
        ...(filterValues.status && { status: filterValues.status }),
        ...(filterValues.user_type && { user_type: filterValues.user_type }),
        ...(filterValues.province && { province: filterValues.province }),
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
    await loadUsers();
  };

  const handleClear = () => {
    setSearchValue('');
    setFilterValues({});
    setPage(0);
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

  const handleToggleActivation = async (user: User) => {
    try {
      const action = user.status === 'ACTIVE' ? 'deactivate' : 'activate';
      const response = await fetch(`${API_BASE_URL}/api/v1/users/${user.id}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} user`);
      }

      setSuccessMessage(`User ${user.first_name} ${user.last_name} has been ${action}d successfully.`);
      setShowSuccessDialog(true);
      loadUsers();
    } catch (err) {
      alert(`Failed to toggle user activation: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const getUserTypeDisplay = (userType: string): { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' } => {
    switch (userType) {
      case 'SYSTEM_USER':
        return { label: 'System', color: 'error' };
      case 'NATIONAL_ADMIN':
        return { label: 'National', color: 'error' };
      case 'PROVINCIAL_ADMIN':
        return { label: 'Provincial', color: 'warning' };
      case 'LOCATION_USER':
        return { label: 'Location', color: 'primary' };
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
      default:
        return 'default';
    }
  };

  const getLocationInfo = (user: User) => {
    if (user.user_type === 'LOCATION_USER' && user.primary_location) {
      return `${user.primary_location.name} (${user.primary_location.code})`;
    } else if (user.user_type === 'PROVINCIAL_ADMIN' && user.scope_province) {
      const provinceNames: { [key: string]: string } = {
        'T': 'ANTANANARIVO',
        'A': 'TOAMASINA',
        'D': 'ANTSIRANANA',
        'F': 'FIANARANTSOA',
        'M': 'MAHAJANGA',
        'U': 'TOLIARA',
      };
      return `${provinceNames[user.scope_province] || user.scope_province} Province`;
    } else if (user.user_type === 'NATIONAL_ADMIN') {
      return 'National Access';
    } else if (user.user_type === 'SYSTEM_USER') {
      return 'System Access';
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

  // Skeleton loader component for user results
  const UserResultsSkeleton = () => (
    <TableContainer sx={{ flex: 1 }}>
      <Table stickyHeader sx={{ '& .MuiTableCell-root': { borderRadius: 0 } }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>User</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Type</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Assignment</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Roles</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Last Login</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: rowsPerPage }).map((_, index) => (
            <TableRow key={index}>
              <TableCell sx={{ py: 1, px: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Skeleton variant="circular" width={32} height={32} />
                  <Box>
                    <Skeleton variant="text" width="120px" height={20} />
                    <Skeleton variant="text" width="80px" height={16} />
                    <Skeleton variant="text" width="140px" height={16} />
                  </Box>
                </Box>
              </TableCell>
              <TableCell sx={{ py: 1, px: 2 }}>
                <Skeleton variant="rounded" width={70} height={24} />
              </TableCell>
              <TableCell sx={{ py: 1, px: 2 }}>
                <Skeleton variant="text" width="100%" height={20} />
              </TableCell>
              <TableCell sx={{ py: 1, px: 2 }}>
                <Stack direction="row" spacing={0.5}>
                  <Skeleton variant="rounded" width={60} height={24} />
                  <Skeleton variant="rounded" width={80} height={24} />
                </Stack>
              </TableCell>
              <TableCell sx={{ py: 1, px: 2 }}>
                <Skeleton variant="rounded" width={60} height={24} />
              </TableCell>
              <TableCell sx={{ py: 1, px: 2 }}>
                <Skeleton variant="text" width="100%" height={20} />
              </TableCell>
              <TableCell align="right" sx={{ py: 1, px: 2 }}>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Skeleton variant="circular" width={32} height={32} />
                  <Skeleton variant="circular" width={32} height={32} />
                  <Skeleton variant="circular" width={32} height={32} />
                  <Skeleton variant="circular" width={32} height={32} />
                  <Skeleton variant="circular" width={32} height={32} />
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Check for success message from navigation state
  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage);
      setShowSuccessDialog(true);
      // Clear the state to prevent showing the message again
      navigate('/dashboard/admin/users', { replace: true });
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
              Search Users
            </Typography>
            {hasPermission('users.create') && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/dashboard/admin/users/create')}
                size="small"
              >
                Create User
              </Button>
            )}
          </Box>
          
          <FilterBar
            searchValue={searchValue}
            searchPlaceholder="Search by username, name, or email"
            onSearchChange={setSearchValue}
            filterConfigs={filterConfigs}
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

          {/* Users Table */}
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
                <UserResultsSkeleton />
                <TablePagination
                  component="div"
                  count={0}
                  page={page}
                  onPageChange={() => {}}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={() => {}}
                  rowsPerPageOptions={[10, 20, 50, { value: -1, label: 'All' }]}
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
                {users.length === 0 ? (
                  <Box sx={{ p: 2 }}>
                    <Alert severity="info">
                      No users found matching your search criteria. Try adjusting your search terms.
                    </Alert>
                  </Box>
                ) : (
                  <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <TableContainer sx={{ flex: 1 }}>
                      <Table stickyHeader sx={{ '& .MuiTableCell-root': { borderRadius: 0 } }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>User</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Assignment</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Roles</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Last Login</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {users.map((user) => (
                            <TableRow key={user.id} hover>
                              <TableCell sx={{ py: 1, px: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                                    <PersonIcon sx={{ fontSize: '1rem' }} />
                                  </Avatar>
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                                      {user.first_name} {user.last_name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                                      {user.username}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>
                                      {user.email}
                                    </Typography>
                                  </Box>
                                </Box>
                              </TableCell>
                              
                              <TableCell sx={{ py: 1, px: 2 }}>
                                <Chip
                                  label={getUserTypeDisplay(user.user_type).label}
                                  color={getUserTypeDisplay(user.user_type).color}
                                  size="small"
                                />
                              </TableCell>
                              
                              <TableCell sx={{ py: 1, px: 2 }}>
                                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                  {getLocationInfo(user)}
                                </Typography>
                              </TableCell>
                              
                              <TableCell sx={{ py: 1, px: 2 }}>
                                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                  {user.roles?.map((role) => (
                                    <Chip
                                      key={role.id}
                                      label={`${role.display_name || role.name}${role.hierarchy_level ? ` (${role.hierarchy_level})` : ''}`}
                                      size="small"
                                      variant="outlined"
                                    />
                                  ))}
                                </Stack>
                              </TableCell>
                              
                              <TableCell sx={{ py: 1, px: 2 }}>
                                <Chip
                                  label={user.status}
                                  color={getStatusColor(user.status)}
                                  size="small"
                                />
                              </TableCell>
                              
                              <TableCell sx={{ py: 1, px: 2 }}>
                                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                  {user.last_login ? formatDate(user.last_login) : 'Never'}
                                </Typography>
                              </TableCell>
                              
                              <TableCell align="right" sx={{ py: 1, px: 2 }}>
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
                                      onClick={() => navigate(`/dashboard/admin/users/edit/${user.id}`)}
                                    >
                                      <EditIcon />
                                    </IconButton>
                                  )}
                                  
                                  {hasPermission('users.update') && (
                                    <IconButton
                                      size="small"
                                      onClick={() => handleToggleActivation(user)}
                                      color={user.status === 'ACTIVE' ? 'warning' : 'success'}
                                      title={user.status === 'ACTIVE' ? 'Deactivate User' : 'Activate User'}
                                    >
                                      {user.status === 'ACTIVE' ? <DeactivateIcon /> : <ActivateIcon />}
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
                                      title="Delete User"
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

                    <TablePagination
                      component="div"
                      count={totalResults}
                      page={page}
                      onPageChange={handlePageChange}
                      rowsPerPage={rowsPerPage}
                      onRowsPerPageChange={handleRowsPerPageChange}
                      rowsPerPageOptions={[10, 20, 50, { value: -1, label: 'All' }]}
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
                    label={`${role.display_name || role.name}${role.hierarchy_level ? ` (Level ${role.hierarchy_level})` : ''}`}
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
    </>);
};

export default UserManagementPage; 