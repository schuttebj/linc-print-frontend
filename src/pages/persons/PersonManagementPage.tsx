/**
 * Person Management Page for Madagascar Driver's License System
 * Multi-step registration/editing adapted for Madagascar natural persons
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
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useSearchParams } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config/api';

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

// Madagascar-specific lookup data
const DOCUMENT_TYPES = [
  { value: 'MG_ID', label: 'MADAGASCAR ID (CIN/CNI)', requiresExpiry: false },
  { value: 'PASSPORT', label: 'PASSPORT', requiresExpiry: true },
];

const PERSON_NATURES = [
  { value: '01', label: 'MALE (LEHILAHY)', disabled: false },
  { value: '02', label: 'FEMALE (VEHIVAVY)', disabled: false },
];

const LANGUAGES = [
  { value: 'mg', label: 'MALAGASY' },
  { value: 'fr', label: 'FRANÇAIS' },
  { value: 'en', label: 'ENGLISH' },
];

const MADAGASCAR_PROVINCES = [
  { code: 'AN', name: 'ANTANANARIVO' },
  { code: 'FI', name: 'FIANARANTSOA' },
  { code: 'TO', name: 'TOAMASINA' },
  { code: 'MA', name: 'MAHAJANGA' },
  { code: 'TU', name: 'TOLIARA' },
  { code: 'DI', name: 'ANTSIRANANA (DIEGO SUAREZ)' },
];

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
    .test('madagascar-format', 'Madagascar cell phone must be exactly 10 digits starting with 0 (e.g., 0815598453)', function(value) {
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

const PersonManagementPage: React.FC = () => {
  // Auth
  const { user, hasPermission, accessToken } = useAuth();
  
  // URL parameters for editing
  const [searchParams] = useSearchParams();
  
  // State management
  const [currentStep, setCurrentStep] = useState(0);
  const [personFound, setPersonFound] = useState<ExistingPerson | null>(null);
  const [currentPersonId, setCurrentPersonId] = useState<string | null>(null);
  const [isNewPerson, setIsNewPerson] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
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
      preferred_language: 'mg',
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

  // Handle URL parameters for editing
  useEffect(() => {
    const editPersonId = searchParams.get('edit');
    if (editPersonId && accessToken) {
      fetchPersonForEditing(editPersonId);
    }
  }, [searchParams, accessToken]);

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
        } else {
          // No person found - setup for new person creation
          console.log('No person found, creating new');
          setPersonFound(null);
          setCurrentPersonId(null);
          setIsNewPerson(true);
          setIsEditMode(false);
          setupNewPersonForm(data);
        }
        
        markStepValid(0, true);
        setCurrentStep(1);
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
    
    // Reset form with primary document from lookup - CAPITALIZED
    personForm.reset({
      surname: '',
      first_name: '',
      middle_name: '',
      person_nature: '01', // Default to Male
      birth_date: '',
      nationality_code: 'MG',
      preferred_language: 'mg',
      email_address: '',
      work_phone: '',
      cell_phone_country_code: '+261',
      cell_phone: '',
      aliases: [{
        document_type: lookupData.document_type?.toUpperCase() || 'MG_ID',
        document_number: lookupData.document_number?.toUpperCase() || '',
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
    });
    
    setIsNewPerson(true);
    setIsEditMode(false);
    setCurrentPersonId(null);
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
      personForm.setValue('preferred_language', existingPerson.preferred_language.toLowerCase()); // Language codes stay lowercase
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
        document_type: alias.document_type?.toUpperCase() || 'MG_ID',
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
      console.log('Populating addresses:', existingPerson.addresses);
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
      console.log('Addresses set to:', transformedAddresses);
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
      [], // Address step - complex validation handled separately  
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
      console.log('Raw form data:', formData);
      
      // Transform form data to match backend schema with FULL CAPITALIZATION
      const personPayload = {
        // Basic person information - ALL CAPITALIZED
        surname: formData.surname?.toUpperCase() || '',
        first_name: formData.first_name?.toUpperCase() || '',
        middle_name: formData.middle_name?.toUpperCase() || undefined,
        person_nature: formData.person_nature?.toUpperCase() || '',
        birth_date: formData.birth_date || undefined,
        nationality_code: formData.nationality_code?.toUpperCase() || 'MG',
        preferred_language: formData.preferred_language?.toLowerCase() || 'mg', // Language codes stay lowercase
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
          .filter(address => address.locality && address.postal_code && address.town)
          .map(address => ({
            address_type: address.address_type?.toUpperCase() || '',
            is_primary: address.is_primary,
            street_line1: address.street_line1?.toUpperCase() || undefined,
            street_line2: address.street_line2?.toUpperCase() || undefined,
            locality: address.locality?.toUpperCase() || '',
            postal_code: address.postal_code || '',
            town: address.town?.toUpperCase() || '',
            country: address.country?.toUpperCase() || 'MADAGASCAR',
            province_code: address.province_code?.toUpperCase() || undefined,
            is_verified: false,
          })),
      };
      
      console.log('Transformed person payload:', personPayload);
      
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
        setShowSuccessDialog(true);
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
      setShowSuccessDialog(true);
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
    setStepValidation(new Array(steps.length).fill(false));
    setShowSuccessDialog(false);
    setCreatedPerson(null);
    setShowDuplicateDialog(false);
    setPotentialDuplicates([]);
    setPendingPersonPayload(null);
    lookupForm.reset();
    personForm.reset();
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
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Document Lookup
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Enter document details to search for existing person or register new person.
        </Typography>
        
        <form onSubmit={lookupForm.handleSubmit(performLookup)}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Controller
                name="document_type"
                control={lookupForm.control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!lookupForm.formState.errors.document_type}>
                    <InputLabel>Document Type *</InputLabel>
                    <Select {...field} label="Document Type *">
                      {DOCUMENT_TYPES.map((option) => (
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

            <Grid item xs={12} md={2}>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={lookupLoading}
                startIcon={<SearchIcon />}
                sx={{ height: '56px' }}
              >
                {lookupLoading ? 'Searching...' : 'Search'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Card>
  );

  const renderPersonalInformationStep = () => (
    <Card key="personal-info-step">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Personal Information
        </Typography>
        
        <Grid container spacing={3}>
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
                <FormControl fullWidth error={!!personForm.formState.errors.person_nature}>
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
                    {PERSON_NATURES.map((option) => (
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
                <FormControl fullWidth>
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
                <FormControl fullWidth error={!!personForm.formState.errors.preferred_language}>
                  <InputLabel>Preferred Language *</InputLabel>
                  <Select
                    id="preferred-language-select"
                    name={field.name}
                    value={field.value || 'mg'}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    label="Preferred Language *"
                    MenuProps={{
                      id: "preferred-language-menu"
                    }}
                  >
                    {LANGUAGES.map((option) => (
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
      </CardContent>
    </Card>
  );

  const renderContactDetailsStep = () => (
    <Card key="contact-details-step">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Contact Information
        </Typography>
        
        <Grid container spacing={3}>
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
                <FormControl fullWidth>
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
      </CardContent>
    </Card>
  );

  const renderIdDocumentsStep = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Identification Documents
        </Typography>
        
        {aliasFields.map((field, index) => (
          <Box key={field.id} sx={{ mb: 4, p: 3, border: '1px solid #e0e0e0', borderRadius: 2, backgroundColor: '#fafafa' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
              {index === 0 ? 'Primary Document' : `Additional Document ${index}`}
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Controller
                  name={`aliases.${index}.document_type`}
                  control={personForm.control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Document Type</InputLabel>
                      <Select {...field} label="Document Type" disabled={index === 0}>
                        {DOCUMENT_TYPES.map((option) => (
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
                      sx={{ mt: 2 }}
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
                        <FormControl fullWidth>
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
                    sx={{ mt: 2 }}
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
        >
          Add Additional Document
        </Button>
      </CardContent>
    </Card>
  );

  const renderAddressStep = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Address Information
        </Typography>
        
        {addressFields.map((field, index) => (
          <Box key={field.id} sx={{ mb: 4, p: 3, border: '1px solid #e0e0e0', borderRadius: 2, backgroundColor: '#fafafa' }}>
            <Grid container spacing={3}>
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
                    <FormControl fullWidth>
                      <InputLabel>Address Type *</InputLabel>
                      <Select {...field} label="Address Type *">
                        <MenuItem value="RESIDENTIAL">Residential</MenuItem>
                        <MenuItem value="POSTAL">Postal</MenuItem>
                      </Select>
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
                      sx={{ mt: 2 }}
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
                  name={`addresses.${index}.street_line2`}
                  control={personForm.control}
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
                  name={`addresses.${index}.locality`}
                  control={personForm.control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
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
                    <FormControl fullWidth>
                      <InputLabel>Province</InputLabel>
                      <Select {...field} label="Province">
                        {MADAGASCAR_PROVINCES.map((option) => (
                          <MenuItem key={option.code} value={option.code}>
                            {option.name}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>Madagascar province/region</FormHelperText>
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
                    sx={{ mt: 2 }}
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
        >
          Add Additional Address
        </Button>
      </CardContent>
    </Card>
  );

  const renderReviewStep = () => {
    const formData = personForm.getValues();
    
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Review & Submit
          </Typography>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            Please review all information before creating the person record.
          </Alert>

          {/* Personal Information Summary */}
          <Box sx={{ mb: 4, p: 3, border: '1px solid #e0e0e0', borderRadius: 2, backgroundColor: '#fafafa' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
              Personal Information
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Full Name</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {[formData.surname, formData.first_name, formData.middle_name].filter(Boolean).join(' ')}
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" color="text.secondary">Gender</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {PERSON_NATURES.find(n => n.value === formData.person_nature)?.label || 'NOT SPECIFIED'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" color="text.secondary">Language</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {LANGUAGES.find(l => l.value === formData.preferred_language)?.label || 'NOT SPECIFIED'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" color="text.secondary">Birth Date</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {formData.birth_date || 'NOT PROVIDED'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" color="text.secondary">Nationality</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {formData.nationality_code === 'MG' ? 'MALAGASY' : 
                   formData.nationality_code === 'FR' ? 'FRENCH' : 
                   formData.nationality_code === 'US' ? 'AMERICAN' : 
                   formData.nationality_code?.toUpperCase() || 'NOT SPECIFIED'}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          {/* Contact Information Summary */}
          <Box sx={{ mb: 4, p: 3, border: '1px solid #e0e0e0', borderRadius: 2, backgroundColor: '#fafafa' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
              Contact Information
            </Typography>
            
            <Grid container spacing={2}>
              {formData.email_address && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formData.email_address}
                  </Typography>
                </Grid>
              )}
              {formData.cell_phone && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Cell Phone</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {formData.cell_phone_country_code} {formData.cell_phone}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>

          {/* Documents Summary */}
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', mt: 3 }}>
            Documents ({formData.aliases?.length || 0})
          </Typography>
          {formData.aliases?.map((alias, index) => (
            <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">Document Type</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {DOCUMENT_TYPES.find(type => type.value === alias.document_type)?.label || alias.document_type}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">Document Number</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {alias.document_number}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                  <Stack direction="row" spacing={1}>
                    {alias.is_primary && <Chip label="PRIMARY" size="small" color="primary" />}
                    {alias.is_current && <Chip label="CURRENT" size="small" color="success" />}
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          ))}

          {/* Addresses Summary */}
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', mt: 3 }}>
            Addresses ({formData.addresses?.length || 0})
          </Typography>
          {formData.addresses?.map((address, index) => (
            <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    {address.address_type === 'RESIDENTIAL' ? 'RESIDENTIAL ADDRESS' : 'POSTAL ADDRESS'}
                    {address.is_primary && <Chip label="PRIMARY" size="small" color="primary" sx={{ ml: 1 }} />}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Full Address</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {[address.street_line1, address.street_line2, address.locality, address.town].filter(Boolean).join(', ')}
                    {address.postal_code && ` - ${address.postal_code}`}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          ))}

          <Alert severity="success" sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Ready to Create Person Record
            </Typography>
            <Typography variant="body2">
              • Documents: {formData.aliases?.length || 0} document(s)
              <br />
              • Addresses: {formData.addresses?.length || 0} address(es)
              <br />
              • Contact Methods: {[formData.email_address, formData.work_phone, formData.cell_phone].filter(Boolean).length} method(s)
            </Typography>
          </Alert>
        </CardContent>
      </Card>
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
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Person Management
        </Typography>
        
        <Button
          variant="outlined"
          onClick={resetForm}
          startIcon={<ClearIcon />}
        >
          Start Over
        </Button>
      </Box>

      <Typography variant="body1" color="text.secondary" gutterBottom>
        Register new Madagascar citizens for driver's license applications.
      </Typography>

      {/* Stepper */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={currentStep} alternativeLabel>
          {steps.map((label, index) => {
            const canNavigate = index < currentStep || stepValidation[index] || (index === 0 && !isNewPerson);
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
                disabled={lookupLoading}
              >
                {currentStep === 0 ? 'Search' : 'Next'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={submitLoading || duplicateCheckLoading}
                startIcon={<PersonAddIcon />}
              >
                {duplicateCheckLoading ? 'Checking for Duplicates...' : submitLoading ? (isEditMode ? 'Updating...' : 'Submitting...') : (isEditMode ? 'Update Person' : 'Submit')}
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Duplicate Detection Dialog */}
      <Dialog 
        open={showDuplicateDialog} 
        onClose={() => setShowDuplicateDialog(false)}
        maxWidth="md"
        fullWidth
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
        onClose={() => setShowSuccessDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'success.main', color: 'white' }}>
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
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PersonManagementPage; 