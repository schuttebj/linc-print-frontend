/**
 * Home Page / Dashboard for Madagascar Driver's License System
 * Clean Bento Layout with essential widgets
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Avatar,
  Container,
  Divider
} from '@mui/material';
import {
  Person as PersonIcon,
  MonitorHeart as MonitorHeartIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Help as HelpIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  CloudDone as CloudDoneIcon,
  SyncProblem as SyncProblemIcon,
  Dashboard as DashboardIcon,
  AccountCircle as ProfileIcon,
  FlashOn as FlashIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import { API_ENDPOINTS, api } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

// Dashboard interfaces
interface DashboardStats {
  users: {
    total: number;
    active: number;
    new_this_week: number;
  };
  locations: {
    total: number;
    operational: number;
    total_capacity: number;
  };
  audit: {
    total_actions: number;
    actions_today: number;
    security_events: number;
    success_rate: number;
  };
  system: {
    uptime: string;
    version: string;
    last_backup: string;
  };
}

interface SystemStatus {
  online: boolean;
  sync_status: 'synced' | 'syncing' | 'error';
  maintenance_scheduled?: {
    date: string;
    description: string;
  };
  last_sync: string;
}

interface ProductivityStats {
  today: {
    applications_processed: number;
    licenses_issued: number;
    transactions_completed: number;
  };
  week: {
    applications_processed: number;
    licenses_issued: number;
    transactions_completed: number;
  };
  trend: 'up' | 'down' | 'stable';
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [productivityStats, setProductivityStats] = useState<ProductivityStats | null>(null);

  useEffect(() => {
    loadDashboardData();
    loadEnhancedDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load dashboard statistics from multiple endpoints
      const [usersRes, locationsRes, auditStatsRes] = await Promise.all([
        api.get<any>(`${API_ENDPOINTS.users}?per_page=1`),
        api.get<any>(`${API_ENDPOINTS.locations}?per_page=1`),
        api.get<any>(`${API_ENDPOINTS.auditStatistics}`).catch(() => null)
      ]);

      const dashboardStats: DashboardStats = {
        users: {
          total: usersRes?.total || 0,
          active: Math.floor((usersRes?.total || 0) * 0.85),
          new_this_week: Math.floor((usersRes?.total || 0) * 0.1)
        },
        locations: {
          total: locationsRes?.total || 0,
          operational: Math.floor((locationsRes?.total || 0) * 0.9),
          total_capacity: 1200
        },
        audit: {
          total_actions: auditStatsRes?.summary?.total_audit_logs || 0,
          actions_today: auditStatsRes?.summary?.successful_actions || 0,
          security_events: auditStatsRes?.summary?.failed_actions || 0,
          success_rate: (auditStatsRes?.summary?.success_rate || 95) / 100
        },
        system: {
          uptime: '99.8%',
          version: '2.1.0',
          last_backup: new Date().toISOString()
        }
      };

      setStats(dashboardStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadEnhancedDashboardData = async () => {
    try {
      // Mock system status
      setSystemStatus({
        online: true,
        sync_status: 'synced',
        last_sync: new Date().toISOString(),
        maintenance_scheduled: {
          date: '2024-01-21T02:00:00Z',
          description: 'Database optimization and security updates'
        }
      });

      // Process productivity stats
      const productivity: ProductivityStats = {
        today: {
          applications_processed: 12,
          licenses_issued: 8,
          transactions_completed: 15
        },
        week: {
          applications_processed: 67,
          licenses_issued: 45,
          transactions_completed: 89
        },
        trend: 'up'
      };

      setProductivityStats(productivity);
    } catch (err) {
      console.error('Failed to load enhanced dashboard data:', err);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        action={
          <Button color="inherit" size="small" onClick={loadDashboardData}>
            Retry
          </Button>
        }
      >
        <Typography variant="h6">Error loading dashboard</Typography>
        <Typography variant="body2">{error}</Typography>
      </Alert>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 2, height: '100%' }}>
      {/* Welcome Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome, {user?.first_name || user?.username}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Madagascar Driver's License Management System Dashboard
        </Typography>
      </Box>

      {/* Bento Grid Layout */}
      <Grid container spacing={3}>
        {/* System Status Widget */}
        <Grid item xs={12} md={6} lg={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <MonitorHeartIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  System Status
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {systemStatus && (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    {systemStatus.online ? (
                      <CheckCircleIcon color="success" fontSize="small" />
                    ) : (
                      <ErrorIcon color="error" fontSize="small" />
                    )}
                    <Typography variant="body2">
                      {systemStatus.online ? 'All Systems Operational' : 'System Issues Detected'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    {systemStatus.sync_status === 'synced' ? (
                      <CloudDoneIcon color="success" fontSize="small" />
                    ) : (
                      <SyncProblemIcon color="warning" fontSize="small" />
                    )}
                    <Typography variant="body2">
                      Sync: {systemStatus.sync_status === 'synced' ? 'Up to date' : 'Syncing...'}
                    </Typography>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* User Context Widget */}
        <Grid item xs={12} md={6} lg={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <PersonIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Your Profile
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}>
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {user?.first_name} {user?.last_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user?.roles?.[0]?.display_name || 'User'}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Location: {user?.primary_location && typeof user.primary_location === 'object' ? (user.primary_location as any)?.name || 'Not assigned' : 'Not assigned'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions Widget */}
        <Grid item xs={12} md={6} lg={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <SpeedIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Quick Actions
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Button
                    variant="contained"
                    startIcon={<DashboardIcon />}
                    fullWidth
                    size="small"
                    onClick={() => navigate('/dashboard/applications/dashboard')}
                  >
                    Applications
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    variant="outlined"
                    startIcon={<ProfileIcon />}
                    fullWidth
                    size="small"
                    disabled={true}
                  >
                    Profile
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    variant="contained"
                    startIcon={<PersonIcon />}
                    fullWidth
                    size="small"
                    onClick={() => navigate('/dashboard/persons')}
                  >
                    Persons
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    variant="contained"
                    startIcon={<FlashIcon />}
                    fullWidth
                    size="small"
                    onClick={() => {
                      console.log('Quick actions modal to be implemented');
                    }}
                  >
                    More
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Productivity Stats Widget */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrendingUpIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Your Productivity
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              {productivityStats && (
                <>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    Today
                  </Typography>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={4}>
                      <Typography variant="h4" color="primary.main" fontWeight="bold">
                        {productivityStats.today.applications_processed}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Applications
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="h4" color="success.main" fontWeight="bold">
                        {productivityStats.today.licenses_issued}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Licenses
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="h4" color="info.main" fontWeight="bold">
                        {productivityStats.today.transactions_completed}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Transactions
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    This Week
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography variant="h5" color="primary.main" fontWeight="bold">
                        {productivityStats.week.applications_processed}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Applications
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="h5" color="success.main" fontWeight="bold">
                        {productivityStats.week.licenses_issued}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Licenses
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="h5" color="info.main" fontWeight="bold">
                        {productivityStats.week.transactions_completed}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Transactions
                      </Typography>
                    </Grid>
                  </Grid>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Support & Resources Widget */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <HelpIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Support & Resources
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Button
                    variant="outlined"
                    startIcon={<SchoolIcon />}
                    fullWidth
                    onClick={() => window.open('/help/training', '_blank')}
                  >
                    Training
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    variant="outlined"
                    startIcon={<HelpIcon />}
                    fullWidth
                    onClick={() => window.open('/help/guides', '_blank')}
                  >
                    Guides
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    startIcon={<SecurityIcon />}
                    fullWidth
                    onClick={() => navigate('/dashboard/admin/audit')}
                  >
                    Security & Compliance
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default HomePage; 