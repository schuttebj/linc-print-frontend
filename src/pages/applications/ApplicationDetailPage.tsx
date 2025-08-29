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
import { API_BASE_URL } from '../../config/api';

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
    <Container maxWidth="lg" sx={{ py: 1, height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 1.5,
          mb: 1,
          bgcolor: 'white',
          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
          borderRadius: 2,
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <IconButton onClick={handleBack} size="small">
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '1rem', mb: 0 }}>
              Application Details
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              #{application.application_number || application.id?.substring(0, 8)}
            </Typography>
          </Box>
          <Chip
            label={application.status.replace(/_/g, ' ')}
            color={getStatusColor(application.status)}
            size="small"
            sx={{ fontSize: '0.7rem', height: 24 }}
          />
        </Stack>
        
        {hasPermission('applications.update') && application.status === ApplicationStatus.DRAFT && (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={handleEdit}
            size="small"
            sx={{ fontSize: '0.8rem' }}
          >
            Edit Application
          </Button>
        )}
      </Paper>

      {/* Content Area */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Grid container spacing={1}>
          {/* Application Overview */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={0}
              sx={{ 
                bgcolor: 'white',
                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                borderRadius: 2,
                p: 1.5,
                mb: 1
              }}
            >
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                <AssignmentIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                Application Information
              </Typography>
              
              <Grid container spacing={1}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Type</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                    {getApplicationTypeLabel(application.application_type)}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Category</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                    {application.license_category}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Status</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={application.status.replace(/_/g, ' ')}
                      color={getStatusColor(application.status)}
                      size="small"
                      sx={{ fontSize: '0.7rem', height: 20 }}
                    />
                  </Box>
                </Grid>

                {application.test_result && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Test Result</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={application.test_result}
                        color={application.test_result === 'PASSED' ? 'success' : 'error'}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    </Box>
                  </Grid>
                )}

                {application.is_urgent && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Urgency</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip label="URGENT" color="warning" size="small" sx={{ fontSize: '0.7rem', height: 20 }} />
                      {application.urgency_reason && (
                        <Typography variant="body2" sx={{ mt: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>
                          {application.urgency_reason}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                )}

                {application.is_temporary_license && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Validity</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {application.validity_period_days || 90} days
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>

          {/* Applicant Information */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={0}
              sx={{ 
                bgcolor: 'white',
                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                borderRadius: 2,
                p: 1.5,
                mb: 1
              }}
            >
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                <PersonIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                Applicant Information
              </Typography>
              
              {application.person ? (
                <Grid container spacing={1}>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Full Name</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {application.person.surname}, {application.person.first_name} {application.person.middle_name || ''}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Date of Birth</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {application.person.birth_date ? new Date(application.person.birth_date).toLocaleDateString('en-GB') : 'N/A'}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Nationality</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {application.person.nationality_code || 'N/A'}
                    </Typography>
                  </Grid>
                  
                  {application.person.cell_phone && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Phone</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                        +261 {application.person.cell_phone}
                      </Typography>
                    </Grid>
                  )}
                  
                  {application.person.email && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Email</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                        {application.person.email}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                  Person ID: {application.person_id}
                </Typography>
              )}
            </Paper>
          </Grid>

          {/* Requirements & Documents */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={0}
              sx={{ 
                bgcolor: 'white',
                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                borderRadius: 2,
                p: 1.5,
                mb: 1
              }}
            >
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                <CheckIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                Requirements & Documents
              </Typography>
              
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    {application.medical_certificate_required ? 
                      (application.medical_certificate_provided ? 
                        <CheckIcon color="success" sx={{ fontSize: '1rem' }} /> : 
                        <WarningIcon color="warning" sx={{ fontSize: '1rem' }} />) :
                      <InfoIcon color="disabled" sx={{ fontSize: '1rem' }} />
                    }
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                        Medical Certificate
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        {application.medical_certificate_required ? 
                          (application.medical_certificate_provided ? 'Provided' : 'Required') :
                          'Not required'
                        }
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    {application.parental_consent_required ? 
                      (application.parental_consent_provided ? 
                        <CheckIcon color="success" sx={{ fontSize: '1rem' }} /> : 
                        <WarningIcon color="warning" sx={{ fontSize: '1rem' }} />) :
                      <InfoIcon color="disabled" sx={{ fontSize: '1rem' }} />
                    }
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                        Parental Consent
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        {application.parental_consent_required ? 
                          (application.parental_consent_provided ? 'Provided' : 'Required') :
                          'Not required'
                        }
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                
                {application.requires_existing_license && (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      {application.existing_license_verified ? 
                        <CheckIcon color="success" sx={{ fontSize: '1rem' }} /> : 
                        <WarningIcon color="warning" sx={{ fontSize: '1rem' }} />
                      }
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                          License Verification
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          {application.existing_license_verified ? 'Verified' : 'Pending verification'}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>

          {/* Biometric Data Display */}
          <Grid item xs={12}>
            <Paper 
              elevation={0}
              sx={{ 
                bgcolor: 'white',
                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                borderRadius: 2,
                p: 1.5,
                mb: 1
              }}
            >
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                <PhotoIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                Biometric Data
              </Typography>
              
              <Grid container spacing={2}>
                {/* Photo Display */}
                <Grid item xs={12} md={4}>
                  <Box 
                    sx={{ 
                      p: 1, 
                      border: '1px solid #e0e0e0', 
                      borderRadius: 1, 
                      backgroundColor: '#fafafa',
                      textAlign: 'center',
                      minHeight: 200
                    }}
                  >
                    <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, fontSize: '0.8rem', mb: 1 }}>
                      <PhotoIcon sx={{ mr: 0.5, fontSize: '0.9rem' }} />
                      Photo
                    </Typography>
                    {(() => {
                      // Find the most recent photo from biometric_data array
                      const photoData = application.biometric_data?.find(item => item.data_type === 'PHOTO');
                      if (photoData && photoData.file_url) {
                        return (
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <img
                              src={`${API_BASE_URL}${photoData.file_url}`}
                              alt="Application Photo"
                              style={{
                                maxWidth: '100px',
                                maxHeight: '120px',
                                objectFit: 'cover',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                marginBottom: '8px'
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.setAttribute('style', 'display: block');
                              }}
                            />
                            <Box sx={{ display: 'none', color: 'error.main', textAlign: 'center' }}>
                              <WarningIcon sx={{ fontSize: 20, mb: 1 }} />
                              <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>Failed to load</Typography>
                            </Box>
                            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', textAlign: 'center' }}>
                              {photoData.file_size ? `${Math.round(photoData.file_size / 1024)}KB` : 'Unknown'} | 
                              {new Date(photoData.created_at || '').toLocaleDateString()}
                            </Typography>
                          </Box>
                        );
                      }
                      return (
                        <Box sx={{ color: 'text.secondary', py: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <PhotoIcon sx={{ fontSize: 32, mb: 1, opacity: 0.5 }} />
                          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>No photo captured</Typography>
                        </Box>
                      );
                    })()}
                  </Box>
                </Grid>

                {/* Signature Display */}
                <Grid item xs={12} md={4}>
                  <Box 
                    sx={{ 
                      p: 1, 
                      border: '1px solid #e0e0e0', 
                      borderRadius: 1, 
                      backgroundColor: '#fafafa',
                      textAlign: 'center',
                      minHeight: 200
                    }}
                  >
                    <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, fontSize: '0.8rem', mb: 1 }}>
                      <SignatureIcon sx={{ mr: 0.5, fontSize: '0.9rem' }} />
                      Signature
                    </Typography>
                    {(() => {
                      // Find signature from biometric_data array
                      const signatureData = application.biometric_data?.find(item => item.data_type === 'SIGNATURE');
                      if (signatureData && signatureData.file_url) {
                        return (
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <img
                              src={`${API_BASE_URL}${signatureData.file_url}`}
                              alt="Application Signature"
                              style={{
                                maxWidth: '150px',
                                maxHeight: '80px',
                                objectFit: 'contain',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                backgroundColor: 'white',
                                marginBottom: '8px'
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.setAttribute('style', 'display: block');
                              }}
                            />
                            <Box sx={{ display: 'none', color: 'error.main', textAlign: 'center' }}>
                              <WarningIcon sx={{ fontSize: 20, mb: 1 }} />
                              <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>Failed to load</Typography>
                            </Box>
                            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', textAlign: 'center' }}>
                              {signatureData.file_size ? `${Math.round(signatureData.file_size / 1024)}KB` : 'Unknown'} | 
                              {new Date(signatureData.created_at || '').toLocaleDateString()}
                            </Typography>
                          </Box>
                        );
                      }

                      return (
                        <Box sx={{ color: 'text.secondary', py: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <SignatureIcon sx={{ fontSize: 32, mb: 1, opacity: 0.5 }} />
                          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>No signature captured</Typography>
                        </Box>
                      );
                    })()}
                  </Box>
                </Grid>

                {/* Fingerprint Display */}
                <Grid item xs={12} md={4}>
                  <Box 
                    sx={{ 
                      p: 1, 
                      border: '1px solid #e0e0e0', 
                      borderRadius: 1, 
                      backgroundColor: '#fafafa',
                      textAlign: 'center',
                      minHeight: 200
                    }}
                  >
                    <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, fontSize: '0.8rem', mb: 1 }}>
                      <FingerprintIcon sx={{ mr: 0.5, fontSize: '0.9rem' }} />
                      Fingerprint
                    </Typography>
                    {(() => {
                      // Find fingerprint from biometric_data array
                      const fingerprintData = application.biometric_data?.find(item => item.data_type === 'FINGERPRINT');
                      if (fingerprintData && fingerprintData.file_url) {
                        return (
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <img
                              src={`${API_BASE_URL}${fingerprintData.file_url}`}
                              alt="Application Fingerprint"
                              style={{
                                maxWidth: '100px',
                                maxHeight: '120px',
                                objectFit: 'contain',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                backgroundColor: 'white',
                                marginBottom: '8px'
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.setAttribute('style', 'display: block');
                              }}
                            />
                            <Box sx={{ display: 'none', color: 'error.main', textAlign: 'center' }}>
                              <WarningIcon sx={{ fontSize: 20, mb: 1 }} />
                              <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>Failed to load</Typography>
                            </Box>
                            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', textAlign: 'center' }}>
                              {fingerprintData.file_size ? `${Math.round(fingerprintData.file_size / 1024)}KB` : 'Unknown'} | 
                              {new Date(fingerprintData.created_at || '').toLocaleDateString()}
                            </Typography>
                          </Box>
                        );
                      }

                      return (
                        <Box sx={{ color: 'text.secondary', py: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <FingerprintIcon sx={{ fontSize: 32, mb: 1, opacity: 0.5 }} />
                          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>No fingerprint captured</Typography>
                        </Box>
                      );
                    })()}
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Timeline */}
          <Grid item xs={12}>
            <Paper 
              elevation={0}
              sx={{ 
                bgcolor: 'white',
                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                borderRadius: 2,
                p: 1.5,
                mb: 1
              }}
            >
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                <CalendarIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                Timeline
              </Typography>
              
              <Grid container spacing={1}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Created</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                    {new Date(application.created_at).toLocaleDateString('en-GB')}
                  </Typography>
                </Grid>
                
                {application.submitted_at && (
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Submitted</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {new Date(application.submitted_at).toLocaleDateString('en-GB')}
                    </Typography>
                  </Grid>
                )}
                
                {application.approved_at && (
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Approved</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {new Date(application.approved_at).toLocaleDateString('en-GB')}
                    </Typography>
                  </Grid>
                )}
                
                {application.completed_at && (
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Completed</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {new Date(application.completed_at).toLocaleDateString('en-GB')}
                    </Typography>
                  </Grid>
                )}
                
                {application.rejected_at && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Rejected</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {new Date(application.rejected_at).toLocaleDateString('en-GB')}
                    </Typography>
                    {application.rejection_reason && (
                      <Typography variant="body2" color="error" sx={{ mt: 0.5, fontSize: '0.75rem' }}>
                        Reason: {application.rejection_reason}
                      </Typography>
                    )}
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default ApplicationDetailPage; 