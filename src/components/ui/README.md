# UI Components - Chip System

This directory contains standardized UI components for the LINC Print Frontend, ensuring consistent styling across the application.

## StatusChip, LicenseChip & CodeChip Components

### Overview
- **StatusChip**: For application statuses with predefined color schemes (filled style with softer borders)
- **LicenseChip**: For license categories and general-purpose chips (configurable style)
- **CodeChip**: For codes/categories without backgrounds (outlined style with text-matching borders)
- **Global Theme**: All MUI Chip components are styled consistently

### Key Features
- **5px border radius** (not round)
- **Smart Border Strategy**: 
  - **Filled chips** (with backgrounds): Softer borders (medium tone between text and background)
  - **Outlined chips** (no backgrounds): Text-matching borders for clear definition
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

// License categories (outlined style)
<LicenseChip category="B" chipType="license" />
<LicenseChip category="C1" chipType="license" />

// Other chip types (filled style)
<LicenseChip category="Tag" chipType="tag" />
<LicenseChip category="Info" chipType="info" />

// Code chips (outlined style)
<LicenseChip category="CODE123" chipType="code" />
```

### CodeChip (Recommended for Codes)
```tsx
import { CodeChip } from '../components/ui/StatusChip';

// License codes with text-matching borders
<CodeChip code="B" color="primary" />
<CodeChip code="C1" color="primary" />
<CodeChip code="A" color="secondary" />

// General codes
<CodeChip code="REF123" color="default" />
<CodeChip code="CAT456" color="info" />
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
- **Processed/Completed**: Green (`#1b5e20` text, `#e8f5e8` bg, `#a6e8ab` border)
- **Possible Fraud**: Orange (`#e65100` text, `#fff8e1` bg, `#ffb74d` border)
- **Draft**: Gray (`#424242` text, `#f5f5f5` bg, `#9e9e9e` border)
- **Submitted**: Blue (`#1565c0` text, `#e3f2fd` bg, `#90caf9` border)
- **Error States**: Red (`#c62828` text, `#ffebee` bg, `#ef9a9a` border)

### License Colors

#### Outlined Style (No Background)
- **License Categories**: Blue (`#1565c0` text, transparent bg, `#1565c0` border)
- **Code Chips**: Various colors (`text color` matches `border color`)

#### Filled Style (With Background)  
- **General Tags**: Purple (`#6a1b9a` text, `#f3e5f5` bg, `#ce93d8` border)
- **Info Chips**: Light blue (`#0277bd` text, `#e1f5fe` bg, `#4fc3f7` border)

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
