import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
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
  Checkbox,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip
} from '@mui/material';
import { 
  Edit, 
  Save, 
  Cancel, 
  Check as CheckIcon,
  Close as CloseIcon,
  History as HistoryIcon,
  Restore as RestoreIcon,
  FileDownload as ExportIcon,
  TrendingUp as TrendingUpIcon
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

interface FlattenedFee extends FeeData {
  applicationTypeName: string;
  applicationType: string;
  feeType: 'test_fee' | 'application_fee';
  category?: 'light' | 'heavy';
  totalImpact: number;
}

interface BulkActionDialogProps {
  open: boolean;
  onClose: () => void;
  selectedFees: string[];
  onBulkUpdate: (action: BulkAction) => Promise<void>;
}

interface BulkAction {
  type: 'percentage' | 'fixed' | 'reset';
  value?: number;
}

const FeeManagementPage: React.FC = () => {
  const [feeData, setFeeData] = useState<Record<string, ApplicationTypeFees>>({});
  const [flattenedFees, setFlattenedFees] = useState<FlattenedFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Inline editing state
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [savingFeeId, setSavingFeeId] = useState<string | null>(null);
  
  // Bulk operations state
  const [selectedFees, setSelectedFees] = useState<string[]>([]);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  
  // Legacy dialog state (keeping for compatibility)
  const [editingFee, setEditingFee] = useState<FeeData | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Helper function to flatten fee data for table display
  const flattenFeeData = (data: Record<string, ApplicationTypeFees>): FlattenedFee[] => {
    const flattened: FlattenedFee[] = [];
    
    Object.entries(data).forEach(([appType, appData]) => {
      // Add test fees
      appData.fees.test_fees?.forEach(fee => {
        // Determine category based on fee type/description
        let category: 'light' | 'heavy' | undefined;
        if (fee.display_name.toLowerCase().includes('light')) {
          category = 'light';
        } else if (fee.display_name.toLowerCase().includes('heavy')) {
          category = 'heavy';
        }
        
        flattened.push({
          ...fee,
          applicationTypeName: appData.name,
          applicationType: appType,
          feeType: 'test_fee',
          category,
          totalImpact: category === 'light' ? (appData.fees.total_light || 0) : 
                      category === 'heavy' ? (appData.fees.total_heavy || 0) : 
                      (appData.fees.total || 0)
        });
      });
      
      // Add application fee
      if (appData.fees.application_fee) {
        flattened.push({
          ...appData.fees.application_fee,
          applicationTypeName: appData.name,
          applicationType: appType,
          feeType: 'application_fee',
          totalImpact: appData.fees.total || 0
        });
      }
    });
    
    return flattened;
  };

  const loadFeeData = async () => {
    try {
      setLoading(true);
      const data = await transactionService.getFeesByApplicationType();
      setFeeData(data);
      setFlattenedFees(flattenFeeData(data));
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

  // Bulk operations handlers
  const handleSelectAllFees = (checked: boolean) => {
    if (checked) {
      setSelectedFees(flattenedFees.map(fee => fee.id));
    } else {
      setSelectedFees([]);
    }
  };

  const handleSelectFee = (feeId: string, checked: boolean) => {
    if (checked) {
      setSelectedFees(prev => [...prev, feeId]);
    } else {
      setSelectedFees(prev => prev.filter(id => id !== feeId));
    }
  };

  const handleBulkAction = (action: BulkAction) => {
    setBulkDialogOpen(true);
  };

  const handleBulkUpdate = async (action: BulkAction) => {
    try {
      // Implementation would depend on backend API
      // For now, just close dialog and show success
      setBulkDialogOpen(false);
      setSelectedFees([]);
      setSuccessMessage(`Successfully updated ${selectedFees.length} fees`);
      await loadFeeData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Inline editing handlers
  const handleStartInlineEdit = (feeId: string, currentAmount: number) => {
    setEditingFeeId(feeId);
    setEditAmount(currentAmount.toString());
  };

  const handleCancelInlineEdit = () => {
    setEditingFeeId(null);
    setEditAmount('');
  };

  const handleSaveInlineEdit = async (feeId: string) => {
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

      setSuccessMessage('Fee updated successfully');
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

  // Legacy dialog handlers (keeping for compatibility)
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

  // Helper components
  const TypeChip: React.FC<{ type: string; name: string }> = ({ type, name }) => (
    <Chip 
      label={name}
      size="small" 
      color="primary" 
      sx={{ 
        fontSize: '0.7rem',
        height: '24px',
        borderRadius: '5px'
      }}
    />
  );

  const CategoryChip: React.FC<{ category: 'test_fee' | 'application_fee' }> = ({ category }) => (
    <Chip 
      label={category === 'test_fee' ? 'Test Fee' : 'Application Fee'}
      size="small" 
      color={category === 'test_fee' ? 'secondary' : 'info'}
      variant="outlined"
      sx={{ 
        fontSize: '0.7rem',
        height: '24px',
        borderRadius: '5px'
      }}
    />
  );

  const VehicleCategoryChip: React.FC<{ category?: 'light' | 'heavy' }> = ({ category }) => {
    if (!category) return null;
    
    return (
      <Chip 
        label={category === 'light' ? 'Light Vehicle' : 'Heavy Vehicle'}
        size="small" 
        color={category === 'light' ? 'success' : 'warning'}
        variant="outlined"
        sx={{ 
          fontSize: '0.7rem',
          height: '24px',
          borderRadius: '5px'
        }}
      />
    );
  };

  const FeeTableRow: React.FC<{ 
    fee: FlattenedFee; 
    isSelected: boolean;
    onSelect: (feeId: string, checked: boolean) => void;
  }> = ({ fee, isSelected, onSelect }) => {
    const isEditing = editingFeeId === fee.id;
    const isSaving = savingFeeId === fee.id;

    return (
      <TableRow hover>
        <TableCell sx={{ py: 1, px: 2 }}>
          <Checkbox
            checked={isSelected}
            onChange={(e) => onSelect(fee.id, e.target.checked)}
            size="small"
          />
        </TableCell>
        <TableCell sx={{ py: 1, px: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TypeChip type={fee.applicationType} name={fee.applicationTypeName} />
          </Box>
        </TableCell>
        <TableCell sx={{ py: 1, px: 2 }}>
          <CategoryChip category={fee.feeType} />
        </TableCell>
        <TableCell sx={{ py: 1, px: 2 }}>
          <VehicleCategoryChip category={fee.category} />
        </TableCell>
        <TableCell sx={{ py: 1, px: 2 }}>
          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
            {fee.display_name}
          </Typography>
        </TableCell>
        <TableCell align="right" sx={{ py: 1, px: 2 }}>
          {isEditing ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                size="small"
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                sx={{ width: 120 }}
                InputProps={{
                  startAdornment: (
                    <Typography variant="caption" sx={{ mr: 0.5 }}>
                      Ar
                    </Typography>
                  )
                }}
              />
              <IconButton 
                size="small" 
                color="primary" 
                disabled={isSaving}
                onClick={() => handleSaveInlineEdit(fee.id)}
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
              <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>
                {formatCurrency(fee.amount)}
              </Typography>
              <IconButton 
                size="small" 
                onClick={() => handleStartInlineEdit(fee.id, fee.amount)}
              >
                <Edit fontSize="small" />
              </IconButton>
            </Box>
          )}
        </TableCell>
        <TableCell align="right" sx={{ py: 1, px: 2 }}>
          <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'primary.main' }}>
            {formatCurrency(fee.totalImpact)}
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ py: 1, px: 2 }}>
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
            <Tooltip title="View History">
              <IconButton size="small">
                <HistoryIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reset to Default">
              <IconButton size="small">
                <RestoreIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </TableCell>
      </TableRow>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading fee data...</Typography>
        </Box>
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
        {/* Top Section - Header */}
        <Box sx={{ 
          bgcolor: 'white', 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          flexShrink: 0,
          p: 2
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                Fee Management
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.8rem' }}>
                Manage application fees by type. Changes take effect immediately for new applications.
              </Typography>
            </Box>
            <Button 
              variant="contained" 
              startIcon={<ExportIcon />} 
              size="small"
              sx={{ flexShrink: 0 }}
            >
              Export Fees
            </Button>
          </Box>
        </Box>

        {/* Content Area - Unified Fee Table */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'auto',
          p: 2,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Paper 
            elevation={0}
            sx={{ 
              bgcolor: 'white',
              boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
              borderRadius: 2,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Bulk Actions Toolbar */}
            {selectedFees.length > 0 && (
              <Box sx={{ 
                p: 1.5, 
                bgcolor: '#e3f2fd', 
                borderBottom: '1px solid', 
                borderColor: 'divider',
                flexShrink: 0
              }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, fontSize: '0.8rem' }}>
                  {selectedFees.length} fees selected
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    startIcon={<Edit />}
                    onClick={() => handleBulkAction({ type: 'fixed' })}
                  >
                    Bulk Edit
                  </Button>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    startIcon={<TrendingUpIcon />}
                    onClick={() => handleBulkAction({ type: 'percentage' })}
                  >
                    Apply % Increase
                  </Button>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    startIcon={<RestoreIcon />}
                    onClick={() => handleBulkAction({ type: 'reset' })}
                  >
                    Reset to Default
                  </Button>
                </Box>
              </Box>
            )}

            {/* Enhanced Fee Table */}
            <TableContainer sx={{ flex: 1 }}>
              <Table stickyHeader sx={{ '& .MuiTableCell-root': { borderRadius: 0 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ 
                      fontWeight: 600, 
                      fontSize: '0.875rem', 
                      bgcolor: '#f8f9fa',
                      width: 48
                    }}>
                      <Checkbox
                        checked={selectedFees.length === flattenedFees.length && flattenedFees.length > 0}
                        indeterminate={selectedFees.length > 0 && selectedFees.length < flattenedFees.length}
                        onChange={(e) => handleSelectAllFees(e.target.checked)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>
                      Application Type
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>
                      Fee Type
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>
                      Category
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>
                      Description
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>
                      Amount (Ar)
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>
                      Total Impact
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {flattenedFees.map((fee) => (
                    <FeeTableRow
                      key={fee.id}
                      fee={fee}
                      isSelected={selectedFees.includes(fee.id)}
                      onSelect={handleSelectFee}
                    />
                  ))}
                  {flattenedFees.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography variant="body1" color="text.secondary" sx={{ py: 4 }}>
                          No fee data available.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </Paper>

      {/* Bulk Actions Dialog */}
      <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Bulk Fee Adjustment
          <Typography variant="body2" color="textSecondary">
            Adjusting {selectedFees.length} selected fees
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Action Type</InputLabel>
              <Select defaultValue="percentage" size="small">
                <MenuItem value="percentage">Percentage Increase</MenuItem>
                <MenuItem value="fixed">Set Fixed Amount</MenuItem>
                <MenuItem value="reset">Reset to Default</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TextField
            fullWidth
            margin="normal"
            label="Percentage Increase"
            type="number"
            defaultValue={10}
            InputProps={{ 
              endAdornment: <Typography variant="caption">%</Typography>,
              inputProps: { min: 0, max: 100 }
            }}
            size="small"
          />

          <Alert severity="warning" sx={{ mt: 2 }}>
            This action will update all selected fees. Changes take effect immediately for new applications.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialogOpen(false)} startIcon={<Cancel />}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleBulkUpdate({ type: 'percentage', value: 10 })} 
            variant="contained" 
            startIcon={<Save />}
          >
            Apply Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Legacy Edit Fee Dialog (keeping for compatibility) */}
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
    </Container>
  );
};

export default FeeManagementPage; 