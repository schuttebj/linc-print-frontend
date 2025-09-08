/**
 * License Detail Page for Madagascar License System
 * Comprehensive view of a specific license with all related information
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tab,
  Tabs,
  Container
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  History as HistoryIcon,
  CreditCard as CardIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

import licenseService, { 
  LicenseDetail, 
  LicenseCard, 
  LicenseStatusHistory
} from '../../services/licenseService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanelComponent: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const LicenseDetailPage: React.FC = () => {
  const { licenseId } = useParams<{ licenseId: string }>();
  const navigate = useNavigate();

  // State management
  const [license, setLicense] = useState<LicenseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // Load license data
  const loadLicense = async () => {
    if (!licenseId) return;

    setLoading(true);
    setError(null);

    try {
      const licenseData = await licenseService.getLicense(licenseId);
      setLicense(licenseData);
    } catch (err: any) {
      setError(err.message || 'Failed to load license details');
      console.error('Error loading license:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLicense();
  }, [licenseId]);

  // Format functions
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  const formatShortDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  };

  const getStatusChip = (status: string) => {
    const color = licenseService.getStatusColor(status);
    return (
      <Chip 
        label={status} 
        color={color} 
        size="medium"
        variant="filled"
      />
    );
  };

  const getCardStatusChip = (status: string) => {
    const color = licenseService.getCardStatusColor(status);
    return (
      <Chip 
        label={status.replace(/_/g, ' ')} 
        color={color} 
        size="small"
        variant="outlined"
      />
    );
  };

  // Helper function to render tab with completion indicator
  const renderTabLabel = (step: any, index: number) => {
    const isCurrent = tabValue === index;
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          color: isCurrent ? 'primary.main' : 'text.secondary' 
        }}>
          {step.icon}
        </Box>
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: isCurrent ? 'bold' : 'normal',
            color: isCurrent ? 'primary.main' : 'text.secondary'
          }}
        >
          {step.label}
        </Typography>
      </Box>
    );
  };

  const steps = [
    {
      label: 'Overview',
      icon: <AssignmentIcon />
    },
    {
      label: 'Cards',
      icon: <CardIcon />
    },
    {
      label: 'History',
      icon: <HistoryIcon />
    },
    {
      label: 'Compliance',
      icon: <SecurityIcon />
    },
    {
      label: 'Person',
      icon: <PersonIcon />
    }
  ];

  if (loading) {
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
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
            <CircularProgress />
          </Box>
        </Paper>
      </Container>
    );
  }

  if (error) {
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
          <Box sx={{ p: 3 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        </Paper>
      </Container>
    );
  }

  if (!license) {
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
          <Box sx={{ p: 3 }}>
            <Alert severity="warning">License not found</Alert>
          </Box>
        </Paper>
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
        {/* Header Section */}
        <Box sx={{ 
          bgcolor: 'white', 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          flexShrink: 0,
          p: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <IconButton 
              onClick={() => navigate('/dashboard/licenses/list')}
              sx={{ color: 'primary.main' }}
            >
              <BackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
              License Details - {licenseService.formatLicenseId(license.id)}
            </Typography>
            {getStatusChip(license.status)}
          </Box>
        </Box>

        {/* Tab Navigation */}
        <Box sx={{ 
          bgcolor: 'white', 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          flexShrink: 0 
        }}>
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
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

          {/* Overview Tab */}
          <TabPanelComponent value={tabValue} index={0}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Basic Information */}
              <Paper 
                elevation={0}
                sx={{ 
                  bgcolor: 'white',
                  boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                  borderRadius: 2,
                  p: 2
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600, color: 'primary.main', mb: 2 }}>
                  Basic Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>License Number</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {licenseService.formatLicenseId(license.id)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Category</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip label={license.category} color="primary" size="small" />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Status</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {getStatusChip(license.status)}
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Issue Date</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {formatShortDate(license.issue_date)}
                    </Typography>
                  </Grid>
                  {license.captured_from_license_number && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Original License Number</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                        {license.captured_from_license_number}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>

              {/* Restrictions & Professional Permits */}
              <Paper 
                elevation={0}
                sx={{ 
                  bgcolor: 'white',
                  boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                  borderRadius: 2,
                  p: 2
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600, color: 'primary.main', mb: 2 }}>
                  Restrictions & Permits
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Restrictions</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {license.restrictions.length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {license.restrictions.map((code) => (
                            <Chip
                              key={code}
                              label={licenseService.getRestrictionDisplayName(code)}
                              size="small"
                              variant="outlined"
                              color="warning"
                            />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                          No restrictions
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Professional Permit</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {license.has_professional_permit && license.professional_permit_categories.length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {license.professional_permit_categories.map((category) => (
                            <Chip
                              key={category}
                              label={licenseService.getProfessionalPermitDisplayName(category)}
                              size="small"
                              variant="outlined"
                              color="info"
                            />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                          No professional permit
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* Current Card */}
              <Paper 
                elevation={0}
                sx={{ 
                  bgcolor: 'white',
                  boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                  borderRadius: 2,
                  p: 2
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600, color: 'primary.main', mb: 2 }}>
                  Current Card
                </Typography>
                {license.current_card ? (
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Card Number</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                        {license.current_card.card_number}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Status</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {getCardStatusChip(license.current_card.status)}
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Expiry Date</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                        {formatShortDate(license.current_card.expiry_date)}
                      </Typography>
                    </Grid>
                    {license.current_card.is_near_expiry && (
                      <Grid item xs={12}>
                        <Alert severity="warning" sx={{ fontSize: '0.8rem' }}>
                          Card expires in {license.current_card.days_until_expiry} days
                        </Alert>
                      </Grid>
                    )}
                  </Grid>
                ) : (
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                    No current card
                  </Typography>
                )}
              </Paper>

              {/* License Statistics */}
              <Paper 
                elevation={0}
                sx={{ 
                  bgcolor: 'white',
                  boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                  borderRadius: 2,
                  p: 2
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600, color: 'primary.main', mb: 2 }}>
                  License Statistics
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Total Cards Issued</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {license.cards.length}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Active Since</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {formatShortDate(license.created_at)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Last Updated</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {formatShortDate(license.updated_at)}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Box>
          </TabPanelComponent>

          {/* Cards Tab */}
          <TabPanelComponent value={tabValue} index={1}>
            <Paper 
              elevation={0}
              sx={{ 
                bgcolor: 'white',
                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                borderRadius: 2,
                overflow: 'hidden'
              }}
            >
              <TableContainer>
                <Table sx={{ '& .MuiTableCell-root': { borderRadius: 0 } }}>
                  <TableHead>
                    <TableRow>
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
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        bgcolor: '#f8f9fa',
                        py: 1, 
                        px: 2
                      }}>Issue Date</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        bgcolor: '#f8f9fa',
                        py: 1, 
                        px: 2
                      }}>Expiry Date</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        bgcolor: '#f8f9fa',
                        py: 1, 
                        px: 2
                      }}>Current</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {license.cards.map((card) => (
                      <TableRow key={card.id} hover>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                            {card.card_number}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          {getCardStatusChip(card.status)}
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {formatShortDate(card.issue_date)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {formatShortDate(card.expiry_date)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          {card.is_current && (
                            <Chip 
                              label="Current" 
                              color="success" 
                              size="small" 
                              sx={{ fontSize: '0.7rem', height: '24px' }}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {license.cards.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4, px: 2 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                            No cards issued for this license
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </TabPanelComponent>

          {/* History Tab */}
          <TabPanelComponent value={tabValue} index={2}>
            <Paper 
              elevation={0}
              sx={{ 
                bgcolor: 'white',
                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                borderRadius: 2,
                overflow: 'hidden'
              }}
            >
              <TableContainer>
                <Table sx={{ '& .MuiTableCell-root': { borderRadius: 0 } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        bgcolor: '#f8f9fa',
                        py: 1, 
                        px: 2
                      }}>Date</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        bgcolor: '#f8f9fa',
                        py: 1, 
                        px: 2
                      }}>From Status</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        bgcolor: '#f8f9fa',
                        py: 1, 
                        px: 2
                      }}>To Status</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        bgcolor: '#f8f9fa',
                        py: 1, 
                        px: 2
                      }}>Reason</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        bgcolor: '#f8f9fa',
                        py: 1, 
                        px: 2
                      }}>Notes</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        bgcolor: '#f8f9fa',
                        py: 1, 
                        px: 2
                      }}>System</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {license.status_history.map((history) => (
                      <TableRow key={history.id} hover>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {formatDate(history.changed_at)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          {history.from_status && getStatusChip(history.from_status)}
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          {getStatusChip(history.to_status)}
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {history.reason || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {history.notes || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          {history.system_initiated ? (
                            <Chip 
                              label="System" 
                              color="info" 
                              size="small" 
                              sx={{ fontSize: '0.7rem', height: '24px' }}
                            />
                          ) : (
                            <Chip 
                              label="Manual" 
                              color="default" 
                              size="small" 
                              sx={{ fontSize: '0.7rem', height: '24px' }}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {license.status_history.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4, px: 2 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                            No status history available
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </TabPanelComponent>

          {/* Compliance Tab */}
          <TabPanelComponent value={tabValue} index={3}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* SADC Compliance */}
              <Paper 
                elevation={0}
                sx={{ 
                  bgcolor: 'white',
                  boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                  borderRadius: 2,
                  p: 2
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600, color: 'primary.main', mb: 2 }}>
                  SADC Compliance
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>SADC Compliance Verified</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={license.sadc_compliance_verified ? 'Verified' : 'Not Verified'}
                        color={license.sadc_compliance_verified ? 'success' : 'error'}
                        size="small"
                        sx={{ fontSize: '0.7rem', height: '24px' }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>International Validity</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={license.international_validity ? 'Valid' : 'Not Valid'}
                        color={license.international_validity ? 'success' : 'error'}
                        size="small"
                        sx={{ fontSize: '0.7rem', height: '24px' }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Vienna Convention Compliant</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label={license.vienna_convention_compliant ? 'Compliant' : 'Not Compliant'}
                        color={license.vienna_convention_compliant ? 'success' : 'error'}
                        size="small"
                        sx={{ fontSize: '0.7rem', height: '24px' }}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* ISO Standards */}
              <Paper 
                elevation={0}
                sx={{ 
                  bgcolor: 'white',
                  boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                  borderRadius: 2,
                  p: 2
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600, color: 'primary.main', mb: 2 }}>
                  ISO Standards
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>ISO 18013 Compliance</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        label="ISO 18013-1:2018"
                        color="info"
                        size="small"
                        sx={{ fontSize: '0.7rem', height: '24px' }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Card Template</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {license.current_card?.card_template || 'No current card'}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Box>
          </TabPanelComponent>

          {/* Person Tab */}
          <TabPanelComponent value={tabValue} index={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Basic Person Information */}
              <Paper 
                elevation={0}
                sx={{ 
                  bgcolor: 'white',
                  boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                  borderRadius: 2,
                  p: 2
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600, color: 'primary.main', mb: 2 }}>
                  Person Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Full Name</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {`${license.person_name || ''} ${license.person_surname || ''}`.trim() || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Person ID</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {license.person_id || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Issuing Location</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {license.issuing_location_name || license.issuing_location_code || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Application ID</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {license.created_from_application_id || 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* License Information */}
              <Paper 
                elevation={0}
                sx={{ 
                  bgcolor: 'white',
                  boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                  borderRadius: 2,
                  p: 2
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600, color: 'primary.main', mb: 2 }}>
                  License References
                </Typography>
                <Grid container spacing={2}>
                  {license.previous_license_id && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Previous License</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                        {license.previous_license_id}
                      </Typography>
                    </Grid>
                  )}
                  {license.is_upgrade && license.upgrade_from_category && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Upgrade From Category</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                        {license.upgrade_from_category}
                      </Typography>
                    </Grid>
                  )}
                  {license.captured_from_license_number && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Captured From License Number</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                        {license.captured_from_license_number}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>

              {/* Status Information */}
              {(license.is_suspended || license.is_cancelled) && (
                <Paper 
                  elevation={0}
                  sx={{ 
                    bgcolor: 'white',
                    boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                    borderRadius: 2,
                    p: 2
                  }}
                >
                  <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600, color: 'primary.main', mb: 2 }}>
                    Status Details
                  </Typography>
                  <Grid container spacing={2}>
                    {license.is_suspended && (
                      <>
                        <Grid item xs={12} md={6}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Suspension Reason</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                            {license.suspension_reason || 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Suspension Period</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                            {license.suspension_start_date && license.suspension_end_date
                              ? `${formatShortDate(license.suspension_start_date)} - ${formatShortDate(license.suspension_end_date)}`
                              : 'N/A'}
                          </Typography>
                        </Grid>
                      </>
                    )}
                    {license.is_cancelled && (
                      <>
                        <Grid item xs={12} md={6}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Cancellation Reason</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                            {license.cancellation_reason || 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Cancellation Date</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                            {license.cancellation_date ? formatShortDate(license.cancellation_date) : 'N/A'}
                          </Typography>
                        </Grid>
                      </>
                    )}
                  </Grid>
                </Paper>
              )}
            </Box>
          </TabPanelComponent>
        </Box>
      </Paper>
    </Container>
  );
};

export default LicenseDetailPage; 