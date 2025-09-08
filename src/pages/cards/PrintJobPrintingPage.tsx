import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Card,
  CardContent,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Container,
  IconButton,
  Tooltip,
  Skeleton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Print as PrintIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import printJobService, { PrintJobDetailResponse } from '../../services/printJobService';

const PrintJobPrintingPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  
  const [printJob, setPrintJob] = useState<PrintJobDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [printProgress, setPrintProgress] = useState(0);
  const [cardImages, setCardImages] = useState<{front?: string, back?: string}>({});
  const [actionLoading, setActionLoading] = useState(false);

  // Load print job details
  const loadPrintJob = async () => {
    if (!jobId) return;

    try {
      setLoading(true);
      const job = await printJobService.getPrintJob(jobId);
      setPrintJob(job);
      
      // Load card images
      await loadCardImages(jobId);
    } catch (error) {
      console.error('Error loading print job:', error);
      setError('Failed to load print job details');
    } finally {
      setLoading(false);
    }
  };

  // Load card images for preview
  const loadCardImages = async (jobId: string) => {
    try {
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
      
      // Load front and back card images
      const [frontResponse, backResponse] = await Promise.all([
        fetch(`${baseURL}/api/v1/printing/jobs/${jobId}/files/front`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${baseURL}/api/v1/printing/jobs/${jobId}/files/back`, {
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
  };

  // Start printing process - Direct Windows printing
  const handleStartPrinting = async () => {
    if (!printJob) return;

    try {
      setActionLoading(true);
      setPrinting(true);
      
      // Auto-assign job to current user and start printing
      await printJobService.assignJobToPrinter(printJob.id, user?.id || '');
      await printJobService.startPrintingJob(printJob.id);
      
      // Directly open Windows printer
      await handlePrintToWindows();
      
      // Mark as complete after printing
      await printJobService.completePrintingJob(printJob.id, 'Windows printer - printing completed');
      
      // Refresh job details
      await loadPrintJob();
      
    } catch (error) {
      console.error('Error in printing workflow:', error);
      setError('Failed to complete printing workflow');
    } finally {
      setActionLoading(false);
      setPrinting(false);
      setPrintProgress(0);
    }
  };

  // Complete printing process
  const handleCompletePrinting = async () => {
    if (!printJob) return;

    try {
      setActionLoading(true);
      
      // Mark printing as complete (CARD_PRODUCTION → PRINT_COMPLETE)
      await printJobService.completePrintingJob(printJob.id, 'Printing completed successfully');
      
      // Refresh job details
      await loadPrintJob();
      
    } catch (error) {
      console.error('Error completing printing:', error);
      setError('Failed to complete printing process');
    } finally {
      setActionLoading(false);
    }
  };

  // Print card to Windows printer
  const handlePrintToWindows = async () => {
    if (!cardImages.front && !cardImages.back) {
      setError('No card images available for printing');
      return;
    }

    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Failed to open print window');
      }

      // CR80 standard card dimensions: 85.60 × 53.98 mm (3.375 × 2.125 inches)
      const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>License Card Print - ${printJob?.job_number}</title>
          <style>
            @page {
              size: 3.375in 2.125in;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
            }
            .card-container {
              width: 3.375in;
              height: 2.125in;
              page-break-after: always;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            .card-image {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
            .card-title {
              position: absolute;
              top: 10px;
              left: 10px;
              font-size: 8px;
              color: #666;
            }
          </style>
        </head>
        <body>
          ${cardImages.front ? `
            <div class="card-container">
              <div class="card-title">FRONT - ${printJob?.job_number}</div>
              <img src="${cardImages.front}" alt="Card Front" class="card-image" />
            </div>
          ` : ''}
          ${cardImages.back ? `
            <div class="card-container">
              <div class="card-title">BACK - ${printJob?.job_number}</div>
              <img src="${cardImages.back}" alt="Card Back" class="card-image" />
            </div>
          ` : ''}
        </body>
        </html>
      `;

      printWindow.document.write(printHTML);
      printWindow.document.close();
      
      // Wait for images to load before printing
      printWindow.addEventListener('load', () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 1000);
      });

    } catch (error) {
      console.error('Error printing card:', error);
      setError('Failed to print card to Windows printer');
    }
  };

  // Simulate printing progress for UI feedback
  const simulatePrintingProgress = () => {
    return new Promise<void>((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setPrintProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          resolve();
        }
      }, 300);
    });
  };

  // Get current step for stepper
  const getCurrentStep = () => {
    if (!printJob) return 0;
    
    switch (printJob.status) {
      case 'QUEUED':
        return 0;
      case 'PRINTING':
        return 1;
      case 'PRINTED':
        return 2;
      case 'QUALITY_CHECK':
      case 'COMPLETED':
        return 3;
      default:
        return 0;
    }
  };

  // Get step status
  const getStepStatus = (stepIndex: number) => {
    const currentStep = getCurrentStep();
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return 'active';
    return 'inactive';
  };

  // Load job on mount
  useEffect(() => {
    loadPrintJob();
  }, [jobId]);

  // Cleanup image URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(cardImages).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [cardImages]);

  // Skeleton loading component
  const renderSkeleton = () => (
    <Container maxWidth="lg" sx={{ py: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper 
        elevation={0}
        sx={{ 
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#f8f9fa',
          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        {/* Header Skeleton */}
        <Box sx={{ p: 2, bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Skeleton variant="circular" width={32} height={32} />
              <Skeleton variant="text" width={200} height={24} />
              <Skeleton variant="rounded" width={80} height={24} />
            </Box>
            <Skeleton variant="circular" width={32} height={32} />
          </Box>
        </Box>

        {/* Content Skeleton */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          <Grid container spacing={2}>
            {/* Left Column Skeleton */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Skeleton variant="text" width={120} height={24} sx={{ mb: 2 }} />
                {Array.from({ length: 5 }).map((_, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Skeleton variant="text" width="40%" height={14} />
                    <Skeleton variant="text" width="80%" height={20} />
                  </Box>
                ))}
              </Paper>
              
              <Paper sx={{ p: 2 }}>
                <Skeleton variant="text" width={150} height={24} sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Skeleton variant="circular" width={24} height={24} />
                      <Skeleton variant="text" width="70%" height={20} />
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Grid>

            {/* Right Column Skeleton */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 2 }}>
                <Skeleton variant="text" width={180} height={24} sx={{ mb: 2 }} />
                
                {/* Card Images Skeleton */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Skeleton variant="text" width={100} height={20} sx={{ mb: 1, mx: 'auto' }} />
                      <Skeleton variant="rounded" width="100%" height={200} />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Skeleton variant="text" width={100} height={20} sx={{ mb: 1, mx: 'auto' }} />
                      <Skeleton variant="rounded" width="100%" height={200} />
                    </Box>
                  </Grid>
                </Grid>

                {/* Control Buttons Skeleton */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Skeleton variant="rounded" width={200} height={48} />
                  <Skeleton variant="rounded" width={150} height={40} />
                  <Skeleton variant="rounded" width={150} height={40} />
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );

  // Permission check
  const canPrint = () => hasPermission('printing.print') || user?.is_superuser;

  if (!canPrint()) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="warning">
          You don't have permission to access the printing workstation.
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return renderSkeleton();
  }

  if (error || !printJob) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Print job not found'}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/cards/print-queue')}
        >
          Back to Print Queue
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper 
        elevation={0}
        sx={{ 
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#f8f9fa',
          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton
                onClick={() => navigate('/cards/print-queue')}
                size="small"
              >
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                Print Job: {printJob.job_number}
              </Typography>
              <Chip 
                label={printJobService.getStatusDisplayName(printJob.status)}
                color={printJobService.getStatusColor(printJob.status)}
                size="small"
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                onClick={loadPrintJob}
                disabled={loading}
                size="small"
              >
                <RefreshIcon />
              </IconButton>
            </Box>
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Left Column: Job Details & Progress */}
            <Grid item xs={12} md={4}>
              {/* Job Information */}
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 600 }}>
                  Job Information
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">Person</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {printJob.person_name}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">Card Number</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {printJob.card_number}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">Template</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {printJob.card_template}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">Priority</Typography>
                  <Chip 
                    label={printJobService.getPriorityDisplayName(printJob.priority)}
                    color={printJobService.getPriorityColor(printJob.priority)}
                    size="small"
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">Submitted</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {printJobService.formatDate(printJob.submitted_at)}
                  </Typography>
                </Box>
              </Paper>

              {/* Printing Progress */}
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 600 }}>
                  Printing Progress
                </Typography>
                
                <Stepper orientation="vertical" activeStep={getCurrentStep()}>
                  <Step>
                    <StepLabel>
                      <Typography variant="body2">Ready for Printing</Typography>
                    </StepLabel>
                    <StepContent>
                      <Typography variant="caption" color="text.secondary">
                        Job is in queue and ready to start printing
                      </Typography>
                    </StepContent>
                  </Step>
                  
                  <Step>
                    <StepLabel>
                      <Typography variant="body2">Printing in Progress</Typography>
                    </StepLabel>
                    <StepContent>
                      <Typography variant="caption" color="text.secondary">
                        Card is being physically printed
                      </Typography>
                      {printing && (
                        <LinearProgress 
                          variant="determinate" 
                          value={printProgress} 
                          sx={{ mt: 1 }}
                        />
                      )}
                    </StepContent>
                  </Step>
                  
                  <Step>
                    <StepLabel>
                      <Typography variant="body2">Print Complete</Typography>
                    </StepLabel>
                    <StepContent>
                      <Typography variant="caption" color="text.secondary">
                        Card printing finished, ready for quality check
                      </Typography>
                    </StepContent>
                  </Step>
                  
                  <Step>
                    <StepLabel>
                      <Typography variant="body2">Quality Assurance</Typography>
                    </StepLabel>
                    <StepContent>
                      <Typography variant="caption" color="text.secondary">
                        Card will be reviewed by QA team
                      </Typography>
                    </StepContent>
                  </Step>
                </Stepper>
              </Paper>
            </Grid>

            {/* Right Column: Card Preview & Controls */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 600 }}>
                  Card Preview & Controls
                </Typography>
                
                {/* Card Images */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {cardImages.front && (
                    <Grid item xs={12} md={6}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="subtitle2" gutterBottom>Card Front</Typography>
                        <img 
                          src={cardImages.front} 
                          alt="Card Front" 
                          style={{ 
                            maxWidth: '100%', 
                            height: 'auto', 
                            border: '1px solid #ccc',
                            borderRadius: '8px',
                            maxHeight: '300px'
                          }} 
                        />
                      </Box>
                    </Grid>
                  )}
                  {cardImages.back && (
                    <Grid item xs={12} md={6}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="subtitle2" gutterBottom>Card Back</Typography>
                        <img 
                          src={cardImages.back} 
                          alt="Card Back" 
                          style={{ 
                            maxWidth: '100%', 
                            height: 'auto', 
                            border: '1px solid #ccc',
                            borderRadius: '8px',
                            maxHeight: '300px'
                          }} 
                        />
                      </Box>
                    </Grid>
                  )}
                </Grid>

                <Divider sx={{ my: 2 }} />

                {/* Control Buttons */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {printJob.status === 'QUEUED' && (
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      startIcon={<PrintIcon />}
                      onClick={handleStartPrinting}
                      disabled={actionLoading || printing || !cardImages.front && !cardImages.back}
                    >
                      {actionLoading ? 'Processing...' : 'Print Card (Windows Printer)'}
                    </Button>
                  )}

                  {printJob.status === 'PRINTING' && (
                    <Button
                      variant="contained"
                      color="success"
                      size="large"
                      startIcon={<CheckCircleIcon />}
                      onClick={handleCompletePrinting}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Completing...' : 'Mark Complete'}
                    </Button>
                  )}

                  {printJob.status === 'PRINTED' && (
                    <Alert severity="success" sx={{ width: '100%' }}>
                      <Typography variant="body2">
                        Printing completed successfully! This job is now ready for quality assurance.
                      </Typography>
                    </Alert>
                  )}

                  {(printJob.status === 'QUALITY_CHECK' || printJob.status === 'COMPLETED') && (
                    <Alert severity="info" sx={{ width: '100%' }}>
                      <Typography variant="body2">
                        This job has moved to the next stage of the workflow.
                      </Typography>
                    </Alert>
                  )}

                  {/* Preview/Download buttons always available */}
                  <Button
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                    onClick={() => {
                      if (cardImages.front) {
                        window.open(cardImages.front, '_blank');
                      }
                    }}
                    disabled={!cardImages.front}
                  >
                    Preview Front
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                    onClick={() => {
                      if (cardImages.back) {
                        window.open(cardImages.back, '_blank');
                      }
                    }}
                    disabled={!cardImages.back}
                  >
                    Preview Back
                  </Button>
                </Box>

                {/* License Information */}
                {printJob.licenses && printJob.licenses.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                      Licenses on Card ({printJob.licenses.length})
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {printJob.licenses.map((license) => (
                        <Chip 
                          key={license.license_id}
                          label={`${license.category} - ${license.status}`}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default PrintJobPrintingPage;
