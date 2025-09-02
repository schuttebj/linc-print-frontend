import { Theme } from '@mui/material/styles';

// Global chip theme overrides for consistent styling
export const chipThemeOverrides = {
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: '5px', // 5px border radius instead of round
        fontWeight: 500,
        fontSize: '0.7rem',
        height: '24px',
        border: '1px solid transparent', // Default border, will be overridden by colors
      },
      sizeSmall: {
        height: '20px',
        fontSize: '0.65rem',
      },
      // Override default color variants with borders
      colorDefault: {
        backgroundColor: '#f5f5f5',
        color: '#424242',
        border: '1px solid #424242',
        '&:hover': {
          backgroundColor: '#f5f5f5',
          opacity: 0.9,
        },
      },
      colorPrimary: {
        backgroundColor: '#e3f2fd',
        color: '#1565c0',
        border: '1px solid #1565c0',
        '&:hover': {
          backgroundColor: '#e3f2fd',
          opacity: 0.9,
        },
      },
      colorSecondary: {
        backgroundColor: '#f3e5f5',
        color: '#6a1b9a',
        border: '1px solid #6a1b9a',
        '&:hover': {
          backgroundColor: '#f3e5f5',
          opacity: 0.9,
        },
      },
      colorError: {
        backgroundColor: '#ffebee',
        color: '#c62828',
        border: '1px solid #c62828',
        '&:hover': {
          backgroundColor: '#ffebee',
          opacity: 0.9,
        },
      },
      colorInfo: {
        backgroundColor: '#e1f5fe',
        color: '#0277bd',
        border: '1px solid #0277bd',
        '&:hover': {
          backgroundColor: '#e1f5fe',
          opacity: 0.9,
        },
      },
      colorSuccess: {
        backgroundColor: '#e8f5e8',
        color: '#1b5e20',
        border: '1px solid #1b5e20',
        '&:hover': {
          backgroundColor: '#e8f5e8',
          opacity: 0.9,
        },
      },
      colorWarning: {
        backgroundColor: '#fff3e0',
        color: '#e65100',
        border: '1px solid #e65100',
        '&:hover': {
          backgroundColor: '#fff3e0',
          opacity: 0.9,
        },
      },
      // Outlined variant adjustments
      outlined: {
        backgroundColor: 'transparent',
        '&.MuiChip-colorDefault': {
          borderColor: '#424242',
          color: '#424242',
        },
        '&.MuiChip-colorPrimary': {
          borderColor: '#1565c0',
          color: '#1565c0',
        },
        '&.MuiChip-colorSecondary': {
          borderColor: '#6a1b9a',
          color: '#6a1b9a',
        },
        '&.MuiChip-colorError': {
          borderColor: '#c62828',
          color: '#c62828',
        },
        '&.MuiChip-colorInfo': {
          borderColor: '#0277bd',
          color: '#0277bd',
        },
        '&.MuiChip-colorSuccess': {
          borderColor: '#1b5e20',
          color: '#1b5e20',
        },
        '&.MuiChip-colorWarning': {
          borderColor: '#e65100',
          color: '#e65100',
        },
      },
    },
  },
};

// Utility function to create custom chip styles
export const createChipStyle = (textColor: string, bgColor: string, outlined = false) => ({
  backgroundColor: outlined ? 'transparent' : bgColor,
  color: textColor,
  border: `1px solid ${textColor}`,
  borderRadius: '5px',
  fontSize: '0.7rem',
  height: '24px',
  fontWeight: 500,
  '&:hover': {
    backgroundColor: outlined ? 'transparent' : bgColor,
    opacity: 0.9,
  },
});

// Predefined chip color schemes
export const chipColorSchemes = {
  // Status colors
  draft: { text: '#424242', bg: '#f5f5f5' },
  submitted: { text: '#1565c0', bg: '#e3f2fd' },
  paid: { text: '#1b5e20', bg: '#e8f5e8' },
  processed: { text: '#1b5e20', bg: '#e8f5e8' },
  approved: { text: '#1b5e20', bg: '#e8f5e8' },
  completed: { text: '#1b5e20', bg: '#e8f5e8' },
  failed: { text: '#c62828', bg: '#ffebee' },
  rejected: { text: '#c62828', bg: '#ffebee' },
  cancelled: { text: '#c62828', bg: '#ffebee' },
  onHold: { text: '#e65100', bg: '#fff3e0' },
  fraud: { text: '#e65100', bg: '#fff8e1' },
  
  // License category colors
  license: { text: '#1565c0', bg: '#ffffff' },
  category: { text: '#6a1b9a', bg: '#f3e5f5' },
  
  // General purpose colors
  info: { text: '#0277bd', bg: '#e1f5fe' },
  tag: { text: '#455a64', bg: '#eceff1' },
  neutral: { text: '#424242', bg: '#f5f5f5' },
};

export default chipThemeOverrides;
