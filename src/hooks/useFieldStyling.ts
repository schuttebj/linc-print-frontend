/**
 * Field Styling Hook
 * Provides consistent styling for form fields based on validation states
 */

import { useMemo } from 'react';

export type FieldState = 'valid' | 'invalid' | 'required' | 'default';

export interface FieldStyling {
  sx: Record<string, any>;
  error: boolean;
  helperText?: string;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
}

export const useFieldStyling = (
  fieldState: FieldState,
  errorMessage?: string,
  isRequired: boolean = false
): FieldStyling => {
  
  return useMemo(() => {
    const baseSx = {
      '& .MuiOutlinedInput-root': {
        '& fieldset': {
          borderWidth: '2px',
          transition: 'border-color 0.2s ease-in-out',
        },
        '&:hover fieldset': {
          borderWidth: '2px',
        },
        '&.Mui-focused fieldset': {
          borderWidth: '2px',
        },
      },
    };

    switch (fieldState) {
      case 'required':
        return {
          sx: {
            ...baseSx,
            '& .MuiOutlinedInput-root': {
              ...baseSx['& .MuiOutlinedInput-root'],
              '& fieldset': {
                ...baseSx['& .MuiOutlinedInput-root']['& fieldset'],
                borderColor: '#ff9800', // Orange for required fields
              },
              '&:hover fieldset': {
                ...baseSx['& .MuiOutlinedInput-root']['&:hover fieldset'],
                borderColor: '#f57c00', // Darker orange on hover
              },
              '&.Mui-focused fieldset': {
                ...baseSx['& .MuiOutlinedInput-root']['&.Mui-focused fieldset'],
                borderColor: '#ff9800', // Orange when focused
              },
            },
          },
          error: false,
          helperText: errorMessage || (isRequired ? 'This field is required' : undefined),
          color: 'warning' as const,
        };

      case 'invalid':
        return {
          sx: {
            ...baseSx,
            '& .MuiOutlinedInput-root': {
              ...baseSx['& .MuiOutlinedInput-root'],
              '& fieldset': {
                ...baseSx['& .MuiOutlinedInput-root']['& fieldset'],
                borderColor: '#f44336', // Red for invalid fields
              },
              '&:hover fieldset': {
                ...baseSx['& .MuiOutlinedInput-root']['&:hover fieldset'],
                borderColor: '#d32f2f', // Darker red on hover
              },
              '&.Mui-focused fieldset': {
                ...baseSx['& .MuiOutlinedInput-root']['&.Mui-focused fieldset'],
                borderColor: '#f44336', // Red when focused
              },
            },
          },
          error: true,
          helperText: errorMessage,
          color: 'error' as const,
        };

      case 'valid':
        return {
          sx: {
            ...baseSx,
            '& .MuiOutlinedInput-root': {
              ...baseSx['& .MuiOutlinedInput-root'],
              '& fieldset': {
                ...baseSx['& .MuiOutlinedInput-root']['& fieldset'],
                borderColor: '#4caf50', // Green for valid fields
              },
              '&:hover fieldset': {
                ...baseSx['& .MuiOutlinedInput-root']['&:hover fieldset'],
                borderColor: '#388e3c', // Darker green on hover
              },
              '&.Mui-focused fieldset': {
                ...baseSx['& .MuiOutlinedInput-root']['&.Mui-focused fieldset'],
                borderColor: '#4caf50', // Green when focused
              },
            },
          },
          error: false,
          helperText: undefined,
          color: 'success' as const,
        };

      case 'default':
      default:
        return {
          sx: baseSx,
          error: false,
          helperText: undefined,
          color: 'primary' as const,
        };
    }
  }, [fieldState, errorMessage, isRequired]);
};

// Helper function for select components
export const useSelectStyling = (
  fieldState: FieldState,
  errorMessage?: string,
  isRequired: boolean = false
) => {
  const styling = useFieldStyling(fieldState, errorMessage, isRequired);
  
  return {
    ...styling,
    sx: {
      ...styling.sx,
      '& .MuiSelect-outlined': {
        '& fieldset': {
          borderWidth: '2px',
          transition: 'border-color 0.2s ease-in-out',
        },
      },
    },
  };
};

export default useFieldStyling;