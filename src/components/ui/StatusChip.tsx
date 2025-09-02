import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { ApplicationStatus } from '../../types';

// Define standard chip styling with borders and consistent radius
const getBaseChipStyles = (textColor: string, bgColor: string) => ({
  fontSize: '0.7rem',
  height: '24px',
  borderRadius: '5px', // Updated from round to 5px
  fontWeight: 500,
  bgcolor: bgColor,
  color: textColor,
  border: `1px solid ${textColor}`, // 1px border matching text color
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
    return {
      color: 'warning' as const,
      sx: getBaseChipStyles(textColor, bgColor)
    };
  }
  
  // Special handling for "Processed"
  if (statusLabel.toLowerCase().includes('processed')) {
    const textColor = '#1b5e20';
    const bgColor = '#e8f5e8';
    return {
      color: 'success' as const,
      sx: getBaseChipStyles(textColor, bgColor)
    };
  }
  
  switch (status) {
    case ApplicationStatus.DRAFT: {
      const textColor = '#424242';
      const bgColor = '#f5f5f5';
      return {
        color: 'default' as const,
        sx: getBaseChipStyles(textColor, bgColor)
      };
    }
    case ApplicationStatus.SUBMITTED: {
      const textColor = '#1565c0';
      const bgColor = '#e3f2fd';
      return {
        color: 'info' as const,
        sx: getBaseChipStyles(textColor, bgColor)
      };
    }
    case ApplicationStatus.PAID: {
      const textColor = '#1b5e20';
      const bgColor = '#e8f5e8';
      return {
        color: 'primary' as const,
        sx: getBaseChipStyles(textColor, bgColor)
      };
    }
    case ApplicationStatus.PASSED:
    case ApplicationStatus.APPROVED:
    case ApplicationStatus.COMPLETED: {
      const textColor = '#1b5e20';
      const bgColor = '#e8f5e8';
      return {
        color: 'success' as const,
        sx: getBaseChipStyles(textColor, bgColor)
      };
    }
    case ApplicationStatus.FAILED:
    case ApplicationStatus.ABSENT:
    case ApplicationStatus.REJECTED:
    case ApplicationStatus.CANCELLED: {
      const textColor = '#c62828';
      const bgColor = '#ffebee';
      return {
        color: 'error' as const,
        sx: getBaseChipStyles(textColor, bgColor)
      };
    }
    case ApplicationStatus.ON_HOLD: {
      const textColor = '#e65100';
      const bgColor = '#fff3e0';
      return {
        color: 'warning' as const,
        sx: getBaseChipStyles(textColor, bgColor)
      };
    }
    case ApplicationStatus.SENT_TO_PRINTER:
    case ApplicationStatus.CARD_PRODUCTION: {
      const textColor = '#1565c0';
      const bgColor = '#e3f2fd';
      return {
        color: 'primary' as const,
        sx: getBaseChipStyles(textColor, bgColor)
      };
    }
    case ApplicationStatus.READY_FOR_COLLECTION: {
      const textColor = '#00695c';
      const bgColor = '#e0f7fa';
      return {
        color: 'info' as const,
        sx: getBaseChipStyles(textColor, bgColor)
      };
    }
    default: {
      const textColor = '#1565c0';
      const bgColor = '#e3f2fd';
      return {
        color: 'primary' as const,
        sx: getBaseChipStyles(textColor, bgColor)
      };
    }
  }
};

// Generic chip variants for other use cases
export const getChipVariant = (variant: 'license' | 'category' | 'tag' | 'info') => {
  switch (variant) {
    case 'license': {
      const textColor = '#1565c0';
      const bgColor = '#ffffff';
      return {
        color: 'primary' as const,
        variant: 'outlined' as const,
        sx: {
          ...getBaseChipStyles(textColor, bgColor),
          bgcolor: 'transparent',
          border: `1px solid ${textColor}`,
        }
      };
    }
    case 'category': {
      const textColor = '#6a1b9a';
      const bgColor = '#f3e5f5';
      return {
        color: 'secondary' as const,
        sx: getBaseChipStyles(textColor, bgColor)
      };
    }
    case 'tag': {
      const textColor = '#455a64';
      const bgColor = '#eceff1';
      return {
        color: 'default' as const,
        sx: getBaseChipStyles(textColor, bgColor)
      };
    }
    case 'info': {
      const textColor = '#0277bd';
      const bgColor = '#e1f5fe';
      return {
        color: 'info' as const,
        sx: getBaseChipStyles(textColor, bgColor)
      };
    }
    default: {
      const textColor = '#424242';
      const bgColor = '#f5f5f5';
      return {
        color: 'default' as const,
        sx: getBaseChipStyles(textColor, bgColor)
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
  variant?: 'license' | 'category' | 'tag' | 'info';
}

export const LicenseChip: React.FC<LicenseChipProps> = ({ 
  category, 
  variant = 'license',
  size = 'small',
  ...props 
}) => {
  const chipProps = getChipVariant(variant);
  
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
