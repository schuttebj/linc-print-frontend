/**
 * User Management Page for Madagascar Driver's License System
 * Manages system users with PersonFormWrapper integration
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  InputAdornment,
  TablePagination,
  Snackbar,
} from '@mui/material';
import {
  Search as SearchIcon,
  PersonAdd as PersonAddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Clear as ClearIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config/api';
import PersonFormWrapper from '../../components/PersonFormWrapper';

// Types
interface User {
  id: string;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  is_superuser: boolean;
  roles: Array<{
    id: string;
    name: string;
    display_name: string;
  }>;
  created_at: string;
  updated_at: string;
}

interface UserSearchForm {
  search_text?: string;
  username?: string;
  email?: string;
  is_active?: boolean;
}

const UserManagementPage: React.FC = () => {
  const { hasPermission, accessToken } = useAuth();
  const navigate = useNavigate();

  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [createdPerson, setCreatedPerson] = useState<any>(null);

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Search form
  const searchForm = useForm<UserSearchForm>({
    defaultValues: {
      search_text: '',
      username: '',
      email: '',
      is_active: true,
    },
  });

  // Load users on component mount
  useEffect(() => {
    if (hasPermission('users.read')) {
      loadUsers();
    }
  }, [hasPermission, accessToken]);

  // Load users function
  const loadUsers = async (searchParams?: UserSearchForm) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (searchParams) {
        Object.entries(searchParams).forEach(([key, value]) => {
          if (value !== undefined && value !== '' && value !== null) {
            params.append(key, String(value));
          }
        });
      }

      params.append('skip', String(page * rowsPerPage));
      params.append('limit', String(rowsPerPage));

      const response = await fetch(`${API_BASE_URL}/api/v1/users/search?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const result = await response.json();
      setUsers(Array.isArray(result) ? result : []);
      setTotalResults(Array.isArray(result) ? result.length : 0);
      setHasSearched(true);

    } catch (error) {
      console.error('Failed to load users:', error);
      setSnackbar({
        open: true,
        message: `Failed to load users: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
      setUsers([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };

  // Search function
  const onSearch = async (data: UserSearchForm) => {
    await loadUsers(data);
  };

  // Clear search
  const clearSearch = () => {
    searchForm.reset({
      search_text: '',
      username: '',
      email: '',
      is_active: true,
    });
    setUsers([]);
    setHasSearched(false);
    setTotalResults(0);
    setPage(0);
  };

  // Handle pagination
  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
    if (hasSearched) {
      loadUsers(searchForm.getValues());
    }
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
    if (hasSearched) {
      loadUsers(searchForm.getValues());
    }
  };

  // Create new user
  const handleCreateUser = () => {
    setShowCreateDialog(true);
  };

  // Edit user
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditDialog(true);
  };

  // Handle person form completion for create
  const handleCreateComplete = (person: any, isEdit: boolean) => {
    setCreatedPerson(person);
    setShowCreateDialog(false);
    setShowSuccessDialog(true);
    // Refresh the user list
    loadUsers(searchForm.getValues());
  };

  // Handle person form completion for edit
  const handleEditComplete = (person: any, isEdit: boolean) => {
    setCreatedPerson(person);
    setShowEditDialog(false);
    setShowSuccessDialog(true);
    // Refresh the user list
    loadUsers(searchForm.getValues());
  };

  // Handle success dialog actions
  const handleCreateNewUser = () => {
    setShowSuccessDialog(false);
    setCreatedPerson(null);
    setShowCreateDialog(true);
  };

  const handleStartApplication = () => {
    setShowSuccessDialog(false);
    if (createdPerson) {
      navigate(`/dashboard/applications/create?personId=${createdPerson.id}`);
    }
  };

  const handleContinueManaging = () => {
    setShowSuccessDialog(false);
    setCreatedPerson(null);
  };

  // Format role display
  const formatRoles = (roles: User['roles']) => {
    if (!roles || roles.length === 0) return 'No roles';
    return roles.map(role => role.display_name || role.name).join(', ');
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-GB');
    } catch {
      return dateString;
    }
  };

  // Check permissions
  if (!hasPermission('users.read')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You don't have permission to manage users. Contact your administrator.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          User Management
        </Typography>
        
        {hasPermission('users.create') && (
          <Button
            variant="contained"
            onClick={handleCreateUser}
            startIcon={<PersonAddIcon />}
          >
            Create New User
          </Button>
        )}
      </Box>
      
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Manage system users and their access permissions.
      </Typography>

      {/* Search Form */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Search Users
          </Typography>
          
          <form onSubmit={searchForm.handleSubmit(onSearch)}>
            <Grid container spacing={3}>
              {/* Quick Search */}
              <Grid item xs={12} md={6}>
                <Controller
                  name="search_text"
                  control={searchForm.control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Quick Search"
                      placeholder="Search by name, username, or email"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                        endAdornment: field.value && (
                          <InputAdornment position="end">
                            <IconButton onClick={() => searchForm.setValue('search_text', '')} size="small">
                              <ClearIcon />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Controller
                  name="username"
                  control={searchForm.control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Username"
                      placeholder="Exact username"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Controller
                  name="email"
                  control={searchForm.control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Email"
                      placeholder="Email address"
                    />
                  )}
                />
              </Grid>

              {/* Search Actions */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SearchIcon />}
                    disabled={loading}
                  >
                    {loading ? 'Searching...' : 'Search Users'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={clearSearch}
                    startIcon={<ClearIcon />}
                  >
                    Clear
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {hasSearched && !loading && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Search Results ({totalResults} users found)
            </Typography>
            
            {users.length === 0 ? (
              <Alert severity="info">
                No users found matching your search criteria.
              </Alert>
            ) : (
              <>
                <TableContainer component={Paper} sx={{ mt: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Username</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Roles</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                              {user.username}
                            </Typography>
                            {user.is_superuser && (
                              <Chip 
                                label="SUPERUSER" 
                                size="small" 
                                color="warning" 
                                sx={{ mt: 0.5 }}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {user.first_name || user.last_name ? 
                              `${user.first_name || ''} ${user.last_name || ''}`.trim() : 
                              'Not provided'
                            }
                          </TableCell>
                          <TableCell>{user.email || 'Not provided'}</TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatRoles(user.roles)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={user.is_active ? 'ACTIVE' : 'INACTIVE'}
                              color={user.is_active ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{formatDate(user.created_at)}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <IconButton 
                                size="small" 
                                onClick={() => handleEditUser(user)}
                                disabled={!hasPermission('users.update')}
                              >
                                <EditIcon />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  component="div"
                  count={totalResults}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handlePageChange}
                  onRowsPerPageChange={handleRowsPerPageChange}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create User Dialog */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth="xl"
        fullWidth
        sx={{ '& .MuiDialog-paper': { height: '90vh' } }}
      >
        <DialogTitle>
          <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonAddIcon />
            Create New User
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <PersonFormWrapper
            mode="application"
            onComplete={handleCreateComplete}
            onCancel={() => setShowCreateDialog(false)}
            onSuccess={handleCreateComplete}
            title="Create New User"
            subtitle="Register a new person who will become a system user."
            showHeader={false}
          />
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        maxWidth="xl"
        fullWidth
        sx={{ '& .MuiDialog-paper': { height: '90vh' } }}
      >
        <DialogTitle>
          <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon />
            Edit User: {selectedUser?.username}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {selectedUser && (
            <PersonFormWrapper
              mode="application"
              onComplete={handleEditComplete}
              onCancel={() => setShowEditDialog(false)}
              onSuccess={handleEditComplete}
              initialPersonId={selectedUser.id}
              title="Edit User"
              subtitle="Update user information and permissions."
              showHeader={false}
              skipFirstStep={true}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog 
        open={showSuccessDialog} 
        onClose={() => setShowSuccessDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle 
          sx={{ 
            bgcolor: 'primary.main', 
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <CheckCircleIcon />
          User Management Success
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {createdPerson && (
            <Box>
              <Alert severity="success" sx={{ mb: 3 }}>
                User <strong>{createdPerson.first_name} {createdPerson.surname}</strong> has been successfully processed!
              </Alert>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box 
                    sx={{ 
                      p: 3, 
                      border: '1px solid',
                      borderColor: 'primary.main',
                      borderRadius: 2,
                      bgcolor: 'primary.50'
                    }}
                  >
                    <Typography variant="h6" color="primary.main" gutterBottom>
                      📋 User Information
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      The user record has been created and is ready for system access configuration.
                    </Typography>
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                      <Typography variant="subtitle2">Person ID:</Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {createdPerson.id}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box 
                    sx={{ 
                      p: 3, 
                      border: '1px solid',
                      borderColor: 'success.main',
                      borderRadius: 2,
                      bgcolor: 'success.50'
                    }}
                  >
                    <Typography variant="h6" color="success.main" gutterBottom>
                      🚀 Next Steps
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Choose your next action to continue the user management workflow.
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • Create another user for additional staff<br/>
                      • Start application process for license requests
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1, justifyContent: 'space-between' }}>
          <Button 
            onClick={handleCreateNewUser}
            variant="outlined"
            startIcon={<PersonAddIcon />}
            size="large"
          >
            Create New User
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              onClick={handleStartApplication}
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              size="large"
              sx={{ minWidth: 200 }}
            >
              Start Application
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserManagementPage; 