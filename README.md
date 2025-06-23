# Madagascar Driver's License System - Frontend

## Overview

Modern React frontend for Madagascar's Driver's License management system, built with TypeScript, Vite, and Material-UI. Features secure authentication, comprehensive person management, and role-based access control.

## Features

- **Modern React 18+**: Latest React features with TypeScript
- **Material-UI v5**: Professional, accessible UI components with Madagascar theme
- **Enhanced Security**: JWT authentication with role-based permissions
- **Person Management**: Complete CRUD operations for Madagascar citizens
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Real-time Validation**: Form validation with Madagascar-specific rules
- **Duplicate Detection**: Advanced person matching algorithms
- **Cross-domain Authentication**: Secure Vercel ↔ Render.com communication

## Technology Stack

- **Frontend Framework**: React 18+
- **Language**: TypeScript
- **UI Library**: Material-UI v5 (Madagascar blue theme)
- **Form Management**: React Hook Form
- **Validation**: Yup schemas
- **State Management**: React Query + Zustand
- **Routing**: React Router v6
- **Build Tool**: Vite
- **Testing**: Jest + React Testing Library

## Quick Start

### Prerequisites

- Node.js 16+
- npm 8+ or yarn 1.22+

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/schuttebj/linc-print-frontend.git
cd linc-print-frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the development server**
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Testing
npm run test         # Run tests
npm run test:coverage # Run tests with coverage

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run type-check   # TypeScript type checking
```

## Project Structure

```
LINC Print Frontend/
├── public/                 # Static assets
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── common/       # Generic components
│   │   └── forms/        # Form components
│   ├── pages/            # Page components
│   │   ├── persons/      # Person management pages
│   │   └── admin/        # Administration pages
│   ├── layouts/          # Layout components
│   ├── contexts/         # React contexts (Auth, etc.)
│   ├── config/           # Configuration files
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── main.tsx         # Application entry point
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## Core Features

### Person Management

Complete person lifecycle management for Madagascar citizens:

**Person Registration**
- Madagascar ID (CIN/CNI) and Passport support
- Personal details capture with validation
- Address management (3-digit postal codes)
- Phone number validation (+261 country code)
- Duplicate detection with similarity scoring

**Person Search**
- Multi-criteria search functionality
- Advanced filtering options
- Results pagination
- Export capabilities

### Authentication & Security

Enhanced security features:

```typescript
// Role-based access control
<ProtectedRoute requiredPermission="persons.create">
  <PersonManagementPage />
</ProtectedRoute>

// Multiple permission checking
<ProtectedRoute requiredPermissions={["persons.read", "persons.update"]}>
  <PersonEditPage />
</ProtectedRoute>
```

### Form Validation

Madagascar-specific validation rules:

```typescript
// Phone number validation
const phoneValidation = yup.string()
  .matches(/^0[0-9]{2}\s[0-9]{2}\s[0-9]{2}\s[0-9]{3}$/, 'Invalid Madagascar phone format')
  .required('Phone number is required');

// Postal code validation
const postalCodeValidation = yup.string()
  .matches(/^[0-9]{3}$/, 'Postal code must be exactly 3 digits')
  .required('Postal code is required');
```

## API Integration

### Backend Communication

The frontend communicates with the Madagascar Backend API:

```typescript
// API configuration
const API_BASE_URL = 'https://linc-print-backend.onrender.com';

// Person service example
export const personService = {
  create: (personData: PersonCreateRequest) =>
    api.post('/api/v1/persons/', personData),
  
  search: (searchParams: PersonSearchParams) =>
    api.get('/api/v1/persons/search', { params: searchParams }),
    
  checkDuplicates: (duplicateData: DuplicateDetectionRequest) =>
    api.post('/api/v1/persons/check-duplicates', duplicateData),
};
```

### State Management

React Query for server state with optimistic updates:

```typescript
// Person management hook
const usePersonManagement = () => {
  const queryClient = useQueryClient();
  
  const createPerson = useMutation({
    mutationFn: personService.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['persons']);
      toast.success('Person created successfully');
    },
  });
  
  return { createPerson };
};
```

## Madagascar-Specific Features

### Document Types
- **Madagascar ID (CIN/CNI)**: Primary identification
- **Passport**: Secondary identification with country of origin

### Address Format
```
Street Line 1: Optional (e.g., "Lot 67 Parcelle 1139")
Street Line 2: Optional (additional detail)
Locality: Required (village, quartier, city)
Postal Code: Required (exactly 3 digits)
Town: Required (same as locality or nearest post office)
Country: Default "MADAGASCAR"
```

### Phone Format
- **Local**: `0AA BB BB BBB` (10 digits)
- **International**: `+261 AA BB BB BBB`
- **Default Country Code**: +261

### Language Support
- **Default Language**: Malagasy (99.9% speak it)
- **Supported Languages**: Malagasy, French, English
- **Translation Ready**: i18n structure prepared

## Deployment

### Vercel Deployment

1. **Connect Repository**
   - Sign in to Vercel
   - Import Git repository

2. **Configure Build Settings**
   ```bash
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

3. **Environment Variables**
   ```bash
   VITE_API_BASE_URL=https://linc-print-backend.onrender.com
   VITE_APP_TITLE=Madagascar Driver's License System
   ```

4. **Deploy**
   - Vercel automatically deploys on git push
   - Preview deployments for branches
   - Production deployment for main branch

### Environment Configuration

Create environment files for different stages:

**.env.development**
```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_ENABLE_DEBUG=true
```

**.env.production**
```bash
VITE_API_BASE_URL=https://linc-print-backend.onrender.com
VITE_ENABLE_DEBUG=false
```

## Theme & Styling

### Madagascar Color Scheme

```typescript
const theme = createTheme({
  palette: {
    primary: { main: '#10367d' },      // Madagascar blue
    secondary: { main: '#74b4da' },    // Light blue accent
    background: { default: '#ebebeb' }, // Light gray background
  }
});
```

### Component Styling

Professional Material-UI components with custom overrides:
- Rounded corners (8px border radius)
- Custom shadows and elevations
- Consistent spacing and typography
- Responsive breakpoints

## Security Features

### Enhanced Authentication
- Access tokens in memory only
- Refresh tokens in httpOnly cookies
- Automatic token refresh with exponential backoff
- Cross-domain security for Vercel ↔ Render

### Permission System
- Granular permission checking
- Role-based access control
- Multiple permission validation
- Secure route protection

### Data Validation
- Client-side validation with Yup
- Real-time form validation
- Madagascar-specific business rules
- Server-side validation integration

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Follow TypeScript strict mode
2. Use Material-UI design principles
3. Implement comprehensive tests
4. Follow Madagascar business rules
5. Ensure accessibility compliance

## License

This project is proprietary software for Madagascar government licensing systems.

## Support

For technical support or questions, contact the development team. 