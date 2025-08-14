/**
 * Production Fingerprint Capture Component
 * 
 * Implements the recommended architecture:
 * - WebAgent for capture and template extraction
 * - Backend API for secure storage and verification
 * - ISO 19794-2 templates for vendor independence
 * - Full audit trail and compliance
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Button,
  Typography,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  LinearProgress,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import {
  Fingerprint,
  CheckCircle,
  Error,
  Info,
  Person,
  Security,
  Schedule,
  Close
} from '@mui/icons-material';

import { biometricApiService, FingerprintEnrollResponse, FingerprintTemplateInfo } from '../../services/biometricApiService';

interface ProductionFingerprintCaptureProps {
  personId: string;
  applicationId?: string;
  requiredFingers?: number[]; // ISO finger positions 1-10
  onEnrollmentComplete?: (results: FingerprintEnrollResponse[]) => void;
  onVerificationComplete?: (result: { success: boolean; templateId: string; score?: number }) => void;
  mode: 'enroll' | 'verify';
  templateId?: string; // Required for verify mode
}

interface DeviceStatus {
  initialized: boolean;
  available: boolean;
  model?: string;
  error?: string;
}

interface LogEntry {
  timestamp: Date;
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

const FINGER_NAMES = {
  1: 'Right Thumb',
  2: 'Right Index',
  3: 'Right Middle', 
  4: 'Right Ring',
  5: 'Right Little',
  6: 'Left Thumb',
  7: 'Left Index',
  8: 'Left Middle',
  9: 'Left Ring',
  10: 'Left Little'
};

const ProductionFingerprintCapture: React.FC<ProductionFingerprintCaptureProps> = ({
  personId,
  applicationId,
  requiredFingers = [2, 7], // Default: Right Index, Left Index
  onEnrollmentComplete,
  onVerificationComplete,
  mode,
  templateId
}) => {
  // State management
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({ initialized: false, available: false });
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [enrollmentResults, setEnrollmentResults] = useState<FingerprintEnrollResponse[]>([]);
  const [existingTemplates, setExistingTemplates] = useState<FingerprintTemplateInfo[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [progress, setProgress] = useState(0);

  const addLog = (message: string, level: LogEntry['level'] = 'info') => {
    setLogs(prev => [...prev, { timestamp: new Date(), level, message }]);
  };

  // Initialize device on component mount
  useEffect(() => {
    initializeDevice();
    if (mode === 'verify' && personId) {
      loadExistingTemplates();
    }
  }, [personId, mode]);

  const initializeDevice = async () => {
    try {
      addLog('Initializing BioMini device...', 'info');
      await biometricApiService.initializeDevice();
      
      const status = biometricApiService.getDeviceStatus();
      setDeviceStatus({ 
        initialized: status.initialized, 
        available: status.available,
        model: 'BioMini Slim 2'
      });
      
      if (status.initialized) {
        addLog('✅ BioMini device ready for production use', 'success');
      } else {
        addLog('❌ Failed to initialize BioMini device', 'error');
      }
    } catch (error) {
      addLog(`❌ Device initialization failed: ${error.message}`, 'error');
      setDeviceStatus({ initialized: false, available: false, error: error.message });
    }
  };

  const loadExistingTemplates = async () => {
    try {
      const templates = await biometricApiService.getPersonTemplates(personId);
      setExistingTemplates(templates);
      addLog(`📋 Loaded ${templates.length} existing templates`, 'info');
    } catch (error) {
      addLog(`⚠️ Could not load existing templates: ${error.message}`, 'warning');
    }
  };

  const handleEnrollment = async () => {
    setIsProcessing(true);
    setProgress(0);
    
    try {
      addLog('🚀 Starting production fingerprint enrollment...', 'info');
      addLog(`📋 Enrolling ${requiredFingers.length} fingerprints with ISO 19794-2 format`, 'info');
      
      const results = await biometricApiService.enrollFingerprints(
        personId,
        requiredFingers,
        applicationId
      );
      
      setEnrollmentResults(results);
      setCurrentStep(1);
      setProgress(100);
      
      addLog(`🎉 Enrollment completed successfully: ${results.length} templates stored`, 'success');
      
      if (onEnrollmentComplete) {
        onEnrollmentComplete(results);
      }
      
    } catch (error) {
      addLog(`❌ Enrollment failed: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerification = async () => {
    if (!templateId) {
      addLog('❌ No template ID provided for verification', 'error');
      return;
    }

    setIsProcessing(true);
    
    try {
      addLog('🔍 Starting production fingerprint verification...', 'info');
      
      const result = await biometricApiService.verifyFingerprint(
        templateId,
        4, // Security level 4 (FAR 1/100,000)
        applicationId
      );
      
      const success = result.match_found;
      addLog(`${success ? '✅' : '❌'} Verification ${success ? 'SUCCESSFUL' : 'FAILED'}`, success ? 'success' : 'error');
      
      if (result.match_score) {
        addLog(`📊 Match score: ${result.match_score}/100`, 'info');
      }
      
      if (onVerificationComplete) {
        onVerificationComplete({
          success,
          templateId,
          score: result.match_score
        });
      }
      
      setCurrentStep(1);
      
    } catch (error) {
      addLog(`❌ Verification failed: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const getSteps = () => {
    if (mode === 'enroll') {
      return [
        'Device Ready & Fingerprint Capture',
        'Enrollment Complete'
      ];
    } else {
      return [
        'Fingerprint Verification',
        'Verification Complete'
      ];
    }
  };

  const renderDeviceStatus = () => (
    <Card sx={{ mb: 2 }}>
      <CardHeader 
        title="📱 BioMini Device Status" 
        titleTypographyProps={{ variant: 'h6' }}
      />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Chip 
              icon={deviceStatus.initialized ? <CheckCircle /> : <Error />}
              label={deviceStatus.initialized ? 'Ready' : 'Not Ready'}
              color={deviceStatus.initialized ? 'success' : 'error'}
            />
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              {deviceStatus.model || 'Unknown Device'}
            </Typography>
          </Grid>
        </Grid>
        
        {deviceStatus.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {deviceStatus.error}
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const renderEnrollmentStepper = () => (
    <Stepper activeStep={currentStep} orientation="vertical">
      <Step>
        <StepLabel>Fingerprint Capture & Enrollment</StepLabel>
        <StepContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" gutterBottom>
              Ready to capture {requiredFingers.length} fingerprints using ISO 19794-2 format
            </Typography>
            
            <List dense>
              {requiredFingers.map(finger => (
                <ListItem key={finger}>
                  <ListItemIcon>
                    <Fingerprint />
                  </ListItemIcon>
                  <ListItemText primary={FINGER_NAMES[finger]} />
                </ListItem>
              ))}
            </List>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                🔒 <strong>Production Security:</strong> Templates stored with ISO standard format for vendor independence
              </Typography>
            </Alert>
            
            {isProcessing && <LinearProgress sx={{ mb: 2 }} />}
            
            <Button
              variant="contained"
              onClick={handleEnrollment}
              disabled={!deviceStatus.initialized || isProcessing}
              size="large"
              startIcon={<Fingerprint />}
            >
              {isProcessing ? 'Enrolling Fingerprints...' : 'Start Enrollment'}
            </Button>
          </Box>
        </StepContent>
      </Step>
      
      <Step>
        <StepLabel>Enrollment Complete</StepLabel>
        <StepContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="h6">✅ Enrollment Successful!</Typography>
            <Typography variant="body2">
              {enrollmentResults.length} fingerprint templates have been securely stored in the backend database.
            </Typography>
          </Alert>
          
          {enrollmentResults.map((result, index) => (
            <Card key={result.template_id} sx={{ mb: 1 }}>
              <CardContent sx={{ py: 1 }}>
                <Grid container alignItems="center" spacing={2}>
                  <Grid item>
                    <Fingerprint color="success" />
                  </Grid>
                  <Grid item xs>
                    <Typography variant="subtitle2">
                      {FINGER_NAMES[result.finger_position]}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Template ID: {result.template_id.substring(0, 8)}...
                    </Typography>
                  </Grid>
                  <Grid item>
                    <Chip 
                      label={`${result.template_size} bytes`} 
                      size="small" 
                      variant="outlined" 
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))}
        </StepContent>
      </Step>
    </Stepper>
  );

  const renderVerificationStepper = () => (
    <Stepper activeStep={currentStep} orientation="vertical">
      <Step>
        <StepLabel>Fingerprint Verification</StepLabel>
        <StepContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" gutterBottom>
              Verify your identity by scanning your enrolled fingerprint
            </Typography>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                🔒 <strong>Security Level:</strong> FAR 1/100,000 (Professional Grade)
              </Typography>
            </Alert>
            
            {existingTemplates.length > 0 && (
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Available Templates:
                  </Typography>
                  {existingTemplates.map(template => (
                    <Chip 
                      key={template.template_id}
                      label={FINGER_NAMES[template.finger_position]}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </CardContent>
              </Card>
            )}
            
            {isProcessing && <LinearProgress sx={{ mb: 2 }} />}
            
            <Button
              variant="contained"
              onClick={handleVerification}
              disabled={!deviceStatus.initialized || isProcessing}
              size="large"
              startIcon={<Security />}
            >
              {isProcessing ? 'Verifying...' : 'Verify Fingerprint'}
            </Button>
          </Box>
        </StepContent>
      </Step>
      
      <Step>
        <StepLabel>Verification Complete</StepLabel>
        <StepContent>
          <Alert severity="success">
            <Typography variant="h6">✅ Verification Complete!</Typography>
            <Typography variant="body2">
              Identity confirmed using professional biometric matching.
            </Typography>
          </Alert>
        </StepContent>
      </Step>
    </Stepper>
  );

  return (
    <Box>
      {/* Device Status */}
      {renderDeviceStatus()}
      
      {/* Main Process */}
      <Card>
        <CardHeader 
          title={
            <Box display="flex" alignItems="center" gap={1}>
              {mode === 'enroll' ? <Person /> : <Security />}
              <Typography variant="h6">
                {mode === 'enroll' ? 'Production Fingerprint Enrollment' : 'Production Fingerprint Verification'}
              </Typography>
            </Box>
          }
          action={
            <Button
              startIcon={<Info />}
              onClick={() => setShowLogs(true)}
              variant="outlined"
              size="small"
            >
              View Logs ({logs.length})
            </Button>
          }
        />
        <CardContent>
          {mode === 'enroll' ? renderEnrollmentStepper() : renderVerificationStepper()}
        </CardContent>
      </Card>
      
      {/* Logs Dialog */}
      <Dialog 
        open={showLogs} 
        onClose={() => setShowLogs(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          System Logs
          <IconButton
            onClick={() => setShowLogs(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <List dense>
            {logs.map((log, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  {log.level === 'success' && <CheckCircle color="success" />}
                  {log.level === 'error' && <Error color="error" />}
                  {log.level === 'warning' && <Error color="warning" />}
                  {log.level === 'info' && <Info color="info" />}
                </ListItemIcon>
                <ListItemText
                  primary={log.message}
                  secondary={log.timestamp.toLocaleTimeString()}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogs([])}>Clear Logs</Button>
          <Button onClick={() => setShowLogs(false)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductionFingerprintCapture;
