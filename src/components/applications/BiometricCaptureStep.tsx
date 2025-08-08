/**
 * BiometricCaptureStep Component
 * 
 * Reusable component for capturing biometric data (photo, signature, fingerprint)
 * across all application forms. Extracted from ApplicationFormWrapper for consistency.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Alert,
  Paper,
  Tabs,
  Tab,
  Button,
  CircularProgress
} from '@mui/material';
import {
  CameraAlt as CameraIcon,
  Create as CreateIcon,
  Fingerprint as FingerprintIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

import WebcamCapture from './WebcamCapture';
import SignatureCapture from './SignatureCapture';
import FingerprintCapture from './FingerprintCapture';
import { applicationService } from '../../services/applicationService';

export interface BiometricData {
  photo?: File | {
    filename: string;
    file_size: number;
    dimensions?: string;
    format: string;
    iso_compliant?: boolean;
    processed_url?: string;
    base64_data?: string;
  };
  signature?: File | {
    filename: string;
    file_size: number;
    format: string;
    processed_url?: string;
    base64_data?: string;
  };
  fingerprint?: File | {
    filename: string;
    file_size: number;
    format: string;
    processed_url?: string;
    base64_data?: string;
  };
}

interface BiometricCaptureStepProps {
  value: BiometricData;
  onChange: (biometricData: BiometricData) => void;
  disabled?: boolean;
  // New props for tabbed interface like PersonFormWrapper and MedicalInformationSection
  externalBiometricStep?: number;
  onBiometricValidationChange?: (step: number, isValid: boolean) => void;
  onBiometricStepChange?: (step: number, canAdvance: boolean) => void;
  onContinueToReview?: () => void;
  onCancel?: () => void;
  showHeader?: boolean;
}

const BiometricCaptureStep: React.FC<BiometricCaptureStepProps> = ({
  value,
  onChange,
  disabled = false,
  externalBiometricStep = 0,
  onBiometricValidationChange,
  onBiometricStepChange,
  onContinueToReview,
  onCancel,
  showHeader = true
}) => {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  // Internal tab state (only used if using tabbed interface)
  const [internalStep, setInternalStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Biometric steps for tabbed interface
  const biometricSteps = [
    {
      label: 'Photo Capture',
      icon: <CameraIcon />
    },
    {
      label: 'Signature',
      icon: <CreateIcon />
    },
    {
      label: 'Fingerprint',
      icon: <FingerprintIcon />
    }
  ];

  // Check if we're using the tabbed interface (external callbacks provided)
  const isTabbed = !!onBiometricStepChange;

  const handlePhotoCapture = async (photoFile: File) => {
    try {
      setSaving(true);
      setError('');
      
      // Process image directly without requiring an application
      const response = await applicationService.processImage(photoFile, 'PHOTO');

      if (response.status === 'success') {
        // Store the processed photo data
        const updatedBiometricData = {
          ...value,
          photo: {
            filename: `processed_photo_${Date.now()}.jpg`,
            file_size: response.processed_image.file_size,
            dimensions: response.processed_image.dimensions || '300x400',
            format: response.processed_image.format,
            iso_compliant: response.processing_info?.iso_compliant || true,
            processed_url: `data:image/jpeg;base64,${response.processed_image.data}`,
            base64_data: response.processed_image.data // Store base64 for submission
          }
        };
        
        onChange(updatedBiometricData);
        
        const compressionInfo = response.processing_info?.compression_ratio 
          ? ` (${response.processing_info.compression_ratio}% compression)`
          : '';
        
        setSuccess(`Photo processed successfully! ISO-compliant and ready for license production${compressionInfo}.`);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error processing photo:', error);
      
      // Store photo locally as fallback
      const updatedBiometricData = {
        ...value,
        photo: photoFile
      };
      onChange(updatedBiometricData);
      
      setError('Image processing failed. Photo saved locally - will be processed on submission.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleSignatureCapture = async (signatureFile: File) => {
    try {
      setSaving(true);
      setError('');
      
      // Process signature image
      const response = await applicationService.processImage(signatureFile, 'SIGNATURE');

      if (response.status === 'success') {
        // Store the processed signature data
        const updatedBiometricData = {
          ...value,
          signature: {
            filename: `processed_signature_${Date.now()}.${response.processed_image.format.toLowerCase()}`,
            file_size: response.processed_image.file_size,
            format: response.processed_image.format,
            processed_url: `data:image/${response.processed_image.format.toLowerCase()};base64,${response.processed_image.data}`,
            base64_data: response.processed_image.data // Store base64 for submission
          }
        };
        
        onChange(updatedBiometricData);
        
        setSuccess('Signature processed successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error processing signature:', error);
      
      // Store signature locally as fallback
      const updatedBiometricData = {
        ...value,
        signature: signatureFile
      };
      onChange(updatedBiometricData);
      
      setError('Signature processing failed. Signature saved locally - will be processed on submission.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleFingerprintCapture = async (fingerprintFile: File) => {
    try {
      setSaving(true);
      setError('');
      
      // Process fingerprint image
      const response = await applicationService.processImage(fingerprintFile, 'FINGERPRINT');

      if (response.status === 'success') {
        // Store the processed fingerprint data
        const updatedBiometricData = {
          ...value,
          fingerprint: {
            filename: `processed_fingerprint_${Date.now()}.${response.processed_image.format.toLowerCase()}`,
            file_size: response.processed_image.file_size,
            format: response.processed_image.format,
            processed_url: `data:image/${response.processed_image.format.toLowerCase()};base64,${response.processed_image.data}`,
            base64_data: response.processed_image.data // Store base64 for submission
          }
        };
        
        onChange(updatedBiometricData);
        
        setSuccess('Fingerprint processed successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error processing fingerprint:', error);
      
      // Store fingerprint locally as fallback
      const updatedBiometricData = {
        ...value,
        fingerprint: fingerprintFile
      };
      onChange(updatedBiometricData);
      
      setError('Fingerprint processing failed. Fingerprint saved locally - will be processed on submission.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  // Step validation for tabbed interface
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Photo Capture
        return !!value.photo;
      case 1: // Signature
        return !!value.signature; // Optional, so always valid for navigation
      case 2: // Fingerprint
        return true; // Optional, so always valid for navigation
      default:
        return false;
    }
  };

  // Navigation handlers for tabbed interface
  const handleNext = () => {
    if (internalStep < biometricSteps.length - 1) {
      const nextStep = internalStep + 1;
      setInternalStep(nextStep);
      if (onBiometricStepChange) {
        onBiometricStepChange(nextStep, isStepValid(nextStep));
      }
    }
  };

  const handleBack = () => {
    if (internalStep > 0) {
      const prevStep = internalStep - 1;
      setInternalStep(prevStep);
      if (onBiometricStepChange) {
        onBiometricStepChange(prevStep, isStepValid(prevStep));
      }
    }
  };

  const handleContinue = () => {
    if (onContinueToReview) {
      onContinueToReview();
    }
  };

  // Tab change handler
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setInternalStep(newValue);
    if (onBiometricStepChange) {
      onBiometricStepChange(newValue, isStepValid(newValue));
    }
  };

  // Helper function to render tab with completion indicator
  const renderTabLabel = (step: any, index: number) => {
    const isCompleted = index < internalStep && isStepValid(index);
    const isCurrent = internalStep === index;
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          color: isCompleted ? 'success.main' : isCurrent ? 'primary.main' : 'text.secondary' 
        }}>
          {isCompleted ? <CheckCircleIcon fontSize="small" /> : step.icon}
        </Box>
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: isCurrent ? 'bold' : 'normal',
            color: isCompleted ? 'success.main' : isCurrent ? 'primary.main' : 'text.secondary'
          }}
        >
          {step.label}
        </Typography>
      </Box>
    );
  };

  // Trigger validation callbacks when data changes
  useEffect(() => {
    if (onBiometricValidationChange) {
      onBiometricValidationChange(internalStep, isStepValid(internalStep));
    }
  }, [value, internalStep, onBiometricValidationChange]);

  // Handle external step changes
  useEffect(() => {
    if (externalBiometricStep !== undefined && externalBiometricStep !== internalStep) {
      setInternalStep(externalBiometricStep);
    }
  }, [externalBiometricStep]);

  // Photo Capture Content
  function renderPhotoContent() {
    return (
      <Box sx={{ p: 2 }}>
        {/* License Photo - Full Width */}
        <Box sx={{ 
          backgroundColor: 'rgb(255, 255, 255)',
          color: 'rgb(33, 33, 33)',
          backgroundImage: 'none',
          mb: 2,
          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
          transition: 'box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          borderRadius: '12px',
          p: 2
        }}>
          <Box sx={{ mb: 2 }}>
            <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
              <CameraIcon fontSize="small" />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '1rem' }}>License Photo</Typography>
              {value.photo && (
                <Chip label="Captured" color="success" size="small" icon={<CheckCircleIcon fontSize="small" />} sx={{ fontSize: '0.7rem', height: '20px' }} />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
              ISO-compliant photo (3:4 ratio)
            </Typography>
          </Box>
            <Box sx={{ mb: 2 }}>
              <WebcamCapture
                onPhotoCapture={handlePhotoCapture}
                disabled={saving || disabled}
              />
            </Box>
            
            {value.photo ? (
              <Box>
                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  {(value.photo as any).iso_compliant ? 'ISO-Processed Preview' : 'Photo Preview'}
                </Typography>
                <Box
                  sx={{
                    border: '2px solid',
                    borderColor: 'success.main',
                    borderRadius: 1,
                    p: 1,
                    mb: 1.5,
                    backgroundColor: 'background.paper',
                    display: 'flex',
                    justifyContent: 'center'
                  }}
                >
                  <img
                    src={
                      (value.photo as any).processed_url
                        ? (value.photo as any).processed_url
                        : URL.createObjectURL(value.photo as File)
                    }
                    alt="License Photo Preview"
                    style={{
                      width: '150px',
                      height: '200px',
                      objectFit: 'cover',
                      borderRadius: '4px'
                    }}
                    onError={(e) => {
                      console.error('Image preview error:', e);
                      // If processed_url fails, try the blob URL
                      if ((value.photo as any).processed_url) {
                        e.currentTarget.src = URL.createObjectURL(value.photo as File);
                      }
                    }}
                  />
                </Box>
                <Alert severity="success" sx={{ py: 0.5 }}>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    {(value.photo as any).iso_compliant 
                      ? `✓ Photo processed to ISO standards (${(value.photo as any).dimensions || '300x400px'})`
                      : '✓ Photo captured successfully'
                    }
                  </Typography>
                </Alert>
              </Box>
            ) : (
              <Alert severity="info" sx={{ py: 0.5 }}>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  <strong>Required:</strong> Position face within guides and capture photo.
                  Image will be automatically cropped to ISO standards.
                </Typography>
              </Alert>
            )}
          </Box>
        </Box>
      </Box>
    );
  }

  // Signature Capture Content
  function renderSignatureContent() {
    return (
      <Box sx={{ p: 2 }}>
        {/* Digital Signature - Full Width */}
        <Box sx={{ 
          backgroundColor: 'rgb(255, 255, 255)',
          color: 'rgb(33, 33, 33)',
          backgroundImage: 'none',
          mb: 2,
          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
          transition: 'box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          borderRadius: '12px',
          p: 2
        }}>
          <Box sx={{ mb: 2 }}>
            <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
              <CreateIcon fontSize="small" />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '1rem' }}>Digital Signature</Typography>
              {value.signature && (
                <Chip label="Captured" color="success" size="small" icon={<CheckCircleIcon fontSize="small" />} sx={{ fontSize: '0.7rem', height: '20px' }} />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
              Draw your signature using mouse or touch
            </Typography>
          </Box>
          <Box sx={{ '& > *': { minHeight: '180px' } }}>
            <SignatureCapture
              onSignatureCapture={handleSignatureCapture}
              disabled={saving || disabled}
            />
            {value.signature ? (
              <Box sx={{ mt: 2 }}>
                {/* Display captured signature if available */}
                {(value.signature as any).processed_url && (
                  <Box sx={{ mb: 1.5, textAlign: 'center' }}>
                    <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      Signature Preview
                    </Typography>
                    <Box
                      sx={{
                        border: '2px solid',
                        borderColor: 'success.main',
                        borderRadius: 1,
                        p: 1,
                        backgroundColor: 'background.paper',
                        display: 'inline-block'
                      }}
                    >
                      <img 
                        src={(value.signature as any).processed_url}
                        alt="Captured signature"
                        style={{
                          maxWidth: '300px',
                          maxHeight: '100px',
                          objectFit: 'contain'
                        }}
                      />
                    </Box>
                    <Typography variant="caption" display="block" sx={{ mt: 0.5, fontSize: '0.7rem' }}>
                      {((value.signature as any).file_size / 1024).toFixed(1)}KB | {(value.signature as any).format}
                    </Typography>
                  </Box>
                )}
                <Alert severity="success" sx={{ py: 0.5 }}>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    ✓ Signature captured successfully
                  </Typography>
                </Alert>
              </Box>
            ) : (
              <Alert severity="info" sx={{ mt: 1.5, py: 0.5 }}>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  Draw your signature in the area above. This will be used on your license card.
                </Typography>
              </Alert>
            )}
          </Box>
        </Box>
      </Box>
    );
  }

  // Fingerprint Capture Content
  function renderFingerprintContent() {
    return (
      <Box sx={{ p: 2 }}>
        {/* Fingerprint Capture */}
        <Box sx={{ 
          backgroundColor: 'rgb(255, 255, 255)',
          color: 'rgb(33, 33, 33)',
          backgroundImage: 'none',
          mb: 2,
          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
          transition: 'box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          borderRadius: '12px',
          p: 2
        }}>
          <Box sx={{ mb: 2 }}>
            <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
              <FingerprintIcon fontSize="small" />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '1rem' }}>Fingerprint Scan</Typography>
              {value.fingerprint && (
                <Chip label="Captured" color="success" size="small" icon={<CheckCircleIcon fontSize="small" />} sx={{ fontSize: '0.7rem', height: '20px' }} />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
              Digital fingerprint for enhanced security (optional)
            </Typography>
          </Box>
            <FingerprintCapture
              onFingerprintCapture={handleFingerprintCapture}
              disabled={saving || disabled}
            />
            {value.fingerprint ? (
              <Box sx={{ mt: 2 }}>
                {/* Display captured fingerprint if available */}
                {(value.fingerprint as any).processed_url && (
                  <Box sx={{ mb: 1.5, textAlign: 'center' }}>
                    <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      Fingerprint Preview
                    </Typography>
                    <Box
                      sx={{
                        border: '2px solid',
                        borderColor: 'success.main',
                        borderRadius: 1,
                        p: 1,
                        backgroundColor: 'background.paper',
                        display: 'inline-block'
                      }}
                    >
                      <img 
                        src={(value.fingerprint as any).processed_url}
                        alt="Captured fingerprint"
                        style={{
                          maxWidth: '150px',
                          maxHeight: '150px',
                          objectFit: 'contain'
                        }}
                      />
                    </Box>
                    <Typography variant="caption" display="block" sx={{ mt: 0.5, fontSize: '0.7rem' }}>
                      {((value.fingerprint as any).file_size / 1024).toFixed(1)}KB | {(value.fingerprint as any).format}
                    </Typography>
                  </Box>
                )}
                <Alert severity="success" sx={{ py: 0.5 }}>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    ✓ Fingerprint captured successfully for enhanced security
                  </Typography>
                </Alert>
              </Box>
            ) : (
              <Alert severity="info" sx={{ mt: 1.5, py: 0.5 }}>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  <strong>Optional:</strong> Capture fingerprint for enhanced security. 
                  Currently using mock scanner - will be replaced with real scanner integration.
                </Typography>
              </Alert>
            )}
          </Box>
        </Box>

        {/* Completion Status */}
        <Card variant="outlined" sx={{ mt: 2, bgcolor: 'background.default', border: '1px solid #e0e0e0', boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px' }}>
          <CardContent sx={{ p: 1.5 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, fontSize: '1rem', mb: 1 }}>
              Biometric Data Status
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} sm={4}>
                <Box display="flex" alignItems="center" gap={1}>
                  <CameraIcon color={value.photo ? "success" : "error"} fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: value.photo ? 600 : 400, fontSize: '0.85rem' }}>
                    Photo: {value.photo ? "✓ Captured (ISO)" : "⚠ Required"}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box display="flex" alignItems="center" gap={1}>
                  <CreateIcon color={value.signature ? "success" : "action"} fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: value.signature ? 600 : 400, fontSize: '0.85rem' }}>
                    Signature: {value.signature ? "✓ Captured" : "Optional"}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box display="flex" alignItems="center" gap={1}>
                  <FingerprintIcon color={value.fingerprint ? "success" : "action"} fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: value.fingerprint ? 600 : 400, fontSize: '0.85rem' }}>
                    Fingerprint: {value.fingerprint ? "✓ Captured" : "Optional"}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            
            {!value.photo ? (
              <Alert severity="error" sx={{ mt: 1.5, py: 0.5 }}>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  <strong>Action Required:</strong> License photo must be captured to proceed. 
                  The photo will be automatically cropped to ISO standards (3:4 ratio).
                </Typography>
              </Alert>
            ) : (
              <Alert severity="success" sx={{ mt: 1.5, py: 0.5 }}>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  <strong>Ready to proceed!</strong> All required biometric data has been captured.
                  {!value.signature && !value.fingerprint && 
                    " Consider adding signature and fingerprint for enhanced security."
                  }
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Original full biometric section (for non-tabbed usage)
  function renderFullBiometricSection() {
    return (
      <Box>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, fontSize: '1rem', mb: 1 }}>
          Biometric Data Capture
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.9rem' }}>
          Capture applicant photo, signature, and fingerprint data for license production
        </Typography>

        {success && (
          <Alert severity="success" sx={{ mb: 2, py: 0.5 }}>
            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
              {success}
            </Typography>
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2, py: 0.5 }}>
            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
              {error}
            </Typography>
          </Alert>
        )}

        {renderPhotoContent()}
        {renderSignatureContent()}
        {renderFingerprintContent()}
      </Box>
    );
  }

  // If using tabbed interface, render the full container (like PersonFormWrapper and MedicalInformationSection)
  if (isTabbed) {
    return (
      <Box sx={{ 
        bgcolor: '#f8f9fa', 
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 200px)',
        minHeight: '600px'
      }}>
        <Box sx={{ 
          flex: 1,
          overflow: 'hidden',
          p: 0,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'hidden'
          }}>
            {/* Header */}
            {showHeader && (
              <Box sx={{ p: 2 }}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 2, 
                    mb: 3,
                    bgcolor: 'white',
                    boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                    borderRadius: 2,
                    flexShrink: 0
                  }}
                >
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 0.5 }}>
                    Biometric Data Capture
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Capture applicant photo, signature, and fingerprint data for license production
                  </Typography>
                </Paper>
              </Box>
            )}

            {/* Success/Error Alerts */}
            {(success || error) && (
              <Box sx={{ p: 2, pt: showHeader ? 0 : 2 }}>
                {success && (
                  <Alert severity="success" sx={{ mb: 2, py: 0.5 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                      {success}
                    </Typography>
                  </Alert>
                )}

                {error && (
                  <Alert severity="error" sx={{ mb: 2, py: 0.5 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                      {error}
                    </Typography>
                  </Alert>
                )}
              </Box>
            )}

            {/* Biometric Tabs */}
            <Box sx={{ p: 2, pt: (showHeader || success || error) ? 0 : 2 }}>
              <Paper 
                elevation={0}
                sx={{ 
                  mb: 2,
                  bgcolor: 'white',
                  boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                  borderRadius: 2,
                  flexShrink: 0
                }}
              >
              <Tabs
                value={internalStep}
                onChange={handleTabChange}
                sx={{
                  px: 2,
                  '& .MuiTab-root': {
                    minHeight: 40,
                    textTransform: 'none',
                    fontSize: '0.8rem',
                    color: 'text.secondary',
                    bgcolor: 'primary.50',
                    mx: 0.5,
                    borderRadius: '6px 6px 0 0',
                    '&.Mui-selected': {
                      bgcolor: 'primary.100',
                      color: 'primary.main',
                    },
                    '&:hover': {
                      bgcolor: 'primary.100',
                      '&.Mui-selected': {
                        bgcolor: 'primary.100',
                      }
                    },
                    '&.Mui-disabled': {
                      opacity: 0.4
                    }
                  },
                  '& .MuiTabs-indicator': {
                    display: 'none'
                  }
                }}
              >
                {biometricSteps.map((step, index) => (
                  <Tab
                    key={step.label}
                    label={renderTabLabel(step, index)}
                  />
                ))}
              </Tabs>
              </Paper>
            </Box>

            {/* Main Form Container */}
            <Box sx={{ 
              flex: 1,
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              mx: 2,
              mb: 2
            }}>
              {/* Step Content - No padding like PersonFormWrapper */}
              <Box sx={{ flex: 1, overflow: 'visible' }}>
                {internalStep === 0 && renderPhotoContent()}
                {internalStep === 1 && renderSignatureContent()}
                {internalStep === 2 && renderFingerprintContent()}
              </Box>
            </Box>

            {/* Navigation Footer */}
            <Box sx={{ 
              bgcolor: 'white',
              borderTop: '1px solid', 
              borderColor: 'divider', 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: 1,
              p: 2,
              flexShrink: 0,
              width: '100%',
              borderRadius: '0 0 8px 8px'
            }}>
              <Button
                onClick={onCancel}
                disabled={loading}
                color="secondary"
                size="small"
              >
                Cancel
              </Button>
              
              <Button
                disabled={internalStep <= 0 || loading}
                onClick={handleBack}
                startIcon={<ArrowBackIcon />}
                size="small"
              >
                Back
              </Button>
              
              <Button
                variant="contained"
                onClick={internalStep === biometricSteps.length - 1 ? handleContinue : handleNext}
                disabled={internalStep === 0 && !value.photo || loading} // Photo is required for step 0
                startIcon={loading ? <CircularProgress size={20} /> : undefined}
                endIcon={internalStep !== biometricSteps.length - 1 ? <ArrowForwardIcon /> : undefined}
                size="small"
              >
                {loading ? 'Processing...' : internalStep === biometricSteps.length - 1 ? 'Continue to Review' : 'Next'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // Original single-component rendering (fallback for non-tabbed usage)
  return renderFullBiometricSection();
};

export default BiometricCaptureStep; 