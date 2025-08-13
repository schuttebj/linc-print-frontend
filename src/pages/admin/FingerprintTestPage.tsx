/**
 * Temporary Fingerprint Test Page
 * 
 * Quick test page for BioMini Slim 2 integration
 * Remove this page once testing is complete
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Grid,
  Alert,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Fingerprint as FingerprintIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Settings as SettingsIcon,
  Info as InfoIcon
} from '@mui/icons-material';

import FingerprintCapture from '../../components/applications/FingerprintCapture';
import bioMiniService from '../../services/bioMiniService';
import { debugBioMini } from '../../debug/biomini-debug';

const FingerprintTestPage: React.FC = () => {
  const [capturedFingerprint, setCapturedFingerprint] = useState<File | null>(null);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string>('');
  const [captureTimestamp, setCaptureTimestamp] = useState<string>('');
  const [testLog, setTestLog] = useState<string[]>([]);
  const [serviceStatus, setServiceStatus] = useState<{
    available: boolean;
    initialized: boolean;
    devices: any[];
    error?: string;
  }>({
    available: false,
    initialized: false,
    devices: []
  });

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    setTestLog(prev => [...prev, logEntry]);
    console.log(logEntry);
  };

  const handleFingerprintCapture = (fingerprintFile: File) => {
    console.log('🎯 TEST PAGE: handleFingerprintCapture called!', fingerprintFile);
    
    // Clean up previous image URL if exists
    if (capturedImageUrl) {
      URL.revokeObjectURL(capturedImageUrl);
    }
    
    // Create new image URL and set states
    const imageUrl = URL.createObjectURL(fingerprintFile);
    setCapturedFingerprint(fingerprintFile);
    setCapturedImageUrl(imageUrl);
    setCaptureTimestamp(new Date().toLocaleString());
    
    addLog(`🎯 TEST PAGE CALLBACK TRIGGERED!`, 'success');
    addLog(`✅ Fingerprint captured successfully!`, 'success');
    addLog(`📁 File: ${fingerprintFile.name}`, 'info');
    addLog(`📊 Size: ${fingerprintFile.size} bytes (${(fingerprintFile.size/1024).toFixed(1)} KB)`, 'info');
    addLog(`🖼️ Type: ${fingerprintFile.type}`, 'info');
    addLog(`⏰ Captured at: ${new Date().toLocaleTimeString()}`, 'info');
    addLog(`🔗 Image URL created: ${imageUrl.substring(0, 50)}...`, 'info');
    
    console.log('🖼️ Image URL created:', imageUrl);
    console.log('📊 States updated - capturedFingerprint:', !!fingerprintFile, 'capturedImageUrl:', !!imageUrl);
  };

  // Check what's available via the proxy
  const checkAvailableEndpoints = async () => {
    addLog('🔍 Checking proxy endpoints...', 'info');
    
    const endpointsToCheck = [
      '/api/getScannerList',
      '/api/initDevice', 
      '/api/version',
      '/api/createSessionID',
      '/',
      '/html/index.html'
    ];

    for (const endpoint of endpointsToCheck) {
      try {
        // Use proxy URL in development, direct in production
        const url = `/biomini${endpoint}${endpoint.includes('?') ? '&' : '?'}dummy=${Math.random()}`;
        addLog(`📡 Testing: ${url}`, 'info');
        
        const response = await fetch(url, {
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        });
        
        if (response.ok) {
          addLog(`✅ Working: ${endpoint} (${response.status})`, 'success');
        } else {
          addLog(`❌ Failed: ${endpoint} (${response.status} ${response.statusText})`, 'error');
        }
      } catch (error) {
        addLog(`❌ Error: ${endpoint} - ${error instanceof Error ? error.message : 'failed'}`, 'error');
      }
    }
  };

  const runDiagnostics = async () => {
    addLog('🔍 Running BioMini diagnostics...', 'info');
    addLog('ℹ️  Note: getScannerList API is not supported, using initDevice response', 'info');
    
    // First check what endpoints are available
    await checkAvailableEndpoints();
    
    try {
      // Check service connection
      addLog('Checking Web Agent connection...', 'info');
      const isAvailable = await bioMiniService.checkWebAgentConnection();
      
      if (isAvailable) {
        addLog('✅ Web Agent connection successful', 'success');
        
        // Try to initialize device
        addLog('Attempting device initialization...', 'info');
        const initialized = await bioMiniService.initializeDevice();
        
        if (initialized) {
          addLog('✅ Device initialized successfully', 'success');
          
          // Get device list from initialization (getScannerList API is not supported)
          const devices = bioMiniService.getAvailableDevices();
          addLog(`✅ Found ${devices.length} device(s)`, 'success');
          
          devices.forEach((device, index) => {
            addLog(`Device ${index + 1}: ${device.DeviceType || device.ScannerType} (Handle: ${device.DeviceHandle})`, 'info');
            if (device.ScannerName) {
              addLog(`  └── Serial: ${device.ScannerName}`, 'info');
            }
          });
          
          setServiceStatus({
            available: true,
            initialized: true,
            devices: devices
          });
        } else {
          addLog('❌ Device initialization failed', 'error');
        }
      } else {
        addLog('❌ Cannot connect to Web Agent', 'error');
        setServiceStatus({
          available: false,
          initialized: false,
          devices: [],
          error: 'Web Agent not accessible'
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`❌ Diagnostics failed: ${errorMessage}`, 'error');
      setServiceStatus({
        available: false,
        initialized: false,
        devices: [],
        error: errorMessage
      });
    }
  };

  const clearLog = () => {
    setTestLog([]);
    addLog('Log cleared', 'info');
  };

  useEffect(() => {
    addLog('🚀 Fingerprint Test Page loaded', 'info');
    addLog('🎯 CORRECTED IMPLEMENTATION: Based on BiominiWebAgent.js analysis', 'info');
    addLog('📡 API Endpoints: /api/initDevice, /api/captureSingle, /api/getCaptureEnd', 'info');
    addLog('🖼️ Image Endpoint: /img/CaptureImg.bmp with session parameters', 'info');
    addLog('🌐 Development: Using Vite proxy /biomini → https://localhost', 'info');
    
    // Auto-run diagnostics
    setTimeout(() => {
      runDiagnostics();
    }, 1000);
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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <FingerprintIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" gutterBottom>
              🧪 BioMini Fingerprint Test
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Temporary test page for BioMini Slim 2 integration
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Left Column: Fingerprint Capture */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="Fingerprint Capture Test"
              subheader="Test the actual fingerprint capture functionality"
            />
            <CardContent>
              <FingerprintCapture
                onFingerprintCapture={handleFingerprintCapture}
                disabled={false}
              />
              
              {/* Debug info about FingerprintCapture */}
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  🔍 <strong>Debug:</strong> FingerprintCapture component rendered
                </Typography>
                <Typography variant="caption" display="block">
                  • Callback function: {typeof handleFingerprintCapture}
                </Typography>
                <Typography variant="caption" display="block">
                  • Current captured state: {capturedFingerprint ? 'Has file' : 'No file'}
                </Typography>
                <Typography variant="caption" display="block">
                  • Image URL state: {capturedImageUrl ? 'Has URL' : 'No URL'}
                </Typography>
              </Alert>
              
              {capturedFingerprint && capturedImageUrl && (
                <Card sx={{ mt: 3, border: '2px solid #4caf50' }}>
                  <CardHeader 
                    title={
                      <Box display="flex" alignItems="center" gap={1}>
                        <FingerprintIcon color="success" />
                        <Typography variant="h6">Captured Fingerprint</Typography>
                      </Box>
                    }
                    subheader={`Captured on ${captureTimestamp}`}
                    action={
                      <Chip 
                        label="SUCCESS" 
                        color="success" 
                        size="small"
                        icon={<CheckCircleIcon />}
                      />
                    }
                  />
                  <CardContent>
                    {/* Image Preview */}
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                      <Paper 
                        elevation={3}
                        sx={{ 
                          display: 'inline-block', 
                          p: 3, 
                          backgroundColor: '#f8f9fa',
                          border: '3px solid #4caf50',
                          borderRadius: 2
                        }}
                      >
                        <img 
                          src={capturedImageUrl}
                          alt="Captured fingerprint from BioMini Slim 2"
                          style={{ 
                            maxWidth: '400px', 
                            maxHeight: '400px',
                            width: 'auto',
                            height: 'auto',
                            border: '1px solid #ccc',
                            borderRadius: '4px'
                          }}
                        />
                      </Paper>
                    </Box>

                    {/* File Information */}
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Paper sx={{ p: 2, backgroundColor: '#e8f5e8' }}>
                          <Typography variant="subtitle2" gutterBottom>
                            📁 File Details
                          </Typography>
                          <Typography variant="body2" component="div">
                            <strong>Name:</strong> {capturedFingerprint.name}
                          </Typography>
                          <Typography variant="body2" component="div">
                            <strong>Size:</strong> {capturedFingerprint.size} bytes ({(capturedFingerprint.size/1024).toFixed(1)} KB)
                          </Typography>
                          <Typography variant="body2" component="div">
                            <strong>Type:</strong> {capturedFingerprint.type}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Paper sx={{ p: 2, backgroundColor: '#e3f2fd' }}>
                          <Typography variant="subtitle2" gutterBottom>
                            🎯 Capture Status
                          </Typography>
                          <Typography variant="body2" component="div">
                            <strong>Source:</strong> BioMini Slim 2
                          </Typography>
                          <Typography variant="body2" component="div">
                            <strong>Format:</strong> Bitmap (BMP)
                          </Typography>
                          <Typography variant="body2" component="div">
                            <strong>Status:</strong> ✅ Ready for Processing
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>

                    {/* Action Buttons */}
                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => {
                          if (capturedImageUrl) {
                            URL.revokeObjectURL(capturedImageUrl);
                          }
                          setCapturedFingerprint(null);
                          setCapturedImageUrl('');
                          setCaptureTimestamp('');
                          addLog('🗑️ Cleared captured fingerprint', 'info');
                        }}
                        sx={{ mr: 2 }}
                      >
                        Clear Image
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = capturedImageUrl;
                          link.download = capturedFingerprint.name;
                          link.click();
                          addLog('💾 Downloaded fingerprint image', 'success');
                        }}
                      >
                        Download Image
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Diagnostics and Status */}
        <Grid item xs={12} md={6}>
          {/* Service Status */}
          <Card sx={{ mb: 3 }}>
            <CardHeader 
              title="Service Status"
              subheader="Current BioMini Web Agent status"
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2">Web Agent:</Typography>
                    <Chip 
                      label={serviceStatus.available ? 'Connected' : 'Offline'}
                      color={serviceStatus.available ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2">Device:</Typography>
                    <Chip 
                      label={serviceStatus.initialized ? 'Ready' : 'Not Ready'}
                      color={serviceStatus.initialized ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2">
                    Devices: {serviceStatus.devices.length} found
                  </Typography>
                  {serviceStatus.devices.map((device, index) => (
                    <Typography key={index} variant="caption" display="block" sx={{ ml: 2 }}>
                      • {device.ScannerType} ({device.Serial})
                    </Typography>
                  ))}
                </Grid>
              </Grid>
              
              {serviceStatus.error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {serviceStatus.error}
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Controls */}
          <Card sx={{ mb: 3 }}>
            <CardHeader title="Test Controls" />
            <CardContent>
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<InfoIcon />}
                    onClick={runDiagnostics}
                  >
                    Run Diagnostics
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => {
                      // Add debug info to console and logs
                      const envInfo = {
                        isDev: import.meta.env.DEV,
                        mode: import.meta.env.MODE,
                        url: window.location.href
                      };
                      addLog(`🌍 Environment: ${JSON.stringify(envInfo)}`, 'info');
                      console.log('🔧 Debug Info:', envInfo);
                      console.log('🔧 BioMini Service:', bioMiniService);
                    }}
                    size="small"
                  >
                    Debug Info
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="secondary"
                    onClick={() => {
                      addLog('🧪 Testing callback with simulated fingerprint...', 'info');
                      
                      // Create a test image file to simulate capture
                      const canvas = document.createElement('canvas');
                      canvas.width = 300;
                      canvas.height = 300;
                      const ctx = canvas.getContext('2d');
                      
                      if (ctx) {
                        // Draw a test pattern
                        ctx.fillStyle = '#f0f0f0';
                        ctx.fillRect(0, 0, 300, 300);
                        ctx.fillStyle = '#333';
                        ctx.font = '20px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText('TEST FINGERPRINT', 150, 150);
                        ctx.fillText(new Date().toLocaleTimeString(), 150, 180);
                        
                        canvas.toBlob((blob) => {
                          if (blob) {
                            const testFile = new File([blob], `test_fingerprint_${Date.now()}.bmp`, { type: 'image/bmp' });
                            addLog('🧪 Simulated capture created, calling callback...', 'info');
                            handleFingerprintCapture(testFile);
                          }
                        }, 'image/png');
                      }
                    }}
                    size="small"
                  >
                    Test Callback
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={clearLog}
                    size="small"
                  >
                    Clear Log
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setCapturedFingerprint(null)}
                    size="small"
                  >
                    Clear Image
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Connection Info */}
          <Card>
            <CardHeader title="Connection Information" />
            <CardContent>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                <strong>Web Agent URL:</strong> /biomini (dev) | https://localhost (prod)
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                <strong>Service:</strong> BioMiniWebAgent.exe (running on port 443)
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                <strong>API Pattern:</strong> /api/initDevice, /api/captureSingle, /api/getCaptureEnd
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                <strong>Device:</strong> BioMini Slim 2 (via DeviceHandle parameter)
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Troubleshooting:</strong>
                </Typography>
                <Typography variant="caption" component="div">
                  1. Ensure BioMiniWebAgent.exe is running<br/>
                  2. Check device is connected via USB<br/>
                  3. Verify Web Agent is on port 443<br/>
                  4. Allow browser to access localhost HTTPS<br/>
                  5. Check if Web Agent uses different API paths
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Full Width: Activity Log */}
        <Grid item xs={12}>
          <Card>
            <CardHeader 
              title="Activity Log"
              action={
                <Button size="small" onClick={clearLog}>
                  Clear
                </Button>
              }
            />
            <CardContent>
              <Box
                sx={{
                  bgcolor: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  borderRadius: 1,
                  p: 2,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  height: '200px',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {testLog.join('\n')}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default FingerprintTestPage;
