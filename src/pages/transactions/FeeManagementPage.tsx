import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
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
  IconButton
} from '@mui/material';
import { Edit, Save, Cancel } from '@mui/icons-material';
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading fee data...</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Fee Management
      </Typography>
      <Typography variant="body1" color="textSecondary" gutterBottom>
        Manage application fees by type. Changes take effect immediately for new applications.
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {Object.entries(feeData).map(([appType, data]) => (
          <Grid item xs={12} md={6} lg={4} key={appType}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {data.name}
                </Typography>

                {/* Test Fees Table */}
                {data.fees.test_fees && data.fees.test_fees.length > 0 && (
                  <Box mb={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Test Fees
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Type</TableCell>
                            <TableCell align="right">Amount</TableCell>
                            <TableCell align="center">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {data.fees.test_fees.map((fee) => (
                            <TableRow key={fee.id}>
                              <TableCell>
                                <Typography variant="body2">
                                  {fee.display_name}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" fontWeight="bold">
                                  {formatCurrency(fee.amount)}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditFee(fee)}
                                  color="primary"
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                {/* Application Fee */}
                {data.fees.application_fee && (
                  <Box mb={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Application Fee
                    </Typography>
                    <Box 
                      display="flex" 
                      justifyContent="space-between" 
                      alignItems="center"
                      p={1}
                      border="1px solid #e0e0e0"
                      borderRadius={1}
                    >
                      <Typography variant="body2">
                        {data.fees.application_fee.display_name}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" fontWeight="bold">
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

                {/* Totals */}
                <Box mt={2} pt={2} borderTop="1px solid #e0e0e0">
                  <Typography variant="subtitle2" gutterBottom>
                    Total Costs
                  </Typography>
                  {data.fees.total_light !== undefined && (
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Light Vehicles:</Typography>
                      <Chip 
                        label={formatCurrency(data.fees.total_light)} 
                        color="primary" 
                        size="small"
                      />
                    </Box>
                  )}
                  {data.fees.total_heavy !== undefined && (
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Heavy Vehicles:</Typography>
                      <Chip 
                        label={formatCurrency(data.fees.total_heavy)} 
                        color="secondary" 
                        size="small"
                      />
                    </Box>
                  )}
                  {data.fees.total !== undefined && (
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Total:</Typography>
                      <Chip 
                        label={formatCurrency(data.fees.total)} 
                        color="primary" 
                        size="small"
                      />
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

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
          />
          {editingFee && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Current amount: {formatCurrency(editingFee.amount)}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEdit} startIcon={<Cancel />}>
            Cancel
          </Button>
          <Button onClick={handleSaveFee} variant="contained" startIcon={<Save />}>
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
    </Box>
  );
};

export default FeeManagementPage; 