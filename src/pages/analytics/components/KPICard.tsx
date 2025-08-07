/**
 * KPI Card Component
 * Displays key performance indicators with trend information
 */

import React from 'react';
import {
  Card,
  CardContent,
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
    <Card
      elevation={0}
      sx={{
        height: '100%',
        bgcolor: 'white',
        borderRadius: 2,
        boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3
        }
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box
            sx={{
              bgcolor: `${color}.light`,
              color: `${color}.main`,
              p: 1,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <IconComponent sx={{ fontSize: 24 }} />
          </Box>
          
          <Chip
            icon={getTrendIcon()}
            label={change}
            size="small"
            color={getTrendColor() as any}
            variant="outlined"
            sx={{ 
              fontSize: '0.75rem',
              '& .MuiChip-icon': {
                fontSize: 16
              }
            }}
          />
        </Box>

        <Typography variant="h4" component="div" sx={{ fontWeight: 700, mb: 0.5 }}>
          {value}
        </Typography>

        <Typography variant="subtitle1" component="div" sx={{ fontWeight: 600, mb: 0.5 }}>
          {title}
        </Typography>

        <Typography variant="caption" color="text.secondary">
          {period}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default KPICard;