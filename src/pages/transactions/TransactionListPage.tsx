import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Pagination,
  Tooltip,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Receipt as ReceiptIcon,
  Visibility as ViewIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { transactionService, Transaction, TransactionItem } from '../../services/transactionService';
import { formatCurrency } from '../../utils/currency';

const TransactionListPage: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(25);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    paymentMethod: '',
    locationId: '',
    dateFrom: null as Date | null,
    dateTo: null as Date | null
  });
  const [showFilters, setShowFilters] = useState(false);

  // Dialog states
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  // Expanded rows for transaction items
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTransactions();
  }, [page, filters]);

  const loadTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        skip: (page - 1) * itemsPerPage,
        limit: itemsPerPage
      };

      if (filters.status) params.transaction_status = filters.status;
      if (filters.locationId) params.location_id = filters.locationId;
      if (user?.user_type === 'LOCATION_USER' && user.primary_location_id) {
        params.location_id = user.primary_location_id;
      }

      const response = await transactionService.getTransactions(params);
      setTransactions(response);
      
      // Calculate total pages (this would come from backend in real implementation)
      setTotalPages(Math.ceil(response.length / itemsPerPage));
    } catch (err: any) {
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(1); // Reset to first page when filters change
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
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        transaction.transaction_number.toLowerCase().includes(searchLower) ||
        transaction.receipt_number?.toLowerCase().includes(searchLower) ||
        transaction.payment_reference?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    if (filters.paymentMethod && transaction.payment_method !== filters.paymentMethod) {
      return false;
    }

    if (filters.dateFrom || filters.dateTo) {
      const transactionDate = parseISO(transaction.created_at);
      if (filters.dateFrom && transactionDate < filters.dateFrom) return false;
      if (filters.dateTo && transactionDate > filters.dateTo) return false;
    }

    return true;
  });

  const renderFilters = () => (
    <Collapse in={showFilters}>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Search"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Transaction #, Receipt #, Reference"
                InputProps={{
                  endAdornment: <SearchIcon />
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  {transactionService.getTransactionStatuses().map(status => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={filters.paymentMethod}
                  onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
                  label="Payment Method"
                >
                  <MenuItem value="">All Methods</MenuItem>
                  {transactionService.getPaymentMethods().map(method => (
                    <MenuItem key={method.value} value={method.value}>
                      {method.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Date From"
                  value={filters.dateFrom}
                  onChange={(date) => handleFilterChange('dateFrom', date)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Date To"
                  value={filters.dateTo}
                  onChange={(date) => handleFilterChange('dateTo', date)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12} md={1}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setFilters({
                  search: '',
                  status: '',
                  paymentMethod: '',
                  locationId: '',
                  dateFrom: null,
                  dateTo: null
                })}
              >
                Clear
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Collapse>
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
        <Button variant="contained" startIcon={<PrintIcon />}>
          Print
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Transaction History
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            onClick={() => setShowFilters(!showFilters)}
            startIcon={<FilterIcon />}
          >
            Filters
          </Button>
          <Button
            variant="outlined"
            onClick={loadTransactions}
            startIcon={<RefreshIcon />}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {renderFilters()}

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Transaction #</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Person</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Payment Method</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Receipt</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      Loading transactions...
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <React.Fragment key={transaction.id}>
                      <TableRow hover>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <IconButton
                              size="small"
                              onClick={() => toggleRowExpansion(transaction.id)}
                            >
                              {expandedRows.has(transaction.id) ? 
                                <ExpandLessIcon /> : <ExpandMoreIcon />
                              }
                            </IconButton>
                            {transaction.transaction_number}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {format(parseISO(transaction.created_at), 'yyyy-MM-dd HH:mm')}
                        </TableCell>
                        <TableCell>
                          {/* Person name would come from backend relationship */}
                          Person #{transaction.person_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold" color="primary">
                            {formatCurrency(transaction.total_amount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {transaction.payment_method && (
                            <Chip
                              label={transactionService.formatPaymentMethod(transaction.payment_method)}
                              color={getPaymentMethodColor(transaction.payment_method) as any}
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={transactionService.formatTransactionStatus(transaction.status)}
                            color={getStatusColor(transaction.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {transaction.receipt_number && (
                            <Chip
                              label={transaction.receipt_printed ? 'Printed' : 'Available'}
                              color={transaction.receipt_printed ? 'success' : 'warning'}
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell>
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
                              <Typography variant="h6" gutterBottom component="div">
                                Transaction Items
                              </Typography>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Description</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell align="right">Amount</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {transaction.items?.map((item) => (
                                    <TableRow key={item.id}>
                                      <TableCell>{item.description}</TableCell>
                                      <TableCell>{item.item_type.replace('_', ' ')}</TableCell>
                                      <TableCell align="right">
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
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {filteredTransactions.length > 0 && (
            <Box display="flex" justifyContent="center" mt={2}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {renderTransactionDialog()}
      {renderReceiptDialog()}
    </Box>
  );
};

export default TransactionListPage; 