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
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* License Information Summary */}
              <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                  License Information
                </Typography>

                <Grid container spacing={1}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>License Number</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {licenseService.formatLicenseId(license.id)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Category</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {license.category}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Status</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {license.status}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Issue Date</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {formatShortDate(license.issue_date)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Issuing Location</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {license.issuing_location_name || license.issuing_location_code || 'NOT SPECIFIED'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Current Card & Restrictions/Permits in a 2-column layout */}
              <Grid container spacing={1.5}>
                {/* Current Card Summary */}
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                    Current Card {license.current_card ? `(${license.current_card.card_number})` : ''}
                  </Typography>
                  {license.current_card ? (
                    <Box sx={{ mb: 0.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {license.current_card.card_type || 'Standard Card'}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                            Status: {license.current_card.status.replace(/_/g, ' ')}
                          </Typography>
                        </Box>
                        {license.current_card.is_current && <Chip label="CURRENT" size="small" color="primary" sx={{ fontSize: '0.6rem', height: '18px' }} />}
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        Expires: {formatShortDate(license.current_card.expiry_date)}
                        {license.current_card.is_near_expiry && ` (${license.current_card.days_until_expiry} days remaining)`}
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ mb: 0.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                      <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                        No current card issued
                      </Typography>
                    </Box>
                  )}
                </Grid>

                {/* Restrictions & Permits Summary */}
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                    Restrictions & Permits
                  </Typography>
                  <Box sx={{ mb: 0.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Restrictions</Typography>
                      <Box sx={{ mt: 0.25 }}>
                        {license.restrictions.length > 0 ? (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
                            {license.restrictions.map((code) => (
                              <Chip
                                key={code}
                                label={licenseService.getRestrictionDisplayName(code)}
                                size="small"
                                variant="outlined"
                                color="warning"
                                sx={{ fontSize: '0.6rem', height: '18px' }}
                              />
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                            None
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Professional Permit</Typography>
                      <Box sx={{ mt: 0.25 }}>
                        {license.has_professional_permit && license.professional_permit_categories.length > 0 ? (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
                            {license.professional_permit_categories.map((category) => (
                              <Chip
                                key={category}
                                label={licenseService.getProfessionalPermitDisplayName(category)}
                                size="small"
                                variant="outlined"
                                color="info"
                                sx={{ fontSize: '0.6rem', height: '18px' }}
                              />
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                            None
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              </Grid>

              {/* License Statistics */}
              <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                  License Statistics
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={12} md={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Total Cards Issued</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {license.cards?.length || 0}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Active Since</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {formatShortDate(license.created_at)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Last Updated</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {formatShortDate(license.updated_at)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Application ID</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {license.created_from_application_id || 'NOT AVAILABLE'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Reference Information (if available) */}
              {(license.captured_from_license_number || license.previous_license_id || license.is_upgrade) && (
                <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
                  <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                    License References
                  </Typography>
                  <Grid container spacing={1}>
                    {license.captured_from_license_number && (
                      <Grid item xs={12} md={4}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Original License Number</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                          {license.captured_from_license_number}
                        </Typography>
                      </Grid>
                    )}
                    {license.previous_license_id && (
                      <Grid item xs={12} md={4}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Previous License</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                          {license.previous_license_id}
                        </Typography>
                      </Grid>
                    )}
                    {license.is_upgrade && license.upgrade_from_category && (
                      <Grid item xs={12} md={4}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Upgrade From Category</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                          {license.upgrade_from_category}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}
            </Box>
          </TabPanelComponent>

          {/* Cards Tab */}
          <TabPanelComponent value={tabValue} index={1}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                Cards ({license.cards?.length || 0})
              </Typography>
              {license.cards && license.cards.length > 0 ? (
                license.cards.map((card, index) => (
                  <Box key={card.id} sx={{ mb: 0.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                            {card.card_number}
                          </Typography>
                          {card.is_current && <Chip label="CURRENT" size="small" color="primary" sx={{ fontSize: '0.6rem', height: '18px' }} />}
                        </Box>
                        
                        <Grid container spacing={1} sx={{ mb: 0.5 }}>
                          <Grid item xs={6} md={3}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Status</Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                              {card.status.replace(/_/g, ' ')}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Issue Date</Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                              {formatShortDate(card.issue_date)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Expiry Date</Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                              {formatShortDate(card.expiry_date)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Type</Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                              {card.card_type || 'Standard'}
                            </Typography>
                          </Grid>
                        </Grid>

                        {/* Additional card details */}
                        <Grid container spacing={1}>
                          {card.collected_date && (
                            <Grid item xs={6} md={3}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Collected</Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                {formatShortDate(card.collected_date)}
                              </Typography>
                            </Grid>
                          )}
                          {card.ready_for_collection_date && !card.collected_date && (
                            <Grid item xs={6} md={3}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Ready for Collection</Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                {formatShortDate(card.ready_for_collection_date)}
                              </Typography>
                            </Grid>
                          )}
                          {card.is_expired && (
                            <Grid item xs={6} md={3}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Status</Typography>
                              <Chip label="EXPIRED" size="small" color="error" sx={{ fontSize: '0.6rem', height: '18px' }} />
                            </Grid>
                          )}
                          {card.is_near_expiry && !card.is_expired && (
                            <Grid item xs={6} md={3}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Expiry Warning</Typography>
                              <Chip label={`${card.days_until_expiry} days`} size="small" color="warning" sx={{ fontSize: '0.6rem', height: '18px' }} />
                            </Grid>
                          )}
                        </Grid>
                      </Box>
                    </Box>
                  </Box>
                ))
              ) : (
                <Box sx={{ mb: 0.5, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9', textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                    No cards issued for this license
                  </Typography>
                </Box>
              )}
            </Box>
          </TabPanelComponent>

          {/* History Tab */}
          <TabPanelComponent value={tabValue} index={2}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                Status History ({license.status_history?.length || 0})
              </Typography>
              {license.status_history && license.status_history.length > 0 ? (
                license.status_history.map((history, index) => (
                  <Box key={history.id} sx={{ mb: 0.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                            {formatDate(history.changed_at)}
                          </Typography>
                          <Chip 
                            label={history.system_initiated ? "System" : "Manual"} 
                            size="small" 
                            color={history.system_initiated ? "info" : "default"}
                            sx={{ fontSize: '0.6rem', height: '18px' }}
                          />
                        </Box>
                        
                        <Grid container spacing={1}>
                          <Grid item xs={12} md={6}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Status Change</Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                              {history.from_status ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Chip label={history.from_status} size="small" color="default" sx={{ fontSize: '0.6rem', height: '16px' }} />
                                  <Typography variant="caption">→</Typography>
                                  <Chip label={history.to_status} size="small" color="primary" sx={{ fontSize: '0.6rem', height: '16px' }} />
                                </Box>
                              ) : (
                                <Chip label={`Initial: ${history.to_status}`} size="small" color="primary" sx={{ fontSize: '0.6rem', height: '16px' }} />
                              )}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Reason</Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                              {history.reason || 'Not specified'}
                            </Typography>
                          </Grid>
                          {history.notes && (
                            <Grid item xs={12}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Notes</Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                {history.notes}
                              </Typography>
                            </Grid>
                          )}
                          {(history.suspension_start_date || history.suspension_end_date) && (
                            <Grid item xs={12}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Suspension Period</Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                {history.suspension_start_date && history.suspension_end_date
                                  ? `${formatShortDate(history.suspension_start_date)} - ${formatShortDate(history.suspension_end_date)}`
                                  : 'Not specified'}
                              </Typography>
                            </Grid>
                          )}
                        </Grid>
                      </Box>
                    </Box>
                  </Box>
                ))
              ) : (
                <Box sx={{ mb: 0.5, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9', textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                    No status history available
                  </Typography>
                </Box>
              )}
            </Box>
          </TabPanelComponent>

          {/* Compliance Tab */}
          <TabPanelComponent value={tabValue} index={3}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* International Compliance Summary */}
              <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                  International Compliance
                </Typography>

                <Grid container spacing={1}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>SADC Compliance</Typography>
                    <Box sx={{ mt: 0.25 }}>
                      <Chip
                        label={license.sadc_compliance_verified ? 'Verified' : 'Not Verified'}
                        color={license.sadc_compliance_verified ? 'success' : 'error'}
                        size="small"
                        sx={{ fontSize: '0.6rem', height: '18px' }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>International Validity</Typography>
                    <Box sx={{ mt: 0.25 }}>
                      <Chip
                        label={license.international_validity ? 'Valid Internationally' : 'Local Only'}
                        color={license.international_validity ? 'success' : 'warning'}
                        size="small"
                        sx={{ fontSize: '0.6rem', height: '18px' }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Vienna Convention</Typography>
                    <Box sx={{ mt: 0.25 }}>
                      <Chip
                        label={license.vienna_convention_compliant ? 'Compliant' : 'Non-Compliant'}
                        color={license.vienna_convention_compliant ? 'success' : 'error'}
                        size="small"
                        sx={{ fontSize: '0.6rem', height: '18px' }}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {/* Technical Standards */}
              <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                  Technical Standards
                </Typography>

                <Grid container spacing={1}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>ISO Standard</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      ISO 18013-1:2018 (Mobile ID Standard)
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Card Template</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {license.current_card?.card_template || 'Not specified'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>ISO Compliance Version</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {license.current_card?.iso_compliance_version || 'Not specified'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Card Type</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {license.current_card?.card_type || 'Standard Physical Card'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Regional Compliance Details */}
              <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'info.main', fontSize: '0.85rem', mb: 1 }}>
                  Regional Recognition Details
                </Typography>

                <Grid container spacing={1}>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>SADC Member States Recognition</Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem', mb: 1 }}>
                      {license.sadc_compliance_verified 
                        ? 'This license is recognized in all SADC member states for driving purposes according to the SADC Protocol on Transport, Communications and Meteorology.'
                        : 'This license may have limited recognition in other SADC member states. Additional documentation may be required.'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Vienna Convention Recognition</Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem', mb: 1 }}>
                      {license.vienna_convention_compliant 
                        ? 'This license complies with the Vienna Convention on Road Traffic and is recognized internationally in all signatory countries.'
                        : 'This license does not fully comply with Vienna Convention standards. An International Driving Permit may be required for international travel.'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Digital Compliance</Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                      The license follows ISO 18013 standards for mobile driver's licenses (mDL) and includes digital security features for enhanced verification and fraud prevention.
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </TabPanelComponent>

          {/* Person Tab */}
          <TabPanelComponent value={tabValue} index={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* Person Information Summary */}
              <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                  Person Information
                </Typography>

                <Grid container spacing={1}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Full Name</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {`${license.person_name || ''} ${license.person_surname || ''}`.trim() || 'NOT AVAILABLE'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Person ID</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {license.person_id || 'NOT AVAILABLE'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Application ID</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {license.created_from_application_id || 'NOT AVAILABLE'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Issuing Information */}
              <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                  Issuing Information
                </Typography>

                <Grid container spacing={1}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Issuing Location</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {license.issuing_location_name || license.issuing_location_code || 'NOT SPECIFIED'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Issue Date</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {formatShortDate(license.issue_date)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Issued By</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {license.issued_by_user_id || 'SYSTEM'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Status History Summary */}
              <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
                <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.85rem', mb: 1 }}>
                  Status Changes ({license.status_history?.length || 0})
                </Typography>
                
                {license.status_history && license.status_history.length > 0 ? (
                  <Box sx={{ maxHeight: '200px', overflow: 'auto' }}>
                    {license.status_history.slice(0, 3).map((history, index) => (
                      <Box key={history.id} sx={{ mb: 0.5, p: 0.5, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#f9f9f9' }}>
                        <Grid container spacing={1}>
                          <Grid item xs={6} md={3}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Date</Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                              {formatShortDate(history.changed_at)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>From → To</Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                              {history.from_status || 'NEW'} → {history.to_status}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Reason</Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                              {history.reason || 'Not specified'}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Type</Typography>
                            <Chip 
                              label={history.system_initiated ? "System" : "Manual"} 
                              size="small" 
                              color={history.system_initiated ? "info" : "default"}
                              sx={{ fontSize: '0.6rem', height: '18px' }}
                            />
                          </Grid>
                        </Grid>
                      </Box>
                    ))}
                    {license.status_history.length > 3 && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontStyle: 'italic' }}>
                        ... and {license.status_history.length - 3} more status changes. View all in History tab.
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                    No status changes recorded
                  </Typography>
                )}
              </Box>

              {/* Status Details (if suspended or cancelled) */}
              {(license.is_suspended || license.is_cancelled) && (
                <Box sx={{ mb: 1.5, p: 1, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fff3e0' }}>
                  <Typography variant="body2" gutterBottom sx={{ fontWeight: 600, color: 'warning.dark', fontSize: '0.85rem', mb: 1 }}>
                    Status Details
                  </Typography>
                  
                  <Grid container spacing={1}>
                    {license.is_suspended && (
                      <>
                        <Grid item xs={12} md={6}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Suspension Reason</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                            {license.suspension_reason || 'Not specified'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Suspension Period</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                            {license.suspension_start_date && license.suspension_end_date
                              ? `${formatShortDate(license.suspension_start_date)} - ${formatShortDate(license.suspension_end_date)}`
                              : 'Not specified'}
                          </Typography>
                        </Grid>
                      </>
                    )}
                    {license.is_cancelled && (
                      <>
                        <Grid item xs={12} md={6}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Cancellation Reason</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                            {license.cancellation_reason || 'Not specified'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Cancellation Date</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                            {license.cancellation_date ? formatShortDate(license.cancellation_date) : 'Not specified'}
                          </Typography>
                        </Grid>
                      </>
                    )}
                  </Grid>
                </Box>
              )}
            </Box>
          </TabPanelComponent>
        </Box>
      </Paper>
    </Container>
  );
};

export default LicenseDetailPage; 