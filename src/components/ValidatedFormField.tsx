/**
 * Validated Form Field Components
 * Reusable components that include validation styling and debounced validation
 */

import React from 'react';
import { TextField, FormControl, InputLabel, Select, FormHelperText } from '@mui/material';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { useFieldStyling, useSelectStyling } from '../hooks/useFieldStyling';

interface BaseValidatedFieldProps {
  name: string;
  control: Control<any>;
  stepIndex: number;
  isRequired?: boolean;
  getFieldState: (fieldName: string, value: any, stepIndex: number) => 'valid' | 'invalid' | 'required' | 'default';
  debouncedValidation: (fieldName: string, value: any, stepIndex: number) => void;
  getImmediateValidation: (fieldName: string, value: any, stepIndex: number) => any;
  setError: (name: any, error: any) => void;
  clearErrors: (name?: any) => void;
  errors: FieldErrors<any>;
}

interface ValidatedTextFieldProps extends BaseValidatedFieldProps {
  label: string;
  helperText?: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  inputProps?: any;
  transform?: (value: string) => string;
  type?: string;
  multiline?: boolean;
  rows?: number;
}

interface ValidatedSelectProps extends BaseValidatedFieldProps {
  label: string;
  helperText?: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  children: React.ReactNode;
}

export const ValidatedTextField: React.FC<ValidatedTextFieldProps> = ({
  name,
  control,
  stepIndex,
  isRequired = false,
  getFieldState,
  debouncedValidation,
  getImmediateValidation,
  setError,
  clearErrors,
  errors,
  label,
  helperText,
  fullWidth = true,
  size = 'small',
  inputProps,
  transform,
  type = 'text',
  multiline = false,
  rows
}) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const fieldState = getFieldState(name, field.value, stepIndex);
        const styling = useFieldStyling(
          fieldState,
          errors[name]?.message as string,
          isRequired
        );

        return (
          <TextField
            name={field.name}
            value={field.value || ''}
            fullWidth={fullWidth}
            size={size}
            label={label}
            type={type}
            multiline={multiline}
            rows={rows}
            error={styling.error}
            helperText={styling.helperText || helperText}
            sx={styling.sx}
            inputProps={inputProps}
            onChange={(e) => {
              const value = transform ? transform(e.target.value) : e.target.value;
              field.onChange(value);
              debouncedValidation(name, value, stepIndex);
            }}
            onBlur={(e) => {
              field.onBlur();
              const result = getImmediateValidation(name, e.target.value, stepIndex);
              if (!result.isValid && result.error) {
                setError(name, {
                  type: 'manual',
                  message: result.error
                });
              } else {
                clearErrors(name);
              }
            }}
          />
        );
      }}
    />
  );
};

export const ValidatedSelect: React.FC<ValidatedSelectProps> = ({
  name,
  control,
  stepIndex,
  isRequired = false,
  getFieldState,
  debouncedValidation,
  getImmediateValidation,
  setError,
  clearErrors,
  errors,
  label,
  helperText,
  fullWidth = true,
  size = 'small',
  children
}) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const fieldState = getFieldState(name, field.value, stepIndex);
        const styling = useSelectStyling(
          fieldState,
          errors[name]?.message as string,
          isRequired
        );

        return (
          <FormControl fullWidth={fullWidth} size={size} error={styling.error}>
            <InputLabel>{label}</InputLabel>
            <Select
              name={field.name}
              value={field.value || ''}
              label={label}
              sx={styling.sx}
              onChange={(e) => {
                const value = e.target.value;
                field.onChange(value);
                debouncedValidation(name, value, stepIndex);
              }}
              onBlur={(e) => {
                field.onBlur();
                const result = getImmediateValidation(name, e.target.value, stepIndex);
                if (!result.isValid && result.error) {
                  setError(name, {
                    type: 'manual',
                    message: result.error
                  });
                } else {
                  clearErrors(name);
                }
              }}
            >
              {children}
            </Select>
            {(styling.helperText || helperText) && (
              <FormHelperText>{styling.helperText || helperText}</FormHelperText>
            )}
          </FormControl>
        );
      }}
    />
  );
};

export default { ValidatedTextField, ValidatedSelect };