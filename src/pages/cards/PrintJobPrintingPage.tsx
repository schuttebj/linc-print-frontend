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
  const [printAttempts, setPrintAttempts] = useState(0);
  const [lastPrintTime, setLastPrintTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Utility function to calculate printing duration with full time format
  const getPrintingDuration = () => {
    if (!printJob?.printing_started_at) return null;
    
    const startTime = new Date(printJob.printing_started_at);
    const now = currentTime;
    const diffMs = now.getTime() - startTime.getTime();
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    
    // Build display text
    let displayParts = [];
    if (days > 0) displayParts.push(`${days}d`);
    if (hours > 0) displayParts.push(`${hours}h`);
    if (minutes > 0) displayParts.push(`${minutes}m`);
    displayParts.push(`${seconds}s`);
    
    return {
      totalMinutes,
      totalSeconds: Math.floor(diffMs / 1000),
      displayText: displayParts.join(' '),
      isWarning: totalMinutes >= 5, // Warning after 5 minutes
      isCritical: totalMinutes >= 10 // Critical after 10 minutes
    };
  };

  // Print Duration Component
  const PrintDurationTimer = ({ showIcon = true }: { showIcon?: boolean }) => {
    const duration = getPrintingDuration();
    
    if (!duration || printJob?.status !== 'PRINTING') return null;

    const getSeverity = () => {
      if (duration.isCritical) return 'error';
      if (duration.isWarning) return 'warning';
      return 'info';
    };

    const getIcon = () => {
      if (duration.isCritical) return '🚨';
      if (duration.isWarning) return '⚠️';
      return '⏱️';
    };

    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 0.5,
        padding: '4px 8px',
        borderRadius: 1,
        backgroundColor: getSeverity() === 'error' ? '#ffebee' : 
                        getSeverity() === 'warning' ? '#fff3e0' : '#e3f2fd',
        border: `1px solid ${getSeverity() === 'error' ? '#f44336' : 
                              getSeverity() === 'warning' ? '#ff9800' : '#2196f3'}`
      }}>
        {showIcon && <span style={{ fontSize: '0.8rem' }}>{getIcon()}</span>}
        <Typography 
          variant="caption" 
          sx={{ 
            fontSize: '0.75rem',
            fontWeight: 600,
            color: getSeverity() === 'error' ? '#d32f2f' : 
                   getSeverity() === 'warning' ? '#f57c00' : '#1976d2'
          }}
        >
          {duration.displayText}
          {duration.isWarning && ' (check printer)'}
        </Typography>
      </Box>
    );
  };

  // Update current time every second for live timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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

  // Start printing process - ONLY for QUEUED jobs
  const handleStartPrinting = async () => {
    if (!printJob || printJob.status !== 'QUEUED') return;

    try {
      setActionLoading(true);
      setPrinting(true);
      
      // Track print attempt
      const attemptNumber = printAttempts + 1;
      setPrintAttempts(attemptNumber);
      setLastPrintTime(new Date());
      
      console.log(`🖨️ Starting print job ${printJob.job_number} by ${user?.username}`);
      
      // Get user's location for assignment
      let locationId = user?.primary_location_id;
      
      // For admin users, use the print job's location
      if (user?.user_type === 'NATIONAL_ADMIN' && printJob.print_location_id) {
        locationId = printJob.print_location_id;
      }
      
      // Assign job to printer with location
      await printJobService.assignJobToPrinter(printJob.id, user?.id || '', locationId);
      
      // Start printing process
      await printJobService.startPrintingJob(printJob.id);
      
      // Open Windows printer
      await handlePrintToWindows();
      
      // Refresh job details to update status
      await loadPrintJob();
      
    } catch (error) {
      console.error(`❌ Print job start failed:`, error);
      setError(`Failed to start printing. Please try again.`);
    } finally {
      setActionLoading(false);
      setPrinting(false);
      setPrintProgress(0);
    }
  };

  // Reprint function - ONLY for PRINTING jobs
  const handleReprint = async () => {
    if (!printJob || printJob.status !== 'PRINTING') return;

    try {
      setActionLoading(true);
      setPrinting(true);
      
      // Track reprint attempt
      const attemptNumber = printAttempts + 1;
      setPrintAttempts(attemptNumber);
      setLastPrintTime(new Date());
      
      console.log(`🔄 Reprint attempt #${attemptNumber} for job ${printJob.job_number}`);
      
      // Only open Windows printer (no status changes for reprints)
      await handlePrintToWindows();
      
    } catch (error) {
      console.error(`❌ Reprint attempt failed:`, error);
      setError(`Reprint failed. Please try again.`);
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
      
      // Log completion with print attempts info
      const completionNotes = `Printing completed after ${printAttempts} attempt(s). Last printed: ${lastPrintTime?.toLocaleString()}`;
      console.log(`✅ Job ${printJob.job_number} completed: ${completionNotes}`);
      
      // Mark printing as complete
      await printJobService.completePrintingJob(printJob.id, completionNotes);
      
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
      // Full page printing with card-sized content
      const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>License Card Print - ${printJob?.job_number}</title>
          <style>
            @page {
              size: A4;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              background: white;
            }
            .page-container {
              width: 100vw;
              height: 100vh;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              page-break-after: always;
            }
            .card-container {
              width: 3.375in;
              height: 2.125in;
              border: 2px solid #000;
              border-radius: 8px;
              position: relative;
              box-shadow: 0 4px 8px rgba(0,0,0,0.1);
              overflow: hidden;
              margin: 20px;
            }
            .card-image {
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
            }
            .card-info {
              position: absolute;
              bottom: -30px;
              left: 0;
              right: 0;
              text-align: center;
              font-size: 10px;
              color: #333;
              background: white;
              padding: 5px;
              border: 1px solid #ccc;
              border-radius: 4px;
            }
            .print-instructions {
              margin-top: 20px;
              padding: 10px;
              border: 1px solid #ddd;
              border-radius: 4px;
              background: #f9f9f9;
              max-width: 500px;
              text-align: center;
            }
            .print-instructions h3 {
              margin: 0 0 10px 0;
              color: #333;
              font-size: 14px;
            }
            .print-instructions p {
              margin: 5px 0;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          ${cardImages.front ? `
            <div class="page-container">
              <div class="card-container">
                <img src="${cardImages.front}" alt="Card Front" class="card-image" />
                <div class="card-info">FRONT - ${printJob?.job_number}</div>
              </div>
              <div class="print-instructions">
                <h3>Card Front - Printing Instructions</h3>
                <p>Print this page on card stock</p>
                <p>Card dimensions: 85.60 × 53.98 mm (CR80 standard)</p>
                <p>Job: ${printJob?.job_number} | Person: ${printJob?.person_name}</p>
              </div>
            </div>
          ` : ''}
          ${cardImages.back ? `
            <div class="page-container">
              <div class="card-container">
                <img src="${cardImages.back}" alt="Card Back" class="card-image" />
                <div class="card-info">BACK - ${printJob?.job_number}</div>
              </div>
              <div class="print-instructions">
                <h3>Card Back - Printing Instructions</h3>
                <p>Print this page on card stock</p>
                <p>Card dimensions: 85.60 × 53.98 mm (CR80 standard)</p>
                <p>Job: ${printJob?.job_number} | Person: ${printJob?.person_name}</p>
              </div>
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
          onClick={() => navigate('/dashboard/cards/print-queue')}
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
                onClick={() => navigate('/dashboard/cards/print-queue')}
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

                {/* Printing Duration Timer */}
                {printJob.status === 'PRINTING' && printJob.printing_started_at && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">Printing Time</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <PrintDurationTimer />
                    </Box>
                  </Box>
                )}
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
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {/* Print Button - ONLY for QUEUED status */}
                    {printJob.status === 'QUEUED' && (
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        startIcon={<PrintIcon />}
                        onClick={handleStartPrinting}
                        disabled={actionLoading || printing || !cardImages.front && !cardImages.back}
                        sx={{
                          fontSize: '0.8rem',
                          padding: '6px 12px',
                          minWidth: 'auto'
                        }}
                      >
                        {actionLoading ? 'Starting...' : 'Print Card'}
                      </Button>
                    )}

                    {/* Reprint Button - For PRINTING status */}
                    {printJob.status === 'PRINTING' && (
                      <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        startIcon={<PrintIcon />}
                        onClick={handleReprint}
                        disabled={actionLoading || printing || !cardImages.front && !cardImages.back}
                        sx={{
                          fontSize: '0.8rem',
                          padding: '6px 12px',
                          minWidth: 'auto'
                        }}
                      >
                        {actionLoading ? 'Reprinting...' : 'Reprint'}
                      </Button>
                    )}

                    {/* Mark Complete Button - For PRINTING status */}
                    {printJob.status === 'PRINTING' && (
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<CheckCircleIcon />}
                        onClick={handleCompletePrinting}
                        disabled={actionLoading}
                        sx={{
                          fontSize: '0.8rem',
                          padding: '6px 12px',
                          minWidth: 'auto',
                          color: 'white',
                          '&:hover': {
                            color: 'white'
                          }
                        }}
                      >
                        {actionLoading ? 'Completing...' : 'Mark Complete'}
                      </Button>
                    )}

                    {/* Preview/Download buttons always available */}
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => {
                        if (cardImages.front) {
                          window.open(cardImages.front, '_blank');
                        }
                      }}
                      disabled={!cardImages.front}
                      sx={{
                        fontSize: '0.8rem',
                        padding: '6px 12px',
                        minWidth: 'auto'
                      }}
                    >
                      Front
                    </Button>

                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => {
                        if (cardImages.back) {
                          window.open(cardImages.back, '_blank');
                        }
                      }}
                      disabled={!cardImages.back}
                      sx={{
                        fontSize: '0.8rem',
                        padding: '6px 12px',
                        minWidth: 'auto'
                      }}
                    >
                      Back
                    </Button>
                  </Box>

                  {/* Status Messages */}
                  {printJob.status === 'PRINTED' && (
                    <Alert severity="success" sx={{ width: '100%', mt: 2 }}>
                      <Typography variant="body2">
                        Printing completed successfully! This job is now ready for quality assurance.
                      </Typography>
                    </Alert>
                  )}

                  {(printJob.status === 'QUALITY_CHECK' || printJob.status === 'COMPLETED') && (
                    <Alert severity="info" sx={{ width: '100%', mt: 2 }}>
                      <Typography variant="body2">
                        This job has moved to the next stage of the workflow.
                      </Typography>
                    </Alert>
                  )}
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
