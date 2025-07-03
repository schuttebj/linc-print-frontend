/**
 * MedicalInformationSection Component
 * 
 * Simplified medical assessment for driver's license applications
 * Focuses on vision tests and medical clearance only
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
  Collapse
} from '@mui/material';
import {
  Visibility as VisionIcon,
  LocalHospital as MedicalIcon,
  CloudUpload as UploadIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';

import { MedicalInformation, VisionTestData } from '../../types';

interface MedicalInformationSectionProps {
  value: MedicalInformation | null;
  onChange: (data: MedicalInformation) => void;
  disabled?: boolean;
  isRequired?: boolean;
}

const MedicalInformationSection: React.FC<MedicalInformationSectionProps> = ({
  value,
  onChange,
  disabled = false,
  isRequired = false
}) => {
  const [medicalCertificateExpanded, setMedicalCertificateExpanded] = useState(isRequired);
  const [selfDeclarationConfirmed, setSelfDeclarationConfirmed] = useState(false);

  // Initialize empty data if null
  const medicalData: MedicalInformation = value || {
    vision_test: {
      visual_acuity_right_eye: '',
      visual_acuity_left_eye: '',
      visual_acuity_binocular: '',
      visual_field_horizontal_degrees: 0,
      visual_field_left_eye_degrees: 0,
      visual_field_right_eye_degrees: 0,
      corrective_lenses_required: false,
      corrective_lenses_already_used: false,
      vision_meets_standards: false,
      vision_restrictions: []
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

  return (
    <Box>
      {/* Vision Test Section */}
      <Card sx={{ mb: 3 }}>
        <CardHeader 
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <VisionIcon />
              <Typography variant="h6">Vision Test</Typography>
            </Box>
          }
          subheader="Complete visual acuity and field tests according to Madagascar standards"
        />
        <CardContent>
          <Grid container spacing={3}>
            {/* Visual Acuity Tests */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                Visual Acuity (Required: 6/12 minimum each eye)
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Right Eye Visual Acuity</InputLabel>
                <Select
                  value={medicalData.vision_test.visual_acuity_right_eye}
                  onChange={(e) => updateVisionTest('visual_acuity_right_eye', e.target.value)}
                  label="Right Eye Visual Acuity"
                  disabled={disabled}
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
              <FormControl fullWidth>
                <InputLabel>Left Eye Visual Acuity</InputLabel>
                <Select
                  value={medicalData.vision_test.visual_acuity_left_eye}
                  onChange={(e) => updateVisionTest('visual_acuity_left_eye', e.target.value)}
                  label="Left Eye Visual Acuity"
                  disabled={disabled}
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
              <FormControl fullWidth>
                <InputLabel>Binocular Visual Acuity</InputLabel>
                <Select
                  value={medicalData.vision_test.visual_acuity_binocular}
                  onChange={(e) => updateVisionTest('visual_acuity_binocular', e.target.value)}
                  label="Binocular Visual Acuity"
                  disabled={disabled}
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
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                Visual Field (Required: 120° horizontal minimum)
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Total Horizontal Visual Field</InputLabel>
                <Select
                  value={medicalData.vision_test.visual_field_horizontal_degrees}
                  onChange={(e) => updateVisionTest('visual_field_horizontal_degrees', Number(e.target.value))}
                  label="Total Horizontal Visual Field"
                  disabled={disabled}
                >
                  <MenuItem value={60}>60° (Very Limited)</MenuItem>
                  <MenuItem value={90}>90° (Limited)</MenuItem>
                  <MenuItem value={100}>100° (Below Standard)</MenuItem>
                  <MenuItem value={110}>110° (Restricted)</MenuItem>
                  <MenuItem value={115}>115° (Minimum for Impaired)</MenuItem>
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
              <FormControl fullWidth>
                <InputLabel>Left Eye Field</InputLabel>
                <Select
                  value={medicalData.vision_test.visual_field_left_eye_degrees}
                  onChange={(e) => updateVisionTest('visual_field_left_eye_degrees', Number(e.target.value))}
                  label="Left Eye Field"
                  disabled={disabled}
                >
                  <MenuItem value={0}>0° (No Vision)</MenuItem>
                  <MenuItem value={30}>30° (Very Limited)</MenuItem>
                  <MenuItem value={45}>45° (Limited)</MenuItem>
                  <MenuItem value={60}>60° (Restricted)</MenuItem>
                  <MenuItem value={70}>70° (Minimum for Driving)</MenuItem>
                  <MenuItem value={80}>80° (Good)</MenuItem>
                  <MenuItem value={90}>90° (Full Field)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Right Eye Field</InputLabel>
                <Select
                  value={medicalData.vision_test.visual_field_right_eye_degrees}
                  onChange={(e) => updateVisionTest('visual_field_right_eye_degrees', Number(e.target.value))}
                  label="Right Eye Field"
                  disabled={disabled}
                >
                  <MenuItem value={0}>0° (No Vision)</MenuItem>
                  <MenuItem value={30}>30° (Very Limited)</MenuItem>
                  <MenuItem value={45}>45° (Limited)</MenuItem>
                  <MenuItem value={60}>60° (Restricted)</MenuItem>
                  <MenuItem value={70}>70° (Minimum for Driving)</MenuItem>
                  <MenuItem value={80}>80° (Good)</MenuItem>
                  <MenuItem value={90}>90° (Full Field)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Corrective Lenses */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                Corrective Lenses
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={medicalData.vision_test.corrective_lenses_required}
                    disabled={true} // Auto-determined
                  />
                }
                label="Corrective lenses required (auto-determined)"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={medicalData.vision_test.corrective_lenses_already_used}
                    onChange={(e) => updateVisionTest('corrective_lenses_already_used', e.target.checked)}
                    disabled={disabled}
                  />
                }
                label="Already uses corrective lenses"
              />
            </Grid>

            {/* Vision Standards Result */}
            <Grid item xs={12}>
              <Alert 
                severity={medicalData.vision_test.vision_meets_standards ? "success" : "error"}
                sx={{ mt: 2 }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Vision Standards: {medicalData.vision_test.vision_meets_standards ? "PASS" : "FAIL"}
                </Typography>
                {medicalData.vision_test.vision_restrictions.length > 0 && (
                  <Typography variant="body2">
                    Restrictions: {medicalData.vision_test.vision_restrictions.join(', ')}
                  </Typography>
                )}
              </Alert>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Medical Certificate Section */}
      <Card sx={{ border: isRequired ? '2px solid' : '1px solid', borderColor: isRequired ? 'warning.main' : 'divider' }}>
        <CardHeader 
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MedicalIcon />
              <Typography variant="h6">Medical Assessment</Typography>
              {isRequired && (
                <Chip 
                  label="REQUIRED" 
                  color="warning" 
                  size="small" 
                  sx={{ fontWeight: 600 }}
                />
              )}
            </Box>
          }
          subheader={isRequired 
            ? "Medical certificate is mandatory for this license category" 
            : "Simple self-declaration for medical fitness"
          }
        />
        <CardContent>
          {/* Self-Declaration of Medical Fitness */}
          <Box sx={{ mb: 3 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold">
                Section D: Medical Fitness Declaration
              </Typography>
              <Typography variant="body2">
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
                />
              }
              label={
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  I declare that I am medically fit to drive and have no medical conditions that would impair my driving ability
                </Typography>
              }
            />
          </Box>

          {/* Medical Certificate Section - Collapsible */}
          <Accordion 
            expanded={medicalCertificateExpanded} 
            onChange={() => setMedicalCertificateExpanded(!medicalCertificateExpanded)}
            sx={{ 
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              '&:before': { display: 'none' },
              boxShadow: 'none',
              overflow: 'hidden' // Ensure content doesn't overflow rounded corners
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

          {/* Overall Medical Clearance */}
          <Box sx={{ mt: 3 }}>
            <Alert 
              severity={medicalData.medical_clearance ? "success" : (isRequired ? "error" : "info")}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Medical Clearance: {medicalData.medical_clearance ? "APPROVED" : (isRequired ? "REQUIRED" : "PENDING")}
              </Typography>
              <Typography variant="body2">
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
};

export default MedicalInformationSection; 