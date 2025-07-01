/**
 * MedicalInformationSection Component
 * 
 * Captures comprehensive medical information for driver's license applications
 * including vision tests, medical conditions, and physical assessments.
 */

import React, { useState } from 'react';
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
  RadioGroup,
  Radio,
  Select,
  MenuItem,
  InputLabel,
  Alert,
  Chip,
  Divider,
  Stack,
  Button,
  FormHelperText
} from '@mui/material';
import {
  Visibility as VisionIcon,
  LocalHospital as MedicalIcon,
  Accessibility as AccessibilityIcon,
  CloudUpload as UploadIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

import { MedicalInformation, VisionTestData, MedicalConditions, PhysicalAssessment } from '../../types';

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
  const [medicalCertificateUploaded, setMedicalCertificateUploaded] = useState(false);
  const [eyeTestCertificateUploaded, setEyeTestCertificateUploaded] = useState(false);

  // Initialize empty data if null
  const medicalData: MedicalInformation = value || {
    vision_test: {
      visual_acuity_right_eye: '',
      visual_acuity_left_eye: '',
      visual_acuity_binocular: '',
      corrective_lenses_required: false,
      color_vision_normal: true,
      visual_field_normal: true,
      night_vision_adequate: true,
      contrast_sensitivity_adequate: true,
      glare_sensitivity_issues: false,
      vision_meets_standards: true,
      vision_restrictions: []
    },
    medical_conditions: {
      epilepsy: false,
      epilepsy_controlled: false,
      mental_illness: false,
      mental_illness_controlled: false,
      heart_condition: false,
      blood_pressure_controlled: true,
      diabetes: false,
      diabetes_controlled: false,
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
    physical_assessment: {
      hearing_adequate: true,
      hearing_aid_required: false,
      limb_disabilities: false,
      adaptive_equipment_required: false,
      adaptive_equipment_type: [],
      mobility_impairment: false,
      mobility_aid_required: false,
      reaction_time_adequate: true,
      physically_fit_to_drive: true,
      physical_restrictions: []
    },
    medical_clearance: true,
    medical_restrictions: [],
    examined_by: '',
    examination_date: ''
  };

  const updateVisionTest = (field: keyof VisionTestData, value: any) => {
    const updated = {
      ...medicalData,
      vision_test: {
        ...medicalData.vision_test,
        [field]: value
      }
    };
    
    // Auto-determine if vision meets standards
    if (field === 'visual_acuity_binocular' || field === 'color_vision_normal' || field === 'visual_field_normal') {
      updated.vision_test.vision_meets_standards = 
        updated.vision_test.visual_acuity_binocular !== '' &&
        updated.vision_test.color_vision_normal &&
        updated.vision_test.visual_field_normal;
    }
    
    onChange(updated);
  };

  const updateMedicalConditions = (field: keyof MedicalConditions, value: any) => {
    const updated = {
      ...medicalData,
      medical_conditions: {
        ...medicalData.medical_conditions,
        [field]: value
      }
    };
    
    // Auto-determine medical fitness
    const conditions = updated.medical_conditions;
    updated.medical_conditions.medically_fit_to_drive = 
      (!conditions.epilepsy || conditions.epilepsy_controlled) &&
      (!conditions.diabetes || conditions.diabetes_controlled) &&
      (!conditions.mental_illness || conditions.mental_illness_controlled) &&
      !conditions.alcohol_dependency &&
      !conditions.drug_dependency &&
      !conditions.fainting_episodes &&
      !conditions.muscle_coordination_issues;
    
    onChange(updated);
  };

  const updatePhysicalAssessment = (field: keyof PhysicalAssessment, value: any) => {
    const updated = {
      ...medicalData,
      physical_assessment: {
        ...medicalData.physical_assessment,
        [field]: value
      }
    };
    
    // Auto-determine physical fitness
    const physical = updated.physical_assessment;
    updated.physical_assessment.physically_fit_to_drive = 
      physical.hearing_adequate &&
      physical.reaction_time_adequate &&
      (!physical.limb_disabilities || physical.adaptive_equipment_required);
    
    onChange(updated);
  };

  const updateMedicalClearance = () => {
    const overall_clearance = 
      medicalData.vision_test.vision_meets_standards &&
      medicalData.medical_conditions.medically_fit_to_drive &&
      medicalData.physical_assessment.physically_fit_to_drive;
    
    onChange({
      ...medicalData,
      medical_clearance: overall_clearance
    });
  };

  // Auto-update overall clearance when component data changes
  React.useEffect(() => {
    updateMedicalClearance();
  }, [
    medicalData.vision_test.vision_meets_standards,
    medicalData.medical_conditions.medically_fit_to_drive,
    medicalData.physical_assessment.physically_fit_to_drive
  ]);

  const handleFileUpload = (fileType: 'medical' | 'eye_test') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (fileType === 'medical') {
        setMedicalCertificateUploaded(true);
        onChange({
          ...medicalData,
          medical_certificate_file: file
        });
      } else {
        setEyeTestCertificateUploaded(true);
        onChange({
          ...medicalData,
          eye_test_certificate_file: file
        });
      }
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Medical Assessment
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Complete medical assessment is required for all driver's license applications to ensure road safety.
      </Typography>

      {/* Overall Medical Status */}
      <Alert 
        severity={medicalData.medical_clearance ? 'success' : 'warning'} 
        sx={{ mb: 3 }}
        icon={medicalData.medical_clearance ? <CheckCircleIcon /> : <WarningIcon />}
      >
        {medicalData.medical_clearance 
          ? 'Medical assessment indicates fitness to drive'
          : 'Medical assessment requires attention - restrictions may apply'
        }
      </Alert>

      {/* Vision Test Section */}
      <Card sx={{ mb: 3 }}>
        <CardHeader 
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <VisionIcon color="primary" />
              <Typography variant="h6">Vision Test</Typography>
            </Box>
          }
          subheader="Visual acuity, color vision, and field tests"
        />
        <CardContent>
          <Grid container spacing={3}>
            {/* Visual Acuity */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Visual Acuity</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Right Eye"
                placeholder="e.g., 20/20, 6/6"
                value={medicalData.vision_test.visual_acuity_right_eye}
                onChange={(e) => updateVisionTest('visual_acuity_right_eye', e.target.value)}
                disabled={disabled}
                helperText="Snellen chart reading"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Left Eye"
                placeholder="e.g., 20/20, 6/6"
                value={medicalData.vision_test.visual_acuity_left_eye}
                onChange={(e) => updateVisionTest('visual_acuity_left_eye', e.target.value)}
                disabled={disabled}
                helperText="Snellen chart reading"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Binocular Vision"
                placeholder="e.g., 20/20, 6/6"
                value={medicalData.vision_test.visual_acuity_binocular}
                onChange={(e) => updateVisionTest('visual_acuity_binocular', e.target.value)}
                disabled={disabled}
                helperText="Both eyes together"
              />
            </Grid>

            {/* Corrective Lenses */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={medicalData.vision_test.corrective_lenses_required}
                    onChange={(e) => updateVisionTest('corrective_lenses_required', e.target.checked)}
                    disabled={disabled}
                  />
                }
                label="Corrective lenses required for driving"
              />
            </Grid>

            {medicalData.vision_test.corrective_lenses_required && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Corrective Lens Type</InputLabel>
                  <Select
                    value={medicalData.vision_test.corrective_lenses_type || ''}
                    onChange={(e) => updateVisionTest('corrective_lenses_type', e.target.value)}
                    disabled={disabled}
                  >
                    <MenuItem value="GLASSES">Glasses</MenuItem>
                    <MenuItem value="CONTACT_LENSES">Contact Lenses</MenuItem>
                    <MenuItem value="BOTH">Both</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12}><Divider /></Grid>

            {/* Color Vision & Field Tests */}
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={medicalData.vision_test.color_vision_normal}
                    onChange={(e) => updateVisionTest('color_vision_normal', e.target.checked)}
                    disabled={disabled}
                  />
                }
                label="Color vision normal"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={medicalData.vision_test.visual_field_normal}
                    onChange={(e) => updateVisionTest('visual_field_normal', e.target.checked)}
                    disabled={disabled}
                  />
                }
                label="Visual field normal"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={medicalData.vision_test.night_vision_adequate}
                    onChange={(e) => updateVisionTest('night_vision_adequate', e.target.checked)}
                    disabled={disabled}
                  />
                }
                label="Night vision adequate"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={medicalData.vision_test.glare_sensitivity_issues}
                    onChange={(e) => updateVisionTest('glare_sensitivity_issues', e.target.checked)}
                    disabled={disabled}
                  />
                }
                label="Glare sensitivity issues"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Medical Conditions Section */}
      <Card sx={{ mb: 3 }}>
        <CardHeader 
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <MedicalIcon color="primary" />
              <Typography variant="h6">Medical Conditions</Typography>
            </Box>
          }
          subheader="Medical history that may affect driving ability"
        />
        <CardContent>
          <Grid container spacing={2}>
            {/* Neurological Conditions */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Neurological Conditions</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={medicalData.medical_conditions.epilepsy}
                    onChange={(e) => updateMedicalConditions('epilepsy', e.target.checked)}
                    disabled={disabled}
                  />
                }
                label="Epilepsy or seizure disorder"
              />
            </Grid>

            {medicalData.medical_conditions.epilepsy && (
              <>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={medicalData.medical_conditions.epilepsy_controlled}
                        onChange={(e) => updateMedicalConditions('epilepsy_controlled', e.target.checked)}
                        disabled={disabled}
                      />
                    }
                    label="Epilepsy controlled with medication"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Last seizure occurrence"
                    type="date"
                    value={medicalData.medical_conditions.seizures_last_occurrence || ''}
                    onChange={(e) => updateMedicalConditions('seizures_last_occurrence', e.target.value)}
                    disabled={disabled}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}><Divider /></Grid>

            {/* Other Conditions */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Other Medical Conditions</Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={medicalData.medical_conditions.diabetes}
                    onChange={(e) => updateMedicalConditions('diabetes', e.target.checked)}
                    disabled={disabled}
                  />
                }
                label="Diabetes"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={medicalData.medical_conditions.heart_condition}
                    onChange={(e) => updateMedicalConditions('heart_condition', e.target.checked)}
                    disabled={disabled}
                  />
                }
                label="Heart condition"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={medicalData.medical_conditions.fainting_episodes}
                    onChange={(e) => updateMedicalConditions('fainting_episodes', e.target.checked)}
                    disabled={disabled}
                  />
                }
                label="Fainting episodes"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={medicalData.medical_conditions.dizziness_episodes}
                    onChange={(e) => updateMedicalConditions('dizziness_episodes', e.target.checked)}
                    disabled={disabled}
                  />
                }
                label="Frequent dizziness"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Physical Assessment Section */}
      <Card sx={{ mb: 3 }}>
        <CardHeader 
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <AccessibilityIcon color="primary" />
              <Typography variant="h6">Physical Assessment</Typography>
            </Box>
          }
          subheader="Physical capabilities and any required accommodations"
        />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={medicalData.physical_assessment.hearing_adequate}
                    onChange={(e) => updatePhysicalAssessment('hearing_adequate', e.target.checked)}
                    disabled={disabled}
                  />
                }
                label="Hearing adequate"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={medicalData.physical_assessment.hearing_aid_required}
                    onChange={(e) => updatePhysicalAssessment('hearing_aid_required', e.target.checked)}
                    disabled={disabled}
                  />
                }
                label="Hearing aid required"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={medicalData.physical_assessment.limb_disabilities}
                    onChange={(e) => updatePhysicalAssessment('limb_disabilities', e.target.checked)}
                    disabled={disabled}
                  />
                }
                label="Limb disabilities"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={medicalData.physical_assessment.adaptive_equipment_required}
                    onChange={(e) => updatePhysicalAssessment('adaptive_equipment_required', e.target.checked)}
                    disabled={disabled}
                  />
                }
                label="Adaptive equipment required"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={medicalData.physical_assessment.reaction_time_adequate}
                    onChange={(e) => updatePhysicalAssessment('reaction_time_adequate', e.target.checked)}
                    disabled={disabled}
                  />
                }
                label="Reaction time adequate"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Medical Certificates Upload */}
      <Card>
        <CardHeader 
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <UploadIcon color="primary" />
              <Typography variant="h6">Medical Certificates</Typography>
            </Box>
          }
          subheader="Upload required medical documentation"
        />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Button
                component="label"
                variant="outlined"
                startIcon={medicalCertificateUploaded ? <CheckCircleIcon /> : <UploadIcon />}
                fullWidth
                sx={{ height: 56 }}
                color={medicalCertificateUploaded ? 'success' : 'primary'}
                disabled={disabled}
              >
                {medicalCertificateUploaded ? 'Medical Certificate Uploaded' : 'Upload Medical Certificate'}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  hidden
                  onChange={handleFileUpload('medical')}
                />
              </Button>
            </Grid>

            <Grid item xs={12} md={6}>
              <Button
                component="label"
                variant="outlined"
                startIcon={eyeTestCertificateUploaded ? <CheckCircleIcon /> : <UploadIcon />}
                fullWidth
                sx={{ height: 56 }}
                color={eyeTestCertificateUploaded ? 'success' : 'primary'}
                disabled={disabled}
              >
                {eyeTestCertificateUploaded ? 'Eye Test Certificate Uploaded' : 'Upload Eye Test Certificate'}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  hidden
                  onChange={handleFileUpload('eye_test')}
                />
              </Button>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Examined By"
                value={medicalData.examined_by}
                onChange={(e) => onChange({ ...medicalData, examined_by: e.target.value })}
                disabled={disabled}
                placeholder="Medical practitioner name"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Examination Date"
                type="date"
                value={medicalData.examination_date || ''}
                onChange={(e) => onChange({ ...medicalData, examination_date: e.target.value })}
                disabled={disabled}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Medical Notes"
                multiline
                rows={3}
                value={medicalData.medical_notes || ''}
                onChange={(e) => onChange({ ...medicalData, medical_notes: e.target.value })}
                disabled={disabled}
                placeholder="Additional medical notes or restrictions..."
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MedicalInformationSection; 