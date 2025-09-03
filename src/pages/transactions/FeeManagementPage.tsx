import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Skeleton
} from '@mui/material';
import { 
  Edit, 
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { transactionService } from '../../services/transactionService';
import { formatCurrency } from '../../utils/currency';

interface FeeData {
  id: string;
  type: string;
  display_name: string;
  amount: number;
  description: string;
}

interface ApplicationTypeFees {
  name: string;
  fees: {
    test_fees?: FeeData[];
    application_fee?: FeeData;
    total?: number;
    total_light?: number;
    total_heavy?: number;
  };
}

const FeeManagementPage: React.FC = () => {
  const [feeData, setFeeData] = useState<Record<string, ApplicationTypeFees>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedAccordions, setExpandedAccordions] = useState<string[]>([]);
  
  // Inline editing state
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [savingFeeId, setSavingFeeId] = useState<string | null>(null);

  const loadFeeData = async () => {
    try {
      setLoading(true);
      const data = await transactionService.getFeesByApplicationType();
      setFeeData(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeeData();
  }, []);

  // Inline editing handlers
  const handleStartInlineEdit = (fee: FeeData) => {
    setEditingFeeId(fee.id);
    setEditAmount(fee.amount.toString());
  };

  const handleSaveInlineEdit = async (feeId: string, feeDisplayName: string) => {
    try {
      setSavingFeeId(feeId);
      const newAmount = parseFloat(editAmount);
      if (isNaN(newAmount) || newAmount < 0) {
        setError('Please enter a valid amount');
        return;
      }

      await transactionService.updateFeeStructure(feeId, {
        amount: newAmount
      });

      setSuccessMessage(`${feeDisplayName} updated successfully`);
      setEditingFeeId(null);
      setEditAmount('');
      
      // Reload data to show updated amounts
      await loadFeeData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingFeeId(null);
    }
  };

  const handleCancelInlineEdit = () => {
    setEditingFeeId(null);
    setEditAmount('');
  };

  const handleAccordionChange = (appType: string) => (
    event: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    setExpandedAccordions(prev => 
      isExpanded 
        ? [...prev, appType]
        : prev.filter(type => type !== appType)
    );
  };

  const isAccordionExpanded = (appType: string) => expandedAccordions.includes(appType);

  // Skeleton loading component
  const FeeSkeletonCard = () => (
    <Accordion 
      elevation={0}
      sx={{ 
        bgcolor: 'white',
        boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
        borderRadius: 2,
        '&:before': {
          display: 'none',
        }
      }}
    >
      <AccordionSummary sx={{ bgcolor: 'white', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pr: 2 }}>
          <Skeleton variant="text" width={200} height={28} />
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Skeleton variant="rounded" width={100} height={24} />
            <Skeleton variant="rounded" width={100} height={24} />
          </Box>
        </Box>
      </AccordionSummary>
    </Accordion>
  );

  const TableSkeleton = () => (
    <TableContainer 
      component={Paper} 
      elevation={0}
      sx={{
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        maxHeight: 'none'
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa', py: 1, px: 2 }}>
              Type
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa', py: 1, px: 2 }}>
              Amount
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa', py: 1, px: 2 }}>
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: 3 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell sx={{ py: 1, px: 2 }}>
                <Skeleton variant="text" width="100%" height={20} />
              </TableCell>
              <TableCell align="right" sx={{ py: 1, px: 2 }}>
                <Skeleton variant="text" width={80} height={20} />
              </TableCell>
              <TableCell align="center" sx={{ py: 1, px: 2 }}>
                <Skeleton variant="circular" width={32} height={32} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
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
          {/* Top Section - Header */}
          <Box sx={{ 
            bgcolor: 'white', 
            borderBottom: '1px solid', 
            borderColor: 'divider',
            flexShrink: 0,
            p: 2
          }}>
            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
              Fee Management
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.8rem' }}>
              Manage application fees by type. Changes take effect immediately for new applications.
            </Typography>
          </Box>

          {/* Content Area - Skeleton Loading */}
          <Box sx={{ 
            flex: 1,
            overflow: 'auto',
            p: 2,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}>
            {Array.from({ length: 6 }).map((_, index) => (
              <FeeSkeletonCard key={index} />
            ))}
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
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
        {/* Top Section - Header */}
        <Box sx={{ 
          bgcolor: 'white', 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          flexShrink: 0,
          p: 2
        }}>
          <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
            Fee Management
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.8rem' }}>
            Manage application fees by type. Changes take effect immediately for new applications.
          </Typography>
        </Box>

        {/* Content Area - Scrollable Accordion Fee Cards */}
        <Box sx={{ 
          flex: 1,
          overflow: 'auto',
          p: 2,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          {Object.entries(feeData).length > 0 ? (
            Object.entries(feeData).map(([appType, data]) => {
              const isExpanded = isAccordionExpanded(appType);
              return (
                <Accordion 
                  key={appType}
                  expanded={isExpanded}
                  onChange={handleAccordionChange(appType)}
                  elevation={0}
                  sx={{ 
                    bgcolor: 'white',
                    boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                    borderRadius: 2,
                    '&:before': {
                      display: 'none',
                    },
                    '&.Mui-expanded': {
                      margin: 0,
                    }
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      bgcolor: 'white',
                      borderRadius: 2,
                      '&.Mui-expanded': {
                        minHeight: 48,
                      },
                      '& .MuiAccordionSummary-content': {
                        margin: '12px 0',
                        '&.Mui-expanded': {
                          margin: '12px 0',
                        },
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pr: 2 }}>
                      <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                        {data.name}
                      </Typography>
                      {!isExpanded && (
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          {data.fees.total_light !== undefined && (
                            <Chip 
                              label={`Light: ${formatCurrency(data.fees.total_light)}`}
                              color="primary" 
                              size="small"
                              sx={{ 
                                fontSize: '0.7rem',
                                height: '24px',
                                borderRadius: '5px'
                              }}
                            />
                          )}
                          {data.fees.total_heavy !== undefined && (
                            <Chip 
                              label={`Heavy: ${formatCurrency(data.fees.total_heavy)}`}
                              color="secondary" 
                              size="small"
                              sx={{ 
                                fontSize: '0.7rem',
                                height: '24px',
                                borderRadius: '5px'
                              }}
                            />
                          )}
                          {data.fees.total !== undefined && !data.fees.total_light && !data.fees.total_heavy && (
                            <Chip 
                              label={`Total: ${formatCurrency(data.fees.total)}`}
                              color="primary" 
                              size="small"
                              sx={{ 
                                fontSize: '0.7rem',
                                height: '24px',
                                borderRadius: '5px'
                              }}
                            />
                          )}
                        </Box>
                      )}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 2, pt: 0 }}>

                {/* Test Fees Table */}
                {data.fees.test_fees && data.fees.test_fees.length > 0 && (
                  <Box mb={2}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      Test Fees
                    </Typography>
                    <TableContainer 
                      component={Paper} 
                      elevation={0}
                      sx={{
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        maxHeight: 'none'
                      }}
                    >
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ 
                              fontWeight: 600, 
                              fontSize: '0.875rem',
                              bgcolor: '#f8f9fa',
                              py: 1, 
                              px: 2 
                            }}>
                              Type
                            </TableCell>
                            <TableCell align="right" sx={{ 
                              fontWeight: 600, 
                              fontSize: '0.875rem',
                              bgcolor: '#f8f9fa',
                              py: 1, 
                              px: 2 
                            }}>
                              Amount
                            </TableCell>
                            <TableCell align="center" sx={{ 
                              fontWeight: 600, 
                              fontSize: '0.875rem',
                              bgcolor: '#f8f9fa',
                              py: 1, 
                              px: 2 
                            }}>
                              Actions
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {data.fees.test_fees.length > 0 ? (
                            data.fees.test_fees.map((fee) => {
                              const isEditing = editingFeeId === fee.id;
                              const isSaving = savingFeeId === fee.id;
                              
                              return (
                                <TableRow key={fee.id} hover>
                                  <TableCell sx={{ py: 1, px: 2 }}>
                                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                      {fee.display_name}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right" sx={{ py: 1, px: 2 }}>
                                    {isEditing ? (
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                                        <TextField
                                          size="small"
                                          type="number"
                                          value={editAmount}
                                          onChange={(e) => setEditAmount(e.target.value)}
                                          sx={{ 
                                            width: 120,
                                            '& .MuiOutlinedInput-root': {
                                              '& fieldset': { borderWidth: '1px' },
                                              '&:hover fieldset': { borderWidth: '1px' },
                                              '&.Mui-focused fieldset': { borderWidth: '1px' },
                                            }
                                          }}
                                          InputProps={{
                                            startAdornment: (
                                              <Typography variant="caption" sx={{ mr: 0.5, fontSize: '0.7rem' }}>
                                                Ar
                                              </Typography>
                                            )
                                          }}
                                        />
                                        <IconButton 
                                          size="small" 
                                          color="primary" 
                                          disabled={isSaving}
                                          onClick={() => handleSaveInlineEdit(fee.id, fee.display_name)}
                                        >
                                          {isSaving ? <CircularProgress size={16} /> : <CheckIcon />}
                                        </IconButton>
                                        <IconButton 
                                          size="small" 
                                          color="secondary"
                                          onClick={handleCancelInlineEdit}
                                          disabled={isSaving}
                                        >
                                          <CloseIcon />
                                        </IconButton>
                                      </Box>
                                    ) : (
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                                        <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.8rem' }}>
                                          {formatCurrency(fee.amount)}
                                        </Typography>
                                        <IconButton
                                          size="small"
                                          onClick={() => handleStartInlineEdit(fee)}
                                          color="primary"
                                        >
                                          <Edit fontSize="small" />
                                        </IconButton>
                                      </Box>
                                    )}
                                  </TableCell>
                                  <TableCell align="center" sx={{ py: 1, px: 2 }}>
                                    {/* Actions could go here if needed */}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={3} align="center" sx={{ py: 2, px: 2 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                  No test fees configured for this application type
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                {/* Application Fee */}
                {data.fees.application_fee && (
                  <Box mb={2}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      Application Fee
                    </Typography>
                    <Box 
                      display="flex" 
                      justifyContent="space-between" 
                      alignItems="center"
                      p={1.5}
                      border="1px solid"
                      borderColor="divider"
                      borderRadius={1}
                      bgcolor="white"
                    >
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        {data.fees.application_fee.display_name}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        {editingFeeId === data.fees.application_fee.id ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TextField
                              size="small"
                              type="number"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              sx={{ 
                                width: 120,
                                '& .MuiOutlinedInput-root': {
                                  '& fieldset': { borderWidth: '1px' },
                                  '&:hover fieldset': { borderWidth: '1px' },
                                  '&.Mui-focused fieldset': { borderWidth: '1px' },
                                }
                              }}
                              InputProps={{
                                startAdornment: (
                                  <Typography variant="caption" sx={{ mr: 0.5, fontSize: '0.7rem' }}>
                                    Ar
                                  </Typography>
                                )
                              }}
                            />
                            <IconButton 
                              size="small" 
                              color="primary" 
                              disabled={savingFeeId === data.fees.application_fee.id}
                              onClick={() => handleSaveInlineEdit(data.fees.application_fee!.id, data.fees.application_fee!.display_name)}
                            >
                              {savingFeeId === data.fees.application_fee.id ? <CircularProgress size={16} /> : <CheckIcon />}
                            </IconButton>
                            <IconButton 
                              size="small" 
                              color="secondary"
                              onClick={handleCancelInlineEdit}
                              disabled={savingFeeId === data.fees.application_fee.id}
                            >
                              <CloseIcon />
                            </IconButton>
                          </Box>
                        ) : (
                          <>
                            <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.8rem' }}>
                              {formatCurrency(data.fees.application_fee.amount)}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => handleStartInlineEdit(data.fees.application_fee)}
                              color="primary"
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    </Box>
                  </Box>
                )}

                  </AccordionDetails>
                </Accordion>
              );
            })
          ) : (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              minHeight: 200,
              bgcolor: 'white',
              borderRadius: 2,
              boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px'
            }}>
              <Typography variant="body1" color="text.secondary">
                No fee data available. Please check your connection or contact support.
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>



      {/* Success/Error Messages */}
      <Snackbar 
        open={!!successMessage} 
        autoHideDuration={6000} 
        onClose={() => setSuccessMessage(null)}
      >
        <Alert onClose={() => setSuccessMessage(null)} severity="success">
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
      >
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default FeeManagementPage; 