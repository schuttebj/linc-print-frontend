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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { PersonAdd as PersonAddIcon } from '@mui/icons-material';
import PersonFormWrapper from '../../components/PersonFormWrapper';

const PersonFormTest: React.FC = () => {
  const [testMode, setTestMode] = useState<'standalone' | 'application' | 'search' | null>(null);
  const [completedPerson, setCompletedPerson] = useState<any>(null);
  const [showCustomSuccess, setShowCustomSuccess] = useState(false);
  const [successPerson, setSuccessPerson] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
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

  const handleSuccess = (person: any, isEdit: boolean) => {
    console.log('PersonFormWrapper success with person:', person, 'isEdit:', isEdit);
    setSuccessPerson(person);
    setIsEditMode(isEdit);
    setShowCustomSuccess(true);
  };

  const handleContinueEditing = () => {
    setShowCustomSuccess(false);
    // Form stays in current state
  };

  const handleCreateAnother = () => {
    setShowCustomSuccess(false);
    setTestMode(null); // This will cause the form to unmount and reset
  };

  const handleProceedToApplication = () => {
    setShowCustomSuccess(false);
    setCompletedPerson(successPerson);
    setTestMode(null);
    alert(`Proceeding to application with person: ${successPerson?.first_name} ${successPerson?.surname}`);
  };

  const handleReturnToSearch = () => {
    setShowCustomSuccess(false);
    setCompletedPerson(successPerson);
    setTestMode(null);
    alert(`Returning to search after editing: ${successPerson?.first_name} ${successPerson?.surname}`);
  };

  if (testMode) {
    return (
      <>
        <PersonFormWrapper
          mode={testMode}
          onComplete={handleComplete}
          onCancel={handleCancel}
          onSuccess={handleSuccess}
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

        {/* Custom Success Dialog */}
        <Dialog
          open={showCustomSuccess}
          onClose={() => setShowCustomSuccess(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ bgcolor: 'success.main', color: 'white' }}>
            <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonAddIcon />
              {isEditMode ? 'Person Updated Successfully!' : 'Person Created Successfully!'}
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            {successPerson && (
              <Box>
                <Typography variant="body1" gutterBottom>
                  <strong>{successPerson.first_name} {successPerson.surname}</strong> has been successfully {isEditMode ? 'updated' : 'created'}.
                </Typography>

                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">Person ID:</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                    {successPerson.id}
                  </Typography>
                </Box>

                <Alert severity="success" sx={{ mt: 2 }}>
                  {testMode === 'standalone' && 'The person record is now available for license applications.'}
                  {testMode === 'application' && 'Ready to proceed with the application process.'}
                  {testMode === 'search' && 'Person has been updated. You can return to search or continue editing.'}
                </Alert>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            {testMode === 'standalone' && (
              <>
                <Button onClick={handleContinueEditing} variant="outlined">
                  Continue Editing
                </Button>
                <Button onClick={handleCreateAnother} variant="contained" startIcon={<PersonAddIcon />}>
                  Create Another Person
                </Button>
              </>
            )}
            {testMode === 'application' && (
              <>
                <Button onClick={handleCreateAnother} variant="outlined">
                  Create Another Person
                </Button>
                <Button onClick={handleProceedToApplication} variant="contained" color="primary">
                  Continue to Application
                </Button>
              </>
            )}
            {testMode === 'search' && (
              <>
                <Button onClick={handleContinueEditing} variant="outlined">
                  Continue Editing
                </Button>
                <Button onClick={handleReturnToSearch} variant="contained" color="primary">
                  Return to Search
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>
      </>
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
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Expected Behavior:</strong> This will try to load person ID {testPersonId} and show a 404 error.
              This is <strong>normal</strong> - in real usage, the search page would pass a valid person ID.
            </Typography>
          </Alert>
          <Button
            variant="contained"
            onClick={() => setTestMode('search')}
            fullWidth
          >
            Test Search Edit Mode (Will Show 404)
          </Button>
        </Paper>
      </Stack>

      <Divider sx={{ my: 4 }} />

      <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom>
          Test Instructions & New Features
        </Typography>
        <Typography variant="body2" component="div">
          <strong>🎉 NEW: External Success Dialog Control</strong>
          <p>This test page demonstrates the new <code>onSuccess</code> prop that allows parent components to handle success dialogs with custom UI and logic.</p>
          
          <ol>
            <li><strong>Standalone Mode:</strong> Custom success dialog with "Continue Editing" and "Create Another Person" options</li>
            <li><strong>Application Mode:</strong> Custom dialog with "Create Another Person" and "Continue to Application" options</li>
            <li><strong>Search Edit Mode:</strong> Custom dialog with "Continue Editing" and "Return to Search" options</li>
          </ol>

          <p><strong>Benefits:</strong></p>
          <ul>
            <li>✅ Custom success messages per context</li>
            <li>✅ Custom button labels and actions</li>
            <li>✅ Complete control over success flow</li>
            <li>✅ Consistent branding across different uses</li>
          </ul>
        </Typography>
      </Paper>
    </Box>
  );
};

export default PersonFormTest; 