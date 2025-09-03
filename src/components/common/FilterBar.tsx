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
  Collapse,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
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

  // Toggle advanced filters
  const toggleAdvancedFilters = () => {
    setShowAdvancedFilters(!showAdvancedFilters);
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
        {/* Search Field - Half Width */}
        <TextField
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyPress={handleSearchKeyPress}
          placeholder={searchPlaceholder}
          size="small"
          sx={{ 
            width: '50%',
            maxWidth: 400,
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

        {/* Advanced Search Button */}
        <Button
          variant="outlined"
          onClick={toggleAdvancedFilters}
          endIcon={showAdvancedFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{
            borderRadius: 1,
            '& .MuiButton-endIcon': {
              ml: 1,
            }
          }}
        >
          Advanced Search
        </Button>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
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

      {/* Advanced Filters Panel */}
      <Collapse in={showAdvancedFilters}>
        <Paper 
          sx={{ 
            p: 3, 
            mt: 2, 
            border: 1, 
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: '#f8f9fa'
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'text.secondary' }}>
            Advanced Search Filters
          </Typography>
          
          <Grid container spacing={2}>
            {filterConfigs.map((config) => (
              <Grid item xs={12} sm={6} md={4} key={config.key}>
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
                        bgcolor: 'white',
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
                        bgcolor: 'white',
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
                  <Box sx={{ pt: 1 }}>
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

          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button 
              variant="outlined"
              onClick={onClear}
              startIcon={<ClearIcon />}
              sx={{ borderRadius: 1 }}
            >
              Clear All
            </Button>
            <Button 
              variant="contained"
              onClick={() => {
                onSearch();
                setShowAdvancedFilters(false);
              }}
              startIcon={<SearchIcon />}
              sx={{ borderRadius: 1 }}
            >
              Apply Filters
            </Button>
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
};

export default FilterBar;
