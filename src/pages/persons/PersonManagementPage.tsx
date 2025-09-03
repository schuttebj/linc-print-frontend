/**
 * Person Management Page for Madagascar Driver's License System
 * Simplified version using PersonFormWrapper component
 */

import React, { useState } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Grid,
} from '@mui/material';
import {
  Clear as ClearIcon,
  CheckCircle as CheckCircleIcon,
  PersonAdd as PersonAddIcon,
  Assignment as AssignmentIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import PersonFormWrapper from '../../components/PersonFormWrapper';

const PersonManagementPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  // State for success dialog
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [createdPerson, setCreatedPerson] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Handle form completion with external success dialog
  const handleFormSuccess = (person: any, isEdit: boolean) => {
    setCreatedPerson(person);
    setIsEditMode(isEdit);
    setShowSuccessDialog(true);
  };

  // Handle success dialog actions
  const handleCreateAnotherPerson = () => {
    setShowSuccessDialog(false);
    setCreatedPerson(null);
    // PersonFormWrapper will handle the reset internally
    window.location.reload(); // Simple way to reset everything
  };

  const handleStartApplication = () => {
    setShowSuccessDialog(false);
    if (createdPerson) {
      navigate(`/dashboard/applications/create?personId=${createdPerson.id}`);
    }
  };

  const handleContinueEditing = () => {
    setShowSuccessDialog(false);
    setCreatedPerson(null);
  };

  // Check permissions
  if (!hasPermission('persons.create')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You don't have permission to create persons. Contact your administrator.
        </Alert>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
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
        {/* Header */}
        <Box sx={{ 
          bgcolor: 'white', 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          flexShrink: 0,
          p: 2
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
              Person Management
            </Typography>
            <Button
              variant="outlined"
              onClick={() => window.location.reload()}
              startIcon={<ClearIcon />}
              size="small"
            >
              Start Over
            </Button>
          </Box>
        </Box>

        {/* PersonFormWrapper Component */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'hidden',
          minHeight: 0,
          p: 0,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <PersonFormWrapper
            mode="standalone"
            onSuccess={handleFormSuccess}
            title="Person Management"
            showHeader={false}
          />
        </Box>
      </Paper>

      {/* Success Dialog - Blue Corporate Style matching search edit */}
      <Dialog 
        open={showSuccessDialog} 
        onClose={() => {}}
        disableEscapeKeyDown
        maxWidth="md"
        fullWidth
        slotProps={{
          backdrop: {
            onClick: (event) => {
              console.log('🚨 PersonManagementPage EXTERNAL DIALOG: Backdrop clicked!', event);
              event.stopPropagation();
              event.preventDefault();
            }
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            bgcolor: 'primary.main', 
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <CheckCircleIcon />
          {isEditMode ? 'Person Updated Successfully!' : 'Person Created Successfully!'}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {createdPerson && (
            <Box>
              <Alert severity="success" sx={{ mb: 3 }}>
                Person <strong>{createdPerson.first_name} {createdPerson.surname}</strong> has been successfully {isEditMode ? 'updated' : 'created'}!
              </Alert>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box 
                    sx={{ 
                      p: 3, 
                      border: '1px solid',
                      borderColor: 'primary.main',
                      borderRadius: 2,
                      bgcolor: 'primary.50'
                    }}
                  >
                    <Typography variant="h6" color="primary.main" gutterBottom>
                      📋 Person Information
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      The person record has been {isEditMode ? 'updated' : 'created'} and is ready for license applications.
                    </Typography>
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                      <Typography variant="subtitle2">Person ID:</Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {createdPerson.id}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box 
                    sx={{ 
                      p: 3, 
                      border: '1px solid',
                      borderColor: 'success.main',
                      borderRadius: 2,
                      bgcolor: 'success.50'
                    }}
                  >
                    <Typography variant="h6" color="success.main" gutterBottom>
                      🚀 Next Steps
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Choose your next action to continue the person management workflow.
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • Create another person for additional citizens<br/>
                      • Start application process for license requests
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1, justifyContent: 'space-between' }}>
          <Button 
            onClick={handleCreateAnotherPerson}
            variant="outlined"
            startIcon={<PersonAddIcon />}
            size="large"
          >
            Create Another Person
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              onClick={handleStartApplication}
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              size="large"
              sx={{ minWidth: 200 }}
            >
              Start Application
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PersonManagementPage; 