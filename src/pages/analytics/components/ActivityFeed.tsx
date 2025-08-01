/**
 * Activity Feed Component
 * Real-time feed of recent system activity and events
 */

import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Avatar,
  Divider,
  Button
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Print as PrintIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';

import ChartWidget from './ChartWidget';

const ActivityFeed: React.FC = () => {
  // Sample recent activity data
  const recentActivities = [
    {
      id: 1,
      type: 'application',
      action: 'New application submitted',
      details: 'Driving License Application by Jean Rakotozafy',
      timestamp: '2 minutes ago',
      status: 'success',
      icon: <AssignmentIcon />,
      color: '#00ff00'
    },
    {
      id: 2,
      type: 'print',
      action: 'Card printed successfully',
      details: 'License card for Marie Andriana - Print Job #1523',
      timestamp: '5 minutes ago',
      status: 'success',
      icon: <PrintIcon />,
      color: '#00ff00'
    },
    {
      id: 3,
      type: 'user',
      action: 'User login',
      details: 'Admin user logged in from Antananarivo office',
      timestamp: '8 minutes ago',
      status: 'info',
      icon: <PersonIcon />,
      color: '#8884d8'
    },
    {
      id: 4,
      type: 'application',
      action: 'Application approved',
      details: 'Learner\'s License for Paul Rakoto approved',
      timestamp: '12 minutes ago',
      status: 'success',
      icon: <CheckCircleIcon />,
      color: '#00ff00'
    },
    {
      id: 5,
      type: 'print',
      action: 'Print job failed',
      details: 'Print Job #1522 failed - Low ink detected',
      timestamp: '15 minutes ago',
      status: 'error',
      icon: <ErrorIcon />,
      color: '#ff7300'
    },
    {
      id: 6,
      type: 'system',
      action: 'System maintenance',
      details: 'Scheduled backup completed successfully',
      timestamp: '1 hour ago',
      status: 'info',
      icon: <RefreshIcon />,
      color: '#8884d8'
    },
    {
      id: 7,
      type: 'application',
      action: 'Application reviewed',
      details: 'Professional License for taxi driver reviewed',
      timestamp: '1 hour ago',
      status: 'warning',
      icon: <WarningIcon />,
      color: '#ffc658'
    },
    {
      id: 8,
      type: 'user',
      action: 'Data export',
      details: 'Monthly report exported by supervisor',
      timestamp: '2 hours ago',
      status: 'info',
      icon: <ViewIcon />,
      color: '#8884d8'
    }
  ];

  // System alerts data
  const systemAlerts = [
    {
      id: 1,
      type: 'warning',
      title: 'Low Card Stock',
      message: 'Only 150 blank cards remaining at Toamasina office',
      severity: 'warning',
      timestamp: '1 hour ago'
    },
    {
      id: 2,
      type: 'info',
      title: 'Scheduled Maintenance',
      message: 'System backup scheduled for tonight at 2:00 AM',
      severity: 'info',
      timestamp: '3 hours ago'
    },
    {
      id: 3,
      type: 'error',
      title: 'Printer Offline',
      message: 'Printer B at Mahajanga office is offline since 4:30 PM',
      severity: 'error',
      timestamp: '5 hours ago'
    }
  ];

  const getActivityIcon = (activity: any) => {
    return (
      <Avatar sx={{ bgcolor: activity.color + '20', color: activity.color, width: 32, height: 32 }}>
        {React.cloneElement(activity.icon, { sx: { fontSize: 16 } })}
      </Avatar>
    );
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
      {/* Recent Activity */}
      <ChartWidget 
        title="Recent System Activity" 
        subtitle="Latest events and user actions"
        height={400}
      >
        <List sx={{ width: '100%', maxHeight: 350, overflow: 'auto' }}>
          {recentActivities.map((activity, index) => (
            <React.Fragment key={activity.id}>
              <ListItem alignItems="flex-start" sx={{ px: 1 }}>
                <ListItemIcon sx={{ minWidth: 40, mt: 1 }}>
                  {getActivityIcon(activity)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {activity.action}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {activity.timestamp}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {activity.details}
                    </Typography>
                  }
                />
              </ListItem>
              {index < recentActivities.length - 1 && <Divider variant="inset" component="li" />}
            </React.Fragment>
          ))}
        </List>
        
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button size="small" startIcon={<ViewIcon />}>
            View All Activity
          </Button>
        </Box>
      </ChartWidget>

      {/* System Alerts */}
      <ChartWidget 
        title="System Alerts & Notifications" 
        subtitle="Important system notifications"
        height={250}
      >
        <List sx={{ width: '100%' }}>
          {systemAlerts.map((alert, index) => (
            <React.Fragment key={alert.id}>
              <ListItem alignItems="flex-start" sx={{ px: 1 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip 
                          label={alert.severity.toUpperCase()} 
                          size="small" 
                          color={getAlertColor(alert.severity) as any}
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {alert.title}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {alert.timestamp}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {alert.message}
                    </Typography>
                  }
                />
              </ListItem>
              {index < systemAlerts.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      </ChartWidget>
    </Box>
  );
};

export default ActivityFeed;