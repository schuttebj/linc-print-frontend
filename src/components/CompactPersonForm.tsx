/**
 * CompactPersonForm - New person form with clean design
 * Style Guide:
 * - Main background: #f8f9fa
 * - Form background: white
 * - Shadow: rgba(0, 0, 0, 0.05) 0px 1px 2px 0px
 * - Vertical stepper/accordion style
 */

import React, { useState } from 'react';
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
    StepContent,
    FormControlLabel,
    Checkbox,
    IconButton,
    InputAdornment,
} from '@mui/material';
import {
    Search as SearchIcon,
    PersonAdd as PersonAddIcon,
    Clear as ClearIcon,
    ArrowForward as ArrowForwardIcon,
    ArrowBack as ArrowBackIcon,
    PersonSearch as PersonSearchIcon,
    ContactPhone as ContactIcon,
    Badge as DocumentIcon,
    Home as AddressIcon,
    Preview as ReviewIcon,
} from '@mui/icons-material';

interface CompactPersonFormProps {
    onPersonSelected?: (person: any) => void;
    onCancel?: () => void;
}

interface FormData {
    // Lookup
    document_type: string;
    document_number: string;
    
    // Personal info
    surname: string;
    first_name: string;
    middle_name: string;
    person_nature: string;
    birth_date: string;
    nationality_code: string;
    preferred_language: string;
    
    // Contact info
    email_address: string;
    work_phone: string;
    cell_phone_country_code: string;
    cell_phone: string;
}

