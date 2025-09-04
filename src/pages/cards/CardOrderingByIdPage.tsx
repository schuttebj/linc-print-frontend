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
  Preview as PreviewIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

// Types
interface PersonData {
  id: string;
  first_name: string;
  last_name: string;
  id_number: string;
  birth_date?: string;
  nationality?: string;
  photo_path?: string;
  signature_path?: string;
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
      label: 'Document Preview',
      icon: <DocumentScannerIcon />
    },
    {
      label: 'Order Card',
      icon: <AssignmentIcon />
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
      case 1: // Document Preview
        return documentPrinted && signatureConfirmed;
      case 2: // Order Card
        return !!selectedApplication && !!selectedLocation;
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

    } catch (error: any) {
      setError(error.message);
    } finally {
      setOrdering(false);
    }
  };

  // Generate and print the A4 verification document
  const handlePrintVerificationDocument = async () => {
    if (!searchResult) return;
    
    try {
      // Create the verification document content
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>License Verification Document - ${searchResult.person.id_number}</title>
          <meta charset="utf-8">
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            
            body {
              font-family: Arial, sans-serif;
              font-size: 11pt;
              color: black;
              background: white;
              margin: 0;
              padding: 0;
            }
            
            .document-container {
              width: 100%;
              max-width: 170mm;
              margin: 0 auto;
            }
            
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            
            .header h1 {
              font-size: 18pt;
              font-weight: bold;
              margin: 5px 0;
            }
            
            .header h2 {
              font-size: 16pt;
              margin: 5px 0;
            }
            
            .document-title {
              font-size: 16pt;
              font-weight: bold;
              border: 2px solid black;
              padding: 8px;
              background: #f5f5f5;
              margin: 20px 0;
              text-align: center;
            }
            
            .person-info {
              border: 1px solid black;
              padding: 15px;
              background: #f9f9f9;
              margin-bottom: 20px;
            }
            
            .person-info h4 {
              font-size: 14pt;
              margin: 0 0 10px 0;
            }
            
            .license-table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid black;
              margin-bottom: 20px;
            }
            
            .license-table th,
            .license-table td {
              border: 1px solid black;
              padding: 10px 8px;
              text-align: left;
            }
            
            .license-table th {
              background: #e0e0e0;
              font-weight: bold;
              font-size: 11pt;
            }
            
            .section-header {
              background: #f0f0f0;
              font-weight: bold;
              font-size: 12pt;
              padding: 10px;
              border: 1px solid black;
              margin-top: 20px;
            }
            
            .signature-section {
              border: 1px solid black;
              padding: 20px;
              margin-top: 30px;
              background: #f9f9f9;
            }
            
            .signature-line {
              border-bottom: 1px solid black;
              margin: 20px 0;
              height: 40px;
            }
            
            .footer {
              text-align: center;
              border-top: 1px solid #ccc;
              padding-top: 15px;
              font-size: 10pt;
              margin-top: 30px;
            }
            
            .chip {
              display: inline-block;
              background: #e3f2fd;
              color: #1565c0;
              border: 1px solid #90caf9;
              border-radius: 4px;
              padding: 2px 6px;
              font-size: 9pt;
              margin: 2px;
            }
            
            .chip-secondary {
              background: #f3e5f5;
              color: #6a1b9a;
              border-color: #ce93d8;
            }
            
            .chip-success {
              background: #e8f5e8;
              color: #1b5e20;
              border-color: #a6e8ab;
            }
            
            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="document-container">
            <!-- Government Headers -->
            <div class="header">
              <h1>🇲🇬 REPUBLIC OF MADAGASCAR</h1>
              <h2>MINISTRY OF TRANSPORT</h2>
              <h3>License Information Verification Document</h3>
            </div>

            <div class="document-title">
              LICENSE VERIFICATION DOCUMENT
            </div>

            <!-- Person Information -->
            <div class="person-info">
              <h4>License Holder Information</h4>
              <p><strong>Full Name:</strong> ${searchResult.person.first_name} ${searchResult.person.last_name}</p>
              <p><strong>ID Number:</strong> ${searchResult.person.id_number}</p>
              ${searchResult.person.birth_date ? `<p><strong>Date of Birth:</strong> ${new Date(searchResult.person.birth_date).toLocaleDateString()}</p>` : ''}
              ${searchResult.person.nationality ? `<p><strong>Nationality:</strong> ${searchResult.person.nationality}</p>` : ''}
              <p><strong>Verification Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>

            <!-- Card Eligible Licenses Section -->
            <div class="section-header">
              LICENSES TO BE PRINTED ON CARD (${searchResult.card_eligible_licenses.length})
            </div>
            
            <table class="license-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Issue Date</th>
                  <th>Restrictions</th>
                </tr>
              </thead>
              <tbody>
                ${searchResult.card_eligible_licenses.map(license => `
                  <tr>
                    <td><span class="chip">${license.category}</span></td>
                    <td><span class="chip-success">${license.status}</span></td>
                    <td>${new Date(license.issue_date).toLocaleDateString()}</td>
                    <td>
                      ${license.restrictions && Object.keys(license.restrictions).length > 0 
                        ? Object.entries(license.restrictions).map(([type, codes]) => 
                            Array.isArray(codes) 
                              ? codes.map(code => `<span class="chip ${type === 'driver_restrictions' ? '' : 'chip-secondary'}">${type.replace('_', ' ')}: ${code} - ${getRestrictionDisplayName(code)}</span>`).join(' ')
                              : ''
                          ).join(' ')
                        : '<span class="chip-success">00 - None</span>'
                      }
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            ${searchResult.learners_permits.length > 0 ? `
              <!-- Learners Permits Section -->
              <div class="section-header">
                LEARNER'S PERMITS (NOT PRINTED ON CARD) (${searchResult.learners_permits.length})
              </div>
              
              <table class="license-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Issue Date</th>
                    <th>Expiry Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${searchResult.learners_permits.map(license => `
                    <tr>
                      <td><span class="chip-secondary">${license.category}</span></td>
                      <td><span class="chip-success">${license.status}</span></td>
                      <td>${new Date(license.issue_date).toLocaleDateString()}</td>
                      <td>${license.expiry_date ? new Date(license.expiry_date).toLocaleDateString() : 'No expiry'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}

            <!-- Signature Section -->
            <div class="signature-section">
              <h4>License Holder Confirmation</h4>
              <p>I confirm that all the information above is accurate and I authorize the printing of my driver's license card with the categories and restrictions listed above.</p>
              
              <p style="margin-top: 30px;"><strong>License Holder Signature:</strong></p>
              <div class="signature-line"></div>
              
              <p style="margin-top: 20px;"><strong>Date:</strong> ____________________</p>
              
              <p style="margin-top: 30px;"><strong>Authorized Officer:</strong></p>
              <div class="signature-line"></div>
              
              <p style="margin-top: 20px;"><strong>Officer Name & Badge:</strong> ____________________</p>
            </div>

            <!-- Footer -->
            <div class="footer">
              Ministry of Transport - Republic of Madagascar<br>
              License Information System<br>
              This document must be signed before card printing authorization
            </div>
          </div>
        </body>
        </html>
      `;
      
      // Open print window
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Wait for content to load, then print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
            setDocumentPrinted(true);
          }, 500);
        };
      }
    } catch (err: any) {
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
        return renderDocumentPreviewStep();
      case 2:
        return renderOrderStep();
      default:
        return null;
    }
  };

  // Step 1: Search Person
  const renderSearchStep = () => (
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

      {/* Search Results */}
      {searchResult && (
        <>
          {/* Person Information */}
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
              <BadgeIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                Person Information
              </Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ mr: 2 }}>
                    <PersonIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontSize: '1rem' }}>
                      {searchResult.person.first_name} {searchResult.person.last_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      ID: {searchResult.person.id_number}
                    </Typography>
                  </Box>
                </Box>
                
                <Grid container spacing={1}>
                  {searchResult.person.birth_date && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        <strong>Birth Date:</strong> {new Date(searchResult.person.birth_date).toLocaleDateString()}
                      </Typography>
                    </Grid>
                  )}
                  {searchResult.person.nationality && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        <strong>Nationality:</strong> {searchResult.person.nationality}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Grid>
              
              <Grid item xs={12} md={4}>
                {searchResult.print_eligibility.can_order_card ? (
                  <Alert severity="success" sx={{ py: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CheckCircleIcon sx={{ mr: 1, fontSize: '1rem' }} />
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        Ready for card ordering
                      </Typography>
                    </Box>
                  </Alert>
                ) : (
                  <Alert severity="error" sx={{ py: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <WarningIcon sx={{ mr: 1, fontSize: '1rem' }} />
                      <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        Cannot order card
                      </Typography>
                    </Box>
                    <Box component="ul" sx={{ m: 0, pl: 2, '& li': { fontSize: '0.75rem' } }}>
                      {searchResult.print_eligibility.issues.map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </Box>
                  </Alert>
                )}
              </Grid>
            </Grid>
          </Paper>

          {/* Card Eligible Licenses */}
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
              Card Eligible Licenses ({searchResult.card_eligible_licenses.length})
            </Typography>
            
            {searchResult.card_eligible_licenses.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ py: 1, px: 2, fontSize: '0.8rem', fontWeight: 600 }}>Category</TableCell>
                      <TableCell sx={{ py: 1, px: 2, fontSize: '0.8rem', fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ py: 1, px: 2, fontSize: '0.8rem', fontWeight: 600 }}>Issue Date</TableCell>
                      <TableCell sx={{ py: 1, px: 2, fontSize: '0.8rem', fontWeight: 600 }}>Restrictions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {searchResult.card_eligible_licenses.map((license) => (
                      <TableRow key={license.id} hover>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Chip 
                            label={license.category} 
                            size="small" 
                            color="primary" 
                            sx={{ fontSize: '0.65rem', height: '20px' }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Chip 
                            label={license.status} 
                            size="small" 
                            color="success" 
                            sx={{ fontSize: '0.65rem', height: '20px' }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {new Date(license.issue_date).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {renderRestrictionsChips(license.restrictions)}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="warning" sx={{ py: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  No card-eligible licenses found
                </Typography>
              </Alert>
            )}
          </Paper>

          {/* Learners Permits */}
          {searchResult.learners_permits.length > 0 && (
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
                Learners Permits ({searchResult.learners_permits.length})
                <Chip 
                  label="Not printed on cards" 
                  size="small" 
                  color="secondary" 
                  variant="outlined"
                  sx={{ ml: 1, fontSize: '0.65rem', height: '20px' }}
                />
              </Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ py: 1, px: 2, fontSize: '0.8rem', fontWeight: 600 }}>Category</TableCell>
                      <TableCell sx={{ py: 1, px: 2, fontSize: '0.8rem', fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ py: 1, px: 2, fontSize: '0.8rem', fontWeight: 600 }}>Issue Date</TableCell>
                      <TableCell sx={{ py: 1, px: 2, fontSize: '0.8rem', fontWeight: 600 }}>Expiry Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {searchResult.learners_permits.map((license) => (
                      <TableRow key={license.id} hover>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Chip 
                            label={license.category} 
                            size="small" 
                            color="secondary" 
                            sx={{ fontSize: '0.65rem', height: '20px' }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Chip 
                            label={license.status} 
                            size="small" 
                            color="success" 
                            sx={{ fontSize: '0.65rem', height: '20px' }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {new Date(license.issue_date).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {license.expiry_date 
                              ? new Date(license.expiry_date).toLocaleDateString()
                              : 'No expiry'
                            }
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </>
      )}
    </Box>
  );

  // Step 2: Document Preview
  const renderDocumentPreviewStep = () => (
    <Paper 
      elevation={0}
      sx={{ 
        bgcolor: 'white',
        boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
        borderRadius: 2,
        p: 2
      }}
    >
      <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
        License Verification Document
      </Typography>

      <Alert severity="info" sx={{ mb: 2, py: 1 }}>
        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
          Print the verification document for the license holder to review and sign before proceeding with card ordering.
        </Typography>
      </Alert>

      {searchResult && (
        <>
          {/* Document Preview */}
          <Paper sx={{ p: 3, bgcolor: 'grey.50', border: '2px dashed grey.300', mb: 3 }}>
            <Typography variant="h5" gutterBottom align="center" sx={{ fontSize: '1.2rem' }}>
              🇲🇬 REPUBLIC OF MADAGASCAR
            </Typography>
            <Typography variant="h6" gutterBottom align="center" sx={{ fontSize: '1rem' }}>
              LICENSE VERIFICATION DOCUMENT
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle1" gutterBottom sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
              License Holder: {searchResult.person.first_name} {searchResult.person.last_name}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
              ID: {searchResult.person.id_number}
            </Typography>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Card Eligible Licenses ({searchResult.card_eligible_licenses.length}):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {searchResult.card_eligible_licenses.map(license => (
                  <Chip 
                    key={license.id}
                    label={`${license.category} - ${license.status}`} 
                    size="small" 
                    color="primary" 
                    sx={{ fontSize: '0.65rem', height: '20px' }}
                  />
                ))}
              </Box>
            </Box>

            {searchResult.learners_permits.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Learner's Permits (Not on card) ({searchResult.learners_permits.length}):
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                  {searchResult.learners_permits.map(license => (
                    <Chip 
                      key={license.id}
                      label={`${license.category} - ${license.status}`} 
                      size="small" 
                      color="secondary" 
                      sx={{ fontSize: '0.65rem', height: '20px' }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            <Box sx={{ mt: 3, p: 2, border: '1px solid grey.400', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Signature Required:
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.75rem', mt: 1 }}>
                ☐ License Holder Signature __________________ Date: __________
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.75rem', mt: 1 }}>
                ☐ Authorized Officer __________________ Badge: __________
              </Typography>
            </Box>
          </Paper>

          {/* Print & Signature Confirmation */}
          <Box sx={{ mb: 3 }}>
            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              onClick={handlePrintVerificationDocument}
              disabled={documentPrinted}
              sx={{ mb: 2 }}
            >
              {documentPrinted ? 'Document Printed ✓' : 'Print Verification Document'}
            </Button>

            {documentPrinted && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={signatureConfirmed}
                    onChange={(e) => setSignatureConfirmed(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    I confirm that the license holder has signed the printed verification document
                  </Typography>
                }
              />
            )}
          </Box>
        </>
      )}
    </Paper>
  );

  // Step 3: Order Card
  const renderOrderStep = () => (
    <Paper 
      elevation={0}
      sx={{ 
        bgcolor: 'white',
        boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
        borderRadius: 2,
        p: 2
      }}
    >
      <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
        Card Order Configuration
      </Typography>

      {searchResult && (
        <Grid container spacing={3}>
          {/* Application Selection */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Select Application</InputLabel>
              <Select
                value={selectedApplication}
                onChange={(e) => setSelectedApplication(e.target.value)}
                label="Select Application"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderWidth: '1px' },
                    '&:hover fieldset': { borderWidth: '1px' },
                    '&.Mui-focused fieldset': { borderWidth: '1px' },
                  },
                }}
              >
                {searchResult.approved_applications.map((app) => (
                  <MenuItem key={app.id} value={app.id}>
                    <Box>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        {app.application_number}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                        {app.application_type}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Location Selection */}
          {searchResult.accessible_print_locations.length > 1 && (
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Print Location</InputLabel>
                <Select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  label="Print Location"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderWidth: '1px' },
                      '&:hover fieldset': { borderWidth: '1px' },
                      '&.Mui-focused fieldset': { borderWidth: '1px' },
                    },
                  }}
                >
                  {searchResult.accessible_print_locations.map((location) => (
                    <MenuItem key={location.id} value={location.id}>
                      <Box>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          {location.name}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                          {location.code} - {location.province_code}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {/* Order Button */}
          <Grid item xs={12}>
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={ordering ? <CircularProgress size={16} /> : <PrintIcon />}
                onClick={createPrintJob}
                disabled={!selectedApplication || !selectedLocation || ordering}
                sx={{ minWidth: 200 }}
              >
                {ordering ? 'Creating Print Job...' : 'Create Print Job'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      )}

      {/* Order Success */}
      {orderSuccess && (
        <Alert severity="success" sx={{ mt: 3 }}>
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
      )}
    </Paper>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 1, height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
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
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'white' }}>
          <Typography variant="h4" gutterBottom sx={{ fontSize: '1.5rem', fontWeight: 600 }}>
            Card Ordering System
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
            Search by ID number, verify documents, and order driver's license cards
          </Typography>
        </Box>

        {/* Tabs Navigation */}
        <Box sx={{ bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tabs
            value={activeStep}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                minHeight: 64,
                fontSize: '0.875rem',
                fontWeight: 500
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
          p: 2
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
        <Box sx={{ 
          p: 2, 
          bgcolor: 'white', 
          borderTop: '1px solid', 
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box>
            {activeStep > 0 && (
              <Button
                onClick={() => setActiveStep(activeStep - 1)}
                disabled={loading || ordering}
                size="small"
              >
                Back
              </Button>
            )}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {activeStep < steps.length - 1 && (
              <Button
                variant="contained"
                onClick={() => setActiveStep(activeStep + 1)}
                disabled={!isStepValid(activeStep) || loading || ordering}
                size="small"
              >
                {activeStep === 0 ? 'Preview Document' : 'Proceed to Order'}
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default CardOrderingByIdPage; 