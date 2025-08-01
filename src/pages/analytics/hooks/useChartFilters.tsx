/**
 * Chart Filters Hook
 * Custom hook for managing chart filters and state
 */

import { useState, useCallback } from 'react';

interface ChartFilters {
  dateRange: string;
  location: string;
  applicationTypes: string[];
  licenseCategories: string[];
  paymentMethods: string[];
  customDateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

interface FilterOptions {
  locations: Array<{ value: string; label: string }>;
  applicationTypes: Array<{ value: string; label: string }>;
  licenseCategories: Array<{ value: string; label: string }>;
  paymentMethods: Array<{ value: string; label: string }>;
}

const defaultFilters: ChartFilters = {
  dateRange: '30days',
  location: 'all',
  applicationTypes: [],
  licenseCategories: [],
  paymentMethods: []
};

const filterOptions: FilterOptions = {
  locations: [
    { value: 'all', label: 'All Locations' },
    { value: 'antananarivo', label: 'Antananarivo' },
    { value: 'toamasina', label: 'Toamasina' },
    { value: 'antsirabe', label: 'Antsirabe' },
    { value: 'mahajanga', label: 'Mahajanga' },
    { value: 'fianarantsoa', label: 'Fianarantsoa' }
  ],
  applicationTypes: [
    { value: 'learners', label: "Learner's License" },
    { value: 'driving', label: 'Driving License' },
    { value: 'professional', label: 'Professional License' },
    { value: 'renewal', label: 'License Renewal' },
    { value: 'duplicate', label: 'Duplicate License' },
    { value: 'capture', label: 'License Capture' }
  ],
  licenseCategories: [
    { value: 'category_a', label: 'Category A' },
    { value: 'category_b', label: 'Category B' },
    { value: 'category_c', label: 'Category C' },
    { value: 'learners', label: "Learner's" },
    { value: 'professional', label: 'Professional' }
  ],
  paymentMethods: [
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Credit/Debit Card' },
    { value: 'mobile', label: 'Mobile Money' },
    { value: 'bank', label: 'Bank Transfer' }
  ]
};

export const useChartFilters = () => {
  const [filters, setFilters] = useState<ChartFilters>(defaultFilters);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Update individual filter
  const updateFilter = useCallback(<K extends keyof ChartFilters>(
    key: K,
    value: ChartFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Update multiple filters at once
  const updateFilters = useCallback((newFilters: Partial<ChartFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  // Apply filters (for when using apply button instead of real-time)
  const applyFilters = useCallback(() => {
    // In a real application, this would trigger data refetch
    console.log('Applying filters:', filters);
    setIsFilterPanelOpen(false);
  }, [filters]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  // Reset to default filters
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  // Toggle filter panel
  const toggleFilterPanel = useCallback(() => {
    setIsFilterPanelOpen(prev => !prev);
  }, []);

  // Get filter summary for display
  const getFilterSummary = useCallback(() => {
    const activeFilters: string[] = [];
    
    if (filters.location !== 'all') {
      const location = filterOptions.locations.find(l => l.value === filters.location);
      if (location) activeFilters.push(location.label);
    }
    
    if (filters.applicationTypes.length > 0) {
      activeFilters.push(`${filters.applicationTypes.length} app types`);
    }
    
    if (filters.licenseCategories.length > 0) {
      activeFilters.push(`${filters.licenseCategories.length} license categories`);
    }
    
    if (filters.paymentMethods.length > 0) {
      activeFilters.push(`${filters.paymentMethods.length} payment methods`);
    }

    if (filters.customDateRange) {
      activeFilters.push('Custom date range');
    }
    
    return activeFilters;
  }, [filters]);

  // Check if any filters are active
  const hasActiveFilters = useCallback(() => {
    return (
      filters.location !== 'all' ||
      filters.applicationTypes.length > 0 ||
      filters.licenseCategories.length > 0 ||
      filters.paymentMethods.length > 0 ||
      !!filters.customDateRange
    );
  }, [filters]);

  // Export filters for API calls
  const getApiFilters = useCallback(() => {
    return {
      date_range: filters.dateRange,
      location: filters.location !== 'all' ? filters.location : undefined,
      application_types: filters.applicationTypes.length > 0 ? filters.applicationTypes : undefined,
      license_categories: filters.licenseCategories.length > 0 ? filters.licenseCategories : undefined,
      payment_methods: filters.paymentMethods.length > 0 ? filters.paymentMethods : undefined,
      start_date: filters.customDateRange?.startDate?.toISOString(),
      end_date: filters.customDateRange?.endDate?.toISOString(),
    };
  }, [filters]);

  // Preset filter combinations
  const applyPresetFilter = useCallback((preset: string) => {
    switch (preset) {
      case 'today':
        updateFilters({ dateRange: '1day' });
        break;
      case 'thisWeek':
        updateFilters({ dateRange: '7days' });
        break;
      case 'thisMonth':
        updateFilters({ dateRange: '30days' });
        break;
      case 'applications':
        updateFilters({ 
          applicationTypes: ['learners', 'driving', 'professional'],
          licenseCategories: []
        });
        break;
      case 'financial':
        updateFilters({
          paymentMethods: ['cash', 'card', 'mobile'],
          applicationTypes: []
        });
        break;
      default:
        break;
    }
  }, [updateFilters]);

  return {
    filters,
    filterOptions,
    isFilterPanelOpen,
    updateFilter,
    updateFilters,
    applyFilters,
    clearFilters,
    resetFilters,
    toggleFilterPanel,
    getFilterSummary,
    hasActiveFilters,
    getApiFilters,
    applyPresetFilter
  };
};

export default useChartFilters;