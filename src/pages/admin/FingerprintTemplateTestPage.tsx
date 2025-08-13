/**
 * Comprehensive Fingerprint Template Test Page
 * 
 * Tests both fingerprint image capture and template extraction/matching
 * Demonstrates the full workflow for fingerprint matching systems
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
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Fingerprint as FingerprintIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Delete as DeleteIcon,
  Compare as CompareIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

import bioMiniService from '../../services/bioMiniService';

interface StoredTemplate {
  id: string;
  name: string;
  template: string;
  format: number;
  timestamp: string;
  imageUrl?: string;
}

interface VerificationResult {
  verified: boolean;
  score?: number;
  templateName: string;
  timestamp: string;
}

const FingerprintTemplateTestPage: React.FC = () => {
  // Basic state
  const [capturedImageUrl, setCapturedImageUrl] = useState<string>('');
  const [capturedTemplate, setCapturedTemplate] = useState<string>('');
  const [templateFormat, setTemplateFormat] = useState<number>(2001); // XPERIX
  const [qualityLevel, setQualityLevel] = useState<number>(6); // 40 quality points
  
  // Storage state
  const [storedTemplates, setStoredTemplates] = useState<StoredTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templateName, setTemplateName] = useState<string>('');
  
  // Verification state
  const [verificationResults, setVerificationResults] = useState<VerificationResult[]>([]);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  
  // UI state
  const [logs, setLogs] = useState<Array<{time: string, message: string, type: 'info' | 'success' | 'error'}>>([]);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState<boolean>(false);
  
  // Device status
  const [deviceStatus, setDeviceStatus] = useState<{
    available: boolean;
    initialized: boolean;
    devices: any[];
  }>({
    available: false,
    initialized: false,
    devices: []
  });

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { time: timestamp, message, type }]);
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
  };

  // Initialize device on load
  useEffect(() => {
    initializeDevice();
    loadStoredTemplates();
  }, []);

  const initializeDevice = async () => {
    try {
      addLog('🔄 Initializing BioMini device...', 'info');
      
      const isConnected = await bioMiniService.checkWebAgentConnection();
      if (!isConnected) {
        throw new Error('BioMini Web Agent not running');
      }
      
      const initialized = await bioMiniService.initializeDevice();
      if (!initialized) {
        throw new Error('Device initialization failed');
      }
      
      const devices = bioMiniService.getAvailableDevices();
      setDeviceStatus({
        available: true,
        initialized: true,
        devices
      });
      
      addLog(`✅ Device initialized: ${devices[0]?.ScannerName || 'BioMini'}`, 'success');
    } catch (error) {
      addLog(`❌ Initialization failed: ${error.message}`, 'error');
      setDeviceStatus({
        available: false,
        initialized: false,
        devices: []
      });
    }
  };

  const captureFingerprint = async () => {
    if (!deviceStatus.initialized) {
      addLog('❌ Device not initialized', 'error');
      return;
    }

    setIsCapturing(true);
    try {
      addLog('🔍 Starting fingerprint capture...', 'info');
      
      // Capture fingerprint image
      const fingerprintFile = await bioMiniService.captureFingerprint();
      
      // Create image URL for preview
      const imageUrl = URL.createObjectURL(fingerprintFile);
      setCapturedImageUrl(imageUrl);
      
      // Extract template
      addLog('🧬 Extracting template data...', 'info');
      const template = await bioMiniService.extractTemplate(templateFormat, qualityLevel);
      setCapturedTemplate(template);
      
      addLog(`✅ Capture successful! Template: ${template.length} chars`, 'success');
      addLog(`📊 Format: ${getTemplateFormatName(templateFormat)}, Quality: ${qualityLevel}`, 'info');
      
    } catch (error) {
      addLog(`❌ Capture failed: ${error.message}`, 'error');
    } finally {
      setIsCapturing(false);
    }
  };

  const saveTemplate = () => {
    if (!capturedTemplate || !templateName.trim()) {
      addLog('❌ No template captured or name provided', 'error');
      return;
    }

    const newTemplate: StoredTemplate = {
      id: Date.now().toString(),
      name: templateName.trim(),
      template: capturedTemplate,
      format: templateFormat,
      timestamp: new Date().toISOString(),
      imageUrl: capturedImageUrl
    };

    const updatedTemplates = [...storedTemplates, newTemplate];
    setStoredTemplates(updatedTemplates);
    localStorage.setItem('biomini-templates', JSON.stringify(updatedTemplates));
    
    addLog(`✅ Template saved: ${newTemplate.name}`, 'success');
    setTemplateName('');
    setShowTemplateDialog(false);
  };

  const deleteTemplate = (templateId: string) => {
    const updatedTemplates = storedTemplates.filter(t => t.id !== templateId);
    setStoredTemplates(updatedTemplates);
    localStorage.setItem('biomini-templates', JSON.stringify(updatedTemplates));
    
    if (selectedTemplate === templateId) {
      setSelectedTemplate('');
    }
    
    addLog('🗑️ Template deleted', 'info');
  };

  const verifyAgainstTemplate = async (templateId: string) => {
    const template = storedTemplates.find(t => t.id === templateId);
    if (!template) {
      addLog('❌ Template not found', 'error');
      return;
    }

    setIsVerifying(true);
    try {
      addLog(`🔍 Starting verification against template: ${template.name}`, 'info');
      addLog('👆 Please place your finger on the scanner and KEEP IT THERE until verification completes...', 'info');
      
      // Use the new capture-and-verify method that keeps timing tight
      const result = await bioMiniService.captureAndVerifyTemplate(
        template.template, 
        qualityLevel, 
        template.format // Use the stored template format
      );
      
      const verificationResult: VerificationResult = {
        verified: result.verified,
        score: result.score,
        templateName: template.name,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setVerificationResults(prev => [verificationResult, ...prev]);
      
      const status = result.verified ? '✅ MATCH' : '❌ NO MATCH';
      const scoreText = result.score ? ` (Score: ${result.score})` : '';
      addLog(`${status}: ${template.name}${scoreText}`, result.verified ? 'success' : 'error');
      
      // Update captured image if available
      if (result.imageFile) {
        const imageUrl = URL.createObjectURL(result.imageFile);
        setCapturedImageUrl(imageUrl);
      }
      
    } catch (error) {
      addLog(`❌ Verification failed: ${error.message}`, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyAgainstAll = async () => {
    if (storedTemplates.length === 0) {
      addLog('❌ No stored templates to verify against', 'error');
      return;
    }

    setIsVerifying(true);
    try {
      addLog(`🔍 Starting 1:N identification against ${storedTemplates.length} templates...`, 'info');
      addLog('⚠️ This will require multiple scans - one for each template', 'info');
      
      let matchCount = 0;
      
      for (let i = 0; i < storedTemplates.length; i++) {
        const template = storedTemplates[i];
        try {
          addLog(`🔍 Scan ${i + 1}/${storedTemplates.length}: Testing against ${template.name}`, 'info');
          addLog('👆 Please place your finger on the scanner and KEEP IT THERE...', 'info');
          
          const result = await bioMiniService.captureAndVerifyTemplate(
            template.template, 
            qualityLevel, 
            template.format
          );
          
          if (result.verified) {
            matchCount++;
            const scoreText = result.score ? ` (Score: ${result.score})` : '';
            addLog(`✅ MATCH: ${template.name}${scoreText}`, 'success');
            
            // Update captured image for the match
            if (result.imageFile) {
              const imageUrl = URL.createObjectURL(result.imageFile);
              setCapturedImageUrl(imageUrl);
            }
          } else {
            addLog(`❌ No match: ${template.name}`, 'info');
          }
          
          // Small delay between scans
          if (i < storedTemplates.length - 1) {
            addLog('⏰ Please wait 2 seconds before next scan...', 'info');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
        } catch (error) {
          addLog(`❌ Verification error for ${template.name}: ${error.message}`, 'error');
        }
      }
      
      addLog(`🎯 Identification complete: ${matchCount} matches found out of ${storedTemplates.length} templates`, matchCount > 0 ? 'success' : 'info');
      
    } catch (error) {
      addLog(`❌ Identification failed: ${error.message}`, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const loadStoredTemplates = () => {
    try {
      const stored = localStorage.getItem('biomini-templates');
      if (stored) {
        const templates: StoredTemplate[] = JSON.parse(stored);
        setStoredTemplates(templates);
        addLog(`📚 Loaded ${templates.length} stored templates`, 'info');
      }
    } catch (error) {
      addLog('❌ Failed to load stored templates', 'error');
    }
  };

  const getTemplateFormatName = (format: number): string => {
    switch (format) {
      case 2001: return 'XPERIX';
      case 2002: return 'ISO 19794-2';
      case 2003: return 'ANSI 378';
      default: return 'Unknown';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        🧬 Fingerprint Template Testing
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Complete workflow for fingerprint capture, template extraction, and matching
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>💡 Important:</strong> For verification, keep your finger on the scanner throughout the entire process. 
          The system captures a fresh fingerprint and immediately verifies it against stored templates.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        {/* Device Status */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="🔧 Device Status" />
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item>
                  <Chip
                    label={deviceStatus.initialized ? 'Ready' : 'Not Ready'}
                    color={deviceStatus.initialized ? 'success' : 'error'}
                    icon={deviceStatus.initialized ? <CheckCircleIcon /> : <ErrorIcon />}
                  />
                </Grid>
                <Grid item>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={initializeDevice}
                    size="small"
                  >
                    Reinitialize
                  </Button>
                </Grid>
                {deviceStatus.devices.length > 0 && (
                  <Grid item>
                    <Typography variant="body2">
                      Device: {deviceStatus.devices[0].ScannerName}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Capture Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="📸 Fingerprint Capture" />
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Template Format</InputLabel>
                      <Select
                        value={templateFormat}
                        onChange={(e) => setTemplateFormat(Number(e.target.value))}
                        label="Template Format"
                      >
                        <MenuItem value={2001}>XPERIX (Recommended)</MenuItem>
                        <MenuItem value={2002}>ISO 19794-2</MenuItem>
                        <MenuItem value={2003}>ANSI 378</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Quality Level</InputLabel>
                      <Select
                        value={qualityLevel}
                        onChange={(e) => setQualityLevel(Number(e.target.value))}
                        label="Quality Level"
                      >
                        <MenuItem value={1}>None</MenuItem>
                        <MenuItem value={6}>40 (Recommended)</MenuItem>
                        <MenuItem value={8}>60</MenuItem>
                        <MenuItem value={10}>80</MenuItem>
                        <MenuItem value={11}>90</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>

              <Button
                fullWidth
                variant="contained"
                startIcon={isCapturing ? <CircularProgress size={20} /> : <FingerprintIcon />}
                onClick={captureFingerprint}
                disabled={!deviceStatus.initialized || isCapturing}
                sx={{ mb: 2 }}
              >
                {isCapturing ? 'Capturing...' : 'Capture Fingerprint & Extract Template'}
              </Button>

              {capturedImageUrl && (
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <img
                    src={capturedImageUrl}
                    alt="Captured Fingerprint"
                    style={{
                      maxWidth: '200px',
                      maxHeight: '200px',
                      border: '1px solid #ccc',
                      borderRadius: '4px'
                    }}
                  />
                </Box>
              )}

              {capturedTemplate && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Template Data ({getTemplateFormatName(templateFormat)})
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={capturedTemplate.substring(0, 200) + '...'}
                    disabled
                    size="small"
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    onClick={() => setShowTemplateDialog(true)}
                    size="small"
                  >
                    Save Template
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Stored Templates */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="📚 Stored Templates" />
            <CardContent>
              {storedTemplates.length === 0 ? (
                <Typography color="text.secondary">
                  No templates stored yet. Capture and save a fingerprint to get started.
                </Typography>
              ) : (
                <List dense>
                  {storedTemplates.map((template) => (
                    <ListItem key={template.id}>
                      <ListItemText
                        primary={template.name}
                        secondary={`${getTemplateFormatName(template.format)} - ${new Date(template.timestamp).toLocaleDateString()}`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => verifyAgainstTemplate(template.id)}
                          disabled={!deviceStatus.initialized || isVerifying}
                          size="small"
                        >
                          <CompareIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          onClick={() => deleteTemplate(template.id)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}

              {storedTemplates.length > 0 && capturedTemplate && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={isVerifying ? <CircularProgress size={20} /> : <CompareIcon />}
                    onClick={verifyAgainstAll}
                    disabled={isVerifying}
                  >
                    {isVerifying ? 'Verifying...' : 'Verify Against All Templates'}
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Verification Results */}
        {verificationResults.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardHeader title="🎯 Verification Results" />
              <CardContent>
                <List>
                  {verificationResults.slice(0, 10).map((result, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {result.verified ? <CheckCircleIcon color="success" /> : <ErrorIcon color="error" />}
                            <Typography>
                              {result.verified ? 'MATCH' : 'NO MATCH'} - {result.templateName}
                            </Typography>
                          </Box>
                        }
                        secondary={`${result.timestamp}${result.score ? ` - Score: ${result.score}` : ''}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Logs */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="📝 Activity Log" />
            <CardContent>
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {logs.slice().reverse().map((log, index) => (
                  <Alert 
                    key={index} 
                    severity={log.type} 
                    sx={{ mb: 1, fontSize: '0.875rem' }}
                  >
                    [{log.time}] {log.message}
                  </Alert>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Save Template Dialog */}
      <Dialog open={showTemplateDialog} onClose={() => setShowTemplateDialog(false)}>
        <DialogTitle>Save Fingerprint Template</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Template Name"
            fullWidth
            variant="outlined"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="e.g., John Doe - Right Index"
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Format: {getTemplateFormatName(templateFormat)} | 
            Quality: {qualityLevel} | 
            Size: {capturedTemplate.length} characters
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
          <Button onClick={saveTemplate} variant="contained" disabled={!templateName.trim()}>
            Save Template
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FingerprintTemplateTestPage;
