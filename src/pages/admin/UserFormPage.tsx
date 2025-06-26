/**
 * User Form Page - Standalone page for creating and editing users
 * Madagascar LINC Print System
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import UserFormWrapper from '../../components/UserFormWrapper';

const UserFormPage: React.FC = () => {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  
  const isEditMode = Boolean(userId);
  
  const handleSuccess = (user: any, isEdit: boolean) => {
    // Navigate back to user management page with success message
    navigate('/dashboard/admin/users', { 
      state: { 
        successMessage: `User ${user.first_name} ${user.last_name} has been ${isEdit ? 'updated' : 'created'} successfully!` 
      } 
    });
  };
  
  const handleCancel = () => {
    navigate('/dashboard/admin/users');
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Header with Back Button */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, px: 3, pt: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleCancel}
          variant="outlined"
        >
          Back to Users
        </Button>
        <Box>
          <Typography variant="h4" component="h1">
            {isEditMode ? 'Edit User' : 'Create New User'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {isEditMode 
              ? 'Update user information and permissions' 
              : 'Create a new user account with appropriate role and permissions'
            }
          </Typography>
        </Box>
      </Box>

      {/* User Form */}
      <Box sx={{ px: 3, pb: 3 }}>
        <UserFormWrapper
          mode={isEditMode ? 'edit' : 'create'}
          userId={userId}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </Box>
    </Box>
  );
};

export default UserFormPage; 