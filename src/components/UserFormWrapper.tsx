/**
 * UserFormWrapper - Enhanced User Form Component
 * Handles user creation/editing with role hierarchy and user types
 * Adapted for Madagascar LINC Print system with provincial/national roles
 */

import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Button,
    FormHelperText,
    Alert,
    Card,
    CardContent,
    FormControlLabel,
    Switch,
    Chip,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tabs,
    Tab,
    Divider,
} from '@mui/material';
import {
    PersonAdd as PersonAddIcon,
    Edit as EditIcon,
    Security as SecurityIcon,
    LocationOn as LocationIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';

// Types for Madagascar user management
interface UserFormData {
    // Basic Information
    first_name: string;
    last_name: string;
    email: string;
    password?: string;
    
    // User Type and Location
    user_type: 'LOCATION_USER' | 'PROVINCIAL_USER' | 'NATIONAL_USER';
    primary_location_id?: string;
    scope_province?: string;
    
    // Role Assignment
    role_ids: string[];
    
    // Individual Permission Overrides
    permission_overrides: {
        [key: string]: boolean;
    };
}

interface Role {
    id: string;
    name: string;
    display_name: string;
    description: string;
    hierarchy_level: number;
    user_type_restriction?: string;
    permissions: Permission[];
}

interface Permission {
    id: string;
    name: string;
    display_name: string;
    description: string;
    category: string;
    resource: string;
    action: string;
}

interface Location {
    id: string;
    name: string;
    code: string;
    province_code: string;
    province_name: string;
    office_type: string;
}

interface UserFormWrapperProps {
    mode?: 'create' | 'edit';
    userId?: string;
    onSuccess?: (user: any, isEdit: boolean) => void;
    onCancel?: () => void;
    title?: string;
    subtitle?: string;
}

// Validation schema
const userSchema = yup.object({
    first_name: yup.string().required('First name is required').max(50),
    last_name: yup.string().required('Last name is required').max(50),
    email: yup.string().email('Invalid email format').required('Email is required'),
    password: yup.string().when('$isEdit', {
        is: false,
        then: () => yup.string().required('Password is required').min(8, 'Password must be at least 8 characters'),
        otherwise: () => yup.string().min(8, 'Password must be at least 8 characters'),
    }),
    user_type: yup.string().required('User type is required'),
    role_ids: yup.array().min(1, 'At least one role is required'),
});

const UserFormWrapper: React.FC<UserFormWrapperProps> = ({
    mode = 'create',
    userId,
    onSuccess,
    onCancel,
    title = mode === 'create' ? 'Create New User' : 'Edit User',
    subtitle = mode === 'create' ? 'Create a new user account with appropriate role and permissions.' : 'Update user information and permissions.',
}) => {
    const { user: currentUser, hasPermission, accessToken } = useAuth();

    // State management
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [createdUser, setCreatedUser] = useState<any>(null);
    const [permissionTab, setPermissionTab] = useState(0);

    // Data states
    const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [provinces] = useState([
        { code: 'T', name: 'ANTANANARIVO' },
        { code: 'A', name: 'TOAMASINA' },
        { code: 'D', name: 'ANTSIRANANA' },
        { code: 'F', name: 'FIANARANTSOA' },
        { code: 'M', name: 'MAHAJANGA' },
        { code: 'U', name: 'TOLIARA' },
    ]);

    // Form management
    const form = useForm<UserFormData>({
        resolver: yupResolver(userSchema),
        context: { isEdit: mode === 'edit' },
        defaultValues: {
            first_name: '',
            last_name: '',
            email: '',
            password: '',
            user_type: 'LOCATION_USER',
            primary_location_id: '',
            scope_province: '',
            role_ids: [],
            permission_overrides: {},
        },
    });

    const watchedUserType = form.watch('user_type');
    const watchedLocation = form.watch('primary_location_id');
    const watchedProvince = form.watch('scope_province');
    const watchedRoles = form.watch('role_ids');

    // Load initial data
    useEffect(() => {
        loadInitialData();
        if (mode === 'edit' && userId) {
            loadUserForEdit();
        }
    }, [mode, userId]);

    // Filter roles based on user type and current user's hierarchy
    useEffect(() => {
        filterAvailableRoles();
    }, [watchedUserType, allPermissions]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            
            const [rolesRes, permissionsRes, locationsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/v1/roles/creatable`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                }),
                fetch(`${API_BASE_URL}/api/v1/permissions/by-category`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                }),
                fetch(`${API_BASE_URL}/api/v1/locations?per_page=100`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                }),
            ]);

            if (!rolesRes.ok) {
                console.error('Failed to fetch roles:', rolesRes.status, rolesRes.statusText);
                const errorText = await rolesRes.text();
                console.error('Roles error response:', errorText);
                setAvailableRoles([]); // Fallback to empty array
            } else {
                const roles = await rolesRes.json();
                // Handle the correct response structure from /roles/creatable
                setAvailableRoles(roles.creatable_roles || []);
            }

            if (!permissionsRes.ok) {
                console.error('Failed to fetch permissions:', permissionsRes.status);
                setAllPermissions([]); // Fallback to empty array
            } else {
                const permissions = await permissionsRes.json();
                // Flatten permissions from categories
                const flatPermissions: Permission[] = [];
                Object.values(permissions).forEach((categoryPerms: any) => {
                    flatPermissions.push(...categoryPerms);
                });
                setAllPermissions(flatPermissions);
            }

            if (!locationsRes.ok) {
                console.error('Failed to fetch locations:', locationsRes.status);
                setLocations([]); // Fallback to empty array
            } else {
                const locationsData = await locationsRes.json();
                setLocations(locationsData.locations || []);
            }
        } catch (error) {
            console.error('Failed to load initial data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadUserForEdit = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            
            if (!response.ok) throw new Error('Failed to load user');
            
            const userData = await response.json();
            
            // Populate form with user data
            form.reset({
                first_name: userData.first_name,
                last_name: userData.last_name,
                email: userData.email,
                user_type: userData.user_type || 'LOCATION_USER',
                primary_location_id: userData.primary_location?.id || '',
                scope_province: userData.scope_province || '',
                role_ids: userData.roles?.map((r: any) => r.id) || [],
                permission_overrides: userData.permission_overrides || {},
            });
        } catch (error) {
            console.error('Failed to load user for edit:', error);
        }
    };

    const filterAvailableRoles = () => {
        // Filter roles based on user type restriction and current user's hierarchy
        const filteredRoles = availableRoles.filter(role => {
            // Check user type restriction
            if (role.user_type_restriction && role.user_type_restriction !== watchedUserType) {
                return false;
            }
            
            // Additional filtering based on current user's permissions could go here
            return true;
        });
        
        // Update available roles (this could be a separate state if needed)
    };

    const generateUsername = (): string => {
        const userType = form.getValues('user_type');
        const locationId = form.getValues('primary_location_id');
        const province = form.getValues('scope_province');
        
        if (userType === 'LOCATION_USER' && locationId) {
            const location = locations.find(l => l.id === locationId);
            if (location) {
                return `${location.code}001`; // This would be generated by backend
            }
        } else if (userType === 'PROVINCIAL_USER' && province) {
            return `${province}001`; // This would be generated by backend
        } else if (userType === 'NATIONAL_USER') {
            return 'N001'; // This would be generated by backend
        }
        
        return 'Will be generated automatically';
    };

    const getRoleDefaultPermissions = (roleIds: string[]): string[] => {
        const selectedRoles = availableRoles.filter(role => roleIds.includes(role.id));
        const defaultPermissions = new Set<string>();
        
        selectedRoles.forEach(role => {
            role.permissions.forEach(permission => {
                defaultPermissions.add(permission.name);
            });
        });
        
        return Array.from(defaultPermissions);
    };

    const handleSubmit = async (data: UserFormData) => {
        try {
            setSubmitLoading(true);
            
            const payload = {
                ...data,
                // Remove password if empty in edit mode
                ...(mode === 'edit' && !data.password && { password: undefined }),
            };
            
            const url = mode === 'create' 
                ? `${API_BASE_URL}/api/v1/users/`
                : `${API_BASE_URL}/api/v1/users/${userId}`;
                
            const method = mode === 'create' ? 'POST' : 'PUT';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify(payload),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Failed to ${mode} user`);
            }
            
            const result = await response.json();
            setCreatedUser(result);
            
            if (onSuccess) {
                onSuccess(result, mode === 'edit');
            } else {
                setShowSuccessDialog(true);
            }
        } catch (error) {
            console.error(`Failed to ${mode} user:`, error);
            alert(`Failed to ${mode} user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setSubmitLoading(false);
        }
    };

    // Check permissions
    if (!hasPermission('users.create') && mode === 'create') {
        return (
            <Alert severity="error">
                You don't have permission to create users. Contact your administrator.
            </Alert>
        );
    }

    if (!hasPermission('users.update') && mode === 'edit') {
        return (
            <Alert severity="error">
                You don't have permission to edit users. Contact your administrator.
            </Alert>
        );
    }

    if (loading) {
        return <Box sx={{ p: 3, textAlign: 'center' }}>Loading...</Box>;
    }

    return (
        <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    {title}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    {subtitle}
                </Typography>
            </Box>

            <form onSubmit={form.handleSubmit(handleSubmit)}>
                {/* Basic Information */}
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PersonAddIcon color="primary" />
                            Basic Information
                        </Typography>
                        
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Controller
                                    name="first_name"
                                    control={form.control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="First Name *"
                                            error={!!form.formState.errors.first_name}
                                            helperText={form.formState.errors.first_name?.message}
                                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                        />
                                    )}
                                />
                            </Grid>
                            
                            <Grid item xs={12} md={6}>
                                <Controller
                                    name="last_name"
                                    control={form.control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Last Name *"
                                            error={!!form.formState.errors.last_name}
                                            helperText={form.formState.errors.last_name?.message}
                                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                        />
                                    )}
                                />
                            </Grid>
                            
                            <Grid item xs={12} md={8}>
                                <Controller
                                    name="email"
                                    control={form.control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label="Email Address *"
                                            type="email"
                                            error={!!form.formState.errors.email}
                                            helperText={form.formState.errors.email?.message}
                                            onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                                        />
                                    )}
                                />
                            </Grid>
                            
                            <Grid item xs={12} md={4}>
                                <Controller
                                    name="password"
                                    control={form.control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label={mode === 'create' ? 'Password *' : 'New Password'}
                                            type="password"
                                            error={!!form.formState.errors.password}
                                            helperText={form.formState.errors.password?.message || (mode === 'edit' ? 'Leave blank to keep current password' : '')}
                                        />
                                    )}
                                />
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>

                {/* User Type and Location */}
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocationIcon color="primary" />
                            User Type & Assignment
                        </Typography>
                        
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={4}>
                                <Controller
                                    name="user_type"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormControl fullWidth error={!!form.formState.errors.user_type}>
                                            <InputLabel>User Type *</InputLabel>
                                            <Select {...field} label="User Type *">
                                                <MenuItem value="LOCATION_USER">Location User</MenuItem>
                                                <MenuItem value="PROVINCIAL_USER">Provincial User</MenuItem>
                                                <MenuItem value="NATIONAL_USER">National User</MenuItem>
                                            </Select>
                                            <FormHelperText>
                                                {form.formState.errors.user_type?.message || 'Select user access level'}
                                            </FormHelperText>
                                        </FormControl>
                                    )}
                                />
                            </Grid>
                            
                            {watchedUserType === 'LOCATION_USER' && (
                                <Grid item xs={12} md={8}>
                                    <Controller
                                        name="primary_location_id"
                                        control={form.control}
                                        render={({ field }) => (
                                            <FormControl fullWidth>
                                                <InputLabel>Primary Location *</InputLabel>
                                                <Select {...field} label="Primary Location *">
                                                    {locations.map((location) => (
                                                        <MenuItem key={location.id} value={location.id}>
                                                            {location.name} ({location.code}) - {location.province_name}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                                <FormHelperText>Select the primary office location</FormHelperText>
                                            </FormControl>
                                        )}
                                    />
                                </Grid>
                            )}
                            
                            {watchedUserType === 'PROVINCIAL_USER' && (
                                <Grid item xs={12} md={8}>
                                    <Controller
                                        name="scope_province"
                                        control={form.control}
                                        render={({ field }) => (
                                            <FormControl fullWidth>
                                                <InputLabel>Province Scope *</InputLabel>
                                                <Select {...field} label="Province Scope *">
                                                    {provinces.map((province) => (
                                                        <MenuItem key={province.code} value={province.code}>
                                                            {province.name} ({province.code})
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                                <FormHelperText>Select the province for oversight</FormHelperText>
                                            </FormControl>
                                        )}
                                    />
                                </Grid>
                            )}
                            
                            {watchedUserType === 'NATIONAL_USER' && (
                                <Grid item xs={12} md={8}>
                                    <Alert severity="info">
                                        National users have system-wide access across all provinces and locations.
                                    </Alert>
                                </Grid>
                            )}
                            
                            {/* Generated Username Display */}
                            <Grid item xs={12}>
                                <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 1, border: '1px solid', borderColor: 'primary.200' }}>
                                    <Typography variant="subtitle2" color="primary.main" gutterBottom>
                                        Generated Username:
                                    </Typography>
                                    <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>
                                        {generateUsername()}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        {watchedUserType === 'LOCATION_USER' && 'Format: {ProvinceCode}{OfficeNumber}{UserNumber} (e.g., T010001)'}
                                        {watchedUserType === 'PROVINCIAL_USER' && 'Format: {ProvinceCode}{Number} (e.g., T007)'}
                                        {watchedUserType === 'NATIONAL_USER' && 'Format: N{Number} (e.g., N001)'}
                                    </Typography>
                                </Box>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>

                {/* Role Assignment */}
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SecurityIcon color="primary" />
                            Role Assignment
                        </Typography>
                        
                        <Controller
                            name="role_ids"
                            control={form.control}
                            render={({ field }) => (
                                <FormControl fullWidth error={!!form.formState.errors.role_ids}>
                                    <InputLabel>Roles *</InputLabel>
                                    <Select
                                        {...field}
                                        multiple
                                        label="Roles *"
                                        renderValue={(selected) => (
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {(selected as string[]).map((roleId) => {
                                                    const role = availableRoles.find(r => r.id === roleId);
                                                    return (
                                                        <Chip
                                                            key={roleId}
                                                            label={role?.display_name || roleId}
                                                            size="small"
                                                            color="primary"
                                                        />
                                                    );
                                                })}
                                            </Box>
                                        )}
                                    >
                                        {availableRoles.map((role) => (
                                            <MenuItem key={role.id} value={role.id}>
                                                <Box>
                                                    <Typography variant="subtitle2">
                                                        {role.display_name} (Level {role.hierarchy_level})
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {role.description}
                                                    </Typography>
                                                </Box>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    <FormHelperText>
                                        {form.formState.errors.role_ids?.message || 'Select one or more roles for this user'}
                                    </FormHelperText>
                                </FormControl>
                            )}
                        />
                        
                        {/* Role Permissions Preview */}
                        {watchedRoles.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Default Permissions from Selected Roles:
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {getRoleDefaultPermissions(watchedRoles).map((permission) => (
                                        <Chip
                                            key={permission}
                                            label={permission.replace(/[._]/g, ' ').toUpperCase()}
                                            size="small"
                                            variant="outlined"
                                        />
                                    ))}
                                </Box>
                            </Box>
                        )}
                    </CardContent>
                </Card>

                {/* Permission Overrides */}
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Individual Permission Overrides
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Grant or revoke specific permissions beyond the default role permissions.
                        </Typography>
                        
                        <Tabs value={permissionTab} onChange={(_, newValue) => setPermissionTab(newValue)}>
                            <Tab label="User Management" />
                            <Tab label="Location Management" />
                            <Tab label="System Administration" />
                        </Tabs>
                        
                        <Box sx={{ mt: 2 }}>
                            {/* Permission toggles would go here based on selected tab */}
                            <Alert severity="info">
                                Permission override interface will be implemented here with simple toggles grouped by category.
                            </Alert>
                        </Box>
                    </CardContent>
                </Card>

                {/* Submit Actions */}
                <Paper sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Button
                            variant="outlined"
                            onClick={onCancel}
                            disabled={submitLoading}
                        >
                            Cancel
                        </Button>
                        
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={submitLoading}
                            startIcon={mode === 'create' ? <PersonAddIcon /> : <EditIcon />}
                        >
                            {submitLoading ? (mode === 'create' ? 'Creating...' : 'Updating...') : (mode === 'create' ? 'Create User' : 'Update User')}
                        </Button>
                    </Box>
                </Paper>
            </form>

            {/* Success Dialog */}
            <Dialog
                open={showSuccessDialog}
                onClose={() => setShowSuccessDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ bgcolor: 'success.main', color: 'white' }}>
                    <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircleIcon />
                        User {mode === 'create' ? 'Created' : 'Updated'} Successfully!
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    {createdUser && (
                        <Box>
                            <Alert severity="success" sx={{ mb: 2 }}>
                                User <strong>{createdUser.first_name} {createdUser.last_name}</strong> has been successfully {mode === 'create' ? 'created' : 'updated'}!
                            </Alert>
                            
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <Typography variant="subtitle2" color="text.secondary">Username:</Typography>
                                <Typography variant="body1" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                                    {createdUser.username}
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button
                        onClick={() => setShowSuccessDialog(false)}
                        variant="contained"
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UserFormWrapper; 