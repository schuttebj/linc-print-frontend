/**
 * ApplicationFormPage for Madagascar License System
 * Main page for creating and editing license applications
 */

import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Container, Paper } from '@mui/material';
import DashboardLayout from '../../layouts/DashboardLayout';
import ApplicationFormWrapper from '../../components/applications/ApplicationFormWrapper';
import { Application } from '../../types';

const ApplicationFormPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get URL parameters
  const mode = (searchParams.get('mode') as 'create' | 'edit' | 'continue') || 'create';
  const personId = searchParams.get('personId') || undefined;
  const applicationId = searchParams.get('applicationId') || undefined;

  const handleSuccess = (application: Application, isEdit: boolean) => {
    // Navigate to application details or applications list
    navigate(`/applications/${application.id}`, {
      state: { 
        message: isEdit 
          ? 'Application updated successfully' 
          : 'Application created successfully',
        application 
      }
    });
  };

  const handleCancel = () => {
    // Navigate back to applications list
    navigate('/applications');
  };

  const handleComplete = (application: Application) => {
    // Navigate to application details with success message
    navigate(`/applications/${application.id}`, {
      state: { 
        message: 'Application submitted successfully!',
        application 
      }
    });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <ApplicationFormWrapper
        mode={mode}
        initialPersonId={personId}
        initialApplicationId={applicationId}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
        onComplete={handleComplete}
        title={
          mode === 'create' 
            ? 'New License Application'
            : mode === 'edit'
            ? 'Edit License Application'
            : 'Continue License Application'
        }
        subtitle={
          mode === 'create'
            ? 'Create a new driver\'s license application for Madagascar'
            : mode === 'edit'
            ? 'Modify existing license application details'
            : 'Continue processing license application'
        }
      />
    </Container>
  );
};

export default ApplicationFormPage;