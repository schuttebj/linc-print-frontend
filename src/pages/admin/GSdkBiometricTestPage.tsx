/**
 * G-SDK Server-Side Biometric Test Page
 * 
 * Demonstrates server-side fingerprint matching using G-SDK Device Gateway:
 * 1. Server captures fingerprints via G-SDK
 * 2. Templates processed server-side
 * 3. Server-side matching for better scalability
 * 4. Comparison with existing WebAgent system
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Button,
  TextField,
  Alert,
  Tabs,
  Tab,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  CloudSync,
  Fingerprint,
  Speed,
  Compare,
  Delete,
  Refresh,
  Settings,
  ExpandMore,
  CheckCircle,
  Error,
  Warning
} from '@mui/icons-material';

import { gSdkBiometricService } from '../../services/gSdkBiometricService';
import { biometricApiService } from '../../services/biometricApiService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const GSdkBiometricTestPage: React.FC = () => {
  console.log('🔥 GSdkBiometricTestPage component rendering...');
  
  const [activeTab, setActiveTab] = useState(0);
  
  // G-SDK Configuration
  const [gsdkConfig, setGsdkConfig] = useState({
    gatewayIp: '127.0.0.1',
    gatewayPort: 4000,
    deviceIp: '192.168.0.110',
    devicePort: 51211
  });
  
  // G-SDK Status
  const [gsdkStatus, setGsdkStatus] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Templates
  const [gsdkTemplates, setGsdkTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  
  // Test Results
  const [testResults, setTestResults] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Comparison Data
  const [systemComparison, setSystemComparison] = useState<any>(null);
  
  // Test Configuration
  const [testPersonId, setTestPersonId] = useState('test-person-gsdk-001');
  const [testFingerPosition, setTestFingerPosition] = useState(1);
  const [qualityThreshold, setQualityThreshold] = useState(40);

  const FINGER_NAMES = {
    1: 'Right Thumb', 2: 'Right Index', 3: 'Right Middle', 4: 'Right Ring', 5: 'Right Little',
    6: 'Left Thumb', 7: 'Left Index', 8: 'Left Middle', 9: 'Left Ring', 10: 'Left Little'
  };

  useEffect(() => {
    loadGsdkStatus();
    loadGsdkTemplates();
  }, []);

  const loadGsdkStatus = async () => {
    try {
      const response = await gSdkBiometricService.getStatus();
      setGsdkStatus(response.status);
    } catch (error) {
      console.error('Failed to load G-SDK status:', error);
    }
  };

  const loadGsdkTemplates = async () => {
    try {
      const response = await gSdkBiometricService.getTemplates();
      setGsdkTemplates(response.templates || []);
    } catch (error) {
      console.error('Failed to load G-SDK templates:', error);
      setGsdkTemplates([]);
    }
  };

  const handleInitializeGsdk = async () => {
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      console.log('🚀 Initializing G-SDK with config:', gsdkConfig);
      
      const response = await gSdkBiometricService.initialize(gsdkConfig);
      console.log('✅ G-SDK initialization response:', response);
      
      await loadGsdkStatus();
      setConnectionError(null);
      
    } catch (error) {
      console.error('❌ G-SDK initialization failed:', error);
      setConnectionError(error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCapture = async () => {
    setIsProcessing(true);
    try {
      console.log('📸 Capturing fingerprint via G-SDK...');
      
      const response = await gSdkBiometricService.captureFingerprint({
        qualityThreshold: qualityThreshold
      });
      
      console.log('✅ Capture successful:', response);
      setTestResults({
        type: 'capture',
        success: true,
        data: response,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Capture failed:', error);
      setTestResults({
        type: 'capture',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEnroll = async () => {
    setIsProcessing(true);
    try {
      console.log('📝 Enrolling fingerprint via G-SDK...');
      
      const response = await gSdkBiometricService.enrollFingerprint({
        personId: testPersonId,
        fingerPosition: testFingerPosition,
        qualityThreshold: qualityThreshold
      });
      
      console.log('✅ Enrollment successful:', response);
      setTestResults({
        type: 'enroll',
        success: true,
        data: response,
        timestamp: new Date().toISOString()
      });
      
      // Refresh templates list
      await loadGsdkTemplates();
      
    } catch (error) {
      console.error('❌ Enrollment failed:', error);
      setTestResults({
        type: 'enroll',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerify = async () => {
    if (!selectedTemplate) {
      alert('Please select a template to verify against');
      return;
    }
    
    setIsProcessing(true);
    try {
      console.log('🔍 Verifying fingerprint via G-SDK...');
      
      const response = await gSdkBiometricService.verifyFingerprint({
        templateId: selectedTemplate,
        qualityThreshold: qualityThreshold
      });
      
      console.log('✅ Verification result:', response);
      setTestResults({
        type: 'verify',
        success: true,
        data: response,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Verification failed:', error);
      setTestResults({
        type: 'verify',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleIdentify = async () => {
    setIsProcessing(true);
    try {
      console.log('🔍 Performing 1:N identification via G-SDK...');
      
      const response = await gSdkBiometricService.identifyFingerprint({
        maxResults: 10,
        qualityThreshold: qualityThreshold
      });
      
      console.log('✅ Identification result:', response);
      setTestResults({
        type: 'identify',
        success: true,
        data: response,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Identification failed:', error);
      setTestResults({
        type: 'identify',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompareSystems = async () => {
    setIsProcessing(true);
    try {
      console.log('📊 Comparing biometric systems...');
      
      const response = await gSdkBiometricService.compareSystems();
      console.log('✅ Comparison result:', response);
      
      setSystemComparison(response.comparison);
      setActiveTab(3); // Switch to comparison tab
      
    } catch (error) {
      console.error('❌ System comparison failed:', error);
      alert(`Comparison failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await gSdkBiometricService.deleteTemplate(templateId);
      await loadGsdkTemplates();
      console.log('✅ Template deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete template:', error);
      alert(`Failed to delete template: ${error.message}`);
    }
  };

  const handleClearCache = async () => {
    try {
      await gSdkBiometricService.clearCache();
      await loadGsdkTemplates();
      setTestResults(null);
      console.log('✅ Cache cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
      alert(`Failed to clear cache: ${error.message}`);
    }
  };

  const renderConnectionTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader 
            title="🌐 G-SDK Gateway Configuration" 
            subheader="Configure connection to G-SDK Device Gateway"
          />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Gateway IP"
                  value={gsdkConfig.gatewayIp}
                  onChange={(e) => setGsdkConfig(prev => ({...prev, gatewayIp: e.target.value}))}
                  helperText="IP address of G-SDK Device Gateway"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Gateway Port"
                  type="number"
                  value={gsdkConfig.gatewayPort}
                  onChange={(e) => setGsdkConfig(prev => ({...prev, gatewayPort: parseInt(e.target.value)}))}
                  helperText="Port of G-SDK Device Gateway (default: 4000)"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Device IP"
                  value={gsdkConfig.deviceIp}
                  onChange={(e) => setGsdkConfig(prev => ({...prev, deviceIp: e.target.value}))}
                  helperText="IP address of BioStar device"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Device Port"
                  type="number"
                  value={gsdkConfig.devicePort}
                  onChange={(e) => setGsdkConfig(prev => ({...prev, devicePort: parseInt(e.target.value)}))}
                  helperText="Port of BioStar device (default: 51211)"
                />
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<CloudSync />}
                onClick={handleInitializeGsdk}
                disabled={isConnecting}
                fullWidth
              >
                {isConnecting ? 'Connecting...' : 'Initialize G-SDK Connection'}
              </Button>
            </Box>
            
            {connectionError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Connection failed: {connectionError}
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader 
            title="📊 G-SDK System Status" 
            action={
              <Button startIcon={<Refresh />} onClick={loadGsdkStatus}>
                Refresh
              </Button>
            }
          />
          <CardContent>
            {gsdkStatus ? (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box display="flex" alignItems="center" gap={1}>
                    {gsdkStatus.connected ? <CheckCircle color="success" /> : <Error color="error" />}
                    <Typography variant="h6">
                      {gsdkStatus.connected ? 'Connected' : 'Disconnected'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography><strong>G-SDK Available:</strong> {gsdkStatus.gsdk_available ? '✅ Yes' : '❌ No'}</Typography>
                  <Typography><strong>Device ID:</strong> {gsdkStatus.device_id || 'None'}</Typography>
                  <Typography><strong>Templates Stored:</strong> {gsdkStatus.templates_stored}</Typography>
                  <Typography><strong>Gateway:</strong> {gsdkStatus.gateway_ip}:{gsdkStatus.gateway_port}</Typography>
                </Grid>
                {gsdkStatus.device_info && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Device Info:</Typography>
                    <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>
                      {gsdkStatus.device_info}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            ) : (
              <Typography color="text.secondary">Loading status...</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderTestingTab = () => (
    <Grid container spacing={3}>
      {/* Test Configuration */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardHeader title="⚙️ Test Configuration" />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Person ID"
                  value={testPersonId}
                  onChange={(e) => setTestPersonId(e.target.value)}
                  helperText="Unique identifier for testing"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Finger Position</InputLabel>
                  <Select
                    value={testFingerPosition}
                    onChange={(e) => setTestFingerPosition(e.target.value as number)}
                  >
                    {Object.entries(FINGER_NAMES).map(([pos, name]) => (
                      <MenuItem key={pos} value={parseInt(pos)}>
                        {name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Quality Threshold"
                  type="number"
                  value={qualityThreshold}
                  onChange={(e) => setQualityThreshold(parseInt(e.target.value))}
                  helperText="Minimum quality (0-100)"
                  inputProps={{ min: 0, max: 100 }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
      
      {/* Test Actions */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardHeader title="🧪 G-SDK Biometric Tests" />
          <CardContent>
            {isProcessing && <LinearProgress sx={{ mb: 2 }} />}
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Fingerprint />}
                  onClick={handleCapture}
                  disabled={isProcessing || !gsdkStatus?.connected}
                >
                  Capture Fingerprint
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<CloudSync />}
                  onClick={handleEnroll}
                  disabled={isProcessing || !gsdkStatus?.connected}
                >
                  Enroll Template
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<CheckCircle />}
                  onClick={handleVerify}
                  disabled={isProcessing || !gsdkStatus?.connected || !selectedTemplate}
                >
                  Verify (1:1)
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<Speed />}
                  onClick={handleIdentify}
                  disabled={isProcessing || !gsdkStatus?.connected}
                >
                  Identify (1:N)
                </Button>
              </Grid>
            </Grid>
            
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Server-Side Processing:</strong> All fingerprint processing happens on the server using G-SDK Device Gateway.
                This eliminates client-side template downloads and enables better scalability.
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      </Grid>
      
      {/* Test Results */}
      {testResults && (
        <Grid item xs={12}>
          <Card>
            <CardHeader 
              title={`📋 Test Results: ${testResults.type}`}
              subheader={`Executed at ${new Date(testResults.timestamp).toLocaleString()}`}
            />
            <CardContent>
              {testResults.success ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Test completed successfully
                </Alert>
              ) : (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Test failed: {testResults.error}
                </Alert>
              )}
              
              <Typography variant="h6" gutterBottom>Response Data:</Typography>
              <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                <pre style={{ margin: 0, fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(testResults.data || testResults.error, null, 2)}
                </pre>
              </Paper>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );

  const renderTemplatesTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardHeader 
            title="📚 G-SDK Templates"
            action={
              <Box>
                <Button startIcon={<Delete />} onClick={handleClearCache} color="error" sx={{ mr: 1 }}>
                  Clear All
                </Button>
                <Button startIcon={<Refresh />} onClick={loadGsdkTemplates}>
                  Refresh
                </Button>
              </Box>
            }
          />
          <CardContent>
            {gsdkTemplates.length > 0 ? (
              <>
                <Box sx={{ mb: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>Select Template for Verification</InputLabel>
                    <Select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                    >
                      {gsdkTemplates.map((template) => (
                        <MenuItem key={template.template_id} value={template.template_id}>
                          {template.person_id} - {FINGER_NAMES[template.finger_position]} ({template.template_id.slice(0, 8)}...)
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Template ID</TableCell>
                        <TableCell>Person ID</TableCell>
                        <TableCell>Finger</TableCell>
                        <TableCell>Quality</TableCell>
                        <TableCell>Enrolled</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {gsdkTemplates.map((template) => (
                        <TableRow key={template.template_id}>
                          <TableCell>
                            <Typography variant="body2" fontFamily="monospace">
                              {template.template_id.slice(0, 16)}...
                            </Typography>
                          </TableCell>
                          <TableCell>{template.person_id}</TableCell>
                          <TableCell>
                            <Chip 
                              label={FINGER_NAMES[template.finger_position]} 
                              size="small" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>{template.quality_score}</TableCell>
                          <TableCell>
                            {new Date(template.enrolled_at).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              startIcon={<Delete />}
                              onClick={() => handleDeleteTemplate(template.template_id)}
                              color="error"
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            ) : (
              <Alert severity="info">
                No templates stored in G-SDK system. Use the Testing tab to enroll some templates.
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderComparisonTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardHeader 
            title="⚖️ System Comparison"
            action={
              <Button startIcon={<Compare />} onClick={handleCompareSystems}>
                Refresh Comparison
              </Button>
            }
          />
          <CardContent>
            {systemComparison ? (
              <Grid container spacing={3}>
                {/* WebAgent System */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        🌐 {systemComparison.webagent_system.name}
                      </Typography>
                      <Typography><strong>Templates:</strong> {systemComparison.webagent_system.templates_stored}</Typography>
                      <Typography><strong>Storage:</strong> {systemComparison.webagent_system.storage}</Typography>
                      <Typography><strong>Matching:</strong> {systemComparison.webagent_system.matching}</Typography>
                      <Typography><strong>Cost:</strong> {systemComparison.webagent_system.cost}</Typography>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Typography variant="subtitle2">Pros & Cons</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Typography variant="body2" gutterBottom><strong>Pros:</strong></Typography>
                          <ul>
                            {systemComparison.webagent_system.pros.map((pro: string, index: number) => (
                              <li key={index}>{pro}</li>
                            ))}
                          </ul>
                          <Typography variant="body2" gutterBottom><strong>Cons:</strong></Typography>
                          <ul>
                            {systemComparison.webagent_system.cons.map((con: string, index: number) => (
                              <li key={index}>{con}</li>
                            ))}
                          </ul>
                        </AccordionDetails>
                      </Accordion>
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* G-SDK System */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        🚀 {systemComparison.gsdk_system.name}
                      </Typography>
                      <Typography><strong>Templates:</strong> {systemComparison.gsdk_system.templates_stored}</Typography>
                      <Typography><strong>Storage:</strong> {systemComparison.gsdk_system.storage}</Typography>
                      <Typography><strong>Matching:</strong> {systemComparison.gsdk_system.matching}</Typography>
                      <Typography><strong>Cost:</strong> {systemComparison.gsdk_system.cost}</Typography>
                      <Typography><strong>Connected:</strong> {systemComparison.gsdk_system.device_connected ? '✅ Yes' : '❌ No'}</Typography>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Typography variant="subtitle2">Pros & Cons</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Typography variant="body2" gutterBottom><strong>Pros:</strong></Typography>
                          <ul>
                            {systemComparison.gsdk_system.pros.map((pro: string, index: number) => (
                              <li key={index}>{pro}</li>
                            ))}
                          </ul>
                          <Typography variant="body2" gutterBottom><strong>Cons:</strong></Typography>
                          <ul>
                            {systemComparison.gsdk_system.cons.map((con: string, index: number) => (
                              <li key={index}>{con}</li>
                            ))}
                          </ul>
                        </AccordionDetails>
                      </Accordion>
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Recommendations */}
                <Grid item xs={12}>
                  <Card sx={{ bgcolor: 'warning.light' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        💡 Recommendations
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <Alert severity="info">
                            <Typography variant="body2">
                              <strong>Current Scale:</strong><br/>
                              {systemComparison.recommendation.current_scale}
                            </Typography>
                          </Alert>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Alert severity="warning">
                            <Typography variant="body2">
                              <strong>Large Scale:</strong><br/>
                              {systemComparison.recommendation.large_scale}
                            </Typography>
                          </Alert>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Alert severity="success">
                            <Typography variant="body2">
                              <strong>Hybrid Approach:</strong><br/>
                              {systemComparison.recommendation.hybrid_approach}
                            </Typography>
                          </Alert>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            ) : (
              <Alert severity="info">
                Click "Refresh Comparison" to compare WebAgent and G-SDK systems.
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        🚀 G-SDK Server-Side Biometric Testing
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Test server-side fingerprint matching using Suprema G-SDK Device Gateway
      </Typography>

      <Card sx={{ mt: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab icon={<Settings />} label="Connection" />
          <Tab icon={<Fingerprint />} label="Testing" />
          <Tab icon={<CloudSync />} label="Templates" />
          <Tab icon={<Compare />} label="Comparison" />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          {renderConnectionTab()}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {renderTestingTab()}
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          {renderTemplatesTab()}
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          {renderComparisonTab()}
        </TabPanel>
      </Card>
    </Box>
  );
};

export default GSdkBiometricTestPage;
