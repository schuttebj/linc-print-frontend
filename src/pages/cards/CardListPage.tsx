/**
 * Card List Page for Madagascar License System
 * Search and view all cards in the system
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  TablePagination,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Skeleton,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  CreditCard as CardIcon
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';

import { useAuth } from '../../contexts/AuthContext';
import cardService, { CardSearchFilters, CardListResponse, CardData } from '../../services/cardService';
import FilterBar, { FilterConfig, FilterValues } from '../../components/common/FilterBar';

// Filter configurations for CardListPage
const CARD_FILTER_CONFIGS: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'PENDING_ORDER', label: 'Pending Order' },
      { value: 'ORDERED', label: 'Ordered' },
      { value: 'PENDING_PRODUCTION', label: 'Pending Production' },
      { value: 'IN_PRODUCTION', label: 'In Production' },
      { value: 'QUALITY_CONTROL', label: 'Quality Control' },
      { value: 'PRODUCTION_COMPLETED', label: 'Production Completed' },
      { value: 'READY_FOR_COLLECTION', label: 'Ready for Collection' },
      { value: 'COLLECTED', label: 'Collected' },
      { value: 'EXPIRED', label: 'Expired' },
      { value: 'CANCELLED', label: 'Cancelled' },
    ],
  },
  {
    key: 'card_type',
    label: 'Card Type',
    type: 'select',
    options: [
      { value: 'STANDARD', label: 'Standard' },
      { value: 'TEMPORARY', label: 'Temporary' },
      { value: 'DUPLICATE', label: 'Duplicate' },
      { value: 'REPLACEMENT', label: 'Replacement' },
      { value: 'EMERGENCY', label: 'Emergency' },
    ],
  },
  {
    key: 'is_active',
    label: 'Active Status',
    type: 'boolean',
  },
];

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

  // Filter state management for FilterBar
  const [searchValue, setSearchValue] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  
  // Dialog states
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Load cards
  const loadCards = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Combine all filter sources into searchFilters
      const searchFilters: CardSearchFilters = {
        page: page + 1, // Backend uses 1-based pagination
        size: rowsPerPage === -1 ? 100 : rowsPerPage, // Handle "All" option
        ...(searchValue && { card_number: searchValue }),
        ...filterValues,
      };

      const response: CardListResponse = await cardService.searchCards(searchFilters);

      setCards(response.cards);
      setTotalCount(response.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load cards');
      console.error('Error loading cards:', err);
    } finally {
      setLoading(false);
    }
  }, [searchValue, filterValues, page, rowsPerPage]);

  // Initial load
  useEffect(() => {
    loadCards();
  }, [loadCards]);

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
    await loadCards();
  };

  const handleClear = () => {
    setSearchValue('');
    setFilterValues({});
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

  // Handle pagination
  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Skeleton loader component for card results
  const CardResultsSkeleton = () => (
    <TableContainer sx={{ flex: 1 }}>
      <Table stickyHeader sx={{ '& .MuiTableCell-root': { borderRadius: 0 } }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Card Number</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Person</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Type</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Valid From</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Valid Until</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Active</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: rowsPerPage }).map((_, index) => (
            <TableRow key={index}>
              <TableCell sx={{ py: 1, px: 2 }}>
                <Skeleton variant="text" width="100%" height={20} />
                <Skeleton variant="text" width="60%" height={16} />
              </TableCell>
              <TableCell sx={{ py: 1, px: 2 }}>
                <Skeleton variant="text" width="100%" height={20} />
              </TableCell>
              <TableCell sx={{ py: 1, px: 2 }}>
                <Skeleton variant="rounded" width={80} height={24} />
              </TableCell>
              <TableCell sx={{ py: 1, px: 2 }}>
                <Skeleton variant="rounded" width={100} height={24} />
              </TableCell>
              <TableCell sx={{ py: 1, px: 2 }}>
                <Skeleton variant="text" width="100%" height={20} />
              </TableCell>
              <TableCell sx={{ py: 1, px: 2 }}>
                <Skeleton variant="text" width="100%" height={20} />
              </TableCell>
              <TableCell sx={{ py: 1, px: 2 }}>
                <Skeleton variant="rounded" width={60} height={24} />
              </TableCell>
              <TableCell sx={{ py: 1, px: 2 }}>
                <Skeleton variant="circular" width={32} height={32} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
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
              Search Cards
            </Typography>
                  <Button 
                    variant="contained" 
              onClick={loadCards}
              startIcon={<RefreshIcon />}
              size="small"
                    disabled={loading}
            >
              Refresh
                  </Button>
          </Box>

          <FilterBar
            searchValue={searchValue}
            searchPlaceholder="Search by card number"
            onSearchChange={setSearchValue}
            filterConfigs={CARD_FILTER_CONFIGS}
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

          {/* Card Table */}
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
                <CardResultsSkeleton />
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
                {cards.length === 0 ? (
                  <Box sx={{ p: 2 }}>
                    <Alert severity="info">
                      No cards found matching your search criteria. Try adjusting your search terms.
                    </Alert>
                  </Box>
                ) : (
                  <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <TableContainer sx={{ flex: 1 }}>
                      <Table stickyHeader sx={{ '& .MuiTableCell-root': { borderRadius: 0 } }}>
                <TableHead>
                  <TableRow>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Card Number</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Person</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Valid From</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Valid Until</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Active</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cards.map((card) => (
                    <TableRow key={card.id} hover>
                              <TableCell sx={{ py: 1, px: 2 }}>
                                <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.8rem' }}>
                          {card.card_number}
                        </Typography>
                        {card.is_temporary && (
                                  <Typography variant="caption" color="warning.main" sx={{ fontSize: '0.7rem' }}>
                            Temporary
                          </Typography>
                        )}
                      </TableCell>
                              <TableCell sx={{ py: 1, px: 2 }}>
                                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {card.person_name || 'Unknown Person'}
                        </Typography>
                      </TableCell>
                              <TableCell sx={{ py: 1, px: 2 }}>
                        {getCardTypeChip(card.card_type)}
                      </TableCell>
                              <TableCell sx={{ py: 1, px: 2 }}>
                        {getStatusChip(card.status)}
                      </TableCell>
                              <TableCell sx={{ py: 1, px: 2 }}>
                                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        {formatDate(card.valid_from)}
                                </Typography>
                      </TableCell>
                              <TableCell sx={{ py: 1, px: 2 }}>
                                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        {formatDate(card.valid_until)}
                                </Typography>
                      </TableCell>
                              <TableCell sx={{ py: 1, px: 2 }}>
                        {card.is_active ? (
                          <Chip label="Active" color="success" size="small" />
                        ) : (
                          <Chip label="Inactive" color="default" size="small" />
                        )}
                      </TableCell>
                              <TableCell sx={{ py: 1, px: 2 }}>
                          <Tooltip title="View Details">
                            <IconButton 
                              size="small"
                              onClick={() => handleViewCard(card)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

          <TablePagination
            component="div"
            count={totalCount}
                      page={page}
                      onPageChange={handlePageChange}
            rowsPerPage={rowsPerPage}
                      onRowsPerPageChange={handleRowsPerPageChange}
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
    </>
  );
};

export default CardListPage; 