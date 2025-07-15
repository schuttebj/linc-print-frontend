/**
 * Card List Page for Madagascar License System
 * Search and view all cards in the system
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  CreditCard as CardIcon
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';

import { useAuth } from '../../contexts/AuthContext';
import cardService, { CardSearchFilters, CardListResponse, CardData } from '../../services/cardService';

interface CardListPageProps {}

const CardListPage: React.FC<CardListPageProps> = () => {
  const { user } = useAuth();

  // State management
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Search and filters
  const [searchFilters, setSearchFilters] = useState<CardSearchFilters>({
    page: 1,
    size: 25
  });
  const [quickSearch, setQuickSearch] = useState('');
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Load cards
  const loadCards = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: CardListResponse = await cardService.searchCards({
        ...searchFilters,
        page: page + 1, // Backend uses 1-based pagination
        size: rowsPerPage
      });

      setCards(response.cards);
      setTotalCount(response.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load cards');
      console.error('Error loading cards:', err);
    } finally {
      setLoading(false);
    }
  }, [searchFilters, page, rowsPerPage]);

  // Initial load
  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Handle search
  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(0); // Reset to first page
    loadCards();
  };

  // Handle quick search
  const handleQuickSearch = () => {
    if (quickSearch.trim()) {
      setSearchFilters(prev => ({
        ...prev,
        card_number: quickSearch.trim()
      }));
      setPage(0);
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setQuickSearch('');
    setSearchFilters({
      page: 1,
      size: 25
    });
    setPage(0);
  };

  // Format functions
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  const getStatusChip = (status: string) => {
    const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      'PENDING_ORDER': 'default',
      'ORDERED': 'info',
      'PENDING_PRODUCTION': 'warning',
      'IN_PRODUCTION': 'primary',
      'QUALITY_CONTROL': 'secondary',
      'PRODUCTION_COMPLETED': 'success',
      'READY_FOR_COLLECTION': 'success',
      'COLLECTED': 'success',
      'EXPIRED': 'error',
      'CANCELLED': 'error',
      'DAMAGED': 'error',
      'LOST': 'error',
      'STOLEN': 'error'
    };

    return (
      <Chip 
        label={status.replace(/_/g, ' ')} 
        color={statusColors[status] || 'default'} 
        size="small"
      />
    );
  };

  const getCardTypeChip = (cardType: string) => {
    const typeColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      'STANDARD': 'primary',
      'TEMPORARY': 'warning',
      'DUPLICATE': 'info',
      'REPLACEMENT': 'secondary',
      'EMERGENCY': 'error'
    };

    return (
      <Chip 
        label={cardType} 
        color={typeColors[cardType] || 'default'} 
        size="small"
        variant="outlined"
      />
    );
  };

  const handleViewCard = (card: CardData) => {
    setSelectedCard(card);
    setDetailDialogOpen(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardHeader
          title="Card Management"
          subheader={`${totalCount} cards found`}
          action={
            <Stack direction="row" spacing={1}>
              <Tooltip title="Refresh">
                <IconButton onClick={loadCards} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          }
        />
        
        <CardContent>
          {/* Quick Search */}
          <Box component="form" onSubmit={handleSearch} sx={{ mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Search by card number"
                  value={quickSearch}
                  onChange={(e) => setQuickSearch(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    multiple
                    value={searchFilters.status || []}
                    label="Status"
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, status: e.target.value as string[] }))}
                  >
                    <MenuItem value="PENDING_ORDER">Pending Order</MenuItem>
                    <MenuItem value="ORDERED">Ordered</MenuItem>
                    <MenuItem value="PENDING_PRODUCTION">Pending Production</MenuItem>
                    <MenuItem value="IN_PRODUCTION">In Production</MenuItem>
                    <MenuItem value="QUALITY_CONTROL">Quality Control</MenuItem>
                    <MenuItem value="PRODUCTION_COMPLETED">Production Completed</MenuItem>
                    <MenuItem value="READY_FOR_COLLECTION">Ready for Collection</MenuItem>
                    <MenuItem value="COLLECTED">Collected</MenuItem>
                    <MenuItem value="EXPIRED">Expired</MenuItem>
                    <MenuItem value="CANCELLED">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Card Type</InputLabel>
                  <Select
                    value={searchFilters.card_type || ''}
                    label="Card Type"
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, card_type: e.target.value }))}
                  >
                    <MenuItem value="">All Types</MenuItem>
                    <MenuItem value="STANDARD">Standard</MenuItem>
                    <MenuItem value="TEMPORARY">Temporary</MenuItem>
                    <MenuItem value="DUPLICATE">Duplicate</MenuItem>
                    <MenuItem value="REPLACEMENT">Replacement</MenuItem>
                    <MenuItem value="EMERGENCY">Emergency</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Stack direction="row" spacing={1}>
                  <Button 
                    variant="contained" 
                    type="submit"
                    disabled={loading}
                    startIcon={<SearchIcon />}
                  >
                    Search
                  </Button>
                  <Button 
                    variant="outlined" 
                    onClick={handleClearSearch}
                    disabled={loading}
                    startIcon={<ClearIcon />}
                  >
                    Clear
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Box>

          {/* Loading */}
          {loading && (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          )}

          {/* Error */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Results Table */}
          {!loading && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Card Number</TableCell>
                    <TableCell>Person</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Valid From</TableCell>
                    <TableCell>Valid Until</TableCell>
                    <TableCell>Active</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cards.map((card) => (
                    <TableRow key={card.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {card.card_number}
                        </Typography>
                        {card.is_temporary && (
                          <Typography variant="caption" color="warning.main">
                            Temporary
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {card.person_name || 'Unknown Person'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {getCardTypeChip(card.card_type)}
                      </TableCell>
                      <TableCell>
                        {getStatusChip(card.status)}
                      </TableCell>
                      <TableCell>
                        {formatDate(card.valid_from)}
                      </TableCell>
                      <TableCell>
                        {formatDate(card.valid_until)}
                      </TableCell>
                      <TableCell>
                        {card.is_active ? (
                          <Chip label="Active" color="success" size="small" />
                        ) : (
                          <Chip label="Inactive" color="default" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="View Details">
                            <IconButton 
                              size="small"
                              onClick={() => handleViewCard(card)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {cards.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography variant="body2" color="textSecondary" py={4}>
                          No cards found matching your criteria
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Pagination */}
          <TablePagination
            rowsPerPageOptions={[25, 50, 100]}
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
          />
        </CardContent>
      </Card>

      {/* Card Detail Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CardIcon />
            <Typography variant="h6">
              Card Details: {selectedCard?.card_number}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedCard && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Card Number</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>{selectedCard.card_number}</Typography>

                <Typography variant="subtitle2" color="text.secondary">Card Type</Typography>
                <Box sx={{ mb: 2 }}>{getCardTypeChip(selectedCard.card_type)}</Box>

                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                <Box sx={{ mb: 2 }}>{getStatusChip(selectedCard.status)}</Box>

                <Typography variant="subtitle2" color="text.secondary">Active</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedCard.is_active ? 'Yes' : 'No'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Valid From</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>{formatDate(selectedCard.valid_from)}</Typography>

                <Typography variant="subtitle2" color="text.secondary">Valid Until</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>{formatDate(selectedCard.valid_until)}</Typography>

                {selectedCard.ordered_date && (
                  <>
                    <Typography variant="subtitle2" color="text.secondary">Ordered Date</Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>{formatDateTime(selectedCard.ordered_date)}</Typography>
                  </>
                )}

                {selectedCard.collected_date && (
                  <>
                    <Typography variant="subtitle2" color="text.secondary">Collected Date</Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>{formatDateTime(selectedCard.collected_date)}</Typography>
                  </>
                )}
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Created</Typography>
                <Typography variant="body1">{formatDateTime(selectedCard.created_at)}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CardListPage; 