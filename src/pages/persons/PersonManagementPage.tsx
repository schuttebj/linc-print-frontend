/**
 * Person Management Page for Madagascar Driver's License System
 * Foundation page - will be expanded with full form functionality
 */

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
} from '@mui/material';
import { Person, PersonAdd, Search } from '@mui/icons-material';

import { useAuth } from '../../contexts/AuthContext';

const PersonManagementPage: React.FC = () => {
  const { user, hasPermission } = useAuth();

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        {/* Page Header */}
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Person Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Register and manage Madagascar citizens for driver's license applications
          </Typography>
        </Box>

        {/* User Info & Permissions */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Current User: {user?.username}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              {user?.roles?.map((role) => (
                <Chip 
                  key={typeof role === 'string' ? role : role.id} 
                  label={typeof role === 'string' ? role : role.display_name} 
                  color="primary" 
                  size="small" 
                />
              ))}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Available Actions:
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              {hasPermission('persons.create') && (
                <Chip label="Create Person" color="success" size="small" />
              )}
              {hasPermission('persons.read') && (
                <Chip label="View Persons" color="info" size="small" />
              )}
              {hasPermission('persons.update') && (
                <Chip label="Update Person" color="warning" size="small" />
              )}
              {hasPermission('persons.delete') && (
                <Chip label="Delete Person" color="error" size="small" />
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Action Cards */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          {/* Register New Person */}
          {hasPermission('persons.create') && (
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Stack spacing={2} alignItems="center">
                  <PersonAdd sx={{ fontSize: 48, color: 'primary.main' }} />
                  <Typography variant="h6">Register New Person</Typography>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    Register a new Madagascar citizen with their personal details, 
                    documents, and address information.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<PersonAdd />}
                    onClick={() => {
                      // TODO: Navigate to person registration form
                      alert('Person registration form will be implemented next');
                    }}
                  >
                    Register Person
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Search Persons */}
          {hasPermission('persons.search') && (
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Stack spacing={2} alignItems="center">
                  <Search sx={{ fontSize: 48, color: 'secondary.main' }} />
                  <Typography variant="h6">Search Persons</Typography>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    Search existing persons by name, document number, 
                    locality, or phone number.
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Search />}
                    onClick={() => {
                      // TODO: Navigate to person search
                      alert('Person search will be implemented next');
                    }}
                  >
                    Search Persons
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Manage Persons */}
          {hasPermission('persons.read') && (
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Stack spacing={2} alignItems="center">
                  <Person sx={{ fontSize: 48, color: 'info.main' }} />
                  <Typography variant="h6">Manage Persons</Typography>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    View, edit, and manage existing person records 
                    and their associated documents.
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Person />}
                    onClick={() => {
                      // TODO: Navigate to person list
                      alert('Person management list will be implemented next');
                    }}
                  >
                    View All Persons
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>

        {/* System Info */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Madagascar-Specific Features
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">
                • <strong>Document Types:</strong> Madagascar ID (CIN/CNI) and Passport support
              </Typography>
              <Typography variant="body2">
                • <strong>Address Format:</strong> 3-digit postal codes with locality-based structure
              </Typography>
              <Typography variant="body2">
                • <strong>Phone Numbers:</strong> +261 country code with Madagascar format validation
              </Typography>
              <Typography variant="body2">
                • <strong>Duplicate Detection:</strong> Advanced similarity matching with 70% threshold
              </Typography>
              <Typography variant="body2">
                • <strong>Languages:</strong> Malagasy (default), French, English support
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default PersonManagementPage; 