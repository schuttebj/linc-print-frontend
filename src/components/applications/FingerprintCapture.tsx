import React, { useState } from 'react';
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
  Paper
} from '@mui/material';
import {
  Fingerprint as FingerprintIcon,
  Warning as WarningIcon,
  Settings as SettingsIcon,
  Info as InfoIcon
} from '@mui/icons-material';

interface FingerprintCaptureProps {
  onFingerprintCapture: (fingerprintFile: File) => void;
  disabled?: boolean;
}

const FingerprintCapture: React.FC<FingerprintCaptureProps> = ({
  onFingerprintCapture,
  disabled = false
}) => {
  const [scannerStatus, setScannerStatus] = useState<'not_connected' | 'ready' | 'scanning'>('not_connected');

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
    <Card>
      <CardHeader 
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <FingerprintIcon />
            <Typography variant="h6">Fingerprint Capture</Typography>
            <Chip 
              label="DEVELOPMENT MODE" 
              size="small" 
              color="warning" 
              icon={<WarningIcon />}
            />
          </Box>
        }
        subheader="Biometric fingerprint scanner integration"
      />
      <CardContent>
        <Grid container spacing={3}>
          {/* Scanner Status */}
          <Grid item xs={12}>
            <Paper
              elevation={1}
              sx={{
                p: 3,
                textAlign: 'center',
                backgroundColor: 
                  scannerStatus === 'not_connected' ? '#fff3e0' :
                  scannerStatus === 'ready' ? '#e8f5e8' :
                  '#e3f2fd',
                border: '2px dashed',
                borderColor:
                  scannerStatus === 'not_connected' ? '#ff9800' :
                  scannerStatus === 'ready' ? '#4caf50' :
                  '#2196f3'
              }}
            >
              <FingerprintIcon 
                sx={{ 
                  fontSize: 80, 
                  mb: 2,
                  color: 
                    scannerStatus === 'not_connected' ? '#ff9800' :
                    scannerStatus === 'ready' ? '#4caf50' :
                    '#2196f3'
                }} 
              />
              <Typography variant="h6" gutterBottom>
                {scannerStatus === 'not_connected' && 'Fingerprint Scanner Not Connected'}
                {scannerStatus === 'ready' && 'Scanner Ready'}
                {scannerStatus === 'scanning' && 'Scanning Fingerprint...'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {scannerStatus === 'not_connected' && 'Please connect and configure the fingerprint scanner hardware'}
                {scannerStatus === 'ready' && 'Place finger on scanner when ready to capture'}
                {scannerStatus === 'scanning' && 'Keep finger steady on the scanner surface'}
              </Typography>
            </Paper>
          </Grid>

          {/* Control Buttons */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<SettingsIcon />}
                  disabled={disabled}
                  onClick={() => setScannerStatus(scannerStatus === 'ready' ? 'not_connected' : 'ready')}
                >
                  {scannerStatus === 'ready' ? 'Disconnect Scanner' : 'Connect Scanner'}
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<FingerprintIcon />}
                  disabled={disabled || scannerStatus !== 'ready'}
                  onClick={handleTestCapture}
                >
                  {scannerStatus === 'scanning' ? 'Scanning...' : 'Capture Fingerprint'}
                </Button>
              </Grid>
            </Grid>
          </Grid>

          {/* Hardware Requirements */}
          <Grid item xs={12}>
            <Alert severity="warning" icon={<WarningIcon />}>
              <Typography variant="body2" gutterBottom>
                <strong>Hardware Integration Required:</strong>
              </Typography>
              <Typography variant="body2" component="ul" sx={{ mt: 1, pl: 2, mb: 0 }}>
                <li>Compatible fingerprint scanner (USB/Serial connection)</li>
                <li>Driver installation and device configuration</li>
                <li>Integration with biometric capture API</li>
                <li>Live finger detection and quality assessment</li>
              </Typography>
            </Alert>
          </Grid>

          {/* Technical Notes */}
          <Grid item xs={12}>
            <Alert severity="info" icon={<InfoIcon />}>
              <Typography variant="body2">
                <strong>Development Note:</strong> This component currently provides placeholder functionality for testing. 
                The actual fingerprint scanner integration will be implemented once hardware is available and configured.
                The captured fingerprint data will be securely stored and processed according to biometric data protection standards.
              </Typography>
            </Alert>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default FingerprintCapture; 