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
    VpnKey as VpnKeyIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';
import lookupService, { DocumentType, UserStatus, UserType, Province } from '../services/lookupService';

// Types for Madagascar user management
interface UserFormData {
    // Basic Information
    first_name: string;
    last_name: string;
    email: string;
    
    // Madagascar-specific fields
    username?: string; // Will be auto-generated
    madagascar_id_number: string;
    id_document_type: string;
    
    // User Type and Location
    user_type: 'LOCATION_USER' | 'PROVINCIAL_USER' | 'NATIONAL_USER';
    primary_location_id?: string;
    scope_province?: string;
    
    // Role Assignment (single role only for LOCATION_USER)
    role_id?: string;
    
    // Individual Permission Overrides
    permission_overrides: {
        [key: string]: boolean;
    };
}

interface Role {
    id: string;
    name: string;
    display_name: string;
    description?: string;
    hierarchy_level: number;
    user_type_restriction?: string;
    permissions?: Permission[];
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
    madagascar_id_number: yup.string().required('Madagascar ID number is required'),
    id_document_type: yup.string().required('ID document type is required'),
    user_type: yup.string().required('User type is required'),
    role_id: yup.string().when('user_type', {
        is: 'LOCATION_USER',
        then: () => yup.string().required('Role is required for location users'),
        otherwise: () => yup.string().optional(),
    }),
});

