import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TablePagination,
  Tooltip,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Divider,
  Skeleton,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Visibility as ViewIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { transactionService, Transaction, TransactionItem } from '../../services/transactionService';
import { formatCurrency } from '../../utils/currency';
import FilterBar, { FilterConfig, FilterValues } from '../../components/common/FilterBar';

// Filter configurations for TransactionListPage
const TRANSACTION_FILTER_CONFIGS: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [], // Will be populated from transactionService
  },
  {
    key: 'paymentMethod',
    label: 'Payment Method',
    type: 'select',
    options: [], // Will be populated from transactionService
  },
];

const TransactionListPage: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalResults, setTotalResults] = useState(0);

  // Filter state management for FilterBar
  const [searchValue, setSearchValue] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [filterConfigs, setFilterConfigs] = useState<FilterConfig[]>(TRANSACTION_FILTER_CONFIGS);

  // Date filters (handled separately until FilterBar supports dates)
  const [dateFilters, setDateFilters] = useState({
    dateFrom: null as Date | null,
    dateTo: null as Date | null
  });


  // Dialog states
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  // Expanded rows for transaction items
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Initialize filter options
  useEffect(() => {
    const statusOptions = transactionService.getTransactionStatuses().map(status => ({
      value: status.value,
      label: status.label
    }));
    
    const paymentMethodOptions = transactionService.getPaymentMethods().map(method => ({
      value: method.value,
      label: method.label
    }));

    setFilterConfigs([
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: statusOptions,
      },
      {
        key: 'paymentMethod',
        label: 'Payment Method',
        type: 'select',
        options: paymentMethodOptions,
      },
    ]);
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [page, rowsPerPage, searchValue, filterValues, dateFilters]);

  const loadTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        skip: page * rowsPerPage,
        limit: rowsPerPage === -1 ? undefined : rowsPerPage
      };

      if (filterValues.status) params.transaction_status = filterValues.status;
      if (filterValues.paymentMethod) params.payment_method = filterValues.paymentMethod;
      if (user?.user_type === 'LOCATION_USER' && user.primary_location_id) {
        params.location_id = user.primary_location_id;
      }

      const response = await transactionService.getTransactions(params);
      setTransactions(response);
      setTotalResults(response.length);
    } catch (err: any) {
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  // Handle FilterBar filter changes
  const handleFilterChange = (key: string, value: any) => {
    setFilterValues(prev => ({
      ...prev,
      [key]: value,
    }));
    setPage(0); // Reset to first page when filters change
  };

  // Handle search and clear for FilterBar
  const handleSearch = async () => {
    setPage(0);
    await loadTransactions();
  };

  const handleClear = () => {
    setSearchValue('');
    setFilterValues({});
    setDateFilters({
      dateFrom: null,
      dateTo: null
    });
    setPage(0);
  };

  const handleViewTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionDialog(true);
  };

  const handleViewReceipt = async (transaction: Transaction) => {
    try {
      const receipt = await transactionService.getTransactionReceipt(transaction.id);
      setReceiptData(receipt);
      setShowReceiptDialog(true);
    } catch (err: any) {
      setError('Failed to load receipt');
    }
  };

  const handlePrintA4Receipt = async () => {
    if (!receiptData) return;
    
    try {
      // Import API configuration
      const { getAuthToken, API_ENDPOINTS } = await import('../../config/api');
      
      // Generate PDF using the new document generation API
      const token = getAuthToken();
      const response = await fetch(API_ENDPOINTS.documentTest.customReceiptPdf, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(receiptData)
      });

      if (!response.ok) {
        throw new Error(`Failed to generate receipt: ${response.status}`);
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
            printWindow.close();
          }, 500);
        });
      }

      // Clean up URL after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 5000);

    } catch (err: any) {
      console.error('Failed to generate receipt:', err);
      setError('Failed to generate receipt for printing');
    }
  };

  const toggleRowExpansion = (transactionId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(transactionId)) {
      newExpanded.delete(transactionId);
    } else {
      newExpanded.add(transactionId);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'success';
      case 'PENDING': return 'warning';
      case 'CANCELLED': return 'error';
      case 'REFUNDED': return 'info';
      default: return 'default';
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'CASH': return 'success';
      case 'MOBILE_MONEY': return 'info';
      case 'CARD': return 'primary';
      case 'BANK_TRANSFER': return 'secondary';
      case 'CHEQUE': return 'warning';
      default: return 'default';
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
      const matchesSearch = 
        transaction.transaction_number.toLowerCase().includes(searchLower) ||
        transaction.receipt_number?.toLowerCase().includes(searchLower) ||
        transaction.payment_reference?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    if (filterValues.paymentMethod && transaction.payment_method !== filterValues.paymentMethod) {
      return false;
    }

    if (dateFilters.dateFrom || dateFilters.dateTo) {
      const transactionDate = parseISO(transaction.created_at);
      if (dateFilters.dateFrom && transactionDate < dateFilters.dateFrom) return false;
      if (dateFilters.dateTo && transactionDate > dateFilters.dateTo) return false;
    }

    return true;
  });

  // Skeleton loader component for transaction results
  const TransactionResultsSkeleton = () => (
    <TableContainer sx={{ flex: 1 }}>
      <Table stickyHeader sx={{ '& .MuiTableCell-root': { borderRadius: 0 } }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Transaction #</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Date</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Person</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Amount</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Payment Method</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Receipt</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: rowsPerPage }).map((_, index) => (
            <React.Fragment key={index}>
              <TableRow>
                <TableCell sx={{ py: 1, px: 2 }}>
                  <Box display="flex" alignItems="center">
                    <Skeleton variant="circular" width={24} height={24} sx={{ mr: 1 }} />
                    <Skeleton variant="text" width="100%" height={20} />
                  </Box>
                </TableCell>
                <TableCell sx={{ py: 1, px: 2 }}>
                  <Skeleton variant="text" width="100%" height={20} />
                </TableCell>
                <TableCell sx={{ py: 1, px: 2 }}>
                  <Skeleton variant="text" width="100%" height={20} />
                </TableCell>
                <TableCell sx={{ py: 1, px: 2 }}>
                  <Skeleton variant="text" width="80%" height={20} />
                </TableCell>
                <TableCell sx={{ py: 1, px: 2 }}>
                  <Skeleton variant="rounded" width={80} height={24} />
                </TableCell>
                <TableCell sx={{ py: 1, px: 2 }}>
                  <Skeleton variant="rounded" width={60} height={24} />
                </TableCell>
                <TableCell sx={{ py: 1, px: 2 }}>
                  <Skeleton variant="rounded" width={70} height={24} />
                </TableCell>
                <TableCell sx={{ py: 1, px: 2 }}>
                  <Box display="flex" gap={1}>
                    <Skeleton variant="circular" width={32} height={32} />
                    <Skeleton variant="circular" width={32} height={32} />
                  </Box>
                </TableCell>
              </TableRow>
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderTransactionDialog = () => (
    <Dialog
      open={showTransactionDialog}
      onClose={() => setShowTransactionDialog(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Transaction Details - {selectedTransaction?.transaction_number}
      </DialogTitle>
      <DialogContent>
        {selectedTransaction && (
          <Box>
            <Grid container spacing={2} mb={3}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Chip 
                  label={transactionService.formatTransactionStatus(selectedTransaction.status)}
                  color={getStatusColor(selectedTransaction.status) as any}
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Total Amount
                </Typography>
                <Typography variant="h6" color="primary">
                  {formatCurrency(selectedTransaction.total_amount)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Payment Method
                </Typography>
                <Typography variant="body1">
                  {selectedTransaction.payment_method ? 
                    transactionService.formatPaymentMethod(selectedTransaction.payment_method) : 
                    'Not specified'
                  }
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Receipt Number
                </Typography>
                <Typography variant="body1">
                  {selectedTransaction.receipt_number || 'Not generated'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Payment Reference
                </Typography>
                <Typography variant="body1">
                  {selectedTransaction.payment_reference || 'None'}
                </Typography>
              </Grid>
              {selectedTransaction.notes && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Notes
                  </Typography>
                  <Typography variant="body1">
                    {selectedTransaction.notes}
                  </Typography>
                </Grid>
              )}
            </Grid>

            <Divider sx={{ my: 2 }} />
            
            <Typography variant="h6" gutterBottom>
              Transaction Items
            </Typography>
            <List>
              {selectedTransaction.items?.map((item: TransactionItem, index: number) => (
                <ListItem key={item.id} divider={index < selectedTransaction.items.length - 1}>
                  <ListItemText
                    primary={item.description}
                    secondary={`Type: ${item.item_type}`}
                  />
                  <Typography variant="body1" fontWeight="bold">
                    {formatCurrency(item.amount)}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowTransactionDialog(false)}>
          Close
        </Button>
        {selectedTransaction && (
          <Button
            variant="contained"
            onClick={() => handleViewReceipt(selectedTransaction)}
            startIcon={<ReceiptIcon />}
          >
            View Receipt
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );

  const renderReceiptDialog = () => (
    <Dialog
      open={showReceiptDialog}
      onClose={() => setShowReceiptDialog(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <ReceiptIcon sx={{ mr: 1 }} />
          Payment Receipt
        </Box>
      </DialogTitle>
      <DialogContent>
        {receiptData && (
          <Box>
            <Typography variant="h6" gutterBottom textAlign="center">
              GOVERNMENT OF MADAGASCAR
            </Typography>
            <Typography variant="h6" gutterBottom textAlign="center">
              Driver's License Payment Receipt
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Receipt Number
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {receiptData.receipt_number}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Transaction Number
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {receiptData.transaction_number}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Date & Time
                </Typography>
                <Typography variant="body1">
                  {receiptData.date}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Location
                </Typography>
                <Typography variant="body1">
                  {receiptData.location}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Person Name
                </Typography>
                <Typography variant="body1">
                  {receiptData.person_name}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  ID Number
                </Typography>
                <Typography variant="body1">
                  {receiptData.person_id}
                </Typography>
              </Grid>
            </Grid>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="h6" gutterBottom>
              Items Paid
            </Typography>
            
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {receiptData.items?.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell align="right">
                      {formatCurrency(item.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell><strong>Total</strong></TableCell>
                  <TableCell align="right">
                    <strong>{formatCurrency(receiptData.total_amount)}</strong>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="body2" textAlign="center" style={{ marginTop: 16 }}>
              {receiptData.footer}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowReceiptDialog(false)}>
          Close
        </Button>
        <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrintA4Receipt}>
          Print
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <>
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
        {/* Search and Filter Section */}
        <Box sx={{ 
          bgcolor: 'white', 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          flexShrink: 0,
          p: 2
        }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
              Search Transactions
            </Typography>
            <Button
              variant="contained"
              onClick={loadTransactions}
              startIcon={<RefreshIcon />}
              size="small"
            >
              Refresh
            </Button>
          </Box>
          
          <FilterBar
            searchValue={searchValue}
            searchPlaceholder="Search by transaction #, receipt #, or reference"
            onSearchChange={setSearchValue}
            filterConfigs={filterConfigs}
            filterValues={filterValues}
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
            onClear={handleClear}
            searching={loading}
          />
        </Box>

        {/* Content Area */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'hidden',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ m: 2, flexShrink: 0 }}>
              {error}
            </Alert>
          )}

          {/* Transaction Table */}
          <Paper 
            elevation={0}
            sx={{ 
              bgcolor: 'white',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderRadius: 0
            }}
          >
            {/* Show skeleton while loading */}
            {loading ? (
              <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <TransactionResultsSkeleton />
                <TablePagination
                  component="div"
                  count={0}
                  page={page}
                  onPageChange={() => {}}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={() => {}}
                  rowsPerPageOptions={[10, 25, 50, { value: -1, label: 'All' }]}
                  sx={{
                    bgcolor: 'white',
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    flexShrink: 0,
                    '& .MuiTablePagination-toolbar': {
                      minHeight: '52px',
                    },
                    '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                      fontSize: '0.8rem',
                    },
                    '& .MuiTablePagination-select': {
                      fontSize: '0.8rem',
                    },
                  }}
                />
              </Box>
            ) : (
              /* Show results or no results message only after loading is complete */
              <>
                {filteredTransactions.length === 0 ? (
                  <Box sx={{ p: 2 }}>
                    <Alert severity="info">
                      No transactions found matching your search criteria. Try adjusting your search terms.
                    </Alert>
                  </Box>
                ) : (
                  <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <TableContainer sx={{ flex: 1 }}>
                      <Table stickyHeader sx={{ '& .MuiTableCell-root': { borderRadius: 0 } }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Transaction #</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Person</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Amount</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Payment Method</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Receipt</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredTransactions.map((transaction) => (
                            <React.Fragment key={transaction.id}>
                              <TableRow hover>
                                <TableCell sx={{ py: 1, px: 2 }}>
                                  <Box display="flex" alignItems="center">
                                    <IconButton
                                      size="small"
                                      onClick={() => toggleRowExpansion(transaction.id)}
                                    >
                                      {expandedRows.has(transaction.id) ? 
                                        <ExpandLessIcon /> : <ExpandMoreIcon />
                                      }
                                    </IconButton>
                                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                      {transaction.transaction_number}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ py: 1, px: 2 }}>
                                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                    {format(parseISO(transaction.created_at), 'yyyy-MM-dd HH:mm')}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 1, px: 2 }}>
                                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                    Person #{transaction.person_id.slice(0, 8)}...
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 1, px: 2 }}>
                                  <Typography variant="body2" fontWeight="bold" color="primary" sx={{ fontSize: '0.8rem' }}>
                                    {formatCurrency(transaction.total_amount)}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 1, px: 2 }}>
                                  {transaction.payment_method && (
                                    <Chip
                                      label={transactionService.formatPaymentMethod(transaction.payment_method)}
                                      color={getPaymentMethodColor(transaction.payment_method) as any}
                                      size="small"
                                    />
                                  )}
                                </TableCell>
                                <TableCell sx={{ py: 1, px: 2 }}>
                                  <Chip
                                    label={transactionService.formatTransactionStatus(transaction.status)}
                                    color={getStatusColor(transaction.status) as any}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell sx={{ py: 1, px: 2 }}>
                                  {transaction.receipt_number && (
                                    <Chip
                                      label={transaction.receipt_printed ? 'Printed' : 'Available'}
                                      color={transaction.receipt_printed ? 'success' : 'warning'}
                                      size="small"
                                    />
                                  )}
                                </TableCell>
                                <TableCell sx={{ py: 1, px: 2 }}>
                                  <Box display="flex" gap={1}>
                                    <Tooltip title="View Details">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleViewTransaction(transaction)}
                                      >
                                        <ViewIcon />
                                      </IconButton>
                                    </Tooltip>
                                    {transaction.receipt_number && (
                                      <Tooltip title="View Receipt">
                                        <IconButton
                                          size="small"
                                          onClick={() => handleViewReceipt(transaction)}
                                        >
                                          <ReceiptIcon />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                  </Box>
                                </TableCell>
                            </TableRow>
                              
                              {/* Expanded row with transaction items */}
                              <TableRow>
                                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                                  <Collapse in={expandedRows.has(transaction.id)} timeout="auto" unmountOnExit>
                                    <Box margin={1}>
                                      <Typography variant="h6" gutterBottom component="div" sx={{ fontSize: '0.875rem' }}>
                                        Transaction Items
                                      </Typography>
                                      <Table size="small">
                                        <TableHead>
                                          <TableRow>
                                            <TableCell sx={{ fontSize: '0.75rem' }}>Description</TableCell>
                                            <TableCell sx={{ fontSize: '0.75rem' }}>Type</TableCell>
                                            <TableCell align="right" sx={{ fontSize: '0.75rem' }}>Amount</TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {transaction.items?.map((item) => (
                                            <TableRow key={item.id}>
                                              <TableCell sx={{ fontSize: '0.75rem' }}>{item.description}</TableCell>
                                              <TableCell sx={{ fontSize: '0.75rem' }}>{item.item_type.replace('_', ' ')}</TableCell>
                                              <TableCell align="right" sx={{ fontSize: '0.75rem' }}>
                                                {formatCurrency(item.amount)}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </Box>
                                  </Collapse>
                                </TableCell>
                              </TableRow>
                            </React.Fragment>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <TablePagination
                      component="div"
                      count={totalResults}
                      page={page}
                      onPageChange={(_event: unknown, newPage: number) => setPage(newPage)}
                      rowsPerPage={rowsPerPage}
                      onRowsPerPageChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                        setRowsPerPage(parseInt(event.target.value, 10));
                        setPage(0);
                      }}
                      rowsPerPageOptions={[10, 25, 50, { value: -1, label: 'All' }]}
                      sx={{
                        bgcolor: 'white',
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        flexShrink: 0,
                        '& .MuiTablePagination-toolbar': {
                          minHeight: '52px',
                        },
                        '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                          fontSize: '0.8rem',
                        },
                        '& .MuiTablePagination-select': {
                          fontSize: '0.8rem',
                        },
                      }}
                    />
                  </Box>
                )}
              </>
            )}
          </Paper>
        </Box>
      </Paper>
    </Container>

    {renderTransactionDialog()}
    {renderReceiptDialog()}
    </>
  );
};

export default TransactionListPage; 