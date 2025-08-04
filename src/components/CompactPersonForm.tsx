/**
 * CompactPersonForm - Compact person form based on original PersonFormWrapper
 * Style Guide:
 * - Main background: #f8f9fa
 * - Form background: white
 * - Shadow: rgba(0, 0, 0, 0.05) 0px 1px 2px 0px
 * - Horizontal tabs (like original PersonFormWrapper)
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
    Tabs,
    Tab,
    FormControlLabel,
    Checkbox,
    IconButton,
    InputAdornment,
    CircularProgress,
    Container,
} from '@mui/material';
import {
    Search as SearchIcon,
    PersonAdd as PersonAddIcon,
    Clear as ClearIcon,
    ArrowForward as ArrowForwardIcon,
    ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';
import lookupService, { 
    DocumentType, 
    PersonNature, 
    Language, 
    Nationality, 
    PhoneCountryCode, 
    Country, 
    Province, 
    AddressType 
} from '../services/lookupService';

// Types for Madagascar-specific person management
interface PersonLookupForm {
    document_type: string;
    document_number: string;
}

interface PersonManagementForm {
    // Core Identity Fields (Madagascar specific)
    surname: string;
    first_name: string;
    middle_name?: string;
    person_nature: string;
    birth_date?: string;
    nationality_code: string;
    preferred_language: string;

    // Contact Information  
    email_address?: string;
    work_phone?: string;
    cell_phone_country_code: string;
    cell_phone?: string;

    // ID Documents/Aliases (Madagascar: MG_ID and Passport only)
    aliases: Array<{
        document_type: string;
        document_number: string;
        country_of_issue: string;
        name_in_document?: string;
        is_primary: boolean;
        is_current: boolean;
        expiry_date?: string;
    }>;

    // Addresses (Madagascar format)
    addresses: Array<{
        address_type: string;
        street_line1?: string;
        street_line2?: string;
        locality: string;
        postal_code: string;
        town: string;
        country: string;
        province_code?: string;
        is_primary: boolean;
    }>;
}

interface ExistingPerson {
    id?: string;
    surname?: string;
    first_name?: string;
    middle_name?: string;
    person_nature: string;
    birth_date?: string;
    nationality_code?: string;
    preferred_language?: string;
    email_address?: string;
    work_phone?: string;
    cell_phone_country_code?: string;
    cell_phone?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
    primary_document?: string;
    primary_document_type?: string;
    aliases?: Array<{
        id: string;
        document_type: string;
        document_number: string;
        country_of_issue?: string;
        name_in_document?: string;
        is_primary: boolean;
        is_current?: boolean;
        expiry_date?: string;
    }>;
    addresses?: Array<{
        id: string;
        address_type: string;
        street_line1?: string;
        street_line2?: string;
        locality: string;
        postal_code?: string;
        town?: string;
        country?: string;
        province_code?: string;
        is_primary: boolean;
    }>;
}

// Validation schemas
const lookupSchema = yup.object({
    document_type: yup.string().required('Document type is required'),
    document_number: yup.string()
        .required('Document number is required')
        .min(3, 'Document number must be at least 3 characters'),
});

const personSchema = yup.object({
    surname: yup.string().required('Surname is mandatory').max(50),
    first_name: yup.string().required('First name is mandatory').max(50),
    middle_name: yup.string().max(50),
    person_nature: yup.string().required('Person nature is mandatory'),
    nationality_code: yup.string().required('Nationality is mandatory'),
    preferred_language: yup.string().required('Preferred language is mandatory'),

    email_address: yup.string().email('Invalid email format').max(100),
    work_phone: yup.string().max(20),
    cell_phone_country_code: yup.string().required('Country code required if cell phone provided'),
    cell_phone: yup.string()
        .matches(/^[0-9]*$/, 'Cell phone must contain only digits')
        .test('madagascar-format', 'Madagascar cell phone must be exactly 10 digits starting with 0 (e.g., 0815598453)', function (value) {
            if (!value) return true;
            return /^0\d{9}$/.test(value);
        }),

    aliases: yup.array().of(
        yup.object({
            document_type: yup.string().required('Document type is required'),
            document_number: yup.string().required('Document number is required'),
            country_of_issue: yup.string().required('Country of issue is required'),
        })
    ).min(1, 'At least one identification document is required'),

    addresses: yup.array().of(
        yup.object({
            address_type: yup.string().required('Address type is required'),
            locality: yup.string().required('Locality is required'),
            postal_code: yup.string()
                .required('Postal code is required')
                .matches(/^\d{3}$/, 'Madagascar postal code must be exactly 3 digits'),
            town: yup.string().required('Town is required'),
            country: yup.string().required('Country is required'),
        })
    ).min(1, 'At least one address is required'),
});

const steps = [
    'Document Lookup',
    'Personal Information',
    'Contact Details',
    'ID Documents',
    'Address Information',
    'Review & Submit',
];

interface CompactPersonFormProps {
    onPersonSelected?: (person: any, isEdit?: boolean) => void;
    onCancel?: () => void;
}

const CompactPersonForm: React.FC<CompactPersonFormProps> = ({
    onPersonSelected,
    onCancel
}) => {
    // Auth
    const { user, hasPermission, accessToken } = useAuth();

    // State management
    const [currentStep, setCurrentStep] = useState(0);
    const [personFound, setPersonFound] = useState<ExistingPerson | null>(null);
    const [currentPersonId, setCurrentPersonId] = useState<string | null>(null);
    const [isNewPerson, setIsNewPerson] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [stepValidation, setStepValidation] = useState<boolean[]>(new Array(steps.length).fill(false));
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');

    // Lookup data state - loaded from backend enums
    const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
    const [personNatures, setPersonNatures] = useState<PersonNature[]>([]);
    const [languages, setLanguages] = useState<Language[]>([]);
    const [nationalities, setNationalities] = useState<Nationality[]>([]);
    const [phoneCountryCodes, setPhoneCountryCodes] = useState<PhoneCountryCode[]>([]);
    const [countries, setCountries] = useState<Country[]>([]);
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [addressTypes, setAddressTypes] = useState<AddressType[]>([]);
    const [lookupsLoading, setLookupsLoading] = useState(true);

    // Lookup form
    const lookupForm = useForm<PersonLookupForm>({
        resolver: yupResolver(lookupSchema),
        defaultValues: {
            document_type: 'MG_ID',
            document_number: '',
        },
    });

    // Main person form
    const personForm = useForm<PersonManagementForm>({
        resolver: yupResolver(personSchema),
        defaultValues: {
            surname: '',
            first_name: '',
            middle_name: '',
            person_nature: '',
            birth_date: '',
            nationality_code: 'MG',
            preferred_language: 'MG',
            email_address: '',
            work_phone: '',
            cell_phone_country_code: '+261',
            cell_phone: '',
            aliases: [{
                document_type: 'MG_ID',
                document_number: '',
                country_of_issue: 'MG',
                name_in_document: '',
                is_primary: true,
                is_current: true,
                expiry_date: '',
            }],
            addresses: [{
                address_type: 'RESIDENTIAL',
                street_line1: '',
                street_line2: '',
                locality: '',
                postal_code: '',
                town: '',
                country: 'MADAGASCAR',
                province_code: '',
                is_primary: true,
            }],
        },
    });

    const { fields: aliasFields, append: appendAlias, remove: removeAlias } = useFieldArray({
        control: personForm.control,
        name: 'aliases',
    });

    const { fields: addressFields, append: appendAddress, remove: removeAddress } = useFieldArray({
        control: personForm.control,
        name: 'addresses',
    });

    // Load lookup data on component mount
    useEffect(() => {
        const loadLookupData = async () => {
            try {
                setLookupsLoading(true);
                const data = await lookupService.getAllLookups();
                
                setDocumentTypes(data.document_types);
                setPersonNatures(data.person_natures);
                setLanguages(data.languages);
                setNationalities(data.nationalities);
                setPhoneCountryCodes(data.phone_country_codes);
                setCountries(data.countries);
                setProvinces(data.provinces);
                setAddressTypes(data.address_types);
                
                console.log('✅ Lookup data loaded successfully');
            } catch (error) {
                console.error('❌ Failed to load lookup data:', error);
            } finally {
                setLookupsLoading(false);
            }
        };

        loadLookupData();
    }, []);

    // Step 1: Document Lookup functionality
    const performLookup = async (data: PersonLookupForm) => {
        setLookupLoading(true);
        setError('');

        try {
            console.log('Looking up person with:', data);

            // Search for existing person using the document details
            const searchQuery = new URLSearchParams({
                document_type: data.document_type,
                document_number: data.document_number,
                include_details: 'true',
                limit: '1'
            });

            const response = await fetch(`${API_BASE_URL}/api/v1/persons/search?${searchQuery}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (response.ok) {
                const searchResult = await response.json();
                console.log('Search result:', searchResult);

                if (Array.isArray(searchResult) && searchResult.length > 0) {
                    // Person found
                    const existingPerson = searchResult[0];
                    console.log('Person found:', existingPerson);
                    setPersonFound(existingPerson);
                    setCurrentPersonId(existingPerson.id);
                    setIsNewPerson(false);
                    setIsEditMode(true);

                    // Populate form with existing person data
                    populateFormWithExistingPerson(existingPerson);
                    
                    markStepValid(0, true);
                    markStepValid(1, true);
                    markStepValid(2, true);
                    markStepValid(3, true);
                    markStepValid(4, true);
                    setCurrentStep(5); // Jump to review step
                } else {
                    // No person found - setup for new person creation
                    console.log('No person found, creating new');
                    setPersonFound(null);
                    setCurrentPersonId(null);
                    setIsNewPerson(true);
                    setIsEditMode(false);
                    setupNewPersonForm(data);
                    markStepValid(0, true);
                    setCurrentStep(1);
                }
            } else {
                console.error('Search failed with status:', response.status);
                // Fallback to new person creation
                setPersonFound(null);
                setIsNewPerson(true);
                setupNewPersonForm(data);
                markStepValid(0, true);
                setCurrentStep(1);
            }

        } catch (error) {
            console.error('Lookup failed:', error);
            setError('Failed to search for person. Will create new person.');
            // Fallback to new person creation
            setPersonFound(null);
            setIsNewPerson(true);
            setupNewPersonForm(data);
            markStepValid(0, true);
            setCurrentStep(1);
        } finally {
            setLookupLoading(false);
        }
    };

    const setupNewPersonForm = (lookupData: PersonLookupForm) => {
        console.log('Setting up form for new person with lookup data:', lookupData);

        // Get first option from each enum, with fallbacks
        const defaultPersonNature = personNatures.length > 0 ? personNatures[0].value : '01';
        const defaultNationality = nationalities.length > 0 ? nationalities[0].value : 'MG';
        const defaultLanguage = languages.length > 0 ? languages[0].value : 'MG';
        const defaultPhoneCountryCode = phoneCountryCodes.length > 0 ? phoneCountryCodes[0].value : '+261';
        const defaultCountry = countries.length > 0 ? countries[0].value : 'MG';
        const defaultAddressType = addressTypes.length > 0 ? addressTypes[0].value : 'RESIDENTIAL';
        const defaultProvinceCode = provinces.length > 0 ? provinces[0].code : 'T';

        // Reset form with primary document from lookup
        personForm.reset({
            surname: '',
            first_name: '',
            middle_name: '',
            person_nature: defaultPersonNature,
            birth_date: '',
            nationality_code: defaultNationality,
            preferred_language: defaultLanguage,
            email_address: '',
            work_phone: '',
            cell_phone_country_code: defaultPhoneCountryCode,
            cell_phone: '',
            aliases: [{
                document_type: lookupData.document_type?.toUpperCase() || 'MG_ID',
                document_number: lookupData.document_number?.toUpperCase() || '',
                country_of_issue: defaultCountry,
                name_in_document: '',
                is_primary: true,
                is_current: true,
                expiry_date: '',
            }],
            addresses: [{
                address_type: defaultAddressType,
                street_line1: '',
                street_line2: '',
                locality: '',
                postal_code: '',
                town: '',
                country: 'MADAGASCAR',
                province_code: defaultProvinceCode,
                is_primary: true,
            }],
        });

        setIsNewPerson(true);
        setIsEditMode(false);
        setCurrentPersonId(null);
    };

    const populateFormWithExistingPerson = (existingPerson: ExistingPerson) => {
        console.log('Populating form with existing person:', existingPerson);

        // Populate basic person information
        if (existingPerson.surname) {
            personForm.setValue('surname', existingPerson.surname.toUpperCase());
        }
        if (existingPerson.first_name) {
            personForm.setValue('first_name', existingPerson.first_name.toUpperCase());
        }
        if (existingPerson.middle_name) {
            personForm.setValue('middle_name', existingPerson.middle_name.toUpperCase());
        }
        if (existingPerson.person_nature) {
            personForm.setValue('person_nature', existingPerson.person_nature.toUpperCase());
        }
        if (existingPerson.birth_date) {
            personForm.setValue('birth_date', existingPerson.birth_date);
        }
        if (existingPerson.nationality_code) {
            personForm.setValue('nationality_code', existingPerson.nationality_code.toUpperCase());
        }
        if (existingPerson.preferred_language) {
            personForm.setValue('preferred_language', existingPerson.preferred_language);
        }

        // Populate contact information
        if (existingPerson.email_address) {
            personForm.setValue('email_address', existingPerson.email_address.toUpperCase());
        }
        if (existingPerson.work_phone) {
            personForm.setValue('work_phone', existingPerson.work_phone);
        }
        if (existingPerson.cell_phone) {
            personForm.setValue('cell_phone', existingPerson.cell_phone);
        }
        if (existingPerson.cell_phone_country_code) {
            personForm.setValue('cell_phone_country_code', existingPerson.cell_phone_country_code);
        } else {
            personForm.setValue('cell_phone_country_code', '+261');
        }

        // Populate aliases if they exist
        if (existingPerson.aliases && existingPerson.aliases.length > 0) {
            const transformedAliases = existingPerson.aliases.map(alias => ({
                document_type: alias.document_type?.toUpperCase() || 'MG_ID',
                document_number: alias.document_number?.toUpperCase() || '',
                country_of_issue: alias.country_of_issue?.toUpperCase() || 'MG',
                name_in_document: alias.name_in_document?.toUpperCase() || '',
                is_primary: alias.is_primary || false,
                is_current: alias.is_current !== false,
                expiry_date: alias.expiry_date || '',
            }));

            personForm.setValue('aliases', transformedAliases);
        }

        // Populate addresses if they exist
        if (existingPerson.addresses && existingPerson.addresses.length > 0) {
            const transformedAddresses = existingPerson.addresses.map(address => ({
                address_type: address.address_type?.toUpperCase() || 'RESIDENTIAL',
                street_line1: address.street_line1?.toUpperCase() || '',
                street_line2: address.street_line2?.toUpperCase() || '',
                locality: address.locality?.toUpperCase() || '',
                postal_code: address.postal_code || '',
                town: address.town?.toUpperCase() || '',
                country: address.country?.toUpperCase() || 'MADAGASCAR',
                province_code: address.province_code?.toUpperCase() || '',
                is_primary: address.is_primary || false,
            }));

            personForm.setValue('addresses', transformedAddresses);
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
            if (currentStep === 0) {
                await lookupForm.trigger();
                const isValid = lookupForm.formState.isValid;
                markStepValid(0, isValid);
                return isValid;
            } else {
                const stepFields = getStepFields(currentStep);
                if (stepFields.length > 0) {
                    const isValid = await personForm.trigger(stepFields as any);
                    markStepValid(currentStep, isValid);
                    return isValid;
                } else {
                    markStepValid(currentStep, true);
                    return true;
                }
            }
        } catch (error) {
            console.error('Validation error:', error);
            markStepValid(currentStep, false);
            return false;
        }
    };

    const getStepFields = (step: number) => {
        const stepFieldMap = [
            [], // Lookup step
            ['surname', 'first_name', 'person_nature', 'nationality_code', 'preferred_language'],
            [],
            [],
            [],
            [],
        ];
        return stepFieldMap[step] || [];
    };

    const handleNext = async () => {
        const isValid = await validateCurrentStep();

        if (isValid) {
            if (currentStep === 0) {
                const lookupData = lookupForm.getValues();
                await performLookup(lookupData);
            } else if (currentStep < steps.length - 1) {
                setCurrentStep(currentStep + 1);
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleStepClick = (stepIndex: number) => {
        if (stepIndex < currentStep || stepValidation[stepIndex]) {
            setCurrentStep(stepIndex);
        }
        if (stepIndex === 0 && !isNewPerson) {
            setCurrentStep(stepIndex);
        }
    };

    const handleSubmit = async () => {
        if (isEditMode && personFound) {
            // For existing person, just pass it back
            if (onPersonSelected) {
                onPersonSelected(personFound, true);
            }
        } else {
            // For new person, create a mock person object
            const formData = personForm.getValues();
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
                aliases: formData.aliases
            };

            if (onPersonSelected) {
                onPersonSelected(person, false);
            }
        }
    };

    // Simplified render functions for compact design
    const renderLookupStep = () => (
        <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Enter document details to search for existing person or register new person.
            </Typography>

            <form onSubmit={lookupForm.handleSubmit(performLookup)}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                        <Controller
                            name="document_type"
                            control={lookupForm.control}
                            render={({ field }) => (
                                <FormControl fullWidth size="small" error={!!lookupForm.formState.errors.document_type}>
                                    <InputLabel>Document Type *</InputLabel>
                                    <Select {...field} label="Document Type *">
                                        {documentTypes.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    <FormHelperText>
                                        {lookupForm.formState.errors.document_type?.message || 'Select document type'}
                                    </FormHelperText>
                                </FormControl>
                            )}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Controller
                            name="document_number"
                            control={lookupForm.control}
                            render={({ field }) => (
                                <TextField
                                    name={field.name}
                                    value={field.value || ''}
                                    fullWidth
                                    size="small"
                                    label="Document Number *"
                                    error={!!lookupForm.formState.errors.document_number}
                                    helperText={lookupForm.formState.errors.document_number?.message || 'Enter document number'}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        field.onChange(value);
                                    }}
                                    onBlur={field.onBlur}
                                    InputProps={{
                                        endAdornment: field.value && (
                                            <InputAdornment position="end">
                                                <IconButton onClick={() => lookupForm.setValue('document_number', '')} size="small">
                                                    <ClearIcon />
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            )}
                        />
                    </Grid>

                    <Grid item xs={12} md={2}>
                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            size="small"
                            disabled={lookupLoading}
                            startIcon={lookupLoading ? <CircularProgress size={16} /> : <SearchIcon />}
                            sx={{ 
                                height: '40px',
                                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px'
                            }}
                        >
                            {lookupLoading ? 'Searching...' : 'Search'}
                        </Button>
                    </Grid>
                </Grid>
            </form>
        </Box>
    );

    const renderPersonalInformationStep = () => (
        <Box>
            {isEditMode && (
                <Alert severity="info" sx={{ mb: 2, py: 1 }}>
                    <Typography variant="body2">
                        Person found in system. You can review and use this person for the application.
                    </Typography>
                </Alert>
            )}

            <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                    <Controller
                        name="surname"
                        control={personForm.control}
                        render={({ field }) => (
                            <TextField
                                name={field.name}
                                value={field.value || ''}
                                fullWidth
                                size="small"
                                label="Surname *"
                                error={!!personForm.formState.errors.surname}
                                helperText={personForm.formState.errors.surname?.message || 'Family name'}
                                onChange={(e) => {
                                    const value = e.target.value.toUpperCase();
                                    field.onChange(value);
                                }}
                                onBlur={field.onBlur}
                                disabled={isEditMode}
                            />
                        )}
                    />
                </Grid>

                <Grid item xs={12} md={4}>
                    <Controller
                        name="first_name"
                        control={personForm.control}
                        render={({ field }) => (
                            <TextField
                                name={field.name}
                                value={field.value || ''}
                                fullWidth
                                size="small"
                                label="First Name *"
                                error={!!personForm.formState.errors.first_name}
                                helperText={personForm.formState.errors.first_name?.message || 'Given name'}
                                onChange={(e) => {
                                    const value = e.target.value.toUpperCase();
                                    field.onChange(value);
                                }}
                                onBlur={field.onBlur}
                                disabled={isEditMode}
                            />
                        )}
                    />
                </Grid>

                <Grid item xs={12} md={4}>
                    <Controller
                        name="middle_name"
                        control={personForm.control}
                        render={({ field }) => (
                            <TextField
                                name={field.name}
                                value={field.value || ''}
                                fullWidth
                                size="small"
                                label="Middle Name"
                                helperText="Optional"
                                onChange={(e) => {
                                    const value = e.target.value.toUpperCase();
                                    field.onChange(value);
                                }}
                                onBlur={field.onBlur}
                                disabled={isEditMode}
                            />
                        )}
                    />
                </Grid>

                <Grid item xs={12} md={3}>
                    <Controller
                        name="person_nature"
                        control={personForm.control}
                        render={({ field }) => (
                            <FormControl fullWidth size="small" error={!!personForm.formState.errors.person_nature}>
                                <InputLabel>Gender *</InputLabel>
                                <Select
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    label="Gender *"
                                    disabled={isEditMode}
                                >
                                    {personNatures.map((option) => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                                <FormHelperText>
                                    {personForm.formState.errors.person_nature?.message || 'Select gender'}
                                </FormHelperText>
                            </FormControl>
                        )}
                    />
                </Grid>

                <Grid item xs={12} md={3}>
                    <Controller
                        name="birth_date"
                        control={personForm.control}
                        render={({ field }) => (
                            <TextField
                                name={field.name}
                                value={field.value || ''}
                                fullWidth
                                size="small"
                                type="date"
                                label="Date of Birth"
                                InputLabelProps={{ shrink: true }}
                                helperText="Birth date"
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                disabled={isEditMode}
                            />
                        )}
                    />
                </Grid>

                <Grid item xs={12} md={3}>
                    <Controller
                        name="nationality_code"
                        control={personForm.control}
                        render={({ field }) => (
                            <FormControl fullWidth size="small">
                                <InputLabel>Nationality *</InputLabel>
                                <Select
                                    value={field.value || 'MG'}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    label="Nationality *"
                                    disabled={isEditMode}
                                >
                                    <MenuItem value="MG">MALAGASY</MenuItem>
                                    <MenuItem value="FR">FRENCH</MenuItem>
                                    <MenuItem value="US">AMERICAN</MenuItem>
                                </Select>
                            </FormControl>
                        )}
                    />
                </Grid>

                <Grid item xs={12} md={3}>
                    <Controller
                        name="preferred_language"
                        control={personForm.control}
                        render={({ field }) => (
                            <FormControl fullWidth size="small" error={!!personForm.formState.errors.preferred_language}>
                                <InputLabel>Language *</InputLabel>
                                <Select
                                    value={field.value || (languages.length > 0 ? languages[0].value : 'MG')}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    label="Language *"
                                    disabled={isEditMode}
                                >
                                    {languages.map((option) => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                                <FormHelperText>
                                    {personForm.formState.errors.preferred_language?.message || 'Preferred language'}
                                </FormHelperText>
                            </FormControl>
                        )}
                    />
                </Grid>
            </Grid>
        </Box>
    );

    const renderReviewStep = () => {
        const formData = personForm.getValues();
        
        return (
            <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                    {isEditMode ? 'Existing Person Found' : 'Review New Person'}
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
                                <strong>Gender:</strong> {personNatures.find(n => n.value === formData.person_nature)?.label || 'N/A'}
                            </Typography>
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="body2">
                                <strong>Birth Date:</strong> {formData.birth_date || 'Not provided'}
                            </Typography>
                        </Grid>
                    </Grid>
                </Paper>

                <Alert severity={isEditMode ? "info" : "success"} sx={{ mt: 2 }}>
                    <Typography variant="body2">
                        {isEditMode 
                            ? 'This person already exists in the system and can be used for the application.'
                            : 'Ready to use this person information for the learner\'s permit application.'
                        }
                    </Typography>
                </Alert>
            </Box>
        );
    };

    // Simplified render step content for compact form
    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return renderLookupStep();
            case 1:
                return renderPersonalInformationStep();
            case 2:
                return <Typography>Contact step simplified for compact form</Typography>;
            case 3:
                return <Typography>Documents step simplified for compact form</Typography>;
            case 4:
                return <Typography>Address step simplified for compact form</Typography>;
            case 5:
                return renderReviewStep();
            default:
                return null;
        }
    };

    if (lookupsLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading form data...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ 
            bgcolor: '#f8f9fa',
            p: 2,
            borderRadius: 2
        }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Person Information
            </Typography>

            {/* Error/Success Messages */}
            {error && (
                <Alert severity="error" sx={{ mb: 2, py: 1 }}>
                    <Typography variant="body2">{error}</Typography>
                </Alert>
            )}
            
            {success && (
                <Alert severity="success" sx={{ mb: 2, py: 1 }}>
                    <Typography variant="body2">{success}</Typography>
                </Alert>
            )}

            {/* Horizontal Tabs */}
            <Paper 
                elevation={0}
                sx={{ 
                    bgcolor: 'white',
                    boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                    borderRadius: 2,
                    mb: 2
                }}
            >
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs 
                        value={currentStep} 
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{ px: 2 }}
                    >
                        {steps.map((step, index) => {
                            const canNavigate = (index < currentStep || stepValidation[index] || (index === 0 && !isNewPerson));
                            
                            return (
                                <Tab
                                    key={step}
                                    label={step}
                                    disabled={!canNavigate}
                                    onClick={() => canNavigate && handleStepClick(index)}
                                    sx={{ 
                                        textTransform: 'none',
                                        fontWeight: stepValidation[index] ? 600 : 400,
                                        minHeight: 48,
                                        cursor: canNavigate ? 'pointer' : 'default',
                                    }}
                                />
                            );
                        })}
                    </Tabs>
                </Box>

                {/* Step Content */}
                <Box sx={{ p: 3 }}>
                    {renderStepContent()}
                </Box>
            </Paper>

            {/* Navigation */}
            <Paper 
                elevation={0}
                sx={{ 
                    p: 2,
                    bgcolor: 'white',
                    boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                    borderRadius: 2
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {onCancel && (
                        <Button
                            onClick={onCancel}
                            color="secondary"
                            size="small"
                        >
                            Cancel
                        </Button>
                    )}
                    
                    <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                        <Button
                            disabled={currentStep === 0}
                            onClick={handleBack}
                            startIcon={<ArrowBackIcon />}
                            size="small"
                        >
                            Back
                        </Button>
                        
                        <Button
                            variant="contained"
                            onClick={currentStep === steps.length - 1 ? handleSubmit : handleNext}
                            disabled={!stepValidation[currentStep] && currentStep !== 0}
                            endIcon={currentStep !== steps.length - 1 ? <ArrowForwardIcon /> : <PersonAddIcon />}
                            size="small"
                            sx={{
                                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px'
                            }}
                        >
                            {currentStep === 0 ? 'Search' : currentStep === steps.length - 1 ? 'Use Person' : 'Next'}
                        </Button>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
};

export default CompactPersonForm;