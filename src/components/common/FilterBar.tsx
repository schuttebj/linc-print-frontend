/**
 * Reusable FilterBar Component
 * Provides a clean search and filter interface for list pages
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
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
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
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [activeFilterKey, setActiveFilterKey] = useState<string | null>(null);
  
  // Handle opening filter popover
  const handleFilterClick = (event: React.MouseEvent<HTMLElement>, filterKey: string) => {
    setFilterAnchorEl(event.currentTarget);
    setActiveFilterKey(filterKey);
  };

  // Handle closing filter popover
  const handleFilterClose = () => {
    setFilterAnchorEl(null);
    setActiveFilterKey(null);
  };

  // Handle Enter key in search field
  const handleSearchKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSearch();
    }
  };

  // Get active filter config
  const activeFilterConfig = filterConfigs.find(config => config.key === activeFilterKey);

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

  return (
    <Box className={className}>
      {/* Main Search and Filter Bar */}
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        alignItems: 'center',
        mb: 2,
        flexWrap: 'wrap'
      }}>
        {/* Search Field */}
        <TextField
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyPress={handleSearchKeyPress}
          placeholder={searchPlaceholder}
          size="small"
          sx={{ 
            flexGrow: 1,
            minWidth: 300,
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

        {/* Filter Chips */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {filterConfigs.map((config) => {
            const isActive = filterValues[config.key] !== undefined && 
                           filterValues[config.key] !== null && 
                           filterValues[config.key] !== '';
            
            return (
              <Chip
                key={config.key}
                label={config.label}
                variant={isActive ? "filled" : "outlined"}
                color={isActive ? "primary" : "default"}
                icon={<FilterIcon />}
                onClick={(e) => handleFilterClick(e, config.key)}
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: isActive ? 'primary.dark' : 'action.hover',
                  }
                }}
              />
            );
          })}
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            onClick={onSearch}
            disabled={searching}
            color="primary"
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
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
            color="default"
            sx={{
              border: 1,
              borderColor: 'divider',
              '&:hover': {
                bgcolor: 'action.hover',
              }
            }}
          >
            <ClearIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Applied Filters */}
      {appliedFilters.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Applied Filters:
          </Typography>
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
                  color="secondary"
                  onDelete={() => clearFilter(config.key)}
                  deleteIcon={<CloseIcon />}
                />
              );
            })}
          </Stack>
        </Box>
      )}

      {/* Filter Popover */}
      <Popover
        open={Boolean(filterAnchorEl && activeFilterConfig)}
        anchorEl={filterAnchorEl}
        onClose={handleFilterClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Paper sx={{ p: 2, minWidth: 250 }}>
          {activeFilterConfig && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                Filter by {activeFilterConfig.label}
              </Typography>
              
              {activeFilterConfig.type === 'text' && (
                <TextField
                  fullWidth
                  size="small"
                  placeholder={activeFilterConfig.placeholder || `Enter ${activeFilterConfig.label.toLowerCase()}`}
                  value={filterValues[activeFilterConfig.key] || ''}
                  onChange={(e) => onFilterChange(activeFilterConfig.key, e.target.value)}
                  autoFocus
                />
              )}

              {activeFilterConfig.type === 'select' && activeFilterConfig.options && (
                <FormControl fullWidth size="small">
                  <InputLabel>Select {activeFilterConfig.label}</InputLabel>
                  <Select
                    value={filterValues[activeFilterConfig.key] || ''}
                    onChange={(e) => onFilterChange(activeFilterConfig.key, e.target.value)}
                    label={`Select ${activeFilterConfig.label}`}
                    autoFocus
                  >
                    <MenuItem value="">
                      <em>All {activeFilterConfig.label}</em>
                    </MenuItem>
                    {activeFilterConfig.options.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {activeFilterConfig.type === 'boolean' && (
                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={filterValues[activeFilterConfig.key] === true}
                        onChange={(e) => {
                          const newValue = e.target.checked ? true : undefined;
                          onFilterChange(activeFilterConfig.key, newValue);
                        }}
                      />
                    }
                    label="Yes"
                  />
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Toggle to filter by this criteria, or leave off to include all.
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button 
                  size="small" 
                  onClick={() => clearFilter(activeFilterConfig.key)}
                  color="error"
                >
                  Clear
                </Button>
                <Button 
                  size="small" 
                  variant="contained"
                  onClick={handleFilterClose}
                >
                  Apply
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Popover>
    </Box>
  );
};

export default FilterBar;
