/**
 * Analytics Dashboard for Madagascar License System
 * Comprehensive statistics and insights dashboard with tabs and filtering
 */

import React, { useState } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  Button,
  Stack
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  Badge as BadgeIcon,
  Print as PrintIcon,
  AttachMoney as AttachMoneyIcon,
  Computer as ComputerIcon,
  Api as ApiIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

// Import components
import FilterBar, { FilterConfig, FilterValues } from '../../components/common/FilterBar';
import KPICard from './components/KPICard';
import ChartWidget from './components/ChartWidget';
import ApplicationAnalytics from './components/ApplicationAnalytics';
import LicenseAnalytics from './components/LicenseAnalytics';
import PrintingAnalytics from './components/PrintingAnalytics';
import FinancialAnalytics from './components/FinancialAnalytics';
import ActivityFeed from './components/ActivityFeed';
import SystemHealthCards from './components/SystemHealthCards';
import ApiAnalytics from './components/ApiAnalytics';
import {
  OverviewTabSkeleton,
  SingleTabSkeleton,
  DualTabSkeleton
} from './components/AnalyticsSkeleton';

// Import hooks
import { useAnalyticsData } from './hooks/useAnalyticsData';
import { useChartFilters } from './hooks/useChartFilters';

const AnalyticsDashboard: React.FC = () => {
  // Tab management
  const [activeTab, setActiveTab] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // FilterBar state management
  const [searchValue, setSearchValue] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValues>({
    dateRange: '30days',
    location: 'all',
    refreshInterval: '30s'
  });

  // Custom hooks for data and filters
  const { data, loading, refreshData } = useAnalyticsData(
    filterValues.dateRange || '30days', 
    filterValues.location || 'all'
  );
  const { applyFilters, clearFilters } = useChartFilters();

  // Analytics filter configuration
  const ANALYTICS_FILTER_CONFIGS: FilterConfig[] = [
    {
      key: 'dateRange',
      label: 'Date Range',
      type: 'select',
      options: [
        { value: '7days', label: 'Last 7 days' },
        { value: '30days', label: 'Last 30 days' },
        { value: '90days', label: 'Last 90 days' },
        { value: '6months', label: 'Last 6 months' },
        { value: '1year', label: 'Last year' }
      ]
    },
    {
      key: 'location',
      label: 'Location',
      type: 'select',
      options: [
        { value: 'all', label: 'All Locations' },
        { value: 'antananarivo', label: 'Antananarivo' },
        { value: 'toamasina', label: 'Toamasina' },
        { value: 'antsirabe', label: 'Antsirabe' },
        { value: 'mahajanga', label: 'Mahajanga' }
      ]
    },
    {
      key: 'refreshInterval',
      label: 'Auto Refresh',
      type: 'select',
      options: [
        { value: '15s', label: 'Every 15 seconds' },
        { value: '30s', label: 'Every 30 seconds' },
        { value: '60s', label: 'Every minute' },
        { value: 'off', label: 'Off' }
      ]
    },
    {
      key: 'chartType',
      label: 'Chart Style',
      type: 'select',
      options: [
        { value: 'detailed', label: 'Detailed Charts' },
        { value: 'compact', label: 'Compact Charts' }
      ]
    }
  ];

  // Tab configuration
  const tabs = [
    { label: 'Overview', icon: <DashboardIcon /> },
    { label: 'Applications', icon: <AssignmentIcon /> },
    { label: 'Licenses', icon: <BadgeIcon /> },
    { label: 'Financial', icon: <AttachMoneyIcon /> },
    { label: 'Printing', icon: <PrintIcon /> },
    { label: 'System Health', icon: <ComputerIcon /> },
    { label: 'API Analytics', icon: <ApiIcon /> }
  ];

  // Sample KPI data (will be replaced with live data)
  const getKPIData = () => {
    const dateRange = filterValues.dateRange || '30days';
    const location = filterValues.location || 'all';
    
    // Mock data generation based on filters
    const multiplier = location === 'all' ? 1 : 0.3;
    const timeMultiplier = dateRange === '7days' ? 0.25 : dateRange === '90days' ? 3 : 1;
    
    return [
      {
        title: "Total Applications",
        value: Math.floor(2847 * multiplier * timeMultiplier).toLocaleString(),
        change: "+12.5%",
        period: getPeriodLabel(dateRange),
        icon: "Assignment",
        color: "primary" as const,
        trend: "up" as const
      },
      {
        title: "Active Licenses",
        value: Math.floor(45632 * multiplier * timeMultiplier).toLocaleString(),
        change: "+8.2%",
        period: getPeriodLabel(dateRange),
        icon: "Badge",
        color: "success" as const,
        trend: "up" as const
      },
      {
        title: "Cards Printed",
        value: Math.floor(1523 * multiplier * timeMultiplier).toLocaleString(),
        change: "+15.7%",
        period: getPeriodLabel(dateRange),
        icon: "Print",
        color: "info" as const,
        trend: "up" as const
      },
      {
        title: "Revenue Generated",
        value: `₨ ${Math.floor(89456 * multiplier * timeMultiplier).toLocaleString()}`,
        change: "+18.3%",
        period: getPeriodLabel(dateRange),
        icon: "AttachMoney",
        color: "warning" as const,
        trend: "up" as const
      }
    ];
  };

  const getPeriodLabel = (range: string) => {
    switch (range) {
      case '7days': return 'Last 7 Days';
      case '30days': return 'This Month';
      case '90days': return 'Last 3 Months';
      case '6months': return 'Last 6 Months';
      case '1year': return 'This Year';
      default: return 'This Month';
    }
  };

  // Handler functions
  const handleFilterChange = (key: string, value: any) => {
    setFilterValues(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSearch = () => {
    // Trigger data refresh with current filters
    refreshData();
  };

  const handleClear = () => {
    setSearchValue('');
    setFilterValues({
      dateRange: '30days',
      location: 'all',
      refreshInterval: '30s'
    });
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Exporting dashboard data for tab:', tabs[activeTab].label);
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    // Show skeleton loading while data is being fetched
    if (loading) {
      switch (activeTab) {
        case 0: // Overview
          return <OverviewTabSkeleton />;
        case 5: // System Health (has dual layout)
          return <DualTabSkeleton />;
        default: // All other single-chart tabs
          return <SingleTabSkeleton />;
      }
    }

    const kpiData = getKPIData();
    const dateRange = filterValues.dateRange || '30days';
    const location = filterValues.location || 'all';

    switch (activeTab) {
      case 0: // Overview
        return (
          <Grid container spacing={2}>
            {/* Overview KPI Cards */}
            <Grid item xs={12}>
              <Grid container spacing={2}>
                {kpiData.map((metric, index) => (
                  <Grid item xs={12} sm={6} lg={3} key={index}>
                    <KPICard {...metric} />
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* Overview Charts - Compact Layout */}
            <Grid item xs={12} md={8}>
              <ApplicationAnalytics dateRange={dateRange} location={location} />
            </Grid>
            <Grid item xs={12} md={4}>
              <SystemHealthCards />
            </Grid>

            <Grid item xs={12} md={6}>
              <LicenseAnalytics dateRange={dateRange} location={location} />
            </Grid>
            <Grid item xs={12} md={6}>
              <ActivityFeed />
            </Grid>
          </Grid>
        );

      case 1: // Applications
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <ApplicationAnalytics dateRange={dateRange} location={location} />
            </Grid>
          </Grid>
        );

      case 2: // Licenses  
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <LicenseAnalytics dateRange={dateRange} location={location} />
            </Grid>
          </Grid>
        );

      case 3: // Financial
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FinancialAnalytics dateRange={dateRange} location={location} />
            </Grid>
          </Grid>
        );

      case 4: // Printing
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <PrintingAnalytics dateRange={dateRange} location={location} />
            </Grid>
          </Grid>
        );

      case 5: // System Health
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <SystemHealthCards />
            </Grid>
            <Grid item xs={12} md={6}>
              <ActivityFeed />
            </Grid>
          </Grid>
        );

      case 6: // API Analytics
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <ApiAnalytics dateRange={dateRange} location={location} />
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Container
      maxWidth="lg"
      sx={{ py: 1, height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}
    >
      <Paper
        elevation={0}
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#f8f9fa',
          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        {/* Header with FilterBar */}
        <Box sx={{ 
          bgcolor: 'white', 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          flexShrink: 0,
          p: 2
        }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
              Analytics Dashboard
            </Typography>
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
                variant="contained" 
                size="small"
                startIcon={<DownloadIcon />} 
                onClick={handleExport}
              >
                Export
              </Button>
            </Stack>
          </Box>
          
          <FilterBar
            searchValue={searchValue}
            searchPlaceholder="Search analytics data..."
            onSearchChange={setSearchValue}
            filterConfigs={ANALYTICS_FILTER_CONFIGS}
            filterValues={filterValues}
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
            onClear={handleClear}
            searching={loading}
          />
        </Box>

        {/* Tabs Section */}
        <Box sx={{ 
          bgcolor: 'white', 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          flexShrink: 0 
        }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                minHeight: 48,
                textTransform: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
                '&.Mui-selected': {
                  fontWeight: 600
                }
              }
            }}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {tab.icon}
                    {tab.label}
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'auto',
          p: 2,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Box sx={{ flex: 1 }}>
            {renderTabContent()}
          </Box>

          {/* Auto-refresh indicator */}
          {autoRefresh && filterValues.refreshInterval !== 'off' && (
            <Box sx={{ 
              mt: 2, 
              alignSelf: 'flex-start',
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 1, 
              px: 1, 
              py: 0.5, 
              bgcolor: 'success.light', 
              color: 'success.contrastText', 
              borderRadius: 1, 
              fontSize: '0.75rem' 
            }}>
              <RefreshIcon sx={{ fontSize: 16 }} />
              Auto-refresh: {filterValues.refreshInterval || '30s'}
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default AnalyticsDashboard;