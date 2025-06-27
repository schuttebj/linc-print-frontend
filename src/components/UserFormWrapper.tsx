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
    Checkbox,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';
import {
    PersonAdd as PersonAddIcon,
    Edit as EditIcon,
    Security as SecurityIcon,
    LocationOn as LocationIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    VpnKey as VpnKeyIcon,
    ExpandMore as ExpandMoreIcon,
    Lock as LockIcon,
    LockOpen as LockOpenIcon,
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
    user_type: 'SYSTEM_USER' | 'NATIONAL_ADMIN' | 'PROVINCIAL_ADMIN' | 'LOCATION_USER';
    primary_location_id?: string;
    scope_province?: string;
    
    // Role Assignment (single role only for LOCATION_USER)
    role_id?: string;
    
    // User Status
    status?: string;
    
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
    const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
    const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
    const [userStatuses, setUserStatuses] = useState<UserStatus[]>([]);
    const [userTypes, setUserTypes] = useState<UserType[]>([]);
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [filteredProvinces, setFilteredProvinces] = useState<Province[]>([]);
    const [filteredUserTypes, setFilteredUserTypes] = useState<UserType[]>([]);
    const [lookupsLoading, setLookupsLoading] = useState(true);
    const [userActualPermissions, setUserActualPermissions] = useState<string[]>([]);

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
            status: 'ACTIVE', // Default to active
            permission_overrides: {},
        },
    });

    const watchedUserType = form.watch('user_type');
    const watchedLocation = form.watch('primary_location_id');
    const watchedProvince = form.watch('scope_province');
    const watchedRole = form.watch('role_id');

    // Check if current user can manage permissions
    const canManagePermissions = currentUser?.is_superuser || 
        ['SYSTEM_USER', 'NATIONAL_ADMIN', 'PROVINCIAL_ADMIN'].includes(currentUser?.user_type || '');

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

    // Filter locations and provinces based on current user's scope
    useEffect(() => {
        filterAvailableLocationsAndProvinces();
    }, [watchedUserType, currentUser, locations, provinces]);

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

    // Set default permissions when role changes
    useEffect(() => {
        console.log('🔄 Role change detected:', watchedRole, 'Available roles:', availableRoles.length);
        if (watchedRole && availableRoles.length > 0) {
            const selectedRole = availableRoles.find(role => role.id === watchedRole);
            console.log('🎯 Selected role:', selectedRole?.display_name, 'Has permissions:', !!selectedRole?.permissions);
            if (selectedRole) {
                console.log('📋 Role permissions count:', selectedRole.permissions?.length || 0);
                
                // For edit mode, calculate overrides based on user's actual permissions vs role defaults
                if (mode === 'edit' && userActualPermissions.length > 0) {
                    const rolePermissions = selectedRole.permissions?.map(p => p.name) || [];
                    const overrides: { [key: string]: boolean } = {};
                    
                    // Find permissions that user has but role doesn't (granted overrides)
                    userActualPermissions.forEach(permission => {
                        if (!rolePermissions.includes(permission)) {
                            overrides[permission] = true;
                            console.log(`✅ Found granted override: ${permission}`);
                        }
                    });
                    
                    // Find permissions that role has but user doesn't (revoked overrides)
                    rolePermissions.forEach(permission => {
                        if (!userActualPermissions.includes(permission)) {
                            overrides[permission] = false;
                            console.log(`❌ Found revoked override: ${permission}`);
                        }
                    });
                    
                    form.setValue('permission_overrides', overrides);
                    console.log('✅ Permission overrides calculated for edit mode:', overrides);
                } else {
                    // For create mode, clear existing permission overrides for new role selection
                    const newPermissionOverrides: { [key: string]: boolean } = {};
                    form.setValue('permission_overrides', newPermissionOverrides);
                    console.log('✅ Permission overrides reset for new role');
                }
            }
        } else if (!watchedRole) {
            // Clear permissions when no role is selected
            form.setValue('permission_overrides', {});
            console.log('🧹 Cleared permissions - no role selected');
        }
    }, [watchedRole, availableRoles, form, mode, userActualPermissions]);

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
                fetch(`${API_BASE_URL}/api/v1/roles/creatable?include_permissions=true`, {
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
                console.log('✅ Roles loaded:', roles.creatable_roles?.length || 0);
                console.log('🔍 First role permissions:', roles.creatable_roles?.[0]?.permissions?.length || 0);
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
            console.log('📥 Loaded user data:', userData);
            
            // Calculate permission overrides by comparing user's actual permissions with role defaults
            let permissionOverrides = {};
            if (userData.user_type === 'LOCATION_USER' && userData.roles?.[0]) {
                try {
                    // Get user's actual permissions
                    const permissionsResponse = await fetch(`${API_BASE_URL}/api/v1/users/${userId}/permissions`, {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });
                    
                    if (permissionsResponse.ok) {
                        const permissionsData = await permissionsResponse.json();
                        const userPermissions = permissionsData.permissions.map(p => p.name);
                        console.log('📥 User actual permissions:', userPermissions);
                        
                        // Wait for roles to be loaded to compare against role defaults
                        // We'll calculate overrides after roles are loaded
                        setUserActualPermissions(userPermissions);
                    } else {
                        console.log('ℹ️ Could not load user permissions');
                    }
                } catch (permissionError) {
                    console.log('ℹ️ Could not load user permissions:', permissionError);
                }
            }
            
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
                status: userData.status || 'ACTIVE',
                permission_overrides: {}, // Will be calculated after roles load
            });
            
            console.log('✅ User form reset, will calculate overrides after roles load');
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

    // NEW: Filter locations and provinces based on current user's scope
    const filterAvailableLocationsAndProvinces = () => {
        // No filtering for superuser - show all
        if (!currentUser || currentUser.is_superuser) {
            setFilteredLocations(locations);
            setFilteredProvinces(provinces);
            setFilteredUserTypes(userTypes);
            return;
        }

        // National admins can create anywhere
        if (currentUser.user_type === 'NATIONAL_ADMIN') {
            setFilteredLocations(locations);
            setFilteredProvinces(provinces);
            // National admins can create Provincial and Location users, but not System or other National users
            setFilteredUserTypes(userTypes.filter(ut => !['SYSTEM_USER', 'NATIONAL_ADMIN'].includes(ut.value)));
            return;
        }

        // Provincial admins can only create users in their province
        if (currentUser.user_type === 'PROVINCIAL_ADMIN' && currentUser.scope_province) {
            // Filter locations to only show ones in the current user's province
            setFilteredLocations(locations.filter(location => location.province_code === currentUser.scope_province));
            
            // Filter provinces to only show the current user's province
            setFilteredProvinces(provinces.filter(province => province.code === currentUser.scope_province));
            
            // Provincial users can only create Location users
            setFilteredUserTypes(userTypes.filter(ut => ut.value === 'LOCATION_USER'));
            return;
        }

        // Office supervisors can only create users in their own location
        if (currentUser.user_type === 'LOCATION_USER' && currentUser.primary_location_id) {
            // Filter locations to only show the supervisor's location
            setFilteredLocations(locations.filter(location => location.id === currentUser.primary_location_id));
            
            // No province selection needed for office supervisors
            setFilteredProvinces([]);
            
            // Office supervisors can only create Location users
            setFilteredUserTypes(userTypes.filter(ut => ut.value === 'LOCATION_USER'));
            return;
        }

        // Default: no access
        setFilteredLocations([]);
        setFilteredProvinces([]);
        setFilteredUserTypes([]);
    };

    const generateUsername = (): string => {
        switch (watchedUserType) {
            case 'SYSTEM_USER':
                return 'S001';
            case 'NATIONAL_ADMIN':
                return 'N001';
            case 'PROVINCIAL_ADMIN':
                return watchedProvince ? `${watchedProvince}007` : 'T007';
            case 'LOCATION_USER':
                const selectedLocation = locations.find(loc => loc.id === watchedLocation);
                if (selectedLocation) {
                    // location.code already contains the full code (e.g., "F01"), just append user number
                    return `${selectedLocation.code}001`;
                }
                return 'T010001';
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

    const getRolePermissions = (roleId: string): Permission[] => {
        const role = availableRoles.find(r => r.id === roleId);
        console.log('🔍 Getting permissions for role:', role?.display_name, 'Permissions:', role?.permissions?.length || 0);
        if (role && role.permissions) {
            console.log('📋 Role permissions:', role.permissions.map(p => p.name));
            return role.permissions;
        }
        console.log('⚠️ No permissions found for role:', roleId);
        return [];
    };

    const groupPermissionsByCategory = (permissions: Permission[]): { [category: string]: Permission[] } => {
        return permissions.reduce((acc, permission) => {
            const category = permission.category || 'Other';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(permission);
            return acc;
        }, {} as { [category: string]: Permission[] });
    };

    const handlePermissionToggle = (permissionName: string, checked: boolean) => {
        const currentOverrides = form.getValues('permission_overrides') || {};
        const rolePermissions = getRolePermissions(watchedRole || '');
        const isRoleDefault = rolePermissions.some(p => p.name === permissionName);
        
        // Only store as override if it differs from the role default
        if (checked === isRoleDefault) {
            // Remove from overrides if it matches role default
            const newOverrides = { ...currentOverrides };
            delete newOverrides[permissionName];
            form.setValue('permission_overrides', newOverrides);
            console.log(`🔄 Removed override for ${permissionName} (matches role default: ${checked})`);
        } else {
            // Store as override if it differs from role default
            const newOverrides = {
                ...currentOverrides,
                [permissionName]: checked
            };
            form.setValue('permission_overrides', newOverrides);
            console.log(`✏️ Added override for ${permissionName}: ${checked} (role default: ${isRoleDefault})`);
        }
    };

    const isPermissionOverridden = (permissionName: string): boolean => {
        const overrides = form.watch('permission_overrides') || {};
        return overrides.hasOwnProperty(permissionName);
    };

    const getPermissionValue = (permissionName: string, isRoleDefault: boolean): boolean => {
        const overrides = form.watch('permission_overrides') || {};
        if (overrides.hasOwnProperty(permissionName)) {
            return overrides[permissionName];
        }
        return isRoleDefault;
    };

    const prepareFinalPermissions = (roleId: string, overrides: { [key: string]: boolean }) => {
        // Get role default permissions
        const rolePermissions = getRolePermissions(roleId);
        const rolePermissionNames = rolePermissions.map(p => p.name);
        
        // Start with role defaults
        const finalPermissions: { [key: string]: boolean } = {};
        rolePermissionNames.forEach(permissionName => {
            finalPermissions[permissionName] = true; // Role defaults are enabled
        });
        
        // Apply overrides (both enabling non-role permissions and disabling role permissions)
        Object.entries(overrides).forEach(([permissionName, enabled]) => {
            finalPermissions[permissionName] = enabled;
        });
        
        // Convert to array of enabled permission names for backend
        return Object.entries(finalPermissions)
            .filter(([_, enabled]) => enabled)
            .map(([permissionName, _]) => permissionName);
    };

    const handleSubmit = async (data: UserFormData) => {
        try {
            setSubmitLoading(true);
            
            // Get current form values to ensure we have the latest permission overrides
            const currentFormValues = form.getValues();
            console.log('🎯 Current form values:', currentFormValues);
            console.log('🎯 Current permission_overrides from form:', currentFormValues.permission_overrides);
            console.log('🎯 Data permission_overrides:', data.permission_overrides);
            
            // Use the current form values instead of the data parameter
            const actualOverrides = currentFormValues.permission_overrides || {};
            
            // Prepare final permissions (role defaults + overrides)
            let finalPermissionNames: string[] = [];
            if (data.role_id && data.user_type === 'LOCATION_USER') {
                finalPermissionNames = prepareFinalPermissions(data.role_id, actualOverrides);
                console.log('📋 Final permissions for user:', finalPermissionNames);
                console.log('🔧 Permission overrides being sent:', actualOverrides);
                console.log('🔧 Number of overrides:', Object.keys(actualOverrides).length);
            }
            
            const payload = {
                ...data,
                // Add auto-generated username and password
                username: generateUsername(),
                password: generatedPassword,
                confirm_password: generatedPassword,
                // Convert single role to array for backend compatibility
                role_ids: data.role_id ? [data.role_id] : [],
                // Add final computed permissions for LOCATION_USER
                permission_names: data.user_type === 'LOCATION_USER' ? finalPermissionNames : undefined,
                // Keep permission_overrides for audit/tracking purposes (use actual overrides)
                permission_overrides: actualOverrides,
                // Remove the single role_id field
                role_id: undefined,
                // Remove primary_location_id for non-location users to avoid UUID validation error
                primary_location_id: data.user_type === 'LOCATION_USER' ? data.primary_location_id : undefined,
            };
            
            console.log('🚀 Full payload being sent to backend:', JSON.stringify(payload, null, 2));
            
            // Build URL with query parameters for create mode
            let url = mode === 'create' 
                ? `${API_BASE_URL}/api/v1/users/`
                : `${API_BASE_URL}/api/v1/users/${userId}`;
                
            // Add query parameters for LOCATION_USER and PROVINCIAL_ADMIN creation
            if (mode === 'create') {
                const queryParams = new URLSearchParams();
                
                if (data.user_type === 'LOCATION_USER' && data.primary_location_id) {
                    queryParams.append('location_id', data.primary_location_id);
                }
                
                if (data.user_type === 'PROVINCIAL_ADMIN' && data.scope_province) {
                    queryParams.append('province_code', data.scope_province);
                }
                
                if (queryParams.toString()) {
                    url += `?${queryParams.toString()}`;
                }
            }
                
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
        <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
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
                                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
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
                                
                                <Grid item xs={12} md={8}>
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
                                            {watchedUserType === 'SYSTEM_USER' && 'Format: S{Number}'}
                                            {watchedUserType === 'NATIONAL_ADMIN' && 'Format: N{Number}'}
                                            {watchedUserType === 'PROVINCIAL_ADMIN' && 'Format: {ProvinceCode}{Number}'}
                                            {watchedUserType === 'LOCATION_USER' && 'Format: {ProvinceCode}{OfficeNumber}{UserNumber}'}
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
                                                {filteredUserTypes.map((userType) => (
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
                                                    {filteredLocations.map((location) => (
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
                            
                            {watchedUserType === 'PROVINCIAL_ADMIN' && (
                                <Grid item xs={12} md={8}>
                                    <Controller
                                        name="scope_province"
                                        control={form.control}
                                        render={({ field }) => (
                                            <FormControl fullWidth>
                                                <InputLabel>Province Scope *</InputLabel>
                                                <Select {...field} label="Province Scope *">
                                                    {filteredProvinces.map((province) => (
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
                            
                            {(watchedUserType === 'SYSTEM_USER' || watchedUserType === 'NATIONAL_ADMIN') && (
                                <Grid item xs={12} md={8}>
                                    <Alert severity="info">
                                        {watchedUserType === 'SYSTEM_USER' ? 'System users have full administrative access across the entire system.' : 'National admins have system-wide access across all provinces and locations.'}
                                    </Alert>
                                </Grid>
                            )}
                        </Grid>
                    </CardContent>
                </Card>

                {/* User Status - Only for edit mode */}
                {mode === 'edit' && (
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CheckCircleIcon color="primary" />
                                User Status
                            </Typography>
                            
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <Controller
                                        name="status"
                                        control={form.control}
                                        render={({ field }) => (
                                            <FormControl fullWidth>
                                                <InputLabel>Status</InputLabel>
                                                <Select {...field} label="Status">
                                                    {userStatuses.map((status) => (
                                                        <MenuItem key={status.value} value={status.value}>
                                                            {status.label}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                                <FormHelperText>User account status</FormHelperText>
                                            </FormControl>
                                        )}
                                    />
                                </Grid>
                                
                                <Grid item xs={12} md={6}>
                                    <Alert severity="info">
                                        <strong>Active:</strong> User can log in and access the system.<br/>
                                        <strong>Inactive:</strong> User cannot log in but account is preserved.<br/>
                                        <strong>Suspended:</strong> Temporarily blocked access.<br/>
                                        <strong>Locked:</strong> Account locked due to security issues.
                                    </Alert>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                )}

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

                {/* System/Provincial/National Role Info */}
                {(['SYSTEM_USER', 'PROVINCIAL_ADMIN', 'NATIONAL_ADMIN'].includes(watchedUserType)) && (
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SecurityIcon color="primary" />
                                Access Permissions
                            </Typography>
                            
                            <Alert severity="info">
                                <Typography variant="body1" gutterBottom>
                                    <strong>
                                        {watchedUserType === 'SYSTEM_USER' && 'System User'}
                                        {watchedUserType === 'NATIONAL_ADMIN' && 'National Admin'}
                                        {watchedUserType === 'PROVINCIAL_ADMIN' && 'Provincial Admin'}
                                    </strong> accounts have inherent permissions based on their user type:
                                </Typography>
                                <ul>
                                    <li>No specific role assignment required</li>
                                    <li>
                                        {watchedUserType === 'SYSTEM_USER' && 'Full system administrative access'}
                                        {watchedUserType === 'NATIONAL_ADMIN' && 'System-wide administrative access'}  
                                        {watchedUserType === 'PROVINCIAL_ADMIN' && 'Province-wide oversight capabilities'}
                                    </li>
                                    <li>Automatic access to appropriate management functions</li>
                                </ul>
                            </Alert>
                        </CardContent>
                    </Card>
                )}

                {/* Permission Information for non-privileged users */}
                {watchedRole && !canManagePermissions && (
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SecurityIcon color="primary" />
                                Role Permissions
                            </Typography>
                            
                            <Alert severity="info" sx={{ mb: 2 }}>
                                This user will receive the default permissions from the selected role. 
                                Permission overrides can only be managed by System Administrators, National Administrators, or Provincial Administrators.
                            </Alert>
                            
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Default permissions from role: {getRoleDefaultPermissions(watchedRole).length} permissions
                            </Typography>
                        </CardContent>
                    </Card>
                )}

                {/* Individual Permission Overrides - Only for System/National/Provincial Admins */}
                {watchedRole && canManagePermissions && (
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SecurityIcon color="primary" />
                                Individual Permission Overrides
                            </Typography>
                            
                            <Alert severity="info" sx={{ mb: 2 }}>
                                The selected role provides default permissions. You can override specific permissions here if needed.
                                <strong> Green checkmarks</strong> = role defaults, <strong>modified permissions</strong> will be highlighted.
                            </Alert>
                            
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Default permissions from role: {getRoleDefaultPermissions(watchedRole).length} permissions
                            </Typography>
                            
                            {(() => {
                                const rolePermissions = getRolePermissions(watchedRole);
                                const allAvailablePermissions = allPermissions;
                                const groupedRolePermissions = groupPermissionsByCategory(rolePermissions);
                                const groupedAllPermissions = groupPermissionsByCategory(allAvailablePermissions);
                                
                                return (
                                    <Box sx={{ mt: 2 }}>
                                        {Object.entries(groupedAllPermissions).map(([category, categoryPermissions]) => {
                                            const hasRolePermissionsInCategory = categoryPermissions.some(p => 
                                                rolePermissions.some(rp => rp.name === p.name)
                                            );
                                            
                                            return (
                                                <Accordion key={category} sx={{ mb: 1 }}>
                                                    <AccordionSummary 
                                                        expandIcon={<ExpandMoreIcon />}
                                                        sx={{ 
                                                            bgcolor: hasRolePermissionsInCategory ? 'primary.50' : 'grey.50',
                                                            '&:hover': { bgcolor: hasRolePermissionsInCategory ? 'primary.100' : 'grey.100' }
                                                        }}
                                                    >
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                                {category.charAt(0).toUpperCase() + category.slice(1)}
                                                            </Typography>
                                                            <Chip 
                                                                label={`${categoryPermissions.filter(p => 
                                                                    rolePermissions.some(rp => rp.name === p.name)
                                                                ).length}/${categoryPermissions.length}`}
                                                                size="small"
                                                                color={hasRolePermissionsInCategory ? "primary" : "default"}
                                                            />
                                                            {hasRolePermissionsInCategory && (
                                                                <CheckCircleIcon color="primary" fontSize="small" />
                                                            )}
                                                        </Box>
                                                    </AccordionSummary>
                                                    <AccordionDetails>
                                                        <Grid container spacing={1}>
                                                            {categoryPermissions.map((permission) => {
                                                                const isRoleDefault = rolePermissions.some(rp => rp.name === permission.name);
                                                                const isOverridden = isPermissionOverridden(permission.name);
                                                                const currentValue = getPermissionValue(permission.name, isRoleDefault);
                                                                
                                                                return (
                                                                    <Grid item xs={12} sm={6} md={4} key={permission.name}>
                                                                        <Box 
                                                                            sx={{ 
                                                                                p: 1.5, 
                                                                                border: '1px solid', 
                                                                                borderColor: isOverridden ? 'warning.main' : 'divider',
                                                                                borderRadius: 1,
                                                                                bgcolor: isOverridden ? 'warning.50' : 'background.paper',
                                                                                transition: 'all 0.2s ease'
                                                                            }}
                                                                        >
                                                                            <FormControlLabel
                                                                                control={
                                                                                    <Checkbox
                                                                                        checked={currentValue}
                                                                                        onChange={(e) => handlePermissionToggle(permission.name, e.target.checked)}
                                                                                        color={isRoleDefault ? "success" : "primary"}
                                                                                        icon={isRoleDefault ? <LockOpenIcon /> : <LockIcon />}
                                                                                        checkedIcon={isRoleDefault ? <CheckCircleIcon /> : <CheckCircleIcon />}
                                                                                    />
                                                                                }
                                                                                label={
                                                                                    <Box>
                                                                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                                                            {permission.display_name}
                                                                                        </Typography>
                                                                                        <Typography variant="caption" color="text.secondary">
                                                                                            {permission.description}
                                                                                        </Typography>
                                                                                        {isRoleDefault && (
                                                                                            <Chip 
                                                                                                label="Role Default" 
                                                                                                size="small" 
                                                                                                color="success" 
                                                                                                sx={{ ml: 1, height: 16, fontSize: '0.6rem' }}
                                                                                            />
                                                                                        )}
                                                                                        {isOverridden && (
                                                                                            <Chip 
                                                                                                label="Modified" 
                                                                                                size="small" 
                                                                                                color="warning" 
                                                                                                sx={{ ml: 1, height: 16, fontSize: '0.6rem' }}
                                                                                            />
                                                                                        )}
                                                                                    </Box>
                                                                                }
                                                                                sx={{ alignItems: 'flex-start', m: 0 }}
                                                                            />
                                                                        </Box>
                                                                    </Grid>
                                                                );
                                                            })}
                                                        </Grid>
                                                    </AccordionDetails>
                                                </Accordion>
                                            );
                                        })}
                                        
                                        {/* Permission Override Summary */}
                                        <Box sx={{ mt: 2, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                                            <Typography variant="subtitle2" gutterBottom>
                                                Permission Override Summary:
                                            </Typography>
                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={4}>
                                                    <Typography variant="body2">
                                                        <strong>Role Permissions:</strong> {getRoleDefaultPermissions(watchedRole).length}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={4}>
                                                    <Typography variant="body2">
                                                        <strong>Overrides:</strong> {Object.keys(form.watch('permission_overrides') || {}).length}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={12} sm={4}>
                                                    <Typography variant="body2">
                                                        <strong>Total Permissions:</strong> {allPermissions.length}
                                                    </Typography>
                                                </Grid>
                                            </Grid>
                                        </Box>
                                    </Box>
                                );
                            })()}
                        </CardContent>
                    </Card>
                )}

            </form>

            {/* Navigation Buttons - Matching PersonFormWrapper Style */}
            <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    {onCancel && (
                        <Button 
                            variant="outlined" 
                            onClick={onCancel}
                            disabled={submitLoading}
                        >
                            Cancel
                        </Button>
                    )}
                    
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={submitLoading}
                            startIcon={<PersonAddIcon />}
                            sx={{ minWidth: 120 }}
                            onClick={form.handleSubmit(handleSubmit)}
                        >
                            {submitLoading ? 'Processing...' : mode === 'create' ? 'Create User' : 'Update User'}
                        </Button>
                    </Box>
                </Box>
            </Paper>

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