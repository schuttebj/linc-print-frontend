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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Checkbox,
  FormControlLabel,
  Divider,
  Avatar,
  CircularProgress,
  Container,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
  Stack
} from '@mui/material';
import {
  Search as SearchIcon,
  Print as PrintIcon,
  Person as PersonIcon,
  Badge as BadgeIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  DocumentScanner as DocumentScannerIcon,
  Assignment as AssignmentIcon,
  Preview as PreviewIcon,
  LocationOn as LocationOnIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { API_ENDPOINTS } from '../../config/api';

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

interface License {
  id: string;
  category: string;
  status: string;
  issue_date: string;
  expiry_date?: string;
  restrictions?: any;
  medical_restrictions?: string[];
  issuing_location_id: string;
}

interface Application {
  id: string;
  application_number: string;
  application_type: string;
  status: string;
  application_date: string;
  approval_date?: string;
}

interface PrintLocation {
  id: string;
  name: string;
  code: string;
  province_code: string;
}

interface SearchResult {
  person: PersonData;
  card_eligible_licenses: License[];
  learners_permits: License[];
  approved_applications: Application[];
  print_eligibility: {
    can_order_card: boolean;
    issues: string[];
    total_licenses: number;
    card_eligible_count: number;
    learners_permit_count: number;
  };
  accessible_print_locations: PrintLocation[];
}

const CardOrderingByIdPage: React.FC = () => {
  const { user } = useAuth();
  
  // Modern step navigation
  const [activeStep, setActiveStep] = useState(0);
  
  // Search state
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Document preview state
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [documentPrinted, setDocumentPrinted] = useState(false);
  
  // Order confirmation state
  const [selectedApplication, setSelectedApplication] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any>(null);

  // Steps configuration
  const steps = [
    {
      label: 'Search Person',
      icon: <PersonIcon />
    },
    {
      label: 'Select Applications',
      icon: <AssignmentIcon />
    },
    {
      label: 'Review & Print',
      icon: <DocumentScannerIcon />
    }
  ];

  // Helper function to get restriction display names
  const getRestrictionDisplayName = (code: string): string => {
    // Driver restrictions mapping
    const driverRestrictionMap: Record<string, string> = {
      '00': 'None',
      '01': 'Corrective Lenses Required',
      '02': 'Artificial Limb/Prosthetics'
    };
    
    // Vehicle restrictions mapping
    const vehicleRestrictionMap: Record<string, string> = {
      '00': 'None',
      '01': 'Automatic Transmission Only',
      '02': 'Electric Powered Vehicles Only',
      '03': 'Vehicles Adapted for Physical Disabilities',
      '04': 'Tractor Vehicles Only',
      '05': 'Industrial/Agriculture Vehicles Only'
    };
    
    return driverRestrictionMap[code] || vehicleRestrictionMap[code] || `Restriction ${code}`;
  };

  // Render restrictions as chips
  const renderRestrictionsChips = (restrictions: any) => {
    if (!restrictions || (typeof restrictions === 'object' && Object.keys(restrictions).length === 0)) {
      return (
        <Chip 
          label="00 - None" 
          size="small" 
          color="success" 
          sx={{ fontSize: '0.65rem', height: '20px' }}
        />
      );
    }

    // Handle both object and array formats
    const chips: React.ReactNode[] = [];
    
    if (restrictions.driver_restrictions && Array.isArray(restrictions.driver_restrictions)) {
      restrictions.driver_restrictions.forEach((code: string) => {
        chips.push(
          <Chip 
            key={`driver-${code}`}
            label={`Driver: ${code} - ${getRestrictionDisplayName(code)}`} 
            size="small" 
            color="primary" 
            sx={{ fontSize: '0.65rem', height: '20px', mr: 0.5, mb: 0.5 }}
          />
        );
      });
    }
    
    if (restrictions.vehicle_restrictions && Array.isArray(restrictions.vehicle_restrictions)) {
      restrictions.vehicle_restrictions.forEach((code: string) => {
        chips.push(
          <Chip 
            key={`vehicle-${code}`}
            label={`Vehicle: ${code} - ${getRestrictionDisplayName(code)}`} 
            size="small" 
            color="secondary" 
            sx={{ fontSize: '0.65rem', height: '20px', mr: 0.5, mb: 0.5 }}
          />
        );
      });
    }
    
    return chips.length > 0 ? chips : (
      <Chip 
        label="00 - None" 
        size="small" 
        color="success" 
        sx={{ fontSize: '0.65rem', height: '20px' }}
      />
    );
  };

  // Step validation
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Search Person
        return !!searchResult && searchResult.print_eligibility.can_order_card;
      case 1: // Select Applications
        return !!selectedApplication && !!selectedLocation;
      case 2: // Review & Print
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
      const token = localStorage.getItem('access_token');
      const response = await fetch(`https://linc-print-backend.onrender.com/api/v1/printing/card-ordering/search/${searchId.trim()}`, {
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
      
      // Auto-select first application and user's location if available
      if (data.approved_applications.length > 0) {
        setSelectedApplication(data.approved_applications[0].id);
      }
      if (user?.primary_location_id && data.accessible_print_locations.some(loc => loc.id === user.primary_location_id)) {
        setSelectedLocation(user.primary_location_id);
      } else if (data.accessible_print_locations.length === 1) {
        setSelectedLocation(data.accessible_print_locations[0].id);
      }

      // Auto-advance to next step if eligible for card ordering
      if (data.print_eligibility.can_order_card) {
        setActiveStep(1);
      }

    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const createPrintJob = async () => {
    if (!searchResult || !selectedApplication || !selectedLocation) {
      setError('Please select an application and print location');
      return;
    }

    if (!signatureConfirmed) {
      setError('Please confirm signature verification');
      return;
    }

    setOrdering(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      
      // TODO: Future enhancement - support multiple applications in a single card order
      // This should be updated to handle selectedApplications[] instead of single selectedApplication
      // and update the status of all applications to "SENT_TO_PRINTER" or appropriate enum value
      
      const response = await fetch('https://linc-print-backend.onrender.com/api/v1/printing/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          application_id: selectedApplication,
          location_id: selectedLocation,
          card_template: 'MADAGASCAR_STANDARD'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Print job creation failed');
      }

      const data = await response.json();
      setOrderSuccess(data);

      // Note: The backend should automatically update application status to "SENT_TO_PRINTER"
      // when the print job is successfully created

    } catch (error: any) {
      setError(error.message);
    } finally {
      setOrdering(false);
    }
  };

  // Generate and print the A4 verification document using the new API
  const handlePrintVerificationDocument = async () => {
    if (!searchResult) return;
    
    try {
      // Prepare data for the license verification template using actual application data
      const verificationData = {
        government_header: '🇲🇬 REPUBLIC OF MADAGASCAR',
        department_header: 'MINISTRY OF TRANSPORT',
        office_header: 'License Information Verification Document',
        document_title: 'LICENSE VERIFICATION DOCUMENT',
        person_name: `${searchResult.person.first_name} ${searchResult.person.last_name}`,
        person_id: searchResult.person.id_number,
        birth_date: searchResult.person.birth_date ? new Date(searchResult.person.birth_date).toLocaleDateString() : 'N/A',
        nationality: searchResult.person.nationality_code === 'MG' ? 'MALAGASY' : (searchResult.person.nationality_code || 'N/A'),
        verification_date: new Date().toLocaleDateString(),
        card_eligible_licenses: searchResult.card_eligible_licenses.map(license => ({
          category: license.category,
          status: license.status,
          issue_date: new Date(license.issue_date).toLocaleDateString(),
          restrictions: license.restrictions || {}
        })),
        learners_permits: searchResult.learners_permits.map(permit => ({
          category: permit.category,
          status: permit.status,
          issue_date: new Date(permit.issue_date).toLocaleDateString(),
          expiry_date: permit.expiry_date ? new Date(permit.expiry_date).toLocaleDateString() : 'No expiry'
        })),
        // Add application-specific data
        applications: searchResult.approved_applications.map(app => ({
          id: app.id,
          application_number: app.application_number,
          application_type: app.application_type,
          status: app.status,
          submitted_date: new Date(app.application_date).toLocaleDateString()
        })),
        footer: 'Ministry of Transport - Republic of Madagascar',
        contact_info: 'For assistance: +261 20 22 123 45 | transport@gov.mg'
      };

      // Generate PDF using the new document generation API with actual data
      const token = localStorage.getItem('access_token');
      const response = await fetch(API_ENDPOINTS.documents.generatePdf('license_verification'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verificationData)
      });

      if (!response.ok) {
        throw new Error(`Failed to generate verification document: ${response.status}`);
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
      console.error('Failed to generate verification document:', err);
      setError('Failed to generate verification document for printing');
    }
  };

  const resetForm = () => {
    setActiveStep(0);
    setSearchId('');
    setSearchResult(null);
    setSelectedApplication('');
    setSelectedLocation('');
    setDocumentPrinted(false);
    setSignatureConfirmed(false);
    setShowDocumentPreview(false);
    setOrderSuccess(null);
    setError(null);
  };

  // Render step content
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderSearchStep();
      case 1:
        return renderApplicationSelectionStep();
      case 2:
        return renderReviewAndPrintStep();
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
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="ID Number"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Enter person's ID number..."
              onKeyPress={(e) => e.key === 'Enter' && searchPerson()}
              disabled={loading}
              size="small"
              error={!!error && !searchId.trim()}
              sx={{ 
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
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="contained"
              startIcon={loading ? <CircularProgress size={16} /> : <SearchIcon />}
              onClick={searchPerson}
              disabled={loading}
              size="small"
            >
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="outlined"
              onClick={resetForm}
              disabled={loading}
              size="small"
            >
              Clear
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Search Success/Error Display */}
      {searchResult && (
        <Alert severity="success" sx={{ mt: 2, py: 1 }}>
          <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
            Person Found: {searchResult.person.first_name} {searchResult.person.last_name}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
            {searchResult.print_eligibility.can_order_card ? 
              `Ready for card ordering (${searchResult.approved_applications.length} applications eligible)` :
              `Cannot order card: ${searchResult.print_eligibility.issues.join(', ')}`
            }
          </Typography>
        </Alert>
      )}
    </Box>
  );

  // Step 2: Review & Print (formerly Document Preview)
  const renderReviewAndPrintStep = () => (
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
          Review & Print Verification Document
        </Typography>


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
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Date of Birth</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                    {searchResult.person.birth_date ? new Date(searchResult.person.birth_date).toLocaleDateString() : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Nationality</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                    {searchResult.person.nationality_code === 'MG' ? 'MALAGASY' : (searchResult.person.nationality_code || 'N/A')}
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            {/* Card Eligible Licenses */}
            <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
              Card Eligible Licenses
            </Typography>
            <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {searchResult.card_eligible_licenses.map(license => (
                      <Chip 
                        key={license.id}
                        label={`${license.category} - ${license.status}`} 
                        size="small" 
                        color="primary" 
                        sx={{ fontSize: '0.7rem', height: '20px' }}
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {/* Learner's Permits */}
            {searchResult.learners_permits.length > 0 && (
              <>
                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                  Learner's Permits (Not on Card)
                </Typography>
                <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                  <Grid container spacing={1}>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {searchResult.learners_permits.map(license => (
                          <Chip 
                            key={license.id}
                            label={`${license.category} - ${license.status}`} 
                            size="small" 
                            color="secondary" 
                            sx={{ fontSize: '0.7rem', height: '20px' }}
                          />
                        ))}
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </>
            )}

            {/* Document Processing */}
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
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Verification Date</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                    {new Date().toLocaleDateString()}
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
                  onClick={handlePrintVerificationDocument}
                  size="small"
                >
                  {documentPrinted ? 'Print Document Again' : 'Print Verification Document'}
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
                        I confirm that the license holder has signed the printed verification document
                      </Typography>
                    }
                  />
                </Box>
              </Box>
            </Box>
          </>
        )}
      </Box>
    </Paper>
  );

  // Step 1: Application Selection (formerly Order Card)
  const renderApplicationSelectionStep = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Location Selection - Admin Only */}
      {!user?.primary_location_id && searchResult && (
        <Card 
          elevation={0}
          sx={{ 
            bgcolor: 'white',
            boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
            borderRadius: 2
          }}
        >
          <CardHeader 
            sx={{ p: 1.5 }}
            title={
              <Box display="flex" alignItems="center" gap={1}>
                <LocationOnIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                  Print Location
                </Typography>
              </Box>
            }
          />
          <CardContent sx={{ p: 1.5, pt: 0 }}>
            {searchResult.accessible_print_locations.length > 1 ? (
              <FormControl 
                fullWidth 
                required 
                size="small" 
                error={!!error && !selectedLocation}
              >
                <InputLabel>Select Print Location</InputLabel>
                <Select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  label="Select Print Location"
                  size="small"
                >
                  {searchResult.accessible_print_locations.map((location) => (
                    <MenuItem key={location.id} value={location.id}>
                      {location.name} ({location.code})
                    </MenuItem>
                  ))}
                </Select>
                {!!error && !selectedLocation && (
                  <FormHelperText>Please select a print location</FormHelperText>
                )}
                {!selectedLocation && (
                  <FormHelperText sx={{ color: '#ff9800' }}>This field is required</FormHelperText>
                )}
              </FormControl>
            ) : (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Assigned Location</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                  {searchResult.accessible_print_locations[0]?.name || 'No location assigned'}
                </Typography>
                {searchResult.accessible_print_locations[0] && (
                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                    {searchResult.accessible_print_locations[0].code} - {searchResult.accessible_print_locations[0].province_code}
                  </Typography>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Application Selection */}
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
          Applications for Card Order
        </Typography>

        <Alert severity="info" sx={{ mb: 1.5, py: 0.5 }}>
          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
            All approved applications below will be automatically included in this card order. Multiple licenses can be combined on a single card.
          </Typography>
        </Alert>

        {searchResult && (
          <>
            {/* Applications Ready for Printing */}
            <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
              Available Applications ({searchResult.approved_applications.length})
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
                      }}>Status</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        bgcolor: '#f8f9fa',
                        py: 1, 
                        px: 2
                      }}>Submitted</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {searchResult.approved_applications.map((app) => (
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
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {new Date(app.application_date).toLocaleDateString()}
                          </Typography>
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

      {/* Order Success */}
      {orderSuccess && (
        <Paper 
          elevation={0}
          sx={{ 
            bgcolor: 'white',
            boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
            borderRadius: 2,
            p: 2
          }}
        >
          <Alert severity="success">
            <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem' }}>
              Print Job Created Successfully!
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
              Job Number: <strong>{orderSuccess.job_number}</strong>
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
              Card Number: <strong>{orderSuccess.card_number}</strong>
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" onClick={resetForm} size="small">
                Order Another Card
              </Button>
            </Box>
          </Alert>
        </Paper>
      )}
    </Box>
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
              onClick={resetForm}
              disabled={loading || ordering}
              color="secondary"
              size="small"
            >
              Cancel
            </Button>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              {activeStep > 0 && (
                <Button
                  disabled={loading || ordering}
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
                  disabled={!isStepValid(activeStep) || loading || ordering}
                  endIcon={<ArrowForwardIcon />}
                  size="small"
                >
                  {activeStep === 0 ? 'Select Applications' : 'Review & Print'}
                </Button>
              )}
              
              {activeStep === steps.length - 1 && (
                <Button
                  variant="contained"
                  onClick={createPrintJob}
                  disabled={!isStepValid(activeStep) || loading || ordering}
                  startIcon={ordering ? <CircularProgress size={16} /> : undefined}
                  size="small"
                >
                  {ordering ? 'Creating Order...' : 'Create Card Order'}
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default CardOrderingByIdPage; 