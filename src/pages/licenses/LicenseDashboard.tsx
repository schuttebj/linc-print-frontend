/**
 * License Dashboard Page
 * 
 * Overview page for license management with statistics, recent activity, and quick actions
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Paper,
  Stack
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TrendingUp,
  Warning,
  CheckCircle,
  Cancel,
  Pause,
  CreditCard,
  Search,
  Add,
  Refresh,
  PersonSearch,
  Assessment,
  Visibility,
  Schedule,
  LocationOn
} from '@mui/icons-material';

import { licenseService, LicenseStatistics, License } from '../../services/licenseService';

const LicenseDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<LicenseStatistics | null>(null);
  const [recentLicenses, setRecentLicenses] = useState<License[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load statistics
      const stats = await licenseService.getLicenseStatistics();
      setStatistics(stats);

      // Load recent licenses (first 5 from search)
      const recentResults = await licenseService.searchLicenses({
        page: 1,
        size: 5
      });
      setRecentLicenses(recentResults.licenses);

    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'SUSPENDED':
        return 'warning';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    color: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
    subtitle?: string;
  }> = ({ title, value, icon, color, subtitle }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" component="div" color={`${color}.main`}>
              {value.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ color: `${color}.main` }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button 
          variant="contained" 
          onClick={loadDashboardData}
          startIcon={<Refresh />}
        >
          Retry
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            License Management Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Overview of license statistics and recent activity
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadDashboardData}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Visibility />}
            onClick={() => navigate('/dashboard/licenses/list')}
          >
            View All Licenses
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Licenses"
            value={statistics?.total_licenses || 0}
            icon={<CreditCard />}
            color="primary"
            subtitle="All licenses in system"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Licenses"
            value={statistics?.active_licenses || 0}
            icon={<CheckCircle />}
            color="success"
            subtitle="Currently valid"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Suspended Licenses"
            value={statistics?.suspended_licenses || 0}
            icon={<Pause />}
            color="warning"
            subtitle="Temporarily disabled"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Cancelled Licenses"
            value={statistics?.cancelled_licenses || 0}
            icon={<Cancel />}
            color="error"
            subtitle="Permanently disabled"
          />
        </Grid>
      </Grid>

      {/* Activity Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Issued This Month"
            value={statistics?.issued_this_month || 0}
            icon={<TrendingUp />}
            color="primary"
            subtitle="New licenses"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Issued This Year"
            value={statistics?.issued_this_year || 0}
            icon={<Assessment />}
            color="secondary"
            subtitle="Total this year"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Cards Pending Collection"
            value={statistics?.cards_pending_collection || 0}
            icon={<Schedule />}
            color="warning"
            subtitle="Ready for pickup"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Cards Near Expiry"
            value={statistics?.cards_near_expiry || 0}
            icon={<Warning />}
            color="error"
            subtitle="Expiring soon"
          />
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Recent Licenses */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Recent Licenses</Typography>
                <Button
                  size="small"
                  onClick={() => navigate('/dashboard/licenses/list')}
                  endIcon={<Visibility />}
                >
                  View All
                </Button>
              </Box>
              {recentLicenses.length > 0 ? (
                <List>
                  {recentLicenses.map((license, index) => (
                    <React.Fragment key={license.id}>
                      <ListItem>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body1">
                                {license.license_number}
                              </Typography>
                              <Chip
                                label={license.status}
                                size="small"
                                color={getStatusColor(license.status) as any}
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Category: {license.category}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Issued: {new Date(license.issue_date).toLocaleDateString()}
                              </Typography>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Tooltip title="View License Details">
                            <IconButton
                              edge="end"
                              onClick={() => navigate(`/dashboard/licenses/${license.id}`)}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < recentLicenses.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No recent licenses found
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Stack spacing={1}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Search />}
                  onClick={() => navigate('/dashboard/licenses/list')}
                >
                  Search Licenses
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<PersonSearch />}
                  onClick={() => navigate('/dashboard/persons/search')}
                >
                  Find Person
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Add />}
                  onClick={() => navigate('/dashboard/applications/create')}
                >
                  New Application
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Assessment />}
                  onClick={() => navigate('/dashboard/applications')}
                >
                  View Applications
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* License Categories */}
          {statistics?.by_category && Object.keys(statistics.by_category).length > 0 && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  By Category
                </Typography>
                <List dense>
                  {Object.entries(statistics.by_category).map(([category, count]) => (
                    <ListItem key={category}>
                      <ListItemText
                        primary={`Category ${category}`}
                        secondary={`${count} licenses`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default LicenseDashboard; 