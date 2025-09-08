import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Skeleton,
  Container,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Visibility as VisibilityIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL, getAuthToken } from '../../config/api';

// Types
interface OverdueApplication {
  id: string;
  application_number: string;
  application_type: string;
  person_name: string;
  person_id_number: string;
  ready_for_collection_date: string;
  days_overdue: number;
  card_number: string;
  print_job_number: string;
  print_location: string;
}

interface OverdueResponse {
  applications: OverdueApplication[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
  destruction_info: {
    cutoff_date: string;
    cutoff_days: number;
    message: string;
  };
}

const CardDestructionPage: React.FC = () => {
  const { user } = useAuth();
  
  // Table state
  const [overdueCards, setOverdueCards] = useState<OverdueApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  
  // Destruction dialog
  const [selectedCard, setSelectedCard] = useState<OverdueApplication | null>(null);
  const [showDestructionDialog, setShowDestructionDialog] = useState(false);
  const [destructionReason, setDestructionReason] = useState('Non-collection after 3 months');
  const [destructionNotes, setDestructionNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Auto-refresh
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Load overdue cards
  const loadOverdueCards = async (pageNum: number = page + 1, pageSize: number = rowsPerPage) => {
    try {
      setError(null);
      
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/v1/printing/destruction/overdue?page=${pageNum}&page_size=${pageSize}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to load overdue cards');
      }

      const data: OverdueResponse = await response.json();
      setOverdueCards(data.applications);
      setTotalCount(data.total_count);
      setLastRefresh(new Date());

    } catch (error: any) {
      setError(error.message);
      setOverdueCards([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadOverdueCards();
  }, [page, rowsPerPage]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      loadOverdueCards();
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [page, rowsPerPage]);

  // Handle page change
  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle manual refresh
  const handleRefresh = () => {
    setLoading(true);
    loadOverdueCards();
  };

  // Open destruction dialog
  const handleOpenDestruction = (card: OverdueApplication) => {
    setSelectedCard(card);
    setDestructionReason('Non-collection after 3 months');
    setDestructionNotes('');
    setShowDestructionDialog(true);
  };

  // Close destruction dialog
  const handleCloseDestruction = () => {
    setSelectedCard(null);
    setShowDestructionDialog(false);
    setDestructionReason('Non-collection after 3 months');
    setDestructionNotes('');
  };

  // Process card destruction
  const handleDestroyCard = async () => {
    if (!selectedCard) return;

    setProcessing(true);
    setError(null);

    try {
      const token = getAuthToken();
      
      const response = await fetch(`${API_BASE_URL}/api/v1/printing/destruction/destroy/${selectedCard.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          destruction_reason: destructionReason,
          destruction_notes: destructionNotes
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Card destruction failed');
      }

      const data = await response.json();
      setSuccess(`Card successfully destroyed: ${data.application_number}`);
      
      // Close dialog and refresh data
      handleCloseDestruction();
      loadOverdueCards();

    } catch (error: any) {
      setError(error.message);
    } finally {
      setProcessing(false);
    }
  };

  // Get severity color based on days overdue
  const getSeverityColor = (daysOverdue: number): 'warning' | 'error' => {
    if (daysOverdue >= 180) return 'error'; // 6+ months
    return 'warning'; // 3-6 months
  };

  // Render loading skeleton
  const renderSkeleton = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            {[...Array(8)].map((_, index) => (
              <TableCell key={index}>
                <Skeleton variant="text" width="100%" />
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {[...Array(5)].map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {[...Array(8)].map((_, cellIndex) => (
                <TableCell key={cellIndex}>
                  <Skeleton variant="text" width="100%" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
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
        {/* Header */}
        <Box sx={{ 
          bgcolor: 'white', 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          p: 2
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <WarningIcon color="warning" fontSize="large" />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  Card Destruction Management
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cards overdue for collection (3+ months) requiring destruction
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </Typography>
              <Tooltip title="Refresh">
                <IconButton onClick={handleRefresh} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'auto',
          p: 2,
          minHeight: 0
        }}>
          {/* Alerts */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          {/* Stats */}
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'warning.lighter' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <ScheduleIcon color="warning" />
              </Grid>
              <Grid item xs>
                <Typography variant="h6" color="warning.dark">
                  {totalCount} Cards Overdue for Collection
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cards ready for collection more than 3 months ago require destruction
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Table */}
          {loading ? (
            renderSkeleton()
          ) : (
            <Paper>
              <TableContainer>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa' }}>Application #</TableCell>
                      <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa' }}>Person</TableCell>
                      <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa' }}>ID Number</TableCell>
                      <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa' }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa' }}>Card Number</TableCell>
                      <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa' }}>Ready Date</TableCell>
                      <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa' }}>Days Overdue</TableCell>
                      <TableCell sx={{ fontWeight: 600, bgcolor: '#f8f9fa' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {overdueCards.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                            <ScheduleIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                            <Typography variant="h6" color="text.secondary">
                              No Overdue Cards
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              All cards are either collected or within the 3-month collection period.
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      overdueCards.map((card) => (
                        <TableRow key={card.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {card.application_number}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PersonIcon fontSize="small" color="action" />
                              <Typography variant="body2">
                                {card.person_name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {card.person_id_number}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {card.application_type.replace('_', ' ')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {card.card_number}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(card.ready_for_collection_date).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={`${card.days_overdue} days`}
                              size="small"
                              color={getSeverityColor(card.days_overdue)}
                              sx={{ fontWeight: 500 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title="Destroy Card">
                                <IconButton 
                                  size="small" 
                                  color="error"
                                  onClick={() => handleOpenDestruction(card)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              <TablePagination
                rowsPerPageOptions={[10, 20, 50]}
                component="div"
                count={totalCount}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
                sx={{ borderTop: '1px solid', borderColor: 'divider' }}
              />
            </Paper>
          )}
        </Box>
      </Paper>

      {/* Destruction Confirmation Dialog */}
      <Dialog 
        open={showDestructionDialog} 
        onClose={handleCloseDestruction}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="error" />
            <Typography variant="h6">
              Confirm Card Destruction
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedCard && (
            <Box sx={{ pt: 1 }}>
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Warning: This action cannot be undone!
                </Typography>
                <Typography variant="body2">
                  The card will be marked as destroyed and the application will be set to COLLECTION_FAILURE status.
                  The person will need to submit a new application if they still require a license.
                </Typography>
              </Alert>

              {/* Card Details */}
              <Paper sx={{ p: 2, mb: 3, bgcolor: '#fafafa' }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                  Card Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary">Application Number</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {selectedCard.application_number}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary">Person</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {selectedCard.person_name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary">Card Number</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                      {selectedCard.card_number}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary">Days Overdue</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'error.main' }}>
                      {selectedCard.days_overdue} days
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Destruction Details */}
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Destruction Reason</InputLabel>
                <Select
                  value={destructionReason}
                  onChange={(e) => setDestructionReason(e.target.value)}
                  label="Destruction Reason"
                >
                  <MenuItem value="Non-collection after 3 months">Non-collection after 3 months</MenuItem>
                  <MenuItem value="Card damaged beyond use">Card damaged beyond use</MenuItem>
                  <MenuItem value="Security breach">Security breach</MenuItem>
                  <MenuItem value="Administrative order">Administrative order</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Destruction Notes (Optional)"
                value={destructionNotes}
                onChange={(e) => setDestructionNotes(e.target.value)}
                placeholder="Additional notes about the destruction..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderWidth: '1px',
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
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button 
            onClick={handleCloseDestruction}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDestroyCard}
            disabled={processing || !destructionReason.trim()}
            sx={{
              color: 'white',
              '&:hover': {
                color: 'white',
              }
            }}
          >
            {processing ? 'Destroying...' : 'Confirm Destruction'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CardDestructionPage;
