/**
 * Home Page / Dashboard for Madagascar Driver's License System
 */

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Stack,
} from '@mui/material';
import { Dashboard, Person, Security, Analytics } from '@mui/icons-material';

import { useAuth } from '../contexts/AuthContext';

const HomePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        {/* Welcome Header */}
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome, {user?.first_name || user?.username}!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Madagascar Driver's License Management System Dashboard
          </Typography>
        </Box>

        {/* Dashboard Cards */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Stack spacing={2} alignItems="center">
                  <Dashboard sx={{ fontSize: 48, color: 'primary.main' }} />
                  <Typography variant="h6">System Overview</Typography>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    Monitor system status and performance
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Stack spacing={2} alignItems="center">
                  <Person sx={{ fontSize: 48, color: 'secondary.main' }} />
                  <Typography variant="h6">Person Management</Typography>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    Register and manage Madagascar citizens
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Stack spacing={2} alignItems="center">
                  <Security sx={{ fontSize: 48, color: 'success.main' }} />
                  <Typography variant="h6">Security</Typography>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    Enhanced security and audit logging
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Stack spacing={2} alignItems="center">
                  <Analytics sx={{ fontSize: 48, color: 'info.main' }} />
                  <Typography variant="h6">Analytics</Typography>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    System usage and performance metrics
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Quick Info */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              System Status
            </Typography>
            <Typography variant="body2" color="success.main">
              ✅ All systems operational
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Backend: Connected to Madagascar License System API
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default HomePage; 