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
      // Override default color variants with softer borders
      colorDefault: {
        backgroundColor: '#f5f5f5',
        color: '#424242',
        border: '1px solid #9e9e9e', // Softer gray
        '&:hover': {
          backgroundColor: '#f5f5f5',
          opacity: 0.9,
        },
      },
      colorPrimary: {
        backgroundColor: '#e3f2fd',
        color: '#1565c0',
        border: '1px solid #90caf9', // Softer blue
        '&:hover': {
          backgroundColor: '#e3f2fd',
          opacity: 0.9,
        },
      },
      colorSecondary: {
        backgroundColor: '#f3e5f5',
        color: '#6a1b9a',
        border: '1px solid #ce93d8', // Softer purple
        '&:hover': {
          backgroundColor: '#f3e5f5',
          opacity: 0.9,
        },
      },
      colorError: {
        backgroundColor: '#ffebee',
        color: '#c62828',
        border: '1px solid #ef9a9a', // Softer red
        '&:hover': {
          backgroundColor: '#ffebee',
          opacity: 0.9,
        },
      },
      colorInfo: {
        backgroundColor: '#e1f5fe',
        color: '#0277bd',
        border: '1px solid #4fc3f7', // Softer light blue
        '&:hover': {
          backgroundColor: '#e1f5fe',
          opacity: 0.9,
        },
      },
      colorSuccess: {
        backgroundColor: '#e8f5e8',
        color: '#1b5e20',
        border: '1px solid #a6e8ab', // Softer green as specified
        '&:hover': {
          backgroundColor: '#e8f5e8',
          opacity: 0.9,
        },
      },
      colorWarning: {
        backgroundColor: '#fff3e0',
        color: '#e65100',
        border: '1px solid #ffb74d', // Softer orange
        '&:hover': {
          backgroundColor: '#fff3e0',
          opacity: 0.9,
        },
      },
      // Outlined variant adjustments - border matches text for no-background chips
      outlined: {
        backgroundColor: 'transparent',
        '&.MuiChip-colorDefault': {
          borderColor: '#424242', // Text-matching border for outlined chips
          color: '#424242',
        },
        '&.MuiChip-colorPrimary': {
          borderColor: '#1565c0', // Text-matching border for outlined chips
          color: '#1565c0',
        },
        '&.MuiChip-colorSecondary': {
          borderColor: '#6a1b9a', // Text-matching border for outlined chips
          color: '#6a1b9a',
        },
        '&.MuiChip-colorError': {
          borderColor: '#c62828', // Text-matching border for outlined chips
          color: '#c62828',
        },
        '&.MuiChip-colorInfo': {
          borderColor: '#0277bd', // Text-matching border for outlined chips
          color: '#0277bd',
        },
        '&.MuiChip-colorSuccess': {
          borderColor: '#1b5e20', // Text-matching border for outlined chips
          color: '#1b5e20',
        },
        '&.MuiChip-colorWarning': {
          borderColor: '#e65100', // Text-matching border for outlined chips
          color: '#e65100',
        },
      },
    },
  },
};

// Utility function to create custom chip styles
export const createChipStyle = (textColor: string, bgColor: string, borderColor?: string, outlined = false) => ({
  backgroundColor: outlined ? 'transparent' : bgColor,
  color: textColor,
  border: `1px solid ${borderColor || textColor}`,
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
  // Status colors (with softer border colors)
  draft: { text: '#424242', bg: '#f5f5f5', border: '#9e9e9e' },
  submitted: { text: '#1565c0', bg: '#e3f2fd', border: '#90caf9' },
  paid: { text: '#1b5e20', bg: '#e8f5e8', border: '#a6e8ab' },
  processed: { text: '#1b5e20', bg: '#e8f5e8', border: '#a6e8ab' },
  approved: { text: '#1b5e20', bg: '#e8f5e8', border: '#a6e8ab' },
  completed: { text: '#1b5e20', bg: '#e8f5e8', border: '#a6e8ab' },
  failed: { text: '#c62828', bg: '#ffebee', border: '#ef9a9a' },
  rejected: { text: '#c62828', bg: '#ffebee', border: '#ef9a9a' },
  cancelled: { text: '#c62828', bg: '#ffebee', border: '#ef9a9a' },
  onHold: { text: '#e65100', bg: '#fff3e0', border: '#ffb74d' },
  fraud: { text: '#e65100', bg: '#fff8e1', border: '#ffb74d' },
  
  // License category colors (outlined style - text-matching borders)
  license: { text: '#1565c0', bg: 'transparent', border: '#1565c0' },
  code: { text: '#424242', bg: 'transparent', border: '#424242' },
  
  // Filled style chips (softer borders)
  category: { text: '#6a1b9a', bg: '#f3e5f5', border: '#ce93d8' },
  
  // General purpose colors
  info: { text: '#0277bd', bg: '#e1f5fe', border: '#4fc3f7' },
  tag: { text: '#455a64', bg: '#eceff1', border: '#90a4ae' },
  neutral: { text: '#424242', bg: '#f5f5f5', border: '#9e9e9e' },
};

export default chipThemeOverrides;
