import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Checkbox,
  FormControlLabel,
  RadioGroup,
  Radio,
  FormGroup,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Badge,
  Tooltip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Rating
} from '@mui/material';
import {
  AssignmentTurnedIn as QualityIcon,
  CheckCircle as PassIcon,
  Error as FailIcon,
  Warning as WarningIcon,
  Visibility as InspectIcon,
  Print as PrintIcon,
  ExpandMore as ExpandMoreIcon,
  Assignment as AssignmentIcon,
  PhotoCamera as PhotoIcon,
  TextFields as TextIcon,
  CreditCard as CardIcon,
  Security as SecurityIcon,
  ColorLens as ColorIcon,
  Straighten as MeasureIcon,
  BugReport as DefectIcon,
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingUpIcon,
  Person as PersonIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import printJobService, { 
  PrintJobResponse, 
  PrintJobDetailResponse,
  QualityCheckRequest
} from '../../services/printJobService';

interface QualityCheckCriteria {
  category: string;
  items: QualityCheckItem[];
}

interface QualityCheckItem {
  id: string;
  label: string;
  description: string;
  critical: boolean;
  passed?: boolean;
  notes?: string;
}

interface QualityCheckResult {
  overall_result: 'PASSED' | 'FAILED_PRINTING' | 'FAILED_DATA' | 'FAILED_DAMAGE';
  criteria_results: Record<string, boolean>;
  notes: string;
  defect_categories: string[];
  reprint_required: boolean;
  inspector_rating: number;
}

const QualityAssurancePage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [jobsForQA, setJobsForQA] = useState<PrintJobResponse[]>([]);
  const [selectedJob, setSelectedJob] = useState<PrintJobDetailResponse | null>(null);
  const [qaDialogOpen, setQaDialogOpen] = useState(false);
  const [qaStep, setQaStep] = useState(0);
  const [qaResults, setQaResults] = useState<QualityCheckResult>({
    overall_result: 'PASSED',
    criteria_results: {},
    notes: '',
    defect_categories: [],
    reprint_required: false,
    inspector_rating: 5
  });
  const [error, setError] = useState<string | null>(null);

  // Quality check criteria
  const qualityCheckCriteria: QualityCheckCriteria[] = [
    {
      category: 'Photo Quality',
      items: [
        { id: 'photo_clarity', label: 'Photo Clarity', description: 'Photo is clear and in focus', critical: true },
        { id: 'photo_positioning', label: 'Photo Position', description: 'Photo is properly centered and sized', critical: true },
        { id: 'photo_color', label: 'Color Accuracy', description: 'Photo colors are accurate and not distorted', critical: false },
        { id: 'photo_background', label: 'Background', description: 'Background is clean without artifacts', critical: false }
      ]
    },
    {
      category: 'Text and Data',
      items: [
        { id: 'text_legibility', label: 'Text Legibility', description: 'All text is clearly readable', critical: true },
        { id: 'data_accuracy', label: 'Data Accuracy', description: 'All personal data matches records', critical: true },
        { id: 'license_categories', label: 'License Categories', description: 'License categories are correct', critical: true },
        { id: 'dates_correct', label: 'Dates Correct', description: 'Issue and expiry dates are accurate', critical: true },
        { id: 'text_alignment', label: 'Text Alignment', description: 'Text is properly aligned in fields', critical: false }
      ]
    },
    {
      category: 'Card Physical Quality',
      items: [
        { id: 'card_surface', label: 'Surface Quality', description: 'No scratches, smudges, or marks', critical: true },
        { id: 'card_edges', label: 'Edge Quality', description: 'Clean cut edges without damage', critical: false },
        { id: 'card_flexibility', label: 'Card Flexibility', description: 'Proper card stiffness and flexibility', critical: false },
        { id: 'lamination', label: 'Lamination', description: 'Lamination is smooth without bubbles', critical: true }
      ]
    },
    {
      category: 'Security Features',
      items: [
        { id: 'barcode_quality', label: 'Barcode Quality', description: 'PDF417 barcode is clear and scannable', critical: true },
        { id: 'security_patterns', label: 'Security Patterns', description: 'Security background patterns visible', critical: false },
        { id: 'flag_colors', label: 'Flag Colors', description: 'Madagascar flag colors are accurate', critical: false },
        { id: 'watermark', label: 'Watermark', description: 'Watermark is visible but not intrusive', critical: false }
      ]
    },
    {
      category: 'Layout and Design',
      items: [
        { id: 'overall_layout', label: 'Overall Layout', description: 'All elements properly positioned', critical: true },
        { id: 'color_consistency', label: 'Color Consistency', description: 'Colors match design specifications', critical: false },
        { id: 'spacing', label: 'Element Spacing', description: 'Proper spacing between elements', critical: false },
        { id: 'professional_appearance', label: 'Professional Look', description: 'Overall professional appearance', critical: false }
      ]
    }
  ];

  // Load jobs ready for QA
  const loadJobsForQA = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get jobs with PRINTED status (ready for QA)
      const searchResult = await printJobService.searchPrintJobs({
        location_id: user?.primary_location?.id,
        status: ['PRINTED', 'QUALITY_CHECK']
      }, 1, 50);

      setJobsForQA(searchResult.jobs);
    } catch (error) {
      console.error('Error loading QA jobs:', error);
      setError('Failed to load jobs for quality assurance');
    } finally {
      setLoading(false);
    }
  };

  // Start QA process
  const startQA = async (job: PrintJobResponse) => {
    try {
      // Get full job details
      const jobDetails = await printJobService.getPrintJob(job.id);
      setSelectedJob(jobDetails);
      
      // Start QA workflow
      await printJobService.startQualityCheck(job.id);
      
      // Initialize QA results
      const initialResults: QualityCheckResult = {
        overall_result: 'PASSED',
        criteria_results: {},
        notes: '',
        defect_categories: [],
        reprint_required: false,
        inspector_rating: 5
      };

      // Initialize all criteria as passed
      qualityCheckCriteria.forEach(category => {
        category.items.forEach(item => {
          initialResults.criteria_results[item.id] = true;
        });
      });

      setQaResults(initialResults);
      setQaStep(0);
      setQaDialogOpen(true);
    } catch (error) {
      console.error('Error starting QA:', error);
      setError('Failed to start quality assurance');
    }
  };

  // Update QA criteria result
  const updateCriteriaResult = (itemId: string, passed: boolean) => {
    setQaResults(prev => ({
      ...prev,
      criteria_results: {
        ...prev.criteria_results,
        [itemId]: passed
      }
    }));
  };

  // Calculate overall QA result
  const calculateOverallResult = (): 'PASSED' | 'FAILED_PRINTING' | 'FAILED_DATA' | 'FAILED_DAMAGE' => {
    const results = qaResults.criteria_results;
    
    // Check for critical failures
    const criticalFailures = qualityCheckCriteria.flatMap(category => 
      category.items.filter(item => item.critical && !results[item.id])
    );

    if (criticalFailures.length === 0) {
      return 'PASSED';
    }

    // Categorize failures
    const photoFailures = criticalFailures.filter(item => 
      item.id.includes('photo') || item.id.includes('clarity') || item.id.includes('positioning')
    );
    
    const dataFailures = criticalFailures.filter(item => 
      item.id.includes('data') || item.id.includes('text') || item.id.includes('categories') || item.id.includes('dates')
    );
    
    const physicalFailures = criticalFailures.filter(item => 
      item.id.includes('surface') || item.id.includes('lamination') || item.id.includes('card')
    );

    // Prioritize failure types
    if (dataFailures.length > 0) return 'FAILED_DATA';
    if (physicalFailures.length > 0) return 'FAILED_DAMAGE';
    return 'FAILED_PRINTING';
  };

  // Submit QA results
  const submitQAResults = async () => {
    if (!selectedJob) return;

    try {
      setLoading(true);
      
      const overallResult = calculateOverallResult();
      const finalResults = {
        ...qaResults,
        overall_result: overallResult,
        reprint_required: overallResult !== 'PASSED'
      };

      // Submit QA results
      await printJobService.completeQualityCheck(
        selectedJob.id,
        finalResults.overall_result as QualityCheckRequest['qa_result'],
        finalResults.notes
      );

      setQaDialogOpen(false);
      setSelectedJob(null);
      loadJobsForQA(); // Refresh the list
      
    } catch (error) {
      console.error('Error submitting QA results:', error);
      setError('Failed to submit QA results');
    } finally {
      setLoading(false);
    }
  };

  // Download card file for inspection
  const downloadCardFile = async (jobId: string, fileType: 'front' | 'back' | 'combined-pdf') => {
    try {
      const response = await fetch(`/api/v1/printing/jobs/${jobId}/files/${fileType}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `qa_${fileType}_${jobId}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Failed to download file');
    }
  };

  // Get QA step content
  const getQAStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Job Overview
            </Typography>
            {selectedJob && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <List>
                    <ListItem>
                      <ListItemText 
                        primary="Job Number" 
                        secondary={selectedJob.job_number} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Person Name" 
                        secondary={selectedJob.person_name} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Card Number" 
                        secondary={selectedJob.card_number} 
                      />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Download Card Files for Inspection:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                    <Button
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={() => downloadCardFile(selectedJob.id, 'front')}
                      size="small"
                    >
                      Front Image
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={() => downloadCardFile(selectedJob.id, 'back')}
                      size="small"
                    >
                      Back Image
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<DownloadIcon />}
                      onClick={() => downloadCardFile(selectedJob.id, 'combined-pdf')}
                      size="small"
                    >
                      Combined PDF
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Quality Check Criteria
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Inspect the physical card and digital files. Mark each criterion as pass/fail.
              Critical items (marked with *) must pass for overall approval.
            </Typography>
            
            {qualityCheckCriteria.map((category, categoryIndex) => (
              <Accordion key={category.category} defaultExpanded={categoryIndex === 0}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {category.category}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <FormGroup>
                    {category.items.map((item) => (
                      <Box key={item.id} sx={{ mb: 2 }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={qaResults.criteria_results[item.id] || false}
                              onChange={(e) => updateCriteriaResult(item.id, e.target.checked)}
                              color="success"
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: item.critical ? 'bold' : 'normal' }}>
                                {item.label} {item.critical && '*'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.description}
                              </Typography>
                            </Box>
                          }
                        />
                        {!qaResults.criteria_results[item.id] && (
                          <Alert severity="warning" sx={{ mt: 1, ml: 4 }}>
                            {item.critical ? 'Critical failure - reprint will be required' : 'Minor issue noted'}
                          </Alert>
                        )}
                      </Box>
                    ))}
                  </FormGroup>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        );

      case 2:
        const overallResult = calculateOverallResult();
        const failedCriteria = Object.entries(qaResults.criteria_results)
          .filter(([_, passed]) => !passed)
          .map(([itemId, _]) => {
            for (const category of qualityCheckCriteria) {
              const item = category.items.find(i => i.id === itemId);
              if (item) return `${category.category}: ${item.label}`;
            }
            return itemId;
          });

        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              QA Summary and Results
            </Typography>
            
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  {overallResult === 'PASSED' ? (
                    <PassIcon color="success" sx={{ fontSize: 40 }} />
                  ) : (
                    <FailIcon color="error" sx={{ fontSize: 40 }} />
                  )}
                  <Box>
                    <Typography variant="h5">
                      Overall Result: {overallResult}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {overallResult === 'PASSED' 
                        ? 'Card meets quality standards and is approved for collection'
                        : 'Card has quality issues and requires attention'
                      }
                    </Typography>
                  </Box>
                </Box>

                {failedCriteria.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Failed Criteria:
                    </Typography>
                    <List dense>
                      {failedCriteria.map((criteria, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <FailIcon color="error" />
                          </ListItemIcon>
                          <ListItemText primary={criteria} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </CardContent>
            </Card>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Inspector Rating (1-5 stars):
              </Typography>
              <Rating
                value={qaResults.inspector_rating}
                onChange={(event, newValue) => {
                  setQaResults(prev => ({
                    ...prev,
                    inspector_rating: newValue || 1
                  }));
                }}
                size="large"
              />
            </Box>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="QA Notes and Comments"
              value={qaResults.notes}
              onChange={(e) => setQaResults(prev => ({
                ...prev,
                notes: e.target.value
              }))}
              placeholder="Add detailed notes about the inspection, any defects found, or recommendations..."
            />
          </Box>
        );

      default:
        return null;
    }
  };

  const qaSteps = ['Job Review', 'Quality Inspection', 'Results Summary'];

  useEffect(() => {
    loadJobsForQA();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <QualityIcon fontSize="large" />
        Quality Assurance
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Inspect printed cards and ensure quality standards are met
      </Typography>

      {/* Action Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Cards Ready for QA ({jobsForQA.length})
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadJobsForQA}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Jobs List */}
      {!loading && jobsForQA.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <QualityIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No cards ready for quality assurance
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cards need to be printed before they can be inspected
          </Typography>
        </Paper>
      )}

      {!loading && jobsForQA.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Job Number</TableCell>
                <TableCell>Person</TableCell>
                <TableCell>Card Number</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Printed At</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {jobsForQA.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>{job.job_number}</TableCell>
                  <TableCell>{job.person_name || 'Unknown'}</TableCell>
                  <TableCell>{job.card_number}</TableCell>
                  <TableCell>
                    <Chip 
                      label={printJobService.getStatusDisplayName(job.status)}
                      color={printJobService.getStatusColor(job.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {job.printing_completed_at ? 
                      printJobService.formatShortDate(job.printing_completed_at) : 
                      'Unknown'
                    }
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={printJobService.getPriorityDisplayName(job.priority)}
                      color={printJobService.getPriorityColor(job.priority)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        startIcon={<InspectIcon />}
                        onClick={() => startQA(job)}
                        disabled={job.status === 'QUALITY_CHECK'}
                        size="small"
                      >
                        {job.status === 'QUALITY_CHECK' ? 'In Progress' : 'Start QA'}
                      </Button>
                      <Tooltip title="Download PDF">
                        <IconButton
                          size="small"
                          onClick={() => downloadCardFile(job.id, 'combined-pdf')}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* QA Process Dialog */}
      <Dialog 
        open={qaDialogOpen} 
        onClose={() => setQaDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { minHeight: '80vh' }
        }}
      >
        <DialogTitle>
          Quality Assurance - {selectedJob?.job_number}
        </DialogTitle>
        
        <DialogContent>
          <Stepper activeStep={qaStep} orientation="vertical">
            {qaSteps.map((label, index) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
                <StepContent>
                  {getQAStepContent(index)}
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={() => {
                        if (index === qaSteps.length - 1) {
                          submitQAResults();
                        } else {
                          setQaStep(index + 1);
                        }
                      }}
                      sx={{ mr: 1 }}
                      disabled={loading}
                    >
                      {index === qaSteps.length - 1 ? (
                        loading ? <CircularProgress size={20} /> : 'Submit QA Results'
                      ) : (
                        'Next'
                      )}
                    </Button>
                    {index > 0 && (
                      <Button
                        onClick={() => setQaStep(index - 1)}
                        disabled={loading}
                      >
                        Back
                      </Button>
                    )}
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setQaDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QualityAssurancePage; 