// Generate random password function
const generateRandomPassword = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

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
    const [generatedPassword, setGeneratedPassword] = useState<string>('');
    const [permissionTab, setPermissionTab] = useState(0);

    // Data states
    const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
    const [userStatuses, setUserStatuses] = useState<UserStatus[]>([]);
    const [userTypes, setUserTypes] = useState<UserType[]>([]);
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [lookupsLoading, setLookupsLoading] = useState(true);

    // Form management
    const form = useForm<UserFormData>({
        resolver: yupResolver(userSchema),
        defaultValues: {
            first_name: '',
            last_name: '',
            email: '',
            madagascar_id_number: '',
            id_document_type: 'MADAGASCAR_ID', // Fallback until lookup data loads
            user_type: 'LOCATION_USER',
            primary_location_id: '',
            scope_province: '',
            role_id: '',
            permission_overrides: {},
        },
    });

    const watchedUserType = form.watch('user_type');
    const watchedLocation = form.watch('primary_location_id');
    const watchedProvince = form.watch('scope_province');
    const watchedRole = form.watch('role_id');

    // Load initial data
    useEffect(() => {
        loadInitialData();
        if (mode === 'edit' && userId) {
            loadUserForEdit();
        }
        // Generate password for new users
        if (mode === 'create') {
            setGeneratedPassword(generateRandomPassword());
        }
    }, [mode, userId]);

    // Filter roles based on user type and current user's hierarchy
    useEffect(() => {
        filterAvailableRoles();
    }, [watchedUserType, allPermissions]);

    // Set default document type after lookup data is loaded
    useEffect(() => {
        if (!lookupsLoading && documentTypes.length > 0 && mode === 'create') {
            const defaultDocumentType = documentTypes[0].value;
            form.setValue('id_document_type', defaultDocumentType);
            console.log('✅ Default document type set:', defaultDocumentType);
        }
    }, [lookupsLoading, documentTypes, mode, form]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            setLookupsLoading(true);
            
            // Load lookup data
            const lookupData = await lookupService.getAllLookups();
            setDocumentTypes(lookupData.document_types);
            setUserStatuses(lookupData.user_statuses);
            setUserTypes(lookupData.user_types);
            setProvinces(lookupData.provinces);
            console.log('✅ Lookup data loaded:', { 
                documentTypes: lookupData.document_types,
                userStatuses: lookupData.user_statuses,
                userTypes: lookupData.user_types,
                provinces: lookupData.provinces
            });
            setLookupsLoading(false);
            
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
                setAvailableRoles([]);
            } else {
                const roles = await rolesRes.json();
                setAvailableRoles(roles.creatable_roles || []);
            }

            if (!permissionsRes.ok) {
                console.error('Failed to fetch permissions:', permissionsRes.status);
                setAllPermissions([]);
            } else {
                const permissions = await permissionsRes.json();
                const flatPermissions: Permission[] = [];
                Object.values(permissions).forEach((categoryPerms: any) => {
                    flatPermissions.push(...categoryPerms);
                });
                setAllPermissions(flatPermissions);
            }

            if (!locationsRes.ok) {
                console.error('Failed to fetch locations:', locationsRes.status);
                setLocations([]);
            } else {
                const locationsData = await locationsRes.json();
                setLocations(locationsData.locations || []);
            }
        } catch (error) {
            console.error('Failed to load initial data:', error);
            setLookupsLoading(false);
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
            
            form.reset({
                first_name: userData.first_name,
                last_name: userData.last_name,
                email: userData.email,
                madagascar_id_number: userData.madagascar_id_number || '',
                id_document_type: userData.id_document_type || 'MADAGASCAR_ID',
                user_type: userData.user_type || 'LOCATION_USER',
                primary_location_id: userData.primary_location?.id || '',
                scope_province: userData.scope_province || '',
                role_id: userData.roles?.[0]?.id || '',
                permission_overrides: userData.permission_overrides || {},
            });
        } catch (error) {
            console.error('Failed to load user for edit:', error);
        }
    };

    const filterAvailableRoles = () => {
        if (watchedUserType !== 'LOCATION_USER') {
            // Provincial and National users don't need role assignment
            return;
        }
        
        // Filter roles based on current user's hierarchy level and user type restriction
        // Implementation depends on your backend role filtering logic
    };

    const generateUsername = (): string => {
        switch (watchedUserType) {
            case 'LOCATION_USER':
                const selectedLocation = locations.find(loc => loc.id === watchedLocation);
                if (selectedLocation) {
                    return `${selectedLocation.province_code}${selectedLocation.code.slice(-3)}001`;
                }
                return 'T010001';
            case 'PROVINCIAL_USER':
                return watchedProvince ? `${watchedProvince}007` : 'T007';
            case 'NATIONAL_USER':
                return 'N001';
            default:
                return 'T010001';
        }
    };

    const getRoleDefaultPermissions = (roleId: string): string[] => {
        const role = availableRoles.find(r => r.id === roleId);
        if (role && role.permissions) {
            return role.permissions.map(p => p.name);
        }
        return [];
    };

    const handleSubmit = async (data: UserFormData) => {
        try {
            setSubmitLoading(true);
            
            const payload = {
                ...data,
                // Add auto-generated username and password
                username: generateUsername(),
                password: generatedPassword,
                confirm_password: generatedPassword,
                // Convert single role to array for backend compatibility
                role_ids: data.role_id ? [data.role_id] : [],
                // Remove the single role_id field
                role_id: undefined,
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
                            <Grid item xs={12} sm={6}>
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
                            
                            <Grid item xs={12} sm={6}>
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
                            
                            <Grid item xs={12}>
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
                        </Grid>
                    </CardContent>
                </Card>

                {/* Identification Document - Matching PersonFormWrapper Style */}
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Identification Document
                        </Typography>

                        <Box sx={{ mb: 4, p: 3, border: '1px solid #e0e0e0', borderRadius: 2, backgroundColor: '#fafafa' }}>
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                                Primary Document
                            </Typography>

                            <Grid container spacing={3}>
                                <Grid item xs={12} md={4}>
                                    <Controller
                                        name="id_document_type"
                                        control={form.control}
                                        render={({ field }) => (
                                            <FormControl fullWidth error={!!form.formState.errors.id_document_type}>
                                                <InputLabel>Document Type *</InputLabel>
                                                <Select {...field} label="Document Type *">
                                                    {documentTypes.map((type) => (
                                                        <MenuItem key={type.value} value={type.value}>
                                                            {type.label}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                                <FormHelperText>
                                                    {form.formState.errors.id_document_type?.message || 'Select document type'}
                                                </FormHelperText>
                                            </FormControl>
                                        )}
                                    />
                                </Grid>
                                
                                <Grid item xs={12} md={6}>
                                    <Controller
                                        name="madagascar_id_number"
                                        control={form.control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                fullWidth
                                                label="Document Number *"
                                                error={!!form.formState.errors.madagascar_id_number}
                                                helperText={form.formState.errors.madagascar_id_number?.message || 'Document number (numbers only)'}
                                                onChange={(e) => {
                                                    // Allow only numbers for document numbers (matching PersonFormWrapper style)
                                                    const value = e.target.value.replace(/\D/g, '');
                                                    field.onChange(value);
                                                }}
                                            />
                                        )}
                                    />
                                </Grid>
                            </Grid>
                        </Box>
                    </CardContent>
                </Card>

                {/* Generated Credentials Display */}
                {mode === 'create' && (
                    <Card sx={{ mb: 3, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}>
                                <VpnKeyIcon color="success" />
                                Generated Login Credentials
                            </Typography>
                            
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                            Username:
                                        </Typography>
                                        <Typography variant="h6" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                            {generateUsername()}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                            {watchedUserType === 'LOCATION_USER' && 'Format: {ProvinceCode}{OfficeNumber}{UserNumber}'}
                                            {watchedUserType === 'PROVINCIAL_USER' && 'Format: {ProvinceCode}{Number}'}
                                            {watchedUserType === 'NATIONAL_USER' && 'Format: N{Number}'}
                                        </Typography>
                                    </Box>
                                </Grid>
                                
                                <Grid item xs={12} md={6}>
                                    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                            Generated Password:
                                        </Typography>
                                        <Typography variant="h6" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                            {generatedPassword}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                            User will be required to change on first login
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                            
                            <Alert severity="warning" sx={{ mt: 2 }}>
                                <strong>Important:</strong> Please save these credentials securely. The password will not be shown again after user creation.
                                {/* TODO: Implement first-login password change requirement */}
                            </Alert>
                        </CardContent>
                    </Card>
                )}

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
                                                {userTypes.map((userType) => (
                                                    <MenuItem key={userType.value} value={userType.value}>
                                                        {userType.label}
                                                    </MenuItem>
                                                ))}
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
                        </Grid>
                    </CardContent>
                </Card>

                {/* Role Assignment - Only for Location Users */}
                {watchedUserType === 'LOCATION_USER' && (
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SecurityIcon color="primary" />
                                Role Assignment
                            </Typography>
                            
                            <Grid container spacing={3}>
                                <Grid item xs={12}>
                                    <Controller
                                        name="role_id"
                                        control={form.control}
                                        render={({ field }) => (
                                            <FormControl fullWidth error={!!form.formState.errors.role_id}>
                                                <InputLabel>Role *</InputLabel>
                                                <Select {...field} label="Role *">
                                                    {availableRoles.map((role) => (
                                                        <MenuItem key={role.id} value={role.id}>
                                                            <Box>
                                                                <Typography variant="body1">{role.display_name}</Typography>
                                                                <Typography variant="body2" color="text.secondary">
                                                                    Level {role.hierarchy_level} - {role.description || 'No description available'}
                                                                </Typography>
                                                            </Box>
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                                <FormHelperText>
                                                    {form.formState.errors.role_id?.message || 'Select a single role (hierarchical system - higher roles include lower permissions)'}
                                                </FormHelperText>
                                            </FormControl>
                                        )}
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                )}

                {/* Provincial/National Role Info */}
                {(watchedUserType === 'PROVINCIAL_USER' || watchedUserType === 'NATIONAL_USER') && (
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SecurityIcon color="primary" />
                                Access Permissions
                            </Typography>
                            
                            <Alert severity="info">
                                <Typography variant="body1" gutterBottom>
                                    <strong>{watchedUserType === 'PROVINCIAL_USER' ? 'Provincial User' : 'National User'}</strong> accounts have inherent permissions based on their user type:
                                </Typography>
                                <ul>
                                    <li>No specific role assignment required</li>
                                    <li>{watchedUserType === 'PROVINCIAL_USER' ? 'Province-wide oversight capabilities' : 'System-wide administrative access'}</li>
                                    <li>Automatic access to appropriate management functions</li>
                                </ul>
                            </Alert>
                        </CardContent>
                    </Card>
                )}

                {/* Individual Permission Overrides */}
                {watchedRole && (
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Individual Permission Overrides
                            </Typography>
                            
                            <Alert severity="info" sx={{ mb: 2 }}>
                                The selected role provides default permissions. You can override specific permissions here if needed.
                            </Alert>
                            
                            <Typography variant="body2" color="text.secondary">
                                Default permissions from role: {getRoleDefaultPermissions(watchedRole).join(', ')}
                            </Typography>
                            
                            {/* TODO: Implement detailed permission override interface */}
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                    TODO: Individual permission toggle interface will be implemented here
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                )}

                {/* Submit Buttons */}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    {onCancel && (
                        <Button 
                            variant="outlined" 
                            onClick={onCancel}
                            disabled={submitLoading}
                        >
                            Cancel
                        </Button>
                    )}
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={submitLoading}
                        sx={{ minWidth: 120 }}
                    >
                        {submitLoading ? 'Processing...' : mode === 'create' ? 'Create User' : 'Update User'}
                    </Button>
                </Box>
            </form>

            {/* Success Dialog */}
            <Dialog open={showSuccessDialog} onClose={() => setShowSuccessDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon color="success" />
                    User {mode === 'create' ? 'Created' : 'Updated'} Successfully
                </DialogTitle>
                <DialogContent>
                    {createdUser && (
                        <Box>
                            <Typography variant="body1" gutterBottom>
                                {mode === 'create' ? 'New user account has been created:' : 'User account has been updated:'}
                            </Typography>
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <Typography variant="body2"><strong>Name:</strong> {createdUser.first_name} {createdUser.last_name}</Typography>
                                <Typography variant="body2"><strong>Email:</strong> {createdUser.email}</Typography>
                                <Typography variant="body2"><strong>Username:</strong> {createdUser.username}</Typography>
                                <Typography variant="body2"><strong>User Type:</strong> {createdUser.user_type?.replace('_', ' ')}</Typography>
                            </Box>
                            {mode === 'create' && (
                                <Alert severity="warning" sx={{ mt: 2 }}>
                                    Please provide the user with their login credentials. They will be required to change their password on first login.
                                </Alert>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowSuccessDialog(false)} variant="contained">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UserFormWrapper; 