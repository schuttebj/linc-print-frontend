/**
 * Production Biometric System Test Page
 * 
 * Demonstrates the complete production workflow:
 * 1. Frontend captures fingerprints via WebAgent
 * 2. Templates extracted in ISO 19794-2 format
 * 3. Backend stores templates securely in PostgreSQL
 * 4. Professional verification using UFMatcher
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Autocomplete,
  CircularProgress,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  Person,
  Security,
  Analytics,
  Settings,
  Fingerprint
} from '@mui/icons-material';

import ProductionFingerprintCapture from '../../components/biometric/ProductionFingerprintCapture';
import { biometricApiService, FingerprintEnrollResponse, FingerprintTemplateInfo, BiometricSystemStats } from '../../services/biometricApiService';
import { personService } from '../../services/personService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface Person {
  id: string;
  first_name: string;
  surname: string;
  aliases: Array<{
    document_number: string;
    document_type: string;
    is_primary: boolean;
  }>;
}

const ProductionBiometricTestPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [testPersonId, setTestPersonId] = useState('');
  const [testApplicationId, setTestApplicationId] = useState('');
  const [selectedFingers, setSelectedFingers] = useState<number[]>([2, 7]); // Right Index, Left Index
  const [enrollmentResults, setEnrollmentResults] = useState<FingerprintEnrollResponse[]>([]);
  const [personTemplates, setPersonTemplates] = useState<FingerprintTemplateInfo[]>([]);
  const [systemStats, setSystemStats] = useState<BiometricSystemStats | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  
  // Person search state
  const [persons, setPersons] = useState<Person[]>([]);
  const [personSearchQuery, setPersonSearchQuery] = useState('');
  const [isSearchingPersons, setIsSearchingPersons] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  const FINGER_NAMES = {
    1: 'Right Thumb', 2: 'Right Index', 3: 'Right Middle', 4: 'Right Ring', 5: 'Right Little',
    6: 'Left Thumb', 7: 'Left Index', 8: 'Left Middle', 9: 'Left Ring', 10: 'Left Little'
  };

  useEffect(() => {
    loadSystemStats();
  }, []);

  useEffect(() => {
    if (testPersonId) {
      loadPersonTemplates();
    }
  }, [testPersonId]);

  // Update testPersonId when selectedPerson changes
  useEffect(() => {
    if (selectedPerson) {
      setTestPersonId(selectedPerson.id);
    }
  }, [selectedPerson]);

  const loadSystemStats = async () => {
    try {
      const stats = await biometricApiService.getSystemStats();
      setSystemStats(stats);
    } catch (error) {
      console.error('Failed to load system stats:', error);
    }
  };

  const loadPersonTemplates = async () => {
    try {
      const templates = await biometricApiService.getPersonTemplates(testPersonId);
      setPersonTemplates(templates);
    } catch (error) {
      console.error('Failed to load person templates:', error);
      setPersonTemplates([]);
    }
  };

  const searchPersons = async (query: string) => {
    if (!query.trim()) {
      setPersons([]);
      return;
    }

    setIsSearchingPersons(true);
    try {
      const response = await personService.searchPersons({
        search_text: query,
        limit: 10
      });
      setPersons(response.persons);
    } catch (error) {
      console.error('Failed to search persons:', error);
      setPersons([]);
    } finally {
      setIsSearchingPersons(false);
    }
  };

  const handlePersonSearch = (query: string) => {
    setPersonSearchQuery(query);
    if (query.length >= 2) {
      searchPersons(query);
    } else {
      setPersons([]);
    }
  };

  const selectPerson = (person: Person) => {
    setSelectedPerson(person);
    setPersonSearchQuery(`${person.first_name} ${person.surname}`);
    setPersons([]);
  };

  const handleEnrollmentComplete = (results: FingerprintEnrollResponse[]) => {
    setEnrollmentResults(results);
    loadPersonTemplates(); // Refresh templates list
    loadSystemStats(); // Refresh stats
  };

  const handleVerificationComplete = (result: { success: boolean; templateId: string; score?: number }) => {
    console.log('Verification completed:', result);
    // Could show a success/failure dialog here
  };

  const renderEnrollmentTab = () => (
    <Grid container spacing={3}>
      {/* Configuration */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardHeader title="📋 Enrollment Configuration" />
          <CardContent>
            {/* Person Selector */}
            <Autocomplete
              fullWidth
              options={persons}
              getOptionLabel={(option) => `${option.first_name} ${option.surname} (${option.id.slice(0, 8)}...)`}
              value={selectedPerson}
              onChange={(_, newValue) => {
                if (newValue) {
                  selectPerson(newValue);
                }
              }}
              inputValue={personSearchQuery}
              onInputChange={(_, newInputValue) => {
                handlePersonSearch(newInputValue);
              }}
              loading={isSearchingPersons}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="🔍 Search for Person"
                  helperText={selectedPerson ? `Selected: ${selectedPerson.first_name} ${selectedPerson.surname}` : "Type to search for a person"}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {isSearchingPersons ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <ListItem {...props}>
                  <ListItemText
                    primary={`${option.first_name} ${option.surname}`}
                    secondary={`ID: ${option.id.slice(0, 8)}... ${option.aliases.length > 0 ? `| Doc: ${option.aliases[0].document_number}` : ''}`}
                  />
                </ListItem>
              )}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Person ID (UUID)"
              value={testPersonId}
              onChange={(e) => setTestPersonId(e.target.value)}
              sx={{ mb: 2 }}
              helperText="UUID of the person to enroll (auto-filled from search)"
              disabled={!!selectedPerson}
            />
            
            <TextField
              fullWidth
              label="Application ID (Optional)"
              value={testApplicationId}
              onChange={(e) => setTestApplicationId(e.target.value)}
              sx={{ mb: 2 }}
              helperText="Associated application UUID"
            />
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Fingers to Capture</InputLabel>
              <Select
                multiple
                value={selectedFingers}
                onChange={(e) => setSelectedFingers(e.target.value as number[])}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={FINGER_NAMES[value]} size="small" />
                    ))}
                  </Box>
                )}
              >
                {Object.entries(FINGER_NAMES).map(([value, name]) => (
                  <MenuItem key={value} value={parseInt(value)}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Alert severity="info">
              <Typography variant="body2">
                <strong>🔒 Production Mode:</strong> Uses ISO 19794-2 templates for vendor independence
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      </Grid>
      
      {/* Enrollment Process */}
      <Grid item xs={12} md={8}>
        <ProductionFingerprintCapture
          personId={testPersonId}
          applicationId={testApplicationId || undefined}
          requiredFingers={selectedFingers}
          onEnrollmentComplete={handleEnrollmentComplete}
          mode="enroll"
        />
      </Grid>
      
      {/* Results */}
      {enrollmentResults.length > 0 && (
        <Grid item xs={12}>
          <Card>
            <CardHeader title="📊 Enrollment Results" />
            <CardContent>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Finger</TableCell>
                      <TableCell>Template ID</TableCell>
                      <TableCell>Format</TableCell>
                      <TableCell>Size</TableCell>
                      <TableCell>Quality</TableCell>
                      <TableCell>Enrolled</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {enrollmentResults.map((result) => (
                      <TableRow key={result.template_id}>
                        <TableCell>{FINGER_NAMES[result.finger_position]}</TableCell>
                        <TableCell>{result.template_id.substring(0, 8)}...</TableCell>
                        <TableCell>{result.template_format}</TableCell>
                        <TableCell>{result.template_size} bytes</TableCell>
                        <TableCell>{result.quality_score || 'N/A'}</TableCell>
                        <TableCell>{new Date(result.enrolled_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );

  const renderVerificationTab = () => (
    <Grid container spacing={3}>
      {/* Configuration */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardHeader title="🔍 Verification Configuration" />
          <CardContent>
            <TextField
              fullWidth
              label="Person ID"
              value={testPersonId}
              onChange={(e) => setTestPersonId(e.target.value)}
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Template to Verify</InputLabel>
              <Select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
              >
                {personTemplates.map((template) => (
                  <MenuItem key={template.template_id} value={template.template_id}>
                    {FINGER_NAMES[template.finger_position]} - {template.template_id.substring(0, 8)}...
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Alert severity="info">
              <Typography variant="body2">
                <strong>🔒 Security:</strong> FAR 1/100,000 (Professional Grade)
              </Typography>
            </Alert>
          </CardContent>
        </Card>
        
        {/* Existing Templates */}
        <Card sx={{ mt: 2 }}>
          <CardHeader title="📋 Existing Templates" />
          <CardContent>
            {personTemplates.length === 0 ? (
              <Typography color="text.secondary">No templates found for this person</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Finger</TableCell>
                      <TableCell>Quality</TableCell>
                      <TableCell>Verified</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {personTemplates.map((template) => (
                      <TableRow key={template.template_id}>
                        <TableCell>{FINGER_NAMES[template.finger_position]}</TableCell>
                        <TableCell>{template.quality_score || 'N/A'}</TableCell>
                        <TableCell>
                          <Chip
                            label={template.is_verified ? 'Yes' : 'No'}
                            color={template.is_verified ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Grid>
      
      {/* Verification Process */}
      <Grid item xs={12} md={8}>
        {selectedTemplateId ? (
          <ProductionFingerprintCapture
            personId={testPersonId}
            applicationId={testApplicationId || undefined}
            onVerificationComplete={handleVerificationComplete}
            mode="verify"
            templateId={selectedTemplateId}
          />
        ) : (
          <Card>
            <CardContent>
              <Alert severity="warning">
                Please select a template to verify against from the dropdown on the left.
              </Alert>
            </CardContent>
          </Card>
        )}
      </Grid>
    </Grid>
  );

  const renderAnalyticsTab = () => (
    <Grid container spacing={3}>
      {/* System Statistics */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="📊 System Statistics" />
          <CardContent>
            {systemStats ? (
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="h4" color="primary">
                    {systemStats.total_templates.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Templates
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h4" color="primary">
                    {systemStats.total_persons_enrolled.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Enrolled Persons
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h4" color="primary">
                    {systemStats.total_verifications.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Verifications
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h4" color="primary">
                    {systemStats.verifications_24h.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Last 24 Hours
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Chip
                    label={`System Status: ${systemStats.system_status.toUpperCase()}`}
                    color={systemStats.system_status === 'operational' ? 'success' : 'error'}
                  />
                </Grid>
              </Grid>
            ) : (
              <Typography>Loading statistics...</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
      
      {/* Architecture Overview */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="🏗️ Production Architecture" />
          <CardContent>
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="subtitle2">✅ Production Ready</Typography>
              <Typography variant="body2">
                This system follows enterprise biometric security standards
              </Typography>
            </Alert>
            
            <Typography variant="subtitle2" gutterBottom>Components:</Typography>
            <Box sx={{ pl: 2 }}>
              <Typography variant="body2">🖥️ <strong>Frontend:</strong> React + WebAgent</Typography>
              <Typography variant="body2">🔧 <strong>Templates:</strong> ISO 19794-2 (vendor-independent)</Typography>
              <Typography variant="body2">⚙️ <strong>Backend:</strong> FastAPI + PostgreSQL</Typography>
              <Typography variant="body2">🔒 <strong>Security:</strong> UFMatcher Professional</Typography>
              <Typography variant="body2">📊 <strong>Scale:</strong> Ready for 500K+ templates</Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        🧬 Production Biometric System
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Enterprise-grade fingerprint enrollment and verification system following industry best practices
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>🔐 Production Security:</strong> ISO 19794-2 templates • UFMatcher engine • PostgreSQL storage • Full audit trail
        </Typography>
      </Alert>

      <Card>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab icon={<Person />} label="Enrollment" />
          <Tab icon={<Security />} label="Verification" />
          <Tab icon={<Analytics />} label="Analytics" />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          {renderEnrollmentTab()}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {renderVerificationTab()}
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          {renderAnalyticsTab()}
        </TabPanel>
      </Card>
    </Box>
  );
};

export default ProductionBiometricTestPage;
