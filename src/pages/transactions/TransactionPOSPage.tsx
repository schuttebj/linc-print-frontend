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
  Skeleton,
  Tabs,
  Tab,
  Container,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  FormHelperText
} from '@mui/material';
import {
  Search as SearchIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  Print as PrintIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  CreditCard as CreditCardIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CheckCircleIcon
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  // Location selection for admin users
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [availableLocations, setAvailableLocations] = useState<any[]>([]);

  const steps = [
    {
      label: 'Search & Select',
      icon: <PersonIcon />
    },
    {
      label: 'Payment Details',
      icon: <CreditCardIcon />
    },
    {
      label: 'Complete',
      icon: <CheckCircleIcon />
    }
  ];

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
      .reduce((sum, app) => {
        // Use Math.round to handle floating point precision issues
        return Math.round((sum + app.total_amount) * 100) / 100;
      }, 0);
    
    const cardOrdersTotal = personSummary.payable_card_orders
      .filter(order => selectedCardOrders.includes(order.id))
      .reduce((sum, order) => {
        // Use Math.round to handle floating point precision issues
        return Math.round((sum + order.fee_amount) * 100) / 100;
      }, 0);
    
    // Final rounding to ensure precision
    return Math.round((applicationsTotal + cardOrdersTotal) * 100) / 100;
  };

  const canProceedToPayment = (): boolean => {
    return selectedApplications.length > 0 || selectedCardOrders.length > 0;
  };

  // Step validation
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Search & Select
        return !!personSummary && 
               (personSummary.payable_applications.length > 0 || personSummary.payable_card_orders.length > 0) &&
               (selectedApplications.length > 0 || selectedCardOrders.length > 0);
      case 1: // Payment Details
        return !!paymentMethod && isLocationValid();
      case 2: // Complete
        return !!transaction;
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

  const handleProceedToPayment = () => {
    if (!canProceedToPayment()) {
      setError('Please select at least one item to pay for');
      return;
    }
    setActiveStep(1);
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
        payment_reference: paymentReference || undefined
      };

      const response = await transactionService.processPayment(paymentData);
      setTransaction(response.transaction);
      setSuccess(response.success_message);
      setActiveStep(2);
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

  const handlePrintA4Receipt = async () => {
    if (!transaction) return;
    
    try {
      const data = await transactionService.getTransactionReceipt(transaction.id);
      
      // Pre-format currency values
      const formattedItems = data.items.map((item: any) => ({
        ...item,
        formattedAmount: formatCurrency(item.amount)
      }));
      const formattedTotal = formatCurrency(data.total_amount);
      
      // Create the receipt content for printing
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt ${data.receipt_number}</title>
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
            
            .receipt-container {
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
            
            .header h3 {
              font-size: 14pt;
              margin: 5px 0;
            }
            
            .receipt-title {
              font-size: 16pt;
              font-weight: bold;
              border: 2px solid black;
              padding: 8px;
              background: #f5f5f5;
              margin: 20px 0;
            }
            
            .receipt-details {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 1px solid #ccc;
            }
            
            .customer-info {
              border: 1px solid black;
              padding: 15px;
              background: #f9f9f9;
              margin-bottom: 20px;
            }
            
            .customer-info h4 {
              font-size: 14pt;
              margin: 0 0 10px 0;
            }
            
            .payment-table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid black;
              margin-bottom: 20px;
            }
            
            .payment-table th,
            .payment-table td {
              border: 1px solid black;
              padding: 10px 8px;
              text-align: left;
            }
            
            .payment-table th {
              background: #e0e0e0;
              font-weight: bold;
              font-size: 11pt;
            }
            
            .payment-table .amount {
              text-align: right;
            }
            
            .payment-table .total-row {
              background: #f0f0f0;
              font-weight: bold;
              font-size: 12pt;
            }
            
            .payment-method {
              background: #f9f9f9;
              border: 1px solid #ccc;
              padding: 15px;
              margin-bottom: 30px;
            }
            
            .footer {
              text-align: center;
              border-top: 1px solid #ccc;
              padding-top: 15px;
              font-size: 10pt;
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
          <div class="receipt-container">
            <!-- Government Headers -->
            <div class="header">
              <h1>${data.government_header}</h1>
              <h2>${data.department_header}</h2>
              <h3>${data.office_header}</h3>
              <div class="receipt-title">${data.receipt_title}</div>
            </div>

            <!-- Receipt Details -->
            <div class="receipt-details">
              <div>
                <strong>Receipt No:</strong> ${data.receipt_number}<br>
                <strong>Transaction No:</strong> ${data.transaction_number}
              </div>
              <div style="text-align: right;">
                <strong>Date:</strong> ${data.date}<br>
                <strong>Location:</strong> ${data.location}
              </div>
            </div>

            <!-- Customer Information -->
            <div class="customer-info">
              <h4>Customer Information</h4>
              <strong>Name:</strong> ${data.person_name}<br>
              <strong>ID Number:</strong> ${data.person_id}
            </div>

            <!-- Payment Details -->
            <h4>Payment Details</h4>
            <table class="payment-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="amount">Amount (${data.currency})</th>
                </tr>
              </thead>
              <tbody>
                 ${formattedItems.map((item: any) => `
                   <tr>
                     <td>${item.description}</td>
                     <td class="amount">${item.formattedAmount}</td>
                   </tr>
                 `).join('')}
               </tbody>
               <tfoot>
                 <tr class="total-row">
                   <td>TOTAL</td>
                   <td class="amount">${formattedTotal}</td>
                 </tr>
               </tfoot>
            </table>

            <!-- Payment Method -->
            <div class="payment-method">
              <strong>Payment Method:</strong> ${data.payment_method}<br>
              ${data.payment_reference ? `<strong>Reference:</strong> ${data.payment_reference}<br>` : ''}
              <strong>Processed By:</strong> ${data.processed_by}
            </div>

            <!-- Footer -->
            <div class="footer">
              ${data.footer}<br>
              ${data.validity_note}<br>
              ${data.contact_info}
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
          }, 500);
        };
      }
    } catch (err: any) {
      setError('Failed to generate receipt for printing');
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

  const renderSearchAndSelectStep = () => (
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
        
        <Box display="flex" gap={2} alignItems="flex-start" mb={2}>
          <TextField
            label="ID Number"
            value={searchIdNumber}
            onChange={(e) => setSearchIdNumber(e.target.value)}
            placeholder="Enter Madagascar ID or passport number"
            disabled={isSearching}
            onKeyPress={(e) => e.key === 'Enter' && handleSearchPerson()}
            size="small"
            error={!!error && !searchIdNumber.trim()}
            sx={{ 
              flexGrow: 1,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderWidth: '1px',
                  borderColor: !!error && !searchIdNumber.trim() ? '#ff9800' : undefined,
                  transition: 'border-color 0.2s ease-in-out',
                },
                '&:hover fieldset': {
                  borderWidth: '1px',
                  borderColor: !!error && !searchIdNumber.trim() ? '#f57c00' : undefined,
                },
                '&.Mui-focused fieldset': {
                  borderWidth: '1px',
                  borderColor: !!error && !searchIdNumber.trim() ? '#ff9800' : undefined,
                },
              },
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearchPerson}
            disabled={isSearching || !searchIdNumber.trim()}
            startIcon={isSearching ? <CircularProgress size={16} /> : <SearchIcon />}
            size="small"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2, fontSize: '0.8rem' }}>
            {error}
          </Alert>
        )}

        {isSearching && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Skeleton variant="circular" width={24} height={24} />
              <Skeleton variant="text" width="40%" height={20} />
            </Box>
            <Skeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: 1 }} />
          </Box>
        )}
      </Paper>

      {/* Person Information & Selection */}
      {personSummary && renderSelectionContent()}
    </Box>
  );

  const renderSelectionContent = () => {
    if (!personSummary) return null;

    return (
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
          <Box display="flex" alignItems="center" mb={1}>
            <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>Person Information</Typography>
          </Box>
          <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
            <strong>Name:</strong> {personSummary.person_name}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
            <strong>ID Number:</strong> {personSummary.person_id_number}
          </Typography>
        </Paper>

        {/* Payable Applications */}
        {personSummary.payable_applications.length > 0 && (
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
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                Payable Applications
              </Typography>
              <Button
                size="small"
                onClick={handleSelectAllApplications}
                variant="contained"
                sx={{
                  borderWidth: '1px',
                  '&:hover': {
                    borderWidth: '1px',
                  },
                }}
              >
                {personSummary.payable_applications.every(app => 
                  selectedApplications.includes(app.id)
                ) ? 'Deselect All' : 'Select All'}
              </Button>
            </Box>

            <Paper 
              elevation={0}
              sx={{ 
                bgcolor: '#fafafa',
                borderRadius: 1,
                overflow: 'hidden'
              }}
            >
              <TableContainer>
                <Table size="small" sx={{ '& .MuiTableCell-root': { borderRadius: 0 } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        bgcolor: '#f8f9fa',
                        py: 1, 
                        px: 2
                      }}></TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        bgcolor: '#f8f9fa',
                        py: 1, 
                        px: 2
                      }}>Application #</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        bgcolor: '#f8f9fa',
                        py: 1, 
                        px: 2
                      }}>Type</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        bgcolor: '#f8f9fa',
                        py: 1, 
                        px: 2
                      }}>Category</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        bgcolor: '#f8f9fa',
                        py: 1, 
                        px: 2
                      }}>Status</TableCell>
                      <TableCell align="right" sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        bgcolor: '#f8f9fa',
                        py: 1, 
                        px: 2
                      }}>Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {personSummary.payable_applications.map((app) => (
                      <TableRow key={app.id} hover>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Checkbox
                            checked={selectedApplications.includes(app.id)}
                            onChange={(e) => handleApplicationSelection(app.id, e.target.checked)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {app.application_number}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {app.application_type.replace('_', ' ')}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {app.license_category}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Chip 
                            label={app.status} 
                            size="small" 
                            color="primary" 
                            sx={{ 
                              fontSize: '0.7rem', 
                              height: '24px'
                            }} 
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1, px: 2 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                            {formatCurrency(app.total_amount)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Paper>
        )}

        {/* Payable Card Orders */}
        {personSummary.payable_card_orders.length > 0 && (
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
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                Payable Card Orders
              </Typography>
              <Button
                size="small"
                onClick={handleSelectAllCardOrders}
                variant="contained"
                sx={{
                  borderWidth: '1px',
                  '&:hover': {
                    borderWidth: '1px',
                  },
                }}
              >
                {personSummary.payable_card_orders.every(order => 
                  selectedCardOrders.includes(order.id)
                ) ? 'Deselect All' : 'Select All'}
              </Button>
            </Box>

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
                <Table size="small" sx={{ '& .MuiTableCell-root': { borderRadius: 0 } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        bgcolor: '#f8f9fa',
                        py: 1, 
                        px: 2
                      }}></TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        bgcolor: '#f8f9fa',
                        py: 1, 
                        px: 2
                      }}>Order #</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        bgcolor: '#f8f9fa',
                        py: 1, 
                        px: 2
                      }}>Application #</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        bgcolor: '#f8f9fa',
                        py: 1, 
                        px: 2
                      }}>Card Type</TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        bgcolor: '#f8f9fa',
                        py: 1, 
                        px: 2
                      }}>Urgency</TableCell>
                      <TableCell align="right" sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.875rem',
                        bgcolor: '#f8f9fa',
                        py: 1, 
                        px: 2
                      }}>Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {personSummary.payable_card_orders.map((order) => (
                      <TableRow key={order.id} hover>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Checkbox
                            checked={selectedCardOrders.includes(order.id)}
                            onChange={(e) => handleCardOrderSelection(order.id, e.target.checked)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {order.order_number}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {order.application_number}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {order.card_type}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1, px: 2 }}>
                          <Chip 
                            label={order.urgency_level === 1 ? 'Normal' : 
                                  order.urgency_level === 2 ? 'Urgent' : 'Emergency'}
                            size="small"
                            color={order.urgency_level === 1 ? 'default' : 
                                  order.urgency_level === 2 ? 'warning' : 'error'}
                            sx={{ 
                              fontSize: '0.7rem', 
                              height: '24px'
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1, px: 2 }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                            {formatCurrency(order.fee_amount)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Paper>
        )}

        {/* Selection Summary */}
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
            Selection Summary
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
            Selected Applications: {selectedApplications.length}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 1 }}>
            Selected Card Orders: {selectedCardOrders.length}
          </Typography>
          <Divider sx={{ my: 1 }} />
          <Typography variant="h6" color="primary" sx={{ fontSize: '1rem', fontWeight: 600 }}>
            Total Amount: {formatCurrency(calculateSelectedTotal())}
          </Typography>
        </Paper>
      </>
    );
  };

  const renderPaymentStep = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Selected Items Summary */}
      {personSummary && (
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
            Selected Items Summary
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
            <strong>Customer:</strong> {personSummary.person_name} (ID: {personSummary.person_id_number})
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 0.5 }}>
            Selected Applications: {selectedApplications.length}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.8rem', mb: 1 }}>
            Selected Card Orders: {selectedCardOrders.length}
          </Typography>
          <Divider sx={{ my: 1 }} />
          <Typography variant="h6" color="primary" sx={{ fontSize: '1rem', fontWeight: 600 }}>
            Total Amount: {formatCurrency(calculateSelectedTotal())}
          </Typography>
        </Paper>
      )}

      {/* Payment Details */}
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
          Payment Details
        </Typography>
        
        {/* Location status for location users */}
        {user?.primary_location_id ? (
          <Alert severity="info" sx={{ mb: 2, fontSize: '0.8rem' }}>
            Processing payments for location: {user.primary_location_id}
          </Alert>
        ) : selectedLocationId ? (
          <Alert severity="success" sx={{ mb: 2, fontSize: '0.8rem' }}>
            Processing payments for selected location: {availableLocations.find(loc => loc.id === selectedLocationId)?.name}
          </Alert>
        ) : (
          <Alert severity="warning" sx={{ mb: 2, fontSize: '0.8rem' }}>
            Please select a location to process payments
          </Alert>
        )}
        
        {/* Location selection for admin users - Full width in its own section */}
        {user && !user.primary_location_id && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontSize: '0.9rem', fontWeight: 500, mb: 1 }}>
              Processing Location
            </Typography>
            <FormControl 
              fullWidth 
              required 
              size="small"
              error={!!error && !selectedLocationId}
            >
              <InputLabel>Location</InputLabel>
              <Select
                value={selectedLocationId}
                onChange={handleLocationChange}
                label="Location"
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderWidth: '1px',
                    borderColor: !!error && !selectedLocationId ? '#ff9800' : undefined,
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderWidth: '1px',
                    borderColor: !!error && !selectedLocationId ? '#f57c00' : undefined,
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderWidth: '1px',
                    borderColor: !!error && !selectedLocationId ? '#ff9800' : undefined,
                  },
                }}
              >
                {availableLocations.map((location) => (
                  <MenuItem key={location.id} value={location.id}>
                    {location.name} ({location.full_code})
                  </MenuItem>
                ))}
              </Select>
              {!!error && !selectedLocationId && (
                <FormHelperText>Please select a processing location</FormHelperText>
              )}
            </FormControl>
          </Box>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl 
              fullWidth 
              required 
              size="small"
              error={!!error && !paymentMethod}
            >
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                label="Payment Method"
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderWidth: '1px',
                    borderColor: !!error && !paymentMethod ? '#ff9800' : undefined,
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderWidth: '1px',
                    borderColor: !!error && !paymentMethod ? '#f57c00' : undefined,
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderWidth: '1px',
                    borderColor: !!error && !paymentMethod ? '#ff9800' : undefined,
                  },
                }}
              >
                {paymentMethods.map((method) => (
                  <MenuItem key={method.value} value={method.value}>
                    {method.label}
                  </MenuItem>
                ))}
              </Select>
              {!!error && !paymentMethod && (
                <FormHelperText>Please select a payment method</FormHelperText>
              )}
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              label="Payment Reference (Optional)"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Receipt #, Transaction ID, etc."
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
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mt: 2, fontSize: '0.8rem' }}>
          {error}
        </Alert>
      )}
    </Box>
  );

  const renderSuccessStep = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper 
        elevation={0}
        sx={{ 
          bgcolor: 'white',
          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
          borderRadius: 2,
          flex: '0 0 auto',
          p: 2,
          textAlign: 'center'
        }}
      >
        <CheckIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
        <Typography variant="h5" gutterBottom color="success.main" sx={{ fontSize: '1.3rem', fontWeight: 600 }}>
          Payment Successful!
        </Typography>
        
        {success && (
          <Alert severity="success" sx={{ mb: 2, fontSize: '0.8rem' }}>
            {success}
          </Alert>
        )}

        {transaction && (
          <Box sx={{ mb: 2, p: 1.5, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
            <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
              Transaction Details
            </Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  Transaction Number
                </Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.8rem' }}>
                  {transaction.transaction_number}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  Receipt Number
                </Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.8rem' }}>
                  {transaction.receipt_number}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  Amount Paid
                </Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.8rem' }}>
                  {formatCurrency(transaction.total_amount)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  Payment Method
                </Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.8rem' }}>
                  {paymentMethods.find(m => m.value === transaction.payment_method)?.label}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Mandatory Receipt Printing */}
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
          Receipt Required
        </Typography>
        
        <Alert severity="warning" sx={{ mb: 2, fontSize: '0.8rem' }}>
          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
            <strong>Important:</strong> You must print a receipt for this transaction before proceeding.
          </Typography>
        </Alert>

        <Box display="flex" gap={1} justifyContent="center">
          <Button
            variant="outlined"
            onClick={handlePrintReceipt}
            startIcon={<ReceiptIcon />}
            size="small"
          >
            Preview Receipt
          </Button>
          <Button
            variant="contained"
            onClick={handlePrintA4Receipt}
            startIcon={<PrintIcon />}
            color="primary"
            size="small"
          >
            Print Receipt
          </Button>
        </Box>
      </Paper>
    </Box>
  );

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
        {/* Tab Navigation */}
        <Box sx={{ 
          bgcolor: 'white', 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          flexShrink: 0 
        }}>
          <Tabs
            value={activeStep}
            onChange={handleTabChange}
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
                disabled={index > activeStep + 1 || (index === activeStep + 1 && !isStepValid(activeStep))}
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
          {activeStep === 0 && renderSearchAndSelectStep()}
          {activeStep === 1 && renderPaymentStep()}
          {activeStep === 2 && renderSuccessStep()}
        </Box>

        {/* Navigation Footer */}
        <Box sx={{ 
          p: 2, 
          bgcolor: 'white', 
          borderTop: '1px solid', 
          borderColor: 'divider',
          flexShrink: 0,
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: 1 
        }}>
          {activeStep > 0 && activeStep < 2 && (
            <Button
              onClick={() => setActiveStep(activeStep - 1)}
              disabled={isProcessing}
              size="small"
            >
              Back
            </Button>
          )}
          
          {activeStep < steps.length - 1 && (
            <Button
              variant="contained"
              onClick={() => setActiveStep(activeStep + 1)}
              disabled={!isStepValid(activeStep) || isProcessing}
              size="small"
            >
              {activeStep === 0 ? 'Proceed to Payment' : 'Next'}
            </Button>
          )}

          {activeStep === 1 && (
            <Button
              variant="contained"
              onClick={handleProcessPayment}
              disabled={!isStepValid(activeStep) || isProcessing}
              startIcon={isProcessing ? <CircularProgress size={16} /> : <PaymentIcon />}
              size="small"
            >
              {isProcessing ? 'Processing...' : `Process Payment`}
            </Button>
          )}

          {activeStep === 2 && (
            <Button
              variant="contained"
              onClick={handleStartNewTransaction}
              size="small"
            >
              New Transaction
            </Button>
          )}
        </Box>
      </Paper>

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
            onClick={handlePrintA4Receipt}
          >
            Print A4 Receipt
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TransactionPOSPage; 