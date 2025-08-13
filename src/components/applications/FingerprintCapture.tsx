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
  CircularProgress
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

interface FingerprintCaptureProps {
  onFingerprintCapture: (fingerprintFile: File) => void;
  disabled?: boolean;
}

const FingerprintCapture: React.FC<FingerprintCaptureProps> = ({
  onFingerprintCapture,
  disabled = false
}) => {
  const [scannerStatus, setScannerStatus] = useState<'not_connected' | 'initializing' | 'ready' | 'scanning' | 'service_unavailable'>('not_connected');
  const [bioMiniAvailable, setBioMiniAvailable] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [deviceInfo, setDeviceInfo] = useState<{model?: string, serial?: string}>({});
  const [capturedImageUrl, setCapturedImageUrl] = useState<string>('');
  const [lastCaptureTime, setLastCaptureTime] = useState<string>('');

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

  // Capture fingerprint using BioMini
  const handleBioMiniCapture = async () => {
    if (scannerStatus !== 'ready') return;

    setScannerStatus('scanning');
    setErrorMessage('');

    try {
      console.log('🔍 Starting fingerprint capture...');
      const fingerprintFile = await bioMiniService.captureFingerprint();
      
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
      console.error('❌ BioMini capture error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Fingerprint capture failed');
      setScannerStatus('ready');
    }
  };

  // Disconnect device
  const disconnectDevice = async () => {
    try {
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
    };
  }, [capturedImageUrl]);

  const handleTestCapture = () => {
    // Simulate fingerprint capture for testing
    // In real implementation, this would interface with fingerprint scanner hardware
    setScannerStatus('scanning');
    
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
        ctx.fillText('PLACEHOLDER FINGERPRINT', 200, 350);
        ctx.fillText('(Hardware Integration Pending)', 200, 370);
      }
      
      canvas.toBlob((blob) => {
        if (blob) {
          const fingerprintFile = new File([blob], 'fingerprint_placeholder.png', { type: 'image/png' });
          onFingerprintCapture(fingerprintFile);
          setScannerStatus('ready');
        }
      }, 'image/png');
    }, 2000);
  };

      return (
    <Box>
      {/* Scanner Status */}
      <Box sx={{ mb: 2 }}>
        <Paper
          elevation={1}
          sx={{
            p: 2,
            textAlign: 'center',
            backgroundColor: 
              scannerStatus === 'not_connected' || scannerStatus === 'service_unavailable' ? '#fff3e0' :
              scannerStatus === 'ready' ? '#e8f5e8' :
              '#e3f2fd',
            border: '2px dashed',
            borderColor:
              scannerStatus === 'not_connected' || scannerStatus === 'service_unavailable' ? '#ff9800' :
              scannerStatus === 'ready' ? '#4caf50' :
              '#2196f3'
          }}
        >
          {scannerStatus === 'initializing' || scannerStatus === 'scanning' ? (
            <CircularProgress size={60} sx={{ mb: 1 }} />
          ) : (
            <FingerprintIcon 
              sx={{ 
                fontSize: 60, 
                mb: 1,
                color: 
                  scannerStatus === 'not_connected' || scannerStatus === 'service_unavailable' ? '#ff9800' :
                  scannerStatus === 'ready' ? '#4caf50' :
                  '#2196f3'
              }} 
            />
          )}
          
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
            {scannerStatus === 'service_unavailable' && 'BioMini Service Unavailable'}
            {scannerStatus === 'not_connected' && 'BioMini Device Not Connected'}
            {scannerStatus === 'initializing' && 'Initializing BioMini Device...'}
            {scannerStatus === 'ready' && `BioMini Ready ${deviceInfo.model ? `(${deviceInfo.model})` : ''}`}
            {scannerStatus === 'scanning' && 'Scanning Fingerprint...'}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
            {scannerStatus === 'service_unavailable' && 'Start BioMiniWebAgent.exe to enable fingerprint capture'}
            {scannerStatus === 'not_connected' && 'Click "Initialize Device" to connect your BioMini scanner'}
            {scannerStatus === 'initializing' && 'Connecting to device and checking hardware...'}
            {scannerStatus === 'ready' && 'Place finger firmly on the scanner surface'}
            {scannerStatus === 'scanning' && 'Keep finger steady - do not move until complete'}
          </Typography>
        </Paper>
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

      {bioMiniAvailable && scannerStatus !== 'service_unavailable' && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body2">
            ✓ BioMini Web Agent connected via proxy
          </Typography>
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
          <Button
            fullWidth
            size="small"
            variant="contained"
            startIcon={scannerStatus === 'scanning' ? <CircularProgress size={20} /> : <FingerprintIcon />}
            disabled={disabled || scannerStatus !== 'ready'}
            onClick={bioMiniAvailable ? handleBioMiniCapture : handleTestCapture}
          >
            {scannerStatus === 'scanning' ? 'Scanning...' : 'Capture'}
          </Button>
        </Grid>
      </Grid>

      {/* Captured Fingerprint Preview */}
      {capturedImageUrl && (
        <Card sx={{ mt: 3 }}>
          <CardHeader 
            title="Captured Fingerprint" 
            subheader={`Captured at ${lastCaptureTime}`}
            action={
              <Chip 
                label="Ready" 
                color="success" 
                size="small"
                icon={<CheckCircleIcon />}
              />
            }
          />
          <CardContent>
            <Box sx={{ textAlign: 'center' }}>
              <Paper 
                elevation={3}
                sx={{ 
                  display: 'inline-block', 
                  p: 2, 
                  backgroundColor: '#f5f5f5',
                  border: '2px solid #4caf50'
                }}
              >
                <img 
                  src={capturedImageUrl} 
                  alt="Captured Fingerprint"
                  style={{
                    maxWidth: '300px',
                    maxHeight: '300px',
                    width: 'auto',
                    height: 'auto',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                />
              </Paper>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                ✅ Fingerprint captured successfully from BioMini Slim 2
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Image format: BMP | Ready for processing
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    if (capturedImageUrl) {
                      URL.revokeObjectURL(capturedImageUrl);
                      setCapturedImageUrl('');
                      setLastCaptureTime('');
                    }
                  }}
                >
                  Clear Image
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
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