/**
 * Quality Assurance Page for Madagascar License System
 * For QA staff to review and approve printed cards
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
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
  Tabs,
  Tab,
  Skeleton,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';
import {
  Search as SearchIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Print as PrintIcon,
  Visibility as VisibilityIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  CreditCard as CreditCardIcon,
  Gavel as GavelIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import printJobService, { PrintJobResponse } from '../../services/printJobService';
import { getAuthToken, API_ENDPOINTS, API_BASE_URL } from '../../config/api';

interface PrintJobForQA {
  id: string;
  job_number: string;
  person_id: string;
  person_name: string;
  person_id_number: string;
  card_number: string;
  print_location_name: string;
  status: string;
  printing_completed_at: string;
  card_template: string;
  print_location_id: string;
}

interface QASearchResult {
  jobs: PrintJobForQA[];
  total: number;
}

interface QAOutcome {
  outcome: 'PASSED' | 'FAILED_PRINTING' | 'FAILED_DAMAGE';
  location_id: string;
}

const QualityAssurancePage: React.FC = () => {
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PrintJobForQA[]>([]);
  const [selectedJob, setSelectedJob] = useState<PrintJobForQA | null>(null);
  const [cardImages, setCardImages] = useState<{front?: string, back?: string}>({});
  const [qaOutcome, setQaOutcome] = useState<'PASSED' | 'FAILED_PRINTING' | 'FAILED_DAMAGE' | ''>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCardPreview, setShowCardPreview] = useState(false);

  // Location selection for admin users
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [availableLocations, setAvailableLocations] = useState<any[]>([]);

  const steps = [
    {
      label: 'Search & Select',
      icon: <CreditCardIcon />
    },
    {
      label: 'Quality Review',
      icon: <GavelIcon />
    }
  ];

  // Load available locations for admin users
  useEffect(() => {
    const loadLocations = async () => {
      if (user && !user.primary_location_id) {
        try {
          const token = getAuthToken();
          if (!token) return;

          const response = await fetch(API_ENDPOINTS.locations, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if (response.ok) {
            const data = await response.json();
            setAvailableLocations(data.locations || []);
          }
        } catch (error) {
          console.error('Error loading locations:', error);
        }
      }
    };
    loadLocations();
  }, [user]);

  // Get location ID to use
  const getLocationId = (): string => {
    return user?.primary_location_id || selectedLocationId;
  };

  // Check if location is required and valid
  const isLocationValid = (): boolean => {
    return !!user?.primary_location_id || !!selectedLocationId;
  };

  // Step validation
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Search & Select
        return !!selectedJob;
      case 1: // Quality Review
        return !!qaOutcome && isLocationValid();
      default:
        return false;
    }
  };

  // Tab change handler
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    // Allow navigation to previous/completed steps or the next step if current is valid
    if (newValue <= activeStep || (newValue === activeStep + 1 && isStepValid(activeStep))) {
      setActiveStep(newValue);
    }
  };

  // Helper function to render tab with completion indicator
  const renderTabLabel = (step: any, index: number) => {
    const isCompleted = index < activeStep && isStepValid(index);
    const isCurrent = activeStep === index;
    
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

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('Please enter a search term (Person ID, Card Number, or Job Number)');
      return;
    }

    setIsSearching(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      if (!token) throw new Error('No authentication token');

      // Build search parameters
      const searchParams = new URLSearchParams();
      searchParams.append('search_term', searchTerm.trim());
      searchParams.append('status', 'PRINTED'); // Only get jobs ready for QA

      const response = await fetch(`${API_BASE_URL}/api/v1/printing/jobs/qa-search?${searchParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to search for print jobs');
      }

      const searchResult: QASearchResult = await response.json();
      setSearchResults(searchResult.jobs);
      
      if (searchResult.jobs.length === 0) {
        setError('No print jobs found ready for quality assurance');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search for print jobs');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectJob = async (job: PrintJobForQA) => {
    setSelectedJob(job);
    
    // Load card images for preview
    try {
      const token = getAuthToken();
      if (!token) throw new Error('No authentication token');
      
      const [frontResponse, backResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/printing/jobs/${job.id}/files/front`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/v1/printing/jobs/${job.id}/files/back`, {
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
  };

  const handleProcessQA = async () => {
    if (!selectedJob || !qaOutcome) {
      setError('Please select an outcome');
      return;
    }

    if (!isLocationValid()) {
      setError('Please select a location before proceeding');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const token = getAuthToken();
      if (!token) throw new Error('No authentication token');

      const qaData: QAOutcome = {
        outcome: qaOutcome,
        location_id: getLocationId()
      };

      const response = await fetch(`${API_BASE_URL}/api/v1/printing/jobs/${selectedJob.id}/qa-complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(qaData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process quality assurance');
      }

      const result = await response.json();
      setSuccess(result.message || 'Quality assurance completed successfully');
      
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
    setSearchTerm('');
    setSearchResults([]);
    setSelectedJob(null);
    setCardImages({});
    setQaOutcome('');
    setError(null);
    setSuccess(null);
    // Reset location selection for admin users
    if (!user?.primary_location_id) {
      setSelectedLocationId('');
    }
  };

  const renderSearchAndSelectStep = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Search Section */}
      <Paper 
        elevation={0}
        sx={{ 
          bgcolor: 'white',
          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
          borderRadius: 2,
          flex: '0 0 auto',
          p: 2
        }}
      >
        <Box display="flex" alignItems="center" mb={2}>
          <CreditCardIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
            Search Print Jobs for Quality Assurance
          </Typography>
        </Box>
        
        {/* Search Field */}
        <Box display="flex" gap={2} alignItems="flex-start" mb={2}>
          <TextField
            label="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Enter Person ID, Card Number, or Job Number"
            disabled={isSearching}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            size="small"
            error={!!error && !searchTerm.trim()}
            sx={{ 
              flexGrow: 1,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderWidth: '1px',
                  borderColor: !!error && !searchTerm.trim() ? '#ff9800' : undefined,
                  transition: 'border-color 0.2s ease-in-out',
                },
                '&:hover fieldset': {
                  borderWidth: '1px',
                },
                '&.Mui-focused fieldset': {
                  borderWidth: '1px',
                },
              },
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={isSearching || !searchTerm.trim()}
            startIcon={isSearching ? <CircularProgress size={16} /> : <SearchIcon />}
            size="small"
            sx={{ flexShrink: 0 }}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2, fontSize: '0.8rem' }}>
            {error}
          </Alert>
        )}

        {isSearching && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Skeleton variant="circular" width={24} height={24} />
              <Skeleton variant="text" width="40%" height={20} />
            </Box>
            <Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 1 }} />
          </Box>
        )}
      </Paper>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Paper 
          elevation={0}
          sx={{ 
            bgcolor: 'white',
            boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
            borderRadius: 2,
            flex: '0 0 auto',
            p: 2
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
            Print Jobs Ready for Quality Assurance
          </Typography>

          <Paper 
            elevation={0}
            sx={{ 
              bgcolor: '#fafafa',
              borderRadius: 1,
              overflow: 'hidden'
            }}
          >
            <TableContainer>
              <Table size="small" sx={{ '& .MuiTableCell-root': { borderRadius: 0 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      fontSize: '0.875rem',
                      bgcolor: '#f8f9fa',
                      py: 1, 
                      px: 2
                    }}>Select</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      fontSize: '0.875rem',
                      bgcolor: '#f8f9fa',
                      py: 1, 
                      px: 2
                    }}>Job Number</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      fontSize: '0.875rem',
                      bgcolor: '#f8f9fa',
                      py: 1, 
                      px: 2
                    }}>Person</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      fontSize: '0.875rem',
                      bgcolor: '#f8f9fa',
                      py: 1, 
                      px: 2
                    }}>Card Number</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      fontSize: '0.875rem',
                      bgcolor: '#f8f9fa',
                      py: 1, 
                      px: 2
                    }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {searchResults.map((job) => (
                    <TableRow key={job.id} hover>
                      <TableCell sx={{ py: 1, px: 2 }}>
                        <Checkbox
                          checked={selectedJob?.id === job.id}
                          onChange={() => handleSelectJob(job)}
                          size="small"
                          color="primary"
                        />
                      </TableCell>
                      <TableCell sx={{ py: 1, px: 2 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {job.job_number}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1, px: 2 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {job.person_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          ID: {job.person_id_number}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1, px: 2 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          {job.card_number}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1, px: 2 }}>
                        <Chip 
                          label={job.status} 
                          size="small"
                          color="warning" 
                          sx={{ 
                            fontSize: '0.7rem', 
                            height: '24px'
                          }} 
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Paper>
      )}

      {/* Selection Summary */}
      {selectedJob && (
        <Paper 
          elevation={0}
          sx={{ 
            bgcolor: 'white',
            boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
            borderRadius: 2,
            flex: '0 0 auto',
            p: 2
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
            Selected Print Job
          </Typography>
          <Box sx={{ bgcolor: '#f8f9fa', p: 1.5, borderRadius: 1 }}>
            <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
              <strong>Job:</strong> {selectedJob.job_number}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
              <strong>Person:</strong> {selectedJob.person_name} ({selectedJob.person_id_number})
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
              <strong>Card:</strong> {selectedJob.card_number}
            </Typography>
          </Box>
        </Paper>
      )}
    </Box>
  );

  const renderQualityReviewStep = () => {
    if (!selectedJob) return null;

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Selected Job Summary */}
        <Paper 
          elevation={0}
          sx={{ 
            bgcolor: 'white',
            boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
            borderRadius: 2,
            flex: '0 0 auto',
            p: 2
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
            Print Job Quality Review
          </Typography>
          <Box sx={{ bgcolor: '#f8f9fa', p: 1.5, borderRadius: 1, mb: 2 }}>
            <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
              <strong>Job Number:</strong> {selectedJob.job_number}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
              <strong>Person:</strong> {selectedJob.person_name} ({selectedJob.person_id_number})
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
              <strong>Card Number:</strong> {selectedJob.card_number}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
              <strong>Status:</strong> <Chip label={selectedJob.status} size="small" color="warning" />
            </Typography>
          </Box>

          <Button
            variant="outlined"
            onClick={() => setShowCardPreview(true)}
            startIcon={<VisibilityIcon />}
            size="small"
            sx={{
              borderWidth: '1px',
              '&:hover': {
                borderWidth: '1px',
              },
            }}
          >
            View Card Images
          </Button>
        </Paper>

        {/* Location Selection for Admin Users */}
        {user && !user.primary_location_id && (
          <Paper 
            elevation={0}
            sx={{ 
              bgcolor: 'white',
              boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
              borderRadius: 2,
              flex: '0 0 auto',
              p: 2
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
              Processing Location
            </Typography>
            <FormControl 
              fullWidth 
              required 
              size="small"
              error={!!error && !selectedLocationId}
            >
              <InputLabel>Location</InputLabel>
              <Select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                label="Location"
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderWidth: '1px',
                    borderColor: !!error && !selectedLocationId ? '#ff9800' : undefined,
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderWidth: '1px',
                    borderColor: !!error && !selectedLocationId ? '#f57c00' : undefined,
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderWidth: '1px',
                    borderColor: !!error && !selectedLocationId ? '#ff9800' : undefined,
                  },
                }}
              >
                {availableLocations.map((location) => (
                  <MenuItem key={location.id} value={location.id}>
                    {location.name} ({location.full_code})
                  </MenuItem>
                ))}
              </Select>
              {!!error && !selectedLocationId && (
                <FormHelperText>Please select a processing location</FormHelperText>
              )}
            </FormControl>
          </Paper>
        )}

        {/* QA Outcome */}
        <Paper 
          elevation={0}
          sx={{ 
            bgcolor: 'white',
            boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
            borderRadius: 2,
            flex: '0 0 auto',
            p: 2
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
            Quality Assessment Outcome
          </Typography>
            
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Button
                fullWidth
                variant={qaOutcome === 'PASSED' ? 'contained' : 'outlined'}
                color="success"
                onClick={() => setQaOutcome('PASSED')}
                startIcon={<CheckIcon />}
                size="small"
                sx={{
                  borderWidth: '1px',
                  '&:hover': {
                    borderWidth: '1px',
                  },
                  '&.MuiButton-contained': {
                    color: 'white',
                  },
                }}
              >
                PASS
              </Button>
            </Grid>
            <Grid item xs={4}>
              <Button
                fullWidth
                variant={qaOutcome === 'FAILED_PRINTING' ? 'contained' : 'outlined'}
                color="warning"
                onClick={() => setQaOutcome('FAILED_PRINTING')}
                startIcon={<PrintIcon />}
                size="small"
                sx={{
                  borderWidth: '1px',
                  '&:hover': {
                    borderWidth: '1px',
                  },
                }}
              >
                REPRINT
              </Button>
            </Grid>
            <Grid item xs={4}>
              <Button
                fullWidth
                variant={qaOutcome === 'FAILED_DAMAGE' ? 'contained' : 'outlined'}
                color="error"
                onClick={() => setQaOutcome('FAILED_DAMAGE')}
                startIcon={<CancelIcon />}
                size="small"
                sx={{
                  borderWidth: '1px',
                  '&:hover': {
                    borderWidth: '1px',
                  },
                }}
              >
                DEFECTIVE
              </Button>
            </Grid>
          </Grid>

        </Paper>

        {error && (
          <Alert severity="error" sx={{ mt: 2, fontSize: '0.8rem' }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mt: 2, fontSize: '0.8rem' }}>
            {success}
          </Alert>
        )}
      </Box>
    );
  };

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
          <Typography variant="h4" gutterBottom sx={{ fontSize: '1.5rem', fontWeight: 600, mb: 0 }}>
            Card Quality Assurance
          </Typography>
        </Box>

        {/* Tab Navigation */}
        <Box sx={{ 
          bgcolor: 'white', 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          flexShrink: 0 
        }}>
          <Tabs
            value={activeStep}
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 'normal',
                minHeight: '48px',
                minWidth: '120px',
                mx: 0.5,
                borderRadius: '8px 8px 0 0',
                '&.Mui-selected': {
                  bgcolor: 'white',
                  color: 'text.primary',
                },
                '&:hover': {
                  bgcolor: 'grey.200',
                  '&.Mui-selected': {
                    bgcolor: 'white',
                  }
                }
              },
              '& .MuiTabs-indicator': {
                display: 'none'
              }
            }}
          >
            {steps.map((step, index) => (
              <Tab
                key={step.label}
                label={renderTabLabel(step, index)}
                disabled={index > activeStep + 1 || (index === activeStep + 1 && !isStepValid(activeStep))}
              />
            ))}
          </Tabs>
        </Box>

        {/* Content Area */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'auto',
          p: 2,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {activeStep === 0 && renderSearchAndSelectStep()}
          {activeStep === 1 && renderQualityReviewStep()}
        </Box>

        {/* Navigation Footer */}
        <Box sx={{ 
          p: 2, 
          bgcolor: 'white', 
          borderTop: '1px solid', 
          borderColor: 'divider',
          flexShrink: 0,
          display: 'flex', 
          justifyContent: 'space-between', 
          gap: 1 
        }}>
          {activeStep > 0 && (
            <Button
              onClick={() => setActiveStep(activeStep - 1)}
              disabled={isProcessing}
              size="small"
              startIcon={<ArrowBackIcon />}
            >
              Back
            </Button>
          )}
          
          <Box sx={{ flexGrow: 1 }} />

          {activeStep < steps.length - 1 && (
            <Button
              variant="contained"
              onClick={() => setActiveStep(activeStep + 1)}
              disabled={!isStepValid(activeStep) || isProcessing}
              size="small"
              endIcon={<ArrowForwardIcon />}
            >
              {activeStep === 0 ? 'Proceed to Review' : 'Next'}
            </Button>
          )}

          {activeStep === 1 && (
            <Button
              variant="contained"
              color={qaOutcome === 'PASSED' ? 'success' : qaOutcome === 'FAILED_PRINTING' ? 'warning' : 'error'}
              onClick={handleProcessQA}
              disabled={isProcessing || !qaOutcome || !isLocationValid()}
              startIcon={isProcessing ? <CircularProgress size={16} /> : <GavelIcon />}
              size="small"
              sx={{
                '&.MuiButton-contained': {
                  color: qaOutcome === 'PASSED' ? 'white' : undefined,
                },
              }}
            >
              {isProcessing ? 'Processing...' : `Confirm ${qaOutcome}`}
            </Button>
          )}
        </Box>
      </Paper>

      {/* Card Preview Dialog */}
      <Dialog
        open={showCardPreview}
        onClose={() => setShowCardPreview(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Card Preview - {selectedJob?.job_number}</DialogTitle>
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
          <Button onClick={() => setShowCardPreview(false)} size="small">Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default QualityAssurancePage; 