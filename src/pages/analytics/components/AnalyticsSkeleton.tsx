/**
 * Analytics Skeleton Components
 * Loading skeleton components for analytics dashboard
 */

import React from 'react';
import {
  Box,
  Paper,
  Skeleton,
  Grid
} from '@mui/material';

// KPI Card Skeleton
export const KPICardSkeleton: React.FC = () => (
  <Paper
    elevation={0}
    sx={{
      height: '100%',
      bgcolor: 'white',
      borderRadius: 2,
      boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
      p: 1.5
    }}
  >
    {/* Header Row - Icon and Trend */}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
      <Skeleton variant="rounded" width={32} height={32} />
      <Skeleton variant="rounded" width={60} height={20} />
    </Box>

    {/* Main Value */}
    <Skeleton variant="text" width="70%" height={36} sx={{ mb: 0.25 }} />

    {/* Title */}
    <Skeleton variant="text" width="90%" height={20} sx={{ mb: 0.25 }} />

    {/* Period */}
    <Skeleton variant="text" width="50%" height={16} />
  </Paper>
);

// Chart Widget Skeleton
export const ChartWidgetSkeleton: React.FC<{ height?: number }> = ({ height = 300 }) => (
  <Paper
    elevation={0}
    sx={{
      p: 1.5,
      height: '100%',
      bgcolor: 'white',
      borderRadius: 2,
      boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
      display: 'flex',
      flexDirection: 'column'
    }}
  >
    {/* Header */}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Skeleton variant="text" width="60%" height={20} sx={{ mb: 0.25 }} />
        <Skeleton variant="text" width="40%" height={16} />
      </Box>
      <Skeleton variant="circular" width={24} height={24} />
    </Box>

    {/* Chart Content */}
    <Box sx={{ flex: 1, minHeight: 0 }}>
      <Skeleton variant="rectangular" width="100%" height="100%" />
    </Box>
  </Paper>
);

// System Health Cards Skeleton
export const SystemHealthSkeleton: React.FC = () => (
  <Box sx={{ height: '100%' }}>
    <Skeleton variant="text" width="60%" height={24} sx={{ mb: 2 }} />
    
    {/* Health Cards */}
    <Grid container spacing={1}>
      {[1, 2, 3, 4].map((index) => (
        <Grid item xs={12} key={index}>
          <Box sx={{ 
            p: 1, 
            border: '1px solid #e0e0e0', 
            borderRadius: 1, 
            backgroundColor: '#fafafa',
            mb: 1
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Skeleton variant="text" width="40%" height={16} />
              <Skeleton variant="rounded" width={60} height={20} />
            </Box>
            <Skeleton variant="text" width="30%" height={20} />
          </Box>
        </Grid>
      ))}
    </Grid>
  </Box>
);

// Activity Feed Skeleton
export const ActivityFeedSkeleton: React.FC = () => (
  <Box sx={{ height: '100%' }}>
    <Skeleton variant="text" width="50%" height={24} sx={{ mb: 2 }} />
    
    {/* Activity Items */}
    {[1, 2, 3, 4, 5].map((index) => (
      <Box key={index} sx={{ mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Skeleton variant="circular" width={24} height={24} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="80%" height={18} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width="60%" height={14} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width="30%" height={12} />
          </Box>
        </Box>
      </Box>
    ))}
  </Box>
);

// Overview Tab Skeleton
export const OverviewTabSkeleton: React.FC = () => (
  <Grid container spacing={2}>
    {/* KPI Cards Row */}
    <Grid item xs={12}>
      <Grid container spacing={2}>
        {[1, 2, 3, 4].map((index) => (
          <Grid item xs={12} sm={6} lg={3} key={index}>
            <KPICardSkeleton />
          </Grid>
        ))}
      </Grid>
    </Grid>

    {/* Main Chart */}
    <Grid item xs={12} md={8}>
      <ChartWidgetSkeleton height={350} />
    </Grid>

    {/* System Health */}
    <Grid item xs={12} md={4}>
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          height: '100%',
          bgcolor: 'white',
          borderRadius: 2,
          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px'
        }}
      >
        <SystemHealthSkeleton />
      </Paper>
    </Grid>

    {/* Secondary Charts */}
    <Grid item xs={12} md={6}>
      <ChartWidgetSkeleton height={300} />
    </Grid>
    <Grid item xs={12} md={6}>
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          height: '100%',
          bgcolor: 'white',
          borderRadius: 2,
          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px'
        }}
      >
        <ActivityFeedSkeleton />
      </Paper>
    </Grid>
  </Grid>
);

// Single Tab Skeleton (for focused analytics tabs)
export const SingleTabSkeleton: React.FC = () => (
  <Grid container spacing={2}>
    <Grid item xs={12}>
      <ChartWidgetSkeleton height={400} />
    </Grid>
  </Grid>
);

// Dual Tab Skeleton (for system health tab)
export const DualTabSkeleton: React.FC = () => (
  <Grid container spacing={2}>
    <Grid item xs={12} md={6}>
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          height: '100%',
          bgcolor: 'white',
          borderRadius: 2,
          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px'
        }}
      >
        <SystemHealthSkeleton />
      </Paper>
    </Grid>
    <Grid item xs={12} md={6}>
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          height: '100%',
          bgcolor: 'white',
          borderRadius: 2,
          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px'
        }}
      >
        <ActivityFeedSkeleton />
      </Paper>
    </Grid>
  </Grid>
);

export default {
  KPICardSkeleton,
  ChartWidgetSkeleton,
  SystemHealthSkeleton,
  ActivityFeedSkeleton,
  OverviewTabSkeleton,
  SingleTabSkeleton,
  DualTabSkeleton
};
