import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Alert,
  Chip,
  Grid,
  Paper,
  CircularProgress,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Fingerprint as FingerprintIcon,
  Warning as WarningIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

import bioMiniService from '../../services/bioMiniService';
import { biometricApiService } from '../../services/biometricApiService';

interface FingerprintCaptureProps {
  onFingerprintCapture: (fingerprintFile: File) => void;
  disabled?: boolean;
  personId?: string; // New: Person ID for verification/enrollment
  demoMode?: boolean; // New: Demo mode to skip verification
}

const FingerprintCapture: React.FC<FingerprintCaptureProps> = ({
  onFingerprintCapture,
  disabled = false,
  personId,
  demoMode = false
}) => {
  const [scannerStatus, setScannerStatus] = useState<'not_connected' | 'initializing' | 'ready' | 'scanning' | 'service_unavailable'>('not_connected');
  const [bioMiniAvailable, setBioMiniAvailable] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [deviceInfo, setDeviceInfo] = useState<{model?: string, serial?: string}>({});
  const [capturedImageUrl, setCapturedImageUrl] = useState<string>('');
  const [lastCaptureTime, setLastCaptureTime] = useState<string>('');
  const [captureTimeoutId, setCaptureTimeoutId] = useState<number | null>(null);
  const [captureAbortController, setCaptureAbortController] = useState<AbortController | null>(null);
  
  // New state for verification/enrollment
  const [operationMode, setOperationMode] = useState<'determine' | 'enroll' | 'verify'>('determine');
  const [existingTemplates, setExistingTemplates] = useState<any[]>([]);
  const [verificationResult, setVerificationResult] = useState<{success: boolean; score?: number; message?: string} | null>(null);
  const [capturedTemplate, setCapturedTemplate] = useState<string>('');
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [isProcessingBiometric, setIsProcessingBiometric] = useState(false);
  
  // Internal demo mode state (not prop-based)
  const [internalDemoMode, setInternalDemoMode] = useState<boolean>(
    demoMode || localStorage.getItem('biometric_demo_mode') === 'true'
  );

  // Check for existing templates when personId is provided
  useEffect(() => {
    const checkExistingTemplates = async () => {
      console.log(`🔧 Initializing biometric component - PersonID: ${personId}, DemoMode: ${internalDemoMode}`);
      console.log(`🔧 PersonId type: ${typeof personId}, PersonId value: "${personId}"`);
      
      if (!personId || internalDemoMode) {
        console.log('⚠️ No person ID or demo mode - defaulting to enrollment mode');
        setOperationMode('enroll'); // Demo mode or no person ID - just enroll
        return;
      }

      try {
        console.log('🔍 Checking for existing fingerprint templates for person:', personId);
        const templates = await biometricApiService.getPersonTemplates(personId);
        setExistingTemplates(templates);
        
        // Always use enrollment mode - users can retake/re-enroll
        console.log(`📝 Setting enrollment mode (${templates.length} existing templates will be replaced)`);
        setOperationMode('enroll');
      } catch (error) {
        console.error('❌ Error checking existing templates:', error);
        setOperationMode('enroll'); // Default to enrollment on error
      }
    };

    checkExistingTemplates();
  }, [personId, internalDemoMode]);

  // Check BioMini Web Agent availability
  const checkBioMiniService = async () => {
    try {
      const isAvailable = await bioMiniService.checkWebAgentConnection();
      setBioMiniAvailable(isAvailable);
      
      if (isAvailable) {
        setScannerStatus('not_connected');
        setErrorMessage('');
      } else {
        setScannerStatus('service_unavailable');
        setErrorMessage('BioMini Web Agent not running. Please start BioMiniWebAgent.exe');
      }
    } catch (error) {
      setBioMiniAvailable(false);
      setScannerStatus('service_unavailable');
      setErrorMessage('Failed to connect to BioMini service');
    }
  };

  // Initialize BioMini device
  const initializeBioMiniDevice = async () => {
    setScannerStatus('initializing');
    setErrorMessage('');

    try {
      await bioMiniService.initializeDevice();
      // Use getAvailableDevices() instead of getScannerList() (which is not supported)
      const devices = bioMiniService.getAvailableDevices();
      
      if (devices.length > 0) {
        setScannerStatus('ready');
        setDeviceInfo({
          model: getDeviceModel(devices[0].ScannerType || devices[0].DeviceType || ''),
          serial: devices[0].ScannerName || devices[0].Serial || String(devices[0].DeviceHandle)
        });
        console.log('✅ BioMini device initialized:', devices[0]);
      } else {
        throw new Error('No BioMini devices found. Check USB connection.');
      }
    } catch (error) {
      console.error('Device initialization error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Device initialization failed');
      setScannerStatus('not_connected');
    }
  };

  // Stop current scanning operation
  const stopScanning = () => {
    console.log('🛑 Stopping fingerprint capture...');
    
    // Clear timeout if set
    if (captureTimeoutId) {
      clearTimeout(captureTimeoutId);
      setCaptureTimeoutId(null);
    }
    
    // Abort any ongoing request
    if (captureAbortController) {
      captureAbortController.abort();
      setCaptureAbortController(null);
    }
    
    setScannerStatus('ready');
    setErrorMessage('Scan cancelled. Please try again.');
  };

  // Enhanced biometric capture that handles verification/enrollment
  const handleEnhancedBiometricCapture = async () => {
    if (internalDemoMode) {
      console.log('🎭 Demo mode - auto-generating success');
      handleDemoCapture();
      return;
    }

    if (!personId) {
      console.error('❌ Person ID is missing - cannot proceed with biometric workflow');
      setErrorMessage('Person ID is required for biometric verification/enrollment. Please ensure a person is selected.');
      return;
    }

    setIsProcessingBiometric(true);
    setErrorMessage('');
    setVerificationResult(null);

    try {
      console.log(`🚀 Starting enrollment workflow for person: ${personId}`);
      console.log(`🔧 Existing templates: ${existingTemplates.length} (will be replaced)`);
      
      await handleEnrollmentWorkflow();
    } catch (error) {
      console.error(`❌ Enrollment failed:`, error);
      setErrorMessage(`Enrollment failed: ${error.message}`);
    } finally {
      setIsProcessingBiometric(false);
    }
  };

  // Handle verification workflow
  const handleVerificationWorkflow = async () => {
    console.log('🔍 Starting verification against existing templates...');
    
    // Try to verify against all existing templates
    for (const template of existingTemplates) {
      try {
        console.log(`🧬 Verifying against template: ${template.template_id} (${template.finger_position})`);
        
        const result = await biometricApiService.verifyFingerprint(
          template.template_id,
          4 // Security level 4
        );
        
        if (result.match_found) {
          console.log('✅ Verification successful!');
          setVerificationResult({
            success: true,
            score: result.match_score,
            message: `Identity verified using ${template.finger_position === 2 ? 'Right Index' : 'finger'} template`
          });
          
          // Get the captured image for display
          const imageFile = await bioMiniService.captureFingerprint();
          const imageUrl = URL.createObjectURL(imageFile);
          setCapturedImageUrl(imageUrl);
          setLastCaptureTime(new Date().toLocaleString());
          
          // Call the original callback
          onFingerprintCapture(imageFile);
          return;
        }
      } catch (error) {
        console.warn(`⚠️ Verification failed for template ${template.template_id}:`, error);
      }
    }
    
    // If we get here, verification failed
    console.log('❌ Verification failed against all templates');
    setVerificationResult({
      success: false,
      message: 'Fingerprint does not match any enrolled templates'
    });
    throw new Error('Verification failed - no matching templates found');
  };

  // Handle enrollment workflow
  const handleEnrollmentWorkflow = async () => {
    console.log('📝 Starting enrollment workflow...');
    
    if (!personId) {
      throw new Error('Person ID is required for enrollment');
    }
    
    try {
      // Delete any existing templates first (retake functionality)
      if (existingTemplates.length > 0) {
        console.log(`🗑️ Replacing ${existingTemplates.length} existing templates...`);
        // TODO: Add delete endpoint call here when available
        // await biometricApiService.deletePersonTemplates(personId);
      }
      
      // Enroll new fingerprint (this will replace existing ones in the backend)
      const results = await biometricApiService.enrollFingerprints(
        personId,
        [2], // Right Index finger
        undefined // No application ID needed here
      );
      
      if (results.length > 0) {
        console.log('✅ Enrollment successful!');
        const result = results[0];
        
        setVerificationResult({
          success: true,
          message: `Fingerprint enrolled successfully for ${result.finger_position === 2 ? 'Right Index' : 'finger'}`
        });
        
        // Get the captured image for display  
        const imageFile = await bioMiniService.captureFingerprint();
        const imageUrl = URL.createObjectURL(imageFile);
        setCapturedImageUrl(imageUrl);
        setLastCaptureTime(new Date().toLocaleString());
        
        // Call the original callback
        onFingerprintCapture(imageFile);
        
        // Update operation mode and templates
        setOperationMode('verify');
        setExistingTemplates([result]);
      }
    } catch (error) {
      console.error('❌ Enrollment failed:', error);
      throw error;
    }
  };

  // Capture fingerprint using BioMini
  const handleBioMiniCapture = async () => {
    if (scannerStatus !== 'ready') return;

    setScannerStatus('scanning');
    setErrorMessage('');

    // Create abort controller for this capture attempt
    const abortController = new AbortController();
    setCaptureAbortController(abortController);

    // Set timeout for capture (30 seconds)
    const timeoutId = window.setTimeout(() => {
      console.log('⏰ Fingerprint capture timeout');
      stopScanning();
      setErrorMessage('Scan timeout. Please place finger firmly on scanner and try again.');
    }, 30000);
    setCaptureTimeoutId(timeoutId);

    try {
      console.log('🔍 Starting fingerprint capture...');
      
      // Pass abort signal to the service (will need to update service to support this)
      const fingerprintFile = await bioMiniService.captureFingerprint();
      
      // Clear timeout and abort controller on success
      if (captureTimeoutId) {
        clearTimeout(captureTimeoutId);
        setCaptureTimeoutId(null);
      }
      setCaptureAbortController(null);
      
      // Create URL for image preview
      const imageUrl = URL.createObjectURL(fingerprintFile);
      setCapturedImageUrl(imageUrl);
      setLastCaptureTime(new Date().toLocaleTimeString());
      
      console.log('✅ Fingerprint captured successfully:', {
        name: fingerprintFile.name,
        size: fingerprintFile.size,
        type: fingerprintFile.type
      });
      
      // Pass the file to parent component
      onFingerprintCapture(fingerprintFile);
      setScannerStatus('ready');
    } catch (error) {
      // Clear timeout and abort controller on error
      if (captureTimeoutId) {
        clearTimeout(captureTimeoutId);
        setCaptureTimeoutId(null);
      }
      setCaptureAbortController(null);
      
      // Don't show error if it was cancelled
      if (!abortController.signal.aborted) {
        console.error('❌ BioMini capture error:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Fingerprint capture failed');
      }
      setScannerStatus('ready');
    }
  };

  // Disconnect device
  const disconnectDevice = async () => {
    try {
      // Stop any active scanning first
      if (scannerStatus === 'scanning') {
        stopScanning();
      }
      
      await bioMiniService.uninitializeDevice();
      setScannerStatus('not_connected');
      setDeviceInfo({});
      setErrorMessage('');
      
      // Clean up image URL to prevent memory leaks
      if (capturedImageUrl) {
        URL.revokeObjectURL(capturedImageUrl);
        setCapturedImageUrl('');
        setLastCaptureTime('');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  // Helper function to get readable device model
  const getDeviceModel = (scannerType: string): string => {
    const typeMap: { [key: string]: string } = {
      'SFR700': 'BioMini Slim 2',
      'SFR600': 'BioMini Slim',
      'SFR500': 'BioMini Plus',
      'SFR550': 'BioMini Plus 2',
      'BMS2S': 'BioMini Slim 2S',
      'BMS3': 'BioMini Slim 3'
    };
    return typeMap[scannerType] || 'BioMini Device';
  };

  // Check BioMini service on component mount and auto-initialize if available  
  useEffect(() => {
    const initializeIfAvailable = async () => {
      console.log('🔍 Checking BioMini service availability...');
      
      try {
        const isAvailable = await bioMiniService.checkWebAgentConnection();
        setBioMiniAvailable(isAvailable);
        
        if (isAvailable) {
          setScannerStatus('not_connected');
          setErrorMessage('');
          
          // Auto-initialize device for better UX
          console.log('🚀 Service detected, auto-initializing device...');
          setScannerStatus('initializing');
          
          try {
            await bioMiniService.initializeDevice();
            const devices = bioMiniService.getAvailableDevices();
            
            if (devices.length > 0) {
              setScannerStatus('ready');
              setDeviceInfo({
                model: getDeviceModel(devices[0].ScannerType || devices[0].DeviceType || ''),
                serial: devices[0].ScannerName || devices[0].Serial || String(devices[0].DeviceHandle)
              });
              console.log('✅ Auto-initialization successful:', devices[0]);
            } else {
              setScannerStatus('not_connected');
              setErrorMessage('No BioMini devices found. Check USB connection.');
            }
          } catch (initError) {
            console.error('Auto-initialization failed:', initError);
            setScannerStatus('not_connected');
            setErrorMessage('Device initialization failed. Click "Initialize Device" to retry.');
          }
        } else {
          setScannerStatus('service_unavailable');
          setErrorMessage('BioMini Web Agent not running. Please start BioMiniWebAgent.exe');
        }
      } catch (error) {
        setBioMiniAvailable(false);
        setScannerStatus('service_unavailable');
        setErrorMessage('Failed to connect to BioMini service');
      }
    };
    
    initializeIfAvailable();
  }, []);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Clean up image URL to prevent memory leaks
      if (capturedImageUrl) {
        URL.revokeObjectURL(capturedImageUrl);
      }
      
      // Clear any active timeout
      if (captureTimeoutId) {
        clearTimeout(captureTimeoutId);
      }
      
      // Abort any ongoing request
      if (captureAbortController) {
        captureAbortController.abort();
      }
    };
  }, [capturedImageUrl, captureTimeoutId, captureAbortController]);

  // Demo capture function for testing without real hardware
  const handleDemoCapture = () => {
    console.log('🎭 Demo mode - generating placeholder fingerprint data');
    setScannerStatus('scanning');
    setIsProcessingBiometric(true);
    
    setTimeout(() => {
      // Create a placeholder File for testing
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Draw a simple placeholder fingerprint pattern
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, 400, 400);
        
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        
        // Draw some fingerprint-like curves
        for (let i = 0; i < 10; i++) {
          ctx.beginPath();
          ctx.arc(200, 200, 50 + i * 15, 0, Math.PI * 2);
          ctx.stroke();
        }
        
        ctx.font = '16px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('DEMO FINGERPRINT', 200, 350);
        ctx.fillText('(Demo Mode - No Real Capture)', 200, 370);
      }
      
      canvas.toBlob((blob) => {
        if (blob) {
          const fingerprintFile = new File([blob], 'demo_fingerprint.png', { type: 'image/png' });
          
          // Create URL for preview
          const imageUrl = URL.createObjectURL(fingerprintFile);
          setCapturedImageUrl(imageUrl);
          setLastCaptureTime(new Date().toLocaleTimeString());
          
          // Set success result for demo
          setVerificationResult({
            success: true,
            message: `Demo enrollment completed successfully`
          });
          
          // Call the original callback to satisfy parent component
          onFingerprintCapture(fingerprintFile);
          setScannerStatus('ready');
          setIsProcessingBiometric(false);
        }
      }, 'image/png');
    }, 1500); // Shorter delay for demo
  };

  const handleTestCapture = () => {
    // Legacy test function - now redirects to demo capture
    handleDemoCapture();
  };

  return (
    <Box>
      {/* Operation Mode */}
      {personId ? (
        <Alert severity="info" sx={{ mb: 2, py: 1 }}>
          <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
            <strong>📝 Enrollment Mode</strong> - {existingTemplates.length > 0 
              ? `Will replace ${existingTemplates.length} existing template(s) with new fingerprint`
              : 'Will enroll new fingerprint'
            }
          </Typography>
        </Alert>
      ) : (
        <Alert severity="warning" sx={{ mb: 2, py: 1 }}>
          <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
            <strong>⚠️ No Person Selected</strong> - Person ID required for biometric enrollment
          </Typography>
        </Alert>
      )}

      {/* Demo/Production Mode Toggle */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={internalDemoMode}
              onChange={(e) => {
                const newDemoMode = e.target.checked;
                setInternalDemoMode(newDemoMode);
                localStorage.setItem('biometric_demo_mode', newDemoMode.toString());
                
                // Clear any existing results when switching modes
                setVerificationResult(null);
                if (capturedImageUrl) {
                  URL.revokeObjectURL(capturedImageUrl);
                  setCapturedImageUrl('');
                  setLastCaptureTime('');
                }
                
                console.log(`🔄 Switched to ${newDemoMode ? 'Demo' : 'Production'} mode`);
              }}
              size="small"
            />
          }
          label={
            <Typography variant="body2" sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
              Mode
            </Typography>
          }
        />
        <Box
          sx={{
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            backgroundColor: internalDemoMode ? '#ff9800' : '#4caf50',
            color: 'white',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            minWidth: '80px',
            textAlign: 'center'
          }}
        >
          {internalDemoMode ? 'Demo' : 'Production'}
        </Box>
      </Box>

      

      {/* Error/Status Alerts */}
      {errorMessage && (
        <Alert severity={bioMiniAvailable ? "error" : "warning"} sx={{ mb: 2 }}>
          <Typography variant="body2">{errorMessage}</Typography>
          {!bioMiniAvailable && (
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Download and run BioMiniWebAgent.exe from your IT administrator.
            </Typography>
          )}
        </Alert>
      )}



      {/* Control Buttons */}
      <Grid container spacing={1}>
        <Grid item xs={12} sm={4}>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            startIcon={<InfoIcon />}
            disabled={disabled}
            onClick={checkBioMiniService}
          >
            Check Service
          </Button>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            startIcon={<SettingsIcon />}
            disabled={disabled || !bioMiniAvailable || scannerStatus === 'initializing' || scannerStatus === 'scanning'}
            onClick={scannerStatus === 'ready' ? disconnectDevice : initializeBioMiniDevice}
          >
            {scannerStatus === 'ready' ? 'Disconnect' : scannerStatus === 'initializing' ? 'Connecting...' : 'Initialize Device'}
          </Button>
        </Grid>
        <Grid item xs={12} sm={4}>
          {scannerStatus === 'scanning' ? (
            <Button
              fullWidth
              size="small"
              variant="contained"
              color="error"
              startIcon={<ErrorIcon />}
              disabled={disabled}
              onClick={stopScanning}
            >
              Stop Scan
            </Button>
          ) : (
            <Button
              fullWidth
              size="small"
              variant="contained"
              startIcon={<FingerprintIcon />}
              disabled={disabled || (scannerStatus !== 'ready' && !internalDemoMode)}
              onClick={internalDemoMode ? handleDemoCapture : (bioMiniAvailable ? handleEnhancedBiometricCapture : handleTestCapture)}
            >
              {internalDemoMode ? 'Generate Demo Data' : 
               existingTemplates.length > 0 ? 'Retake Fingerprint' : 
               'Enroll Fingerprint'}
            </Button>
          )}
        </Grid>
      </Grid>

      {/* Enrollment Results */}
      {verificationResult && (
        <Alert severity={verificationResult.success ? 'success' : 'error'} sx={{ mt: 2, mb: 2 }}>
          <Typography variant="body2">
            <strong>{verificationResult.success ? '✅ Success!' : '❌ Failed'}</strong>
          </Typography>
          <Typography variant="body2">
            {verificationResult.message}
          </Typography>
        </Alert>
      )}



      {/* Service Status */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Service: {bioMiniAvailable ? '🟢 Connected' : '🔴 Offline'} | 
          Device: {deviceInfo.model || 'Not Connected'} |
          Mode: {bioMiniAvailable ? 'Hardware' : 'Simulation'}
        </Typography>
      </Box>
    </Box>
  );
};

export default FingerprintCapture; 