/**
 * PoliceInformationSection Component
 * 
 * Police clearance capture component for professional license applications
 * Similar to MedicalInformationSection but focused on police clearance requirements
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  TextField,
  FormControl,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  InputLabel,
  Alert,
  Switch,
  Button,
  Container,
  Paper,
  Tabs,
  Tab,
  CircularProgress
} from '@mui/material';
import {
  Security as SecurityIcon,
  CloudUpload as UploadIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

export interface PoliceInformation {
  police_clearance_obtained: boolean;
  clearance_date: string;
  report_type: string;
  issuing_authority: string;
  certificate_number: string;
  police_clearance_file?: File;
  clearance_passed: boolean;
  clearance_restrictions: string[];
  examined_by: string;
  notes: string;
}

interface PoliceInformationSectionProps {
  value: PoliceInformation | null;
  onChange: (data: PoliceInformation) => void;
  disabled?: boolean;
  isRequired?: boolean;
  // Props for tabbed interface like PersonFormWrapper
  selectedCategories?: string[];
  personAge?: number;
  externalPoliceStep?: number;
  onPoliceValidationChange?: (step: number, isValid: boolean) => void;
  onPoliceStepChange?: (step: number, canAdvance: boolean) => void;
  onContinueToApplication?: () => void;
  onCancel?: () => void;
  showHeader?: boolean;
}

const PoliceInformationSection: React.FC<PoliceInformationSectionProps> = ({
  value,
  onChange,
  disabled = false,
  isRequired = false,
  selectedCategories = [],
  personAge = 0,
  externalPoliceStep = 0,
  onPoliceValidationChange,
  onPoliceStepChange,
  onContinueToApplication,
  onCancel,
  showHeader = true
}) => {
  // Internal tab state (only used if using tabbed interface)
  const [internalStep, setInternalStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Police clearance steps for tabbed interface
  const policeSteps = [
    {
      label: 'Police Clearance',
      icon: <SecurityIcon />
    }
  ];

  // Check if we're using the tabbed interface (external callbacks provided)
  const isTabbed = !!onPoliceStepChange;

  // Initialize with default police clearance data
  const policeData: PoliceInformation = value || {
    police_clearance_obtained: false,
    clearance_date: '',
    report_type: '',
    issuing_authority: '',
    certificate_number: '',
    police_clearance_file: undefined,
    clearance_passed: false,
    clearance_restrictions: [],
    examined_by: '',
    notes: ''
  };

  // Available report types
  const reportTypes = [
    'Criminal Background Check',
    'Police Clearance Certificate',
    'Certificate of Good Conduct',
    'No Criminal Record Certificate',
    'Character Certificate'
  ];

  // Available issuing authorities
  const issuingAuthorities = [
    'Madagascar National Police',
    'Regional Police Command',
    'Local Police Station',
    'Ministry of Interior',
    'Other'
  ];

  const updatePoliceInfo = (field: keyof PoliceInformation, value: any) => {
    const updated = {
      ...policeData,
      [field]: value
    };

    // Auto-update clearance passed status based on obtained status
    if (field === 'police_clearance_obtained') {
      updated.clearance_passed = value;
    }
    
    onChange(updated);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      updatePoliceInfo('police_clearance_file', file);
    }
  };

  // Step validation for tabbed interface
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Police Clearance
        return isRequired ? policeData.police_clearance_obtained && !!policeData.clearance_date : true;
      default:
        return false;
    }
  };

  // Navigation handlers for tabbed interface
  const handleNext = () => {
    if (internalStep < policeSteps.length - 1) {
      const nextStep = internalStep + 1;
      setInternalStep(nextStep);
      if (onPoliceStepChange) {
        onPoliceStepChange(nextStep, isStepValid(nextStep));
      }
    }
  };

  const handleBack = () => {
    if (internalStep > 0) {
      const prevStep = internalStep - 1;
      setInternalStep(prevStep);
      if (onPoliceStepChange) {
        onPoliceStepChange(prevStep, isStepValid(prevStep));
      }
    }
  };

  const handleContinue = () => {
    if (onContinueToApplication) {
      onContinueToApplication();
    }
  };

  // Tab change handler
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    if (newValue <= internalStep || (newValue === internalStep + 1 && isStepValid(internalStep))) {
      setInternalStep(newValue);
      if (onPoliceStepChange) {
        onPoliceStepChange(newValue, isStepValid(newValue));
      }
    }
  };

  // Helper function to render tab with completion indicator
  const renderTabLabel = (step: any, index: number) => {
    const isCompleted = index < internalStep && isStepValid(index);
    const isCurrent = internalStep === index;
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          color: isCompleted ? 'success.main' : isCurrent ? 'primary.main' : 'text.secondary' 
        }}>
          {isCompleted ? <CheckCircleIcon fontSize="small" /> : step.icon}
        </Box>
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: isCurrent ? 'bold' : 'normal',
            color: isCompleted ? 'success.main' : isCurrent ? 'primary.main' : 'text.secondary'
          }}
        >
          {step.label}
        </Typography>
      </Box>
    );
  };

  // Trigger validation callbacks when data changes
  useEffect(() => {
    if (onPoliceValidationChange) {
      onPoliceValidationChange(internalStep, isStepValid(internalStep));
    }
  }, [policeData, internalStep, onPoliceValidationChange]);

  // Handle external step changes
  useEffect(() => {
    if (externalPoliceStep !== undefined && externalPoliceStep !== internalStep) {
      setInternalStep(externalPoliceStep);
    }
  }, [externalPoliceStep]);

  // Police Clearance Content
  function renderPoliceClearanceContent() {
    return (
      <Box sx={{ p: 0 }}>
        {/* Police Clearance Section */}
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <SecurityIcon fontSize="small" />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '1rem' }}>Police Clearance Certificate</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
              Police clearance certificate for professional driving permit applications
            </Typography>
          </Box>

          <Grid container spacing={2}>
            {/* Police Clearance Obtained Checkbox */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={policeData.police_clearance_obtained}
                    onChange={(e) => updatePoliceInfo('police_clearance_obtained', e.target.checked)}
                    disabled={disabled}
                    color="primary"
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    Police clearance certificate obtained
                  </Typography>
                }
              />
            </Grid>

            {/* Show additional fields only if clearance is obtained */}
            {policeData.police_clearance_obtained && (
              <>
                {/* Certificate Details */}
                <Grid item xs={12}>
                  <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'primary.main' }}>
                    Certificate Details
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Clearance Date"
                    value={policeData.clearance_date}
                    onChange={(e) => updatePoliceInfo('clearance_date', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    disabled={disabled}
                    required={isRequired}
                    size="small"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Report Type</InputLabel>
                    <Select
                      value={policeData.report_type}
                      onChange={(e) => updatePoliceInfo('report_type', e.target.value)}
                      label="Report Type"
                      disabled={disabled}
                      size="small"
                    >
                      {reportTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Issuing Authority</InputLabel>
                    <Select
                      value={policeData.issuing_authority}
                      onChange={(e) => updatePoliceInfo('issuing_authority', e.target.value)}
                      label="Issuing Authority"
                      disabled={disabled}
                      size="small"
                    >
                      {issuingAuthorities.map((authority) => (
                        <MenuItem key={authority} value={authority}>
                          {authority}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Certificate Number"
                    value={policeData.certificate_number}
                    onChange={(e) => updatePoliceInfo('certificate_number', e.target.value)}
                    disabled={disabled}
                    size="small"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Examined By"
                    value={policeData.examined_by}
                    onChange={(e) => updatePoliceInfo('examined_by', e.target.value)}
                    disabled={disabled}
                    size="small"
                  />
                </Grid>

                {/* File Upload */}
                <Grid item xs={12}>
                  <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'primary.main', mt: 1 }}>
                    Document Upload
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <input
                      accept="image/*,.pdf"
                      style={{ display: 'none' }}
                      id="police-clearance-upload"
                      type="file"
                      onChange={handleFileUpload}
                      disabled={disabled}
                    />
                    <label htmlFor="police-clearance-upload">
                      <Button 
                        variant="outlined" 
                        component="span" 
                        startIcon={<UploadIcon />}
                        disabled={disabled}
                        size="small"
                      >
                        {policeData.police_clearance_file ? 'Change Police Certificate' : 'Upload Police Certificate (Optional)'}
                      </Button>
                    </label>
                    {policeData.police_clearance_file && (
                      <Typography variant="body2" sx={{ mt: 1, fontSize: '0.8rem' }}>
                        File: {policeData.police_clearance_file.name}
                      </Typography>
                    )}
                  </Box>
                </Grid>

                {/* Notes */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Notes (Optional)"
                    value={policeData.notes}
                    onChange={(e) => updatePoliceInfo('notes', e.target.value)}
                    disabled={disabled}
                    size="small"
                    placeholder="Additional notes about the police clearance certificate..."
                  />
                </Grid>

                {/* Clearance Status */}
                <Grid item xs={12}>
                  <Alert 
                    severity={policeData.clearance_passed ? "success" : "warning"}
                    sx={{ py: 0.5 }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      Police Clearance Status: {policeData.clearance_passed ? "CLEARED" : "PENDING"}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                      {policeData.clearance_passed 
                        ? "Police clearance certificate verified and approved"
                        : "Please ensure all police clearance information is accurate"
                      }
                    </Typography>
                  </Alert>
                </Grid>
              </>
            )}

            {/* Information when not obtained */}
            {!policeData.police_clearance_obtained && (
              <Grid item xs={12}>
                <Alert severity={isRequired ? "error" : "info"} sx={{ py: 0.5 }}>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    {isRequired 
                      ? "Police clearance certificate is required for this professional license category."
                      : "Police clearance certificate is optional but recommended for professional driving permits."
                    }
                  </Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        </Box>
      </Box>
    );
  }

  // If using tabbed interface, render the full container (like PersonFormWrapper)
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
        {/* Step content - p:0 */}
        <Box sx={{ 
          flex: 1,
          overflow: 'hidden',
          p: 0, // Step content - p:0
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          {showHeader && (
            <Box sx={{ p: 2 }}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2, 
                  mb: 3,
                  bgcolor: 'white',
                  boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                  borderRadius: 2,
                  flexShrink: 0
                }}
              >
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 0.5 }}>
                  Police Clearance
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Police clearance certificate requirements for professional driving permits
                </Typography>
                {isRequired && (
                  <Alert severity="info" sx={{ mt: 1.5, py: 0.5 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                      <strong>Police clearance is required</strong> for this professional license category
                    </Typography>
                  </Alert>
                )}
              </Paper>
            </Box>
          )}

          {/* Inner tab container - P:2 */}
          <Box sx={{ 
            flex: 1,
            overflow: 'hidden',
            p: 2, // Inner tab container - P:2
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Tab content - p:0 */}
            <Box sx={{ 
              flex: 1,
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              p: 0 // Tab content - p:0
            }}>
              {/* Step Content - Aligned at top */}
              <Box sx={{ flex: 1, overflow: 'visible' }}>
                {renderPoliceClearanceContent()}
              </Box>
            </Box>
          </Box>

          {/* Navigation - P:0 */}
          <Box sx={{ 
            bgcolor: 'white',
            borderTop: '1px solid', 
            borderColor: 'divider', 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: 1,
            p: 0, // Navigation - P:0
            flexShrink: 0,
            width: '100%',
            borderRadius: '0 0 8px 8px'
          }}>
            <Box sx={{ p: 2, display: 'flex', gap: 1, ml: 'auto' }}>
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
                onClick={handleContinue}
                disabled={!isStepValid(internalStep) || loading}
                startIcon={loading ? <CircularProgress size={20} /> : undefined}
                endIcon={<ArrowForwardIcon />}
                size="small"
              >
                {loading ? 'Processing...' : 'Continue to Biometric'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // Original single-component rendering (fallback for non-tabbed usage)
  return renderPoliceClearanceContent();
};

export default PoliceInformationSection;
