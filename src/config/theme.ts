import { createTheme } from '@mui/material/styles';
import { useState } from 'react';
import { chipThemeOverrides } from '../theme/chipTheme';

// Madagascar Driver's License System Theme Configuration

// Normal theme (original)
export const theme = createTheme({
  palette: {
    mode: 'light' as const,
    primary: {
      main: '#10367d', // Madagascar blue
      light: '#4a5f9a',
      dark: '#0b2557',
      contrastText: '#fff',
    },
    secondary: {
      main: '#74b4da', // Light blue accent
      light: '#a3c7e4',
      dark: '#4f7e98',
      contrastText: '#fff',
    },
    background: {
      default: '#ebebeb', // Light gray background
      paper: '#ffffff',
    },
    text: {
      primary: '#212121',
      secondary: '#757575',
    },
    success: {
      main: '#4caf50',
    },
    warning: {
      main: '#ff9800',
    },
    error: {
      main: '#f44336',
    },
    info: {
      main: '#74b4da', // Use secondary color for info
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.125rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.875rem',
      fontWeight: 500,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.625rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.375rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.6,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.75,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.57,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.43,
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.66,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      textTransform: 'none' as const,
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
  components: {
    ...chipThemeOverrides,
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 8,
          padding: '8px 16px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
        },
        elevation2: {
          boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
        },
        elevation3: {
          boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(0, 0, 0, 0.12)',
        },
      },
    },
  },
});

// Compact theme with reduced spacing and font sizes  
export const compactTheme = createTheme({
  palette: {
    mode: 'light' as const,
    primary: {
      main: '#10367d', // Madagascar blue
      light: '#4a5f9a',
      dark: '#0b2557',
      contrastText: '#fff',
    },
    secondary: {
      main: '#74b4da', // Light blue accent
      light: '#a3c7e4',
      dark: '#4f7e98',
      contrastText: '#fff',
    },
    background: {
      default: '#ebebeb', // Light gray background
      paper: '#ffffff',
    },
    text: {
      primary: '#212121',
      secondary: '#757575',
    },
    success: {
      main: '#4caf50',
    },
    warning: {
      main: '#ff9800',
    },
    error: {
      main: '#f44336',
    },
    info: {
      main: '#74b4da', // Use secondary color for info
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '1.75rem',    // Was 2.125rem (-18%)
      fontWeight: 500,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.5rem',     // Was 1.875rem (-20%)
      fontWeight: 500,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.375rem',   // Was 1.625rem (-15%)
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.125rem',   // Was 1.375rem (-18%)
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1rem',       // Was 1.125rem (-11%)
      fontWeight: 500,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '0.875rem',   // Was 1rem (-12%)
      fontWeight: 500,
      lineHeight: 1.6,
    },
    subtitle1: {
      fontSize: '0.875rem',   // Was 1rem (-12%)
      fontWeight: 400,
      lineHeight: 1.75,
    },
    subtitle2: {
      fontSize: '0.75rem',    // Was 0.875rem (-14%)
      fontWeight: 500,
      lineHeight: 1.57,
    },
    body1: {
      fontSize: '0.875rem',   // Was 1rem (-12%)
      fontWeight: 400,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.75rem',    // Was 0.875rem (-14%)
      fontWeight: 400,
      lineHeight: 1.43,
    },
    caption: {
      fontSize: '0.625rem',   // Was 0.75rem (-17%)
      fontWeight: 400,
      lineHeight: 1.66,
    },
    button: {
      fontSize: '0.75rem',    // Was 0.875rem (-14%)
      fontWeight: 500,
      textTransform: 'none' as const,
    },
  },
  shape: {
    borderRadius: 6, // Smaller than normal (8)
  },
  spacing: 6, // Was 8 (-25% spacing)
  components: {
    ...chipThemeOverrides,
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 6,        // Was 8 (smaller)
          padding: '6px 12px',    // Was 8px 16px (smaller)
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.2)',
          },
        },
      },
      defaultProps: {
        size: 'small',
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,        // Was 12 (smaller)
          boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '12px !important',  // Was 16px+ (compact)
          '&:last-child': {
            paddingBottom: '12px !important',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 6,      // Was 8 (smaller)
          },
        },
      },
      defaultProps: {
        size: 'small',
        margin: 'dense',
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',  // Smaller text in selects
        },
        select: {
          paddingTop: '8px',     // Reduce vertical padding
          paddingBottom: '8px',
          paddingLeft: '12px',   // Reduce horizontal padding  
          paddingRight: '32px',  // Space for dropdown arrow
        },
      },
      defaultProps: {
        size: 'small',
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: {
          minWidth: '120px',     // Smaller minimum width
        },
      },
      defaultProps: {
        size: 'small',
        margin: 'dense',
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',  // Consistent smaller text
        },
        input: {
          padding: '8px 12px',   // Compact padding for all inputs
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',  // Smaller menu items
          minHeight: '36px',     // Reduce minimum height (was 48px)
          paddingTop: '6px',     // Compact vertical padding
          paddingBottom: '6px',
          paddingLeft: '12px',   // Compact horizontal padding
          paddingRight: '12px',
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-root': {
            paddingTop: '4px',   // Compact autocomplete padding
            paddingBottom: '4px',
          },
        },
        tag: {
          margin: '2px',        // Tighter tag spacing
          height: '24px',       // Smaller tag height
        },
        popupIndicator: {
          padding: '4px',       // Smaller dropdown indicator
        },
      },
      defaultProps: {
        size: 'small',
      },
    },
    MuiChip: {
      styleOverrides: {
        ...chipThemeOverrides.MuiChip.styleOverrides,
        root: {
          ...chipThemeOverrides.MuiChip.styleOverrides.root,
          height: '20px',       // Even smaller for compact theme
          fontSize: '0.65rem',  // Smaller text for compact
        },
        label: {
          paddingLeft: '6px',   // Extra compact chip padding
          paddingRight: '6px',
        },
        sizeSmall: {
          height: '18px',
          fontSize: '0.6rem',
        },
      },
      defaultProps: {
        size: 'small',
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',  // Smaller table text
          padding: '8px',        // Compact cell padding (was 16px)
        },
        head: {
          fontSize: '0.75rem',   // Even smaller header text
          fontWeight: 600,
          padding: '6px 8px',    // Extra compact headers
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:last-child td': {
            borderBottom: 0,
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          padding: '4px',        // Compact checkbox padding
        },
      },
      defaultProps: {
        size: 'small',
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          padding: '4px',        // Compact radio padding
        },
      },
      defaultProps: {
        size: 'small',
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          padding: '6px',        // Compact switch padding
        },
      },
      defaultProps: {
        size: 'small',
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          margin: '16px',        // Smaller dialog margins
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.125rem',  // Smaller dialog titles
          padding: '12px 16px',  // Compact dialog title padding
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '12px 16px',  // Compact dialog content padding
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '8px 16px',   // Compact dialog action padding
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingTop: '16px !important',    // Was higher (compact)
          paddingBottom: '16px !important',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)',
        },
        elevation2: {
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
        },
        elevation3: {
          boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(0, 0, 0, 0.12)',
        },
      },
    },
  },
});

// Theme toggle utility (use in App.tsx)
export const useCompactMode = () => {
  const [isCompact, setIsCompact] = useState(false);
  const currentTheme = isCompact ? compactTheme : theme;
  
  return { isCompact, setIsCompact, currentTheme };
};