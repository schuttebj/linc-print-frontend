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
    <Container maxWidth="lg" sx={{ py: 1, height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="h5" component="h1" gutterBottom sx={{ fontSize: '1.25rem', fontWeight: 600, mb: 0.5 }}>
          Applications Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
          Manage and track license applications for Madagascar Driver's License System
        </Typography>
      </Box>

      {/* Header Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
          Start a new application by selecting from the categories below
        </Typography>
        <Button
          variant="outlined"
          onClick={handleViewAllApplications}
          startIcon={<Assessment />}
          size="small"
        >
          View All Applications
        </Button>
      </Box>

      {/* Application Categories */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Stack spacing={1.5}>
          {applicationCategories.map((category, index) => (
            <Paper 
              key={category.title}
              elevation={0}
              sx={{ 
                p: 1.5,
                bgcolor: '#f8f9fa',
                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                borderRadius: 2
              }}
            >
              {/* Category Header */}
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Chip
                  label={category.title}
                  color={category.color as any}
                  variant="outlined"
                  size="small"
                  sx={{ fontWeight: 600, fontSize: '0.75rem', height: 24 }}
                />
              </Stack>
              
              {/* Category Applications */}
              <Grid container spacing={1}>
                {category.applications.map((app) => {
                  // Check permissions
                  if (app.permission && !hasPermission(app.permission)) {
                    return null;
                  }

                  return (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={app.title}>
                      <Card 
                        elevation={0}
                        sx={{ 
                          height: '100%',
                          cursor: 'pointer',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                          borderRadius: 2,
                          '&:hover': {
                            transform: 'translateY(-1px)',
                            boxShadow: 'rgba(0, 0, 0, 0.1) 0px 2px 4px 0px',
                          }
                        }}
                        onClick={() => handleApplicationClick(app.path)}
                      >
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          {/* Horizontal layout: Icon + Content */}
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                            {/* Icon */}
                            <Box sx={{ 
                              color: `${category.color}.main`,
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              mt: 0.25
                            }}>
                              {React.cloneElement(app.icon, { fontSize: 'medium' })}
                            </Box>
                            
                            {/* Content */}
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                <Typography 
                                  variant="subtitle2" 
                                  component="h3" 
                                  sx={{ 
                                    fontSize: '0.85rem', 
                                    fontWeight: 600,
                                    lineHeight: 1.2,
                                    color: 'text.primary'
                                  }}
                                >
                                  {app.title}
                                </Typography>
                                {(app as any).isNew && (
                                  <Chip 
                                    label="NEW" 
                                    size="small" 
                                    color="warning" 
                                    sx={{ 
                                      fontSize: '0.6rem', 
                                      height: 18,
                                      ml: 0.5,
                                      flexShrink: 0
                                    }} 
                                  />
                                )}
                              </Box>
                              <Typography 
                                variant="body2" 
                                color="text.secondary" 
                                sx={{ 
                                  fontSize: '0.75rem',
                                  lineHeight: 1.3,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden'
                                }}
                              >
                                {app.description}
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          ))}
        </Stack>
      </Box>
    </Container>
  );
};

export default ApplicationsDashboard; 