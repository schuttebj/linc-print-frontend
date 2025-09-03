# FilterBar Component Usage Guide

The FilterBar component provides a clean, modern search and filter interface for list pages. It replaces the previous complex form layouts with a streamlined design that includes a main search field, filter chips, and applied filter management.

## Features

- **Main search field** on the left for quick searches (like ID numbers)
- **Filter chips** that open dropdowns when clicked
- **Applied filters** shown as removable chips
- **Icon-based action buttons** for search and clear
- **URL state preservation** for navigation
- **Responsive design** that works on all screen sizes

## Basic Usage

```typescript
import FilterBar, { FilterConfig, FilterValues } from '../../components/common/FilterBar';

// In your component:
const [searchValue, setSearchValue] = useState('');
const [filterValues, setFilterValues] = useState<FilterValues>({});
const [searching, setSearching] = useState(false);

// Handle filter changes
const handleFilterChange = (key: string, value: any) => {
  setFilterValues(prev => ({
    ...prev,
    [key]: value,
  }));
};

// Render the FilterBar
<FilterBar
  searchValue={searchValue}
  searchPlaceholder="Search items..."
  onSearchChange={setSearchValue}
  filterConfigs={YOUR_FILTER_CONFIGS}
  filterValues={filterValues}
  onFilterChange={handleFilterChange}
  onSearch={handleSearch}
  onClear={handleClear}
  searching={searching}
/>
```

## Filter Configuration

Define your filter configurations using the `FilterConfig[]` type:

```typescript
const YOUR_FILTER_CONFIGS: FilterConfig[] = [
  // Text filter
  {
    key: 'name',
    label: 'Name',
    type: 'text',
    placeholder: 'Enter name',
  },
  
  // Select filter with options
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
  },
  
  // Boolean filter
  {
    key: 'is_verified',
    label: 'Verified',
    type: 'boolean',
  },
];
```

## Filter Types

### Text Filter
```typescript
{
  key: 'document_number',
  label: 'Document Number',
  type: 'text',
  placeholder: 'Enter exact document number',
}
```

### Select Filter
```typescript
{
  key: 'document_type',
  label: 'Document Type',
  type: 'select',
  options: [
    { value: 'MG_ID', label: 'MADAGASCAR ID (CIN/CNI)' },
    { value: 'PASSPORT', label: 'PASSPORT' },
  ],
}
```

### Boolean Filter
```typescript
{
  key: 'is_active',
  label: 'Active Status',
  type: 'boolean',
}
```

## Complete Implementation Example

Here's how to integrate FilterBar into a list page:

```typescript
import React, { useState, useEffect } from 'react';
import FilterBar, { FilterConfig, FilterValues } from '../../components/common/FilterBar';

interface YourSearchForm {
  search_text?: string;
  status?: string;
  category?: string;
  is_active?: boolean;
}

const YOUR_FILTER_CONFIGS: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'approved', label: 'Approved' },
      { value: 'rejected', label: 'Rejected' },
    ],
  },
  {
    key: 'category',
    label: 'Category',
    type: 'text',
    placeholder: 'Enter category',
  },
  {
    key: 'is_active',
    label: 'Active',
    type: 'boolean',
  },
];

const YourListPage: React.FC = () => {
  // State management
  const [searchValue, setSearchValue] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);

  // Combine search and filter values for API calls
  const getCombinedSearchData = (): YourSearchForm => {
    return {
      search_text: searchValue,
      ...filterValues,
    };
  };

  // Handle search
  const handleSearch = async () => {
    setSearching(true);
    try {
      const searchData = getCombinedSearchData();
      // Call your API with searchData
      const response = await yourApiCall(searchData);
      setResults(response.data);
    } finally {
      setSearching(false);
    }
  };

  // Handle clear
  const handleClear = () => {
    setSearchValue('');
    setFilterValues({});
    setResults([]);
  };

  // Handle filter changes
  const handleFilterChange = (key: string, value: any) => {
    setFilterValues(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <Container>
      <FilterBar
        searchValue={searchValue}
        searchPlaceholder="Search your items..."
        onSearchChange={setSearchValue}
        filterConfigs={YOUR_FILTER_CONFIGS}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onSearch={handleSearch}
        onClear={handleClear}
        searching={searching}
      />
      
      {/* Your results display */}
      {/* ... */}
    </Container>
  );
};
```

## URL State Preservation

To maintain state when navigating between pages (like edit/view returns), implement URL state management:

```typescript
// For navigation to detail/edit pages
const navigateToEdit = (item) => {
  const currentFilters = getCombinedSearchData();
  const searchState = {
    filters: encodeURIComponent(JSON.stringify(currentFilters)),
    query: currentFilters.search_text || '',
    page: page.toString(),
    rowsPerPage: rowsPerPage.toString()
  };
  
  const params = new URLSearchParams(searchState);
  navigate(`/your-edit-page/${item.id}?returnTo=search&${params.toString()}`);
};

// For restoring state on component mount
useEffect(() => {
  const urlFilters = searchParams.get('filters');
  if (urlFilters) {
    try {
      const filters = JSON.parse(decodeURIComponent(urlFilters));
      const { search_text, ...otherFilters } = filters;
      setSearchValue(search_text || '');
      setFilterValues(otherFilters);
      
      // Perform search with restored state
      performSearch(filters);
      
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } catch (error) {
      console.warn('Failed to restore search state:', error);
    }
  }
}, [searchParams]);
```

## Styling Customization

The FilterBar component accepts a `className` prop for custom styling:

```typescript
<FilterBar
  className="your-custom-class"
  // ... other props
/>
```

You can also customize the appearance by targeting the component's internal elements with CSS.

## Migration from Old Form

To migrate from an existing search form:

1. **Remove old form components**: Remove Grid, TextField, FormControl, etc.
2. **Update state management**: Replace useForm with useState for search and filters
3. **Define filter configs**: Create your FilterConfig array
4. **Update search logic**: Combine search and filter values in your API calls
5. **Update navigation**: Use the new getCombinedSearchData function for state preservation

## Benefits

- **Cleaner UI**: Significantly reduces form clutter
- **Better UX**: Intuitive filter chips and applied filter management
- **Responsive**: Works well on all screen sizes
- **Reusable**: Same component works across all list pages
- **Maintainable**: Centralized filter logic and styling

## PersonSearchPage Example

See `src/pages/persons/PersonSearchPage.tsx` for a complete working example of the FilterBar implementation.
