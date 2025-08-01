/**
 * Applications Dashboard for Madagascar License System
 * Main hub for all application-related activities
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Stack,
  Chip,
  Divider,
  Paper,
} from '@mui/material';
import {
  School,
  DirectionsCar,
  Assignment,
  Refresh,
  FileCopy,
  Assessment,
  CreditCard,
  Add as AddIcon,
} from '@mui/icons-material';

import { useAuth } from '../../contexts/AuthContext';

const ApplicationsDashboard: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();

  // Application categories matching the sidebar menu structure
  const applicationCategories = [
    {
      title: 'New License Applications',
      color: 'primary',
      applications: [
        {
          title: "Learner's License Application",
          description: 'Apply for a new learner\'s permit',
          icon: <School />,
          path: '/dashboard/applications/learners-license',
          permission: 'applications.create',
        },
        {
          title: 'Driving License Application',
          description: 'Apply for a new driving license',
          icon: <DirectionsCar />,
          path: '/dashboard/applications/driving-license',
          permission: 'applications.create',
        },
        {
          title: 'Professional License Application',
          description: 'Apply for professional driving license',
          icon: <DirectionsCar />,
          path: '/dashboard/applications/professional-license',
          permission: 'applications.create',
        },
        {
          title: 'Temporary License Application',
          description: 'Apply for temporary license',
          icon: <Assignment />,
          path: '/dashboard/applications/temporary-license',
          permission: 'applications.create',
        },
      ]
    },
    {
      title: 'Renewals & Duplicates',
      color: 'secondary',
      applications: [
        {
          title: 'Renew Driving License',
          description: 'Renew existing driving license',
          icon: <Refresh />,
          path: '/dashboard/applications/renew-license',
          permission: 'applications.create',
        },
        {
          title: "Duplicate Learner's License",
          description: 'Request duplicate learner\'s license',
          icon: <FileCopy />,
          path: '/dashboard/applications/duplicate-learners',
          permission: 'applications.create',
        },
      ]
    },
    {
      title: 'Conversions & International',
      color: 'info',
      applications: [
        {
          title: 'Convert Foreign License',
          description: 'Convert foreign license to Madagascar license',
          icon: <Assessment />,
          path: '/dashboard/applications/foreign-conversion',
          permission: 'applications.create',
        },
        {
          title: 'International Driving Permit',
          description: 'Apply for international driving permit',
          icon: <CreditCard />,
          path: '/dashboard/applications/international-permit',
          permission: 'applications.create',
        },
      ]
    },
    {
      title: 'License Capture',
      color: 'success',
      applications: [
        {
          title: 'Driver License Capture',
          description: 'Capture existing driver license',
          icon: <CreditCard />,
          path: '/dashboard/applications/driver-license-capture',
          permission: 'applications.create',
        },
        {
          title: 'Learner Permit Capture',
          description: 'Capture existing learner permit',
          icon: <Assignment />,
          path: '/dashboard/applications/learner-permit-capture',
          permission: 'applications.create',
        },
        {
          title: 'Learner Permit Capture (Compact)',
          description: 'Compact layout - no scrolling, keyboard-friendly',
          icon: <Assignment />,
          path: '/dashboard/applications/learner-permit-capture-compact',
          permission: 'applications.create',
          isNew: true,
        },
      ]
    }
  ];



  const handleApplicationClick = (path: string) => {
    navigate(path);
  };

  const handleViewAllApplications = () => {
    navigate('/dashboard/applications');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Applications Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage and track license applications for Madagascar Driver's License System
        </Typography>
      </Box>



      {/* Quick Actions */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h5" component="h2">
            Quick Actions
          </Typography>
          <Button
            variant="outlined"
            onClick={handleViewAllApplications}
            startIcon={<Assessment />}
          >
            View All Applications
          </Button>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Start a new application by selecting from the categories below
        </Typography>

        {/* Application Categories */}
        <Stack spacing={4}>
          {applicationCategories.map((category, index) => (
            <Box key={category.title}>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <Chip
                  label={category.title}
                  color={category.color as any}
                  variant="outlined"
                  sx={{ fontWeight: 'bold' }}
                />
              </Stack>
              
              <Grid container spacing={2}>
                {category.applications.map((app) => {
                  // Check permissions
                  if (app.permission && !hasPermission(app.permission)) {
                    return null;
                  }

                  return (
                    <Grid item xs={12} sm={6} md={3} key={app.title}>
                      <Card 
                        sx={{ 
                          height: '100%',
                          cursor: 'pointer',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: 4,
                          }
                        }}
                        onClick={() => handleApplicationClick(app.path)}
                      >
                        <CardContent>
                          <Stack spacing={2}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Box sx={{ color: `${category.color}.main` }}>
                                {app.icon}
                              </Box>
                              {(app as any).isNew && (
                                <Chip 
                                  label="NEW" 
                                  size="small" 
                                  color="warning" 
                                  sx={{ fontSize: '0.7rem', height: 20 }} 
                                />
                              )}
                            </Box>
                            <Typography variant="h6" component="h3">
                              {app.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {app.description}
                            </Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
              
              {index < applicationCategories.length - 1 && <Divider sx={{ mt: 3 }} />}
            </Box>
          ))}
        </Stack>
      </Paper>
    </Container>
  );
};

export default ApplicationsDashboard; 