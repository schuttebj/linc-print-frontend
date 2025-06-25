/**
 * Location Form Page for Madagascar LINC Print System
 * Full-page location creation/editing with navigation
 * Similar to PersonManagementPage approach
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Button,
    Alert,
    Breadcrumbs,
    Link,
    IconButton,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    LocationOn as LocationIcon,
    Save as SaveIcon,
} from '@mui/icons-material';

import { useAuth } from '../../contexts/AuthContext';
import LocationFormWrapper from '../../components/LocationFormWrapper';

const LocationFormPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, hasPermission } = useAuth();

    // Get edit location ID from URL parameters
    const locationId = searchParams.get('id');
    const isEditMode = !!locationId;

    // State management
    const [pageTitle, setPageTitle] = useState(isEditMode ? 'Edit Location' : 'Create New Location');
    const [pageSubtitle, setPageSubtitle] = useState(
        isEditMode ? 'Update location information and settings' : 'Add a new office location to the system'
    );

    // Check permissions
    useEffect(() => {
        const requiredPermission = isEditMode ? 'locations.update' : 'locations.create';
        if (!hasPermission(requiredPermission)) {
            navigate('/admin/locations');
            return;
        }
    }, [isEditMode, hasPermission, navigate]);

    // Handle successful form completion
    const handleFormSuccess = (location: any, wasEdit: boolean) => {
        console.log(`Location ${wasEdit ? 'updated' : 'created'} successfully:`, location);
        
        // Navigate back to location management with success message
        navigate('/admin/locations', { 
            state: { 
                successMessage: `Location ${wasEdit ? 'updated' : 'created'} successfully: ${location.location_name}` 
            } 
        });
    };

    // Handle form cancellation
    const handleFormCancel = () => {
        navigate('/admin/locations');
    };

    // Handle navigation back
    const handleNavigateBack = () => {
        navigate('/admin/locations');
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header with Navigation */}
            <Box sx={{ mb: 3 }}>
                {/* Breadcrumbs */}
                <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
                    <Link 
                        color="inherit" 
                        href="/admin" 
                        onClick={(e) => {
                            e.preventDefault();
                            navigate('/admin');
                        }}
                    >
                        Admin
                    </Link>
                    <Link
                        color="inherit"
                        href="/admin/locations"
                        onClick={(e) => {
                            e.preventDefault();
                            navigate('/admin/locations');
                        }}
                    >
                        Location Management
                    </Link>
                    <Typography color="text.primary">
                        {isEditMode ? 'Edit Location' : 'Create Location'}
                    </Typography>
                </Breadcrumbs>

                {/* Page Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton 
                        onClick={handleNavigateBack}
                        sx={{ 
                            bgcolor: 'grey.100',
                            '&:hover': { bgcolor: 'grey.200' }
                        }}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    
                    <LocationIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                    
                    <Box>
                        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 0 }}>
                            {pageTitle}
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary">
                            {pageSubtitle}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Form Container */}
            <Paper sx={{ p: 0, borderRadius: 2, boxShadow: 2 }}>
                <LocationFormWrapper
                    mode="standalone"
                    onSuccess={handleFormSuccess}
                    onCancel={handleFormCancel}
                    initialLocationId={locationId || undefined}
                    title={pageTitle}
                    subtitle={pageSubtitle}
                    showHeader={false} // We're handling the header above
                />
            </Paper>

            {/* Help Text */}
            <Alert 
                severity="info" 
                sx={{ mt: 3 }}
                icon={<LocationIcon />}
            >
                <Typography variant="body2">
                    <strong>Location Management:</strong>{' '}
                    {isEditMode 
                        ? 'Update the location details as needed. The location code cannot be changed after creation.'
                        : 'Location codes are automatically generated based on the selected province (e.g., T01 for Antananarivo, A01 for Toamasina).'
                    }
                </Typography>
            </Alert>
        </Box>
    );
};

export default LocationFormPage; 