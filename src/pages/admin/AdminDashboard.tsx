/**
 * Admin Dashboard for Madagascar LINC Print System
 * Central hub for system administration with navigation and overview statistics
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
  Avatar
} from '@mui/material';
import {
  Person as PersonIcon,
  Business as BusinessIcon,
  Assessment as AssessmentIcon,
  MonitorHeart as HealthIcon
} from '@mui/icons-material';
import { API_ENDPOINTS, api } from '../../config/api';

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

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  color: 'primary' | 'secondary' | 'success' | 'warning';
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
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
          total_actions: auditStatsRes?.total_actions || 0,
          actions_today: auditStatsRes?.actions_today || 0,
          security_events: auditStatsRes?.security_events || 0,
          success_rate: auditStatsRes?.success_rate || 0.95
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

  const quickActions: QuickAction[] = [
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
      icon: <HealthIcon />,
      action: () => {
        window.open(`${API_ENDPOINTS.health}`, '_blank');
      },
      color: 'warning'
    }
  ];

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

      {/* Quick Actions */}
      <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2 }}>
        Quick Actions
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {quickActions.map((action) => (
          <Grid item xs={12} sm={6} md={3} key={action.title}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
              onClick={action.action}
            >
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Avatar 
                  sx={{ 
                    width: 56, 
                    height: 56, 
                    mx: 'auto', 
                    mb: 2,
                    bgcolor: `${action.color}.main`
                  }}
                >
                  {action.icon}
                </Avatar>
                <Typography variant="h6" component="h3" gutterBottom>
                  {action.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {action.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Statistics Overview */}
      <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2 }}>
        System Overview
      </Typography>
      
      {/* User Statistics */}
      <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3, mb: 2 }}>
        User Management
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
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
      </Grid>

      {/* Location Statistics */}
      <Typography variant="h6" component="h3" gutterBottom sx={{ mb: 2 }}>
        Location Management
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
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
          <Card sx={{ borderLeft: 4, borderColor: 'success.main' }}>
            <CardContent>
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {stats?.locations.operational}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Operational
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderLeft: 4, borderColor: 'warning.main' }}>
            <CardContent>
              <Typography variant="h4" color="warning.main" fontWeight="bold">
                {stats?.locations.total_capacity}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Capacity
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Audit Statistics */}
      <Typography variant="h6" component="h3" gutterBottom sx={{ mb: 2 }}>
        Audit & Security
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card sx={{ borderLeft: 4, borderColor: 'info.main' }}>
            <CardContent>
              <Typography variant="h4" color="info.main" fontWeight="bold">
                {stats?.audit.total_actions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Actions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ borderLeft: 4, borderColor: 'primary.main' }}>
            <CardContent>
              <Typography variant="h4" color="primary.main" fontWeight="bold">
                {stats?.audit.actions_today}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Actions Today
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ borderLeft: 4, borderColor: 'error.main' }}>
            <CardContent>
              <Typography variant="h4" color="error.main" fontWeight="bold">
                {stats?.audit.security_events}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Security Events
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ borderLeft: 4, borderColor: 'success.main' }}>
            <CardContent>
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {((stats?.audit.success_rate || 0) * 100).toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Success Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard; 