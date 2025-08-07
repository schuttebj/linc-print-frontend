/**
 * Reusable Person Form Validation Hook
 * Handles step-by-step validation for person forms across the application
 */

import { useCallback, useMemo } from 'react';
import * as yup from 'yup';

// Validation schemas for each step
const stepSchemas = {
  // Step 0: Lookup
  lookup: yup.object({
    document_number: yup
      .string()
      .required('ID number is required')
      .min(9, 'ID number must be at least 9 digits')
      .matches(/^\d+$/, 'ID number must contain only digits'),
  }),

  // Step 1: Personal Details
  details: yup.object({
    surname: yup
      .string()
      .required('Surname is required')
      .min(2, 'Surname must be at least 2 characters')
      .max(50, 'Surname must not exceed 50 characters'),
    first_name: yup
      .string()
      .required('First name is required')
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name must not exceed 50 characters'),
    person_nature: yup
      .string()
      .required('Gender is required')
      .oneOf(['MALE', 'FEMALE'], 'Please select a valid gender'),
    birth_date: yup
      .string()
      .required('Date of birth is required')
      .matches(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    nationality_code: yup
      .string()
      .required('Nationality is required')
      .min(2, 'Please select a nationality'),
    preferred_language: yup
      .string()
      .required('Language is required')
      .min(2, 'Please select a language'),
  }),

  // Step 2: Contact Details
  contact: yup.object({
    email_address: yup
      .string()
      .required('Email address is required')
      .email('Please enter a valid email address')
      .max(100, 'Email must not exceed 100 characters'),
    cell_phone: yup
      .string()
      .required('Cell phone number is required')
      .matches(/^0\d{9}$/, 'Madagascar cell phone must be exactly 10 digits starting with 0 (e.g., 0815598453)'),
    cell_phone_country_code: yup
      .string()
      .required('Country code is required'),
  }),

  // Step 3: ID Documents
  documents: yup.object({
    aliases: yup
      .array()
      .of(
        yup.object({
          document_type: yup
            .string()
            .required('Document type is required'),
          document_number: yup
            .string()
            .required('Document number is required')
            .min(3, 'Document number must be at least 3 characters'),
          name_in_document: yup
            .string()
            .required('Name on document is required')
            .min(2, 'Name on document must be at least 2 characters'),
          country_of_issue: yup
            .string()
            .required('Country of issue is required'),
          is_primary: yup.boolean(),
          is_current: yup.boolean(),
          expiry_date: yup.string().when('document_type', {
            is: 'PASSPORT',
            then: () => yup.string().required('Expiry date is required for passports'),
            otherwise: () => yup.string(),
          }),
        })
      )
      .min(1, 'At least one identification document is required'),
  }),

  // Step 4: Address
  address: yup.object({
    addresses: yup
      .array()
      .of(
        yup.object({
          address_type: yup
            .string()
            .required('Address type is required'),
          street_line1: yup
            .string()
            .required('Address line 1 is required')
            .min(5, 'Address must be at least 5 characters'),
          locality: yup
            .string()
            .required('Locality is required')
            .min(2, 'Locality must be at least 2 characters'),
          town: yup
            .string()
            .required('Town is required')
            .min(2, 'Town must be at least 2 characters'),
          province_code: yup
            .string()
            .required('Province is required'),
          postal_code: yup
            .string()
            .required('Postal code is required')
            .matches(/^\d{3}$/, 'Madagascar postal code must be exactly 3 digits'),
          country: yup
            .string()
            .required('Country is required'),
          is_primary: yup.boolean(),
        })
      )
      .min(1, 'At least one address is required'),
  }),
};

// Field configuration types
interface StepFieldConfig {
  required: string[];
  schema: any;
  nested?: Record<string, string[]>;
}

// Field configuration for each step
export const stepFieldConfig: Record<number, StepFieldConfig> = {
  0: { // Lookup
    required: ['document_number'],
    schema: stepSchemas.lookup,
  },
  1: { // Details
    required: ['surname', 'first_name', 'person_nature', 'birth_date', 'nationality_code', 'preferred_language'],
    schema: stepSchemas.details,
  },
  2: { // Contact
    required: ['email_address', 'cell_phone', 'cell_phone_country_code'],
    schema: stepSchemas.contact,
  },
  3: { // Documents
    required: ['aliases'],
    schema: stepSchemas.documents,
    nested: {
      aliases: ['document_type', 'document_number', 'name_in_document', 'country_of_issue']
    }
  },
  4: { // Address
    required: ['addresses'],
    schema: stepSchemas.address,
    nested: {
      addresses: ['address_type', 'street_line1', 'locality', 'town', 'province_code', 'postal_code', 'country']
    }
  },
};

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  fieldStates: Record<string, 'valid' | 'invalid' | 'required' | 'default'>;
}

export interface PersonFormValidationHook {
  validateStep: (stepIndex: number, data: any) => ValidationResult;
  validateField: (fieldName: string, value: any, stepIndex: number) => {
    isValid: boolean;
    error?: string;
    state: 'valid' | 'invalid' | 'required' | 'default';
  };
  getFieldState: (fieldName: string, value: any, stepIndex: number) => 'valid' | 'invalid' | 'required' | 'default';
  validateAllSteps: (data: any) => Record<number, ValidationResult>;
  isStepComplete: (stepIndex: number, data: any) => boolean;
}

