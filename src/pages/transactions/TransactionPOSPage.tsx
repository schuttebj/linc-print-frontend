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
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Chip,
  Divider,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Search as SearchIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  Print as PrintIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { transactionService } from '../../services/transactionService';
import { formatCurrency } from '../../utils/currency';
import { getAuthToken, API_ENDPOINTS } from '../../config/api';

interface PersonPaymentSummary {
  person_id: string;
  person_name: string;
  person_id_number: string;
  payable_applications: PayableApplicationItem[];
  payable_card_orders: PayableCardOrderItem[];
  total_applications_amount: number;
  total_card_orders_amount: number;
  grand_total_amount: number;
}

interface PayableApplicationItem {
  id: string;
  application_number: string;
  application_type: string;
  license_category: string;
  status: string;
  fees: any[];
  total_amount: number;
}

interface PayableCardOrderItem {
  id: string;
  order_number: string;
  card_type: string;
  urgency_level: number;
  fee_amount: number;
  application_number: string;
  application_type: string;
}

interface PaymentMethod {
  value: string;
  label: string;
}

const paymentMethods: PaymentMethod[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CARD', label: 'Credit/Debit Card' },
  { value: 'CHEQUE', label: 'Cheque' }
];

const TransactionPOSPage: React.FC = () => {
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [searchIdNumber, setSearchIdNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [personSummary, setPersonSummary] = useState<PersonPaymentSummary | null>(null);
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [selectedCardOrders, setSelectedCardOrders] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  // Location selection for admin users
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [availableLocations, setAvailableLocations] = useState<any[]>([]);

  const steps = ['Search Person', 'Select Items', 'Payment Details', 'Process Payment'];

  // Load available locations for admin users
  useEffect(() => {
    const loadLocations = async () => {
      if (user && !user.primary_location_id) {
        try {
          const token = getAuthToken();
          if (!token) return;

          const response = await fetch(API_ENDPOINTS.locations, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if (response.ok) {
            const data = await response.json();
            setAvailableLocations(data.locations || []);
          }
        } catch (error) {
          console.error('Error loading locations:', error);
        }
      }
    };
    loadLocations();
  }, [user]);

  // Helper functions for location management
  const handleLocationChange = (event: any) => {
    setSelectedLocationId(event.target.value);
    setError('');
  };

  // Get location ID to use
  const getLocationId = (): string => {
    return user?.primary_location_id || selectedLocationId;
  };

  // Check if location is required and valid
  const isLocationValid = (): boolean => {
    return !!user?.primary_location_id || !!selectedLocationId;
  };

  const handleSearchPerson = async () => {
    if (!searchIdNumber.trim()) {
      setError('Please enter an ID number');
      return;
    }

    setIsSearching(true);
    setError(null);
    
    try {
      const summary = await transactionService.searchPersonForPayment(searchIdNumber.trim());
      setPersonSummary(summary);
      
      if (summary.payable_applications.length === 0 && summary.payable_card_orders.length === 0) {
        setError('No payable items found for this person');
      } else {
        setActiveStep(1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search for person');
      setPersonSummary(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleApplicationSelection = (applicationId: string, checked: boolean) => {
    if (checked) {
      setSelectedApplications(prev => [...prev, applicationId]);
    } else {
      setSelectedApplications(prev => prev.filter(id => id !== applicationId));
    }
  };

  const handleCardOrderSelection = (cardOrderId: string, checked: boolean) => {
    if (checked) {
      setSelectedCardOrders(prev => [...prev, cardOrderId]);
    } else {
      setSelectedCardOrders(prev => prev.filter(id => id !== cardOrderId));
    }
  };

  const handleSelectAllApplications = () => {
    if (!personSummary) return;
    
    const allSelected = personSummary.payable_applications.every(app => 
      selectedApplications.includes(app.id)
    );
    
    if (allSelected) {
      setSelectedApplications(prev => 
        prev.filter(id => !personSummary.payable_applications.some(app => app.id === id))
      );
    } else {
      setSelectedApplications(prev => [
        ...prev.filter(id => !personSummary.payable_applications.some(app => app.id === id)),
        ...personSummary.payable_applications.map(app => app.id)
      ]);
    }
  };

  const handleSelectAllCardOrders = () => {
    if (!personSummary) return;
    
    const allSelected = personSummary.payable_card_orders.every(order => 
      selectedCardOrders.includes(order.id)
    );
    
    if (allSelected) {
      setSelectedCardOrders(prev => 
        prev.filter(id => !personSummary.payable_card_orders.some(order => order.id === id))
      );
    } else {
      setSelectedCardOrders(prev => [
        ...prev.filter(id => !personSummary.payable_card_orders.some(order => order.id === id)),
        ...personSummary.payable_card_orders.map(order => order.id)
      ]);
    }
  };

  const calculateSelectedTotal = (): number => {
    if (!personSummary) return 0;
    
    const applicationsTotal = personSummary.payable_applications
      .filter(app => selectedApplications.includes(app.id))
      .reduce((sum, app) => sum + app.total_amount, 0);
    
    const cardOrdersTotal = personSummary.payable_card_orders
      .filter(order => selectedCardOrders.includes(order.id))
      .reduce((sum, order) => sum + order.fee_amount, 0);
    
    return applicationsTotal + cardOrdersTotal;
  };

  const canProceedToPayment = (): boolean => {
    return selectedApplications.length > 0 || selectedCardOrders.length > 0;
  };

  const handleProceedToPayment = () => {
    if (!canProceedToPayment()) {
      setError('Please select at least one item to pay for');
      return;
    }
    setActiveStep(2);
  };

  const handleProcessPayment = async () => {
    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    if (!personSummary) {
      setError('No person selected for payment');
      return;
    }

    if (!isLocationValid()) {
      setError('Please select a location before proceeding with payment.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const paymentData = {
        person_id: personSummary.person_id,
        location_id: getLocationId(),
        application_ids: selectedApplications,
        card_order_ids: selectedCardOrders,
        payment_method: paymentMethod,
        payment_reference: paymentReference || undefined,
        notes: notes || undefined
      };

      const response = await transactionService.processPayment(paymentData);
      setTransaction(response.transaction);
      setSuccess(response.success_message);
      setActiveStep(3);
    } catch (err: any) {
      setError(err.message || 'Failed to process payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (!transaction) return;
    
    try {
      const data = await transactionService.getTransactionReceipt(transaction.id);
      setReceiptData(data);
      setShowReceipt(true);
    } catch (err: any) {
      setError('Failed to generate receipt');
    }
  };

  const handleStartNewTransaction = () => {
    setActiveStep(0);
    setSearchIdNumber('');
    setPersonSummary(null);
    setSelectedApplications([]);
    setSelectedCardOrders([]);
    setPaymentMethod('');
    setPaymentReference('');
    setNotes('');
    setTransaction(null);
    setError(null);
    setSuccess(null);
    setShowReceipt(false);
    setReceiptData(null);
    // Reset location selection for admin users
    if (!user?.primary_location_id) {
      setSelectedLocationId('');
    }
  };

  const renderSearchStep = () => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <PersonIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Search Person by ID Number</Typography>
        </Box>
        
        <Box display="flex" gap={2} alignItems="center">
          <TextField
            label="ID Number"
            value={searchIdNumber}
            onChange={(e) => setSearchIdNumber(e.target.value)}
            placeholder="Enter Madagascar ID or passport number"
            disabled={isSearching}
            onKeyPress={(e) => e.key === 'Enter' && handleSearchPerson()}
            sx={{ flexGrow: 1 }}
          />
          <Button
            variant="contained"
            onClick={handleSearchPerson}
            disabled={isSearching || !searchIdNumber.trim()}
            startIcon={isSearching ? <CircularProgress size={20} /> : <SearchIcon />}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const renderSelectionStep = () => {
    if (!personSummary) return null;

    return (
      <Box>
        {/* Person Information */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={1}>
              <PersonIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Person Information</Typography>
            </Box>
            <Typography variant="body1">
              <strong>Name:</strong> {personSummary.person_name}
            </Typography>
            <Typography variant="body1">
              <strong>ID Number:</strong> {personSummary.person_id_number}
            </Typography>
          </CardContent>
        </Card>

        {/* Payable Applications */}
        {personSummary.payable_applications.length > 0 && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
                <Typography variant="h6">Payable Applications</Typography>
                <Button
                  size="small"
                  onClick={handleSelectAllApplications}
                  variant="outlined"
                >
                  {personSummary.payable_applications.every(app => 
                    selectedApplications.includes(app.id)
                  ) ? 'Deselect All' : 'Select All'}
                </Button>
              </Box>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell></TableCell>
                      <TableCell>Application #</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {personSummary.payable_applications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedApplications.includes(app.id)}
                            onChange={(e) => handleApplicationSelection(app.id, e.target.checked)}
                          />
                        </TableCell>
                        <TableCell>{app.application_number}</TableCell>
                        <TableCell>{app.application_type.replace('_', ' ')}</TableCell>
                        <TableCell>{app.license_category}</TableCell>
                        <TableCell>
                          <Chip label={app.status} size="small" color="primary" />
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(app.total_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {/* Payable Card Orders */}
        {personSummary.payable_card_orders.length > 0 && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
                <Typography variant="h6">Payable Card Orders</Typography>
                <Button
                  size="small"
                  onClick={handleSelectAllCardOrders}
                  variant="outlined"
                >
                  {personSummary.payable_card_orders.every(order => 
                    selectedCardOrders.includes(order.id)
                  ) ? 'Deselect All' : 'Select All'}
                </Button>
              </Box>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell></TableCell>
                      <TableCell>Order #</TableCell>
                      <TableCell>Application #</TableCell>
                      <TableCell>Card Type</TableCell>
                      <TableCell>Urgency</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {personSummary.payable_card_orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedCardOrders.includes(order.id)}
                            onChange={(e) => handleCardOrderSelection(order.id, e.target.checked)}
                          />
                        </TableCell>
                        <TableCell>{order.order_number}</TableCell>
                        <TableCell>{order.application_number}</TableCell>
                        <TableCell>{order.card_type}</TableCell>
                        <TableCell>
                          <Chip 
                            label={order.urgency_level === 1 ? 'Normal' : 
                                  order.urgency_level === 2 ? 'Urgent' : 'Emergency'}
                            size="small"
                            color={order.urgency_level === 1 ? 'default' : 
                                  order.urgency_level === 2 ? 'warning' : 'error'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(order.fee_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        {/* Selection Summary */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Selection Summary</Typography>
            <Typography variant="body1">
              Selected Applications: {selectedApplications.length}
            </Typography>
            <Typography variant="body1">
              Selected Card Orders: {selectedCardOrders.length}
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="h6" color="primary">
              Total Amount: {formatCurrency(calculateSelectedTotal())}
            </Typography>
          </CardContent>
        </Card>

        <Box mt={2} display="flex" justifyContent="space-between">
          <Button onClick={() => setActiveStep(0)}>
            Back to Search
          </Button>
          <Button
            variant="contained"
            onClick={handleProceedToPayment}
            disabled={!canProceedToPayment()}
          >
            Proceed to Payment
          </Button>
        </Box>
      </Box>
    );
  };

  const renderPaymentStep = () => (
    <Box>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Payment Details</Typography>
          
          {/* Location status for location users */}
          {user?.primary_location_id ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              Processing payments for location: {user.primary_location_id}
            </Alert>
          ) : selectedLocationId ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              Processing payments for selected location: {availableLocations.find(loc => loc.id === selectedLocationId)?.name}
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Please select a location to process payments
            </Alert>
          )}
          
          <Grid container spacing={3}>
            {/* Location selection for admin users */}
            {user && !user.primary_location_id && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Location</InputLabel>
                  <Select
                    value={selectedLocationId}
                    onChange={handleLocationChange}
                    label="Location"
                  >
                    {availableLocations.map((location) => (
                      <MenuItem key={location.id} value={location.id}>
                        {location.name} ({location.full_code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  label="Payment Method"
                >
                  {paymentMethods.map((method) => (
                    <MenuItem key={method.value} value={method.value}>
                      {method.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Payment Reference (Optional)"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Receipt #, Transaction ID, etc."
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes (Optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes about this payment..."
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Payment Summary */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Payment Summary</Typography>
          <Typography variant="h5" color="primary">
            Total Amount: {formatCurrency(calculateSelectedTotal())}
          </Typography>
        </CardContent>
      </Card>

      <Box mt={2} display="flex" justifyContent="space-between">
        <Button onClick={() => setActiveStep(1)}>
          Back to Selection
        </Button>
        <Button
          variant="contained"
          onClick={handleProcessPayment}
          disabled={isProcessing || !paymentMethod}
          startIcon={isProcessing ? <CircularProgress size={20} /> : <PaymentIcon />}
          color="success"
        >
          {isProcessing ? 'Processing...' : `Process Payment (${formatCurrency(calculateSelectedTotal())})`}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );

  const renderSuccessStep = () => (
    <Box textAlign="center">
      <CheckIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
      <Typography variant="h4" gutterBottom color="success.main">
        Payment Successful!
      </Typography>
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {transaction && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Transaction Details</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Transaction Number
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {transaction.transaction_number}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Receipt Number
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {transaction.receipt_number}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Amount Paid
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {formatCurrency(transaction.total_amount)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Payment Method
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {paymentMethods.find(m => m.value === transaction.payment_method)?.label}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <Box display="flex" gap={2} justifyContent="center">
        <Button
          variant="contained"
          onClick={handlePrintReceipt}
          startIcon={<PrintIcon />}
          color="primary"
        >
          Print Receipt
        </Button>
        <Button
          variant="outlined"
          onClick={handleStartNewTransaction}
        >
          New Transaction
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Point of Sale - Payment Processing
      </Typography>

      <Box mb={4}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {activeStep === 0 && renderSearchStep()}
      {activeStep === 1 && renderSelectionStep()}
      {activeStep === 2 && renderPaymentStep()}
      {activeStep === 3 && renderSuccessStep()}

      {/* Receipt Dialog */}
      <Dialog
        open={showReceipt}
        onClose={() => setShowReceipt(false)}
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
          {receiptData ? (
            <Box sx={{ 
              p: 3, 
              fontFamily: 'Arial, sans-serif',
              backgroundColor: 'white',
              minHeight: '800px',
              '@media print': {
                minHeight: '297mm',
                width: '210mm',
                padding: '20mm'
              }
            }}>
              {/* Government Headers */}
              <Box textAlign="center" mb={3}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  {receiptData.government_header}
                </Typography>
                <Typography variant="h5" gutterBottom>
                  {receiptData.department_header}
                </Typography>
                <Typography variant="h6" gutterBottom>
                  {receiptData.office_header}
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="primary" sx={{ mt: 2, mb: 3 }}>
                  {receiptData.receipt_title}
                </Typography>
              </Box>

              {/* Receipt Details */}
              <Box display="flex" justifyContent="space-between" mb={3}>
                <Box>
                  <Typography><strong>Receipt No:</strong> {receiptData.receipt_number}</Typography>
                  <Typography><strong>Transaction No:</strong> {receiptData.transaction_number}</Typography>
                </Box>
                <Box textAlign="right">
                  <Typography><strong>Date:</strong> {receiptData.date}</Typography>
                  <Typography><strong>Location:</strong> {receiptData.location}</Typography>
                </Box>
              </Box>

              {/* Person Details */}
              <Box mb={3} p={2} border={1} borderColor="grey.300">
                <Typography variant="h6" gutterBottom>Customer Information</Typography>
                <Typography><strong>Name:</strong> {receiptData.person_name}</Typography>
                <Typography><strong>ID Number:</strong> {receiptData.person_id}</Typography>
              </Box>

              {/* Payment Items */}
              <Box mb={3}>
                <Typography variant="h6" gutterBottom>Payment Details</Typography>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #000' }}>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Description</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>Amount ({receiptData.currency})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptData.items.map((item: any, index: number) => (
                      <tr key={index} style={{ borderBottom: '1px solid #ccc' }}>
                        <td style={{ padding: '8px' }}>{item.description}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #000', fontWeight: 'bold' }}>
                      <td style={{ padding: '8px' }}>TOTAL</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(receiptData.total_amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </Box>

              {/* Payment Method */}
              <Box mb={3} p={2} bgcolor="grey.100">
                <Typography><strong>Payment Method:</strong> {receiptData.payment_method}</Typography>
                {receiptData.payment_reference && (
                  <Typography><strong>Reference:</strong> {receiptData.payment_reference}</Typography>
                )}
                <Typography><strong>Processed By:</strong> {receiptData.processed_by}</Typography>
              </Box>

              {/* Footer */}
              <Box mt={4} textAlign="center">
                <Typography variant="body2" gutterBottom>{receiptData.footer}</Typography>
                <Typography variant="body2" gutterBottom>{receiptData.validity_note}</Typography>
                <Typography variant="body2">{receiptData.contact_info}</Typography>
              </Box>
            </Box>
          ) : (
            <Typography>Loading receipt...</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReceipt(false)}>Close</Button>
          <Button 
            variant="contained" 
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
          >
            Print A4 Receipt
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TransactionPOSPage; 