/**
 * Application Detail Page for Madagascar Driver's License System
 * Read-only view of application details with all related information
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Stack,
  Divider,
  Alert,
  CircularProgress,
  Button,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  Edit as EditIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  CameraAlt as PhotoIcon,
  Create as SignatureIcon,
  Fingerprint as FingerprintIcon,
  AttachMoney as FeeIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

import { useAuth } from '../../contexts/AuthContext';
import { applicationService } from '../../services/applicationService';
import { Application, ApplicationStatus } from '../../types';

const ApplicationDetailPage: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // State
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load application details
  useEffect(() => {
    if (!applicationId) return;
    
    loadApplicationDetails();
  }, [applicationId]);

  const loadApplicationDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await applicationService.getApplication(applicationId!);
      setApplication(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load application details');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: ApplicationStatus): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case ApplicationStatus.DRAFT:
        return 'default';
      case ApplicationStatus.SUBMITTED:
        return 'info';
      case ApplicationStatus.PAID:
        return 'primary';
      case ApplicationStatus.PASSED:
        return 'success';
      case ApplicationStatus.FAILED:
      case ApplicationStatus.ABSENT:
      case ApplicationStatus.REJECTED:
      case ApplicationStatus.CANCELLED:
        return 'error';
      case ApplicationStatus.ON_HOLD:
        return 'warning';
      case ApplicationStatus.APPROVED:
      case ApplicationStatus.COMPLETED:
        return 'success';
      case ApplicationStatus.SENT_TO_PRINTER:
      case ApplicationStatus.CARD_PRODUCTION:
        return 'primary';
      case ApplicationStatus.READY_FOR_COLLECTION:
        return 'info';
      default:
        return 'primary';
    }
  };

  const getApplicationTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      'NEW_LICENSE': 'New License',
      'LEARNERS_PERMIT': "Learner's Permit",
      'PROFESSIONAL_PERMIT': 'Professional Permit',
      'TEMPORARY_LICENSE': 'Temporary License',
      'RENEWAL': 'License Renewal',
      'DUPLICATE': 'Duplicate License',
      'FOREIGN_CONVERSION': 'Foreign License Conversion',
      'INTERNATIONAL_PERMIT': 'International Permit',
      'DRIVERS_LICENSE_CAPTURE': "Driver's License Capture",
      'LEARNERS_PERMIT_CAPTURE': "Learner's Permit Capture"
    };
    return typeLabels[type] || type.replace(/_/g, ' ');
  };

  const handleBack = () => {
    navigate('/dashboard/applications');
  };

  const handleEdit = () => {
    if (!application) return;
    navigate(`/dashboard/applications/edit/${application.id}`);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={48} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={loadApplicationDetails}>
              Retry
            </Button>
          }
        >
          <Typography variant="h6">Error loading application</Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
      </Container>
    );
  }

  if (!application) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">
          Application not found
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <IconButton onClick={handleBack}>
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h4" component="h1">
              Application Details
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Application #{application.application_number || application.id?.substring(0, 8)}
            </Typography>
          </Box>
          <Chip
            label={application.status.replace(/_/g, ' ')}
            color={getStatusColor(application.status)}
            size="medium"
          />
        </Stack>
        
        {hasPermission('applications.update') && application.status === ApplicationStatus.DRAFT && (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={handleEdit}
          >
            Edit Application
          </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Application Overview */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <AssignmentIcon sx={{ mr: 1 }} />
                Application Information
              </Typography>
              
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Application Type</Typography>
                  <Typography variant="body1">{getApplicationTypeLabel(application.application_type)}</Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">License Category</Typography>
                  <Typography variant="body1">{application.license_category}</Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Chip
                    label={application.status.replace(/_/g, ' ')}
                    color={getStatusColor(application.status)}
                    size="small"
                  />
                </Box>

                {application.test_result && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">Test Result</Typography>
                    <Chip
                      label={application.test_result}
                      color={application.test_result === 'PASSED' ? 'success' : 'error'}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                )}

                {application.is_urgent && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">Urgency</Typography>
                    <Chip label="URGENT" color="warning" size="small" />
                    {application.urgency_reason && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Reason: {application.urgency_reason}
                      </Typography>
                    )}
                  </Box>
                )}

                {application.is_temporary_license && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">Temporary License</Typography>
                    <Typography variant="body1">
                      Valid for {application.validity_period_days || 90} days
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Applicant Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ mr: 1 }} />
                Applicant Information
              </Typography>
              
              {application.person ? (
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Full Name</Typography>
                    <Typography variant="body1">
                      {application.person.first_name} {application.person.middle_name || ''} {application.person.surname}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">Date of Birth</Typography>
                    <Typography variant="body1">
                      {application.person.birth_date ? formatDate(application.person.birth_date) : 'N/A'}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">Nationality</Typography>
                    <Typography variant="body1">{application.person.nationality_code || 'N/A'}</Typography>
                  </Box>
                  
                  {application.person.cell_phone && (
                    <Box>
                      <Typography variant="body2" color="text.secondary">Phone</Typography>
                      <Typography variant="body1">
                        +261 {application.person.cell_phone}
                      </Typography>
                    </Box>
                  )}
                  
                  {application.person.email && (
                    <Box>
                      <Typography variant="body2" color="text.secondary">Email</Typography>
                      <Typography variant="body1">{application.person.email}</Typography>
                    </Box>
                  )}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Person ID: {application.person_id}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Requirements & Documents */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckIcon sx={{ mr: 1 }} />
                Requirements & Documents
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    {application.medical_certificate_required ? 
                      (application.medical_certificate_provided ? <CheckIcon color="success" /> : <WarningIcon color="warning" />) :
                      <InfoIcon color="disabled" />
                    }
                  </ListItemIcon>
                  <ListItemText 
                    primary="Medical Certificate"
                    secondary={
                      application.medical_certificate_required ? 
                        (application.medical_certificate_provided ? 'Provided' : 'Required') :
                        'Not required'
                    }
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    {application.parental_consent_required ? 
                      (application.parental_consent_provided ? <CheckIcon color="success" /> : <WarningIcon color="warning" />) :
                      <InfoIcon color="disabled" />
                    }
                  </ListItemIcon>
                  <ListItemText 
                    primary="Parental Consent"
                    secondary={
                      application.parental_consent_required ? 
                        (application.parental_consent_provided ? 'Provided' : 'Required') :
                        'Not required'
                    }
                  />
                </ListItem>
                
                {application.requires_existing_license && (
                  <ListItem>
                    <ListItemIcon>
                      {application.existing_license_verified ? <CheckIcon color="success" /> : <WarningIcon color="warning" />}
                    </ListItemIcon>
                    <ListItemText 
                      primary="Existing License Verification"
                      secondary={application.existing_license_verified ? 'Verified' : 'Pending verification'}
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Biometric Data Display */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <PhotoIcon sx={{ mr: 1 }} />
                Biometric Data
              </Typography>
              
              <Grid container spacing={3}>
                {/* Photo Display */}
                <Grid item xs={12} md={4}>
                  <Paper 
                    elevation={2} 
                    sx={{ 
                      p: 2, 
                      textAlign: 'center',
                      minHeight: 300,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      <PhotoIcon sx={{ mr: 1 }} />
                      Photo
                    </Typography>
                    {(() => {
                      const photoData = application.biometric_data?.find(bd => bd.data_type === 'PHOTO');
                      if (photoData) {
                        return (
                          <Box>
                            <img
                              src={`https://linc-print-backend.onrender.com/api/v1/applications/files/${photoData.file_path}`}
                              alt="Application Photo"
                              style={{
                                maxWidth: '200px',
                                maxHeight: '200px',
                                objectFit: 'cover',
                                border: '2px solid #ddd',
                                borderRadius: '8px'
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.setAttribute('style', 'display: block');
                              }}
                            />
                            <Box sx={{ display: 'none', color: 'error.main' }}>
                              <WarningIcon sx={{ fontSize: 24, mb: 1 }} />
                              <Typography variant="caption">Failed to load photo</Typography>
                            </Box>
                            <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                              Captured: {new Date(photoData.created_at || '').toLocaleDateString()}
                            </Typography>
                          </Box>
                        );
                      }
                      return (
                        <Box sx={{ color: 'text.secondary' }}>
                          <WarningIcon sx={{ fontSize: 48, mb: 1 }} />
                          <Typography variant="body2">No photo captured</Typography>
                        </Box>
                      );
                    })()}
                  </Paper>
                </Grid>

                {/* Signature Display */}
                <Grid item xs={12} md={4}>
                  <Paper 
                    elevation={2} 
                    sx={{ 
                      p: 2, 
                      textAlign: 'center',
                      minHeight: 300,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      <SignatureIcon sx={{ mr: 1 }} />
                      Signature
                    </Typography>
                    {(() => {
                      const signatureData = application.biometric_data?.find(bd => bd.data_type === 'SIGNATURE');
                      if (signatureData) {
                        return (
                          <Box>
                            <img
                              src={`https://linc-print-backend.onrender.com/api/v1/applications/files/${signatureData.file_path}`}
                              alt="Application Signature"
                              style={{
                                maxWidth: '200px',
                                maxHeight: '100px',
                                objectFit: 'contain',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                backgroundColor: 'white'
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.setAttribute('style', 'display: block');
                              }}
                            />
                            <Box sx={{ display: 'none', color: 'error.main' }}>
                              <WarningIcon sx={{ fontSize: 24, mb: 1 }} />
                              <Typography variant="caption">Failed to load signature</Typography>
                            </Box>
                            <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                              Captured: {new Date(signatureData.created_at || '').toLocaleDateString()}
                            </Typography>
                          </Box>
                        );
                      }
                      return (
                        <Box sx={{ color: 'text.secondary' }}>
                          <WarningIcon sx={{ fontSize: 48, mb: 1 }} />
                          <Typography variant="body2">No signature captured</Typography>
                        </Box>
                      );
                    })()}
                  </Paper>
                </Grid>

                {/* Fingerprint Display */}
                <Grid item xs={12} md={4}>
                  <Paper 
                    elevation={2} 
                    sx={{ 
                      p: 2, 
                      textAlign: 'center',
                      minHeight: 300,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      <FingerprintIcon sx={{ mr: 1 }} />
                      Fingerprint
                    </Typography>
                    {(() => {
                      const fingerprintData = application.biometric_data?.find(bd => bd.data_type === 'FINGERPRINT');
                      if (fingerprintData) {
                        return (
                          <Box>
                            <img
                              src={`https://linc-print-backend.onrender.com/api/v1/applications/files/${fingerprintData.file_path}`}
                              alt="Application Fingerprint"
                              style={{
                                maxWidth: '150px',
                                maxHeight: '150px',
                                objectFit: 'contain',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                backgroundColor: 'white'
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.setAttribute('style', 'display: block');
                              }}
                            />
                            <Box sx={{ display: 'none', color: 'error.main' }}>
                              <WarningIcon sx={{ fontSize: 24, mb: 1 }} />
                              <Typography variant="caption">Failed to load fingerprint</Typography>
                            </Box>
                            <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                              Captured: {new Date(fingerprintData.created_at || '').toLocaleDateString()}
                            </Typography>
                          </Box>
                        );
                      }
                      return (
                        <Box sx={{ color: 'text.secondary' }}>
                          <InfoIcon sx={{ fontSize: 48, mb: 1 }} />
                          <Typography variant="body2">No fingerprint captured</Typography>
                          <Typography variant="caption">(Optional)</Typography>
                        </Box>
                      );
                    })()}
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Timestamps */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <CalendarIcon sx={{ mr: 1 }} />
                Timeline
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Created</Typography>
                    <Typography variant="body1">{formatDate(application.created_at)}</Typography>
                  </Box>
                </Grid>
                
                {application.submitted_at && (
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Submitted</Typography>
                      <Typography variant="body1">{formatDate(application.submitted_at)}</Typography>
                    </Box>
                  </Grid>
                )}
                
                {application.approved_at && (
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Approved</Typography>
                      <Typography variant="body1">{formatDate(application.approved_at)}</Typography>
                    </Box>
                  </Grid>
                )}
                
                {application.completed_at && (
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Completed</Typography>
                      <Typography variant="body1">{formatDate(application.completed_at)}</Typography>
                    </Box>
                  </Grid>
                )}
                
                {application.rejected_at && (
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Rejected</Typography>
                      <Typography variant="body1">{formatDate(application.rejected_at)}</Typography>
                      {application.rejection_reason && (
                        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                          Reason: {application.rejection_reason}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ApplicationDetailPage; 