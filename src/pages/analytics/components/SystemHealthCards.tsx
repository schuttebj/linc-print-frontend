/**
 * System Health Cards Component
 * Displays system performance and health indicators
 */

import React from 'react';
import {
  Grid,
  Box,
  Typography,
  LinearProgress,
  Chip,
  Card,
  CardContent
} from '@mui/material';
import {
  Speed as SpeedIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

import ChartWidget from './ChartWidget';

const SystemHealthCards: React.FC = () => {
  // System health metrics
  const systemHealthMetrics = [
    {
      id: 1,
      title: 'API Response Time',
      value: '245ms',
      percentage: 85,
      status: 'good',
      threshold: 'Target: <300ms',
      icon: <SpeedIcon />,
      color: '#00ff00'
    },
    {
      id: 2,
      title: 'Database Performance',
      value: '1.2s',
      percentage: 92,
      status: 'excellent',
      threshold: 'Target: <2s',
      icon: <MemoryIcon />,
      color: '#00ff00'
    },
    {
      id: 3,
      title: 'Storage Usage',
      value: '68%',
      percentage: 68,
      status: 'warning',
      threshold: 'Limit: 80%',
      icon: <StorageIcon />,
      color: '#ffc658'
    },
    {
      id: 4,
      title: 'Error Rate',
      value: '0.2%',
      percentage: 2,
      status: 'excellent',
      threshold: 'Target: <1%',
      icon: <ErrorIcon />,
      color: '#00ff00'
    }
  ];

  // System status indicators
  const systemServices = [
    {
      name: 'Authentication Service',
      status: 'online',
      uptime: '99.9%',
      lastCheck: '1 min ago'
    },
    {
      name: 'Database Service',
      status: 'online',
      uptime: '99.8%',
      lastCheck: '1 min ago'
    },
    {
      name: 'File Storage Service',
      status: 'online',
      uptime: '99.5%',
      lastCheck: '2 min ago'
    },
    {
      name: 'Print Queue Service',
      status: 'warning',
      uptime: '98.2%',
      lastCheck: '3 min ago'
    },
    {
      name: 'Backup Service',
      status: 'online',
      uptime: '100%',
      lastCheck: '5 min ago'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
      case 'good':
        return <CheckCircleIcon sx={{ color: '#00ff00', fontSize: 16 }} />;
      case 'warning':
        return <WarningIcon sx={{ color: '#ffc658', fontSize: 16 }} />;
      case 'error':
        return <ErrorIcon sx={{ color: '#ff7300', fontSize: 16 }} />;
      default:
        return <CheckCircleIcon sx={{ color: '#00ff00', fontSize: 16 }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return '#00ff00';
    if (percentage >= 70) return '#ffc658';
    return '#ff7300';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
      {/* System Health Metrics */}
      <ChartWidget 
        title="System Health Indicators" 
        subtitle="Key system performance metrics"
        height={300}
      >
        <Grid container spacing={2}>
          {systemHealthMetrics.map((metric) => (
            <Grid item xs={12} key={metric.id}>
              <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ color: metric.color }}>
                      {metric.icon}
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {metric.title}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getStatusIcon(metric.status)}
                    <Typography variant="h6" sx={{ fontWeight: 700, color: metric.color }}>
                      {metric.value}
                    </Typography>
                  </Box>
                </Box>
                
                <LinearProgress 
                  variant="determinate" 
                  value={metric.percentage} 
                  sx={{ 
                    height: 6, 
                    borderRadius: 3,
                    bgcolor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: getProgressColor(metric.percentage),
                      borderRadius: 3
                    }
                  }}
                />
                
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  {metric.threshold}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </ChartWidget>

      {/* System Services Status */}
      <ChartWidget 
        title="System Services Status" 
        subtitle="Service availability and uptime"
        height={280}
      >
        <Grid container spacing={1}>
          {systemServices.map((service, index) => (
            <Grid item xs={12} key={index}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                p: 1.5,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: service.status === 'online' ? 'success.light' : 
                         service.status === 'warning' ? 'warning.light' : 'error.light',
                opacity: 0.1
              }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {service.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Last check: {service.lastCheck}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {service.uptime}
                  </Typography>
                  <Chip 
                    label={service.status.toUpperCase()} 
                    size="small" 
                    color={getStatusColor(service.status) as any}
                    sx={{ fontSize: '0.7rem', height: 20, fontWeight: 600 }}
                  />
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </ChartWidget>
    </Box>
  );
};

export default SystemHealthCards;