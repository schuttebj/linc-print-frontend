/**
 * BiometricCaptureStep Component
 * 
 * Reusable component for capturing biometric data (photo, signature, fingerprint)
 * across all application forms. Extracted from ApplicationFormWrapper for consistency.
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Alert
} from '@mui/material';
import {
  CameraAlt as CameraIcon,
  Create as CreateIcon,
  Fingerprint as FingerprintIcon,
  CheckCircle as CheckCircleIcon
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
}

const BiometricCaptureStep: React.FC<BiometricCaptureStepProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

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

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Biometric Data Capture</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Capture applicant photo, signature, and fingerprint data for license production
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* License Photo - Full Width */}
        <Grid item xs={12}>
          <Card sx={{ mb: 3 }}>
            <CardHeader
              title={
                <Box display="flex" alignItems="center" gap={1}>
                  <CameraIcon />
                  <Typography variant="h6">License Photo</Typography>
                  {value.photo && (
                    <Chip label="Captured" color="success" size="small" icon={<CheckCircleIcon />} />
                  )}
                </Box>
              }
              subheader="ISO-compliant photo (3:4 ratio)"
            />
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <WebcamCapture
                  onPhotoCapture={handlePhotoCapture}
                  disabled={saving || disabled}
                />
              </Box>
              
              {value.photo ? (
                <Box>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                    {(value.photo as any).iso_compliant ? 'ISO-Processed Preview' : 'Photo Preview'}
                  </Typography>
                  <Box
                    sx={{
                      border: '2px solid',
                      borderColor: 'success.main',
                      borderRadius: 2,
                      p: 1,
                      mb: 2,
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
                  <Alert severity="success" sx={{ fontSize: '0.875rem' }}>
                    <Typography variant="body2">
                      {(value.photo as any).iso_compliant 
                        ? `✓ Photo processed to ISO standards (${(value.photo as any).dimensions || '300x400px'})`
                        : '✓ Photo captured successfully'
                      }
                    </Typography>
                  </Alert>
                </Box>
              ) : (
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Required:</strong> Position face within guides and capture photo.
                    Image will be automatically cropped to ISO standards.
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Digital Signature - Full Width */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title={
                <Box display="flex" alignItems="center" gap={1}>
                  <CreateIcon />
                  <Typography variant="h6">Digital Signature</Typography>
                  {value.signature && (
                    <Chip label="Captured" color="success" size="small" icon={<CheckCircleIcon />} />
                  )}
                </Box>
              }
              subheader="Draw your signature using mouse or touch"
            />
            <CardContent sx={{ '& > *': { minHeight: '200px' } }}>
              <SignatureCapture
                onSignatureCapture={handleSignatureCapture}
                disabled={saving || disabled}
              />
              {value.signature ? (
                <Box sx={{ mt: 2 }}>
                  {/* Display captured signature if available */}
                  {(value.signature as any).processed_url && (
                    <Box sx={{ mb: 2, textAlign: 'center' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Signature Preview
                      </Typography>
                      <Box
                        sx={{
                          border: '2px solid',
                          borderColor: 'success.main',
                          borderRadius: 2,
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
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        {((value.signature as any).file_size / 1024).toFixed(1)}KB | {(value.signature as any).format}
                      </Typography>
                    </Box>
                  )}
                  <Alert severity="success" sx={{ fontSize: '0.875rem' }}>
                    <Typography variant="body2">
                      ✓ Signature captured successfully
                    </Typography>
                  </Alert>
                </Box>
              ) : (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    Draw your signature in the area above. This will be used on your license card.
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Fingerprint Capture */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title={
                <Box display="flex" alignItems="center" gap={1}>
                  <FingerprintIcon />
                  <Typography variant="h6">Fingerprint Scan</Typography>
                  {value.fingerprint && (
                    <Chip label="Captured" color="success" size="small" icon={<CheckCircleIcon />} />
                  )}
                </Box>
              }
              subheader="Digital fingerprint for enhanced security (optional)"
            />
            <CardContent>
              <FingerprintCapture
                onFingerprintCapture={handleFingerprintCapture}
                disabled={saving || disabled}
              />
              {value.fingerprint ? (
                <Box sx={{ mt: 2 }}>
                  {/* Display captured fingerprint if available */}
                  {(value.fingerprint as any).processed_url && (
                    <Box sx={{ mb: 2, textAlign: 'center' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Fingerprint Preview
                      </Typography>
                      <Box
                        sx={{
                          border: '2px solid',
                          borderColor: 'success.main',
                          borderRadius: 2,
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
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        {((value.fingerprint as any).file_size / 1024).toFixed(1)}KB | {(value.fingerprint as any).format}
                      </Typography>
                    </Box>
                  )}
                  <Alert severity="success" sx={{ fontSize: '0.875rem' }}>
                    <Typography variant="body2">
                      ✓ Fingerprint captured successfully for enhanced security
                    </Typography>
                  </Alert>
                </Box>
              ) : (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Optional:</strong> Capture fingerprint for enhanced security. 
                    Currently using mock scanner - will be replaced with real scanner integration.
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Completion Status */}
        <Grid item xs={12}>
          <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Biometric Data Status
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <CameraIcon color={value.photo ? "success" : "error"} />
                    <Typography variant="body1" sx={{ fontWeight: value.photo ? 600 : 400 }}>
                      Photo: {value.photo ? "✓ Captured (ISO)" : "⚠ Required"}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <CreateIcon color={value.signature ? "success" : "action"} />
                    <Typography variant="body1" sx={{ fontWeight: value.signature ? 600 : 400 }}>
                      Signature: {value.signature ? "✓ Captured" : "Optional"}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <FingerprintIcon color={value.fingerprint ? "success" : "action"} />
                    <Typography variant="body1" sx={{ fontWeight: value.fingerprint ? 600 : 400 }}>
                      Fingerprint: {value.fingerprint ? "✓ Captured" : "Optional"}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              
              {!value.photo ? (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Action Required:</strong> License photo must be captured to proceed. 
                    The photo will be automatically cropped to ISO standards (3:4 ratio).
                  </Typography>
                </Alert>
              ) : (
                <Alert severity="success" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Ready to proceed!</strong> All required biometric data has been captured.
                    {!value.signature && !value.fingerprint && 
                      " Consider adding signature and fingerprint for enhanced security."
                    }
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BiometricCaptureStep; 