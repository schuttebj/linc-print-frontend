/**
 * LocationFormWrapper - Enhanced Location Form Component  
 * Handles location creation/editing with structured addresses and operational schedules
 * Multi-step form for Madagascar office locations with 1400px styling
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
    Checkbox,
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
    Schedule as ScheduleIcon,
    Home as HomeIcon,
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useSearchParams } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS, api } from '../config/api';
import lookupService, { 
    OfficeType, 
    Province 
} from '../services/lookupService';

// Types for Madagascar location management
interface DaySchedule {
    day: string;
    is_open: boolean;
    open_time: string;
    close_time: string;
}

interface LocationAddress {
    street_line1: string;
    street_line2?: string;
    locality: string;
    postal_code: string;
    town: string;
    province_code: string;
}

interface LocationForm {
    // Basic Information
    location_code: string;
    location_name: string;
    office_type: string;
    province_code: string; // Moved to basic info for code generation

    // Address Information (structured like person addresses)
    address: LocationAddress;

    // Capacity and Operations
    max_capacity: number;
    current_capacity: number;
    
    // Operational Hours (structured by day)
    operational_schedule: DaySchedule[];

    // Contact Information
    contact_phone: string;
    contact_email: string;

    // Status
    is_operational: boolean;

    // Optional Fields
    notes?: string;
}

interface ExistingLocation {
    id: string;
    location_code: string;
    location_name: string;
    location_address?: string; // Legacy field
    address?: LocationAddress; // New structured address
    province_code?: string; // Legacy field
    office_type: string;
    max_capacity: number;
    current_capacity: number;
    operational_hours?: string; // Legacy field
    operational_schedule?: DaySchedule[]; // New structured schedule
    contact_phone: string;
    contact_email: string;
    is_operational: boolean;
    notes?: string;
    created_at: string;
    updated_at: string;
}

// Time options in 15-minute increments
const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            times.push(timeString);
        }
    }
    return times;
};

const TIME_OPTIONS = generateTimeOptions();

// Enhanced validation schema
const locationSchema = yup.object({
    location_code: yup.string().required('Location code is required').max(10),
    location_name: yup.string().required('Location name is required').max(100),
    office_type: yup.string().required('Office type is required'),
    province_code: yup.string().required('Province is required'),
    address: yup.object({
        street_line1: yup.string().max(100),
        street_line2: yup.string().max(100),
        locality: yup.string().required('Locality is required').max(100),
        postal_code: yup.string().required('Postal code is required').matches(/^\d{3}$/, 'Postal code must be exactly 3 digits'),
        town: yup.string().required('Town is required').max(100),
        province_code: yup.string().required('Province is required'),
    }),
    max_capacity: yup.number().required('Maximum capacity is required').min(0).max(1000),
    current_capacity: yup.number().required('Current capacity is required').min(0),
    operational_schedule: yup.array().of(
        yup.object({
            day: yup.string().required(),
            is_open: yup.boolean().required(),
            open_time: yup.string().when('is_open', {
                is: true,
                then: () => yup.string().required('Open time is required when location is open'),
                otherwise: () => yup.string(),
            }),
            close_time: yup.string().when('is_open', {
                is: true,
                then: () => yup.string().required('Close time is required when location is open'),
                otherwise: () => yup.string(),
            }),
        })
    ),
    contact_phone: yup.string()
        .matches(/^[0-9+\-\s()]*$/, 'Phone number can only contain numbers, +, -, spaces, and parentheses')
        .max(20),
    contact_email: yup.string()
        .email('Invalid email format')
        .max(100),
    notes: yup.string().max(500),
});

const steps = [
    'Basic Information',
    'Address Information', 
    'Operational Schedule',
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
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [lookupsLoading, setLookupsLoading] = useState(true);

    // Helper function to create default schedule
    const createDefaultSchedule = (): DaySchedule[] => {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return days.map(day => ({
            day,
            is_open: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(day),
            open_time: '08:00',
            close_time: '17:00'
        }));
    };

    // Helper function to parse legacy operating hours string
    const parseOperatingHoursString = (hoursString: string): DaySchedule[] => {
        const defaultSchedule = createDefaultSchedule();
        
        if (!hoursString || hoursString.trim() === '') {
            return defaultSchedule;
        }

        try {
            // Parse string format like "Monday: 08:00-17:00; Tuesday: 08:00-17:00; Wednesday: Closed"
            const dayParts = hoursString.split(';').map(part => part.trim());
            const scheduleMap: { [key: string]: { is_open: boolean; open_time?: string; close_time?: string } } = {};

            dayParts.forEach(dayPart => {
                const [dayName, timeRange] = dayPart.split(':').map(part => part.trim());
                
                if (timeRange.toLowerCase() === 'closed') {
                    scheduleMap[dayName] = { is_open: false };
                } else if (timeRange.includes('-')) {
                    const [openTime, closeTime] = timeRange.split('-').map(time => time.trim());
                    scheduleMap[dayName] = { 
                        is_open: true, 
                        open_time: openTime, 
                        close_time: closeTime 
                    };
                }
            });

            // Apply parsed data to default schedule
            return defaultSchedule.map(daySchedule => ({
                ...daySchedule,
                ...scheduleMap[daySchedule.day]
            }));

        } catch (error) {
            console.warn('Error parsing operating hours string:', error);
            return defaultSchedule;
        }
    };

    // Main location form
    const locationForm = useForm<LocationForm>({
        resolver: yupResolver(locationSchema),
        mode: 'onChange',
        defaultValues: {
            location_code: '',
            location_name: '',
            office_type: '',
            province_code: '',
            address: {
                street_line1: '',
                street_line2: '',
                locality: '',
                postal_code: '',
                town: '',
                province_code: '',
            },
            max_capacity: 0,
            current_capacity: 0,
            operational_schedule: createDefaultSchedule(),
            contact_phone: '',
            contact_email: '',
            is_operational: true,
            notes: '',
        },
    });

    const { fields: scheduleFields } = useFieldArray({
        control: locationForm.control,
        name: 'operational_schedule',
    });

    // Continue with component logic...

    // Load lookup data on component mount
    useEffect(() => {
        const loadLookupData = async () => {
            try {
                setLookupsLoading(true);
                const [officeTypesRes, provincesRes] = await Promise.all([
                    lookupService.getOfficeTypes(),
                    lookupService.getProvinces()
                ]);
                
                setOfficeTypes(officeTypesRes);
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
            provinces.length > 0 &&
            !isEditMode &&
            !locationFound
        ) {
            // Set first option from each enum as default
            locationForm.setValue('office_type', officeTypes[0].value);
            locationForm.setValue('province_code', provinces[0].code);
            locationForm.setValue('address.province_code', provinces[0].code);
        }
    }, [lookupsLoading, officeTypes, provinces, isEditMode, locationFound, locationForm]);

    // Handle URL parameters for editing and initialLocationId prop
    useEffect(() => {
        const editLocationId = searchParams.get('edit') || initialLocationId;
        if (editLocationId && accessToken) {
            fetchLocationForEditing(editLocationId);
        }
    }, [searchParams, initialLocationId, accessToken]);

    // Generate sequential location code when province changes
    const generateSequentialLocationCode = async (provinceCode: string) => {
        if (!provinceCode || isEditMode) return;

        try {
            // Call backend to get next sequential code for this province
            const response = await api.get(API_ENDPOINTS.locations + `/next-code/${provinceCode}`);
            const nextCode = (response as any).code || `${provinceCode}01`;
            
            locationForm.setValue('location_code', nextCode);
            
            console.log(`Generated next location code for province ${provinceCode}: ${nextCode}`);
        } catch (error) {
            console.error('Failed to generate location code:', error);
            
            // Fallback: generate basic sequential code
            const fallbackCode = `${provinceCode}01`;
            locationForm.setValue('location_code', fallbackCode);
        }
    };

    // Watch province code changes for automatic code generation
    const watchedProvinceCode = locationForm.watch('province_code');
    useEffect(() => {
        if (watchedProvinceCode && !isEditMode) {
            generateSequentialLocationCode(watchedProvinceCode);
            // Also sync to address province
            locationForm.setValue('address.province_code', watchedProvinceCode);
        }
    }, [watchedProvinceCode, isEditMode, locationForm]);

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

    const populateFormWithExistingLocation = (existingLocation: any) => {
        console.log('Populating form with existing location:', existingLocation);
        console.log('Available backend fields:', Object.keys(existingLocation));

        // Map backend fields to form fields - ALL UPPERCASE
        locationForm.setValue('location_code', existingLocation.code?.toUpperCase() || '');
        locationForm.setValue('location_name', existingLocation.name?.toUpperCase() || '');
        locationForm.setValue('office_type', existingLocation.office_type?.toUpperCase() || '');
        locationForm.setValue('province_code', existingLocation.province_code?.toUpperCase() || '');
        locationForm.setValue('max_capacity', existingLocation.max_daily_capacity || 0);
        locationForm.setValue('current_capacity', existingLocation.current_staff_count || 0);
        locationForm.setValue('contact_phone', existingLocation.phone_number || '');
        locationForm.setValue('contact_email', existingLocation.email?.toUpperCase() || '');
        locationForm.setValue('is_operational', existingLocation.is_operational ?? true);
        locationForm.setValue('notes', existingLocation.special_notes?.toUpperCase() || '');

        // Handle address - map backend fields to structured format
        // Split backend locality back into locality and town (best effort)
        const backendLocality = existingLocation.locality?.toUpperCase() || '';
        let locality = '';
        let town = backendLocality; // Default to using the full value as town
        
        // Try to split if there's a comma (our save format was "locality, town")
        if (backendLocality.includes(',')) {
            const parts = backendLocality.split(',').map(part => part.trim());
            if (parts.length >= 2) {
                locality = parts[0];
                town = parts.slice(1).join(', '); // Join remaining parts as town
            }
        }

        locationForm.setValue('address', {
            street_line1: existingLocation.street_address?.toUpperCase() || '',
            street_line2: '', // Not provided by backend
            locality: locality,
            postal_code: existingLocation.postal_code?.toUpperCase() || '',
            town: town,
            province_code: existingLocation.province_code?.toUpperCase() || '',
        });

        // Handle operational schedule - try structured format first, fallback to string parsing, then default
        if (existingLocation.operational_schedule && Array.isArray(existingLocation.operational_schedule)) {
            // New structured format already available
            locationForm.setValue('operational_schedule', existingLocation.operational_schedule);
        } else if (existingLocation.operating_hours) {
            // Try to parse legacy string format
            try {
                const parsedSchedule = parseOperatingHoursString(existingLocation.operating_hours);
                locationForm.setValue('operational_schedule', parsedSchedule);
            } catch (error) {
                console.warn('Failed to parse operating hours string:', error);
                locationForm.setValue('operational_schedule', createDefaultSchedule());
            }
        } else {
            // Use default schedule
            locationForm.setValue('operational_schedule', createDefaultSchedule());
        }

        // Log final form values for debugging
        console.log('Form values after population:', locationForm.getValues());
    };

    // Context-aware completion handler
    const handleFormComplete = (location: any) => {
        setCreatedLocation(location);
        
        // Always show success dialog in standalone mode
        if (mode === 'standalone') {
            setShowSuccessDialog(true);
        }
        
        // Call onSuccess callback if provided (but don't prevent dialog)
        if (onSuccess) {
            onSuccess(location, isEditMode);
        }
        
        // Handle modal/embedded modes
        if (mode === 'modal' || mode === 'embedded') {
            if (onComplete) {
                onComplete(location);
            }
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
            ['location_code', 'location_name', 'office_type', 'province_code'], // Basic Information
            ['address.locality', 'address.postal_code', 'address.town', 'address.province_code'], // Address Information
            [], // Operational Schedule (custom validation)
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

            // Transform form data to match backend schema - ALL UPPERCASE
            // Backend expects specific field names based on the error response
            const addressString = [
                formData.address?.street_line1,
                formData.address?.street_line2,
                formData.address?.locality,
                formData.address?.town
            ].filter(Boolean).join(', ').toUpperCase();

            // Combine locality and town for backend (backend only has locality field)
            const combinedLocality = [
                formData.address?.locality,
                formData.address?.town
            ].filter(Boolean).join(', ').toUpperCase() || formData.address?.town?.toUpperCase() || formData.address?.locality?.toUpperCase() || '';

            const locationPayload = {
                location_code: formData.location_code?.toUpperCase() || '',
                name: formData.location_name?.toUpperCase() || '', 
                street_address: formData.address?.street_line1?.toUpperCase() || '', // Backend expects 'street_address'
                locality: combinedLocality, // Backend expects combined locality (includes town)
                postal_code: formData.address?.postal_code || '', // Backend expects at root level
                office_number: formData.location_code?.replace(/[A-Z]/g, '') || '', 
                province_code: formData.province_code?.toUpperCase() || '',
                office_type: formData.office_type?.toUpperCase() || '',
                max_daily_capacity: parseInt(formData.max_capacity?.toString() || '0'), // Backend expects 'max_daily_capacity'
                current_staff_count: parseInt(formData.current_capacity?.toString() || '0'), // Backend expects 'current_staff_count'
                operating_hours: formData.operational_schedule?.map(s => 
                    s.is_open ? `${s.day}: ${s.open_time}-${s.close_time}` : `${s.day}: Closed`
                ).join('; ') || '',
                operational_schedule: formData.operational_schedule || [],
                phone_number: formData.contact_phone || '', // Backend expects 'phone_number'
                email: formData.contact_email?.toLowerCase() || '', // Backend expects 'email' (lowercase for emails)
                is_operational: formData.is_operational,
                special_notes: formData.notes?.toUpperCase() || '', // Backend expects 'special_notes'
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
                return renderAddressStep();
            case 2:
                return renderOperationalScheduleStep();
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
                                    helperText={locationForm.formState.errors.location_code?.message || 'Auto-generated based on province (e.g., T01, A02)'}
                                    inputProps={{ maxLength: 10 }}
                                    disabled={isEditMode}
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

                    <Grid item xs={12} md={6}>
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
                                        {locationForm.formState.errors.province_code?.message || 'Madagascar province (generates location code)'}
                                    </FormHelperText>
                                </FormControl>
                            )}
                        />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );

    const renderAddressStep = () => (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HomeIcon color="primary" />
                    Address Information
                </Typography>

                <Box sx={{ mb: 4, p: 3, border: '1px solid #e0e0e0', borderRadius: 2, backgroundColor: '#fafafa' }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                        Location Address
                    </Typography>

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Controller
                                name="address.street_line1"
                                control={locationForm.control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        fullWidth
                                        label="Street Line 1"
                                        helperText="Street address line 1"
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
                                name="address.street_line2"
                                control={locationForm.control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        fullWidth
                                        label="Street Line 2"
                                        helperText="Street address line 2 (optional)"
                                        onChange={(e) => {
                                            const value = e.target.value.toUpperCase();
                                            field.onChange(value);
                                        }}
                                    />
                                )}
                            />
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <Controller
                                name="address.locality"
                                control={locationForm.control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        fullWidth
                                        label="Locality *"
                                        error={!!locationForm.formState.errors.address?.locality}
                                        helperText={locationForm.formState.errors.address?.locality?.message || 'Village, quartier, or city district'}
                                        onChange={(e) => {
                                            const value = e.target.value.toUpperCase();
                                            field.onChange(value);
                                        }}
                                    />
                                )}
                            />
                        </Grid>

                        <Grid item xs={12} md={3}>
                            <Controller
                                name="address.postal_code"
                                control={locationForm.control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        fullWidth
                                        label="Postal Code *"
                                        placeholder="### (3 digits)"
                                        error={!!locationForm.formState.errors.address?.postal_code}
                                        helperText={locationForm.formState.errors.address?.postal_code?.message || 'Madagascar postal code (3 digits)'}
                                        inputProps={{
                                            maxLength: 3,
                                            pattern: '[0-9]*',
                                            inputMode: 'numeric'
                                        }}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, '');
                                            field.onChange(value);
                                        }}
                                    />
                                )}
                            />
                        </Grid>

                        <Grid item xs={12} md={3}>
                            <Controller
                                name="address.town"
                                control={locationForm.control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        fullWidth
                                        label="Town *"
                                        error={!!locationForm.formState.errors.address?.town}
                                        helperText={locationForm.formState.errors.address?.town?.message || 'Town or city'}
                                        onChange={(e) => {
                                            const value = e.target.value.toUpperCase();
                                            field.onChange(value);
                                        }}
                                    />
                                )}
                            />
                        </Grid>

                        <Grid item xs={12} md={2}>
                            <Controller
                                name="address.province_code"
                                control={locationForm.control}
                                render={({ field }) => (
                                    <FormControl fullWidth disabled>
                                        <InputLabel>Province</InputLabel>
                                        <Select {...field} label="Province">
                                            {provinces.map((option) => (
                                                <MenuItem key={option.code} value={option.code}>
                                                    {option.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                        <FormHelperText>
                                            Province is set in basic information
                                        </FormHelperText>
                                    </FormControl>
                                )}
                            />
                        </Grid>
                    </Grid>
                </Box>
            </CardContent>
        </Card>
    );

    const renderOperationalScheduleStep = () => (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScheduleIcon color="primary" />
                    Operational Schedule
                </Typography>

                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
                    Set the operating hours for each day of the week. Use 15-minute increments.
                </Typography>

                {scheduleFields.map((field, index) => (
                    <Box key={field.id} sx={{ mb: 3, p: 3, border: '1px solid #e0e0e0', borderRadius: 2, backgroundColor: '#fafafa' }}>
                        <Grid container spacing={3} alignItems="center">
                            <Grid item xs={12} md={2}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                    {field.day}
                                </Typography>
                            </Grid>

                            <Grid item xs={12} md={2}>
                                <Controller
                                    name={`operational_schedule.${index}.is_open`}
                                    control={locationForm.control}
                                    render={({ field: checkboxField }) => (
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    {...checkboxField}
                                                    checked={checkboxField.value}
                                                    color="primary"
                                                />
                                            }
                                            label="Open"
                                        />
                                    )}
                                />
                            </Grid>

                            {locationForm.watch(`operational_schedule.${index}.is_open`) && (
                                <>
                                    <Grid item xs={12} md={4}>
                                        <Controller
                                            name={`operational_schedule.${index}.open_time`}
                                            control={locationForm.control}
                                            render={({ field: timeField }) => (
                                                <FormControl fullWidth>
                                                    <InputLabel>Open Time</InputLabel>
                                                    <Select {...timeField} label="Open Time">
                                                        {TIME_OPTIONS.map((time) => (
                                                            <MenuItem key={time} value={time}>
                                                                {time}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            )}
                                        />
                                    </Grid>

                                    <Grid item xs={12} md={4}>
                                        <Controller
                                            name={`operational_schedule.${index}.close_time`}
                                            control={locationForm.control}
                                            render={({ field: timeField }) => (
                                                <FormControl fullWidth>
                                                    <InputLabel>Close Time</InputLabel>
                                                    <Select {...timeField} label="Close Time">
                                                        {TIME_OPTIONS.map((time) => (
                                                            <MenuItem key={time} value={time}>
                                                                {time}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            )}
                                        />
                                    </Grid>
                                </>
                            )}

                            {!locationForm.watch(`operational_schedule.${index}.is_open`) && (
                                <Grid item xs={12} md={8}>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                        Closed
                                    </Typography>
                                </Grid>
                            )}
                        </Grid>
                    </Box>
                ))}

                <Box sx={{ mt: 3, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
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
                                        helperText={locationForm.formState.errors.max_capacity?.message || 'Maximum people this location can serve'}
                                        inputProps={{ min: 0, max: 1000 }}
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
                                        helperText={locationForm.formState.errors.current_capacity?.message || 'Current number of people being served'}
                                        inputProps={{ min: 0 }}
                                    />
                                )}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Controller
                                name="is_operational"
                                control={locationForm.control}
                                render={({ field }) => (
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                {...field}
                                                checked={field.value}
                                                color="primary"
                                            />
                                        }
                                        label="Location is Operational"
                                    />
                                )}
                            />
                        </Grid>
                    </Grid>
                </Box>
            </CardContent>
        </Card>
    );

    const renderContactDetailsStep = () => (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Contact Information
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
                                    error={!!locationForm.formState.errors.contact_phone}
                                    helperText={locationForm.formState.errors.contact_phone?.message || 'Phone number for this location'}
                                    inputProps={{
                                        maxLength: 20
                                    }}
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
                                    error={!!locationForm.formState.errors.notes}
                                    helperText={locationForm.formState.errors.notes?.message || 'Additional notes about this location (optional)'}
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
                            <Grid item xs={12} md={4}>
                                <Typography variant="subtitle2" color="text.secondary">Location Code</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {formData.location_code}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Typography variant="subtitle2" color="text.secondary">Location Name</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {formData.location_name}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Typography variant="subtitle2" color="text.secondary">Office Type</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {officeTypes.find(type => type.value === formData.office_type)?.label || formData.office_type}
                                </Typography>
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Address Summary */}
                    <Box sx={{ mb: 4, p: 3, border: '1px solid #e0e0e0', borderRadius: 2, backgroundColor: '#fafafa' }}>
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                            Address Information
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" color="text.secondary">Full Address</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {[
                                        formData.address?.street_line1,
                                        formData.address?.street_line2,
                                        formData.address?.locality,
                                        formData.address?.town
                                    ].filter(Boolean).join(', ')}
                                    {formData.address?.postal_code && ` - ${formData.address.postal_code}`}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2" color="text.secondary">Province</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {provinces.find(p => p.code === formData.address?.province_code)?.name || formData.address?.province_code}
                                </Typography>
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Operational Schedule Summary */}
                    <Box sx={{ mb: 4, p: 3, border: '1px solid #e0e0e0', borderRadius: 2, backgroundColor: '#fafafa' }}>
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                            Operational Schedule
                        </Typography>

                        <Grid container spacing={1}>
                            {formData.operational_schedule?.map((schedule, index) => (
                                <Grid item xs={12} sm={6} md={4} key={index}>
                                    <Box sx={{ p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {schedule.day}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {schedule.is_open 
                                                ? `${schedule.open_time} - ${schedule.close_time}`
                                                : 'Closed'
                                            }
                                        </Typography>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>

                        <Grid container spacing={2} sx={{ mt: 2 }}>
                            <Grid item xs={12} md={4}>
                                <Typography variant="subtitle2" color="text.secondary">Maximum Capacity</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {formData.max_capacity} people
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Typography variant="subtitle2" color="text.secondary">Current Capacity</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {formData.current_capacity} people
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                                <Chip 
                                    label={formData.is_operational ? 'Operational' : 'Not Operational'} 
                                    color={formData.is_operational ? 'success' : 'error'}
                                    size="small"
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Contact Information Summary */}
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
                            {formData.notes && (
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                        {formData.notes}
                                    </Typography>
                                </Grid>
                            )}
                        </Grid>
                    </Box>

                    <Alert severity="success" sx={{ mt: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            Ready to {isEditMode ? 'Update' : 'Create'} Location
                        </Typography>
                        <Typography variant="body2">
                            • Address: {[formData.address?.locality, formData.address?.town].filter(Boolean).join(', ')}
                            <br />
                            • Open Days: {formData.operational_schedule?.filter(s => s.is_open).length || 0} day(s)
                            <br />
                            • Capacity: {formData.max_capacity} maximum
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

    if (lookupsLoading) {
        return <Box sx={{ p: 3, textAlign: 'center' }}>Loading...</Box>;
    }

    return (
        <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
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
                    {steps.map((label, index) => (
                        <Step key={label} completed={stepValidation[index]}>
                            <StepLabel
                                onClick={() => handleStepClick(index)}
                                sx={{
                                    cursor: (index < currentStep || stepValidation[index]) ? 'pointer' : 'default',
                                    '&:hover': (index < currentStep || stepValidation[index]) ? { opacity: 0.8 } : {},
                                }}
                            >
                                {label}
                            </StepLabel>
                        </Step>
                    ))}
                </Stepper>
            </Paper>

            {/* Step Content */}
            <Box sx={{ mb: 3 }}>
                {renderStepContent()}
            </Box>

            {/* Navigation - Matching PersonFormWrapper Style */}
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
                                {submitLoading ? 'Processing...' : (isEditMode ? 'Update Location' : 'Create Location')}
                            </Button>
                        )}
                    </Box>
                </Box>
            </Paper>

            {/* Success Dialog - Blue Corporate Style matching PersonFormWrapper */}
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
                    <LocationIcon />
                    Location {isEditMode ? 'Updated' : 'Created'} Successfully!
                </DialogTitle>
                <DialogContent sx={{ p: 3 }}>
                    {createdLocation && (
                        <Box>
                            <Alert severity="success" sx={{ mb: 3 }}>
                                Location <strong>{createdLocation.name || createdLocation.location_name}</strong> has been successfully {isEditMode ? 'updated' : 'created'}!
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
                                            📍 Location Information
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            The location record has been {isEditMode ? 'updated' : 'created'} and is ready for user assignments.
                                        </Typography>
                                        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                                            <Typography variant="subtitle2">Location Code:</Typography>
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                {createdLocation.code || createdLocation.location_code}
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
                                            ✅ Next Steps
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Choose your next action to continue the location management workflow.
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            • Create another location for additional offices<br/>
                                            • Return to location management page
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3, gap: 1, justifyContent: 'space-between' }}>
                    <Button
                        onClick={() => {
                            setShowSuccessDialog(false);
                            resetForm();
                        }}
                        variant="outlined"
                        startIcon={<AddIcon />}
                        size="large"
                    >
                        Create Another Location
                    </Button>
                    <Button
                        onClick={() => setShowSuccessDialog(false)}
                        variant="contained"
                        startIcon={<LocationIcon />}
                        size="large"
                        sx={{ minWidth: 120 }}
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default LocationFormWrapper; 