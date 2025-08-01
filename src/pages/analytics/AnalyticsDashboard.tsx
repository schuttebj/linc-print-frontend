/**
 * Analytics Dashboard for Madagascar License System
 * Comprehensive statistics and insights dashboard
 */

import React, { useState } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Stack,
  Divider
} from '@mui/material';
import {
  DateRange as DateRangeIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';

// Import our custom components
import KPICard from './components/KPICard';
import ChartWidget from './components/ChartWidget';
import ApplicationAnalytics from './components/ApplicationAnalytics';
import LicenseAnalytics from './components/LicenseAnalytics';
import PrintingAnalytics from './components/PrintingAnalytics';
import FinancialAnalytics from './components/FinancialAnalytics';
import ActivityFeed from './components/ActivityFeed';
import SystemHealthCards from './components/SystemHealthCards';

// Import hooks
import { useAnalyticsData } from './hooks/useAnalyticsData';
import { useChartFilters } from './hooks/useChartFilters';

const AnalyticsDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState('30days');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Custom hooks for data and filters
  const { data, loading, refreshData } = useAnalyticsData(dateRange, selectedLocation);
  const { applyFilters, clearFilters } = useChartFilters();

  // KPI data
  const kpiMetrics = [
    {
      title: "Total Applications",
      value: "2,847",
      change: "+12.5%",
      period: "This Month",
      icon: "Assignment",
      color: "primary" as const,
      trend: "up" as const
    },
    {
      title: "Active Licenses", 
      value: "45,632",
      change: "+8.2%",
      period: "This Month",
      icon: "Badge",
      color: "success" as const,
      trend: "up" as const
    },
    {
      title: "Cards Printed",
      value: "1,523",
      change: "+15.7%", 
      period: "This Month",
      icon: "Print",
      color: "info" as const,
      trend: "up" as const
    },
    {
      title: "Revenue Generated",
      value: "₨ 89,456",
      change: "+18.3%",
      period: "This Month", 
      icon: "AttachMoney",
      color: "warning" as const,
      trend: "up" as const
    }
  ];

  const handleDateRangeChange = (event: any) => {
    setDateRange(event.target.value);
  };

  const handleLocationChange = (event: any) => {
    setSelectedLocation(event.target.value);
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Exporting dashboard data...');
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          Analytics Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Comprehensive insights into Madagascar Driver's License System performance
        </Typography>
      </Box>

      {/* Filters and Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Date Range</InputLabel>
            <Select
              value={dateRange}
              onChange={handleDateRangeChange}
              label="Date Range"
              startAdornment={<DateRangeIcon sx={{ mr: 1, color: 'action.active' }} />}
            >
              <MenuItem value="7days">Last 7 days</MenuItem>
              <MenuItem value="30days">Last 30 days</MenuItem>
              <MenuItem value="90days">Last 90 days</MenuItem>
              <MenuItem value="6months">Last 6 months</MenuItem>
              <MenuItem value="1year">Last year</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Location</InputLabel>
            <Select
              value={selectedLocation}
              onChange={handleLocationChange}
              label="Location"
            >
              <MenuItem value="all">All Locations</MenuItem>
              <MenuItem value="antananarivo">Antananarivo</MenuItem>
              <MenuItem value="toamasina">Toamasina</MenuItem>
              <MenuItem value="antsirabe">Antsirabe</MenuItem>
              <MenuItem value="mahajanga">Mahajanga</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ flexGrow: 1 }} />

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={refreshData}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
            >
              Export
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* KPI Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {kpiMetrics.map((metric, index) => (
          <Grid item xs={12} sm={6} lg={3} key={index}>
            <KPICard {...metric} />
          </Grid>
        ))}
      </Grid>

      {/* Main Analytics Grid */}
      <Grid container spacing={3}>
        {/* Row 1: Application Trends & Distribution */}
        <Grid item xs={12} lg={8}>
          <ApplicationAnalytics dateRange={dateRange} location={selectedLocation} />
        </Grid>
        <Grid item xs={12} lg={4}>
          <SystemHealthCards />
        </Grid>

        {/* Row 2: License Analytics & Printing */}
        <Grid item xs={12} lg={6}>
          <LicenseAnalytics dateRange={dateRange} location={selectedLocation} />
        </Grid>
        <Grid item xs={12} lg={6}>
          <PrintingAnalytics dateRange={dateRange} location={selectedLocation} />
        </Grid>

        {/* Row 3: Financial Analytics & Activity */}
        <Grid item xs={12} lg={8}>
          <FinancialAnalytics dateRange={dateRange} location={selectedLocation} />
        </Grid>
        <Grid item xs={12} lg={4}>
          <ActivityFeed />
        </Grid>
      </Grid>

      {/* Auto-refresh indicator */}
      {autoRefresh && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            bgcolor: 'success.main',
            color: 'white',
            px: 2,
            py: 1,
            borderRadius: 1,
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <RefreshIcon sx={{ fontSize: 16 }} />
          Auto-refresh: ON
        </Box>
      )}
    </Container>
  );
};

export default AnalyticsDashboard;