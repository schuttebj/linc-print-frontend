/**
 * Person Edit Page for Madagascar Driver's License System
 * Dedicated page for editing person records with navigation back to search
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Breadcrumbs,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import PersonFormWrapper from '../../components/PersonFormWrapper';

const PersonEditPage: React.FC = () => {
  const { personId } = useParams<{ personId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasPermission } = useAuth();

  // State for success dialog
  const [showEditSuccess, setShowEditSuccess] = useState(false);
  const [editedPerson, setEditedPerson] = useState<any>(null);

  // Get return context from URL parameters
  const returnTo = searchParams.get('returnTo');
  const searchFilters = searchParams.get('filters');
  const searchQuery = searchParams.get('query');

  const handleEditSuccess = (person: any, isEdit: boolean) => {
    setEditedPerson(person);
    setShowEditSuccess(true);
  };

  const handleEditCancel = () => {
    handleReturnToSearch();
  };

  const handleCreateApplication = () => {
    setShowEditSuccess(false);
    // Navigate to application creation with the person
    navigate(`/dashboard/applications/create?personId=${editedPerson.id}`);
  };

  const handleReturnToSearch = () => {
    setShowEditSuccess(false);
    
    // Construct return URL with preserved search state
    let returnUrl = '/dashboard/persons/search';
    const params = new URLSearchParams();
    
    if (searchFilters) {
      // Decode and apply search filters
      try {
        const filters = JSON.parse(decodeURIComponent(searchFilters));
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== '' && value !== null) {
            params.append(key, String(value));
          }
        });
      } catch (error) {
        console.warn('Failed to parse search filters:', error);
      }
    }
    
    if (searchQuery) {
      params.append('q', searchQuery);
    }
    
    if (params.toString()) {
      returnUrl += `?${params.toString()}`;
    }
    
    navigate(returnUrl);
  };

  // Check permissions
  if (!hasPermission('persons.update')) {
    return (
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
        <Alert severity="error">
          You don't have permission to edit persons. Contact your administrator.
        </Alert>
      </Box>
    );
  }

  if (!personId) {
    return (
      <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
        <Alert severity="error">
          Invalid person ID. Please return to search and try again.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      {/* Header with Breadcrumbs */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link 
            color="inherit" 
            onClick={handleReturnToSearch}
            sx={{ cursor: 'pointer', textDecoration: 'none' }}
          >
            Person Search
          </Link>
          <Typography color="text.primary">Edit Person</Typography>
        </Breadcrumbs>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1">
            Edit Person
          </Typography>
          
          <Button
            variant="outlined"
            onClick={handleReturnToSearch}
            startIcon={<ArrowBackIcon />}
          >
            Back to Search
          </Button>
        </Box>
        
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Update person information and return to search results.
        </Typography>
      </Box>

      {/* Person Form */}
      <PersonFormWrapper
        mode="search"
        onSuccess={handleEditSuccess}
        onCancel={handleEditCancel}
        initialPersonId={personId}
        title="Edit Person Information"
        subtitle="Update the person's details below. All changes will be saved to the system."
        showHeader={false}
        skipFirstStep={true}
      />

      {/* Edit Success Dialog - Blue Corporate Style */}
      <Dialog
        open={showEditSuccess}
        onClose={() => setShowEditSuccess(false)}
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
              <CheckCircleIcon fontSize="large" />
            </Box>
            <Box>
              <Typography variant="h5">
                Person Updated Successfully
              </Typography>
              <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                Ready for next action
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 4 }}>
          {editedPerson && (
            <Box>
              <Alert severity="success" sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  ✅ Update Complete
                </Typography>
                <Typography variant="body2">
                  Changes to {editedPerson.first_name} {editedPerson.surname} have been saved to the system.
                </Typography>
              </Alert>

              <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
                <Box sx={{ flex: 1, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="primary.dark">Updated Person:</Typography>
                  <Typography variant="h6">{editedPerson.first_name} {editedPerson.surname}</Typography>
                </Box>
                <Box sx={{ flex: 1, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="primary.dark">Person ID:</Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                    {editedPerson.id}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, borderLeft: '4px solid', borderColor: 'primary.main' }}>
                <Typography variant="body2" color="text.secondary">
                  💡 <strong>Next Steps:</strong> You can create a new driver's license application for this person or continue searching for other records.
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button onClick={handleReturnToSearch} variant="outlined" color="primary">
            Continue Searching
          </Button>
          <Button 
            onClick={handleCreateApplication} 
            variant="contained" 
            size="large" 
            color="primary"
            startIcon={<AssignmentIcon />}
            sx={{ px: 4 }}
          >
            Create Application →
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PersonEditPage; 