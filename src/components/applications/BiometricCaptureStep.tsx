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

  // Handler functions
  const handlePhotoCapture = async (photoFile: File) => {
    try {
      setSaving(true);
      setError('');
      
      const updatedBiometricData = {
        ...value,
        photo: photoFile
      };
      onChange(updatedBiometricData);
      setSuccess('Photo captured successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error processing photo:', error);
      setError('Photo capture failed.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleSignatureCapture = async (signatureFile: File) => {
    try {
      setSaving(true);
      setError('');
      
      const updatedBiometricData = {
        ...value,
        signature: signatureFile
      };
      onChange(updatedBiometricData);
      setSuccess('Signature captured successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error processing signature:', error);
      setError('Signature capture failed.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleFingerprintCapture = async (fingerprintFile: File) => {
    try {
      setSaving(true);
      setError('');
      
      const updatedBiometricData = {
        ...value,
        fingerprint: fingerprintFile
      };
      onChange(updatedBiometricData);
      setSuccess('Fingerprint captured successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error processing fingerprint:', error);
      setError('Fingerprint capture failed.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  // Step validation for tabbed interface - all 3 steps required
  const [stepValidation, setStepValidation] = useState<boolean[]>([false, false, false]); // All required
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Photo Capture - REQUIRED
        return !!value.photo;
      case 1: // Signature - REQUIRED
        return !!value.signature;
      case 2: // Fingerprint - REQUIRED  
        return !!value.fingerprint;
      default:
        return false;
    }
  };

  const markStepValid = (step: number, isValid: boolean) => {
    setStepValidation(prev => {
      const updated = [...prev];
      updated[step] = isValid;
      return updated;
    });
    
    if (isValid) {
      setCompletedSteps(prev => new Set(prev).add(step));
    } else {
      setCompletedSteps(prev => {
        const updated = new Set(prev);
        updated.delete(step);
        return updated;
      });
    }
  };

  const validateCurrentStep = async () => {
    console.log(`🔄 Validating biometric step ${internalStep}`);
    const isValid = isStepValid(internalStep);
    markStepValid(internalStep, isValid);
    return isValid;
  };

  // Next button state - same pattern as PersonFormWrapper
  const isNextButtonDisabled = (): boolean => {
    return !stepValidation[internalStep];
  };

  // Navigation handlers for tabbed interface - with validation like PersonFormWrapper
  const handleNext = async () => {
    // Validate current step before proceeding
    const isCurrentStepValid = await validateCurrentStep();
    
    if (isCurrentStepValid && internalStep < biometricSteps.length - 1) {
      const nextStep = internalStep + 1;
      setInternalStep(nextStep);
      if (onBiometricStepChange) {
        onBiometricStepChange(nextStep, isStepValid(nextStep));
      }
    } else if (!isCurrentStepValid) {
      console.log(`❌ Cannot proceed: Step ${internalStep} validation failed`);
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

  const handleContinue = async () => {
    // Validate current step before continuing to review
    const isCurrentStepValid = await validateCurrentStep();
    
    if (isCurrentStepValid && onContinueToReview) {
      onContinueToReview();
    } else if (!isCurrentStepValid) {
      console.log(`❌ Cannot continue to review: Step ${internalStep} validation failed`);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    // Enhanced tab navigation: allow clicking on completed steps, current step, or next step if current is valid
    // Same logic as PersonFormWrapper
    const isCompletedStep = completedSteps.has(newValue);
    const isCurrentStep = newValue === internalStep;
    const isNextStepAvailable = newValue === internalStep + 1 && stepValidation[internalStep];
    
    if (isCompletedStep || isCurrentStep || isNextStepAvailable) {
      setInternalStep(newValue);
      if (onBiometricStepChange) {
        onBiometricStepChange(newValue, isStepValid(newValue));
      }
    } else {
      console.log(`❌ Tab ${newValue} not accessible. Current step ${internalStep} must be completed first.`);
    }
  };

  const renderTabLabel = (step: any, index: number) => {
    // Use actual step validation instead of just completed steps
    const isCompleted = stepValidation[index]; // Step is completed if validation passes
    const isCurrent = internalStep === index;
    const isClickable = isCompleted || isCurrent || (index === internalStep + 1 && stepValidation[internalStep]);
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          color: isCompleted ? 'success.main' : isCurrent ? 'primary.main' : isClickable ? 'text.secondary' : 'text.disabled'
        }}>
          {isCompleted ? <CheckCircleIcon fontSize="small" /> : step.icon}
        </Box>
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: isCurrent ? 'bold' : 'normal',
            color: isCompleted ? 'success.main' : isCurrent ? 'primary.main' : isClickable ? 'text.secondary' : 'text.disabled'
          }}
        >
          {step.label}
        </Typography>
      </Box>
    );
  };

  // Trigger validation callbacks when data changes
  useEffect(() => {
    // Validate all steps when biometric data changes
    const newValidation = biometricSteps.map((_, index) => isStepValid(index));
    setStepValidation(newValidation);
    
    // Update completed steps
    newValidation.forEach((isValid, index) => {
      if (isValid) {
        setCompletedSteps(prev => new Set(prev).add(index));
      }
    });
    
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

  // Render functions INSIDE the component
  const renderPhotoContent = () => {
    return (
      <Box sx={{ p: 2 }}>
        {/* License Photo - 2:1 Column Layout */}
        <Box sx={{ 
          backgroundColor: 'rgb(255, 255, 255)',
          color: 'rgb(33, 33, 33)',
          backgroundImage: 'none',
          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
          transition: 'box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          borderRadius: '12px',
          p: 2
        }}>
          <Grid container spacing={2}>
            {/* Left Column - Instructions and Controls (2/3 width) */}
            <Grid item xs={8}>
              <Box sx={{ mb: 2 }}>
                <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                  <CameraIcon fontSize="small" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '1rem' }}>License Photo</Typography>
                  {value.photo && (
                    <Chip label="Captured" color="success" size="small" icon={<CheckCircleIcon fontSize="small" />} sx={{ fontSize: '0.7rem', height: '20px' }} />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem', mb: 2 }}>
                  Position yourself in front of the camera and capture an ISO-compliant photo (3:4 ratio). Ensure good lighting and look directly at the camera.
                </Typography>
                <WebcamCapture
                  onPhotoCapture={handlePhotoCapture}
                  disabled={saving || disabled}
                />
              </Box>
            </Grid>
            
            {/* Right Column - Photo Preview (1/3 width) */}
            <Grid item xs={4}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                height: '100%',
                justifyContent: 'center'
              }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Preview</Typography>
                <Box sx={{
                  width: '120px',
                  height: '160px',
                  border: '2px dashed #ccc',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: '#f9f9f9',
                  overflow: 'hidden'
                }}>
                  {value.photo ? (
                    <img 
                      src={typeof value.photo === 'string' ? value.photo : 
                           (value.photo instanceof File ? URL.createObjectURL(value.photo) : value.photo.processed_url)}
                      alt="Captured Photo"
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        borderRadius: '6px'
                      }}
                    />
                  ) : (
                    <Box sx={{ textAlign: 'center', color: '#999' }}>
                      <CameraIcon sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="caption">No photo captured</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>
    );
  };

  const renderSignatureContent = () => {
    return (
      <Box sx={{ p: 2 }}>
        {/* Digital Signature - 50/50 Column Layout */}
        <Box sx={{ 
          backgroundColor: 'rgb(255, 255, 255)',
          color: 'rgb(33, 33, 33)',
          backgroundImage: 'none',
          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
          transition: 'box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          borderRadius: '12px',
          p: 2
        }}>
          <Grid container spacing={2}>
            {/* Left Column - Instructions and Preview */}
            <Grid item xs={6}>
              <Box sx={{ mb: 2 }}>
                <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                  <CreateIcon fontSize="small" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '1rem' }}>Digital Signature</Typography>
                  {value.signature && (
                    <Chip label="Captured" color="success" size="small" icon={<CheckCircleIcon fontSize="small" />} sx={{ fontSize: '0.7rem', height: '20px' }} />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem', mb: 2 }}>
                  Use your mouse to draw your signature in the box. On touch devices, use your finger to sign. Click "Clear" to start over or "Save Signature" when finished.
                </Typography>
                
                {/* Signature Preview */}
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Preview</Typography>
                <Box sx={{
                  width: '100%',
                  height: '100px',
                  border: '2px dashed #ccc',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: '#f9f9f9',
                  overflow: 'hidden'
                }}>
                  {value.signature ? (
                    <img 
                      src={typeof value.signature === 'string' ? value.signature : 
                           (value.signature instanceof File ? URL.createObjectURL(value.signature) : value.signature.processed_url)}
                      alt="Captured Signature"
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain',
                        borderRadius: '6px'
                      }}
                    />
                  ) : (
                    <Box sx={{ textAlign: 'center', color: '#999' }}>
                      <CreateIcon sx={{ fontSize: 30, mb: 1 }} />
                      <Typography variant="caption">No signature captured</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Grid>
            
            {/* Right Column - Signature Capture Area */}
            <Grid item xs={6}>
              <Box sx={{ '& > *': { minHeight: '200px' } }}>
                <SignatureCapture
                  onSignatureCapture={handleSignatureCapture}
                  disabled={saving || disabled}
                />
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>
    );
  };

  const renderFingerprintContent = () => {
    return (
      <Box sx={{ p: 2 }}>
        {/* Fingerprint Capture - 2:1 Column Layout with simplified container */}
        <Box sx={{ 
          backgroundColor: 'rgb(255, 255, 255)',
          color: 'rgb(33, 33, 33)',
          backgroundImage: 'none',
          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
          transition: 'box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          borderRadius: '12px',
          p: 2
        }}>
          <Grid container spacing={2}>
            {/* Left Column - Instructions and Controls (2/3 width) */}
            <Grid item xs={8}>
              <Box sx={{ mb: 2 }}>
                <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                  <FingerprintIcon fontSize="small" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '1rem' }}>Fingerprint Scan</Typography>
                  {value.fingerprint && (
                    <Chip label="Captured" color="success" size="small" icon={<CheckCircleIcon fontSize="small" />} sx={{ fontSize: '0.7rem', height: '20px' }} />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem', mb: 2 }}>
                  Place your finger on the scanner or use the digital fingerprint capture. This provides enhanced security for your license.
                </Typography>
                
                {/* Development Mode Alert */}
                <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
                  <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                    <strong>DEVELOPMENT MODE:</strong> Fingerprint integration is not yet implemented. This is a placeholder for future functionality.
                  </Typography>
                </Alert>
                
                <FingerprintCapture
                  onFingerprintCapture={handleFingerprintCapture}
                  disabled={saving || disabled}
                />
              </Box>
            </Grid>
            
            {/* Right Column - Fingerprint Preview (1/3 width) */}
            <Grid item xs={4}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                height: '100%',
                justifyContent: 'center'
              }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Preview</Typography>
                <Box sx={{
                  width: '120px',
                  height: '120px',
                  border: '2px dashed #ccc',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: '#f9f9f9',
                  overflow: 'hidden'
                }}>
                  {value.fingerprint ? (
                    <img 
                      src={typeof value.fingerprint === 'string' ? value.fingerprint : 
                           (value.fingerprint instanceof File ? URL.createObjectURL(value.fingerprint) : value.fingerprint.processed_url)}
                      alt="Captured Fingerprint"
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        borderRadius: '50%'
                      }}
                    />
                  ) : (
                    <Box sx={{ textAlign: 'center', color: '#999' }}>
                      <FingerprintIcon sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="caption">No fingerprint captured</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>
    );
  };

  // Original full biometric section (for non-tabbed usage)
  const renderFullBiometricSection = () => {
    return (
      <Box>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, fontSize: '1rem', mb: 1 }}>
          Biometric Data Capture
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
  };

  // If using tabbed interface, render with the exact structure requested
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
        {/* Step content - p:0 */}
        <Box sx={{ 
          flex: 1,
          overflow: 'hidden',
          p: 0, // Step content - p:0
          display: 'flex',
          flexDirection: 'column'
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

          {/* Inner tab container - P:2 */}
          <Box sx={{ 
            flex: 1,
            overflow: 'hidden',
            p: 2, // Inner tab container - P:2
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Tabs - p:0 */}
            <Paper 
              elevation={0}
              sx={{ 
                mb: 2,
                bgcolor: 'white',
                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                borderRadius: 2,
                flexShrink: 0,
                p: 0 // Tabs - p:0
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
                    disabled={index > internalStep + 1 || (index === internalStep + 1 && !stepValidation[internalStep])}
                  />
                ))}
              </Tabs>
            </Paper>

            {/* Tab content - p:0 */}
            <Box sx={{ 
              flex: 1,
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              p: 0 // Tab content - p:0
            }}>
              {/* Step Content - Aligned at top */}
              <Box sx={{ flex: 1, overflow: 'visible' }}>
                {internalStep === 0 && renderPhotoContent()}
                {internalStep === 1 && renderSignatureContent()}
                {internalStep === 2 && renderFingerprintContent()}
              </Box>
            </Box>
          </Box>

          {/* Navigation - P:0 */}
          <Box sx={{ 
            bgcolor: 'white',
            borderTop: '1px solid', 
            borderColor: 'divider', 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: 1,
            p: 0, // Navigation - P:0
            flexShrink: 0,
            width: '100%',
            borderRadius: '0 0 8px 8px'
          }}>
            <Box sx={{ p: 2, display: 'flex', gap: 1, ml: 'auto' }}>
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
                disabled={isNextButtonDisabled() || loading}
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