const CompactPersonForm: React.FC<CompactPersonFormProps> = ({
    onPersonSelected,
    onCancel
}) => {
    const [activeStep, setActiveStep] = useState(0);
    const [formData, setFormData] = useState<FormData>({
        // Lookup data
        document_type: 'MG_ID',
        document_number: '',
        
        // Personal info
        surname: '',
        first_name: '',
        middle_name: '',
        person_nature: 'M',
        birth_date: '',
        nationality_code: 'MG',
        preferred_language: 'MG',
        
        // Contact info
        email_address: '',
        work_phone: '',
        cell_phone_country_code: '+261',
        cell_phone: '',
    });

    const steps = [
        {
            label: 'Document Lookup',
            description: 'Search for existing person or start new registration',
            icon: <PersonSearchIcon />,
            key: 'lookup'
        },
        {
            label: 'Personal Information',
            description: 'Enter basic personal details',
            icon: <PersonAddIcon />,
            key: 'personal'
        },
        {
            label: 'Contact Details',
            description: 'Add contact information',
            icon: <ContactIcon />,
            key: 'contact'
        },
        {
            label: 'Review & Submit',
            description: 'Review and submit the information',
            icon: <ReviewIcon />,
            key: 'review'
        }
    ];

    const handleNext = () => {
        if (activeStep < steps.length - 1) {
            setActiveStep(activeStep + 1);
        }
    };

    const handleBack = () => {
        if (activeStep > 0) {
            setActiveStep(activeStep - 1);
        }
    };

    const handleInputChange = (field: keyof FormData) => (event: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: event.target.value
        }));
    };

    const handleSubmit = () => {
        // Create a mock person object
        const person = {
            id: `temp-${Date.now()}`,
            surname: formData.surname,
            first_name: formData.first_name,
            middle_name: formData.middle_name,
            person_nature: formData.person_nature,
            birth_date: formData.birth_date,
            nationality_code: formData.nationality_code,
            preferred_language: formData.preferred_language,
            email_address: formData.email_address,
            cell_phone: formData.cell_phone,
            cell_phone_country_code: formData.cell_phone_country_code,
            aliases: [{
                document_type: formData.document_type,
                document_number: formData.document_number,
                is_primary: true
            }]
        };

        if (onPersonSelected) {
            onPersonSelected(person);
        }
    };

    const isStepValid = (step: number): boolean => {
        switch (step) {
            case 0:
                return !!(formData.document_type && formData.document_number.length >= 3);
            case 1:
                return !!(formData.surname && formData.first_name && formData.person_nature);
            case 2:
                return true; // Contact is optional
            case 3:
                return true; // Review step
            default:
                return false;
        }
    };

    const renderStepContent = (step: number) => {
        switch (step) {
            case 0:
                return (
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Enter document details to search for existing person or register new person.
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Document Type *</InputLabel>
                                    <Select
                                        value={formData.document_type}
                                        onChange={handleInputChange('document_type')}
                                        label="Document Type *"
                                    >
                                        <MenuItem value="MG_ID">Madagascar ID</MenuItem>
                                        <MenuItem value="PASSPORT">Passport</MenuItem>
                                    </Select>
                                    <FormHelperText>Select document type</FormHelperText>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Document Number *"
                                    value={formData.document_number}
                                    onChange={handleInputChange('document_number')}
                                    helperText="Enter document number"
                                    InputProps={{
                                        endAdornment: formData.document_number && (
                                            <InputAdornment position="end">
                                                <IconButton 
                                                    onClick={() => setFormData(prev => ({...prev, document_number: ''}))} 
                                                    size="small"
                                                >
                                                    <ClearIcon />
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12} md={2}>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    size="small"
                                    startIcon={<SearchIcon />}
                                    onClick={handleNext}
                                    disabled={!isStepValid(0)}
                                    sx={{
                                        height: '40px',
                                        boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px'
                                    }}
                                >
                                    Search
                                </Button>
                            </Grid>
                        </Grid>
                    </Box>
                );

            case 1:
                return (
                    <Box>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Surname *"
                                    value={formData.surname}
                                    onChange={handleInputChange('surname')}
                                    helperText="Family name"
                                />
                            </Grid>

                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="First Name *"
                                    value={formData.first_name}
                                    onChange={handleInputChange('first_name')}
                                    helperText="Given name"
                                />
                            </Grid>

                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Middle Name"
                                    value={formData.middle_name}
                                    onChange={handleInputChange('middle_name')}
                                    helperText="Optional"
                                />
                            </Grid>

                            <Grid item xs={12} md={3}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Gender *</InputLabel>
                                    <Select
                                        value={formData.person_nature}
                                        onChange={handleInputChange('person_nature')}
                                        label="Gender *"
                                    >
                                        <MenuItem value="M">Male</MenuItem>
                                        <MenuItem value="F">Female</MenuItem>
                                    </Select>
                                    <FormHelperText>Select gender</FormHelperText>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} md={3}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="date"
                                    label="Date of Birth"
                                    value={formData.birth_date}
                                    onChange={handleInputChange('birth_date')}
                                    InputLabelProps={{ shrink: true }}
                                    helperText="Birth date"
                                />
                            </Grid>

                            <Grid item xs={12} md={3}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Nationality *</InputLabel>
                                    <Select
                                        value={formData.nationality_code}
                                        onChange={handleInputChange('nationality_code')}
                                        label="Nationality *"
                                    >
                                        <MenuItem value="MG">MALAGASY</MenuItem>
                                        <MenuItem value="FR">FRENCH</MenuItem>
                                        <MenuItem value="US">AMERICAN</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} md={3}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Language *</InputLabel>
                                    <Select
                                        value={formData.preferred_language}
                                        onChange={handleInputChange('preferred_language')}
                                        label="Language *"
                                    >
                                        <MenuItem value="MG">Malagasy</MenuItem>
                                        <MenuItem value="FR">French</MenuItem>
                                        <MenuItem value="EN">English</MenuItem>
                                    </Select>
                                    <FormHelperText>Preferred language</FormHelperText>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </Box>
                );

            case 2:
                return (
                    <Box>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="email"
                                    label="Email Address"
                                    value={formData.email_address}
                                    onChange={handleInputChange('email_address')}
                                    helperText="Email address (optional)"
                                />
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Work Phone"
                                    value={formData.work_phone}
                                    onChange={handleInputChange('work_phone')}
                                    helperText="Work phone (optional)"
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 500, mb: 1 }}>
                                    Cell Phone (10 digits starting with 0)
                                </Typography>
                            </Grid>

                            <Grid item xs={12} md={3}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Country Code</InputLabel>
                                    <Select
                                        value={formData.cell_phone_country_code}
                                        onChange={handleInputChange('cell_phone_country_code')}
                                        label="Country Code"
                                    >
                                        <MenuItem value="+261">+261 (MADAGASCAR)</MenuItem>
                                        <MenuItem value="+27">+27 (SOUTH AFRICA)</MenuItem>
                                        <MenuItem value="+33">+33 (FRANCE)</MenuItem>
                                    </Select>
                                    <FormHelperText>Country code</FormHelperText>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} md={9}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Cell Phone Number"
                                    value={formData.cell_phone}
                                    onChange={handleInputChange('cell_phone')}
                                    placeholder="0815598453"
                                    helperText="Madagascar cell phone (optional)"
                                />
                            </Grid>
                        </Grid>
                    </Box>
                );

            case 3:
                return (
                    <Box>
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                            Review Information
                        </Typography>

                        <Paper 
                            elevation={0}
                            sx={{ 
                                p: 2, 
                                bgcolor: '#f8f9fa',
                                border: '1px solid #e0e0e0',
                                borderRadius: 1,
                                mb: 2
                            }}
                        >
                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                                Personal Information
                            </Typography>
                            <Grid container spacing={1}>
                                <Grid item xs={12}>
                                    <Typography variant="body2">
                                        <strong>Name:</strong> {formData.first_name} {formData.middle_name} {formData.surname}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="body2">
                                        <strong>Gender:</strong> {formData.person_nature === 'M' ? 'Male' : 'Female'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="body2">
                                        <strong>Birth Date:</strong> {formData.birth_date || 'Not provided'}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Paper>

                        <Paper 
                            elevation={0}
                            sx={{ 
                                p: 2, 
                                bgcolor: '#f8f9fa',
                                border: '1px solid #e0e0e0',
                                borderRadius: 1
                            }}
                        >
                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                                Document Information
                            </Typography>
                            <Typography variant="body2">
                                <strong>Document:</strong> {formData.document_type} - {formData.document_number}
                            </Typography>
                        </Paper>

                        <Alert severity="success" sx={{ mt: 2 }}>
                            <Typography variant="body2">
                                Ready to use this person for the learner's permit application.
                            </Typography>
                        </Alert>
                    </Box>
                );

            default:
                return null;
        }
    };

    return (
        <Box sx={{ 
            bgcolor: '#f8f9fa',
            p: 3,
            borderRadius: 2
        }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Person Information
            </Typography>

            <Paper 
                elevation={0}
                sx={{ 
                    p: 3,
                    bgcolor: 'white',
                    boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                    borderRadius: 2
                }}
            >
                <Stepper activeStep={activeStep} orientation="vertical">
                    {steps.map((step, index) => (
                        <Step key={step.key}>
                            <StepLabel
                                optional={
                                    <Typography variant="caption">{step.description}</Typography>
                                }
                                StepIconComponent={() => (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 32,
                                            height: 32,
                                            borderRadius: '50%',
                                            bgcolor: activeStep >= index ? 'primary.main' : 'grey.300',
                                            color: activeStep >= index ? 'white' : 'grey.600',
                                            boxShadow: activeStep >= index ? 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px' : 'none'
                                        }}
                                    >
                                        {step.icon}
                                    </Box>
                                )}
                            >
                                {step.label}
                            </StepLabel>
                            <StepContent>
                                <Box sx={{ mt: 2, mb: 2 }}>
                                    {renderStepContent(index)}
                                </Box>
                                
                                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box>
                                        {onCancel && (
                                            <Button
                                                onClick={onCancel}
                                                color="secondary"
                                                size="small"
                                            >
                                                Cancel
                                            </Button>
                                        )}
                                    </Box>
                                    
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Button
                                            disabled={index === 0}
                                            onClick={handleBack}
                                            startIcon={<ArrowBackIcon />}
                                            size="small"
                                        >
                                            Back
                                        </Button>
                                        
                                        <Button
                                            variant="contained"
                                            onClick={index === steps.length - 1 ? handleSubmit : handleNext}
                                            disabled={!isStepValid(index)}
                                            endIcon={index !== steps.length - 1 ? <ArrowForwardIcon /> : <PersonAddIcon />}
                                            size="small"
                                            sx={{
                                                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px'
                                            }}
                                        >
                                            {index === steps.length - 1 ? 'Use Person' : 'Next'}
                                        </Button>
                                    </Box>
                                </Box>
                            </StepContent>
                        </Step>
                    ))}
                </Stepper>
            </Paper>
        </Box>
    );
};

export default CompactPersonForm;