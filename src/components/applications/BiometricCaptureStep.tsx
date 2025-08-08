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

  // Step validation for tabbed interface - same pattern as PersonFormWrapper
  const [stepValidation, setStepValidation] = useState<boolean[]>([false, true, true]); // Photo required, others optional
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Photo Capture - REQUIRED
        return !!value.photo;
      case 1: // Signature - Optional but validate if present
        return true; // Always valid since optional
      case 2: // Fingerprint - Optional but validate if present  
        return true; // Always valid since optional
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
    // Use completedSteps set instead of index comparison - same as PersonFormWrapper
    const isCompleted = completedSteps.has(index);
    const isCurrent = internalStep === index;
    const isValid = stepValidation[index];
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
        </Box>
      </Box>
    );
  };

  const renderSignatureContent = () => {
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
          </Box>
        </Box>
      </Box>
    );
  };

  const renderFingerprintContent = () => {
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

  // If using tabbed interface, render the full container exactly like PersonFormWrapper
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
        {/* Content Container - Tabs and Form Content with padding */}
        <Box sx={{ 
          flex: 1,
          overflow: 'hidden', // No scroll on outer container
          p: 2, // Padding for content area
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Box sx={{ 
            maxWidth: 'none', // No max width in application mode
            mx: 0, // No horizontal margin in application mode
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'hidden' // Prevent this container from scrolling
          }}>
            {/* Header */}
            {showHeader && (
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2, 
                  mb: 3,
                  bgcolor: 'white',
                  boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                  borderRadius: 2,
                  flexShrink: 0 // Prevent header from shrinking
                }}
              >
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 0.5 }}>
                  Biometric Data Capture
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Capture applicant photo, signature, and fingerprint data for license production
                </Typography>
              </Paper>
            )}

            {/* Biometric Tabs */}
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
                    disabled={index > internalStep + 1 || (index === internalStep + 1 && !stepValidation[internalStep])}
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
              {/* Success/Error Alerts */}
              {(success || error) && (
                <Box sx={{ mb: 1, flexShrink: 0 }}>
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

              {/* Step Content - No padding like PersonFormWrapper */}
              <Box sx={{ flex: 1, overflow: 'visible' }}>
                {internalStep === 0 && renderPhotoContent()}
                {internalStep === 1 && renderSignatureContent()}
                {internalStep === 2 && renderFingerprintContent()}
              </Box>
            </Box>
        </Box>

        {/* Navigation - Full width at bottom - OUTSIDE content container */}
        <Box sx={{ 
          bgcolor: 'white',
          borderTop: '1px solid', 
          borderColor: 'divider', 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: 1,
          p: 2,
          flexShrink: 0,
          // Full width navigation styling
          width: '100%',
          borderRadius: '0 0 8px 8px' // Only round bottom corners
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
            disabled={isNextButtonDisabled() || loading}
            startIcon={loading ? <CircularProgress size={20} /> : undefined}
            endIcon={internalStep !== biometricSteps.length - 1 ? <ArrowForwardIcon /> : undefined}
            size="small"
          >
            {loading ? 'Processing...' : internalStep === biometricSteps.length - 1 ? 'Continue to Review' : 'Next'}
          </Button>
        </Box>
      </Box>
    );
  }

  // Original single-component rendering (fallback for non-tabbed usage)
  return renderFullBiometricSection();
};

export default BiometricCaptureStep;