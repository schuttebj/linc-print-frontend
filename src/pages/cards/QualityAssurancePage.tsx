/**
 * Quality Assurance Page for Madagascar License System
 * For QA staff to review and approve printed cards
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  FormControlLabel,
  FormGroup,
  Checkbox,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Print as PrintIcon,
  Visibility as VisibilityIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import printJobService, { PrintJobResponse } from '../../services/printJobService';

interface QAJob {
  id: string;
  job_number: string;
  person_name: string;
  card_number: string;
  print_location_name: string;
  status: string;
  completed_at: string;
}

interface QAOutcome {
  outcome: 'APPROVED' | 'REJECT_REPRINT' | 'REJECT_DEFECTIVE';
  notes: string;
}

const QualityAssurancePage: React.FC = () => {
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PrintJobResponse[]>([]);
  const [selectedJob, setSelectedJob] = useState<PrintJobResponse | null>(null);
  const [cardImages, setCardImages] = useState<{front?: string, back?: string}>({});
  const [qaOutcome, setQaOutcome] = useState<'APPROVED' | 'REJECT_REPRINT' | 'REJECT_DEFECTIVE' | ''>('');
  const [qaNodes, setQaNodes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCardPreview, setShowCardPreview] = useState(false);

  const steps = ['Search Job', 'Quality Review', 'Final Decision'];

  // Quality check criteria
  const qualityChecks = [
    { id: 'print_quality', label: 'Print Quality', description: 'Clear text and images, no smudging' },
    { id: 'card_material', label: 'Card Material', description: 'No cracks, scratches, or defects' },
    { id: 'data_accuracy', label: 'Data Accuracy', description: 'All personal information correct' },
    { id: 'photo_quality', label: 'Photo Quality', description: 'Photo clear and properly positioned' },
    { id: 'security_features', label: 'Security Features', description: 'All security elements present' }
  ];

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search term');
      return;
    }

    setIsSearching(true);
    setError(null);
    
    try {
      // Search for completed print jobs ready for QA
      const response = await printJobService.searchPrintJobs({
        job_number: searchQuery,
        status: ['PRINTED', 'QUALITY_CHECK']
      });

      setSearchResults(response.jobs);
      
      if (response.jobs.length === 0) {
        setError('No print jobs found ready for quality assurance');
      } else {
        setActiveStep(1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search for jobs');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectJob = async (job: PrintJobResponse) => {
    setSelectedJob(job);
    
    // Load card images for preview
    try {
      // Get the API base URL (same pattern as printJobService)
      const getApiBaseUrl = (): string => {
        const env = (import.meta as any).env;
        
        if (env?.VITE_API_BASE_URL) {
          return env.VITE_API_BASE_URL;
        }
        
        if (env?.DEV || env?.MODE === 'development') {
          return 'http://localhost:8000';
        }
        
        return 'https://linc-print-backend.onrender.com';
      };
      
      const baseURL = getApiBaseUrl();
      const token = localStorage.getItem('access_token');
      
      const [frontResponse, backResponse] = await Promise.all([
        fetch(`${baseURL}/api/v1/printing/jobs/${job.id}/files/front`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${baseURL}/api/v1/printing/jobs/${job.id}/files/back`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const images: {front?: string, back?: string} = {};
      
      if (frontResponse.ok) {
        const frontBlob = await frontResponse.blob();
        images.front = URL.createObjectURL(frontBlob);
      }
      
      if (backResponse.ok) {
        const backBlob = await backResponse.blob();
        images.back = URL.createObjectURL(backBlob);
      }

      setCardImages(images);
    } catch (error) {
      console.error('Error loading card images:', error);
    }
    
    setQaOutcome('');
    setQaNodes('');
    setActiveStep(2);
  };

  const handleProcessQA = async () => {
    if (!selectedJob || !qaOutcome) {
      setError('Please select an outcome');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      let result;
      
      switch (qaOutcome) {
        case 'APPROVED':
          result = await printJobService.completeQualityCheck(selectedJob.id, 'PASSED', qaNodes);
          break;
        case 'REJECT_REPRINT':
          result = await printJobService.completeQualityCheck(selectedJob.id, 'FAILED_PRINTING', qaNodes);
          break;
        case 'REJECT_DEFECTIVE':
          result = await printJobService.completeQualityCheck(selectedJob.id, 'FAILED_DAMAGE', qaNodes);
          break;
      }

      setSuccess('Quality assurance completed successfully');
      
      // Reset form for next QA
      setTimeout(() => {
        handleStartNewQA();
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Failed to process quality assurance');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartNewQA = () => {
    setActiveStep(0);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedJob(null);
    setCardImages({});
    setQaOutcome('');
    setQaNodes('');
    setError(null);
    setSuccess(null);
  };

  const renderSearchStep = () => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <SearchIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Search for Print Jobs</Typography>
        </Box>
        
        <Box display="flex" gap={2} alignItems="center">
          <TextField
            label="Search Term"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter job number, card number, or person name"
            disabled={isSearching}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            sx={{ flexGrow: 1 }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            startIcon={isSearching ? <CircularProgress size={20} /> : <SearchIcon />}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const renderJobSelection = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Jobs Ready for Quality Assurance</Typography>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Job Number</TableCell>
                <TableCell>Person</TableCell>
                <TableCell>Card Number</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {searchResults.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>{job.job_number}</TableCell>
                  <TableCell>{job.person_name || 'Unknown'}</TableCell>
                  <TableCell>{job.card_number}</TableCell>
                  <TableCell>
                    <Chip 
                      label={job.status} 
                      size="small" 
                      color={job.status === 'PRINTED' ? 'warning' : 'info'} 
                    />
                  </TableCell>
                  <TableCell>{job.print_location_name || 'Unknown'}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleSelectJob(job)}
                      startIcon={<AssignmentIcon />}
                    >
                      Review Card
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box mt={2} display="flex" justifyContent="space-between">
          <Button onClick={() => setActiveStep(0)}>
            Back to Search
          </Button>
        </Box>
      </CardContent>
    </Card>
  );

  const renderQAStep = () => {
    if (!selectedJob) return null;

    return (
      <Box>
        {/* Job Details */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Job Details</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Job Number</Typography>
                <Typography variant="body1" fontWeight="bold">{selectedJob.job_number}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Person</Typography>
                <Typography variant="body1" fontWeight="bold">{selectedJob.person_name}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Card Number</Typography>
                <Typography variant="body1" fontWeight="bold">{selectedJob.card_number}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Status</Typography>
                <Chip label={selectedJob.status} size="small" color="warning" />
              </Grid>
            </Grid>

            <Box mt={2}>
              <Button
                variant="outlined"
                onClick={() => setShowCardPreview(true)}
                startIcon={<VisibilityIcon />}
              >
                View Card Images
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Quality Assessment */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Quality Assessment</Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Button
                  fullWidth
                  variant={qaOutcome === 'APPROVED' ? 'contained' : 'outlined'}
                  color="success"
                  onClick={() => setQaOutcome('APPROVED')}
                  startIcon={<CheckIcon />}
                  size="large"
                >
                  APPROVE
                </Button>
              </Grid>
              <Grid item xs={4}>
                <Button
                  fullWidth
                  variant={qaOutcome === 'REJECT_REPRINT' ? 'contained' : 'outlined'}
                  color="warning"
                  onClick={() => setQaOutcome('REJECT_REPRINT')}
                  startIcon={<PrintIcon />}
                  size="large"
                >
                  REPRINT
                </Button>
              </Grid>
              <Grid item xs={4}>
                <Button
                  fullWidth
                  variant={qaOutcome === 'REJECT_DEFECTIVE' ? 'contained' : 'outlined'}
                  color="error"
                  onClick={() => setQaOutcome('REJECT_DEFECTIVE')}
                  startIcon={<CancelIcon />}
                  size="large"
                >
                  DEFECTIVE
                </Button>
              </Grid>
            </Grid>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="QA Notes"
              value={qaNodes}
              onChange={(e) => setQaNodes(e.target.value)}
              margin="normal"
              placeholder="Enter quality assessment notes..."
            />
          </CardContent>
        </Card>

        <Box display="flex" justifyContent="space-between">
          <Button onClick={() => setActiveStep(1)}>
            Back to Jobs
          </Button>
          <Button
            variant="contained"
            color={qaOutcome === 'APPROVED' ? 'success' : qaOutcome === 'REJECT_REPRINT' ? 'warning' : 'error'}
            onClick={handleProcessQA}
            disabled={isProcessing || !qaOutcome}
            startIcon={isProcessing ? <CircularProgress size={20} /> : null}
            size="large"
          >
            {isProcessing ? 'Processing...' : `Confirm ${qaOutcome}`}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {success}
          </Alert>
        )}
      </Box>
    );
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Card Quality Assurance
      </Typography>

      <Box mb={4}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {activeStep === 0 && renderSearchStep()}
      {activeStep === 1 && renderJobSelection()}
      {activeStep === 2 && renderQAStep()}

      {/* Card Preview Dialog */}
      <Dialog
        open={showCardPreview}
        onClose={() => setShowCardPreview(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Card Preview</DialogTitle>
        <DialogContent>
          {cardImages.front || cardImages.back ? (
            <Grid container spacing={2}>
              {cardImages.front && (
                <Grid item xs={12} md={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>Card Front</Typography>
                    <img 
                      src={cardImages.front} 
                      alt="Card Front" 
                      style={{ 
                        maxWidth: '100%', 
                        height: 'auto', 
                        border: '1px solid #ccc',
                        borderRadius: '8px'
                      }} 
                    />
                  </Box>
                </Grid>
              )}
              {cardImages.back && (
                <Grid item xs={12} md={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>Card Back</Typography>
                    <img 
                      src={cardImages.back} 
                      alt="Card Back" 
                      style={{ 
                        maxWidth: '100%', 
                        height: 'auto', 
                        border: '1px solid #ccc',
                        borderRadius: '8px'
                      }} 
                    />
                  </Box>
                </Grid>
              )}
            </Grid>
          ) : (
            <Alert severity="info">
              Card images are being loaded...
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCardPreview(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QualityAssurancePage; 