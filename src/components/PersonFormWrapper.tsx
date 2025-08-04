/**
 * PersonFormWrapper - Reusable Person Form Component
 * Handles person creation/editing with context-aware navigation
 * Multi-step registration/editing adapted for Madagascar natural persons
 */

import React, { useState, useEffect, useRef } from 'react';
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
    Checkbox,
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
    Search as SearchIcon,
    PersonAdd as PersonAddIcon,
    Edit as EditIcon,
    Clear as ClearIcon,
    Visibility as VisibilityIcon,
    Warning as WarningIcon,
    ArrowForward as ArrowForwardIcon,
    ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useSearchParams } from 'react-router-dom';

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
    'Document Lookup',
    'Personal Information',
    'Contact Details',
    'ID Documents',
    'Address Information',
    'Review & Submit',
];

// Props interface for PersonFormWrapper
interface PersonFormWrapperProps {
    mode?: 'standalone' | 'application' | 'search';
    onComplete?: (person: any) => void;
    onCancel?: () => void;
    onSuccess?: (person: any, isEdit: boolean) => void;
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

    // Ref for auto-scrolling to active step content
    const stepContentRef = useRef<HTMLDivElement>(null);

    // State management
    const [currentStep, setCurrentStep] = useState(skipFirstStep ? 1 : 0);
    const [personFound, setPersonFound] = useState<ExistingPerson | null>(null);
    const [currentPersonId, setCurrentPersonId] = useState<string | null>(null);
    const [isNewPerson, setIsNewPerson] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [personDataWasIncomplete, setPersonDataWasIncomplete] = useState(false);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [stepValidation, setStepValidation] = useState<boolean[]>(new Array(steps.length).fill(false));
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [createdPerson, setCreatedPerson] = useState<any>(null);
    const [duplicateCheckLoading, setDuplicateCheckLoading] = useState(false);
    const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
    const [potentialDuplicates, setPotentialDuplicates] = useState<any[]>([]);
    const [duplicateThreshold] = useState(70.0);
    const [pendingPersonPayload, setPendingPersonPayload] = useState<any>(null);

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

    // Watch form values
    const watchedPersonNature = personForm.watch('person_nature');

