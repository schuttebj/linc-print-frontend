/**
 * Reusable FilterBar Component
 * Provides a clean search and filter interface with advanced search panel
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Chip,
  Popover,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Stack,
  InputAdornment,
  Grid,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';

// Filter configuration types
export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'boolean';
  placeholder?: string;
  options?: FilterOption[];
  defaultValue?: any;
}

export interface FilterValues {
  [key: string]: any;
}

export interface FilterBarProps {
  // Search configuration
  searchValue: string;
  searchPlaceholder?: string;
  onSearchChange: (value: string) => void;
  
  // Filter configuration
  filterConfigs: FilterConfig[];
  filterValues: FilterValues;
  onFilterChange: (key: string, value: any) => void;
  
  // Actions
  onSearch: () => void;
  onClear: () => void;
  
  // Loading state
  searching?: boolean;
  
  // Styling
  className?: string;
}

const FilterBar: React.FC<FilterBarProps> = ({
  searchValue,
  searchPlaceholder = "Search...",
  onSearchChange,
  filterConfigs,
  filterValues,
  onFilterChange,
  onSearch,
  onClear,
  searching = false,
  className,
}) => {
  const [advancedFiltersAnchorEl, setAdvancedFiltersAnchorEl] = useState<HTMLElement | null>(null);
  const showAdvancedFilters = Boolean(advancedFiltersAnchorEl);
  
  // Handle Enter key in search field
  const handleSearchKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSearch();
    }
  };

  // Get applied filters (non-empty values)
  const appliedFilters = filterConfigs.filter(config => {
    const value = filterValues[config.key];
    if (config.type === 'boolean') {
      return value !== undefined && value !== null;
    }
    return value !== undefined && value !== null && value !== '';
  });

  // Clear individual filter
  const clearFilter = (filterKey: string) => {
    const config = filterConfigs.find(c => c.key === filterKey);
    if (config) {
      const defaultValue = config.type === 'boolean' ? undefined : '';
      onFilterChange(filterKey, defaultValue);
    }
  };

  // Format filter display value
  const formatFilterValue = (config: FilterConfig, value: any): string => {
    if (config.type === 'boolean') {
      return value === true ? 'Yes' : value === false ? 'No' : '';
    }
    if (config.type === 'select' && config.options) {
      const option = config.options.find(opt => opt.value === value);
      return option?.label || String(value);
    }
    return String(value);
  };

  // Handle advanced filters popup
  const handleAdvancedFiltersClick = (event: React.MouseEvent<HTMLElement>) => {
    setAdvancedFiltersAnchorEl(event.currentTarget);
  };

  const handleAdvancedFiltersClose = () => {
    setAdvancedFiltersAnchorEl(null);
  };

  return (
    <Box className={className}>
      {/* Main Search Bar */}
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        alignItems: 'center',
        mb: 2,
      }}>
        {/* Advanced Search Button - Left Side */}
        <Button
          variant="outlined"
          onClick={handleAdvancedFiltersClick}
          endIcon={<ExpandMoreIcon />}
          sx={{
            borderRadius: 1,
            flexShrink: 0,
            whiteSpace: 'nowrap',
            '& .MuiButton-endIcon': {
              ml: 1,
            }
          }}
        >
          Advanced Search
        </Button>

        {/* Search Field - Fills Remaining Space */}
        <TextField
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyPress={handleSearchKeyPress}
          placeholder={searchPlaceholder}
          size="small"
          sx={{ 
            flexGrow: 1,
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderWidth: '1px' },
              '&:hover fieldset': { borderWidth: '1px' },
              '&.Mui-focused fieldset': { borderWidth: '1px' },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: searchValue && (
              <InputAdornment position="end">
                <IconButton 
                  onClick={() => onSearchChange('')} 
                  size="small"
                  edge="end"
                >
                  <CloseIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <IconButton
            onClick={onSearch}
            disabled={searching}
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              borderRadius: 1,
              '&:hover': {
                bgcolor: 'primary.dark',
              },
              '&:disabled': {
                bgcolor: 'action.disabled',
                color: 'action.disabled',
              }
            }}
          >
            <SearchIcon />
          </IconButton>
          
          <IconButton
            onClick={onClear}
            disabled={searching}
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              '&:hover': {
                bgcolor: 'action.hover',
              }
            }}
          >
            <ClearIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Applied Filters Chips */}
      {appliedFilters.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {appliedFilters.map((config) => {
              const value = filterValues[config.key];
              const displayValue = formatFilterValue(config, value);
              
              return (
                <Chip
                  key={config.key}
                  label={`${config.label}: ${displayValue}`}
                  size="small"
                  variant="filled"
                  color="primary"
                  onDelete={() => clearFilter(config.key)}
                  deleteIcon={<CloseIcon />}
                  sx={{
                    borderRadius: 1,
                  }}
                />
              );
            })}
          </Stack>
        </Box>
      )}

      {/* Advanced Filters Popover */}
      <Popover
        open={showAdvancedFilters}
        anchorEl={advancedFiltersAnchorEl}
        onClose={handleAdvancedFiltersClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            width: 600,
            maxWidth: '90vw',
            maxHeight: '80vh',
            overflow: 'auto',
          }
        }}
      >
        <Paper 
          sx={{ 
            p: 1.5,
            border: 0,
            borderRadius: 2,
            bgcolor: 'white'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, px: 0.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '1rem' }}>
              Advanced Search Filters
            </Typography>
            <IconButton
              onClick={handleAdvancedFiltersClose}
              size="small"
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
          
          <Grid container spacing={1.5}>
            {filterConfigs.map((config) => (
              <Grid item xs={12} sm={6} key={config.key}>
                {config.type === 'text' && (
                  <TextField
                    fullWidth
                    size="small"
                    label={config.label}
                    placeholder={config.placeholder || `Enter ${config.label.toLowerCase()}`}
                    value={filterValues[config.key] || ''}
                    onChange={(e) => onFilterChange(config.key, e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderWidth: '1px' },
                        '&:hover fieldset': { borderWidth: '1px' },
                        '&.Mui-focused fieldset': { borderWidth: '1px' },
                      },
                    }}
                  />
                )}

                {config.type === 'select' && config.options && (
                  <FormControl fullWidth size="small">
                    <InputLabel>{config.label}</InputLabel>
                    <Select
                      value={filterValues[config.key] || ''}
                      onChange={(e) => onFilterChange(config.key, e.target.value)}
                      label={config.label}
                      sx={{
                        '& .MuiOutlinedInput-notchedOutline': { borderWidth: '1px' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderWidth: '1px' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: '1px' },
                      }}
                    >
                      <MenuItem value="">
                        <em>All {config.label}</em>
                      </MenuItem>
                      {config.options.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {config.type === 'boolean' && (
                  <Box sx={{ pt: 0.5 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={filterValues[config.key] === true}
                          onChange={(e) => {
                            const newValue = e.target.checked ? true : undefined;
                            onFilterChange(config.key, newValue);
                          }}
                        />
                      }
                      label={config.label}
                    />
                  </Box>
                )}
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ my: 1.5 }} />
          
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end', px: 0.5 }}>
            <Button 
              variant="outlined"
              size="small"
              onClick={onClear}
              startIcon={<ClearIcon />}
              sx={{ borderRadius: 1 }}
            >
              Clear All
            </Button>
            <Button 
              variant="contained"
              size="small"
              onClick={() => {
                onSearch();
                handleAdvancedFiltersClose();
              }}
              startIcon={<SearchIcon />}
              sx={{ borderRadius: 1 }}
            >
              Apply Filters
            </Button>
          </Box>
        </Paper>
      </Popover>
    </Box>
  );
};

export default FilterBar;
