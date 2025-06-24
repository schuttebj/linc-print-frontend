/**
 * Example: Using PersonFormWrapper with External Success Dialog
 * This shows how to implement custom success handling for different contexts
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Chip,
} from '@mui/material';
import { 
  PersonAdd as PersonAddIcon, 
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PersonFormWrapper from '../../components/PersonFormWrapper';

interface PersonFormExampleProps {
  context: 'application' | 'search' | 'standalone';
  applicationId?: string;
  onPersonSelected?: (person: any) => void;
  onCancel?: () => void;
}

const PersonFormExample: React.FC<PersonFormExampleProps> = ({
  context,
  applicationId,
  onPersonSelected,
  onCancel
}) => {
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);
  const [successPerson, setSuccessPerson] = useState<any>(null);
  const [isEdit, setIsEdit] = useState(false);

  const handleSuccess = (person: any, isEditMode: boolean) => {
    setSuccessPerson(person);
    setIsEdit(isEditMode);
    setShowSuccess(true);
  };

  const handleComplete = (person: any) => {
    // This is called when onSuccess is not handling it
    if (onPersonSelected) {
      onPersonSelected(person);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(-1); // Go back
    }
  };

  // Custom success dialog actions based on context
  const renderSuccessActions = () => {
    switch (context) {
      case 'application':
        return (
          <>
            <Button onClick={() => setShowSuccess(false)} variant="outlined">
              Add Another Person
            </Button>
            <Button
              onClick={() => {
                setShowSuccess(false);
                if (onPersonSelected) {
                  onPersonSelected(successPerson);
                }
                // Navigate to next step of application
                navigate(`/dashboard/applications/${applicationId}/documents`);
              }}
              variant="contained"
              startIcon={<ArrowForwardIcon />}
            >
              Continue Application
            </Button>
          </>
        );

      case 'search':
        return (
          <>
            <Button onClick={() => setShowSuccess(false)} variant="outlined">
              Continue Editing
            </Button>
            <Button
              onClick={() => {
                setShowSuccess(false);
                navigate('/dashboard/persons/search');
              }}
              variant="contained"
              startIcon={<ArrowBackIcon />}
            >
              Back to Search
            </Button>
          </>
        );

      case 'standalone':
      default:
        return (
          <>
            <Button onClick={() => setShowSuccess(false)} variant="outlined">
              Continue Editing
            </Button>
            <Button
              onClick={() => {
                setShowSuccess(false);
                // Reset form by re-mounting component
                window.location.reload();
              }}
              variant="contained"
              startIcon={<PersonAddIcon />}
            >
              Create New Person
            </Button>
          </>
        );
    }
  };

  const getContextTitle = () => {
    switch (context) {
      case 'application':
        return `Application ${applicationId} - Person Details`;
      case 'search':
        return 'Edit Person Details';
      case 'standalone':
      default:
        return 'Person Management';
    }
  };

  const getContextSubtitle = () => {
    switch (context) {
      case 'application':
        return 'Add or find the person for this driver\'s license application.';
      case 'search':
        return 'Update person information and return to search results.';
      case 'standalone':
      default:
        return 'Register new Madagascar citizens for driver\'s license applications.';
    }
  };

  return (
    <>
      <PersonFormWrapper
        mode={context}
        onSuccess={handleSuccess}
        onComplete={handleComplete}
        onCancel={handleCancel}
        title={getContextTitle()}
        subtitle={getContextSubtitle()}
      />

      {/* Custom Success Dialog */}
      <Dialog
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'success.main', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CheckCircleIcon />
            <Box>
              <Typography variant="h6">
                {isEdit ? 'Person Updated Successfully!' : 'Person Created Successfully!'}
              </Typography>
              <Chip 
                label={context.toUpperCase()} 
                size="small" 
                sx={{ bgcolor: 'success.dark', color: 'white', mt: 0.5 }}
              />
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 3 }}>
          {successPerson && (
            <Box>
              <Alert severity="success" sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {successPerson.first_name} {successPerson.surname}
                </Typography>
                <Typography variant="body2">
                  has been successfully {isEdit ? 'updated' : 'created'} in the system.
                </Typography>
              </Alert>

              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Person Details:
                </Typography>
                <Typography variant="body2">
                  <strong>ID:</strong> <code>{successPerson.id}</code>
                </Typography>
                <Typography variant="body2">
                  <strong>Name:</strong> {successPerson.first_name} {successPerson.surname}
                </Typography>
                <Typography variant="body2">
                  <strong>Document:</strong> {successPerson.primary_document || 'Not specified'}
                </Typography>
              </Box>

              {/* Context-specific messages */}
              {context === 'application' && (
                <Alert severity="info">
                  Ready to proceed with document upload and application processing.
                </Alert>
              )}
              {context === 'search' && (
                <Alert severity="info">
                  Person information has been updated. You can continue editing or return to search.
                </Alert>
              )}
              {context === 'standalone' && (
                <Alert severity="info">
                  The person record is now available for license applications and other system processes.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 1 }}>
          {renderSuccessActions()}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PersonFormExample;

// Usage Examples:
//
// 1. In Application Flow:
// <PersonFormExample 
//   context="application" 
//   applicationId="12345"
//   onPersonSelected={(person) => console.log('Person selected:', person)}
//   onCancel={() => navigate('/dashboard/applications')}
// />
//
// 2. In Search Edit:
// <PersonFormExample 
//   context="search"
//   onCancel={() => navigate('/dashboard/persons/search')}
// />
//
// 3. Standalone:
// <PersonFormExample context="standalone" /> 