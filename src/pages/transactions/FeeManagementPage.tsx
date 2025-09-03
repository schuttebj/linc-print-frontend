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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { 
  Edit, 
  Save, 
  Cancel,
  ExpandMore as ExpandMoreIcon 
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
  const [editingFee, setEditingFee] = useState<FeeData | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [expandedAccordions, setExpandedAccordions] = useState<string[]>([]);

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

  const handleEditFee = (fee: FeeData) => {
    setEditingFee(fee);
    setEditAmount(fee.amount.toString());
    setEditDialogOpen(true);
  };

  const handleSaveFee = async () => {
    if (!editingFee) return;

    try {
      const newAmount = parseFloat(editAmount);
      if (isNaN(newAmount) || newAmount < 0) {
        setError('Please enter a valid amount');
        return;
      }

      await transactionService.updateFeeStructure(editingFee.id, {
        amount: newAmount
      });

      setSuccessMessage(`${editingFee.display_name} updated successfully`);
      setEditDialogOpen(false);
      setEditingFee(null);
      
      // Reload data to show updated amounts
      await loadFeeData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setEditingFee(null);
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
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px" p={4}>
            <Typography>Loading fee data...</Typography>
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
                            data.fees.test_fees.map((fee) => (
                              <TableRow key={fee.id} hover>
                                <TableCell sx={{ py: 1, px: 2 }}>
                                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                    {fee.display_name}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right" sx={{ py: 1, px: 2 }}>
                                  <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.8rem' }}>
                                    {formatCurrency(fee.amount)}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center" sx={{ py: 1, px: 2 }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditFee(fee)}
                                    color="primary"
                                  >
                                    <Edit fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))
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
                        <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.8rem' }}>
                          {formatCurrency(data.fees.application_fee.amount)}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleEditFee(data.fees.application_fee!)}
                          color="primary"
                        >
                          <Edit fontSize="small" />
                        </IconButton>
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

      {/* Edit Fee Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCancelEdit} maxWidth="sm" fullWidth>
        <DialogTitle>
          Edit Fee Amount
          {editingFee && (
            <Typography variant="body2" color="textSecondary">
              {editingFee.display_name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Amount (Ariary)"
            type="number"
            fullWidth
            variant="outlined"
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
            helperText="Enter the new fee amount in Ariary"
            inputProps={{ min: 0, step: 1000 }}
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderWidth: '1px',
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
          {editingFee && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Current amount: {formatCurrency(editingFee.amount)}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEdit} startIcon={<Cancel />} size="small">
            Cancel
          </Button>
          <Button onClick={handleSaveFee} variant="contained" startIcon={<Save />} size="small">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

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