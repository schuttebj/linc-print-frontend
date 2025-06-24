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
  const [showStandaloneSuccess, setShowStandaloneSuccess] = useState(false);
  const [showApplicationSuccess, setShowApplicationSuccess] = useState(false);
  const [showSearchSuccess, setShowSearchSuccess] = useState(false);
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
    
    // Show different dialogs based on current mode
    switch (testMode) {
      case 'standalone':
        setShowStandaloneSuccess(true);
        break;
      case 'application':
        setShowApplicationSuccess(true);
        break;
      case 'search':
        setShowSearchSuccess(true);
        break;
    }
  };

  const handleContinueEditing = () => {
    setShowStandaloneSuccess(false);
    setShowApplicationSuccess(false);
    setShowSearchSuccess(false);
    // Form stays in current state
  };

  const handleCreateAnother = () => {
    setShowStandaloneSuccess(false);
    setShowApplicationSuccess(false);
    setShowSearchSuccess(false);
    setTestMode(null); // This will cause the form to unmount and reset
  };

  const handleProceedToApplication = () => {
    setShowApplicationSuccess(false);
    setCompletedPerson(successPerson);
    setTestMode(null);
    alert(`Proceeding to application with person: ${successPerson?.first_name} ${successPerson?.surname}`);
  };

  const handleReturnToSearch = () => {
    setShowSearchSuccess(false);
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

        {/* Standalone Success Dialog - Traditional Green Style */}
        <Dialog
          open={showStandaloneSuccess}
          onClose={() => setShowStandaloneSuccess(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ bgcolor: 'success.main', color: 'white', textAlign: 'center' }}>
            <Typography variant="h5" component="div" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <PersonAddIcon fontSize="large" />
              Person Management Success
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ pt: 3, textAlign: 'center' }}>
            {successPerson && (
              <Box>
                <Typography variant="h6" gutterBottom color="success.main">
                  ✅ {successPerson.first_name} {successPerson.surname}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  has been successfully {isEditMode ? 'updated' : 'created'} in the system.
                </Typography>

                <Box sx={{ mt: 3, p: 2, bgcolor: 'success.50', borderRadius: 2, border: '1px solid', borderColor: 'success.main' }}>
                  <Typography variant="subtitle2" color="success.dark">Person ID:</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5, fontWeight: 'bold' }}>
                    {successPerson.id}
                  </Typography>
                </Box>

                <Alert severity="success" sx={{ mt: 3 }}>
                  <Typography variant="body1">
                    🎉 The person record is now available for license applications and other system processes.
                  </Typography>
                </Alert>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 2, justifyContent: 'center' }}>
            <Button onClick={handleContinueEditing} variant="outlined" size="large" color="success">
              Continue Editing This Person
            </Button>
            <Button onClick={handleCreateAnother} variant="contained" size="large" startIcon={<PersonAddIcon />} color="success">
              Create Another Person
            </Button>
          </DialogActions>
        </Dialog>

        {/* Application Success Dialog - Blue Corporate Style */}
        <Dialog
          open={showApplicationSuccess}
          onClose={() => setShowApplicationSuccess(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', py: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ 
                bgcolor: 'primary.dark', 
                p: 1.5, 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <PersonAddIcon fontSize="large" />
              </Box>
              <Box>
                <Typography variant="h5">
                  Application Ready to Continue
                </Typography>
                <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                  Person {isEditMode ? 'updated' : 'registered'} successfully
                </Typography>
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 4 }}>
            {successPerson && (
              <Box>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    📋 Ready for Next Step
                  </Typography>
                  <Typography variant="body2">
                    Person details have been saved. You can now proceed with document upload and application processing.
                  </Typography>
                </Alert>

                <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
                  <Box sx={{ flex: 1, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="primary.dark">Applicant Name:</Typography>
                    <Typography variant="h6">{successPerson.first_name} {successPerson.surname}</Typography>
                  </Box>
                  <Box sx={{ flex: 1, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="primary.dark">Person ID:</Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {successPerson.id}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, borderLeft: '4px solid', borderColor: 'primary.main' }}>
                  <Typography variant="body2" color="text.secondary">
                    💡 <strong>Next Steps:</strong> Upload required documents, complete application forms, and submit for review.
                  </Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 2 }}>
            <Button onClick={handleCreateAnother} variant="outlined" color="primary">
              Add Different Person
            </Button>
            <Button 
              onClick={handleProceedToApplication} 
              variant="contained" 
              size="large" 
              color="primary"
              sx={{ px: 4 }}
            >
              Continue to Document Upload →
            </Button>
          </DialogActions>
        </Dialog>

        {/* Search Success Dialog - Orange Edit Style */}
        <Dialog
          open={showSearchSuccess}
          onClose={() => setShowSearchSuccess(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ bgcolor: 'warning.main', color: 'white' }}>
            <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonAddIcon />
              Person Edit Complete
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            {successPerson && (
              <Box>
                <Alert severity="warning" sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    ✏️ Edit Successful
                  </Typography>
                  <Typography variant="body2">
                    Changes to {successPerson.first_name} {successPerson.surname} have been saved.
                  </Typography>
                </Alert>

                <Box sx={{ p: 2, bgcolor: 'warning.50', borderRadius: 1, mb: 2 }}>
                  <Typography variant="subtitle2" color="warning.dark">Modified Person:</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    {successPerson.first_name} {successPerson.surname}
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                    ID: {successPerson.id}
                  </Typography>
                </Box>

                <Typography variant="body2" color="text.secondary">
                  You can continue editing this person or return to the search results to find other records.
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button onClick={handleContinueEditing} variant="outlined" color="warning">
              Keep Editing
            </Button>
            <Button onClick={handleReturnToSearch} variant="contained" color="warning">
              ← Back to Search
            </Button>
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
          <p>This test page demonstrates the new <code>onSuccess</code> prop with <strong>three completely different dialogs</strong> to show the power of external control.</p>
          
          <ol>
            <li><strong>Standalone Mode:</strong> 🟢 <strong>Green Traditional Dialog</strong> - Centered layout, success theme, person management focus</li>
            <li><strong>Application Mode:</strong> 🔵 <strong>Blue Corporate Dialog</strong> - Professional layout, application workflow, next steps guidance</li>
            <li><strong>Search Edit Mode:</strong> 🟠 <strong>Orange Edit Dialog</strong> - Compact layout, edit theme, search workflow focus</li>
          </ol>

          <p><strong>Key Differences Demonstrated:</strong></p>
          <ul>
            <li>🎨 <strong>Different Colors:</strong> Green (success), Blue (primary), Orange (warning)</li>
            <li>📐 <strong>Different Layouts:</strong> Centered, side-by-side, compact</li>
            <li>📝 <strong>Different Content:</strong> Person management vs application workflow vs edit confirmation</li>
            <li>🔘 <strong>Different Buttons:</strong> Custom labels, colors, and actions per context</li>
            <li>📏 <strong>Different Sizes:</strong> Small (search), medium (standalone), large (application)</li>
          </ul>

          <p><strong>This proves you can create completely custom experiences for each use case!</strong></p>
        </Typography>
      </Paper>
    </Box>
  );
};

export default PersonFormTest; 