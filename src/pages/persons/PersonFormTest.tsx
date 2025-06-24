/**
 * Test Page for PersonFormWrapper Component
 * Tests different modes and configurations
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Alert,
  Divider,
} from '@mui/material';
import PersonFormWrapper from '../../components/PersonFormWrapper';

const PersonFormTest: React.FC = () => {
  const [testMode, setTestMode] = useState<'standalone' | 'application' | 'search' | null>(null);
  const [completedPerson, setCompletedPerson] = useState<any>(null);
  const [testPersonId] = useState('123e4567-e89b-12d3-a456-426614174000'); // Mock person ID for testing

  const handleComplete = (person: any) => {
    console.log('PersonFormWrapper completed with person:', person);
    setCompletedPerson(person);
    setTestMode(null); // Reset to show test options
  };

  const handleCancel = () => {
    console.log('PersonFormWrapper cancelled');
    setTestMode(null); // Reset to show test options
  };

  if (testMode) {
    return (
      <PersonFormWrapper
        mode={testMode}
        onComplete={handleComplete}
        onCancel={handleCancel}
        initialPersonId={testMode === 'search' ? testPersonId : undefined}
        title={
          testMode === 'standalone' ? 'Person Management (Standalone)' :
          testMode === 'application' ? 'Application - Add Person' :
          'Edit Person from Search'
        }
        subtitle={
          testMode === 'standalone' ? 'Standard person management interface' :
          testMode === 'application' ? 'Add or find person for this application' :
          'Edit person details and return to search'
        }
      />
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        PersonFormWrapper Test Page
      </Typography>
      
      <Typography variant="body1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
        Test the PersonFormWrapper component in different modes to validate functionality.
      </Typography>

      {completedPerson && (
        <Alert severity="success" sx={{ mb: 4 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Form Completed Successfully!
          </Typography>
          <Typography variant="body2">
            Person: {completedPerson.first_name} {completedPerson.surname} (ID: {completedPerson.id})
          </Typography>
        </Alert>
      )}

      <Stack spacing={3}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom color="primary.main">
            Mode 1: Standalone
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Traditional person management with success dialog and "Add Another" option.
          </Typography>
          <Button
            variant="contained"
            onClick={() => setTestMode('standalone')}
            fullWidth
          >
            Test Standalone Mode
          </Button>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom color="primary.main">
            Mode 2: Application Flow
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Person form as part of application process. On completion, calls onComplete callback.
          </Typography>
          <Button
            variant="contained"
            onClick={() => setTestMode('application')}
            fullWidth
          >
            Test Application Mode
          </Button>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom color="primary.main">
            Mode 3: Search Edit
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Edit existing person from search page. Loads person data and returns to search on completion.
          </Typography>
          <Button
            variant="contained"
            onClick={() => setTestMode('search')}
            fullWidth
          >
            Test Search Edit Mode
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Note: This will try to load person ID: {testPersonId}
          </Typography>
        </Paper>
      </Stack>

      <Divider sx={{ my: 4 }} />

      <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom>
          Test Instructions
        </Typography>
        <Typography variant="body2" component="div">
          <ol>
            <li><strong>Standalone Mode:</strong> Should show full header with "Start Over" button and success dialog on completion</li>
            <li><strong>Application Mode:</strong> Should show "Cancel" button and call onComplete callback instead of showing dialog</li>
            <li><strong>Search Edit Mode:</strong> Should attempt to load existing person and call onComplete on save</li>
          </ol>
        </Typography>
      </Paper>
    </Box>
  );
};

export default PersonFormTest; 