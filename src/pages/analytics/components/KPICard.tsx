/**
 * KPI Card Component
 * Displays key performance indicators with trend information
 */

import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  useTheme
} from '@mui/material';
import {
  Assignment,
  Badge,
  Print,
  AttachMoney,
  TrendingUp,
  TrendingDown,
  TrendingFlat
} from '@mui/icons-material';

interface KPICardProps {
  title: string;
  value: string;
  change: string;
  period: string;
  icon: string;
  color: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  trend: 'up' | 'down' | 'flat';
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  period,
  icon,
  color,
  trend
}) => {
  const theme = useTheme();

  // Icon mapping
  const iconMap = {
    Assignment: Assignment,
    Badge: Badge,
    Print: Print,
    AttachMoney: AttachMoney
  };

  const IconComponent = iconMap[icon as keyof typeof iconMap] || Assignment;

  // Trend icon and color
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp sx={{ fontSize: 16 }} />;
      case 'down':
        return <TrendingDown sx={{ fontSize: 16 }} />;
      default:
        return <TrendingFlat sx={{ fontSize: 16 }} />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'success';
      case 'down':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        bgcolor: 'white',
        borderRadius: 2,
        boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
        p: 1.5,
        transition: 'transform 0.1s, box-shadow 0.1s',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: 'rgba(0, 0, 0, 0.08) 0px 2px 4px 0px'
        }
      }}
    >
      {/* Header Row - Icon and Trend */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box
          sx={{
            bgcolor: `${color}.light`,
            color: `${color}.main`,
            p: 0.75,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 32,
            height: 32
          }}
        >
          <IconComponent sx={{ fontSize: 18 }} />
        </Box>
        
        <Chip
          icon={getTrendIcon()}
          label={change}
          size="small"
          color={getTrendColor() as any}
          variant="outlined"
          sx={{ 
            fontSize: '0.7rem',
            height: 20,
            '& .MuiChip-icon': {
              fontSize: 12
            },
            '& .MuiChip-label': {
              px: 0.5
            }
          }}
        />
      </Box>

      {/* Main Value */}
      <Typography 
        variant="h5" 
        component="div" 
        sx={{ 
          fontWeight: 700, 
          mb: 0.25,
          fontSize: '1.5rem',
          lineHeight: 1.2,
          color: `${color}.main`
        }}
      >
        {value}
      </Typography>

      {/* Title */}
      <Typography 
        variant="body2" 
        component="div" 
        sx={{ 
          fontWeight: 600, 
          mb: 0.25,
          fontSize: '0.85rem',
          color: 'text.primary'
        }}
      >
        {title}
      </Typography>

      {/* Period */}
      <Typography 
        variant="caption" 
        color="text.secondary"
        sx={{ 
          fontSize: '0.7rem',
          fontWeight: 400
        }}
      >
        {period}
      </Typography>
    </Paper>
  );
};

export default KPICard;