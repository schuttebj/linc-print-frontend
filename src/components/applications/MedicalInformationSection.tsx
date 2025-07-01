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
  Divider,
  Button
} from '@mui/material';
import {
  Visibility as VisionIcon,
  LocalHospital as MedicalIcon,
  CloudUpload as UploadIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

import { MedicalInformation, VisionTestData } from '../../types';

interface MedicalInformationSectionProps {
  value: MedicalInformation | null;
  onChange: (data: MedicalInformation) => void;
  disabled?: boolean;
}

const MedicalInformationSection: React.FC<MedicalInformationSectionProps> = ({
  value,
  onChange,
  disabled = false
}) => {
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
      restrictions.push('Right eye vision impaired - restricted to daytime driving');
    } else if (!isLeftEyeGood && rightAcuity <= 9) {
      // Right eye meets 6/9 with left eye blind/impaired
      visionPasses = true;
      restrictions.push('Left eye vision impaired - restricted to daytime driving');
    }

    // Visual field validation: 120 degrees minimum, or 115 degrees if one eye impaired
    const totalFieldDegrees = visionTest.visual_field_horizontal_degrees;
    const leftFieldDegrees = visionTest.visual_field_left_eye_degrees || 0;
    const rightFieldDegrees = visionTest.visual_field_right_eye_degrees || 0;
    
    if (totalFieldDegrees >= 120) {
      // Meets standard field requirement
    } else if (totalFieldDegrees >= 115 && (leftFieldDegrees < 70 || rightFieldDegrees < 70)) {
      // Meets reduced requirement with one eye impaired
      restrictions.push('Reduced visual field - restricted to familiar routes');
    } else {
      visionPasses = false;
    }

    // Corrective lenses requirement
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

    const updated = {
      ...medicalData,
      vision_test: updatedVisionTest,
      medical_clearance: validation.passes && medicalData.medical_certificate_passed,
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
      updated.medical_clearance = value && medicalData.vision_test.vision_meets_standards;
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
              <TextField
                fullWidth
                type="number"
                label="Total Horizontal Visual Field (degrees)"
                value={medicalData.vision_test.visual_field_horizontal_degrees}
                onChange={(e) => updateVisionTest('visual_field_horizontal_degrees', parseInt(e.target.value) || 0)}
                inputProps={{ min: 0, max: 180 }}
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Left Eye Field (degrees)"
                value={medicalData.vision_test.visual_field_left_eye_degrees}
                onChange={(e) => updateVisionTest('visual_field_left_eye_degrees', parseInt(e.target.value) || 0)}
                inputProps={{ min: 0, max: 90 }}
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Right Eye Field (degrees)"
                value={medicalData.vision_test.visual_field_right_eye_degrees}
                onChange={(e) => updateVisionTest('visual_field_right_eye_degrees', parseInt(e.target.value) || 0)}
                inputProps={{ min: 0, max: 90 }}
                disabled={disabled}
              />
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
      <Card>
        <CardHeader 
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MedicalIcon />
              <Typography variant="h6">Medical Certificate</Typography>
            </Box>
          }
          subheader="Medical practitioner assessment and certification"
        />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Medical Practitioner Name"
                value={medicalData.medical_practitioner_name}
                onChange={(e) => updateMedicalInfo('medical_practitioner_name', e.target.value)}
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Practice Number"
                value={medicalData.practice_number}
                onChange={(e) => updateMedicalInfo('practice_number', e.target.value)}
                disabled={disabled}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Examined By"
                value={medicalData.examined_by}
                onChange={(e) => updateMedicalInfo('examined_by', e.target.value)}
                disabled={disabled}
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
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={medicalData.medical_certificate_passed}
                    onChange={(e) => updateMedicalInfo('medical_certificate_passed', e.target.checked)}
                    disabled={disabled}
                  />
                }
                label="Medical certificate passed"
              />
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
                    {medicalData.medical_certificate_file ? 'Change Medical Certificate' : 'Upload Medical Certificate'}
                  </Button>
                </label>
                {medicalData.medical_certificate_file && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    File: {medicalData.medical_certificate_file.name}
                  </Typography>
                )}
              </Box>
            </Grid>

            {/* Overall Medical Clearance */}
            <Grid item xs={12}>
              <Alert 
                severity={medicalData.medical_clearance ? "success" : "warning"}
                sx={{ mt: 2 }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Medical Clearance: {medicalData.medical_clearance ? "APPROVED" : "PENDING"}
                </Typography>
                <Typography variant="body2">
                  {medicalData.medical_clearance 
                    ? "Medical assessment completed and approved for driving"
                    : "Complete all medical requirements for clearance"
                  }
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MedicalInformationSection; 