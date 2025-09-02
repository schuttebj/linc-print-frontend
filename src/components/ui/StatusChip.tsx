import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { ApplicationStatus } from '../../types';

// Define standard chip styling with borders and consistent radius
const getBaseChipStyles = (textColor: string, bgColor: string, borderColor: string) => ({
  fontSize: '0.7rem',
  height: '24px',
  borderRadius: '5px', // Updated from round to 5px
  fontWeight: 500,
  bgcolor: bgColor,
  color: textColor,
  border: `1px solid ${borderColor}`, // 1px border with softer color
  '&:hover': {
    bgcolor: bgColor,
    opacity: 0.9,
  },
});

// Status-specific color mappings
export const getStatusChipProps = (status: ApplicationStatus, statusLabel: string) => {
  // Special handling for "Possible Fraud"
  if (statusLabel.toLowerCase().includes('fraud') || status === 'POSSIBLE_FRAUD' as any) {
    const textColor = '#e65100';
    const bgColor = '#fff3e0';
    const borderColor = '#ffb74d'; // Medium orange between text and background
    return {
      color: 'warning' as const,
      sx: getBaseChipStyles(textColor, bgColor, borderColor)
    };
  }
  
  // Special handling for "Processed"
  if (statusLabel.toLowerCase().includes('processed')) {
    const textColor = '#1b5e20';
    const bgColor = '#e8f5e8';
    const borderColor = '#a6e8ab'; // As specified by user
    return {
      color: 'success' as const,
      sx: getBaseChipStyles(textColor, bgColor, borderColor)
    };
  }
  
  switch (status) {
    case ApplicationStatus.DRAFT: {
      const textColor = '#424242';
      const bgColor = '#f5f5f5';
      const borderColor = '#9e9e9e'; // Medium gray
      return {
        color: 'default' as const,
        sx: getBaseChipStyles(textColor, bgColor, borderColor)
      };
    }
    case ApplicationStatus.SUBMITTED: {
      const textColor = '#1565c0';
      const bgColor = '#e3f2fd';
      const borderColor = '#90caf9'; // Medium blue
      return {
        color: 'info' as const,
        sx: getBaseChipStyles(textColor, bgColor, borderColor)
      };
    }
    case ApplicationStatus.PAID: {
      const textColor = '#1b5e20';
      const bgColor = '#e8f5e8';
      const borderColor = '#a6e8ab'; // Same as processed
      return {
        color: 'primary' as const,
        sx: getBaseChipStyles(textColor, bgColor, borderColor)
      };
    }
    case ApplicationStatus.PASSED:
    case ApplicationStatus.APPROVED:
    case ApplicationStatus.COMPLETED: {
      const textColor = '#1b5e20';
      const bgColor = '#e8f5e8';
      const borderColor = '#a6e8ab'; // As specified by user
      return {
        color: 'success' as const,
        sx: getBaseChipStyles(textColor, bgColor, borderColor)
      };
    }
    case ApplicationStatus.FAILED:
    case ApplicationStatus.ABSENT:
    case ApplicationStatus.REJECTED:
    case ApplicationStatus.CANCELLED: {
      const textColor = '#c62828';
      const bgColor = '#ffebee';
      const borderColor = '#ef9a9a'; // Medium red
      return {
        color: 'error' as const,
        sx: getBaseChipStyles(textColor, bgColor, borderColor)
      };
    }
    case ApplicationStatus.ON_HOLD: {
      const textColor = '#e65100';
      const bgColor = '#fff3e0';
      const borderColor = '#ffb74d'; // Medium orange
      return {
        color: 'warning' as const,
        sx: getBaseChipStyles(textColor, bgColor, borderColor)
      };
    }
    case ApplicationStatus.SENT_TO_PRINTER:
    case ApplicationStatus.CARD_PRODUCTION: {
      const textColor = '#1565c0';
      const bgColor = '#e3f2fd';
      const borderColor = '#90caf9'; // Medium blue
      return {
        color: 'primary' as const,
        sx: getBaseChipStyles(textColor, bgColor, borderColor)
      };
    }
    case ApplicationStatus.READY_FOR_COLLECTION: {
      const textColor = '#00695c';
      const bgColor = '#e0f7fa';
      const borderColor = '#4dd0e1'; // Medium cyan
      return {
        color: 'info' as const,
        sx: getBaseChipStyles(textColor, bgColor, borderColor)
      };
    }
    default: {
      const textColor = '#1565c0';
      const bgColor = '#e3f2fd';
      const borderColor = '#90caf9'; // Medium blue
      return {
        color: 'primary' as const,
        sx: getBaseChipStyles(textColor, bgColor, borderColor)
      };
    }
  }
};

// Generic chip variants for other use cases
export const getChipVariant = (chipType: 'license' | 'category' | 'tag' | 'info') => {
  switch (chipType) {
    case 'license': {
      const textColor = '#1565c0';
      const bgColor = '#ffffff';
      const borderColor = '#90caf9'; // Medium blue for outlined style
      return {
        color: 'primary' as const,
        variant: 'outlined' as const,
        sx: {
          ...getBaseChipStyles(textColor, bgColor, borderColor),
          bgcolor: 'transparent',
        }
      };
    }
    case 'category': {
      const textColor = '#6a1b9a';
      const bgColor = '#f3e5f5';
      const borderColor = '#ce93d8'; // Medium purple
      return {
        color: 'secondary' as const,
        sx: getBaseChipStyles(textColor, bgColor, borderColor)
      };
    }
    case 'tag': {
      const textColor = '#455a64';
      const bgColor = '#eceff1';
      const borderColor = '#90a4ae'; // Medium blue-gray
      return {
        color: 'default' as const,
        sx: getBaseChipStyles(textColor, bgColor, borderColor)
      };
    }
    case 'info': {
      const textColor = '#0277bd';
      const bgColor = '#e1f5fe';
      const borderColor = '#4fc3f7'; // Medium light blue
      return {
        color: 'info' as const,
        sx: getBaseChipStyles(textColor, bgColor, borderColor)
      };
    }
    default: {
      const textColor = '#424242';
      const bgColor = '#f5f5f5';
      const borderColor = '#9e9e9e'; // Medium gray
      return {
        color: 'default' as const,
        sx: getBaseChipStyles(textColor, bgColor, borderColor)
      };
    }
  }
};

// StatusChip component for application statuses
interface StatusChipProps extends Omit<ChipProps, 'color'> {
  status: ApplicationStatus;
  statusLabel: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ 
  status, 
  statusLabel, 
  size = 'small',
  ...props 
}) => {
  const chipProps = getStatusChipProps(status, statusLabel);
  
  return (
    <Chip
      label={statusLabel}
      size={size}
      {...chipProps}
      {...props}
      sx={{
        ...chipProps.sx,
        ...props.sx, // Allow override if needed
      }}
    />
  );
};

// LicenseChip component for license categories
interface LicenseChipProps extends Omit<ChipProps, 'color'> {
  category: string;
  chipType?: 'license' | 'category' | 'tag' | 'info';
}

export const LicenseChip: React.FC<LicenseChipProps> = ({ 
  category, 
  chipType = 'license',
  size = 'small',
  ...props 
}) => {
  const chipProps = getChipVariant(chipType);
  
  return (
    <Chip
      label={category}
      size={size}
      {...chipProps}
      {...props}
      sx={{
        ...chipProps.sx,
        ...props.sx, // Allow override if needed
      }}
    />
  );
};

export default StatusChip;