    // Context-aware completion handler
    const handleFormComplete = (person: any) => {
        setCreatedPerson(person);
        
        // If onSuccess callback is provided, use it instead of internal logic
        if (onSuccess) {
            onSuccess(person, isEditMode);
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
                console.log('Search result structure:', JSON.stringify(searchResult, null, 2));

                if (Array.isArray(searchResult) && searchResult.length > 0) {
                    // Person found with full details (includes aliases and addresses)
                    const existingPerson = searchResult[0];
                    console.log('Person found with full details:', existingPerson);
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
                        
                        const isComplete = isPersonDataComplete(existingPerson);
                        setPersonDataWasIncomplete(!isComplete);
                        
                        if (isComplete) {
                            // Person has complete information - jump to review step
                            markStepValid(1, true); // Personal info step
                            markStepValid(2, true); // Contact details step
                            markStepValid(3, true); // ID documents step
                            markStepValid(4, true); // Address step
                            setCurrentStep(5); // Jump to review step for confirmation
                        } else {
                            // Person has incomplete information - start at personal info step
                            setCurrentStep(1);
                        }
                    } else {
                        // For standalone mode, proceed to personal information step
                        markStepValid(0, true);
                        setCurrentStep(1);
                    }
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
                const errorText = await response.text();
                console.error('Error response:', errorText);
                // Fallback to new person creation on API failure
                setPersonFound(null);
                setIsNewPerson(true);
                setupNewPersonForm(data);
                markStepValid(0, true);
                setCurrentStep(1);
            }

        } catch (error) {
            console.error('Lookup failed:', error);
            // Fallback to new person creation on error
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
                country: 'MADAGASCAR',
                province_code: defaultProvinceCode,
                is_primary: true,
            }],
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
                country: address.country?.toUpperCase() || 'MADAGASCAR',
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
                // Validate current step fields based on step
                const stepFields = getStepFields(currentStep);

                // Only trigger validation for specific fields if we have any to validate
                if (stepFields.length > 0) {
                    const isValid = await personForm.trigger(stepFields as any);
                    markStepValid(currentStep, isValid);
                    return isValid;
                } else {
                    // For steps with no specific validation fields, just mark as valid
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
            ['surname', 'first_name', 'person_nature', 'nationality_code', 'preferred_language'], // Only required fields for step 1
            [], // Contact step - don't validate on transition, let user fill optional fields
            [], // ID Documents step - complex validation handled separately
            ['addresses'], // Address step - validate all addresses
            [], // Review step
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
                // Auto-populate name_in_document when moving from step 1 (personal info) to step 2 (contact details)
                if (currentStep === 1) {
                    populateNameInDocument();
                }
                setCurrentStep(currentStep + 1);
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
        
        // Allow navigation to previous steps or completed steps
        if (stepIndex < currentStep || stepValidation[stepIndex]) {
            setCurrentStep(stepIndex);
        }
        // For step 0 (lookup), always allow navigation if we're not in new person mode
        if (stepIndex === 0 && !isNewPerson) {
            setCurrentStep(stepIndex);
        }
    };

    const handleSubmit = async () => {
        setSubmitLoading(true);

        try {
            const formData = personForm.getValues();
            console.log('📝 Raw form data from PersonFormWrapper:', formData);
            console.log('📍 Raw address data from form:', formData.addresses);

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

                // Transform addresses to match backend schema - ALL CAPITALIZED
                addresses: formData.addresses
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
                        country: address.country?.toUpperCase() || 'MADAGASCAR',
                        province_code: address.province_code?.toUpperCase() || '',
                        is_verified: false,
                    })),
            };

            console.log('✅ Transformed person payload for submission:', personPayload);
            console.log('📍 Address data being sent:', personPayload.addresses);

            if (isEditMode && currentPersonId) {
                // Update existing person
                console.log('Updating existing person:', currentPersonId);
                const response = await fetch(`${API_BASE_URL}/api/v1/persons/${currentPersonId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify(personPayload),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('API Error Response:', errorData);
                    throw new Error(errorData.detail || `HTTP ${response.status}: Failed to update person`);
                }

                const result = await response.json();
                console.log('Person updated successfully:', result);
                setCreatedPerson(result);
                handleFormComplete(result);
            } else {
                // Create new person (with duplicate check)
                await checkForDuplicates(personPayload);
            }

        } catch (error) {
            console.error('Submit failed:', error);
            alert(`Failed to ${isEditMode ? 'update' : 'create'} person: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setSubmitLoading(false);
        }
    };

    const checkForDuplicates = async (personPayload: any) => {
        setDuplicateCheckLoading(true);

        try {
            // Store the payload for later use
            setPendingPersonPayload(personPayload);

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
                await createPersonDirectly(personPayload);
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
                    await createPersonDirectly(personPayload);
                }
            } else {
                // No matches found - create person
                await createPersonDirectly(personPayload);
            }
        } catch (error) {
            console.error('Duplicate check failed:', error);
            // If duplicate check fails, try to create person normally
            await createPersonDirectly(personPayload);
        } finally {
            setDuplicateCheckLoading(false);
        }
    };

    const createPersonDirectly = async (personPayload: any) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/persons/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify(personPayload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP ${response.status}: Failed to create person`);
            }

            const result = await response.json();
            console.log('Person created successfully:', result);
            setCreatedPerson(result);
            handleFormComplete(result);
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
                await createPersonDirectly(pendingPersonPayload);
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
            elevation={0}
            sx={{ 
                bgcolor: 'white',
                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                borderRadius: 2
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
                            render={({ field }) => (
                                <TextField
                                    name={field.name}
                                    value={field.value || ''}
                                    fullWidth
                                    size="small"
                                    label="Document Number *"
                                    error={!!lookupForm.formState.errors.document_number}
                                    helperText={lookupForm.formState.errors.document_number?.message || 'Enter document number (numbers only)'}
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
                bgcolor: 'white',
                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                borderRadius: 2
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
                        <Controller
                            name="surname"
                            control={personForm.control}
                            render={({ field }) => (
                                <TextField
                                    id="person-surname"
                                    name={field.name}
                                    value={field.value || ''}
                                    fullWidth
                                    size="small"
                                    label="Surname *"
                                    error={!!personForm.formState.errors.surname}
                                    helperText={personForm.formState.errors.surname?.message || 'Family name'}
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
                        <Controller
                            name="first_name"
                            control={personForm.control}
                            render={({ field }) => (
                                <TextField
                                    id="person-first-name"
                                    name={field.name}
                                    value={field.value || ''}
                                    fullWidth
                                    size="small"
                                    label="First Name *"
                                    error={!!personForm.formState.errors.first_name}
                                    helperText={personForm.formState.errors.first_name?.message || 'Given name'}
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
                        <Controller
                            name="person_nature"
                            control={personForm.control}
                            render={({ field }) => (
                                <FormControl fullWidth size="small" error={!!personForm.formState.errors.person_nature}>
                                    <InputLabel>Gender *</InputLabel>
                                    <Select
                                        id="person-nature-select"
                                        name={field.name}
                                        value={field.value || ''}
                                        onChange={field.onChange}
                                        onBlur={field.onBlur}
                                        label="Gender *"
                                        MenuProps={{
                                            id: "person-nature-menu"
                                        }}
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

                    <Grid item xs={12} md={4}>
                        <Controller
                            name="birth_date"
                            control={personForm.control}
                            render={({ field }) => (
                                <TextField
                                    id="person-birth-date"
                                    name={field.name}
                                    value={field.value || ''}
                                    fullWidth
                                    size="small"
                                    type="date"
                                    label="Date of Birth"
                                    InputLabelProps={{ shrink: true }}
                                    helperText="Date of birth"
                                    inputProps={{
                                        min: "1900-01-01",
                                        max: new Date().toISOString().split('T')[0]
                                    }}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                />
                            )}
                        />
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <Controller
                            name="nationality_code"
                            control={personForm.control}
                            render={({ field }) => (
                                <FormControl fullWidth size="small">
                                    <InputLabel>Nationality *</InputLabel>
                                    <Select
                                        id="nationality-code-select"
                                        name={field.name}
                                        value={field.value || 'MG'}
                                        onChange={field.onChange}
                                        onBlur={field.onBlur}
                                        label="Nationality *"
                                        MenuProps={{
                                            id: "nationality-menu"
                                        }}
                                    >
                                        <MenuItem value="MG">MALAGASY</MenuItem>
                                        <MenuItem value="FR">FRENCH</MenuItem>
                                        <MenuItem value="US">AMERICAN</MenuItem>
                                    </Select>
                                </FormControl>
                            )}
                        />
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <Controller
                            name="preferred_language"
                            control={personForm.control}
                            render={({ field }) => (
                                <FormControl fullWidth size="small" error={!!personForm.formState.errors.preferred_language}>
                                    <InputLabel>Preferred Language *</InputLabel>
                                    <Select
                                        id="preferred-language-select"
                                        name={field.name}
                                        value={field.value || (languages.length > 0 ? languages[0].value : 'MG')}
                                        onChange={field.onChange}
                                        onBlur={field.onBlur}
                                        label="Preferred Language *"
                                        MenuProps={{
                                            id: "preferred-language-menu"
                                        }}
                                    >
                                        {languages.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    <FormHelperText>
                                        {personForm.formState.errors.preferred_language?.message || 'Select preferred language'}
                                    </FormHelperText>
                                </FormControl>
                            )}
                        />
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
                bgcolor: 'white',
                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                borderRadius: 2
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
                        <Controller
                            name="email_address"
                            control={personForm.control}
                            render={({ field }) => (
                                <TextField
                                    id="contact-email-address"
                                    name={field.name}
                                    value={field.value || ''}
                                    fullWidth
                                    size="small"
                                    type="email"
                                    label="Email Address"
                                    error={!!personForm.formState.errors.email_address}
                                    helperText={personForm.formState.errors.email_address?.message || 'Email address (optional)'}
                                    inputProps={{ maxLength: 100 }}
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
                        <Controller
                            name="work_phone"
                            control={personForm.control}
                            render={({ field }) => (
                                <TextField
                                    id="contact-work-phone"
                                    name={field.name}
                                    value={field.value || ''}
                                    fullWidth
                                    size="small"
                                    label="Work Phone"
                                    error={!!personForm.formState.errors.work_phone}
                                    helperText={personForm.formState.errors.work_phone?.message || 'Work phone number (optional)'}
                                    inputProps={{
                                        maxLength: 20,
                                        pattern: '[0-9]*',
                                        inputMode: 'numeric'
                                    }}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        field.onChange(value);
                                    }}
                                    onBlur={field.onBlur}
                                />
                            )}
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
                            render={({ field }) => (
                                <FormControl fullWidth size="small">
                                    <InputLabel>Country Code *</InputLabel>
                                    <Select
                                        id="cell-phone-country-code-select"
                                        name={field.name}
                                        value={field.value || '+261'}
                                        onChange={field.onChange}
                                        onBlur={field.onBlur}
                                        label="Country Code *"
                                        MenuProps={{
                                            id: "country-code-menu"
                                        }}
                                    >
                                        <MenuItem value="+261">+261 (MADAGASCAR)</MenuItem>
                                        <MenuItem value="+27">+27 (SOUTH AFRICA)</MenuItem>
                                        <MenuItem value="+33">+33 (FRANCE)</MenuItem>
                                        <MenuItem value="+1">+1 (USA)</MenuItem>
                                        <MenuItem value="+44">+44 (UK)</MenuItem>
                                    </Select>
                                    <FormHelperText>Select country code</FormHelperText>
                                </FormControl>
                            )}
                        />
                    </Grid>

                    <Grid item xs={12} md={9}>
                        <Controller
                            name="cell_phone"
                            control={personForm.control}
                            render={({ field }) => (
                                <TextField
                                    id="contact-cell-phone"
                                    name={field.name}
                                    value={field.value || ''}
                                    fullWidth
                                    size="small"
                                    label="Cell Phone Number"
                                    placeholder="Example: 0815598453"
                                    error={!!personForm.formState.errors.cell_phone}
                                    helperText={personForm.formState.errors.cell_phone?.message || 'Madagascar cell phone (10 digits, will auto-add 0 if missing)'}
                                    inputProps={{
                                        maxLength: 10,
                                        pattern: '[0-9]*',
                                        inputMode: 'numeric',
                                    }}
                                    onChange={(e) => {
                                        let value = e.target.value.replace(/\D/g, '');

                                        // Ensure Madagascar format: must start with 0 and be exactly 10 digits
                                        if (value.length > 0 && !value.startsWith('0')) {
                                            value = '0' + value;
                                        }

                                        // Limit to 10 digits max
                                        if (value.length > 10) {
                                            value = value.substring(0, 10);
                                        }

                                        field.onChange(value);
                                    }}
                                    onBlur={field.onBlur}
                                />
                            )}
                        />
                    </Grid>
                </Grid>
            </Box>
        </Paper>
    );

    const renderIdDocumentsStep = () => (
        <Paper 
            elevation={0}
            sx={{ 
                bgcolor: 'white',
                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                borderRadius: 2
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
                                    render={({ field }) => (
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Document Type</InputLabel>
                                            <Select {...field} label="Document Type" disabled={index === 0}>
                                                {documentTypes.map((option) => (
                                                    <MenuItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                            {index === 0 && (
                                                <FormHelperText>Primary document from lookup</FormHelperText>
                                            )}
                                        </FormControl>
                                    )}
                                />
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Controller
                                    name={`aliases.${index}.document_number`}
                                    control={personForm.control}
                                    render={({ field }) => (
                                        <TextField
                                            name={field.name}
                                            value={field.value || ''}
                                            fullWidth
                                            size="small"
                                            label="Document Number"
                                            disabled={index === 0}
                                            helperText={index === 0 ? 'From lookup step' : 'Additional document number (numbers only)'}
                                            onChange={(e) => {
                                                // Allow only numbers for document numbers
                                                const value = e.target.value.replace(/\D/g, '');
                                                field.onChange(value);
                                            }}
                                            onBlur={field.onBlur}
                                        />
                                    )}
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
                                    render={({ field }) => (
                                        <TextField
                                            name={field.name}
                                            value={field.value || ''}
                                            fullWidth
                                            size="small"
                                            label="Name in Document"
                                            helperText="Name as it appears in the document (will be capitalized)"
                                            onChange={(e) => {
                                                const value = e.target.value.toUpperCase();
                                                field.onChange(value);
                                            }}
                                            onBlur={field.onBlur}
                                        />
                                    )}
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
            elevation={0}
            sx={{ 
                bgcolor: 'white',
                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                borderRadius: 2
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
                    Address Information
                </Typography>

                {addressFields.map((field, index) => (
                    <Box key={field.id} sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 2, backgroundColor: '#fafafa' }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                                    {index === 0 ? 'Primary Address' : `Additional Address ${index}`}
                                </Typography>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Controller
                                    name={`addresses.${index}.address_type`}
                                    control={personForm.control}
                                    render={({ field }) => (
                                        <FormControl fullWidth size="small" error={!!personForm.formState.errors.addresses?.[index]?.address_type}>
                                            <InputLabel>Address Type *</InputLabel>
                                            <Select {...field} label="Address Type *">
                                                <MenuItem value="RESIDENTIAL">Residential</MenuItem>
                                                <MenuItem value="POSTAL">Postal</MenuItem>
                                            </Select>
                                            <FormHelperText>
                                                {personForm.formState.errors.addresses?.[index]?.address_type?.message || 'Select address type'}
                                            </FormHelperText>
                                        </FormControl>
                                    )}
                                />
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Controller
                                    name={`addresses.${index}.is_primary`}
                                    control={personForm.control}
                                    render={({ field }) => (
                                        <FormControlLabel
                                            control={<Checkbox {...field} checked={field.value} />}
                                            label="Primary Address"
                                            sx={{ mt: 1 }}
                                        />
                                    )}
                                />
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Controller
                                    name={`addresses.${index}.street_line1`}
                                    control={personForm.control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            size="small"
                                            label="Address Line 1 *"
                                            error={!!personForm.formState.errors.addresses?.[index]?.street_line1}
                                            helperText={personForm.formState.errors.addresses?.[index]?.street_line1?.message || 'Street address line 1 (required)'}
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
                                    name={`addresses.${index}.street_line2`}
                                    control={personForm.control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            size="small"
                                            label="Address Line 2"
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
                                    name={`addresses.${index}.locality`}
                                    control={personForm.control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            size="small"
                                            label="Locality *"
                                            error={!!personForm.formState.errors.addresses?.[index]?.locality}
                                            helperText={personForm.formState.errors.addresses?.[index]?.locality?.message || 'Village, quartier, or city'}
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
                                    name={`addresses.${index}.postal_code`}
                                    control={personForm.control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            size="small"
                                            label="Postal Code *"
                                            placeholder="### (3 digits)"
                                            error={!!personForm.formState.errors.addresses?.[index]?.postal_code}
                                            helperText={personForm.formState.errors.addresses?.[index]?.postal_code?.message || 'Madagascar postal code (3 digits)'}
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
                                    name={`addresses.${index}.town`}
                                    control={personForm.control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            size="small"
                                            label="Town *"
                                            error={!!personForm.formState.errors.addresses?.[index]?.town}
                                            helperText={personForm.formState.errors.addresses?.[index]?.town?.message || 'Town or city'}
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
                                                {personForm.formState.errors.addresses?.[index]?.province_code?.message || 'Madagascar province/region (required)'}
                                            </FormHelperText>
                                        </FormControl>
                                    )}
                                />
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Controller
                                    name={`addresses.${index}.country`}
                                    control={personForm.control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            size="small"
                                            label="Country"
                                            disabled
                                            helperText="Madagascar addresses only"
                                        />
                                    )}
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
                        country: 'MADAGASCAR',
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
                elevation={0}
                sx={{ 
                    bgcolor: 'white',
                    boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                    borderRadius: 2
                }}
            >
                <Box sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                        Review & Submit
                    </Typography>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        {mode === 'application' && !isNewPerson ? (
                            <Alert severity="success" sx={{ flex: 1, mr: 2 }}>
                                Person information is complete and ready for license application.
                            </Alert>
                        ) : (
                            <Alert severity="info" sx={{ flex: 1, mr: 2 }}>
                                Please review all information before creating the person record.
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
                    <Box sx={{ mb: 2, p: 1.5, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
                        <Typography variant="body1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.95rem' }}>
                            Personal Information
                        </Typography>

                        <Grid container spacing={1.5}>
                            <Grid item xs={12} md={6}>
                                <Typography variant="caption" color="text.secondary">Full Name</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {[formData.surname, formData.first_name, formData.middle_name].filter(Boolean).join(' ')}
                                </Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <Typography variant="caption" color="text.secondary">Gender</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {personNatures.find(n => n.value === formData.person_nature)?.label || 'NOT SPECIFIED'}
                                </Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <Typography variant="caption" color="text.secondary">Language</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {languages.find(l => l.value === formData.preferred_language)?.label || 'NOT SPECIFIED'}
                                </Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <Typography variant="caption" color="text.secondary">Birth Date</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {formData.birth_date || 'NOT PROVIDED'}
                                </Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <Typography variant="caption" color="text.secondary">Nationality</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {formData.nationality_code === 'MG' ? 'MALAGASY' :
                                        formData.nationality_code === 'FR' ? 'FRENCH' :
                                            formData.nationality_code === 'US' ? 'AMERICAN' :
                                                formData.nationality_code?.toUpperCase() || 'NOT SPECIFIED'}
                                </Typography>
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Contact Information Summary */}
                    {(formData.email_address || formData.cell_phone) && (
                        <Box sx={{ mb: 2, p: 1.5, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
                            <Typography variant="body1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.95rem' }}>
                                Contact Information
                            </Typography>

                            <Grid container spacing={1.5}>
                                {formData.email_address && (
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="caption" color="text.secondary">Email</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            {formData.email_address}
                                        </Typography>
                                    </Grid>
                                )}
                                {formData.cell_phone && (
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="caption" color="text.secondary">Cell Phone</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            {formData.cell_phone_country_code} {formData.cell_phone}
                                        </Typography>
                                    </Grid>
                                )}
                            </Grid>
                        </Box>
                    )}

                    {/* Documents & Addresses in a more compact layout */}
                    <Grid container spacing={2}>
                        {/* Documents Summary */}
                        <Grid item xs={12} md={6}>
                            <Typography variant="body1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.95rem' }}>
                                Documents ({formData.aliases?.length || 0})
                            </Typography>
                            {formData.aliases?.map((alias, index) => (
                                <Box key={index} sx={{ mb: 1, p: 1.5, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                {documentTypes.find(type => type.value === alias.document_type)?.label || alias.document_type}
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                {alias.document_number}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            {alias.is_primary && <Chip label="PRIMARY" size="small" color="primary" sx={{ fontSize: '0.65rem', height: '20px' }} />}
                                        </Box>
                                    </Box>
                                </Box>
                            ))}
                        </Grid>

                        {/* Addresses Summary */}
                        <Grid item xs={12} md={6}>
                            <Typography variant="body1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.95rem' }}>
                                Addresses ({formData.addresses?.length || 0})
                            </Typography>
                            {formData.addresses?.map((address, index) => (
                                <Box key={index} sx={{ mb: 1, p: 1.5, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                {address.address_type === 'RESIDENTIAL' ? 'RESIDENTIAL' : 'POSTAL'}
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                                                {[address.street_line1, address.street_line2, address.locality, address.town].filter(Boolean).join(', ')}
                                                {address.postal_code && ` - ${address.postal_code}`}
                                            </Typography>
                                        </Box>
                                        {address.is_primary && <Chip label="PRIMARY" size="small" color="primary" sx={{ fontSize: '0.65rem', height: '20px' }} />}
                                    </Box>
                                </Box>
                            ))}
                        </Grid>
                    </Grid>

                    <Alert severity="success" sx={{ mt: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                            Ready to Create Person Record
                        </Typography>
                        <Typography variant="caption">
                            {formData.aliases?.length || 0} document(s) • {formData.addresses?.length || 0} address(es) • {[formData.email_address, formData.work_phone, formData.cell_phone].filter(Boolean).length} contact method(s)
                        </Typography>
                    </Alert>
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
        <Box sx={{ bgcolor: '#f8f9fa', p: 2, borderRadius: 2 }}>
            <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
                {showHeader && (
                    <Paper 
                        elevation={0}
                        sx={{ 
                            p: 2, 
                            mb: 3,
                            bgcolor: 'white',
                            boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                            borderRadius: 2
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

                {/* Stepper */}
                <Paper 
                    elevation={0}
                    sx={{ 
                        p: 2, 
                        mb: 3,
                        bgcolor: 'white',
                        boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                        borderRadius: 2
                    }}
                >
                    <Stepper activeStep={currentStep} alternativeLabel>
                        {steps.map((label, index) => {
                            const canNavigate = (index < currentStep || stepValidation[index] || (index === 0 && !isNewPerson)) && !(skipFirstStep && index === 0);
                            const isDisabled = skipFirstStep && index === 0;
                            return (
                                <Step key={label} completed={stepValidation[index]} disabled={isDisabled}>
                                    <StepLabel
                                        onClick={() => canNavigate && handleStepClick(index)}
                                        sx={{
                                            cursor: canNavigate ? 'pointer' : 'default',
                                            '&:hover': canNavigate ? { opacity: 0.8 } : {},
                                            opacity: isDisabled ? 0.4 : 1,
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
                <Box ref={stepContentRef} sx={{ mb: 3 }}>
                    {renderStepContent()}
                </Box>

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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Button
                            disabled={currentStep === (skipFirstStep ? 1 : 0)}
                            onClick={handleBack}
                            size="small"
                        >
                            Back
                        </Button>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {currentStep < steps.length - 1 ? (
                                <Button
                                    variant="contained"
                                    onClick={handleNext}
                                    disabled={lookupLoading}
                                    size="small"
                                    sx={{
                                        boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px'
                                    }}
                                >
                                    {currentStep === 0 ? 'Search' : 'Next'}
                                </Button>
                            ) : (
                                // Special handling for review step in application mode
                                mode === 'application' && !isNewPerson ? (
                                    <Button
                                        variant="contained"
                                        onClick={() => {
                                            // Trigger completion callback for application mode
                                            // For existing persons, pass the actual person object with ID
                                            const personToPass = personFound || {
                                                id: currentPersonId,
                                                ...personForm.getValues()
                                            };
                                            
                                            console.log('Passing existing person to onSuccess:', personToPass);
                                            
                                            if (onComplete) {
                                                onComplete(personToPass);
                                            }
                                            if (onSuccess) {
                                                onSuccess(personToPass, true); // true indicates this is an edit/existing person
                                            }
                                        }}
                                        startIcon={<ArrowForwardIcon />}
                                        size="small"
                                        sx={{
                                            boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px'
                                        }}
                                    >
                                        Confirm and Continue
                                    </Button>
                                ) : (
                                    <Button
                                        variant="contained"
                                        onClick={handleSubmit}
                                        disabled={submitLoading || duplicateCheckLoading}
                                        startIcon={<PersonAddIcon />}
                                        size="small"
                                        sx={{
                                            boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px'
                                        }}
                                    >
                                        {duplicateCheckLoading ? 'Checking for Duplicates...' : submitLoading ? (isEditMode ? 'Updating...' : 'Submitting...') : (isEditMode ? 'Update Person' : 'Submit')}
                                    </Button>
                                )
                            )}
                        </Box>
                    </Box>
                </Paper>
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