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
} from '@mui/material';
import {
  Search as SearchIcon,
  PersonAdd as PersonAddIcon,
  Edit as EditIcon,
  Clear as ClearIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { useAuth } from '../../contexts/AuthContext';

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
  email_address?: string;
  cell_phone?: string;
  is_active: boolean;
  created_at?: string;
  primary_document?: string;
  primary_document_type?: string;
  aliases?: Array<{
    id: string;
    document_type: string;
    document_number: string;
    is_primary: boolean;
  }>;
  addresses?: Array<{
    id: string;
    address_type: string;
    locality: string;
    postal_code?: string;
    is_primary: boolean;
  }>;
}

// Madagascar-specific lookup data
const DOCUMENT_TYPES = [
  { value: 'MG_ID', label: 'Madagascar ID (CIN/CNI)', requiresExpiry: false },
  { value: 'PASSPORT', label: 'Passport', requiresExpiry: true },
];

const PERSON_NATURES = [
  { value: '01', label: 'Male (Lehilahy)', disabled: false },
  { value: '02', label: 'Female (Vehivavy)', disabled: false },
];

const LANGUAGES = [
  { value: 'mg', label: 'Malagasy' },
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
];

const MADAGASCAR_PROVINCES = [
  { code: 'AN', name: 'Antananarivo' },
  { code: 'FI', name: 'Fianarantsoa' },
  { code: 'TO', name: 'Toamasina' },
  { code: 'MA', name: 'Mahajanga' },
  { code: 'TU', name: 'Toliara' },
  { code: 'DI', name: 'Antsiranana (Diego Suarez)' },
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
    .max(15)
    .matches(/^[0-9]*$/, 'Cell phone must contain only digits')
    .test('madagascar-format', 'Invalid Madagascar cell phone format', function(value) {
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
  const { user, hasPermission } = useAuth();
  
  // State management
  const [currentStep, setCurrentStep] = useState(0);
  const [personFound, setPersonFound] = useState<ExistingPerson | null>(null);
  const [currentPersonId, setCurrentPersonId] = useState<string | null>(null);
  const [isNewPerson, setIsNewPerson] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [stepValidation, setStepValidation] = useState<boolean[]>(new Array(steps.length).fill(false));
  
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
        address_type: 'residential',
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

  // Step 1: Document Lookup functionality
  const performLookup = async (data: PersonLookupForm) => {
    setLookupLoading(true);
    
    try {
      // TODO: Implement API call to check if person exists
      console.log('Looking up person with:', data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, assume person not found for new registration
      setPersonFound(null);
      setIsNewPerson(true);
      setupNewPersonForm(data);
      markStepValid(0, true);
      setCurrentStep(1);
    } catch (error) {
      console.error('Lookup failed:', error);
    } finally {
      setLookupLoading(false);
    }
  };

  const setupNewPersonForm = (lookupData: PersonLookupForm) => {
    // Pre-populate with lookup data
    const currentAliases = personForm.getValues('aliases');
    currentAliases[0] = {
      ...currentAliases[0],
      document_type: lookupData.document_type,
      document_number: lookupData.document_number,
    };
    personForm.setValue('aliases', currentAliases);
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
        const isValid = await personForm.trigger(stepFields as any);
        markStepValid(currentStep, isValid);
        return isValid;
      }
    } catch (error) {
      markStepValid(currentStep, false);
      return false;
    }
  };

  const getStepFields = (step: number) => {
    const stepFieldMap = [
      [], // Lookup step
      ['surname', 'first_name', 'person_nature', 'birth_date', 'nationality_code', 'preferred_language'],
      ['email_address', 'work_phone', 'cell_phone_country_code', 'cell_phone'],
      ['aliases'],
      ['addresses'],
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

  const handleSubmit = async () => {
    setSubmitLoading(true);
    
    try {
      const formData = personForm.getValues();
      console.log('Submitting person data:', formData);
      
      // TODO: Implement API call to create/update person
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert('Person saved successfully!');
      resetForm();
    } catch (error) {
      console.error('Submit failed:', error);
      alert('Failed to save person. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(0);
    setPersonFound(null);
    setCurrentPersonId(null);
    setIsNewPerson(false);
    setIsEditMode(false);
    setStepValidation(new Array(steps.length).fill(false));
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
                    {...field}
                    fullWidth
                    label="Document Number *"
                    error={!!lookupForm.formState.errors.document_number}
                    helperText={lookupForm.formState.errors.document_number?.message || 'Enter document number'}
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
    <Card>
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
                  {...field}
                  fullWidth
                  label="Surname *"
                  error={!!personForm.formState.errors.surname}
                  helperText={personForm.formState.errors.surname?.message || 'Family name'}
                  inputProps={{ maxLength: 50 }}
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
                  {...field}
                  fullWidth
                  label="First Name *"
                  error={!!personForm.formState.errors.first_name}
                  helperText={personForm.formState.errors.first_name?.message || 'Given name'}
                  inputProps={{ maxLength: 50 }}
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
                  {...field}
                  fullWidth
                  label="Middle Name"
                  helperText="Middle name (optional)"
                  inputProps={{ maxLength: 50 }}
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
                  <Select {...field} label="Gender *">
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
                  {...field}
                  fullWidth
                  type="date"
                  label="Date of Birth"
                  InputLabelProps={{ shrink: true }}
                  helperText="Date of birth"
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
                  <Select {...field} label="Nationality *">
                    <MenuItem value="MG">Malagasy</MenuItem>
                    <MenuItem value="FR">French</MenuItem>
                    <MenuItem value="US">American</MenuItem>
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
                  <Select {...field} label="Preferred Language *">
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
    <Card>
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
                  {...field}
                  fullWidth
                  type="email"
                  label="Email Address"
                  error={!!personForm.formState.errors.email_address}
                  helperText={personForm.formState.errors.email_address?.message || 'Email address (optional)'}
                  inputProps={{ maxLength: 100 }}
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
                  {...field}
                  fullWidth
                  label="Work Phone"
                  error={!!personForm.formState.errors.work_phone}
                  helperText={personForm.formState.errors.work_phone?.message || 'Work phone number (optional)'}
                  inputProps={{ maxLength: 20 }}
                />
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 500, mt: 2 }}>
              Cell Phone (Madagascar Format: 0AA BB BB BBB)
            </Typography>
          </Grid>

          <Grid item xs={12} md={3}>
            <Controller
              name="cell_phone_country_code"
              control={personForm.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Country Code"
                  disabled
                  helperText="Madagascar country code"
                />
              )}
            />
          </Grid>

          <Grid item xs={12} md={9}>
            <Controller
              name="cell_phone"
              control={personForm.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Cell Phone Number"
                  placeholder="0AA BB BB BBB"
                  error={!!personForm.formState.errors.cell_phone}
                  helperText={personForm.formState.errors.cell_phone?.message || 'Cell phone number (10 digits starting with 0)'}
                  inputProps={{ 
                    maxLength: 10,
                    pattern: '[0-9]*',
                    inputMode: 'numeric',
                  }}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
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
                      {...field}
                      fullWidth
                      label="Document Number"
                      disabled={index === 0}
                      helperText={index === 0 ? 'From lookup step' : 'Additional document number'}
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

              {personForm.watch(`aliases.${index}.document_type`) === 'PASSPORT' && (
                <Grid item xs={12} md={4}>
                  <Controller
                    name={`aliases.${index}.expiry_date`}
                    control={personForm.control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        type="date"
                        label="Expiry Date *"
                        InputLabelProps={{ shrink: true }}
                        helperText="Required for passports"
                      />
                    )}
                  />
                </Grid>
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
                        <MenuItem value="residential">Residential</MenuItem>
                        <MenuItem value="postal">Postal</MenuItem>
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
                      helperText="Lot/parcel details or P.O. Box"
                      inputProps={{ maxLength: 100 }}
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
                      helperText="Additional street detail or neighborhood"
                      inputProps={{ maxLength: 100 }}
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
                      helperText={
                        personForm.formState.errors.addresses?.[index]?.locality?.message || 
                        "Village, quartier, city"
                      }
                      inputProps={{ maxLength: 100 }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Controller
                  name={`addresses.${index}.postal_code`}
                  control={personForm.control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Postal Code *"
                      error={!!personForm.formState.errors.addresses?.[index]?.postal_code}
                      helperText={
                        personForm.formState.errors.addresses?.[index]?.postal_code?.message || 
                        "3-digit Madagascar postal code"
                      }
                      inputProps={{ 
                        maxLength: 3,
                        pattern: '[0-9]*',
                        inputMode: 'numeric',
                      }}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        field.onChange(value);
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <Controller
                  name={`addresses.${index}.town`}
                  control={personForm.control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Town *"
                      error={!!personForm.formState.errors.addresses?.[index]?.town}
                      helperText={
                        personForm.formState.errors.addresses?.[index]?.town?.message || 
                        "Town/city for postal delivery"
                      }
                      inputProps={{ maxLength: 100 }}
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
            address_type: 'postal',
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
                  {PERSON_NATURES.find(n => n.value === formData.person_nature)?.label || 'Not specified'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" color="text.secondary">Language</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {LANGUAGES.find(l => l.value === formData.preferred_language)?.label || 'Not specified'}
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
                    {alias.is_primary && <Chip label="Primary" size="small" color="primary" />}
                    {alias.is_current && <Chip label="Current" size="small" color="success" />}
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
                    {address.address_type === 'residential' ? 'Residential Address' : 'Postal Address'}
                    {address.is_primary && <Chip label="Primary" size="small" color="primary" sx={{ ml: 1 }} />}
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
          {steps.map((label, index) => (
            <Step key={label} completed={stepValidation[index]}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
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
                disabled={submitLoading}
                startIcon={<PersonAddIcon />}
              >
                {submitLoading ? 'Creating Person...' : 'Create Person'}
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default PersonManagementPage; 