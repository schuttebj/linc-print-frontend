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
  Divider,
  Chip,
  Badge,
  IconButton,
  Stack,
  Skeleton
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
  School as SchoolIcon,
  Notifications as NotificationsIcon,
  Close as CloseIcon
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

interface Announcement {
  id: string;
  title: string;
  message: string;
  category: 'Fraud' | 'Policy Update' | 'System Maintenance' | 'General';
  severity: 'info' | 'warning' | 'error' | 'success';
  date: string;
  dismissed?: boolean;
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
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<Set<string>>(new Set());
  const [announcementFilter, setAnnouncementFilter] = useState<string>('all');

  useEffect(() => {
    loadDashboardData();
    loadEnhancedDashboardData();
    
    // Load dismissed announcements from localStorage
    const dismissed = localStorage.getItem('dismissed_announcements');
    if (dismissed) {
      setDismissedAnnouncements(new Set(JSON.parse(dismissed)));
    }
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
      // Mock announcements
      const mockAnnouncements: Announcement[] = [
        {
          id: '1',
          title: 'System Maintenance Scheduled',
          message: 'Scheduled maintenance on Sunday, 2AM-4AM. Expect brief service interruptions.',
          category: 'System Maintenance',
          severity: 'warning',
          date: new Date().toISOString()
        },
        {
          id: '2',
          title: 'New Fraud Detection Rules',
          message: 'Updated fraud detection algorithms are now active. Review flagged applications carefully.',
          category: 'Fraud',
          severity: 'info',
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          title: 'License Issuance Policy Update',
          message: 'New regulations for license category B effective immediately. Check the updated guidelines.',
          category: 'Policy Update',
          severity: 'success',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      setAnnouncements(mockAnnouncements);

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

  const dismissAnnouncement = (announcementId: string) => {
    const newDismissed = new Set(dismissedAnnouncements);
    newDismissed.add(announcementId);
    setDismissedAnnouncements(newDismissed);
    localStorage.setItem('dismissed_announcements', JSON.stringify([...newDismissed]));
  };

  const filteredAnnouncements = announcements.filter(announcement => {
    if (dismissedAnnouncements.has(announcement.id)) return false;
    if (announcementFilter === 'all') return true;
    return announcement.category === announcementFilter;
  });

  // Remove the global loading check - we'll use skeleton loading in each widget instead

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
    <Box sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Container maxWidth="lg" sx={{ flex: 1, display: 'flex', flexDirection: 'column', py: 2, width: '100%', height: '100%' }}>
        {/* Welcome Header */}
        <Box sx={{ mb: 3, flexShrink: 0 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome, {user?.first_name || user?.username}!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Madagascar Driver's License Management System Dashboard
          </Typography>
        </Box>

        {/* Bento Grid Layout */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minHeight: 0 }}>
        {/* Row 1: Announcements (Large), System Status (Medium), User Profile (Medium) */}
        <Box sx={{ flex: '1 1 55%', display: 'flex', gap: 3, minHeight: 0, width: '100%' }}>
          {/* Announcements Widget - Left Half */}
          <Box sx={{ flex: '1 1 50%', minHeight: 0, maxWidth: '50%', overflow: 'hidden' }}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ pb: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NotificationsIcon color="primary" />
                    <Typography variant="h6" fontWeight={600}>
                      Announcements & Alerts
                    </Typography>
                    <Badge badgeContent={filteredAnnouncements.length} color="error" />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {['all', 'Fraud', 'Policy Update', 'System Maintenance'].map((filter) => (
                      <Chip
                        key={filter}
                        label={filter === 'all' ? 'All' : filter}
                        variant={announcementFilter === filter ? 'filled' : 'outlined'}
                        size="small"
                        onClick={() => setAnnouncementFilter(filter)}
                        sx={{ fontSize: '0.7rem' }}
                      />
                    ))}
                  </Box>
                </Box>
                <Divider />
              </CardContent>
              <CardContent sx={{ flex: 1, overflow: 'auto', pt: 2 }}>
                {loading ? (
                  <Stack spacing={2}>
                    {Array.from({ length: 2 }).map((_, index) => (
                      <Box key={index} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1 }} />
                        <Skeleton variant="text" width="100%" height={16} sx={{ mb: 1 }} />
                        <Skeleton variant="text" width="80%" height={16} />
                      </Box>
                    ))}
                  </Stack>
                ) : filteredAnnouncements.length === 0 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
                    <Typography variant="body2">No announcements to display</Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {filteredAnnouncements.map((announcement) => (
                      <Alert
                        key={announcement.id}
                        severity={announcement.severity}
                        action={
                          <IconButton
                            size="small"
                            onClick={() => dismissAnnouncement(announcement.id)}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        }
                        sx={{ fontSize: '0.85rem' }}
                      >
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                            {announcement.title}
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            {announcement.message}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Chip label={announcement.category} size="small" sx={{ fontSize: '0.65rem' }} />
                            <Typography variant="caption" color="text.secondary">
                              {new Date(announcement.date).toLocaleDateString()}
                  </Typography>
                          </Box>
                        </Box>
                      </Alert>
                    ))}
                </Stack>
                )}
              </CardContent>
            </Card>
          </Box>

          {/* Right Half - System Status and User Profile */}
          <Box sx={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', gap: 3, minHeight: 0, maxWidth: '50%', overflow: 'hidden' }}>
            {/* System Status Widget */}
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <MonitorHeartIcon color="primary" />
                    <Typography variant="h6" fontWeight={600}>
                      System Status
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  {loading ? (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Skeleton variant="circular" width={20} height={20} />
                        <Skeleton variant="text" width="80%" height={20} />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Skeleton variant="circular" width={20} height={20} />
                        <Skeleton variant="text" width="70%" height={20} />
                      </Box>
                    </Box>
                  ) : systemStatus && (
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
            </Box>

            {/* User Profile Widget */}
            <Box sx={{ flex: '0 0 auto' }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <PersonIcon color="primary" />
                    <Typography variant="h6" fontWeight={600}>
                      Your Profile
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  {loading ? (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Skeleton variant="circular" width={48} height={48} />
                        <Box>
                          <Skeleton variant="text" width={120} height={24} sx={{ mb: 0.5 }} />
                          <Skeleton variant="text" width={80} height={20} />
                        </Box>
                      </Box>
                      <Skeleton variant="text" width="90%" height={16} sx={{ mb: 1 }} />
                      <Skeleton variant="text" width="70%" height={14} />
                    </Box>
                  ) : (
                    <>
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
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Location: {user?.primary_location && typeof user.primary_location === 'object' ? (user.primary_location as any)?.name || 'Not assigned' : 'Not assigned'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Last login: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                      </Typography>
                    </>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Box>

        {/* Row 2: Quick Actions, Productivity, Support */}
        <Box sx={{ flex: '1 1 45%', display: 'flex', gap: 3, minHeight: 0, width: '100%' }}>
          {/* Quick Actions Widget */}
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <SpeedIcon color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Quick Actions
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                {loading ? (
                  <Grid container spacing={2}>
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Grid item xs={6} key={index}>
                        <Skeleton variant="rounded" width="100%" height={32} />
                      </Grid>
                    ))}
                  </Grid>
                ) : (
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
                )}
              </CardContent>
            </Card>
          </Box>

          {/* Productivity Stats Widget */}
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ pb: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <TrendingUpIcon color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Your Productivity
                  </Typography>
                </Box>
                <Divider sx={{ mb: 1.5 }} />
              </CardContent>
              <CardContent sx={{ flex: 1, pt: 0, pb: 1, overflow: 'auto' }}>
                {loading ? (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                      Today
                    </Typography>
                    <Grid container spacing={1} sx={{ mb: 2 }}>
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Grid item xs={4} key={index}>
                          <Skeleton variant="text" width="100%" height={32} />
                          <Skeleton variant="text" width="60%" height={16} />
                        </Grid>
                      ))}
                    </Grid>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                      This Week
                    </Typography>
                    <Grid container spacing={1}>
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Grid item xs={4} key={index}>
                          <Skeleton variant="text" width="100%" height={24} />
                          <Skeleton variant="text" width="60%" height={14} />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                ) : productivityStats && (
                  <>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                      Today
                    </Typography>
                    <Grid container spacing={1} sx={{ mb: 0.5 }}>
                      <Grid item xs={4}>
                        <Typography variant="h6" color="primary.main" fontWeight="bold">
                          {productivityStats.today.applications_processed}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          Apps
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="h6" color="success.main" fontWeight="bold">
                          {productivityStats.today.licenses_issued}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          Licenses
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="h6" color="info.main" fontWeight="bold">
                          {productivityStats.today.transactions_completed}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          Trans
                        </Typography>
                      </Grid>
                    </Grid>
                    
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                      This Week
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="primary.main" fontWeight="bold">
                          {productivityStats.week.applications_processed}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          Apps
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="success.main" fontWeight="bold">
                          {productivityStats.week.licenses_issued}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          Licenses
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="info.main" fontWeight="bold">
                          {productivityStats.week.transactions_completed}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                          Trans
                        </Typography>
                      </Grid>
                    </Grid>
                  </>
                )}
              </CardContent>
            </Card>
          </Box>

          {/* Support & Resources Widget */}
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <HelpIcon color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Support & Resources
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                {loading ? (
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Skeleton variant="rounded" width="100%" height={32} />
                    </Grid>
                    <Grid item xs={6}>
                      <Skeleton variant="rounded" width="100%" height={32} />
                    </Grid>
                    <Grid item xs={12}>
                      <Skeleton variant="rounded" width="100%" height={32} />
                    </Grid>
                  </Grid>
                ) : (
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Button
                        variant="outlined"
                        startIcon={<SchoolIcon />}
                        fullWidth
                        size="small"
                        onClick={() => window.open('/help/training', '_blank')}
                      >
                        Training
                      </Button>
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        variant="outlined"
                        startIcon={<HelpIcon />}
                        fullWidth
                        size="small"
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
                        size="small"
                        onClick={() => navigate('/dashboard/admin/audit')}
                      >
                        Security & Compliance
                      </Button>
                    </Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default HomePage; 