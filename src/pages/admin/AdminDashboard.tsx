/**
 * Admin Dashboard for Madagascar LINC Print System
 * Modern Bento Layout with comprehensive widgets for system administration
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
  Chip,
  Paper,
  Avatar,
  IconButton,
  Badge,
  Tooltip,
  Container,
  Divider,
  LinearProgress,
  Stack
} from '@mui/material';
import {
  Person as PersonIcon,
  Business as BusinessIcon,
  Assessment as AssessmentIcon,
  MonitorHeart as MonitorHeartIcon,
  Notifications as NotificationsIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Help as HelpIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  PushPin as PushPinIcon,
  PlayArrow as PlayArrowIcon,
  AdminPanelSettings as AdminIcon,
  Dashboard as DashboardIcon,
  Search as SearchIcon,
  Add as AddIcon,
  History as HistoryIcon,
  School as SchoolIcon,
  VerifiedUser as VerifiedUserIcon,
  CloudDone as CloudDoneIcon,
  SyncProblem as SyncProblemIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { API_ENDPOINTS, api } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';

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

interface UserActivity {
  id: string;
  action: string;
  resource: string;
  timestamp: string;
  description: string;
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
  last_actions: UserActivity[];
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  color: 'primary' | 'secondary' | 'success' | 'warning';
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // New state for enhanced widgets
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [productivityStats, setProductivityStats] = useState<ProductivityStats | null>(null);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<Set<string>>(new Set());
  const [pinnedActions, setPinnedActions] = useState<Set<string>>(new Set());
  const [announcementFilter, setAnnouncementFilter] = useState<string>('all');

  useEffect(() => {
    loadDashboardData();
    loadEnhancedDashboardData();
    
    // Load dismissed announcements from localStorage
    const dismissed = localStorage.getItem('dismissed_announcements');
    if (dismissed) {
      setDismissedAnnouncements(new Set(JSON.parse(dismissed)));
    }
    
    // Load pinned actions from localStorage
    const pinned = localStorage.getItem('pinned_actions');
    if (pinned) {
      setPinnedActions(new Set(JSON.parse(pinned)));
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

      // Mock some data for demonstration (in real app, these would come from specific endpoints)
      const dashboardStats: DashboardStats = {
        users: {
          total: usersRes?.total || 0,
          active: Math.floor((usersRes?.total || 0) * 0.85),
          new_this_week: Math.floor((usersRes?.total || 0) * 0.1)
        },
        locations: {
          total: locationsRes?.total || 0,
          operational: Math.floor((locationsRes?.total || 0) * 0.9),
          total_capacity: 1200 // This would come from locations endpoint
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
      // Load productivity stats and recent activity
      const [appStats, userActivity] = await Promise.all([
        api.get<any>(`${API_ENDPOINTS.applicationStatistics}`).catch(() => null),
        api.get<any>(`${API_ENDPOINTS.auditUser(user?.id || '')}?per_page=5`).catch(() => null)
      ]);

      // Mock announcements (replace with real endpoint when available)
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
        trend: 'up',
        last_actions: userActivity?.logs?.slice(0, 3)?.map((log: any) => ({
          id: log.id,
          action: log.action,
          resource: log.resource,
          timestamp: log.created_at,
          description: `${log.action} on ${log.resource}`
        })) || []
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

  const togglePinnedAction = (actionTitle: string) => {
    const newPinned = new Set(pinnedActions);
    if (newPinned.has(actionTitle)) {
      newPinned.delete(actionTitle);
    } else {
      newPinned.add(actionTitle);
    }
    setPinnedActions(newPinned);
    localStorage.setItem('pinned_actions', JSON.stringify([...newPinned]));
  };

  const filteredAnnouncements = announcements.filter(announcement => {
    if (dismissedAnnouncements.has(announcement.id)) return false;
    if (announcementFilter === 'all') return true;
    return announcement.category === announcementFilter;
  });

  const baseQuickActions: QuickAction[] = [
    {
      title: 'Create User',
      description: 'Add a new system user',
      icon: <PersonIcon />,
      action: () => navigate('/dashboard/admin/users'),
      color: 'primary'
    },
    {
      title: 'Add Location',
      description: 'Register new office location',
      icon: <BusinessIcon />,
      action: () => navigate('/dashboard/admin/locations'),
      color: 'success'
    },
    {
      title: 'View Audit Logs',
      description: 'Monitor system activity',
      icon: <AssessmentIcon />,
      action: () => navigate('/dashboard/admin/audit'),
      color: 'secondary'
    },
    {
      title: 'System Health',
      description: 'Check system status',
              icon: <MonitorHeartIcon />,
      action: () => {
        window.open(`${API_ENDPOINTS.health}`, '_blank');
      },
      color: 'warning'
    }
  ];

  // Get role-based actions
  const getRoleBasedActions = (): QuickAction[] => {
    const roleActions: QuickAction[] = [];
    
    if (user?.permissions?.includes('applications.create')) {
      roleActions.push({
        title: 'New Application',
        description: 'Create a new license application',
        icon: <AddIcon />,
        action: () => navigate('/dashboard/applications/dashboard'),
        color: 'primary'
      });
    }
    
    if (user?.permissions?.includes('persons.create')) {
      roleActions.push({
        title: 'Search Citizens',
        description: 'Search for person records',
        icon: <SearchIcon />,
        action: () => navigate('/dashboard/persons'),
        color: 'secondary'
      });
    }
    
    if (user?.permissions?.includes('licenses.read')) {
      roleActions.push({
        title: 'License Management',
        description: 'Manage issued licenses',
        icon: <VerifiedUserIcon />,
        action: () => navigate('/dashboard/licenses'),
        color: 'success'
      });
    }
    
    return roleActions;
  };

  const allQuickActions = [...baseQuickActions, ...getRoleBasedActions()];
  const pinnedActionsArray = allQuickActions.filter(action => pinnedActions.has(action.title));
  const unpinnedActions = allQuickActions.filter(action => !pinnedActions.has(action.title));
  const displayActions = [...pinnedActionsArray, ...unpinnedActions];

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
    <Container maxWidth="xl" sx={{ py: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
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
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper 
        sx={{ 
          background: 'linear-gradient(135deg, #1976d2 0%, #7b1fa2 100%)',
          color: 'white',
          p: 4,
          mb: 3,
          borderRadius: 2
        }}
      >
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
          Madagascar LINC Print - Admin Dashboard
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.9, mb: 2 }}>
          System administration for the Madagascar Driver's License Print System
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Chip 
            label={`Version ${stats?.system.version}`} 
            sx={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.2)', 
              color: 'white',
              mr: 2 
            }} 
          />
          <Chip 
            label={`Uptime: ${stats?.system.uptime}`} 
            sx={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.2)', 
              color: 'white' 
            }} 
          />
        </Box>
      </Paper>

          {/* Bento Grid Layout */}
          <Grid container spacing={3}>
            {/* Row 1: Announcements (Large), User Context (Medium), System Status (Medium) */}
            <Grid item xs={12} lg={6}>
              {/* Announcements & Alerts Widget */}
              <Card sx={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ p: 2, pb: 1 }}>
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
                </CardContent>
                <CardContent sx={{ flex: 1, overflow: 'auto', pt: 0 }}>
                  {filteredAnnouncements.length === 0 ? (
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
            </Grid>

            <Grid item xs={12} lg={3}>
              {/* User & Location Context Widget */}
              <Card sx={{ height: '190px', mb: 3 }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <PersonIcon color="primary" />
                    <Typography variant="h6" fontWeight={600}>
                      Your Context
                    </Typography>
                  </Box>
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
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LocationIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      Location: {user?.primary_location && typeof user.primary_location === 'object' ? (user.primary_location as any)?.name || 'Not assigned' : 'Not assigned'}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Last login: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                  </Typography>
                </CardContent>
              </Card>

              {/* System Status Widget */}
              <Card sx={{ height: '190px' }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <MonitorHeartIcon color="primary" />
                    <Typography variant="h6" fontWeight={600}>
                      System Status
                    </Typography>
                  </Box>
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
                      {systemStatus.maintenance_scheduled && (
                        <Alert severity="warning" sx={{ mt: 1, fontSize: '0.75rem' }}>
                          <Typography variant="caption">
                            Maintenance: {new Date(systemStatus.maintenance_scheduled.date).toLocaleDateString()}
                          </Typography>
                        </Alert>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={3}>
              {/* Personal Productivity Widget */}
              <Card sx={{ height: '400px' }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <TrendingUpIcon color="primary" />
                    <Typography variant="h6" fontWeight={600}>
                      Your Productivity
                    </Typography>
                  </Box>
                  {productivityStats && (
                    <>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                        Today
                      </Typography>
                      <Grid container spacing={1} sx={{ mb: 2 }}>
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">Applications</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {productivityStats.today.applications_processed}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">Licenses</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {productivityStats.today.licenses_issued}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">Transactions</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {productivityStats.today.transactions_completed}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                        This Week
                      </Typography>
                      <Grid container spacing={1} sx={{ mb: 2 }}>
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">Applications</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {productivityStats.week.applications_processed}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">Licenses</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {productivityStats.week.licenses_issued}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">Transactions</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {productivityStats.week.transactions_completed}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                        Recent Actions
                      </Typography>
                      {productivityStats.last_actions.length > 0 ? (
                        <Stack spacing={1}>
                          {productivityStats.last_actions.map((action) => (
                            <Box key={action.id} sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                              <Typography variant="caption" fontWeight={600}>
                                {action.action}
                              </Typography>
                              <Typography variant="caption" display="block" color="text.secondary">
                                {new Date(action.timestamp).toLocaleTimeString()}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No recent activity
                        </Typography>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Row 2: Quick Actions (Large), Generic Stats (Medium), Support (Small) */}
            <Grid item xs={12} lg={6}>
              {/* Enhanced Quick Actions Widget */}
              <Card sx={{ height: '300px' }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SpeedIcon color="primary" />
                      <Typography variant="h6" fontWeight={600}>
        Quick Actions
      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {pinnedActions.size} pinned
                    </Typography>
                  </Box>
                  <Grid container spacing={2}>
                    {displayActions.slice(0, 6).map((action) => (
                      <Grid item xs={12} sm={6} md={4} key={action.title}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                            position: 'relative',
                '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: 2
                }
              }}
              onClick={action.action}
            >
                          <CardContent sx={{ textAlign: 'center', p: 2 }}>
                            <IconButton
                              size="small"
                              sx={{ position: 'absolute', top: 4, right: 4 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinnedAction(action.title);
                              }}
                            >
                              <PushPinIcon 
                                fontSize="small" 
                                color={pinnedActions.has(action.title) ? 'primary' : 'disabled'}
                              />
                            </IconButton>
                <Avatar 
                  sx={{ 
                                width: 40, 
                                height: 40, 
                    mx: 'auto', 
                                mb: 1,
                    bgcolor: `${action.color}.main`
                  }}
                >
                  {action.icon}
                </Avatar>
                            <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                  {action.title}
                </Typography>
                            <Typography variant="caption" color="text.secondary">
                  {action.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
                  </Grid>
                </CardContent>
              </Card>
      </Grid>

            <Grid item xs={12} lg={4}>
              {/* Generic Stats Widget */}
              <Card sx={{ height: '150px', mb: 3 }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <AssessmentIcon color="primary" />
                    <Typography variant="h6" fontWeight={600}>
        System Overview
      </Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="h5" color="primary.main" fontWeight="bold">
                        {stats?.users.total || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total Users
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="h5" color="success.main" fontWeight="bold">
                        {stats?.locations.operational || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Active Locations
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="h5" color="warning.main" fontWeight="bold">
                        {stats?.audit.security_events || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Security Alerts
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="h5" color="info.main" fontWeight="bold">
                        {((stats?.audit.success_rate || 0) * 100).toFixed(0)}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Success Rate
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Support & Resources Widget */}
              <Card sx={{ height: '130px' }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <HelpIcon color="primary" />
                    <Typography variant="h6" fontWeight={600}>
                      Support & Resources
                    </Typography>
                  </Box>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<SchoolIcon />}
                        fullWidth
                        onClick={() => window.open('/help/training', '_blank')}
                        sx={{ fontSize: '0.75rem' }}
                      >
                        Training
                      </Button>
                    </Grid>
                    <Grid item xs={6}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<HelpIcon />}
                        fullWidth
                        onClick={() => window.open('/help/guides', '_blank')}
                        sx={{ fontSize: '0.75rem' }}
                      >
                        Guides
                      </Button>
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<SecurityIcon />}
                        fullWidth
                        onClick={() => navigate('/dashboard/admin/audit')}
                        sx={{ fontSize: '0.75rem' }}
                      >
                        Security & Compliance
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={2}>
              {/* Compliance & Notices Widget */}
              <Card sx={{ height: '300px' }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <SecurityIcon color="primary" />
                    <Typography variant="h6" fontWeight={600}>
                      Compliance
                    </Typography>
                  </Box>
                  <Alert severity="info" sx={{ mb: 2, fontSize: '0.75rem' }}>
                    <Typography variant="caption" fontWeight={600}>
                      Document Verification
                    </Typography>
                    <Typography variant="caption" display="block">
                      Always verify documents before issuing licenses
                    </Typography>
                  </Alert>
                  <Alert severity="warning" sx={{ mb: 2, fontSize: '0.75rem' }}>
                    <Typography variant="caption" fontWeight={600}>
                      Biometric Policy
                    </Typography>
                    <Typography variant="caption" display="block">
                      Biometric capture required for all new licenses
                    </Typography>
                  </Alert>
                  <Alert severity="success" sx={{ fontSize: '0.75rem' }}>
                    <Typography variant="caption" fontWeight={600}>
                      System Compliance
                    </Typography>
                    <Typography variant="caption" display="block">
                      All systems meeting Madagascar regulatory standards
                    </Typography>
                  </Alert>
                </CardContent>
              </Card>
            </Grid>

            {/* Row 3: Detailed Statistics */}
            <Grid item xs={12}>
              <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2, mt: 2 }}>
                Detailed System Statistics
      </Typography>
              <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderLeft: 4, borderColor: 'primary.main' }}>
            <CardContent>
              <Typography variant="h4" color="primary.main" fontWeight="bold">
                {stats?.users.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderLeft: 4, borderColor: 'success.main' }}>
            <CardContent>
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {stats?.users.active}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderLeft: 4, borderColor: 'info.main' }}>
            <CardContent>
              <Typography variant="h4" color="info.main" fontWeight="bold">
                {stats?.users.new_this_week}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                New This Week
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderLeft: 4, borderColor: 'secondary.main' }}>
            <CardContent>
              <Typography variant="h4" color="secondary.main" fontWeight="bold">
                {stats?.locations.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Locations
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderLeft: 4, borderColor: 'warning.main' }}>
            <CardContent>
              <Typography variant="h4" color="warning.main" fontWeight="bold">
                {stats?.audit.total_actions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Actions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
                <Grid item xs={12} md={4}>
          <Card sx={{ borderLeft: 4, borderColor: 'error.main' }}>
            <CardContent>
              <Typography variant="h4" color="error.main" fontWeight="bold">
                {((stats?.audit.success_rate || 0) * 100).toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Success Rate
              </Typography>
            </CardContent>
          </Card>
                </Grid>
              </Grid>
        </Grid>
      </Grid>
    </Box>
      </Paper>
    </Container>
  );
};

export default AdminDashboard; 