export const usePersonFormValidation = (): PersonFormValidationHook => {
  
  const validateStep = useCallback((stepIndex: number, data: any): ValidationResult => {
    const config = stepFieldConfig[stepIndex];
    if (!config) {
      return { isValid: true, errors: {}, fieldStates: {} };
    }

    const errors: Record<string, string> = {};
    const fieldStates: Record<string, 'valid' | 'invalid' | 'required' | 'default'> = {};

    try {
      // Validate using Yup schema
      config.schema.validateSync(data, { abortEarly: false });
      
      // If validation passes, mark all required fields as valid
      config.required.forEach(field => {
        const value = data[field];
        if (value !== undefined && value !== '' && value !== null) {
          fieldStates[field] = 'valid';
        } else {
          fieldStates[field] = 'required';
          errors[field] = `${field.replace(/_/g, ' ')} is required`;
        }
      });

      // Handle nested validation (for arrays like aliases, addresses)
      if (config.nested) {
        Object.entries(config.nested).forEach(([arrayField, nestedFields]) => {
          const arrayData = data[arrayField];
          if (Array.isArray(arrayData) && arrayData.length > 0) {
            arrayData.forEach((item: any, index: number) => {
              if (Array.isArray(nestedFields)) {
                nestedFields.forEach(nestedField => {
                  const fieldKey = `${arrayField}[${index}].${nestedField}`;
                  const value = item[nestedField];
                  if (value !== undefined && value !== '' && value !== null) {
                    fieldStates[fieldKey] = 'valid';
                  } else {
                    fieldStates[fieldKey] = 'required';
                    errors[fieldKey] = `${nestedField.replace(/_/g, ' ')} is required`;
                  }
                });
              }
            });
          } else {
            fieldStates[arrayField] = 'required';
            errors[arrayField] = `At least one ${arrayField.slice(0, -1)} is required`;
          }
        });
      }

    } catch (error: any) {
      if (error.inner) {
        error.inner.forEach((err: any) => {
          const field = err.path;
          errors[field] = err.message;
          fieldStates[field] = 'invalid';
        });
      }

      // Mark missing required fields
      config.required.forEach(field => {
        if (!fieldStates[field]) {
          const value = data[field];
          if (value === undefined || value === '' || value === null) {
            fieldStates[field] = 'required';
            if (!errors[field]) {
              errors[field] = `${field.replace(/_/g, ' ')} is required`;
            }
          }
        }
      });
    }

    const isValid = Object.keys(errors).length === 0 && 
                   Object.values(fieldStates).every(state => state === 'valid');

    return { isValid, errors, fieldStates };
  }, []);

  const validateField = useCallback((fieldName: string, value: any, stepIndex: number) => {
    const config = stepFieldConfig[stepIndex];
    if (!config) {
      return { isValid: true, state: 'default' as const };
    }

    // Check if field is required
    const isRequired = config.required.includes(fieldName) || 
                      (config.nested && Object.values(config.nested).flat().includes(fieldName));

    // Empty value handling
    if (value === undefined || value === '' || value === null) {
      if (isRequired) {
        return { 
          isValid: false, 
          error: `${fieldName.replace(/_/g, ' ')} is required`,
          state: 'required' as const 
        };
      }
      return { isValid: true, state: 'default' as const };
    }



    // Validate individual field using schema
    try {
      const fieldSchema = getFieldSchema(fieldName, stepIndex);
      if (fieldSchema) {
        fieldSchema.validateSync(value);
        return { isValid: true, state: 'valid' as const };
      }
    } catch (error: any) {
      return { 
        isValid: false, 
        error: error.message,
        state: 'invalid' as const 
      };
    }

    return { isValid: true, state: 'valid' as const };
  }, []);

  const getFieldState = useCallback((fieldName: string, value: any, stepIndex: number) => {
    const result = validateField(fieldName, value, stepIndex);
    return result.state;
  }, [validateField]);

  const validateAllSteps = useCallback((data: any): Record<number, ValidationResult> => {
    const results: Record<number, ValidationResult> = {};
    
    Object.keys(stepFieldConfig).forEach(stepStr => {
      const stepIndex = parseInt(stepStr);
      results[stepIndex] = validateStep(stepIndex, data);
    });

    return results;
  }, [validateStep]);

  const isStepComplete = useCallback((stepIndex: number, data: any): boolean => {
    const result = validateStep(stepIndex, data);
    return result.isValid;
  }, [validateStep]);

  return {
    validateStep,
    validateField,
    getFieldState,
    validateAllSteps,
    isStepComplete,
  };
};

// Helper function to get individual field schema
function getFieldSchema(fieldName: string, stepIndex: number) {
  const config = stepFieldConfig[stepIndex as keyof typeof stepFieldConfig];
  if (!config) return null;

  try {
    // Try to extract the field schema from the step schema
    return config.schema.fields[fieldName];
  } catch {
    return null;
  }
}

export default usePersonFormValidation;