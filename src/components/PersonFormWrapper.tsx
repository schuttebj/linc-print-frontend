/**
 * PersonFormWrapper - Reusable Person Form Component
 * Handles person creation/editing with context-aware navigation
 * Multi-step registration/editing adapted for Madagascar natural persons
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    Card,
    CardContent,
    FormControlLabel,
    Checkbox,
    IconButton,
    InputAdornment,
    Chip,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
} from '@mui/material';
import {
    Search as SearchIcon,
    PersonAdd as PersonAddIcon,
    Edit as EditIcon,
    Clear as ClearIcon,
    Visibility as VisibilityIcon,
    Warning as WarningIcon,
    ArrowForward as ArrowForwardIcon,
    ArrowBack as ArrowBackIcon,
    CheckCircle as CheckCircleIcon,
    Person as PersonIcon,
    ContactPhone as ContactPhoneIcon,
    Badge as BadgeIcon,
    Home as HomeIcon,
    Preview as PreviewIcon,
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useSearchParams } from 'react-router-dom';

import { usePersonFormValidation, stepFieldConfig } from '../hooks/usePersonFormValidation';
import { useFieldStyling, useSelectStyling } from '../hooks/useFieldStyling';
import { useDebounceValidation } from '../hooks/useDebounceValidation';
import { useGlobalValidationState } from '../hooks/useGlobalValidationState';
import { ValidatedTextField, ValidatedSelect } from './ValidatedFormField';

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
    work_phone_country_code?: string;
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

// Lookup data state - will be populated from backend enums
// These are now loaded dynamically from the backend instead of hardcoded

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
            // Madagascar cell phone: 10 digits starting with 0AA BB BB BBB
            return /^0\d{9}$/.test(value);
        }),

    aliases: yup.array().of(
        yup.object({
            document_type: yup.string().required('Document type is required'),
            document_number: yup.string().required('Document number is required'),
            country_of_issue: yup.string().required('Country of issue is required'),
            expiry_date: yup.string().when('document_type', {
                is: 'PASSPORT',
                then: () => yup.string().required('Expiry date is required for passports'),
                otherwise: () => yup.string(),
            }),
        })
    ).min(1, 'At least one identification document is required'),

    addresses: yup.array().of(
        yup.object({
            address_type: yup.string().required('Address type is required'),
            street_line1: yup.string().required('Street address is required'),
            locality: yup.string().required('Locality is required'),
            postal_code: yup.string()
                .required('Postal code is required')
                .matches(/^\d{3}$/, 'Madagascar postal code must be exactly 3 digits'),
            town: yup.string().required('Town is required'),
            country: yup.string().required('Country is required'),
            province_code: yup.string().required('Province is required'),
        })
    ).min(1, 'At least one address is required'),
});

const steps = [
    { label: 'Lookup', icon: <SearchIcon /> },
    { label: 'Details', icon: <PersonIcon /> },
    { label: 'Contact', icon: <ContactPhoneIcon /> },
    { label: 'Documents', icon: <BadgeIcon /> },
    { label: 'Address', icon: <HomeIcon /> },
    { label: 'Review', icon: <PreviewIcon /> },
];

// Props interface for PersonFormWrapper
interface PersonFormWrapperProps {
    mode?: 'standalone' | 'application' | 'search';
    onComplete?: (person: any) => void;
    onCancel?: () => void;
    onSuccess?: (person: any, isEdit: boolean) => void;
    onPersonStepChange?: (step: number, canAdvance: boolean) => void;
    onPersonValidationChange?: (step: number, isValid: boolean) => void;
    onContinueToApplication?: () => void; // New: handler for "Continue to License" button
    // New props for external navigation control
    onNavigationStateChange?: (state: {
        currentStep: number;
        isNextDisabled: boolean;
        isBackDisabled: boolean;
        nextButtonText: string;
        isLoading: boolean;
        isExistingPerson: boolean;
        totalSteps: number;
    }) => void;
    onPersonNext?: React.MutableRefObject<() => Promise<boolean>>;
    onPersonBack?: React.MutableRefObject<() => boolean>;
    externalPersonStep?: number;
    initialPersonId?: string;
    title?: string;
    subtitle?: string;
    showHeader?: boolean;
    skipFirstStep?: boolean;
}

const PersonFormWrapper: React.FC<PersonFormWrapperProps> = ({
    mode = 'standalone',
    onComplete,
    onCancel,
    onSuccess,
    onPersonStepChange,
    onPersonValidationChange,
    onContinueToApplication,
    externalPersonStep,
    onPersonNext,
    onPersonBack,
    initialPersonId,
    title = "Person Management",
    subtitle = "Register new Madagascar citizens for driver's license applications.",
    showHeader = true,
    skipFirstStep = false,
}) => {
    // Auth
    const { user, hasPermission, accessToken } = useAuth();

    // URL parameters for editing
    const [searchParams] = useSearchParams();

    // Form validation hook
    const formValidation = usePersonFormValidation();
    
    // Debounced validation to prevent memory leaks and excessive calls
    const { debouncedValidation, getImmediateValidation, clearValidationCache } = useDebounceValidation(
        formValidation.validateField,
        300 // 300ms debounce delay
    );

    // Wrapper functions for form error handling with proper types
    const setPersonError = (name: string, error: any) => {
        personForm.setError(name as any, error);
    };
    
    const clearPersonErrors = (name: string) => {
        personForm.clearErrors(name as any);
    };

    const setLookupError = (name: string, error: any) => {
        lookupForm.setError(name as any, error);
    };
    
    const clearLookupErrors = (name: string) => {
        lookupForm.clearErrors(name as any);
    };



    // Ref for auto-scrolling to active step content
    const stepContentRef = useRef<HTMLDivElement>(null);

    // State management
    const [internalCurrentStep, setInternalCurrentStep] = useState(skipFirstStep ? 1 : 0);
    const currentStep = mode === 'application' && externalPersonStep !== undefined ? externalPersonStep : internalCurrentStep;
    
    // Helper function to set step and notify parent
    const setCurrentStep = (step: number) => {
        console.log('🎯 PersonFormWrapper: setCurrentStep called with step:', step, 'mode:', mode);
        if (mode === 'application' && onPersonStepChange) {
            // In application mode, let parent control the step
            console.log('🎯 PersonFormWrapper: Notifying parent of step change:', step);
            onPersonStepChange(step, true);
        } else {
            // In standalone/search mode, control internally
            console.log('🎯 PersonFormWrapper: Setting internal step:', step);
            setInternalCurrentStep(step);
        }
        

    };
    

    const [personFound, setPersonFound] = useState<ExistingPerson | null>(null);
    const [currentPersonId, setCurrentPersonId] = useState<string | null>(null);
    const [isNewPerson, setIsNewPerson] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [personDataWasIncomplete, setPersonDataWasIncomplete] = useState(false);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    // Legacy: Keep for compatibility with external components that expect stepValidation array
    const [stepValidation, setStepValidation] = useState<boolean[]>(new Array(steps.length).fill(false));
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [createdPerson, setCreatedPerson] = useState<any>(null);
    const [duplicateCheckLoading, setDuplicateCheckLoading] = useState(false);
    const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
    const [potentialDuplicates, setPotentialDuplicates] = useState<any[]>([]);
    const [duplicateThreshold] = useState(70.0);
    const [pendingPersonPayload, setPendingPersonPayload] = useState<any>(null);
    const [pendingAddressPayloads, setPendingAddressPayloads] = useState<any[]>([]);
    const [parentNotified, setParentNotified] = useState(false);
    const [isExistingPerson, setIsExistingPerson] = useState(false);
    // Track which steps have been completed to allow navigation back to them
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

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
            nationality_code: '',
            preferred_language: '',
            email_address: '',
            work_phone: '',
            work_phone_country_code: '+261',
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
                country: 'MG',
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

    // Watch form values
    const watchedPersonNature = personForm.watch('person_nature');
    
    // Step validation - simple approach for dual navigation
    const markStepValid = (stepIndex: number, isValid: boolean) => {
        // Update validation array
        const newValidation = [...stepValidation];
        newValidation[stepIndex] = isValid;
        setStepValidation(newValidation);
        
        // If step becomes valid, mark it as completed
        if (isValid) {
            setCompletedSteps(prev => new Set([...prev, stepIndex]));
        }
        
        // Notify parent about validation state changes (for application mode)
        if (mode === 'application' && onPersonValidationChange) {
            onPersonValidationChange(stepIndex, isValid);
        }
    };

    // Function to trigger step validation
    const triggerStepValidation = useCallback(async (stepIndex: number) => {
        console.log(`🔄 Triggering step validation for step ${stepIndex}`);
        
        const formData = personForm.getValues();
        const lookupData = lookupForm.getValues();
        const stepData = stepIndex === 0 ? lookupData : formData;
        
        const validation = formValidation.validateStep(stepIndex, stepData);
        markStepValid(stepIndex, validation.isValid);
    }, [formValidation, lookupForm, personForm, markStepValid]);

    // Function to focus the first field in the current step
    const focusFirstField = useCallback((stepIndex: number) => {
        setTimeout(() => {
            let selector = '';
            switch (stepIndex) {
                case 0: // Lookup step
                    selector = 'input[name="document_number"]';
                    break;
                case 1: // Details step
                    selector = 'input[name="surname"]';
                    break;
                case 2: // Contact step
                    selector = 'input[name="email_address"]';
                    break;
                case 3: // Documents step
                    selector = 'input[name="aliases.0.name_in_document"]';
                    break;
                case 4: // Address step
                    selector = 'input[name="addresses.0.street_line1"]';
                    break;
                default:
                    return;
            }
            
            const firstField = document.querySelector(selector) as HTMLInputElement;
            if (firstField) {
                firstField.focus();
                // Also select the text if it's not empty
                if (firstField.value) {
                    firstField.select();
                }
            }
        }, 100); // Small delay to ensure the step content is rendered
    }, []);

    // Reset validation when new person mode starts
    useEffect(() => {
        if (isNewPerson) {
            console.log('🆕 New person mode: resetting validation state');
            setStepValidation(new Array(steps.length).fill(false));
        }
    }, [isNewPerson, steps.length]);

    // Note: Removed auto-validation useEffect to prevent infinite loops
    // Validation now happens only on field changes and manual navigation

    // Context-aware completion handler
    const handleFormComplete = (person: any) => {
        console.log('🎯 PersonFormWrapper: handleFormComplete called with person:', person);
        console.log('🎯 PersonFormWrapper: mode:', mode, 'onSuccess callback exists:', !!onSuccess);
        setCreatedPerson(person);
        
        // If onSuccess callback is provided, use it
        if (onSuccess && !parentNotified) {
            console.log('🎯 PersonFormWrapper: Calling onSuccess callback with person:', person?.id);
            onSuccess(person, isEditMode);
            
            // For new persons in application mode, also proceed to next step
            if (mode === 'application' && !isEditMode && onComplete) {
                console.log('🎯 PersonFormWrapper: New person created, proceeding to next step');
                onComplete(person);
                return;
            }
            return;
        } else if (parentNotified) {
            console.log('🎯 PersonFormWrapper: Parent already notified, skipping onSuccess call');
            return;
        }
        
        // Fallback to original behavior
        switch (mode) {
            case 'standalone':
                // Show success dialog with options
                setShowSuccessDialog(true);
                break;
            case 'application':
                // Call onComplete to proceed to next step
                if (onComplete) {
                    onComplete(person);
                }
                break;
            case 'search':
                // Navigate back to search or call onComplete
                if (onComplete) {
                    onComplete(person);
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
            case 'application':
            case 'search':
                if (onCancel) {
                    onCancel();
                }
                break;
        }
    };

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
                // Fallback data will be used from the service
            } finally {
                setLookupsLoading(false);
            }
        };

        loadLookupData();
    }, []);

    // Update form defaults after lookup data is loaded
    useEffect(() => {
        if (!lookupsLoading && 
            documentTypes.length > 0 && 
            personNatures.length > 0 && 
            languages.length > 0 && 
            nationalities.length > 0 && 
            phoneCountryCodes.length > 0 && 
            countries.length > 0 && 
            provinces.length > 0 && 
            addressTypes.length > 0 &&
            !isEditMode && // Only set defaults for new forms, not when editing
            !personFound // Only for new persons, not when person is found
        ) {
            // Get first option from each enum
            const defaultPersonNature = personNatures[0].value;
            const defaultNationality = nationalities[0].value;
            const defaultLanguage = languages[0].value;
            const defaultPhoneCountryCode = phoneCountryCodes[0].value;
            const defaultDocumentType = documentTypes[0].value;
            const defaultCountry = countries[0].value;
            const defaultAddressType = addressTypes[0].value;
            const defaultProvinceCode = provinces[0].code;

            // Update form with first enum values
            personForm.setValue('person_nature', defaultPersonNature);
            personForm.setValue('nationality_code', defaultNationality);
            personForm.setValue('preferred_language', defaultLanguage);
            personForm.setValue('cell_phone_country_code', defaultPhoneCountryCode);
            personForm.setValue('aliases.0.document_type', defaultDocumentType);
            personForm.setValue('aliases.0.country_of_issue', defaultCountry);
            personForm.setValue('addresses.0.address_type', defaultAddressType);
            personForm.setValue('addresses.0.province_code', defaultProvinceCode);
            personForm.setValue('addresses.0.country', defaultCountry);

            // Also update lookup form default
            lookupForm.setValue('document_type', defaultDocumentType);

            console.log('✅ Form defaults updated with first enum values', {
                defaultDocumentType,
                defaultPersonNature,
                defaultNationality,
                defaultLanguage
            });
        }
    }, [lookupsLoading, documentTypes, personNatures, languages, nationalities, phoneCountryCodes, countries, provinces, addressTypes, isEditMode, personFound, personForm, lookupForm]);

    // Handle URL parameters for editing and initialPersonId prop
    useEffect(() => {
        const editPersonId = searchParams.get('edit') || initialPersonId;
        if (editPersonId && accessToken) {
            fetchPersonForEditing(editPersonId);
        }
    }, [searchParams, initialPersonId, accessToken]);

    // Auto-scroll to step content when step changes
    useEffect(() => {
        if (stepContentRef.current) {
            const elementTop = stepContentRef.current.offsetTop;
            const offsetPosition = elementTop - 80; // 80px offset for fixed headers
            
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    }, [currentStep]);



    // Fetch existing person for editing
    const fetchPersonForEditing = async (personId: string) => {
        setLookupLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/persons/${personId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch person: ${response.statusText}`);
            }

            const existingPerson = await response.json();
            console.log('Fetched person for editing:', existingPerson);

            // Set up form for editing
            setPersonFound(existingPerson);
            setCurrentPersonId(personId);
            setIsEditMode(true);
            setIsNewPerson(false);

            // Populate form with existing data
            populateFormWithExistingPerson(existingPerson);

            // Mark all steps as valid since we have existing data
            setStepValidation(new Array(steps.length).fill(true));

            // Skip to personal information step
            setCurrentStep(1);

        } catch (error) {
            console.error('Failed to fetch person for editing:', error);
            alert(`Failed to load person for editing: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setLookupLoading(false);
        }
    };

    // Step 1: Document Lookup functionality
    const performLookup = async (data: PersonLookupForm) => {
        setLookupLoading(true);
        
        // Validate the lookup data first
        const lookupValidation = formValidation.validateStep(0, data);
        if (!lookupValidation.isValid) {
            console.log('Lookup validation failed:', lookupValidation.errors);
            Object.keys(lookupValidation.errors).forEach(field => {
                lookupForm.setError(field as any, { 
                    type: 'manual', 
                    message: lookupValidation.errors[field] 
                });
            });
            setLookupLoading(false);
            return;
        }
        
        // Reset flags for new lookup
        setIsExistingPerson(false);
        setParentNotified(false);

        try {
            console.log('Looking up person with:', data);

            // Search for existing person using the document details
            const searchQuery = new URLSearchParams({
                document_type: data.document_type,
                document_number: data.document_number,
                include_details: 'true',
                limit: '50' // Get more results to filter for exact match
            });

            const response = await fetch(`${API_BASE_URL}/api/v1/persons/search?${searchQuery}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (response.ok) {
                const searchResult = await response.json();
                console.log('Search result:', searchResult);
                console.log('Search result structure:', JSON.stringify(searchResult, null, 2));

                if (Array.isArray(searchResult) && searchResult.length > 0) {
                    // Filter for EXACT document number match
                    const exactMatch = searchResult.find(person => {
                        if (person.aliases && Array.isArray(person.aliases)) {
                            return person.aliases.some(alias => 
                                alias.document_type === data.document_type &&
                                alias.document_number === data.document_number
                            );
                        }
                        return false;
                    });

                    if (exactMatch) {
                        // Person found with exact document number match
                        const existingPerson = exactMatch;
                        console.log('Person found with exact document number match:', existingPerson);
                    console.log('Person fields:', Object.keys(existingPerson));
                    setPersonFound(existingPerson);
                    setCurrentPersonId(existingPerson.id);
                    setIsNewPerson(false);
                    setIsEditMode(true);

                    // Populate form with existing person data
                    populateFormWithExistingPerson(existingPerson);
                    
                    // For application mode, check if person data is complete
                    if (mode === 'application') {
                        markStepValid(0, true); // Lookup step is always valid
                        markStepValid(1, true); // Person details step is valid since person was found
                        
                        const isComplete = isPersonDataComplete(existingPerson);
                        setPersonDataWasIncomplete(!isComplete);
                        
                        if (isComplete) {
                            // Person has complete information - mark as existing and all steps valid
                            setIsExistingPerson(true);
                            
                            // Mark all steps as valid and completed immediately
                            console.log('✅ Marking all steps as valid and completed for existing person');
                            const allStepIndices = Array.from({ length: steps.length }, (_, i) => i);
                            allStepIndices.forEach(stepIndex => markStepValid(stepIndex, true));
                            setCompletedSteps(new Set(allStepIndices));
                            
                            setCurrentStep(5); // Jump to review step for confirmation
                            
                            // In application mode, notify parent immediately for validation
                            // but mark that we need to save when Next is clicked
                            if (mode === 'application') {
                                console.log('🎯 PersonFormWrapper: Found complete person, notifying parent immediately');
                                console.log('🎯 PersonFormWrapper: Will save when Next button is clicked to capture clerk updates');
                                // Set the person in parent state immediately so validation works
                                if (onSuccess) {
                                    onSuccess(existingPerson, true);
                                    setParentNotified(true);
                                }
                                // Don't call handleFormComplete - let external navigation trigger save
                            } else {
                                // Only auto-complete in standalone mode
                                console.log('🎯 PersonFormWrapper: Standalone mode - triggering onSuccess immediately');
                                setTimeout(() => {
                                    handleFormComplete(existingPerson);
                                }, 100);
                            }
                        } else {
                            // Person has incomplete information - start at personal info step
                            setCurrentStep(1);
                            focusFirstField(1);
                        }
                    } else {
                        // For standalone mode, proceed to personal information step
                        markStepValid(0, true);
                        markStepValid(1, true); // Person details step is valid since person was found
                        setCurrentStep(1);
                        focusFirstField(1);
                    }
                } else {
                        // No exact match found - setup for new person creation
                        console.log('No exact document number match found, creating new person');
                        setPersonFound(null);
                        setCurrentPersonId(null);
                        setIsNewPerson(true);
                        setIsEditMode(false);
                        setupNewPersonForm(data);
                        markStepValid(0, true);
                        setCurrentStep(1);
                        focusFirstField(1);
                    }
                } else {
                    // No search results at all - setup for new person creation
                    console.log('No person found in search, creating new');
                    setPersonFound(null);
                    setCurrentPersonId(null);
                    setIsNewPerson(true);
                    setIsEditMode(false);
                    setupNewPersonForm(data);
                    markStepValid(0, true);
                    setCurrentStep(1);
                    focusFirstField(1);
                }
            } else {
                console.error('Search failed with status:', response.status);
                const errorText = await response.text();
                console.error('Error response:', errorText);
                // Fallback to new person creation on API failure
                setPersonFound(null);
                setIsNewPerson(true);
                setupNewPersonForm(data);
                markStepValid(0, true);
                setCurrentStep(1);
                focusFirstField(1);
            }

        } catch (error) {
            console.error('Lookup failed:', error);
            // Fallback to new person creation on error
            setPersonFound(null);
            setIsNewPerson(true);
            setupNewPersonForm(data);
            markStepValid(0, true);
            setCurrentStep(1);
            focusFirstField(1);
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
        const defaultDocumentType = documentTypes.length > 0 ? documentTypes[0].value : 'MADAGASCAR_ID';
        const defaultCountry = countries.length > 0 ? countries[0].value : 'MG';
        const defaultAddressType = addressTypes.length > 0 ? addressTypes[0].value : 'RESIDENTIAL';
        const defaultProvinceCode = provinces.length > 0 ? provinces[0].code : 'T';
        
        console.log('🏗️ Setting up new person form with defaults:', {
            defaultAddressType,
            defaultProvinceCode,
            provinces: provinces.slice(0, 3) // Show first 3 provinces for debugging
        });

        // Reset form with primary document from lookup - CAPITALIZED
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
                document_type: lookupData.document_type?.toUpperCase() || defaultDocumentType,
                document_number: lookupData.document_number?.toUpperCase() || '',
                country_of_issue: defaultCountry,
                name_in_document: '', // Will be auto-populated when user fills in names
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
                country: defaultCountry,
                province_code: defaultProvinceCode,
                is_primary: true,
            }],
        });

        console.log('🆕 NEW PERSON FORM INITIALIZED with address defaults:', {
            defaultAddressType,
            defaultProvinceCode,
            defaultCountry,
            initialAddress: {
                address_type: defaultAddressType,
                street_line1: '',
                street_line2: '',
                locality: '',
                postal_code: '',
                town: '',
                country: defaultCountry,
                province_code: defaultProvinceCode,
                is_primary: true,
            }
        });

        setIsNewPerson(true);
        setIsEditMode(false);
        setCurrentPersonId(null);
    };

    // Auto-populate name_in_document when transitioning from personal info to contact details step
    const populateNameInDocument = () => {
        if (isNewPerson && !isEditMode) {
            const formData = personForm.getValues();
            const { surname, first_name, middle_name } = formData;
            
            if (surname || first_name || middle_name) {
                const fullName = [first_name, middle_name, surname].filter(Boolean).join(' ').toUpperCase();
                
                // Update the primary alias (first one) with combined name
                if (formData.aliases && formData.aliases.length > 0) {
                    personForm.setValue('aliases.0.name_in_document', fullName);
                    console.log('Auto-populated name_in_document:', fullName);
                }
            }
        }
    };

    // Check if person has complete required information for applications
    const isPersonDataComplete = (person: ExistingPerson): boolean => {
        // Core identity fields
        if (!person.surname || !person.first_name || !person.person_nature || 
            !person.nationality_code || !person.preferred_language) {
            return false;
        }

        // At least one valid ID document
        if (!person.aliases || person.aliases.length === 0) {
            return false;
        }

        // Check if at least one document is current and has required fields
        const hasValidDocument = person.aliases.some(alias => 
            alias.is_current && alias.document_type && alias.document_number
        );
        if (!hasValidDocument) {
            return false;
        }

        // At least one address
        if (!person.addresses || person.addresses.length === 0) {
            return false;
        }

        // Check if at least one address has required fields
        const hasValidAddress = person.addresses.some(address => 
            address.locality && address.town && address.country
        );
        if (!hasValidAddress) {
            return false;
        }

        // At least one contact method (email or phone)
        if (!person.email_address && !person.cell_phone) {
            return false;
        }

        return true;
    };





    // Next button state - simple validation check
    const isNextButtonDisabled = useCallback((): boolean => {
        return !stepValidation[currentStep];
    }, [stepValidation, currentStep]);

    const populateFormWithExistingPerson = (existingPerson: ExistingPerson) => {
        console.log('Populating form with existing person:', existingPerson);

        // Populate basic person information - ALL CAPITALIZED
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

        // Populate contact information - EMAIL CAPITALIZED
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

        // Populate aliases (ID documents) if they exist - ALL CAPITALIZED
        if (existingPerson.aliases && existingPerson.aliases.length > 0) {
            console.log('Populating aliases:', existingPerson.aliases);
            const transformedAliases = existingPerson.aliases.map(alias => ({
                document_type: alias.document_type?.toUpperCase() || 'MADAGASCAR_ID',
                document_number: alias.document_number?.toUpperCase() || '',
                country_of_issue: alias.country_of_issue?.toUpperCase() || 'MG',
                name_in_document: alias.name_in_document?.toUpperCase() || '',
                is_primary: alias.is_primary || false,
                is_current: alias.is_current !== false, // default to true if undefined
                expiry_date: alias.expiry_date || '',
            }));

            // Clear existing aliases first, then set new ones
            personForm.setValue('aliases', transformedAliases);
            console.log('Aliases set to:', transformedAliases);
        }

        // Populate addresses if they exist - ALL CAPITALIZED
        if (existingPerson.addresses && existingPerson.addresses.length > 0) {
            console.log('✅ Populating addresses from existing person:', existingPerson.addresses);
            const transformedAddresses = existingPerson.addresses.map(address => ({
                address_type: address.address_type?.toUpperCase() || 'RESIDENTIAL',
                street_line1: address.street_line1?.toUpperCase() || '',
                street_line2: address.street_line2?.toUpperCase() || '',
                locality: address.locality?.toUpperCase() || '',
                postal_code: address.postal_code || '',
                town: address.town?.toUpperCase() || '',
                country: address.country?.toUpperCase() || 'MG',
                province_code: address.province_code?.toUpperCase() || '',
                is_primary: address.is_primary || false,
            }));

            // Clear existing addresses first, then set new ones
            personForm.setValue('addresses', transformedAddresses);
            console.log('✅ Addresses successfully set to form:', transformedAddresses);
            
            // Verify the addresses were set correctly
            setTimeout(() => {
                const currentAddresses = personForm.getValues('addresses');
                console.log('🔍 Current form addresses after setting:', currentAddresses);
            }, 100);
        } else {
            console.log('⚠️ No addresses found for existing person or addresses array is empty');
        }
        
        // Validate all steps after form is populated
        setTimeout(() => {
            validateAllExistingPersonData();
        }, 100);
    };

    // Function to validate all existing person data and navigate appropriately
    const validateAllExistingPersonData = async () => {
        console.log('🔍 Validating all existing person data');
        
        try {
            const formData = personForm.getValues();
            const lookupData = lookupForm.getValues();
            let allValid = true;
            let firstInvalidStep = -1;
            
            // Validate each step
            for (let i = 0; i < steps.length - 1; i++) { // Skip review step
                const validation = formValidation.validateStep(i, i === 0 ? lookupData : formData);
                markStepValid(i, validation.isValid);
                
                if (!validation.isValid) {
                    console.log(`⚠️ Step ${i} validation failed:`, validation.errors);
                    allValid = false;
                    if (firstInvalidStep === -1) {
                        firstInvalidStep = i;
                    }
                }
            }
            
            // Mark review step valid if all other steps are valid
            markStepValid(steps.length - 1, allValid);
            
            if (allValid) {
                console.log('✅ All existing person data is valid - navigating to review step');
                setCurrentStep(steps.length - 1); // Navigate to review step
            } else {
                console.log(`⚠️ Found invalid data - user can navigate manually to fix issues`);
                // Note: Removed automatic navigation to first invalid step
                // This allows users to freely navigate between completed steps
                // They can manually go to invalid steps when they want to fix them
            }
            
        } catch (error) {
            console.error('Error validating existing person data:', error);
        }
    };





    // Function to validate and update all step indicators
    const updateAllStepValidation = useCallback(async () => {
        console.log('🔄 Updating step validation indicators');
        
        try {
            const formData = personForm.getValues();
            const lookupData = lookupForm.getValues();
            
            // Validate each step using our validation hook and update step navigation
            for (let i = 0; i < steps.length - 1; i++) { // Skip review step
                const validation = formValidation.validateStep(i, i === 0 ? lookupData : formData);
                markStepValid(i, validation.isValid);
                
                if (!validation.isValid) {
                    console.log(`Step ${i} validation failed:`, validation.errors);
                }
            }

            // Review step is valid if all previous steps are valid
            const reviewStepValid = stepValidation.slice(0, -1).every(valid => valid);
            markStepValid(steps.length - 1, reviewStepValid);

            // Note: Removed automatic navigation to first invalid step
            // This was interfering with user's manual tab navigation
            // Users can now freely navigate between completed steps

        } catch (error) {
            console.error('Error updating step validation:', error);
        }
    }, [isExistingPerson, steps.length, stepValidation, personForm, lookupForm, formValidation, markStepValid]);

    const validateCurrentStep = async () => {
        console.log(`🔄 Validating step ${currentStep}`);
        
        try {
            if (currentStep === 0) {
                // Lookup step validation using our validation hook
                const lookupData = lookupForm.getValues();
                const validation = formValidation.validateStep(0, lookupData);
                console.log(`Step ${currentStep} lookup validation result:`, validation);
                markStepValid(currentStep, validation.isValid);
                
                // Set form errors if validation failed
                if (!validation.isValid) {
                    Object.keys(validation.errors).forEach(field => {
                        lookupForm.setError(field as any, { 
                            type: 'manual', 
                            message: validation.errors[field] 
                        });
                    });
                }
                
                return validation.isValid;
            } else if (currentStep > 0) {
                // Form steps validation using our validation hook
                const formData = personForm.getValues();
                const validation = formValidation.validateStep(currentStep, formData);
                console.log(`Step ${currentStep} validation result:`, validation);
                markStepValid(currentStep, validation.isValid);
                
                // Set form errors if validation failed
                if (!validation.isValid) {
                    Object.keys(validation.errors).forEach(field => {
                        personForm.setError(field as any, { 
                            type: 'manual', 
                            message: validation.errors[field] 
                        });
                    });
                }
                
                return validation.isValid;
            }
            
            markStepValid(currentStep, true);
            return true;
        } catch (error) {
            console.error(`Error validating step ${currentStep}:`, error);
            markStepValid(currentStep, false);
            return false;
        }
    };

    const handleNext = async () => {
        const isValid = await validateCurrentStep();

        if (isValid) {
            if (currentStep === 0) {
                const lookupData = lookupForm.getValues();
                await performLookup(lookupData);
            } else if (currentStep < steps.length - 1) {
                // Mark current step as completed since validation passed
                setCompletedSteps(prev => new Set([...prev, currentStep]));
                
                // Auto-populate name_in_document when moving from step 1 (personal info) to step 2 (contact details)
                if (currentStep === 1) {
                    populateNameInDocument();
                }
                const nextStep = currentStep + 1;
                setCurrentStep(nextStep);
                
                // Focus first field and trigger validation for the new step
                focusFirstField(nextStep);
                setTimeout(() => {
                    triggerStepValidation(nextStep);
                }, 100);
            }
        }
    };

    const handleBack = () => {
        const minStep = skipFirstStep ? 1 : 0;
        if (currentStep > minStep) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleStepClick = (stepIndex: number) => {
        // Prevent navigation to step 0 if skipFirstStep is true
        if (skipFirstStep && stepIndex === 0) {
            return;
        }
        
        // Enhanced tab navigation: allow clicking on completed steps, current step, or next step if current is valid
        const isCompletedStep = completedSteps.has(stepIndex);
        const isCurrentStep = stepIndex === currentStep;
        const isNextStepAvailable = stepIndex === currentStep + 1 && stepValidation[currentStep];
        
        if (isCompletedStep || isCurrentStep || isNextStepAvailable) {
            setCurrentStep(stepIndex);
            
            // Focus first field and trigger validation for the clicked step
            focusFirstField(stepIndex);
            setTimeout(() => {
                triggerStepValidation(stepIndex);
            }, 100);
        }
    };

    // Tab change handler for tabs
    const handleTabChange = async (event: React.SyntheticEvent, newValue: number) => {
        handleStepClick(newValue);
        // Update validation indicators when tab is clicked
        await updateAllStepValidation();
    };

    // Expose navigation functions for external control
    React.useEffect(() => {
        if (mode === 'application' && onPersonNext) {
            onPersonNext.current = async () => {
                const isValid = await validateCurrentStep();
                if (isValid) {
                    // Update all step validation indicators
                    await updateAllStepValidation();
                    
                    if (currentStep === 0) {
                        const lookupData = lookupForm.getValues();
                        await performLookup(lookupData);
                        return true;
                    } else if (currentStep < steps.length - 1) {
                        // Auto-populate name_in_document when moving from step 1 (personal info) to step 2 (contact details)
                        if (currentStep === 1) {
                            populateNameInDocument();
                        }
                        return true;
                    } else if (currentStep === steps.length - 1) {
                        // On final step (Review), submit the person form
                        console.log('🎯 PersonFormWrapper: Submitting person from external navigation');
                        console.log('🎯 PersonFormWrapper: This will save/update the person to capture any clerk changes');
                        try {
                            await handleSubmit();
                            return true;
                        } catch (error) {
                            console.error('🚨 PersonFormWrapper: Submit failed:', error);
                            return false;
                        }
                    }
                }
                return false;
            };
        }
        
        if (mode === 'application' && onPersonBack) {
            onPersonBack.current = () => {
                const minStep = skipFirstStep ? 1 : 0;
                if (currentStep > minStep) {
                    // Update validation indicators when going back (fire and forget)
                    updateAllStepValidation();
                    return true;
                }
                return false;
            };
        }
    }, [mode, currentStep, onPersonNext, onPersonBack, validateCurrentStep, lookupForm, populateNameInDocument, performLookup, steps.length, skipFirstStep, updateAllStepValidation]);

    // Helper function to render tab with completion indicator  
    const renderTabLabel = React.useCallback((step: any, index: number) => {
        const isCompleted = completedSteps.has(index) && index !== currentStep;
        const isCurrent = currentStep === index;
        
        // Determine colors and icons
        let color = 'text.secondary';
        let icon = step.icon;
        
        if (isCompleted) {
            color = 'success.main';
            icon = <CheckCircleIcon fontSize="small" />;
        } else if (isCurrent) {
            color = 'primary.main';
            icon = step.icon;
        }
        
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    color 
                }}>
                    {icon}
                </Box>
                <Typography 
                    variant="body2" 
                    sx={{ 
                        fontWeight: isCurrent ? 'bold' : 'normal',
                        color
                    }}
                >
                    {step.label}
                </Typography>
            </Box>
        );
    }, [stepValidation, currentStep, completedSteps]);

    // Helper function to determine if a tab should be clickable
    const isTabClickable = React.useCallback((index: number) => {
        // Allow clicking on completed steps, current step, or next step if current is valid
        const isCompletedStep = completedSteps.has(index);
        const isCurrentStep = index === currentStep;
        const isNextStepAvailable = index === currentStep + 1 && stepValidation[currentStep];
        
        return isCompletedStep || isCurrentStep || isNextStepAvailable;
    }, [currentStep, stepValidation, completedSteps]);

    const handleSubmit = async () => {
        setSubmitLoading(true);

        try {
            const formData = personForm.getValues();
            console.log('📝 Raw form data from PersonFormWrapper:', formData);
            console.log('📍 Raw address data from form:', formData.addresses);
            
            // COMPREHENSIVE ADDRESS DEBUGGING
            console.log('🔍 DETAILED ADDRESS ANALYSIS:');
            console.log('- Address count:', formData.addresses?.length || 0);
            formData.addresses?.forEach((addr, idx) => {
                console.log(`- Address ${idx}:`, {
                    address_type: `"${addr.address_type}" (length: ${addr.address_type?.length || 0})`,
                    street_line1: `"${addr.street_line1}" (length: ${addr.street_line1?.length || 0})`,
                    locality: `"${addr.locality}" (length: ${addr.locality?.length || 0})`,
                    postal_code: `"${addr.postal_code}" (length: ${addr.postal_code?.length || 0})`,
                    town: `"${addr.town}" (length: ${addr.town?.length || 0})`,
                    province_code: `"${addr.province_code}" (length: ${addr.province_code?.length || 0})`,
                    is_primary: addr.is_primary,
                    country: addr.country
                });
                
                const missingFields = [];
                if (!addr.address_type?.trim()) missingFields.push('address_type');
                if (!addr.street_line1?.trim()) missingFields.push('street_line1');
                if (!addr.locality?.trim()) missingFields.push('locality');
                if (!addr.postal_code?.trim()) missingFields.push('postal_code');
                if (!addr.town?.trim()) missingFields.push('town');
                if (!addr.province_code?.trim()) missingFields.push('province_code');
                
                console.log(`- Address ${idx} missing fields:`, missingFields);
                console.log(`- Address ${idx} will be included:`, missingFields.length === 0);
            });

            // Transform form data to match backend schema with FULL CAPITALIZATION
            const personPayload = {
                // Basic person information - ALL CAPITALIZED
                surname: formData.surname?.toUpperCase() || '',
                first_name: formData.first_name?.toUpperCase() || '',
                middle_name: formData.middle_name?.toUpperCase() || undefined,
                person_nature: formData.person_nature?.toUpperCase() || '',
                birth_date: formData.birth_date || undefined,
                nationality_code: formData.nationality_code?.toUpperCase() || 'MG',
                preferred_language: formData.preferred_language || 'MG', // Language codes stay uppercase
                email_address: formData.email_address?.toUpperCase() || undefined,
                work_phone: formData.work_phone || undefined,
                cell_phone_country_code: formData.cell_phone_country_code || '+261',
                cell_phone: formData.cell_phone || undefined,
                is_active: true,

                // Transform aliases to match backend schema - ALL CAPITALIZED
                aliases: formData.aliases
                    .filter(alias => alias.document_number && alias.document_number.trim())
                    .map(alias => ({
                        document_type: alias.document_type?.toUpperCase() || '',
                        document_number: alias.document_number?.toUpperCase() || '',
                        country_of_issue: alias.country_of_issue?.toUpperCase() || 'MG',
                        name_in_document: alias.name_in_document?.toUpperCase() || undefined,
                        is_primary: alias.is_primary,
                        is_current: alias.is_current,
                        expiry_date: alias.expiry_date || undefined,
                    })),
                // NOTE: Addresses are handled separately via dedicated endpoints
            };

            // Prepare addresses separately for dedicated address endpoints
            const addressPayloads = formData.addresses
                .filter(address => {
                    // Include address if it has the required fields filled
                    const hasRequiredFields = address.street_line1 && address.street_line1.trim() &&
                                            address.locality && address.locality.trim() &&
                                            address.postal_code && address.postal_code.trim() &&
                                            address.town && address.town.trim() &&
                                            address.province_code && address.province_code.trim();
                    
                    console.log('🔍 Address validation check:', {
                        address,
                        hasRequiredFields,
                        street_line1: !!address.street_line1?.trim(),
                        locality: !!address.locality?.trim(),
                        postal_code: !!address.postal_code?.trim(),
                        town: !!address.town?.trim(),
                        province_code: !!address.province_code?.trim()
                    });
                    
                    return hasRequiredFields;
                })
                    .map(address => ({
                    address_type: address.address_type?.toUpperCase() || 'RESIDENTIAL',
                        is_primary: address.is_primary,
                    street_line1: address.street_line1?.toUpperCase() || '',
                        street_line2: address.street_line2?.toUpperCase() || undefined,
                        locality: address.locality?.toUpperCase() || '',
                        postal_code: address.postal_code || '',
                        town: address.town?.toUpperCase() || '',
                        country: address.country?.toUpperCase() || 'MG',
                    province_code: address.province_code?.toUpperCase() || '',
                        is_verified: false,
                }));

            console.log('✅ Transformed person payload for submission:', personPayload);
            console.log('📍 Address payloads for separate endpoints:', addressPayloads);
            console.log('📊 FINAL ADDRESS SUMMARY:');
            console.log(`- Original address count: ${formData.addresses?.length || 0}`);
            console.log(`- Filtered address count: ${addressPayloads?.length || 0}`);
            console.log('- Final address payloads:', JSON.stringify(addressPayloads, null, 2));

            if (isEditMode && currentPersonId) {
                // Update existing person
                console.log('Updating existing person:', currentPersonId);
                console.log('🌐 SENDING PUT REQUEST TO:', `${API_BASE_URL}/api/v1/persons/${currentPersonId}`);
                console.log('📤 REQUEST BODY:', JSON.stringify(personPayload, null, 2));
                console.log('📧 REQUEST HEADERS:', {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken ? accessToken.substring(0, 20) + '...' : 'none'}`,
                });
                
                const response = await fetch(`${API_BASE_URL}/api/v1/persons/${currentPersonId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify(personPayload),
                });

                console.log('📥 API RESPONSE STATUS:', response.status, response.statusText);
                console.log('📥 API RESPONSE HEADERS:', Object.fromEntries(response.headers.entries()));

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('❌ API ERROR RESPONSE:', errorData);
                    throw new Error(errorData.detail || `HTTP ${response.status}: Failed to update person`);
                }

                const result = await response.json();
                console.log('Person updated successfully:', result);
                console.log('🏠 ADDRESS DATA IN API RESPONSE:', {
                    addressCount: result.addresses?.length || 0,
                    addresses: result.addresses
                });
                
                // Now handle addresses separately using dedicated address endpoints
                await handleAddressUpdates(currentPersonId, addressPayloads, result.addresses || []);
                
                // Fetch updated person with addresses
                const updatedPersonResponse = await fetch(`${API_BASE_URL}/api/v1/persons/${currentPersonId}`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                });
                
                if (updatedPersonResponse.ok) {
                    const updatedPerson = await updatedPersonResponse.json();
                    console.log('✅ FINAL PERSON WITH ADDRESSES:', updatedPerson);
                    setCreatedPerson(updatedPerson);
                    markStepValid(1, true); // Mark details step complete when person is updated
                    handleFormComplete(updatedPerson);
                } else {
                    console.warn('⚠️ Failed to fetch updated person with addresses, using original result');
                    setCreatedPerson(result);
                    markStepValid(1, true); // Mark details step complete when person is updated
                    handleFormComplete(result);
                }
            } else {
                // Create new person (with duplicate check)
                await checkForDuplicates(personPayload, addressPayloads);
            }

        } catch (error) {
            console.error('Submit failed:', error);
            alert(`Failed to ${isEditMode ? 'update' : 'create'} person: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleAddressUpdates = async (personId: string, newAddresses: any[], existingAddresses: any[]) => {
        console.log('🏠 HANDLING ADDRESS UPDATES:', {
            personId,
            newAddressCount: newAddresses.length,
            existingAddressCount: existingAddresses.length,
            newAddresses,
            existingAddresses
        });

        try {
            // Smart update logic: compare addresses and only make necessary API calls
            const addressesToDelete: any[] = [];
            const addressesToUpdate: any[] = [];
            const addressesToCreate: any[] = [];

            // Helper function to compare address data (excluding IDs and timestamps)
            const addressesEqual = (addr1: any, addr2: any) => {
                const compareFields = ['address_type', 'street_line1', 'street_line2', 'locality', 'town', 'postal_code', 'country', 'province_code', 'is_primary'];
                return compareFields.every(field => addr1[field] === addr2[field]);
            };

            // Find addresses to update or delete
            for (const existingAddress of existingAddresses) {
                const matchingNew = newAddresses.find(newAddr => 
                    newAddr.id === existingAddress.id || 
                    (newAddr.address_type === existingAddress.address_type && newAddr.is_primary === existingAddress.is_primary)
                );
                
                if (matchingNew && !addressesEqual(existingAddress, matchingNew)) {
                    // Address exists but data changed - update it
                    addressesToUpdate.push({ ...matchingNew, id: existingAddress.id });
                } else if (!matchingNew) {
                    // Address no longer exists in form - delete it
                    addressesToDelete.push(existingAddress);
                }
            }

            // Find addresses to create (new addresses not matching existing ones)
            for (const newAddress of newAddresses) {
                const existingMatch = existingAddresses.find(existing => 
                    newAddress.id === existing.id ||
                    (newAddress.address_type === existing.address_type && newAddress.is_primary === existing.is_primary)
                );
                
                if (!existingMatch) {
                    addressesToCreate.push(newAddress);
                }
            }

            console.log('🔄 Address update plan:', {
                toDelete: addressesToDelete.length,
                toUpdate: addressesToUpdate.length,
                toCreate: addressesToCreate.length
            });

            // Delete removed addresses
            for (const addressToDelete of addressesToDelete) {
                console.log('🗑️ Deleting removed address:', addressToDelete.id);
                const deleteResponse = await fetch(
                    `${API_BASE_URL}/api/v1/persons/${personId}/addresses/${addressToDelete.id}`,
                    {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                        },
                    }
                );
                
                if (!deleteResponse.ok) {
                    console.error('❌ Failed to delete address:', addressToDelete.id);
                } else {
                    console.log('✅ Successfully deleted address:', addressToDelete.id);
                }
            }

            // Update modified addresses
            for (const addressToUpdate of addressesToUpdate) {
                console.log('📝 Updating modified address:', addressToUpdate.id);
                const updateResponse = await fetch(
                    `${API_BASE_URL}/api/v1/persons/${personId}/addresses/${addressToUpdate.id}`,
                    {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${accessToken}`,
                        },
                        body: JSON.stringify(addressToUpdate),
                    }
                );
                
                if (!updateResponse.ok) {
                    console.error('❌ Failed to update address:', addressToUpdate.id);
                } else {
                    console.log('✅ Successfully updated address:', addressToUpdate.id);
                }
            }

            // Create new addresses
            for (const addressPayload of addressesToCreate) {
                console.log('➕ Creating new address:', addressPayload);
                const createResponse = await fetch(
                    `${API_BASE_URL}/api/v1/persons/${personId}/addresses`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${accessToken}`,
                        },
                        body: JSON.stringify(addressPayload),
                    }
                );

                if (!createResponse.ok) {
                    const errorData = await createResponse.json();
                    console.error('❌ Failed to create address:', errorData);
                    throw new Error(`Failed to create address: ${errorData.detail || createResponse.statusText}`);
                } else {
                    const createdAddress = await createResponse.json();
                    console.log('✅ Successfully created address:', createdAddress);
                }
            }

            console.log('🎉 All address updates completed successfully');
        } catch (error) {
            console.error('❌ Error during address updates:', error);
            throw error;
        }
    };

    const checkForDuplicates = async (personPayload: any, addressPayloads: any[] = []) => {
        setDuplicateCheckLoading(true);

        try {
            // Store both payloads for later use
            console.log('🔄 SETTING PENDING PAYLOADS:', {
                personPayload: personPayload,
                addressPayloads: addressPayloads,
                addressCount: addressPayloads?.length || 0
            });
            setPendingPersonPayload(personPayload);
            setPendingAddressPayloads(addressPayloads);
            
            // Immediate verification of state setting
            console.log('🔄 PENDING PAYLOADS SET - Current state check:', {
                pendingPersonPayload: !!personPayload,
                pendingAddressPayloads: !!addressPayloads,
                addressPayloadsLength: addressPayloads?.length || 0
            });

            // Search for potential duplicates using similar data
            const duplicateQuery = new URLSearchParams({
                surname: personPayload.surname || '',
                first_name: personPayload.first_name || '',
                birth_date: personPayload.birth_date || '',
                include_details: 'true',
                limit: '20'
            });

            const duplicateResponse = await fetch(
                `${API_BASE_URL}/api/v1/persons/search?${duplicateQuery}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                }
            );

            if (!duplicateResponse.ok) {
                console.warn('Duplicate search failed, proceeding with person creation');
                await createPersonDirectly(personPayload, addressPayloads);
                return;
            }

            const searchResults = await duplicateResponse.json();
            console.log('Duplicate search results:', searchResults);

            if (Array.isArray(searchResults) && searchResults.length > 0) {
                // Calculate similarity scores manually for found persons
                const potentialDuplicates = searchResults
                    .map(person => ({
                        ...person,
                        similarity_score: calculateSimilarityScore(personPayload, person),
                        match_criteria: getMatchCriteria(personPayload, person)
                    }))
                    .filter(person => person.similarity_score >= duplicateThreshold)
                    .sort((a, b) => b.similarity_score - a.similarity_score);

                if (potentialDuplicates.length > 0) {
                    // Found potential duplicates - show dialog
                    setPotentialDuplicates(potentialDuplicates);
                    setShowDuplicateDialog(true);
                } else {
                    // No high-confidence duplicates found - create person
                    await createPersonDirectly(personPayload, addressPayloads);
                }
            } else {
                // No matches found - create person
                await createPersonDirectly(personPayload, addressPayloads);
            }
        } catch (error) {
            console.error('Duplicate check failed:', error);
            // If duplicate check fails, try to create person normally
            await createPersonDirectly(personPayload, addressPayloads);
        } finally {
            setDuplicateCheckLoading(false);
        }
    };

    const createPersonDirectly = async (personPayload: any, addressPayloadsOverride?: any[]) => {
        try {
            console.log('🌐 SENDING POST REQUEST TO:', `${API_BASE_URL}/api/v1/persons/`);
            console.log('📤 CREATE REQUEST BODY:', JSON.stringify(personPayload, null, 2));
            
            const response = await fetch(`${API_BASE_URL}/api/v1/persons/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify(personPayload),
            });

            console.log('📥 CREATE API RESPONSE STATUS:', response.status, response.statusText);
            console.log('📥 CREATE API RESPONSE HEADERS:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ CREATE API ERROR RESPONSE:', errorData);
                throw new Error(errorData.detail || `HTTP ${response.status}: Failed to create person`);
            }

            const result = await response.json();
            console.log('Person created successfully:', result);
            console.log('🏠 ADDRESS DATA IN CREATE RESPONSE:', {
                addressCount: result.addresses?.length || 0,
                addresses: result.addresses
            });
            
            // Now handle addresses separately using dedicated address endpoints
            // Use either the override parameter or the stored address payloads
            const addressesToCreate = addressPayloadsOverride || pendingAddressPayloads;
            console.log('🔍 CHECKING ADDRESS PAYLOADS:', {
                hasAddressPayloadsOverride: !!addressPayloadsOverride,
                addressPayloadsOverrideLength: addressPayloadsOverride?.length || 0,
                hasPendingAddressPayloads: !!pendingAddressPayloads,
                pendingAddressPayloadsLength: pendingAddressPayloads?.length || 0,
                finalAddressesToCreate: addressesToCreate,
                finalAddressesToCreateLength: addressesToCreate?.length || 0
            });
            
            if (addressesToCreate && addressesToCreate.length > 0) {
                console.log('🏠 PROCEEDING WITH ADDRESS CREATION for person:', result.id);
                await handleAddressUpdates(result.id, addressesToCreate, []);
                
                // Fetch updated person with addresses
                const updatedPersonResponse = await fetch(`${API_BASE_URL}/api/v1/persons/${result.id}`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                });
                
                if (updatedPersonResponse.ok) {
                    const updatedPerson = await updatedPersonResponse.json();
                    console.log('✅ FINAL CREATED PERSON WITH ADDRESSES:', updatedPerson);
                    setCreatedPerson(updatedPerson);
                    handleFormComplete(updatedPerson);
                } else {
                    console.warn('⚠️ Failed to fetch updated person with addresses, using original result');
                    setCreatedPerson(result);
                    handleFormComplete(result);
                }
            } else {
                console.log('⚠️ NO ADDRESS PAYLOADS TO CREATE - Person created without addresses');
                console.log('🔍 DEBUG INFO:', {
                    addressPayloadsOverride: addressPayloadsOverride,
                    addressPayloadsOverrideLength: addressPayloadsOverride?.length,
                    pendingAddressPayloads: pendingAddressPayloads,
                    pendingAddressPayloadsLength: pendingAddressPayloads?.length,
                    finalAddressesToCreate: addressesToCreate,
                    finalAddressesToCreateLength: addressesToCreate?.length
                });
                setCreatedPerson(result);
                handleFormComplete(result);
            }
        } catch (error) {
            console.error('Failed to create person:', error);
            throw error;
        }
    };

    const calculateSimilarityScore = (payload: any, existing: any): number => {
        let score = 0;
        let totalWeight = 0;

        // Birth date match (30%)
        if (payload.birth_date && existing.birth_date) {
            if (payload.birth_date === existing.birth_date) score += 30;
            totalWeight += 30;
        }

        // Surname similarity (25%)
        if (payload.surname && existing.surname) {
            const similarity = stringSimilarity(payload.surname.toLowerCase(), existing.surname.toLowerCase());
            score += (similarity * 25);
            totalWeight += 25;
        }

        // First name similarity (20%)
        if (payload.first_name && existing.first_name) {
            const similarity = stringSimilarity(payload.first_name.toLowerCase(), existing.first_name.toLowerCase());
            score += (similarity * 20);
            totalWeight += 20;
        }

        // Phone match (15%)
        if (payload.cell_phone && existing.cell_phone) {
            if (payload.cell_phone === existing.cell_phone) score += 15;
            totalWeight += 15;
        }

        // Address locality match (10%)
        if (payload.addresses?.[0]?.locality && existing.addresses?.[0]?.locality) {
            if (payload.addresses[0].locality.toLowerCase() === existing.addresses[0].locality.toLowerCase()) {
                score += 10;
            }
            totalWeight += 10;
        }

        return totalWeight > 0 ? (score / totalWeight) * 100 : 0;
    };

    const getMatchCriteria = (payload: any, existing: any) => {
        return {
            birth_date_match: payload.birth_date === existing.birth_date,
            surname_match: payload.surname?.toLowerCase() === existing.surname?.toLowerCase(),
            first_name_similar: payload.first_name && existing.first_name ?
                stringSimilarity(payload.first_name.toLowerCase(), existing.first_name.toLowerCase()) > 0.8 : false,
            phone_match: payload.cell_phone === existing.cell_phone,
            address_similar: payload.addresses?.[0]?.locality?.toLowerCase() === existing.addresses?.[0]?.locality?.toLowerCase()
        };
    };

    const stringSimilarity = (str1: string, str2: string): number => {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        const editDistance = levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    };

    const levenshteinDistance = (str1: string, str2: string): number => {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + indicator
                );
            }
        }

        return matrix[str2.length][str1.length];
    };

    const handleKeepNewPerson = async () => {
        if (pendingPersonPayload) {
            try {
                setDuplicateCheckLoading(true);
                console.log('🎯 HANDLE KEEP NEW PERSON - Pending data check:', {
                    hasPendingPersonPayload: !!pendingPersonPayload,
                    hasPendingAddressPayloads: !!pendingAddressPayloads,
                    pendingAddressCount: pendingAddressPayloads?.length || 0,
                    pendingAddressPayloads: pendingAddressPayloads
                });
                await createPersonDirectly(pendingPersonPayload, pendingAddressPayloads);
            } catch (error) {
                console.error('Failed to create person:', error);
                alert(`Failed to create person: ${error instanceof Error ? error.message : 'Unknown error'}`);
            } finally {
                setDuplicateCheckLoading(false);
            }
        }
        setShowDuplicateDialog(false);
    };

    const handleUpdateExistingPerson = async (existingPersonId: string) => {
        try {
            setDuplicateCheckLoading(true);

            // Fetch the existing person's full data
            console.log('Fetching existing person data:', existingPersonId);
            const response = await fetch(`${API_BASE_URL}/api/v1/persons/${existingPersonId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch existing person data');
            }

            const existingPersonData = await response.json();
            console.log('Fetched existing person data:', existingPersonData);

            // Reset form state
            setShowDuplicateDialog(false);
            setCreatedPerson(null);
            setPotentialDuplicates([]);
            setPendingPersonPayload(null);
            setPersonFound(existingPersonData);
            setCurrentPersonId(existingPersonData.id);
            setIsNewPerson(false);
            setIsEditMode(true);

            // Populate the form with existing person data
            populateFormWithExistingPerson(existingPersonData);

            // Also populate the lookup form with the primary document for edit mode
            if (existingPersonData.aliases && existingPersonData.aliases.length > 0) {
                const primaryAlias = existingPersonData.aliases.find(alias => alias.is_primary) || existingPersonData.aliases[0];
                lookupForm.setValue('document_type', primaryAlias.document_type);
                lookupForm.setValue('document_number', primaryAlias.document_number);
                console.log('Populated lookup form with primary document:', primaryAlias);
            }

            // Set all steps as valid since we have existing data
            setStepValidation(new Array(steps.length).fill(true));

            // Navigate to personal information step so user can review/edit everything
            setCurrentStep(1);

            console.log('Successfully switched to edit mode for person:', existingPersonId);

        } catch (error) {
            console.error('Failed to switch to edit mode:', error);
            alert(`Failed to load existing person data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setDuplicateCheckLoading(false);
        }
    };

    const resetForm = () => {
        setCurrentStep(0);
        setPersonFound(null);
        setCurrentPersonId(null);
        setIsNewPerson(false);
        setIsEditMode(false);
        setPersonDataWasIncomplete(false);
        setStepValidation(new Array(steps.length).fill(false));
        setShowSuccessDialog(false);
        setCreatedPerson(null);
        setShowDuplicateDialog(false);
        setPotentialDuplicates([]);
        setPendingPersonPayload(null);
        lookupForm.reset();
        personForm.reset();
    };

    // Expose functions for parent components to control the form
    const continueEditing = () => {
        // Keep current form state, don't reset
        console.log('Continuing to edit current person');
    };

    const startNewPerson = () => {
        resetForm();
        console.log('Starting new person form');
    };

    // Render step content
    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return renderLookupStep();
            case 1:
                return renderPersonalInformationStep();
            case 2:
                return renderContactDetailsStep();
            case 3:
                return renderIdDocumentsStep();
            case 4:
                return renderAddressStep();
            case 5:
                return renderReviewStep();
            default:
                return null;
        }
    };

    const renderLookupStep = () => (
        <Paper 
            key="lookup-step"
            elevation={0}
            sx={{ 
                bgcolor: 'transparent',
                boxShadow: 'none',
                border: 'none'
            }}
        >
            <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Document Lookup
                </Typography>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                    Enter document details to search for existing person or register new person.
                </Typography>

                <Box 
                    component="form" 
                    onSubmit={lookupForm.handleSubmit(performLookup)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            lookupForm.handleSubmit(performLookup)();
                        }
                    }}
                >
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
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
                                render={({ field }) => {
                                    const fieldState = formValidation.getFieldState('document_number', field.value, 0);
                                    const styling = useFieldStyling(
                                        fieldState, 
                                        lookupForm.formState.errors.document_number?.message,
                                        true
                                    );
                                    
                                    return (
                                    <TextField
                                        name={field.name}
                                        value={field.value || ''}
                                        fullWidth
                                        size="small"
                                        label="Document Number *"
                                        autoFocus={mode === 'application'}
                                            error={styling.error}
                                            helperText={styling.helperText || 'Enter document number (numbers only)'}
                                            sx={styling.sx}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, '');
                                            field.onChange(value);
                                                // Use debounced validation on change
                                                debouncedValidation('document_number', value, 0);
                                                // Trigger step validation to update button state
                                                setTimeout(() => {
                                                    triggerStepValidation(0);
                                                }, 350);
                                            }}
                                            onBlur={(e) => {
                                                field.onBlur();
                                                // Use immediate validation on blur for better UX
                                                const result = getImmediateValidation('document_number', e.target.value, 0);
                                                if (!result.isValid && result.error) {
                                                    setLookupError('document_number', {
                                                        type: 'manual',
                                                        message: result.error
                                                    });
                                                } else {
                                                    clearLookupErrors('document_number');
                                                }
                                                // Trigger immediate step validation on blur
                                                triggerStepValidation(0);
                                            }}
                                        InputProps={{
                                            endAdornment: field.value && (
                                                <InputAdornment position="end">
                                                        <IconButton onClick={() => {
                                                            lookupForm.setValue('document_number', '');
                                                            clearValidationCache('document_number', 0);
                                                            clearLookupErrors('document_number');
                                                        }} size="small">
                                                        <ClearIcon />
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                    );
                                }}
                            />
                        </Grid>
                        </Grid>
                </Box>
            </Box>
        </Paper>
    );

    const renderPersonalInformationStep = () => (
        <Paper 
            key="personal-info-step"
            elevation={0}
            sx={{ 
                bgcolor: 'transparent',
                boxShadow: 'none',
                border: 'none'
            }}
        >
            <Box 
                sx={{ p: 2 }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleNext();
                    }
                }}
            >
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Personal Information
                </Typography>

                {/* Show alert when person was found but has incomplete information */}
                {mode === 'application' && !isNewPerson && personDataWasIncomplete && (
                    <Alert severity="warning" sx={{ mb: 2, py: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Incomplete Person Information
                        </Typography>
                    </Alert>
                )}

                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <ValidatedTextField
                            name="surname"
                            control={personForm.control}
                            stepIndex={1}
                            isRequired={true}
                            getFieldState={formValidation.getFieldState}
                            debouncedValidation={debouncedValidation}
                            getImmediateValidation={getImmediateValidation}
                            setError={setPersonError}
                            clearErrors={clearPersonErrors}
                            errors={personForm.formState.errors}
                            triggerStepValidation={triggerStepValidation}
                                    label="Surname *"
                            helperText="Family name"
                                    inputProps={{ maxLength: 50 }}
                            transform={(value) => value.toUpperCase()}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <ValidatedTextField
                            name="first_name"
                            control={personForm.control}
                            stepIndex={1}
                            isRequired={true}
                            getFieldState={formValidation.getFieldState}
                            debouncedValidation={debouncedValidation}
                            getImmediateValidation={getImmediateValidation}
                            setError={setPersonError}
                            clearErrors={clearPersonErrors}
                            errors={personForm.formState.errors}
                            triggerStepValidation={triggerStepValidation}
                                    label="First Name *"
                            helperText="Given name"
                                    inputProps={{ maxLength: 50 }}
                            transform={(value) => value.toUpperCase()}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Controller
                            name="middle_name"
                            control={personForm.control}
                            render={({ field }) => (
                                <TextField
                                    id="person-middle-name"
                                    name={field.name}
                                    value={field.value || ''}
                                    fullWidth
                                    size="small"
                                    label="Middle Name"
                                    helperText="Middle name (optional)"
                                    inputProps={{ maxLength: 50 }}
                                    onChange={(e) => {
                                        const value = e.target.value.toUpperCase();
                                        field.onChange(value);
                                    }}
                                    onBlur={field.onBlur}
                                />
                            )}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <ValidatedSelect
                            name="person_nature"
                            control={personForm.control}
                            stepIndex={1}
                            isRequired={true}
                            getFieldState={formValidation.getFieldState}
                            debouncedValidation={debouncedValidation}
                            getImmediateValidation={getImmediateValidation}
                            setError={setPersonError}
                            clearErrors={clearPersonErrors}
                            errors={personForm.formState.errors}
                            triggerStepValidation={triggerStepValidation}
                                        label="Gender *"
                            helperText="Select gender"
                                    >
                            <MenuItem value="" disabled>Select gender...</MenuItem>
                                        {personNatures.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                        </ValidatedSelect>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <ValidatedTextField
                            name="birth_date"
                            control={personForm.control}
                            stepIndex={1}
                            isRequired={true}
                            getFieldState={formValidation.getFieldState}
                            debouncedValidation={debouncedValidation}
                            getImmediateValidation={getImmediateValidation}
                            setError={setPersonError}
                            clearErrors={clearPersonErrors}
                            errors={personForm.formState.errors}
                            triggerStepValidation={triggerStepValidation}
                            label="Date of Birth *"
                            helperText="Date of birth"
                                    type="date"
                                    InputLabelProps={{ shrink: true }}
                                    inputProps={{
                                        min: "1900-01-01",
                                        max: new Date().toISOString().split('T')[0]
                                    }}
                        />
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <ValidatedSelect
                            name="nationality_code"
                            control={personForm.control}
                            stepIndex={1}
                            isRequired={true}
                            getFieldState={formValidation.getFieldState}
                            debouncedValidation={debouncedValidation}
                            getImmediateValidation={getImmediateValidation}
                            setError={setPersonError}
                            clearErrors={clearPersonErrors}
                            errors={personForm.formState.errors}
                            triggerStepValidation={triggerStepValidation}
                                        label="Nationality *"
                            helperText="Select nationality"
                                    >
                            <MenuItem value="" disabled>Select nationality...</MenuItem>
                                        <MenuItem value="MG">MALAGASY</MenuItem>
                                        <MenuItem value="FR">FRENCH</MenuItem>
                                        <MenuItem value="US">AMERICAN</MenuItem>
                        </ValidatedSelect>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <ValidatedSelect
                            name="preferred_language"
                            control={personForm.control}
                            stepIndex={1}
                            isRequired={true}
                            getFieldState={formValidation.getFieldState}
                            debouncedValidation={debouncedValidation}
                            getImmediateValidation={getImmediateValidation}
                            setError={setPersonError}
                            clearErrors={clearPersonErrors}
                            errors={personForm.formState.errors}
                            triggerStepValidation={triggerStepValidation}
                                        label="Preferred Language *"
                            helperText="Select preferred language"
                                    >
                            <MenuItem value="" disabled>Select language...</MenuItem>
                                        {languages.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                        </ValidatedSelect>
                    </Grid>
                </Grid>
            </Box>
        </Paper>
    );

    const renderContactDetailsStep = () => (
        <Paper 
            key="contact-details-step"
            elevation={0}
            sx={{ 
                bgcolor: 'transparent',
                boxShadow: 'none',
                border: 'none'
            }}
        >
            <Box 
                sx={{ p: 2 }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleNext();
                    }
                }}
            >
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Contact Information
                </Typography>

                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <ValidatedTextField
                            name="email_address"
                            control={personForm.control}
                            stepIndex={2}
                            isRequired={true}
                            getFieldState={formValidation.getFieldState}
                            debouncedValidation={debouncedValidation}
                            getImmediateValidation={getImmediateValidation}
                            setError={setPersonError}
                            clearErrors={clearPersonErrors}
                            errors={personForm.formState.errors}
                            triggerStepValidation={triggerStepValidation}
                            label="Email Address *"
                                    type="email"
                                    inputProps={{ maxLength: 100 }}
                            transform={(value) => value?.toUpperCase() || ''}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <ValidatedTextField
                            name="work_phone"
                            control={personForm.control}
                            stepIndex={2}
                            isRequired={false}
                            getFieldState={formValidation.getFieldState}
                            debouncedValidation={debouncedValidation}
                            getImmediateValidation={getImmediateValidation}
                            setError={setPersonError}
                            clearErrors={clearPersonErrors}
                            errors={personForm.formState.errors}
                            triggerStepValidation={triggerStepValidation}
                                    label="Work Phone"
                                    inputProps={{
                                maxLength: 10,
                                        pattern: '[0-9]*',
                                inputMode: 'numeric',
                            }}
                            transform={(value) => {
                                // Ensure Madagascar format: must start with 0 and be exactly 10 digits
                                let cleanValue = value?.replace(/\D/g, '') || '';
                                if (cleanValue.length > 0 && !cleanValue.startsWith('0')) {
                                    cleanValue = '0' + cleanValue;
                                }
                                if (cleanValue.length > 10) {
                                    cleanValue = cleanValue.substring(0, 10);
                                }
                                return cleanValue;
                            }}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 500, mt: 2 }}>
                            Cell Phone (Must be 10 digits starting with 0, e.g., 0815598453)
                        </Typography>
                    </Grid>

                    <Grid item xs={12} md={3}>
                        <Controller
                            name="cell_phone_country_code"
                            control={personForm.control}
                            render={({ field }) => {
                                const fieldState = formValidation.getFieldState('cell_phone_country_code', field.value, 2);
                                const styling = useSelectStyling(
                                    fieldState,
                                    personForm.formState.errors.cell_phone_country_code?.message as string,
                                    true
                                );

                                return (
                                    <FormControl fullWidth size="small" error={styling.error}>
                                    <InputLabel>Country Code *</InputLabel>
                                    <Select
                                        name={field.name}
                                            value={field.value || ''}
                                            onChange={(e) => {
                                                field.onChange(e.target.value);
                                                debouncedValidation('cell_phone_country_code', e.target.value, 2);
                                            }}
                                            onBlur={(e) => {
                                                field.onBlur();
                                                const validation = getImmediateValidation('cell_phone_country_code', e.target.value, 2);
                                                if (validation?.errors) {
                                                    setPersonError('cell_phone_country_code', { message: Object.values(validation.errors)[0] });
                                                } else {
                                                    clearPersonErrors('cell_phone_country_code');
                                                }
                                                triggerStepValidation(2);
                                            }}
                                            label="Country Code *"
                                            sx={styling.sx}
                                        >
                                            <MenuItem value="" disabled>Select country code</MenuItem>
                                        <MenuItem value="+261">+261 (MADAGASCAR)</MenuItem>
                                        <MenuItem value="+27">+27 (SOUTH AFRICA)</MenuItem>
                                        <MenuItem value="+33">+33 (FRANCE)</MenuItem>
                                        <MenuItem value="+1">+1 (USA)</MenuItem>
                                        <MenuItem value="+44">+44 (UK)</MenuItem>
                                    </Select>
                                        <FormHelperText>{styling.helperText}</FormHelperText>
                                </FormControl>
                                );
                            }}
                        />
                    </Grid>

                    <Grid item xs={12} md={9}>
                        <ValidatedTextField
                            name="cell_phone"
                            control={personForm.control}
                            stepIndex={2}
                            isRequired={true}
                            getFieldState={formValidation.getFieldState}
                            debouncedValidation={debouncedValidation}
                            getImmediateValidation={getImmediateValidation}
                            setError={setPersonError}
                            clearErrors={clearPersonErrors}
                            errors={personForm.formState.errors}
                            triggerStepValidation={triggerStepValidation}
                            label="Cell Phone Number *"
                                    inputProps={{
                                        maxLength: 10,
                                        pattern: '[0-9]*',
                                        inputMode: 'numeric',
                                    }}
                            transform={(value) => {
                                        // Ensure Madagascar format: must start with 0 and be exactly 10 digits
                                let cleanValue = value?.replace(/\D/g, '') || '';
                                if (cleanValue.length > 0 && !cleanValue.startsWith('0')) {
                                    cleanValue = '0' + cleanValue;
                                }
                                if (cleanValue.length > 10) {
                                    cleanValue = cleanValue.substring(0, 10);
                                }
                                return cleanValue;
                            }}
                        />
                    </Grid>
                </Grid>
            </Box>
        </Paper>
    );

    const renderIdDocumentsStep = () => (
        <Paper 
            key="id-documents-step"
            elevation={0}
            sx={{ 
                bgcolor: 'transparent',
                boxShadow: 'none',
                border: 'none'
            }}
        >
            <Box 
                sx={{ p: 2 }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleNext();
                    }
                }}
            >
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Identification Documents
                </Typography>

                {aliasFields.map((field, index) => (
                    <Box key={field.id} sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 2, backgroundColor: '#fafafa' }}>
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                            {index === 0 ? 'Primary Document' : `Additional Document ${index}`}
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                                <Controller
                                    name={`aliases.${index}.document_type`}
                                    control={personForm.control}
                                    render={({ field }) => {
                                        const fieldState = formValidation.getFieldState(`aliases.${index}.document_type`, field.value, 3);
                                        const styling = useSelectStyling(
                                            index === 0 ? (field.value ? 'valid' : 'required') : fieldState, // Primary doc shows valid if populated
                                            personForm.formState.errors.aliases?.[index]?.document_type?.message as string,
                                            true
                                        );

                                        return (
                                            <FormControl fullWidth size="small" error={styling.error}>
                                                <InputLabel>Document Type *</InputLabel>
                                                <Select 
                                                    {...field} 
                                                    label="Document Type *" 
                                                    disabled={index === 0}
                                                    sx={styling.sx}
                                                    onChange={(e) => {
                                                        field.onChange(e.target.value);
                                                        if (index !== 0) {
                                                            debouncedValidation(`aliases.${index}.document_type`, e.target.value, 3);
                                                        }
                                                    }}
                                                    onBlur={(e) => {
                                                        field.onBlur();
                                                        if (index !== 0) {
                                                            const validation = getImmediateValidation(`aliases.${index}.document_type`, e.target.value, 3);
                                                            if (validation?.errors) {
                                                                setPersonError(`aliases.${index}.document_type`, { message: Object.values(validation.errors)[0] });
                                                            } else {
                                                                clearPersonErrors(`aliases.${index}.document_type`);
                                                            }
                                                            triggerStepValidation(3);
                                                        }
                                                    }}
                                                >
                                                {documentTypes.map((option) => (
                                                    <MenuItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                                <FormHelperText>
                                                    {styling.helperText || (index === 0 ? 'Primary document from lookup' : 'Select document type')}
                                                </FormHelperText>
                                        </FormControl>
                                        );
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Controller
                                    name={`aliases.${index}.document_number`}
                                    control={personForm.control}
                                    render={({ field }) => {
                                        const fieldState = formValidation.getFieldState(`aliases.${index}.document_number`, field.value, 3);
                                        const styling = useFieldStyling(
                                            index === 0 ? (field.value ? 'valid' : 'required') : fieldState, // Primary doc shows valid if populated
                                            personForm.formState.errors.aliases?.[index]?.document_number?.message as string,
                                            true
                                        );

                                        return (
                                        <TextField
                                            name={field.name}
                                            value={field.value || ''}
                                            fullWidth
                                            size="small"
                                                label="Document Number *"
                                            disabled={index === 0}
                                                error={styling.error}
                                                helperText={styling.helperText || (index === 0 ? 'From lookup step' : 'Additional document number (numbers only)')}
                                                sx={styling.sx}
                                            onChange={(e) => {
                                                // Allow only numbers for document numbers
                                                const value = e.target.value.replace(/\D/g, '');
                                                field.onChange(value);
                                                    if (index !== 0) {
                                                        debouncedValidation(`aliases.${index}.document_number`, value, 3);
                                                    }
                                                }}
                                                onBlur={(e) => {
                                                    field.onBlur();
                                                    if (index !== 0) {
                                                        const validation = getImmediateValidation(`aliases.${index}.document_number`, e.target.value.replace(/\D/g, ''), 3);
                                                        if (validation?.errors) {
                                                            setPersonError(`aliases.${index}.document_number`, { message: Object.values(validation.errors)[0] });
                                                        } else {
                                                            clearPersonErrors(`aliases.${index}.document_number`);
                                                        }
                                                        triggerStepValidation(3);
                                                    }
                                                }}
                                            />
                                        );
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12} md={2}>
                                <Controller
                                    name={`aliases.${index}.is_current`}
                                    control={personForm.control}
                                    render={({ field }) => (
                                        <FormControlLabel
                                            control={<Checkbox {...field} checked={field.value} />}
                                            label="Current"
                                            sx={{ mt: 1 }}
                                        />
                                    )}
                                />
                            </Grid>

                            {/* Name in Document field - CAPITALIZED */}
                            <Grid item xs={12} md={12}>
                                <Controller
                                    name={`aliases.${index}.name_in_document`}
                                    control={personForm.control}
                                    render={({ field }) => {
                                        const fieldState = formValidation.getFieldState(`aliases.${index}.name_in_document`, field.value, 3);
                                        const styling = useFieldStyling(
                                            fieldState,
                                            personForm.formState.errors.aliases?.[index]?.name_in_document?.message as string,
                                            true
                                        );

                                        return (
                                        <TextField
                                            name={field.name}
                                            value={field.value || ''}
                                            fullWidth
                                            size="small"
                                                label="Name in Document *"
                                                error={styling.error}
                                                helperText={styling.helperText || "Name as it appears in the document (will be capitalized)"}
                                                sx={styling.sx}
                                            onChange={(e) => {
                                                const value = e.target.value.toUpperCase();
                                                field.onChange(value);
                                                    debouncedValidation(`aliases.${index}.name_in_document`, value, 3);
                                                }}
                                                onBlur={(e) => {
                                                    field.onBlur();
                                                    const validation = getImmediateValidation(`aliases.${index}.name_in_document`, e.target.value.toUpperCase(), 3);
                                                    if (validation?.errors) {
                                                        setPersonError(`aliases.${index}.name_in_document`, { message: Object.values(validation.errors)[0] });
                                                    } else {
                                                        clearPersonErrors(`aliases.${index}.name_in_document`);
                                                    }
                                                    triggerStepValidation(3);
                                                }}
                                            />
                                        );
                                    }}
                                />
                            </Grid>

                            {personForm.watch(`aliases.${index}.document_type`) === 'PASSPORT' && (
                                <>
                                    <Grid item xs={12} md={4}>
                                        <Controller
                                            name={`aliases.${index}.country_of_issue`}
                                            control={personForm.control}
                                            render={({ field }) => (
                                                <FormControl fullWidth size="small">
                                                    <InputLabel>Country of Issue *</InputLabel>
                                                    <Select {...field} label="Country of Issue *">
                                                        <MenuItem value="MG">Madagascar</MenuItem>
                                                        <MenuItem value="FR">France</MenuItem>
                                                        <MenuItem value="US">United States</MenuItem>
                                                        <MenuItem value="GB">United Kingdom</MenuItem>
                                                        <MenuItem value="ZA">South Africa</MenuItem>
                                                        <MenuItem value="OTHER">Other</MenuItem>
                                                    </Select>
                                                    <FormHelperText>Country that issued the passport</FormHelperText>
                                                </FormControl>
                                            )}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <Controller
                                            name={`aliases.${index}.expiry_date`}
                                            control={personForm.control}
                                            render={({ field }) => (
                                                <TextField
                                                    name={field.name}
                                                    value={field.value || ''}
                                                    fullWidth
                                                    size="small"
                                                    type="date"
                                                    label="Expiry Date *"
                                                    InputLabelProps={{ shrink: true }}
                                                    helperText="Required for passports"
                                                    inputProps={{
                                                        min: new Date().toISOString().split('T')[0],
                                                        max: "2050-12-31"
                                                    }}
                                                    onChange={field.onChange}
                                                    onBlur={field.onBlur}
                                                />
                                            )}
                                        />
                                    </Grid>
                                </>
                            )}

                            {index > 0 && (
                                <Grid item xs={12}>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        onClick={() => removeAlias(index)}
                                        size="small"
                                        sx={{ mt: 1 }}
                                    >
                                        Remove Document
                                    </Button>
                                </Grid>
                            )}
                        </Grid>
                    </Box>
                ))}

                <Button
                    variant="outlined"
                    onClick={() => appendAlias({
                        document_type: 'PASSPORT',
                        document_number: '',
                        country_of_issue: 'MG',
                        name_in_document: '',
                        is_primary: false,
                        is_current: true,
                        expiry_date: '',
                    })}
                    startIcon={<PersonAddIcon />}
                    size="small"
                >
                    Add Additional Document
                </Button>
            </Box>
        </Paper>
    );

    const renderAddressStep = () => (
        <Paper 
            key="address-step"
            elevation={0}
            sx={{ 
                bgcolor: 'transparent',
                boxShadow: 'none',
                border: 'none'
            }}
        >
            <Box 
                sx={{ p: 2 }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleNext();
                    }
                }}
            >
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, fontSize: '1rem', mb: 2 }}>
                    Address Information
                </Typography>

                {addressFields.map((field, index) => (
                    <Box key={field.id} sx={{ mb: 2, p: 1.5, border: '1px solid #e0e0e0', borderRadius: 2, backgroundColor: '#fafafa' }}>
                        <Grid container spacing={1.5}>
                            {/* Row 1: Address Type and Primary Checkbox */}
                            <Grid item xs={12} md={6}>
                                <Controller
                                    name={`addresses.${index}.address_type`}
                                    control={personForm.control}
                                    render={({ field }) => {
                                        const fieldState = formValidation.getFieldState(`addresses.${index}.address_type`, field.value, 4);
                                        const styling = useSelectStyling(
                                            fieldState,
                                            personForm.formState.errors.addresses?.[index]?.address_type?.message as string,
                                            true
                                        );

                                        return (
                                            <FormControl fullWidth size="small" error={styling.error}>
                                            <InputLabel>Address Type *</InputLabel>
                                                <Select 
                                                    name={field.name}
                                                    value={field.value || ''}
                                                    onChange={(e) => {
                                                        field.onChange(e.target.value);
                                                        debouncedValidation(`addresses.${index}.address_type`, e.target.value, 4);
                                                    }}
                                                    onBlur={(e) => {
                                                        field.onBlur();
                                                        const validation = getImmediateValidation(`addresses.${index}.address_type`, e.target.value, 4);
                                                        if (validation?.errors) {
                                                            setPersonError(`addresses.${index}.address_type`, { message: Object.values(validation.errors)[0] });
                                                        } else {
                                                            clearPersonErrors(`addresses.${index}.address_type`);
                                                        }
                                                        triggerStepValidation(4);
                                                    }}
                                                    label="Address Type *"
                                                    sx={styling.sx}
                                                >
                                                    <MenuItem value="" disabled>Select address type</MenuItem>
                                                <MenuItem value="RESIDENTIAL">Residential</MenuItem>
                                                <MenuItem value="POSTAL">Postal</MenuItem>
                                            </Select>
                                                <FormHelperText>{styling.helperText}</FormHelperText>
                                        </FormControl>
                                        );
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Controller
                                    name={`addresses.${index}.is_primary`}
                                    control={personForm.control}
                                    render={({ field }) => (
                                        <FormControlLabel
                                            control={<Checkbox {...field} checked={field.value} size="small" />}
                                            label="Primary Address"
                                            sx={{ mt: 1, '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
                                        />
                                    )}
                                />
                            </Grid>

                            {/* Row 2: Address Line 1, Address Line 2, and Locality */}
                            <Grid item xs={12} md={5}>
                                <Controller
                                    name={`addresses.${index}.street_line1`}
                                    control={personForm.control}
                                    render={({ field }) => {
                                        const fieldState = formValidation.getFieldState(`addresses.${index}.street_line1`, field.value, 4);
                                        const styling = useFieldStyling(
                                            fieldState,
                                            personForm.formState.errors.addresses?.[index]?.street_line1?.message as string,
                                            true
                                        );

                                        return (
                                        <TextField
                                                name={field.name}
                                                value={field.value || ''}
                                            fullWidth
                                            size="small"
                                            label="Address Line 1 *"
                                                error={styling.error}
                                                helperText={styling.helperText}
                                                sx={styling.sx}
                                            onChange={(e) => {
                                                const value = e.target.value.toUpperCase();
                                                field.onChange(value);
                                                debouncedValidation(`addresses.${index}.street_line1`, value, 4);
                                                
                                                // Trigger debounced step validation to update button states
                                                setTimeout(() => {
                                                    triggerStepValidation(4);
                                                }, 350); // Slightly longer than field validation debounce
                                            }}
                                                onBlur={(e) => {
                                                    field.onBlur();
                                                    const validation = getImmediateValidation(`addresses.${index}.street_line1`, e.target.value.toUpperCase(), 4);
                                                    if (validation?.errors) {
                                                        setPersonError(`addresses.${index}.street_line1`, { message: Object.values(validation.errors)[0] });
                                                    } else {
                                                        clearPersonErrors(`addresses.${index}.street_line1`);
                                                    }
                                                    triggerStepValidation(4);
                                                }}
                                            />
                                        );
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12} md={3}>
                                <Controller
                                    name={`addresses.${index}.street_line2`}
                                    control={personForm.control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            size="small"
                                            label="Address Line 2"
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
                                    name={`addresses.${index}.locality`}
                                    control={personForm.control}
                                    render={({ field }) => {
                                        const fieldState = formValidation.getFieldState(`addresses.${index}.locality`, field.value, 4);
                                        const styling = useFieldStyling(
                                            fieldState,
                                            personForm.formState.errors.addresses?.[index]?.locality?.message as string,
                                            true
                                        );

                                        return (
                                        <TextField
                                                name={field.name}
                                                value={field.value || ''}
                                            fullWidth
                                            size="small"
                                            label="Locality *"
                                                error={styling.error}
                                                helperText={styling.helperText}
                                                sx={styling.sx}
                                            onChange={(e) => {
                                                const value = e.target.value.toUpperCase();
                                                field.onChange(value);
                                                debouncedValidation(`addresses.${index}.locality`, value, 4);
                                                
                                                // Trigger debounced step validation to update button states
                                                setTimeout(() => {
                                                    triggerStepValidation(4);
                                                }, 350); // Slightly longer than field validation debounce
                                            }}
                                                onBlur={(e) => {
                                                    field.onBlur();
                                                    const validation = getImmediateValidation(`addresses.${index}.locality`, e.target.value.toUpperCase(), 4);
                                                    if (validation?.errors) {
                                                        setPersonError(`addresses.${index}.locality`, { message: Object.values(validation.errors)[0] });
                                                    } else {
                                                        clearPersonErrors(`addresses.${index}.locality`);
                                                    }
                                                    triggerStepValidation(4);
                                                }}
                                            />
                                        );
                                    }}
                                />
                            </Grid>

                            {/* Row 3: Town, Province, Country, and Postal Code */}
                            <Grid item xs={12} md={3}>
                                <Controller
                                    name={`addresses.${index}.town`}
                                    control={personForm.control}
                                    render={({ field }) => {
                                        const fieldState = formValidation.getFieldState(`addresses.${index}.town`, field.value, 4);
                                        const styling = useFieldStyling(
                                            fieldState,
                                            personForm.formState.errors.addresses?.[index]?.town?.message as string,
                                            true
                                        );

                                        return (
                                        <TextField
                                                name={field.name}
                                                value={field.value || ''}
                                            fullWidth
                                            size="small"
                                            label="Town *"
                                                error={styling.error}
                                                helperText={styling.helperText}
                                                sx={styling.sx}
                                            onChange={(e) => {
                                                const value = e.target.value.toUpperCase();
                                                field.onChange(value);
                                                debouncedValidation(`addresses.${index}.town`, value, 4);
                                                
                                                // Trigger debounced step validation to update button states
                                                setTimeout(() => {
                                                    triggerStepValidation(4);
                                                }, 350); // Slightly longer than field validation debounce
                                            }}
                                                onBlur={(e) => {
                                                    field.onBlur();
                                                    const validation = getImmediateValidation(`addresses.${index}.town`, e.target.value.toUpperCase(), 4);
                                                    if (validation?.errors) {
                                                        setPersonError(`addresses.${index}.town`, { message: Object.values(validation.errors)[0] });
                                                    } else {
                                                        clearPersonErrors(`addresses.${index}.town`);
                                                    }
                                                    triggerStepValidation(4);
                                                }}
                                            />
                                        );
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12} md={4}>
                                <Controller
                                    name={`addresses.${index}.province_code`}
                                    control={personForm.control}
                                    render={({ field }) => (
                                        <FormControl fullWidth size="small" error={!!personForm.formState.errors.addresses?.[index]?.province_code}>
                                            <InputLabel>Province *</InputLabel>
                                            <Select {...field} label="Province *">
                                                {provinces.map((option) => (
                                                    <MenuItem key={option.code} value={option.code}>
                                                        {option.name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                            <FormHelperText>
                                                {personForm.formState.errors.addresses?.[index]?.province_code?.message}
                                            </FormHelperText>
                                        </FormControl>
                                    )}
                                />
                            </Grid>

                            <Grid item xs={12} md={3}>
                                <Controller
                                    name={`addresses.${index}.country`}
                                    control={personForm.control}
                                    render={({ field }) => {
                                        const fieldState = formValidation.getFieldState(`addresses.${index}.country`, field.value, 4);
                                        const styling = useSelectStyling(
                                            fieldState,
                                            personForm.formState.errors.addresses?.[index]?.country?.message as string,
                                            true
                                        );

                                        return (
                                            <FormControl fullWidth size="small" error={styling.error}>
                                                <InputLabel>Country *</InputLabel>
                                                <Select 
                                                    name={field.name}
                                                    label="Country *"
                                                    value={field.value || (countries.length > 0 ? countries[0].value : 'MG')} // Ensure default value
                                                    onChange={(e) => {
                                                        const value = e.target.value || (countries.length > 0 ? countries[0].value : 'MG');
                                                        field.onChange(value);
                                                        debouncedValidation(`addresses.${index}.country`, value, 4);
                                                        
                                                        // Trigger debounced step validation to update button states
                                                        setTimeout(() => {
                                                            triggerStepValidation(4);
                                                        }, 350);
                                                    }}
                                                    onBlur={(e) => {
                                                        field.onBlur();
                                                        const validation = getImmediateValidation(`addresses.${index}.country`, (e.target as any).value, 4);
                                                        if (validation?.errors) {
                                                            setPersonError(`addresses.${index}.country`, { message: Object.values(validation.errors)[0] });
                                                        } else {
                                                            clearPersonErrors(`addresses.${index}.country`);
                                                        }
                                                        triggerStepValidation(4);
                                                    }}
                                                    sx={styling.sx}
                                                >
                                                    {countries.map((option) => (
                                                        <MenuItem key={option.value} value={option.value}>
                                                            {option.label}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                                <FormHelperText>
                                                    {styling.helperText}
                                                </FormHelperText>
                                            </FormControl>
                                        );
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12} md={2}>
                                <Controller
                                    name={`addresses.${index}.postal_code`}
                                    control={personForm.control}
                                    render={({ field }) => {
                                        const fieldState = formValidation.getFieldState(`addresses.${index}.postal_code`, field.value, 4);
                                        const styling = useFieldStyling(
                                            fieldState,
                                            personForm.formState.errors.addresses?.[index]?.postal_code?.message as string,
                                            true
                                        );

                                        return (
                                        <TextField
                                                name={field.name}
                                                value={field.value || ''}
                                            fullWidth
                                            size="small"
                                            label="Postal Code *"
                                            placeholder="###"
                                                error={styling.error}
                                                helperText={styling.helperText}
                                                sx={styling.sx}
                                            inputProps={{
                                                maxLength: 3,
                                                pattern: '[0-9]*',
                                                inputMode: 'numeric'
                                            }}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '');
                                                field.onChange(value);
                                                debouncedValidation(`addresses.${index}.postal_code`, value, 4);
                                                
                                                // Trigger debounced step validation to update button states
                                                setTimeout(() => {
                                                    triggerStepValidation(4);
                                                }, 350); // Slightly longer than field validation debounce
                                            }}
                                                onBlur={(e) => {
                                                    field.onBlur();
                                                    const validation = getImmediateValidation(`addresses.${index}.postal_code`, e.target.value.replace(/\D/g, ''), 4);
                                                    if (validation?.errors) {
                                                        setPersonError(`addresses.${index}.postal_code`, { message: Object.values(validation.errors)[0] });
                                                    } else {
                                                        clearPersonErrors(`addresses.${index}.postal_code`);
                                                    }
                                                    triggerStepValidation(4);
                                                }}
                                            />
                                        );
                                    }}
                                />
                            </Grid>

                            {index > 0 && (
                                <Grid item xs={12}>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        onClick={() => removeAddress(index)}
                                        size="small"
                                        sx={{ mt: 1 }}
                                    >
                                        Remove Address
                                    </Button>
                                </Grid>
                            )}
                        </Grid>
                    </Box>
                ))}

                <Button
                    variant="outlined"
                    onClick={() => appendAddress({
                        address_type: 'POSTAL',
                        street_line1: '',
                        street_line2: '',
                        locality: '',
                        postal_code: '',
                        town: '',
                        country: 'MG',
                        province_code: '',
                        is_primary: false,
                    })}
                    size="small"
                >
                    Add Additional Address
                </Button>
            </Box>
        </Paper>
    );

    const renderReviewStep = () => {
        const formData = personForm.getValues();

        return (
            <Paper 
                key="review-step"
                elevation={0}
                sx={{ 
                    bgcolor: 'transparent',
                    boxShadow: 'none',
                    border: 'none'
                }}
            >
                <Box sx={{ p: 1.5 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, fontSize: '1rem', mb: 1 }}>
                        Review & Submit
                    </Typography>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        {mode === 'application' && !isNewPerson ? (
                            <Alert severity="success" sx={{ flex: 1, mr: 2, py: 0.5 }}>
                                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Person information is complete and ready for license application.</Typography>
                            </Alert>
                        ) : (
                            <Alert severity="info" sx={{ flex: 1, mr: 2, py: 0.5 }}>
                                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Please review all information before creating the person record.</Typography>
                            </Alert>
                        )}
                        {!isNewPerson && mode === 'application' && (
                            <Button
                                variant="outlined"
                                startIcon={<EditIcon />}
                                onClick={() => setCurrentStep(1)}
                                size="small"
                            >
                                Edit Details
                            </Button>
                        )}
                    </Box>

                    {/* Personal Information Summary */}
                    <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
                        <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                            Personal Information
                        </Typography>

                        <Grid container spacing={1}>
                            <Grid item xs={12} md={4}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Full Name</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                                    {[formData.surname, formData.first_name, formData.middle_name].filter(Boolean).join(' ')}
                                </Typography>
                            </Grid>
                            <Grid item xs={6} md={2}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Gender</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                                    {personNatures.find(n => n.value === formData.person_nature)?.label || 'NOT SPECIFIED'}
                                </Typography>
                            </Grid>
                            <Grid item xs={6} md={2}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Birth Date</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                                    {formData.birth_date || 'NOT PROVIDED'}
                                </Typography>
                            </Grid>
                            <Grid item xs={6} md={2}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Nationality</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                                    {formData.nationality_code === 'MG' ? 'MALAGASY' :
                                        formData.nationality_code === 'FR' ? 'FRENCH' :
                                            formData.nationality_code === 'US' ? 'AMERICAN' :
                                                formData.nationality_code?.toUpperCase() || 'NOT SPECIFIED'}
                                </Typography>
                            </Grid>
                            <Grid item xs={6} md={2}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Language</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                                    {languages.find(l => l.value === formData.preferred_language)?.label || 'NOT SPECIFIED'}
                                </Typography>
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Contact Information Summary */}
                    {(formData.email_address || formData.cell_phone) && (
                        <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
                            <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                            Contact Information
                        </Typography>

                            <Grid container spacing={1}>
                            {formData.email_address && (
                                <Grid item xs={12} md={6}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Email</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                                        {formData.email_address}
                                    </Typography>
                                </Grid>
                            )}
                            {formData.cell_phone && (
                                <Grid item xs={12} md={6}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Cell Phone</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                                        {formData.cell_phone_country_code} {formData.cell_phone}
                                    </Typography>
                                </Grid>
                            )}
                        </Grid>
                    </Box>
                    )}

                    {/* Documents & Addresses in a more compact layout */}
                    <Grid container spacing={1.5}>
                    {/* Documents Summary */}
                        <Grid item xs={12} md={6}>
                            <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                        Documents ({formData.aliases?.length || 0})
                    </Typography>
                    {formData.aliases?.map((alias, index) => (
                                <Box key={index} sx={{ mb: 0.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                        {documentTypes.find(type => type.value === alias.document_type)?.label || alias.document_type}
                                    </Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                                        {alias.document_number}
                                    </Typography>
                                        </Box>
                                        <Box>
                                            {alias.is_primary && <Chip label="PRIMARY" size="small" color="primary" sx={{ fontSize: '0.6rem', height: '18px' }} />}
                                        </Box>
                                    </Box>
                        </Box>
                    ))}
                        </Grid>

                    {/* Addresses Summary */}
                        <Grid item xs={12} md={6}>
                            <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                        Addresses ({formData.addresses?.length || 0})
                    </Typography>
                    {formData.addresses?.map((address, index) => (
                                <Box key={index} sx={{ mb: 0.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                                {address.address_type === 'RESIDENTIAL' ? 'RESIDENTIAL' : 'POSTAL'}
                                    </Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                                        {[address.street_line1, address.street_line2, address.locality, address.town].filter(Boolean).join(', ')}
                                        {address.postal_code && ` - ${address.postal_code}`}
                                    </Typography>
                                        </Box>
                                        {address.is_primary && <Chip label="PRIMARY" size="small" color="primary" sx={{ fontSize: '0.6rem', height: '18px' }} />}
                                    </Box>
                        </Box>
                    ))}
                        </Grid>
                    </Grid>


                </Box>
            </Paper>
        );
    };

    // Check permissions
    if (!hasPermission('persons.create')) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">
                    You don't have permission to create persons. Contact your administrator.
                </Alert>
            </Box>
        );
    }

    return (
        <>
        {/* Main Container - Restructured for full-width navigation */}
        <Box sx={{ 
            bgcolor: '#f8f9fa', 
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            height: mode === 'application' ? '100%' : 'auto',
            minHeight: mode === 'application' ? '100%' : 'auto',
            flex: mode === 'application' ? 1 : 'none'
        }}>
            {/* Content Container - Tabs and Form Content with padding */}
            <Box sx={{ 
                flex: 1,
                overflow: 'hidden', // No scroll on outer container
                p: 2, // Padding for content area
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0 // Allow flex shrinking
            }}>
                <Box sx={{ 
                    maxWidth: mode === 'application' ? 'none' : 1200, // No max width in application mode
                    mx: mode === 'application' ? 0 : 'auto', // No horizontal margin in application mode
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    overflow: 'hidden' // Prevent this container from scrolling
                }}>
                {showHeader && (
                    <Paper 
                        elevation={0}
                        sx={{ 
                            p: 2, 
                            mb: 3,
                            bgcolor: 'white',
                            boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                            borderRadius: 2,
                            flexShrink: 0 // Prevent header from shrinking
                        }}
                    >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
                            {title}
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {mode === 'standalone' && (
                                <Button
                                    variant="outlined"
                                    onClick={resetForm}
                                    startIcon={<ClearIcon />}
                                        size="small"
                                >
                                    Start Over
                                </Button>
                            )}
                            {(mode === 'application' || mode === 'search') && onCancel && (
                                <Button
                                    variant="outlined"
                                    onClick={handleFormCancel}
                                        size="small"
                                >
                                    Cancel
                                </Button>
                            )}
                        </Box>
                    </Box>

                        <Typography variant="body2" color="text.secondary">
                        {subtitle}
                    </Typography>
                    </Paper>
            )}

            {/* Person Form Tabs */}
            <Paper 
                elevation={0}
                                    sx={{
                    mb: 2,
                    bgcolor: 'white',
                    boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                    borderRadius: 2,
                    flexShrink: 0 // Prevent tabs from shrinking
                }}
            >
                <Tabs
                    value={currentStep}
                    onChange={handleTabChange}
                    sx={{
                        px: 2,
                        '& .MuiTab-root': {
                            minHeight: 40,
                            textTransform: 'none',
                            fontSize: '0.8rem',
                            color: 'text.secondary',
                            bgcolor: 'primary.50',
                            mx: 0.5,
                            borderRadius: '6px 6px 0 0',
                            '&.Mui-selected': {
                                bgcolor: 'primary.100',
                                color: 'primary.main',
                            },
                            '&:hover': {
                                bgcolor: 'primary.100',
                                '&.Mui-selected': {
                                    bgcolor: 'primary.100',
                                }
                            },
                            '&.Mui-disabled': {
                                opacity: 0.4
                            }
                        },
                        '& .MuiTabs-indicator': {
                            display: 'none'
                        }
                    }}
                >
                    {steps.map((step, index) => {
                        const canClick = isTabClickable(index);
                        const isDisabled = (skipFirstStep && index === 0) || (!canClick && index !== currentStep);
                        return (
                            <Tab
                                key={step.label}
                                label={renderTabLabel(step, index)}
                                disabled={isDisabled}
                            />
                        );
                    })}
                </Tabs>
            </Paper>

            {/* Main Form Container - Scrollable form content */}
            <Paper 
                elevation={0}
                onKeyDown={(e) => {
                    // Enter key shortcut to proceed to next step
                    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
                        // Only trigger if no field is focused (avoid interfering with field input)
                        const activeElement = document.activeElement;
                        if (!activeElement || activeElement.tagName === 'BODY') {
                            e.preventDefault();
                            handleNext();
                        }
                    }
                }}
                sx={{ 
                    bgcolor: 'white',
                    boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                    borderRadius: 2,
                    mb: 2, // Add margin bottom for spacing from navigation
                    flex: 1,
                    overflow: 'auto', // Allow scroll on form content
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Missing Fields Alert - Show if existing person has incomplete data */}
                {isExistingPerson && stepValidation.some(valid => !valid) && personDataWasIncomplete && (
                        <Alert 
                            severity="warning" 
                            sx={{ 
                            m: 2,
                            mb: 1,
                                '& .MuiAlert-message': {
                                    width: '100%'
                                },
                                flexShrink: 0 // Prevent alert from shrinking
                            }}
                        >
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                Missing Mandatory Information
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1, fontSize: '0.875rem' }}>
                            Some required fields are missing. Please complete all steps marked with warning icons.
                            </Typography>
                        </Alert>
                )}

                {/* Step Content - Form content area */}
                <Box 
                    ref={stepContentRef} 
                    sx={{ 
                        flex: 1,
                        overflow: 'visible' // No scroll here since parent handles it
                    }}
                >
                {renderStepContent()}
                </Box>
            </Paper>
                </Box>
            </Box>

            {/* Navigation - Full width at bottom */}
            <Box sx={{ 
                        bgcolor: 'white',
                borderTop: '1px solid', 
                borderColor: 'divider', 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: 1,
                p: 2,
                flexShrink: 0,
                // Full width navigation styling
                width: '100%',
                borderRadius: '0 0 8px 8px' // Only round bottom corners
            }}>
                {/* Cancel Button - Show in application mode */}
                {mode === 'application' && onCancel && (
                    <Button
                        onClick={onCancel}
                        color="secondary"
                        size="small"
                    >
                        Cancel
                    </Button>
                )}

                {/* Back Button */}
                    <Button
                        disabled={currentStep === (skipFirstStep ? 1 : 0)}
                        onClick={handleBack}
                    startIcon={<ArrowBackIcon />}
                            size="small"
                    >
                        Back
                    </Button>

                {/* Next/Submit Button */}
                        {currentStep < steps.length - 1 ? (
                            <Button
                                variant="contained"
                                onClick={handleNext}
                                    disabled={lookupLoading || isNextButtonDisabled()}
                        startIcon={lookupLoading ? <CircularProgress size={20} /> : undefined}
                        endIcon={<ArrowForwardIcon />}
                                        size="small"
                            >
                        {currentStep === 0 ? 'Search' : 'Next Step'}
                            </Button>
                            ) : (
                                <Button
                                    variant="contained"
                            onClick={() => {
                                // In application mode on review step with existing person, continue to license
                                if (mode === 'application' && currentStep === steps.length - 1 && isExistingPerson && onContinueToApplication) {
                                    onContinueToApplication();
                                } else {
                                    // Otherwise submit/save the person
                                    handleSubmit();
                                }
                            }}
                                    disabled={submitLoading || duplicateCheckLoading}
                            startIcon={submitLoading || duplicateCheckLoading ? <CircularProgress size={20} /> : 
                                       (mode === 'application' && currentStep === steps.length - 1 && isExistingPerson ? <ArrowForwardIcon /> : <PersonAddIcon />)}
                                    size="small"
                                >
                            {duplicateCheckLoading ? 'Checking...' : 
                             submitLoading ? (isEditMode ? 'Updating...' : 'Submitting...') : 
                             (mode === 'application' && currentStep === steps.length - 1 && isExistingPerson ? 'Continue to License' : 
                              (isEditMode ? 'Update Person' : 'Submit'))}
                                </Button>
            )}
            </Box>
        </Box>

            {/* Duplicate Detection Dialog */}
            <Dialog
                open={showDuplicateDialog}
                onClose={() => {}}
                disableEscapeKeyDown
                maxWidth="md"
                fullWidth
                slotProps={{
                    backdrop: {
                        onClick: (event) => {
                            console.log('🚨 PersonFormWrapper DUPLICATE DIALOG: Backdrop clicked!', event);
                            event.stopPropagation();
                            event.preventDefault();
                        }
                    }
                }}
            >
                <DialogTitle sx={{ bgcolor: 'warning.main', color: 'white' }}>
                    <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <WarningIcon />
                        Potential Duplicate Records Found
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Alert severity="warning" sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            We found {potentialDuplicates.length} potential duplicate record(s)
                        </Typography>
                        <Typography variant="body2">
                            Review the matches below to determine if this person already exists in the system.
                        </Typography>
                    </Alert>

                    {potentialDuplicates.map((duplicate, index) => (
                        <Paper key={index} sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'warning.light' }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={8}>
                                    <Typography variant="h6" color="primary.main">
                                        {duplicate.first_name} {duplicate.surname}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Born: {duplicate.birth_date || 'Not specified'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Document: {duplicate.primary_document || 'Not specified'}
                                    </Typography>
                                </Grid>

                                <Grid item xs={12} sm={4}>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Chip
                                            label={`${duplicate.similarity_score.toFixed(1)}% Match`}
                                            color={duplicate.similarity_score >= 90 ? 'error' : duplicate.similarity_score >= 80 ? 'warning' : 'info'}
                                            sx={{ fontWeight: 600 }}
                                        />
                                    </Box>
                                </Grid>

                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Match Details:
                                    </Typography>
                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                        {duplicate.match_criteria?.birth_date_match && (
                                            <Chip label="Birth Date Match" size="small" color="error" />
                                        )}
                                        {duplicate.match_criteria?.surname_match && (
                                            <Chip label="Surname Match" size="small" color="error" />
                                        )}
                                        {duplicate.match_criteria?.first_name_similar && (
                                            <Chip label="First Name Similar" size="small" color="warning" />
                                        )}
                                        {duplicate.match_criteria?.phone_match && (
                                            <Chip label="Phone Match" size="small" color="error" />
                                        )}
                                        {duplicate.match_criteria?.address_similar && (
                                            <Chip label="Address Similar" size="small" color="info" />
                                        )}
                                    </Stack>
                                </Grid>

                                <Grid item xs={12}>
                                    <Button
                                        variant="outlined"
                                        startIcon={<EditIcon />}
                                        onClick={() => handleUpdateExistingPerson(duplicate.id)}
                                        sx={{ mt: 1 }}
                                    >
                                        Update This Person Instead
                                    </Button>
                                </Grid>
                            </Grid>
                        </Paper>
                    ))}
                </DialogContent>
                <DialogActions sx={{ p: 3, gap: 1 }}>
                    <Button
                        onClick={() => setShowDuplicateDialog(false)}
                        variant="outlined"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleKeepNewPerson}
                        variant="contained"
                        color="warning"
                        startIcon={<PersonAddIcon />}
                    >
                        Keep New Person (Create Anyway)
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Success Dialog */}
            <Dialog
                open={showSuccessDialog}
                onClose={(event, reason) => {
                    console.log('🚨 PersonFormWrapper SUCCESS DIALOG: onClose called!', { event, reason });
                }}
                disableEscapeKeyDown
                maxWidth="sm"
                fullWidth
                slotProps={{
                    backdrop: {
                        onClick: (event) => {
                            console.log('🚨 PersonFormWrapper SUCCESS DIALOG: Backdrop clicked!', event);
                            event.stopPropagation();
                            event.preventDefault();
                        }
                    }
                }}
            >
                <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
                    <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonAddIcon />
                        {isEditMode ? 'Person Updated Successfully!' : 'Person Created Successfully!'}
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    {createdPerson && (
                        <Box>
                            <Typography variant="body1" gutterBottom>
                                <strong>{createdPerson.first_name} {createdPerson.surname}</strong> has been successfully {isEditMode ? 'updated' : 'created'} in the system.
                            </Typography>

                            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <Typography variant="subtitle2" color="text.secondary">Person ID:</Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                                    {createdPerson.id}
                                </Typography>
                            </Box>

                            <Alert severity="success" sx={{ mt: 2 }}>
                                The person record is now available for license applications and other system processes.
                            </Alert>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3, gap: 1 }}>
                    {mode === 'standalone' ? (
                        <>
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
                                startIcon={<PersonAddIcon />}
                            >
                                Create Another Person
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                onClick={() => {
                                    setShowSuccessDialog(false);
                                    resetForm();
                                }}
                                variant="outlined"
                            >
                                Create Another Person
                            </Button>
                            <Button
                                onClick={() => {
                                    setShowSuccessDialog(false);
                                    handleFormComplete(createdPerson);
                                }}
                                variant="contained"
                                startIcon={mode === 'application' ? <ArrowForwardIcon /> : <ArrowBackIcon />}
                            >
                                {mode === 'application' ? 'Continue to Application' : 'Return to Search'}
                            </Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>
        </>
    );
};

export default PersonFormWrapper; 