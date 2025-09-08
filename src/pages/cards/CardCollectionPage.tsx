import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Container,
  Tabs,
  Tab,
  Stack
} from '@mui/material';
import {
  Search as SearchIcon,
  Print as PrintIcon,
  Person as PersonIcon,
  Badge as BadgeIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon,
  DocumentScanner as DocumentScannerIcon,
  CollectionsBookmark as CollectionIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { API_ENDPOINTS, API_BASE_URL, getAuthToken } from '../../config/api';

// Types
interface PersonData {
  id: string;
  first_name: string;
  last_name: string;
  id_number: string;
  birth_date?: string;
  nationality_code?: string;
  photo_path?: string;
  signature_path?: string;
  address?: string;
  phone_number?: string;
  email?: string;
}

interface Application {
  id: string;
  application_number: string;
  application_type: string;
  status: string;
  application_date: string;
  approval_date?: string;
  print_job_number?: string;
  card_number?: string;
}

interface CollectionSearchResult {
  person: PersonData;
  ready_for_collection: Application[];
  collection_eligibility: {
    can_collect: boolean;
    issues: string[];
    total_applications: number;
  };
}

const CardCollectionPage: React.FC = () => {
  const { user } = useAuth();
  
  // Modern step navigation
  const [activeStep, setActiveStep] = useState(0);
  
  // Search state
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState<CollectionSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Document and collection state
  const [documentPrinted, setDocumentPrinted] = useState(false);
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [collectionSuccess, setCollectionSuccess] = useState<any>(null);

  // Steps configuration
  const steps = [
    {
      label: 'Search Person',
      icon: <PersonIcon />
    },
    {
      label: 'Review Applications',
      icon: <AssignmentIcon />
    },
    {
      label: 'Print & Collect',
      icon: <DocumentScannerIcon />
    }
  ];

  // Step validation
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Search Person
        return !!searchResult && searchResult.collection_eligibility.can_collect;
      case 1: // Review Applications
        return !!searchResult && searchResult.ready_for_collection.length > 0;
      case 2: // Print & Collect
        return documentPrinted && signatureConfirmed;
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

  const searchPerson = async () => {
    if (!searchId.trim()) {
      setError('Please enter an ID number');
      return;
    }

    setLoading(true);
    setError(null);
    setSearchResult(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/v1/printing/collection/search/${searchId.trim()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Search failed');
      }

      const data = await response.json();
      setSearchResult(data);

      // Auto-advance to next step if eligible for collection
      if (data.collection_eligibility.can_collect) {
        setActiveStep(1);
      }

    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const processCollection = async () => {
    if (!searchResult || !signatureConfirmed) {
      setError('Please confirm signature verification');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const token = getAuthToken();
      
      const response = await fetch(`${API_BASE_URL}/api/v1/printing/collection/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          person_id: searchResult.person.id,
          application_ids: searchResult.ready_for_collection.map(app => app.id)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Collection processing failed');
      }

      const data = await response.json();
      setCollectionSuccess(data);

    } catch (error: any) {
      setError(error.message);
    } finally {
      setProcessing(false);
    }
  };

  // Generate and print the collection document
  const handlePrintCollectionDocument = async () => {
    if (!searchResult) return;
    
    try {
      // Prepare data for the collection document template
      const collectionData = {
        government_header: '🇲🇬 REPUBLIC OF MADAGASCAR',
        department_header: 'MINISTRY OF TRANSPORT',
        office_header: 'Driver License Collection Document',
        document_title: 'CARD COLLECTION CONFIRMATION',
        person_name: `${searchResult.person.first_name} ${searchResult.person.last_name}`,
        person_id: searchResult.person.id_number,
        birth_date: searchResult.person.birth_date ? new Date(searchResult.person.birth_date).toLocaleDateString() : 'N/A',
        nationality: searchResult.person.nationality_code === 'MG' ? 'MALAGASY' : (searchResult.person.nationality_code || 'N/A'),
        collection_date: new Date().toLocaleDateString(),
        collection_time: new Date().toLocaleTimeString(),
        applications: searchResult.ready_for_collection.map(app => ({
          application_number: app.application_number,
          application_type: app.application_type,
          card_number: app.card_number || 'N/A',
          print_job_number: app.print_job_number || 'N/A',
          approval_date: app.approval_date ? new Date(app.approval_date).toLocaleDateString() : 'N/A'
        })),
        total_cards: searchResult.ready_for_collection.length,
        collected_by: `${user?.first_name} ${user?.last_name}`,
        collection_location: user?.location_name || 'N/A',
        footer: 'Ministry of Transport - Republic of Madagascar',
        contact_info: 'For assistance: +261 20 22 123 45 | transport@gov.mg',
        signature_lines: {
          collector: 'License Holder Signature',
          officer: 'Issuing Officer Signature'
        }
      };

      // Generate PDF using the document generation API
      const token = getAuthToken();
      const response = await fetch(API_ENDPOINTS.documents.generatePdf('card_collection'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(collectionData)
      });

      if (!response.ok) {
        throw new Error(`Failed to generate collection document: ${response.status}`);
      }

      // Get the PDF blob and open it for printing
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Open print window
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          setTimeout(() => {
            printWindow.print();
            setDocumentPrinted(true);
          }, 500);
        });
      }

      // Clean up URL after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 5000);

    } catch (err: any) {
      console.error('Failed to generate collection document:', err);
      setError('Failed to generate collection document for printing');
    }
  };

  const handleStartNewCollection = () => {
    setActiveStep(0);
    setSearchId('');
    setSearchResult(null);
    setDocumentPrinted(false);
    setSignatureConfirmed(false);
    setCollectionSuccess(null);
    setProcessing(false);
    setLoading(false);
    setError(null);
  };

  // Render step content
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderSearchStep();
      case 1:
        return renderApplicationReviewStep();
      case 2:
        return renderPrintAndCollectStep();
      default:
        return null;
    }
  };

  // Step 1: Search Person
  const renderSearchStep = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
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
          <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
            Search Person by ID Number
          </Typography>
        </Box>
        
        <Box display="flex" gap={2} alignItems="flex-start" mb={2}>
          <TextField
            label="ID Number"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            placeholder="Enter person's ID number..."
            onKeyPress={(e) => e.key === 'Enter' && searchPerson()}
            disabled={loading}
            size="small"
            error={!!error && !searchId.trim()}
            sx={{ 
              flexGrow: 1,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderWidth: '1px',
                  borderColor: !!error && !searchId.trim() ? '#ff9800' : undefined,
                  transition: 'border-color 0.2s ease-in-out',
                },
                '&:hover fieldset': {
                  borderWidth: '1px',
                  borderColor: !!error && !searchId.trim() ? '#f57c00' : undefined,
                },
                '&.Mui-focused fieldset': {
                  borderWidth: '1px',
                  borderColor: !!error && !searchId.trim() ? '#ff9800' : undefined,
                },
              },
            }}
          />
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} /> : <SearchIcon />}
            onClick={searchPerson}
            disabled={loading || !searchId.trim()}
            size="small"
            sx={{ flexShrink: 0 }}
          >
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </Box>
      </Paper>

      {/* Search Success/Error Display */}
      {searchResult && (
        <Alert severity="success" sx={{ mt: 2, py: 1 }}>
          <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
            Person Found: {searchResult.person.first_name} {searchResult.person.last_name}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
            {searchResult.collection_eligibility.can_collect ? 
              `Ready for collection (${searchResult.ready_for_collection.length} applications)` :
              `Cannot collect: ${searchResult.collection_eligibility.issues.join(', ')}`
            }
          </Typography>
        </Alert>
      )}
    </Box>
  );

  // Step 2: Application Review
  const renderApplicationReviewStep = () => (
    <Paper 
      elevation={0}
      sx={{ 
        bgcolor: 'white',
        boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
        borderRadius: 2,
        p: 2
      }}
    >
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, fontSize: '1rem', mb: 1 }}>
        Applications Ready for Collection
      </Typography>

      <Alert severity="info" sx={{ mb: 1.5, py: 0.5 }}>
        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
          The following applications have completed processing and are ready for card collection.
        </Typography>
      </Alert>

      {searchResult && (
        <>
          {/* Person Summary */}
          <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
            <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
              License Holder Information
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Full Name</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                  {searchResult.person.first_name} {searchResult.person.last_name}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>ID Number</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                  {searchResult.person.id_number}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          {/* Applications Table */}
          <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
            Ready for Collection ({searchResult.ready_for_collection.length})
          </Typography>
          
          <Paper 
            elevation={0}
            sx={{ 
              bgcolor: '#fafafa',
              borderRadius: 1,
              overflow: 'hidden',
              mb: 1.5
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
                    }}>Application #</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      fontSize: '0.875rem',
                      bgcolor: '#f8f9fa',
                      py: 1, 
                      px: 2
                    }}>Type</TableCell>
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
                  {searchResult.ready_for_collection.map((app) => (
                    <TableRow 
                      key={app.id} 
                      hover
                    >
                      <TableCell sx={{ py: 1, px: 2 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {app.application_number}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1, px: 2 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {app.application_type.replace('_', ' ')}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1, px: 2 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {app.card_number || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1, px: 2 }}>
                        <Chip 
                          label={app.status} 
                          size="small" 
                          color="success" 
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
        </>
      )}
    </Paper>
  );

  // Step 3: Print & Collect
  const renderPrintAndCollectStep = () => (
    <Paper 
      elevation={0}
      sx={{ 
        bgcolor: 'white',
        boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
        borderRadius: 2
      }}
    >
      <Box sx={{ p: 1.5 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, fontSize: '1rem', mb: 1 }}>
          Print Collection Document & Confirm Signature
        </Typography>

        {searchResult && (
          <>
            {/* Collection Summary */}
            <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                Collection Summary
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>License Holder</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                    {searchResult.person.first_name} {searchResult.person.last_name}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Applications</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                    {searchResult.ready_for_collection.length} Ready for Collection
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Collection Date</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                    {new Date().toLocaleDateString()}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            {/* Document Processing Status */}
            <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
              Document Processing
            </Typography>
            <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
              <Grid container spacing={1}>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Document Status</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                    <Chip
                      label={documentPrinted ? 'Printed' : 'Pending Print'}
                      size="small"
                      color={documentPrinted ? 'success' : 'warning'} 
                      sx={{ fontSize: '0.7rem', height: '20px' }}
                    />
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Signature Status</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                    <Chip
                      label={signatureConfirmed ? 'Confirmed' : 'Required'}
                      size="small"
                      color={signatureConfirmed ? 'success' : 'error'} 
                      sx={{ fontSize: '0.7rem', height: '20px' }}
                    />
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Processing Officer</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                    {user?.first_name} {user?.last_name}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            {/* Print & Signature Confirmation */}
            <Box sx={{ mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<PrintIcon />}
                  onClick={handlePrintCollectionDocument}
                  size="small"
                >
                  {documentPrinted ? 'Print Document Again' : 'Print Collection Document'}
                </Button>
                
                <Box sx={{ flex: 1, pt: 0, pb: 0, pl: 1, pr: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={signatureConfirmed}
                        onChange={(e) => setSignatureConfirmed(e.target.checked)}
                        disabled={!documentPrinted}
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        I confirm that the license holder has signed the collection document and received their card(s)
                      </Typography>
                    }
                  />
                </Box>
              </Box>
            </Box>

            {/* Collection Success */}
            {collectionSuccess && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem' }}>
                  Collection Completed Successfully!
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  {collectionSuccess.completed_applications} application(s) marked as collected.
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Button 
                    variant="contained" 
                    onClick={handleStartNewCollection} 
                    size="small"
                    sx={{
                      color: 'white',
                      '&:hover': {
                        color: 'white',
                      }
                    }}
                  >
                    New Collection
                  </Button>
                </Box>
              </Alert>
            )}
          </>
        )}
      </Box>
    </Paper>
  );

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
        {/* Tabs Navigation */}
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
              px: 2,
              '& .MuiTab-root': {
                minHeight: 48,
                textTransform: 'none',
                fontSize: '0.875rem',
                color: 'text.secondary',
                bgcolor: 'grey.100',
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
          overflow: activeStep === 0 ? 'hidden' : 'auto',
          p: activeStep === 0 ? 0 : 2,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                {error}
              </Typography>
            </Alert>
          )}

          {renderStepContent(activeStep)}
        </Box>

        {/* Navigation Footer */}
        <Box sx={{ p: 2, bgcolor: 'white', borderTop: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              onClick={handleStartNewCollection}
              disabled={loading || processing}
              color="secondary"
              size="small"
            >
              Cancel
            </Button>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              {activeStep > 0 && (
                <Button
                  disabled={loading || processing}
                  onClick={() => setActiveStep(activeStep - 1)}
                  startIcon={<ArrowBackIcon />}
                  size="small"
                >
                  Back
                </Button>
              )}
              
              {activeStep < steps.length - 1 && (
                <Button
                  variant="contained"
                  onClick={() => setActiveStep(activeStep + 1)}
                  disabled={!isStepValid(activeStep) || loading || processing}
                  endIcon={<ArrowForwardIcon />}
                  size="small"
                >
                  {activeStep === 0 ? 'Review Applications' : 'Print & Collect'}
                </Button>
              )}
              
              {activeStep === steps.length - 1 && !collectionSuccess && (
                <Button
                  variant="contained"
                  onClick={processCollection}
                  disabled={!isStepValid(activeStep) || loading || processing}
                  startIcon={processing ? <CircularProgress size={16} /> : <CollectionIcon />}
                  size="small"
                  sx={{
                    color: 'white',
                    '&:hover': {
                      color: 'white',
                    }
                  }}
                >
                  {processing ? 'Processing...' : 'Complete Collection'}
                </Button>
              )}
              
              {collectionSuccess && (
                <Button
                  variant="contained"
                  onClick={handleStartNewCollection}
                  size="small"
                  sx={{
                    color: 'white',
                    '&:hover': {
                      color: 'white',
                    }
                  }}
                >
                  New Collection
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default CardCollectionPage;
