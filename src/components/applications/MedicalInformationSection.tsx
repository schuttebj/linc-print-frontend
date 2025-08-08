/**
 * MedicalInformationSection Component
 * 
 * Enhanced medical assessment with internal tab navigation for driver's license applications
 * Now supports both single-component usage and tabbed interface like PersonFormWrapper
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
  Chip,
  Switch,
  Divider,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Collapse,
  Container,
  Paper,
  Tabs,
  Tab,
  CircularProgress
} from '@mui/material';
import {
  Visibility as VisionIcon,
  LocalHospital as MedicalIcon,
  CloudUpload as UploadIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

import { MedicalInformation, VisionTestData } from '../../types';

interface MedicalInformationSectionProps {
  value: MedicalInformation | null;
  onChange: (data: MedicalInformation) => void;
  disabled?: boolean;
  isRequired?: boolean;
  // New props for tabbed interface like PersonFormWrapper
  selectedCategory?: string;
  personAge?: number;
  externalMedicalStep?: number;
  onMedicalValidationChange?: (step: number, isValid: boolean) => void;
  onMedicalStepChange?: (step: number, canAdvance: boolean) => void;
  onContinueToApplication?: () => void;
  onCancel?: () => void;
  showHeader?: boolean;
}

const MedicalInformationSection: React.FC<MedicalInformationSectionProps> = ({
  value,
  onChange,
  disabled = false,
  isRequired = false,
  selectedCategory,
  personAge = 0,
  externalMedicalStep = 0,
  onMedicalValidationChange,
  onMedicalStepChange,
  onContinueToApplication,
  onCancel,
  showHeader = true
}) => {
  const [medicalCertificateExpanded, setMedicalCertificateExpanded] = useState(isRequired);
  const [detailedMedicalExpanded, setDetailedMedicalExpanded] = useState(false);
  const [selfDeclarationConfirmed, setSelfDeclarationConfirmed] = useState(false);
  
  // Internal tab state (only used if using tabbed interface)
  const [internalStep, setInternalStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Medical steps for tabbed interface
  const medicalSteps = [
    {
      label: 'Vision Test',
      icon: <VisionIcon />
    },
    {
      label: 'Medical Declaration',
      icon: <MedicalIcon />
    }
  ];

  // Check if we're using the tabbed interface (external callbacks provided)
  const isTabbed = !!onMedicalStepChange;

  // Initialize with excellent vision test defaults
  const medicalData: MedicalInformation = value || {
    vision_test: {
      visual_acuity_right_eye: '6/6',      // Perfect vision (highest score)
      visual_acuity_left_eye: '6/6',       // Perfect vision (highest score)
      visual_acuity_binocular: '6/6',      // Perfect binocular vision
      visual_field_horizontal_degrees: 140, // Excellent field of vision (above 120 minimum)
      visual_field_left_eye_degrees: 70,   // Excellent left eye field
      visual_field_right_eye_degrees: 70,  // Excellent right eye field
      corrective_lenses_required: false,
      corrective_lenses_already_used: false,
      vision_meets_standards: true,        // Will pass with these excellent values
      vision_restrictions: []              // No restrictions with perfect vision
    },
    // Add required medical_conditions with default values
    medical_conditions: {
      epilepsy: false,
      epilepsy_controlled: false,
      epilepsy_medication: undefined,
      seizures_last_occurrence: undefined,
      mental_illness: false,
      mental_illness_type: undefined,
      mental_illness_controlled: false,
      mental_illness_medication: undefined,
      heart_condition: false,
      heart_condition_type: undefined,
      blood_pressure_controlled: true,
      diabetes: false,
      diabetes_type: undefined,
      diabetes_controlled: false,
      diabetes_medication: undefined,
      alcohol_dependency: false,
      drug_dependency: false,
      substance_treatment_program: false,
      fainting_episodes: false,
      dizziness_episodes: false,
      muscle_coordination_issues: false,
      medications_affecting_driving: false,
      current_medications: [],
      medically_fit_to_drive: true,
      conditions_requiring_monitoring: []
    },
    // Add required physical_assessment with default values
    physical_assessment: {
      hearing_adequate: true,
      hearing_aid_required: false,
      limb_disabilities: false,
      limb_disability_details: undefined,
      adaptive_equipment_required: false,
      adaptive_equipment_type: [],
      mobility_impairment: false,
      mobility_aid_required: false,
      mobility_aid_type: undefined,
      reaction_time_adequate: true,
      physically_fit_to_drive: true,
      physical_restrictions: []
    },
    medical_certificate_file: undefined,
    medical_certificate_passed: false,
    medical_practitioner_name: '',
    practice_number: '',
    medical_clearance: false,
    medical_restrictions: [],
    examined_by: '',
    examination_date: ''
  };

  // Auto-expand medical certificate section if it's required
  useEffect(() => {
    if (isRequired && !medicalCertificateExpanded) {
      setMedicalCertificateExpanded(true);
    }
  }, [isRequired, medicalCertificateExpanded]);

  // Vision test standards validation
  const validateVisionStandards = (visionTest: VisionTestData): { passes: boolean; restrictions: string[] } => {
    const restrictions: string[] = [];
    
    // Parse visual acuity values (format: "6/X")
    const parseAcuity = (acuity: string): number => {
      if (!acuity || !acuity.includes('/')) return 0;
      const [, denominator] = acuity.split('/');
      return parseInt(denominator) || 0;
    };

    const rightAcuity = parseAcuity(visionTest.visual_acuity_right_eye);
    const leftAcuity = parseAcuity(visionTest.visual_acuity_left_eye);
    
    // Standard: 6/12 minimum each eye, or 6/9 if one eye impaired
    const isRightEyeGood = rightAcuity > 0 && rightAcuity <= 12;
    const isLeftEyeGood = leftAcuity > 0 && leftAcuity <= 12;
    
    let visionPasses = false;
    
    if (isRightEyeGood && isLeftEyeGood) {
      // Both eyes meet 6/12 standard
      visionPasses = true;
    } else if ((isRightEyeGood && leftAcuity <= 9) || (isLeftEyeGood && rightAcuity <= 9)) {
      // One eye meets 6/9 standard with other impaired
      visionPasses = true;
    } else if (!isRightEyeGood && leftAcuity <= 9) {
      // Left eye meets 6/9 with right eye blind/impaired
      visionPasses = true;
    } else if (!isLeftEyeGood && rightAcuity <= 9) {
      // Right eye meets 6/9 with left eye blind/impaired
      visionPasses = true;
    }

    // Visual field validation: 120 degrees minimum, or 115 degrees if one eye impaired
    const totalFieldDegrees = visionTest.visual_field_horizontal_degrees;
    const leftFieldDegrees = visionTest.visual_field_left_eye_degrees || 0;
    const rightFieldDegrees = visionTest.visual_field_right_eye_degrees || 0;
    
    if (totalFieldDegrees >= 120) {
      // Meets standard field requirement
    } else if (totalFieldDegrees >= 115 && (leftFieldDegrees < 70 || rightFieldDegrees < 70)) {
      // Meets reduced requirement with one eye impaired
    } else {
      visionPasses = false;
    }

    // Corrective lenses requirement - ONLY restriction we include
    if (visionTest.corrective_lenses_required || visionTest.corrective_lenses_already_used) {
      restrictions.push('Must wear corrective lenses while driving');
    }

    return { passes: visionPasses, restrictions };
  };

  const updateVisionTest = (field: keyof VisionTestData, value: any) => {
    const updatedVisionTest = {
      ...medicalData.vision_test,
      [field]: value
    };

    // Auto-validate vision standards
    const validation = validateVisionStandards(updatedVisionTest);
    updatedVisionTest.vision_meets_standards = validation.passes;
    updatedVisionTest.vision_restrictions = validation.restrictions;

    // Auto-determine corrective lenses requirement
    if (field === 'visual_acuity_right_eye' || field === 'visual_acuity_left_eye') {
      const rightAcuity = parseFloat(updatedVisionTest.visual_acuity_right_eye.split('/')[1] || '0');
      const leftAcuity = parseFloat(updatedVisionTest.visual_acuity_left_eye.split('/')[1] || '0');
      
      // Require corrective lenses if either eye is worse than 6/12 without correction
      updatedVisionTest.corrective_lenses_required = rightAcuity > 12 || leftAcuity > 12;
    }

    // Update medical clearance based on vision test, self-declaration, and medical certificate (if required)
    const medicalClearance = validation.passes && selfDeclarationConfirmed && 
                            (isRequired ? medicalData.medical_certificate_passed : true);

    const updated = {
      ...medicalData,
      vision_test: updatedVisionTest,
      medical_clearance: medicalClearance,
      medical_restrictions: [...validation.restrictions]
    };
    
    onChange(updated);
  };

  const updateMedicalInfo = (field: keyof MedicalInformation, value: any) => {
    const updated = {
      ...medicalData,
      [field]: value
    };

    // Update overall medical clearance
    if (field === 'medical_certificate_passed') {
      updated.medical_clearance = value && medicalData.vision_test.vision_meets_standards && selfDeclarationConfirmed;
    }
    
    onChange(updated);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      updateMedicalInfo('medical_certificate_file', file);
    }
  };

  // Step validation for tabbed interface
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Vision Test
        return !!medicalData.vision_test.vision_meets_standards;
      case 1: // Medical Declaration
        return isRequired ? !!medicalData.medical_clearance : !!selfDeclarationConfirmed;
      default:
        return false;
    }
  };

  // Navigation handlers for tabbed interface
  const handleNext = () => {
    if (internalStep < medicalSteps.length - 1) {
      const nextStep = internalStep + 1;
      setInternalStep(nextStep);
      if (onMedicalStepChange) {
        onMedicalStepChange(nextStep, isStepValid(nextStep));
      }
    }
  };

  const handleBack = () => {
    if (internalStep > 0) {
      const prevStep = internalStep - 1;
      setInternalStep(prevStep);
      if (onMedicalStepChange) {
        onMedicalStepChange(prevStep, isStepValid(prevStep));
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
      if (onMedicalStepChange) {
        onMedicalStepChange(newValue, isStepValid(newValue));
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
    if (onMedicalValidationChange) {
      onMedicalValidationChange(internalStep, isStepValid(internalStep));
    }
  }, [medicalData, selfDeclarationConfirmed, internalStep, onMedicalValidationChange]);

  // Handle external step changes
  useEffect(() => {
    if (externalMedicalStep !== undefined && externalMedicalStep !== internalStep) {
      setInternalStep(externalMedicalStep);
    }
  }, [externalMedicalStep]);

  // Vision Test Content
  function renderVisionTestContent() {
    return (
      <Box sx={{ p: 2 }}>
        {/* Vision Test Section */}
        <Card sx={{ mb: 2, border: '1px solid #e0e0e0', boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px' }}>
          <CardHeader 
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VisionIcon fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '1rem' }}>Vision Test</Typography>
              </Box>
            }
            subheader="Complete visual acuity and field tests according to Madagascar standards"
            sx={{ pb: 1 }}
          />
          <CardContent sx={{ pt: 0 }}>
            <Grid container spacing={2}>
              {/* Visual Acuity Tests */}
              <Grid item xs={12}>
                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'primary.main' }}>
                  Visual Acuity (Required: 6/12 minimum each eye)
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Right Eye Visual Acuity</InputLabel>
                  <Select
                    value={medicalData.vision_test.visual_acuity_right_eye}
                    onChange={(e) => updateVisionTest('visual_acuity_right_eye', e.target.value)}
                    label="Right Eye Visual Acuity"
                    disabled={disabled}
                    size="small"
                  >
                    <MenuItem value="6/6">6/6 (Perfect)</MenuItem>
                    <MenuItem value="6/9">6/9 (Good)</MenuItem>
                    <MenuItem value="6/12">6/12 (Minimum Standard)</MenuItem>
                    <MenuItem value="6/18">6/18 (Below Standard)</MenuItem>
                    <MenuItem value="6/24">6/24 (Poor)</MenuItem>
                    <MenuItem value="6/60">6/60 (Very Poor)</MenuItem>
                    <MenuItem value="BLIND">Blind</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Left Eye Visual Acuity</InputLabel>
                  <Select
                    value={medicalData.vision_test.visual_acuity_left_eye}
                    onChange={(e) => updateVisionTest('visual_acuity_left_eye', e.target.value)}
                    label="Left Eye Visual Acuity"
                    disabled={disabled}
                    size="small"
                  >
                    <MenuItem value="6/6">6/6 (Perfect)</MenuItem>
                    <MenuItem value="6/9">6/9 (Good)</MenuItem>
                    <MenuItem value="6/12">6/12 (Minimum Standard)</MenuItem>
                    <MenuItem value="6/18">6/18 (Below Standard)</MenuItem>
                    <MenuItem value="6/24">6/24 (Poor)</MenuItem>
                    <MenuItem value="6/60">6/60 (Very Poor)</MenuItem>
                    <MenuItem value="BLIND">Blind</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Binocular Visual Acuity</InputLabel>
                  <Select
                    value={medicalData.vision_test.visual_acuity_binocular}
                    onChange={(e) => updateVisionTest('visual_acuity_binocular', e.target.value)}
                    label="Binocular Visual Acuity"
                    disabled={disabled}
                    size="small"
                  >
                    <MenuItem value="6/6">6/6 (Perfect)</MenuItem>
                    <MenuItem value="6/9">6/9 (Good)</MenuItem>
                    <MenuItem value="6/12">6/12 (Minimum Standard)</MenuItem>
                    <MenuItem value="6/18">6/18 (Below Standard)</MenuItem>
                    <MenuItem value="6/24">6/24 (Poor)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Visual Field Tests */}
              <Grid item xs={12}>
                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'primary.main', mt: 1 }}>
                  Visual Field (Required: 120° horizontal minimum)
                </Typography>
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Total Horizontal Visual Field</InputLabel>
                  <Select
                    value={medicalData.vision_test.visual_field_horizontal_degrees}
                    onChange={(e) => updateVisionTest('visual_field_horizontal_degrees', Number(e.target.value))}
                    label="Total Horizontal Visual Field"
                    disabled={disabled}
                    size="small"
                  >
                    <MenuItem value={120}>120° (Standard)</MenuItem>
                    <MenuItem value={130}>130° (Good)</MenuItem>
                    <MenuItem value={140}>140° (Very Good)</MenuItem>
                    <MenuItem value={150}>150° (Excellent)</MenuItem>
                    <MenuItem value={160}>160° (Superior)</MenuItem>
                    <MenuItem value={170}>170° (Exceptional)</MenuItem>
                    <MenuItem value={180}>180° (Full Field)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Left Eye Field</InputLabel>
                  <Select
                    value={medicalData.vision_test.visual_field_left_eye_degrees}
                    onChange={(e) => updateVisionTest('visual_field_left_eye_degrees', Number(e.target.value))}
                    label="Left Eye Field"
                    disabled={disabled}
                    size="small"
                  >
                    <MenuItem value={70}>70° (Minimum for Driving)</MenuItem>
                    <MenuItem value={80}>80° (Good)</MenuItem>
                    <MenuItem value={90}>90° (Full Field)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Right Eye Field</InputLabel>
                  <Select
                    value={medicalData.vision_test.visual_field_right_eye_degrees}
                    onChange={(e) => updateVisionTest('visual_field_right_eye_degrees', Number(e.target.value))}
                    label="Right Eye Field"
                    disabled={disabled}
                    size="small"
                  >
                    <MenuItem value={70}>70° (Minimum for Driving)</MenuItem>
                    <MenuItem value={80}>80° (Good)</MenuItem>
                    <MenuItem value={90}>90° (Full Field)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Vision Standards Result */}
              <Grid item xs={12}>
                <Alert 
                  severity={medicalData.vision_test.vision_meets_standards ? "success" : "error"}
                  sx={{ mt: 2, py: 0.5 }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    Vision Standards: {medicalData.vision_test.vision_meets_standards ? "PASS" : "FAIL"}
                  </Typography>
                  {medicalData.vision_test.vision_restrictions.length > 0 && (
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                      Restrictions: {medicalData.vision_test.vision_restrictions.join(', ')}
                    </Typography>
                  )}
                </Alert>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Medical Declaration Content
  function renderMedicalDeclarationContent() {
    return (
      <Box sx={{ p: 2 }}>
        {/* Self-Declaration of Medical Fitness */}
        <Card sx={{ mb: 2, border: '1px solid #e0e0e0', boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px' }}>
          <CardHeader 
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MedicalIcon fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '1rem' }}>Medical Fitness Declaration</Typography>
              </Box>
            }
            subheader="Simple self-declaration for medical fitness"
            sx={{ pb: 1 }}
          />
          <CardContent sx={{ pt: 0 }}>
            <Alert severity="info" sx={{ mb: 1.5, py: 0.5 }}>
              <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.85rem' }}>
                Section D: Medical Fitness Declaration
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                By checking this box, you declare that you are medically fit to drive and have no conditions that would impair your ability to safely operate a motor vehicle.
              </Typography>
            </Alert>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={selfDeclarationConfirmed}
                  onChange={(e) => {
                    setSelfDeclarationConfirmed(e.target.checked);
                    // Update medical clearance based on self-declaration and vision test
                    const updatedData = {
                      ...medicalData,
                      medical_clearance: e.target.checked && medicalData.vision_test.vision_meets_standards
                    };
                    onChange(updatedData);
                  }}
                  disabled={disabled}
                  color="primary"
                  size="small"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  I declare that I am medically fit to drive and have no medical conditions that would impair my driving ability
                </Typography>
              }
            />

            {/* Medical Certificate Section - Collapsible */}
            <Box sx={{ mt: 2 }}>
              <Accordion 
                expanded={detailedMedicalExpanded} 
                onChange={() => setDetailedMedicalExpanded(!detailedMedicalExpanded)}
                sx={{ 
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  '&:before': { display: 'none' },
                  boxShadow: 'none',
                  overflow: 'hidden'
                }}
              >
                <AccordionSummary 
                  expandIcon={<ExpandMoreIcon />}
                  sx={{ 
                    backgroundColor: isRequired ? 'warning.50' : 'grey.50',
                    '&.Mui-expanded': { minHeight: 48 }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6">
                      Medical Certificate Details
                    </Typography>
                    {isRequired && (
                      <Chip 
                        label="REQUIRED" 
                        color="warning" 
                        size="small" 
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {isRequired && (
                    <Alert severity="warning" sx={{ mb: 3 }}>
                      <Typography variant="body2">
                        <strong>Medical certificate is required</strong> for this license category (D1, D, D2 or commercial licenses for 60+ applicants). 
                        All fields must be completed to proceed.
                      </Typography>
                    </Alert>
                  )}

                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Medical Practitioner Name"
                        value={medicalData.medical_practitioner_name}
                        onChange={(e) => updateMedicalInfo('medical_practitioner_name', e.target.value)}
                        disabled={disabled}
                        required={isRequired}
                        size="small"
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Practice Number"
                        value={medicalData.practice_number}
                        onChange={(e) => updateMedicalInfo('practice_number', e.target.value)}
                        disabled={disabled}
                        required={isRequired}
                        size="small"
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Examined By"
                        value={medicalData.examined_by}
                        onChange={(e) => updateMedicalInfo('examined_by', e.target.value)}
                        disabled={disabled}
                        required={isRequired}
                        size="small"
                      />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        type="date"
                        label="Examination Date"
                        value={medicalData.examination_date}
                        onChange={(e) => updateMedicalInfo('examination_date', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        disabled={disabled}
                        required={isRequired}
                        size="small"
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Card variant="outlined" sx={{ p: 2, bgcolor: isRequired ? 'warning.50' : 'background.default' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              Medical Certificate Passed
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {isRequired 
                                ? "Required: Confirm medical certificate has been passed"
                                : "Optional: Check if medical certificate has been obtained"
                              }
                            </Typography>
                          </Box>
                          <Switch
                            checked={medicalData.medical_certificate_passed}
                            onChange={(e) => updateMedicalInfo('medical_certificate_passed', e.target.checked)}
                            disabled={disabled}
                            color={isRequired ? "warning" : "primary"}
                            size="small"
                          />
                        </Box>
                      </Card>
                    </Grid>

                    {/* Medical Certificate Upload */}
                    <Grid item xs={12}>
                      <Box sx={{ mb: 2 }}>
                        <input
                          accept="image/*,.pdf"
                          style={{ display: 'none' }}
                          id="medical-certificate-upload"
                          type="file"
                          onChange={handleFileUpload}
                          disabled={disabled}
                        />
                        <label htmlFor="medical-certificate-upload">
                          <Button 
                            variant="outlined" 
                            component="span" 
                            startIcon={<UploadIcon />}
                            disabled={disabled}
                            size="small"
                          >
                            {medicalData.medical_certificate_file ? 'Change Medical Certificate' : 'Upload Medical Certificate (Optional)'}
                          </Button>
                        </label>
                        {medicalData.medical_certificate_file && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            File: {medicalData.medical_certificate_file.name}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Box>



            {/* Overall Medical Clearance */}
            <Box sx={{ mt: 2 }}>
              <Alert 
                severity={medicalData.medical_clearance ? "success" : (isRequired ? "error" : "info")}
                sx={{ py: 0.5 }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  Medical Clearance: {medicalData.medical_clearance ? "APPROVED" : (isRequired ? "REQUIRED" : "PENDING")}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  {medicalData.medical_clearance 
                    ? "Medical assessment completed and approved for driving"
                    : isRequired 
                      ? "Complete all required medical assessments to proceed"
                      : "Self-declaration and vision test required for medical clearance"
                  }
                </Typography>
              </Alert>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Original full medical section (for non-tabbed usage)
  function renderFullMedicalSection() {
    return (
      <Box>
        {renderVisionTestContent()}
        {renderMedicalDeclarationContent()}
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
        <Box sx={{ 
          flex: 1,
          overflow: 'hidden',
          p: 0,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'hidden'
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
                    Medical Assessment
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Complete vision test and medical clearance requirements
                  </Typography>
                  {isRequired && (
                    <Alert severity="info" sx={{ mt: 1.5, py: 0.5 }}>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        <strong>Medical assessment is mandatory</strong> for {
                          personAge >= 60 ? 'applicants 60+ years' : 'this license category'
                        }
                      </Typography>
                    </Alert>
                  )}
                </Paper>
              </Box>
            )}

            {/* Medical Tabs */}
            <Box sx={{ p: 2, pt: showHeader ? 0 : 2 }}>
              <Paper 
                elevation={0}
                sx={{ 
                  mb: 2,
                  bgcolor: 'white',
                  boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                  borderRadius: 2,
                  flexShrink: 0
                }}
              >
              <Tabs
                value={internalStep}
                onChange={handleTabChange}
                sx={{
                  px: 2,
                  '& .MuiTab-root': {
                    minHeight: 40,
                    textTransform: 'none',
                    fontSize: '0.8rem',
                    color: 'text.secondary',
                    bgcolor: 'primary.50',
                    mx: 0.5,
                    borderRadius: '6px 6px 0 0',
                    '&.Mui-selected': {
                      bgcolor: 'primary.100',
                      color: 'primary.main',
                    },
                    '&:hover': {
                      bgcolor: 'primary.100',
                      '&.Mui-selected': {
                        bgcolor: 'primary.100',
                      }
                    },
                    '&.Mui-disabled': {
                      opacity: 0.4
                    }
                  },
                  '& .MuiTabs-indicator': {
                    display: 'none'
                  }
                }}
              >
                {medicalSteps.map((step, index) => (
                  <Tab
                    key={step.label}
                    label={renderTabLabel(step, index)}
                    disabled={index > internalStep + 1 || (index === internalStep + 1 && !isStepValid(internalStep))}
                  />
                ))}
              </Tabs>
              </Paper>
            </Box>

            {/* Main Form Container */}
            <Paper 
              elevation={0}
              sx={{ 
                bgcolor: 'white',
                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                borderRadius: 2,
                mb: 2,
                flex: 1,
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                mx: 2
              }}
            >
              {/* Step Content - No padding like PersonFormWrapper */}
              <Box sx={{ flex: 1, overflow: 'visible' }}>
                {internalStep === 0 && renderVisionTestContent()}
                {internalStep === 1 && renderMedicalDeclarationContent()}
              </Box>
            </Paper>

            {/* Navigation Footer */}
            <Box sx={{ 
              bgcolor: 'white',
              borderTop: '1px solid', 
              borderColor: 'divider', 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: 1,
              p: 2,
              flexShrink: 0,
              width: '100%',
              borderRadius: '0 0 8px 8px'
            }}>
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
                onClick={internalStep === medicalSteps.length - 1 ? handleContinue : handleNext}
                disabled={!isStepValid(internalStep) || loading}
                startIcon={loading ? <CircularProgress size={20} /> : undefined}
                endIcon={internalStep !== medicalSteps.length - 1 ? <ArrowForwardIcon /> : undefined}
                size="small"
              >
                {loading ? 'Processing...' : internalStep === medicalSteps.length - 1 ? 'Continue to Biometric' : 'Next'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // Original single-component rendering (fallback for non-tabbed usage)
  return renderFullMedicalSection();
};

export default MedicalInformationSection;