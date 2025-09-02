# UI Components - Chip System

This directory contains standardized UI components for the LINC Print Frontend, ensuring consistent styling across the application.

## StatusChip & LicenseChip Components

### Overview
- **StatusChip**: For application statuses with predefined color schemes
- **LicenseChip**: For license categories and general-purpose chips
- **Global Theme**: All MUI Chip components are styled consistently

### Key Features
- **5px border radius** (not round)
- **1px borders** matching text color
- **Consistent colors** across the application
- **Compact sizing** for better space utilization

## Usage Examples

### StatusChip
```tsx
import { StatusChip } from '../components/ui/StatusChip';

// Application status
<StatusChip 
  status={ApplicationStatus.COMPLETED}
  statusLabel="Processed"
/>

// Special cases (fraud detection)
<StatusChip 
  status="POSSIBLE_FRAUD"
  statusLabel="Possible Fraud"
/>
```

### LicenseChip
```tsx
import { LicenseChip } from '../components/ui/StatusChip';

// License categories
<LicenseChip category="B" chipType="license" />
<LicenseChip category="C1" chipType="license" />

// Other chip types
<LicenseChip category="Tag" chipType="tag" />
<LicenseChip category="Info" chipType="info" />
```

### Standard MUI Chips
All standard MUI Chip components automatically inherit the global styling:

```tsx
// These now have borders and 5px radius automatically
<Chip label="Primary" color="primary" />
<Chip label="Success" color="success" />
<Chip label="Warning" color="warning" />
```

## Color Schemes

### Status Colors
- **Processed/Completed**: Green (`#1b5e20` text, `#e8f5e8` background)
- **Possible Fraud**: Orange (`#e65100` text, `#fff8e1` background)
- **Draft**: Gray (`#424242` text, `#f5f5f5` background)
- **Submitted**: Blue (`#1565c0` text, `#e3f2fd` background)
- **Error States**: Red (`#c62828` text, `#ffebee` background)

### License Colors
- **License Categories**: Blue outlined (`#1565c0` border, transparent background)
- **General Tags**: Purple (`#6a1b9a` text, `#f3e5f5` background)
- **Info Chips**: Light blue (`#0277bd` text, `#e1f5fe` background)

## Global Theme Integration

The chip styling is integrated into the MUI theme, so:

1. **All existing chips** get updated styling automatically
2. **No migration needed** for existing components
3. **New components** inherit consistent styling by default

## Customization

### Using Utility Functions
```tsx
import { getChipVariant, createChipStyle } from '../theme/chipTheme';

// Predefined chip types
const chipProps = getChipVariant('license');

// Custom colors
const customStyle = createChipStyle('#ff5722', '#fff3e0', false);
```

### Custom Colors
```tsx
import { chipColorSchemes } from '../theme/chipTheme';

// Access predefined color schemes
const { text, bg } = chipColorSchemes.processed;
```

## Best Practices

1. **Use StatusChip** for application statuses
2. **Use LicenseChip** for license categories
3. **Use standard MUI Chips** for general purpose (they inherit styling)
4. **Avoid custom sx overrides** that break consistency
5. **Test with both normal and compact themes**

## Responsive Design

- **Normal theme**: 24px height, 0.7rem font
- **Compact theme**: 20px height, 0.65rem font
- **Small size**: 18px height, 0.6rem font

## Migration Guide

### From Custom Chip Styling
```tsx
// Before
<Chip 
  sx={{ 
    fontSize: '0.7rem', 
    height: '24px',
    borderRadius: '12px',
    bgcolor: '#e8f5e8',
    color: '#2e7d32'
  }}
/>

// After (automatic styling)
<Chip color="success" />
```

### From Status-Specific Logic
```tsx
// Before
<Chip 
  color={getStatusColor(status)}
  sx={getStatusStyles(status)}
/>

// After
<StatusChip 
  status={status}
  statusLabel={getStatusLabel(status)}
/>
```

This system ensures visual consistency while being easy to maintain and extend.
