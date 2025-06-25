/**
 * LocationFormWrapper - Reusable Location Form Component
 * Handles location creation/editing with context-aware navigation
 * Multi-step form for Madagascar office locations
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
    Stepper,
    Step,
    StepLabel,
    Card,
    CardContent,
    FormControlLabel,
    Switch,
    IconButton,
    InputAdornment,
    Chip,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    LocationOn as LocationIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Clear as ClearIcon,
    ArrowForward as ArrowForwardIcon,
    ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useSearchParams } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS, api } from '../config/api';
import lookupService, { 
    OfficeType, 
    EquipmentStatus, 
    Province 
} from '../services/lookupService';

// Types for Madagascar location management
interface LocationForm {
    // Basic Information
    location_code: string;
    location_name: string;
    location_address: string;
    province_code: string;
    office_type: string;

    // Capacity and Operations
    max_capacity: number;
    current_capacity: number;
    operational_hours: string;

    // Contact Information
    contact_phone: string;
    contact_email: string;

    // Equipment and Status
    equipment_status: string;
    is_operational: boolean;

    // Optional Fields
    notes?: string;
}

interface ExistingLocation {
    id: string;
    location_code: string;
    location_name: string;
    location_address: string;
    province_code: string;
    office_type: string;
    max_capacity: number;
    current_capacity: number;
    operational_hours: string;
    contact_phone: string;
    contact_email: string;
    equipment_status: string;
    is_operational: boolean;
    notes?: string;
    created_at: string;
    updated_at: string;
}

// Validation schema
const locationSchema = yup.object({
    location_code: yup.string().required('Location code is required').max(10),
    location_name: yup.string().required('Location name is required').max(100),
    location_address: yup.string().required('Address is required').max(255),
    province_code: yup.string().required('Province is required'),
    office_type: yup.string().required('Office type is required'),
    max_capacity: yup.number().required('Maximum capacity is required').min(1).max(1000),
    current_capacity: yup.number().required('Current capacity is required').min(0),
    operational_hours: yup.string().max(100),
    contact_phone: yup.string().max(20),
    contact_email: yup.string().email('Invalid email format').max(100),
    equipment_status: yup.string().required('Equipment status is required'),
    notes: yup.string().max(500),
});

const steps = [
    'Basic Information',
    'Address & Province',
    'Capacity & Operations',
    'Contact Details',
    'Review & Submit',
];

// Props interface for LocationFormWrapper
interface LocationFormWrapperProps {
    mode?: 'standalone' | 'modal' | 'embedded';
    onComplete?: (location: any) => void;
    onCancel?: () => void;
    onSuccess?: (location: any, isEdit: boolean) => void;
    initialLocationId?: string;
    title?: string;
    subtitle?: string;
    showHeader?: boolean;
    skipToStep?: number;
}

const LocationFormWrapper: React.FC<LocationFormWrapperProps> = ({
    mode = 'standalone',
    onComplete,
    onCancel,
    onSuccess,
    initialLocationId,
    title = "Location Management",
    subtitle = "Manage Madagascar driver's license office locations.",
    showHeader = true,
    skipToStep = 0,
}) => {
    // Auth
    const { user, hasPermission, accessToken } = useAuth();

    // URL parameters for editing
    const [searchParams] = useSearchParams();

    // State management
    const [currentStep, setCurrentStep] = useState(skipToStep);
    const [locationFound, setLocationFound] = useState<ExistingLocation | null>(null);
    const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [stepValidation, setStepValidation] = useState<boolean[]>(new Array(steps.length).fill(false));
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [createdLocation, setCreatedLocation] = useState<any>(null);

    // Lookup data state
    const [officeTypes, setOfficeTypes] = useState<OfficeType[]>([]);
    const [equipmentStatuses, setEquipmentStatuses] = useState<EquipmentStatus[]>([]);
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [lookupsLoading, setLookupsLoading] = useState(true);

    // Main location form
    const locationForm = useForm<LocationForm>({
        resolver: yupResolver(locationSchema),
        defaultValues: {
            location_code: '',
            location_name: '',
            location_address: '',
            province_code: '',
            office_type: '',
            max_capacity: 50,
            current_capacity: 0,
            operational_hours: 'Monday - Friday: 08:00 - 17:00',
            contact_phone: '',
            contact_email: '',
            equipment_status: '',
            is_operational: true,
            notes: '',
        },
    });

    // Load lookup data on component mount
    useEffect(() => {
        const loadLookupData = async () => {
            try {
                setLookupsLoading(true);
                const [officeTypesRes, equipmentStatusesRes, provincesRes] = await Promise.all([
                    lookupService.getOfficeTypes(),
                    lookupService.getEquipmentStatuses(),
                    lookupService.getProvinces()
                ]);
                
                setOfficeTypes(officeTypesRes);
                setEquipmentStatuses(equipmentStatusesRes);
                setProvinces(provincesRes);
                
                console.log('✅ Location lookup data loaded successfully');
            } catch (error) {
                console.error('❌ Failed to load location lookup data:', error);
            } finally {
                setLookupsLoading(false);
            }
        };

        loadLookupData();
    }, []);

    // Update form defaults after lookup data is loaded
    useEffect(() => {
        if (!lookupsLoading && 
            officeTypes.length > 0 && 
            equipmentStatuses.length > 0 && 
            provinces.length > 0 &&
            !isEditMode &&
            !locationFound
        ) {
            // Set first option from each enum as default
            locationForm.setValue('office_type', officeTypes[0].value);
            locationForm.setValue('equipment_status', equipmentStatuses[0].value);
            locationForm.setValue('province_code', provinces[0].code);
        }
    }, [lookupsLoading, officeTypes, equipmentStatuses, provinces, isEditMode, locationFound, locationForm]);

    // Handle URL parameters for editing and initialLocationId prop
    useEffect(() => {
        const editLocationId = searchParams.get('edit') || initialLocationId;
        if (editLocationId && accessToken) {
            fetchLocationForEditing(editLocationId);
        }
    }, [searchParams, initialLocationId, accessToken]);

    // Fetch existing location for editing
    const fetchLocationForEditing = async (locationId: string) => {
        try {
            const response = await api.get(API_ENDPOINTS.locationById(locationId));
            console.log('Fetched location for editing:', response);

            const locationData = response as ExistingLocation;
            setLocationFound(locationData);
            setCurrentLocationId(locationId);
            setIsEditMode(true);

            // Populate form with existing data
            populateFormWithExistingLocation(locationData);

            // Mark all steps as valid since we have existing data
            setStepValidation(new Array(steps.length).fill(true));

        } catch (error) {
            console.error('Failed to fetch location for editing:', error);
            alert(`Failed to load location for editing: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const populateFormWithExistingLocation = (existingLocation: ExistingLocation) => {
        console.log('Populating form with existing location:', existingLocation);

        // Populate all form fields
        locationForm.setValue('location_code', existingLocation.location_code || '');
        locationForm.setValue('location_name', existingLocation.location_name || '');
        locationForm.setValue('location_address', existingLocation.location_address || '');
        locationForm.setValue('province_code', existingLocation.province_code || '');
        locationForm.setValue('office_type', existingLocation.office_type || '');
        locationForm.setValue('max_capacity', existingLocation.max_capacity || 50);
        locationForm.setValue('current_capacity', existingLocation.current_capacity || 0);
        locationForm.setValue('operational_hours', existingLocation.operational_hours || '');
        locationForm.setValue('contact_phone', existingLocation.contact_phone || '');
        locationForm.setValue('contact_email', existingLocation.contact_email || '');
        locationForm.setValue('equipment_status', existingLocation.equipment_status || '');
        locationForm.setValue('is_operational', existingLocation.is_operational);
        locationForm.setValue('notes', existingLocation.notes || '');
    };

    // Context-aware completion handler
    const handleFormComplete = (location: any) => {
        setCreatedLocation(location);
        
        if (onSuccess) {
            onSuccess(location, isEditMode);
            return;
        }
        
        switch (mode) {
            case 'standalone':
                setShowSuccessDialog(true);
                break;
            case 'modal':
            case 'embedded':
                if (onComplete) {
                    onComplete(location);
                }
                break;
        }
    };

    // Context-aware cancel handler
    const handleFormCancel = () => {
        switch (mode) {
            case 'standalone':
                resetForm();
                break;
            case 'modal':
            case 'embedded':
                if (onCancel) {
                    onCancel();
                }
                break;
        }
    };

    // Step validation
    const markStepValid = (stepIndex: number, isValid: boolean) => {
        const newValidation = [...stepValidation];
        newValidation[stepIndex] = isValid;
        setStepValidation(newValidation);
    };

    const validateCurrentStep = async () => {
        try {
            const stepFields = getStepFields(currentStep);
            
            if (stepFields.length > 0) {
                const isValid = await locationForm.trigger(stepFields as any);
                markStepValid(currentStep, isValid);
                return isValid;
            } else {
                markStepValid(currentStep, true);
                return true;
            }
        } catch (error) {
            console.error('Validation error:', error);
            markStepValid(currentStep, false);
            return false;
        }
    };

    const getStepFields = (step: number) => {
        const stepFieldMap = [
            ['location_code', 'location_name', 'office_type'], // Basic Information
            ['location_address', 'province_code'], // Address & Province
            ['max_capacity', 'current_capacity', 'equipment_status'], // Capacity & Operations
            [], // Contact Details (optional)
            [], // Review
        ];
        return stepFieldMap[step] || [];
    };

    const handleNext = async () => {
        const isValid = await validateCurrentStep();

        if (isValid && currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleStepClick = (stepIndex: number) => {
        // Allow navigation to previous steps or completed steps
        if (stepIndex < currentStep || stepValidation[stepIndex]) {
            setCurrentStep(stepIndex);
        }
    };

    const handleSubmit = async () => {
        setSubmitLoading(true);

        try {
            const formData = locationForm.getValues();
            console.log('Raw form data:', formData);

            // Transform form data to match backend schema
            const locationPayload = {
                location_code: formData.location_code?.toUpperCase() || '',
                location_name: formData.location_name?.toUpperCase() || '',
                location_address: formData.location_address?.toUpperCase() || '',
                province_code: formData.province_code?.toUpperCase() || '',
                office_type: formData.office_type?.toUpperCase() || '',
                max_capacity: formData.max_capacity || 50,
                current_capacity: formData.current_capacity || 0,
                operational_hours: formData.operational_hours || '',
                contact_phone: formData.contact_phone || '',
                contact_email: formData.contact_email?.toUpperCase() || '',
                equipment_status: formData.equipment_status?.toUpperCase() || '',
                is_operational: formData.is_operational,
                notes: formData.notes?.toUpperCase() || '',
            };

            console.log('Transformed location payload:', locationPayload);

            if (isEditMode && currentLocationId) {
                // Update existing location
                console.log('Updating existing location:', currentLocationId);
                const response = await api.put(API_ENDPOINTS.locationById(currentLocationId), locationPayload);
                console.log('Location updated successfully:', response);
                setCreatedLocation(response);
                handleFormComplete(response);
            } else {
                // Create new location
                console.log('Creating new location');
                const response = await api.post(API_ENDPOINTS.locations, locationPayload);
                console.log('Location created successfully:', response);
                setCreatedLocation(response);
                handleFormComplete(response);
            }

        } catch (error) {
            console.error('Submit failed:', error);
            alert(`Failed to ${isEditMode ? 'update' : 'create'} location: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setSubmitLoading(false);
        }
    };

    const resetForm = () => {
        setCurrentStep(0);
        setLocationFound(null);
        setCurrentLocationId(null);
        setIsEditMode(false);
        setStepValidation(new Array(steps.length).fill(false));
        setShowSuccessDialog(false);
        setCreatedLocation(null);
        locationForm.reset();
    };

    // Render step content
    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return renderBasicInformationStep();
            case 1:
                return renderAddressProvinceStep();
            case 2:
                return renderCapacityOperationsStep();
            case 3:
                return renderContactDetailsStep();
            case 4:
                return renderReviewStep();
            default:
                return null;
        }
    };

    const renderBasicInformationStep = () => (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Basic Information
                </Typography>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Controller
                            name="location_code"
                            control={locationForm.control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    label="Location Code *"
                                    error={!!locationForm.formState.errors.location_code}
                                    helperText={locationForm.formState.errors.location_code?.message || 'Unique location identifier (e.g., T01, A02)'}
                                    inputProps={{ maxLength: 10 }}
                                    onChange={(e) => {
                                        const value = e.target.value.toUpperCase();
                                        field.onChange(value);
                                    }}
                                />
                            )}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Controller
                            name="office_type"
                            control={locationForm.control}
                            render={({ field }) => (
                                <FormControl fullWidth error={!!locationForm.formState.errors.office_type}>
                                    <InputLabel>Office Type *</InputLabel>
                                    <Select {...field} label="Office Type *">
                                        {officeTypes.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    <FormHelperText>
                                        {locationForm.formState.errors.office_type?.message || 'Type of office location'}
                                    </FormHelperText>
                                </FormControl>
                            )}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Controller
                            name="location_name"
                            control={locationForm.control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    label="Location Name *"
                                    error={!!locationForm.formState.errors.location_name}
                                    helperText={locationForm.formState.errors.location_name?.message || 'Full name of the location'}
                                    inputProps={{ maxLength: 100 }}
                                    onChange={(e) => {
                                        const value = e.target.value.toUpperCase();
                                        field.onChange(value);
                                    }}
                                />
                            )}
                        />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );

    const renderAddressProvinceStep = () => (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Address & Province
                </Typography>

                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Controller
                            name="location_address"
                            control={locationForm.control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    multiline
                                    rows={3}
                                    label="Location Address *"
                                    error={!!locationForm.formState.errors.location_address}
                                    helperText={locationForm.formState.errors.location_address?.message || 'Complete address of the location'}
                                    inputProps={{ maxLength: 255 }}
                                    onChange={(e) => {
                                        const value = e.target.value.toUpperCase();
                                        field.onChange(value);
                                    }}
                                />
                            )}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Controller
                            name="province_code"
                            control={locationForm.control}
                            render={({ field }) => (
                                <FormControl fullWidth error={!!locationForm.formState.errors.province_code}>
                                    <InputLabel>Province *</InputLabel>
                                    <Select {...field} label="Province *">
                                        {provinces.map((option) => (
                                            <MenuItem key={option.code} value={option.code}>
                                                {option.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    <FormHelperText>
                                        {locationForm.formState.errors.province_code?.message || 'Madagascar province/region'}
                                    </FormHelperText>
                                </FormControl>
                            )}
                        />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );

    const renderCapacityOperationsStep = () => (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Capacity & Operations
                </Typography>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Controller
                            name="max_capacity"
                            control={locationForm.control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    type="number"
                                    label="Maximum Capacity *"
                                    error={!!locationForm.formState.errors.max_capacity}
                                    helperText={locationForm.formState.errors.max_capacity?.message || 'Maximum daily processing capacity'}
                                    inputProps={{ min: 1, max: 1000 }}
                                />
                            )}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Controller
                            name="current_capacity"
                            control={locationForm.control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    type="number"
                                    label="Current Capacity *"
                                    error={!!locationForm.formState.errors.current_capacity}
                                    helperText={locationForm.formState.errors.current_capacity?.message || 'Current daily usage'}
                                    inputProps={{ min: 0 }}
                                />
                            )}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Controller
                            name="equipment_status"
                            control={locationForm.control}
                            render={({ field }) => (
                                <FormControl fullWidth error={!!locationForm.formState.errors.equipment_status}>
                                    <InputLabel>Equipment Status *</InputLabel>
                                    <Select {...field} label="Equipment Status *">
                                        {equipmentStatuses.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    <FormHelperText>
                                        {locationForm.formState.errors.equipment_status?.message || 'Current equipment status'}
                                    </FormHelperText>
                                </FormControl>
                            )}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Controller
                            name="is_operational"
                            control={locationForm.control}
                            render={({ field }) => (
                                <FormControlLabel
                                    control={<Switch {...field} checked={field.value} />}
                                    label="Location is Operational"
                                    sx={{ mt: 2 }}
                                />
                            )}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Controller
                            name="operational_hours"
                            control={locationForm.control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    label="Operational Hours"
                                    placeholder="Monday - Friday: 08:00 - 17:00"
                                    helperText="Operating hours for this location"
                                    inputProps={{ maxLength: 100 }}
                                />
                            )}
                        />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );

    const renderContactDetailsStep = () => (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Contact Details
                </Typography>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Controller
                            name="contact_phone"
                            control={locationForm.control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    label="Contact Phone"
                                    helperText="Phone number for this location"
                                    inputProps={{ maxLength: 20 }}
                                />
                            )}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Controller
                            name="contact_email"
                            control={locationForm.control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    type="email"
                                    label="Contact Email"
                                    error={!!locationForm.formState.errors.contact_email}
                                    helperText={locationForm.formState.errors.contact_email?.message || 'Email address for this location'}
                                    inputProps={{ maxLength: 100 }}
                                    onChange={(e) => {
                                        const value = e.target.value.toUpperCase();
                                        field.onChange(value);
                                    }}
                                />
                            )}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Controller
                            name="notes"
                            control={locationForm.control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    fullWidth
                                    multiline
                                    rows={4}
                                    label="Notes"
                                    placeholder="Additional information about this location..."
                                    helperText="Optional notes or special instructions"
                                    inputProps={{ maxLength: 500 }}
                                    onChange={(e) => {
                                        const value = e.target.value.toUpperCase();
                                        field.onChange(value);
                                    }}
                                />
                            )}
                        />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );

    const renderReviewStep = () => {
        const formData = locationForm.getValues();

        return (
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Review & Submit
                    </Typography>

                    <Alert severity="info" sx={{ mb: 3 }}>
                        Please review all information before {isEditMode ? 'updating' : 'creating'} the location record.
                    </Alert>

                    {/* Basic Information Summary */}
                    <Box sx={{ mb: 4, p: 3, border: '1px solid #e0e0e0', borderRadius: 2, backgroundColor: '#fafafa' }}>
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                            Basic Information
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2" color="text.secondary">Location Name</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {formData.location_name}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Typography variant="subtitle2" color="text.secondary">Location Code</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {formData.location_code}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Typography variant="subtitle2" color="text.secondary">Office Type</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {officeTypes.find(t => t.value === formData.office_type)?.label || formData.office_type}
                                </Typography>
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Address Summary */}
                    <Box sx={{ mb: 4, p: 3, border: '1px solid #e0e0e0', borderRadius: 2, backgroundColor: '#fafafa' }}>
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                            Address & Location
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid item xs={12} md={8}>
                                <Typography variant="subtitle2" color="text.secondary">Address</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {formData.location_address}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Typography variant="subtitle2" color="text.secondary">Province</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {provinces.find(p => p.code === formData.province_code)?.name || formData.province_code}
                                </Typography>
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Operations Summary */}
                    <Box sx={{ mb: 4, p: 3, border: '1px solid #e0e0e0', borderRadius: 2, backgroundColor: '#fafafa' }}>
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                            Operations & Capacity
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                                <Typography variant="subtitle2" color="text.secondary">Capacity</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {formData.current_capacity} / {formData.max_capacity}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Typography variant="subtitle2" color="text.secondary">Equipment Status</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {equipmentStatuses.find(e => e.value === formData.equipment_status)?.label || formData.equipment_status}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                                <Chip
                                    label={formData.is_operational ? 'Operational' : 'Closed'}
                                    color={formData.is_operational ? 'success' : 'error'}
                                    size="small"
                                />
                            </Grid>
                            {formData.operational_hours && (
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary">Operating Hours</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                        {formData.operational_hours}
                                    </Typography>
                                </Grid>
                            )}
                        </Grid>
                    </Box>

                    {/* Contact Information */}
                    {(formData.contact_phone || formData.contact_email) && (
                        <Box sx={{ mb: 4, p: 3, border: '1px solid #e0e0e0', borderRadius: 2, backgroundColor: '#fafafa' }}>
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                                Contact Information
                            </Typography>

                            <Grid container spacing={2}>
                                {formData.contact_phone && (
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                            {formData.contact_phone}
                                        </Typography>
                                    </Grid>
                                )}
                                {formData.contact_email && (
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                            {formData.contact_email}
                                        </Typography>
                                    </Grid>
                                )}
                            </Grid>
                        </Box>
                    )}

                    {formData.notes && (
                        <Box sx={{ mb: 4, p: 3, border: '1px solid #e0e0e0', borderRadius: 2, backgroundColor: '#fafafa' }}>
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                                Notes
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                {formData.notes}
                            </Typography>
                        </Box>
                    )}

                    <Alert severity="success" sx={{ mt: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            Ready to {isEditMode ? 'Update' : 'Create'} Location
                        </Typography>
                        <Typography variant="body2">
                            All required information has been provided and validated.
                        </Typography>
                    </Alert>
                </CardContent>
            </Card>
        );
    };

    // Check permissions
    if (!hasPermission('locations.create') && !isEditMode) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">
                    You don't have permission to create locations. Contact your administrator.
                </Alert>
            </Box>
        );
    }

    if (!hasPermission('locations.update') && isEditMode) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">
                    You don't have permission to edit locations. Contact your administrator.
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: mode === 'embedded' ? 0 : 3 }}>
            {showHeader && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h4" component="h1">
                            {title}
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {mode === 'standalone' && (
                                <Button
                                    variant="outlined"
                                    onClick={resetForm}
                                    startIcon={<ClearIcon />}
                                >
                                    Start Over
                                </Button>
                            )}
                            {(mode === 'modal' || mode === 'embedded') && onCancel && (
                                <Button
                                    variant="outlined"
                                    onClick={handleFormCancel}
                                >
                                    Cancel
                                </Button>
                            )}
                        </Box>
                    </Box>

                    <Typography variant="body1" color="text.secondary" gutterBottom>
                        {subtitle}
                    </Typography>
                </>
            )}

            {/* Stepper */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Stepper activeStep={currentStep} alternativeLabel>
                    {steps.map((label, index) => {
                        const canNavigate = index < currentStep || stepValidation[index];
                        return (
                            <Step key={label} completed={stepValidation[index]}>
                                <StepLabel
                                    onClick={() => canNavigate && handleStepClick(index)}
                                    sx={{
                                        cursor: canNavigate ? 'pointer' : 'default',
                                        '&:hover': canNavigate ? { opacity: 0.8 } : {},
                                    }}
                                >
                                    {label}
                                </StepLabel>
                            </Step>
                        );
                    })}
                </Stepper>
            </Paper>

            {/* Step Content */}
            <Box sx={{ mb: 3 }}>
                {renderStepContent()}
            </Box>

            {/* Navigation */}
            <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Button
                        disabled={currentStep === 0}
                        onClick={handleBack}
                    >
                        Back
                    </Button>

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        {currentStep < steps.length - 1 ? (
                            <Button
                                variant="contained"
                                onClick={handleNext}
                            >
                                Next
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                onClick={handleSubmit}
                                disabled={submitLoading}
                                startIcon={<LocationIcon />}
                            >
                                {submitLoading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Location' : 'Create Location')}
                            </Button>
                        )}
                    </Box>
                </Box>
            </Paper>

            {/* Success Dialog */}
            <Dialog
                open={showSuccessDialog}
                onClose={() => setShowSuccessDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ bgcolor: 'success.main', color: 'white' }}>
                    <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationIcon />
                        {isEditMode ? 'Location Updated Successfully!' : 'Location Created Successfully!'}
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    {createdLocation && (
                        <Box>
                            <Typography variant="body1" gutterBottom>
                                <strong>{createdLocation.location_name}</strong> has been successfully {isEditMode ? 'updated' : 'created'} in the system.
                            </Typography>

                            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <Typography variant="subtitle2" color="text.secondary">Location Code:</Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                                    {createdLocation.location_code}
                                </Typography>
                            </Box>

                            <Alert severity="success" sx={{ mt: 2 }}>
                                The location is now available for user assignments and system operations.
                            </Alert>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3, gap: 1 }}>
                    <Button
                        onClick={() => {
                            setShowSuccessDialog(false);
                            // Don't reset form, let user choose
                        }}
                        variant="outlined"
                    >
                        Continue Editing
                    </Button>
                    <Button
                        onClick={() => {
                            setShowSuccessDialog(false);
                            resetForm();
                        }}
                        variant="contained"
                        startIcon={<AddIcon />}
                    >
                        Create Another Location
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default LocationFormWrapper; 