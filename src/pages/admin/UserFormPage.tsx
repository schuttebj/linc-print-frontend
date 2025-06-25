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
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', py: 3 }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
        {/* Header with Back Button */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
        </Paper>

        {/* User Form */}
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