# Applications Frontend Development Plan

## 🎯 **Development Strategy: MVP → Full Workflow**

### **Phase 1: MVP Core Features**
- **Application Creation**: NEW_LICENSE with embedded PersonFormWrapper
- **Application Search**: Quick ID lookup and today's in-progress list
- **Application Details**: View/edit application with status updates
- **Basic Status Flow**: DRAFT → SUBMITTED → APPROVED → COMPLETED
- **Temporary Applications**: Integrated as core feature
- **Location-Based Access**: User sees only their location's applications

### **Phase 2: Biometric Integration** 
- **Photo Capture**: Integrate existing WebcamCapture.tsx code
- **Signature Capture**: Canvas-based signature pad
- **Fingerprint Placeholder**: Mock capture with placeholder image
- **File Upload**: Document management for medical certificates

### **Phase 3: Full Workflow**
- **16-Stage Status Flow**: Complete Madagascar workflow
- **Payment Processing**: Fee calculation and payment tracking
- **Advanced Features**: Complex business rules, audit trail

## 🏗️ **Component Architecture**

### **Main Components**
```
/src/pages/applications/
├── ApplicationFormPage.tsx           // Main form container
├── ApplicationListPage.tsx           // Search & in-progress list
├── ApplicationDetailsPage.tsx        // View/edit application details
└── ApplicationManagementPage.tsx     // Admin dashboard (Phase 3)

/src/components/applications/
├── ApplicationFormWrapper.tsx        // Main multi-step form wrapper
├── ApplicationInProgressList.tsx     // Today's applications list
├── ApplicationSearch.tsx             // Quick person ID search
├── BiometricCapture.tsx             // Photo/signature/fingerprint
├── ApplicationStatusBadge.tsx        // Status display component
└── FeeCalculator.tsx                // Fee display and calculation
```

### **ApplicationFormWrapper Steps**
1. **Person Selection/Creation** (embedded PersonFormWrapper)
2. **Application Details** (type, categories, location, urgency)
3. **Requirements Check** (medical cert, parental consent, existing license)
4. **Biometric Capture** (photo, signature, fingerprint)
5. **Review & Submit** (fees, confirmation, save as draft)

## 🔄 **Multi-Stage Workflow Support**

### **Workflow States & Access Control**
```typescript
// Application stages that determine who can access what
enum WorkflowStage {
  DETAILS_CAPTURE = "DETAILS_CAPTURE",     // Step 1-2: Details entry
  BIOMETRIC_CAPTURE = "BIOMETRIC_CAPTURE", // Step 3: Photo/signature/fingerprint
  PAYMENT_PROCESSING = "PAYMENT_PROCESSING", // Step 4: Fee payment
  REVIEW_COMPLETE = "REVIEW_COMPLETE"       // Step 5: Final review
}

// Only show in in-progress list when previous stage is complete
const IN_PROGRESS_VISIBILITY = {
  [ApplicationStatus.DRAFT]: false,              // Still being created
  [ApplicationStatus.SUBMITTED]: true,           // Ready for biometrics
  [ApplicationStatus.DOCUMENTS_PENDING]: true,   // Ready for payment
  [ApplicationStatus.APPROVED]: true             // Ready for collection
};
```

### **Person ID Quick Lookup**
```typescript
// Quick search component for continuing applications
interface QuickSearchProps {
  onPersonFound: (person: Person, applications: Application[]) => void;
  onNewApplication: () => void;
}

// Search by Madagascar ID, passport, or application number
const searchMethods = ['MADAGASCAR_ID', 'PASSPORT', 'APPLICATION_NUMBER'];
```

## 🎨 **Design Patterns (Match PersonFormWrapper)**

### **Styling Consistency**
- **Material-UI Components**: Paper, Grid, Stepper, Typography
- **Multi-step Stepper**: Same validation and navigation patterns
- **Success/Error Dialogs**: Reuse existing dialog patterns
- **Context-aware Behavior**: Different modes (create, edit, continue)
- **Form Validation**: Yup schemas with react-hook-form

### **Component Structure Pattern**
```typescript
interface ApplicationFormWrapperProps {
  mode?: 'create' | 'edit' | 'continue';
  initialPersonId?: string;
  initialApplicationId?: string;
  onComplete?: (application: Application) => void;
  onCancel?: () => void;
  onSuccess?: (application: Application, isEdit: boolean) => void;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
}
```

## 🔧 **Backend Integration Requirements**

### **Missing Endpoints to Add**
```typescript
// 1. Fee Structure Lookup
GET /api/v1/lookups/fee-structures
// Returns: Array<{fee_type, display_name, amount, applies_to_categories}>

// 2. Application Search by Person ID  
GET /api/v1/applications/search/person/{person_id}
// Returns: Array<Application> for quick continuation

// 3. Today's In-Progress Applications
GET /api/v1/applications/in-progress?date=today&location_id={location}
// Returns: Applications ready for next stage

// 4. Application Status Transition
POST /api/v1/applications/{id}/status
// Body: {new_status, reason, notes, completed_stage}
```

### **File Upload Integration**
```typescript
// Document upload for medical certificates, parental consent
POST /api/v1/applications/{id}/documents
// FormData: file, document_type, notes

// Biometric data upload (photo, signature)
POST /api/v1/applications/{id}/biometric-data
// FormData: file, data_type (PHOTO|SIGNATURE|FINGERPRINT)
```

## 📋 **Core Features Implementation**

### **1. Application Creation Flow**
```typescript
// Step 1: Person Selection (reuse PersonFormWrapper)
<PersonFormWrapper 
  mode="application"
  onPersonSelected={handlePersonSelected}
  onPersonCreated={handlePersonSelected}
  title="License Application - Applicant Details"
  subtitle="Find existing person or register new applicant"
/>

// Step 2: Application Details
const applicationTypes = ['NEW_LICENSE', 'RENEWAL', 'UPGRADE', 'TEMPORARY_LICENSE'];
const licenseCategories = ['A′', 'A', 'B', 'C', 'D', 'E'];
```

### **2. Temporary Applications Integration**
```typescript
// Temporary license linked to main application
interface TemporaryApplicationData {
  parent_application_id: string;
  temporary_license_reason: string;
  urgency_level: 'STANDARD' | 'URGENT' | 'EMERGENCY';
  validity_days: number; // Default 90
}

// Show both applications in related applications section
const RelatedApplications = ({ applicationId }) => {
  // Show parent/child relationship
  // Allow navigation between related applications
};
```

### **3. Biometric Capture Integration**
```typescript
// Reuse existing WebcamCapture component
import WebcamCapture from '../../components/WebcamCapture';

// Add signature capture component
const SignatureCapture = ({ onSignatureCapture }) => {
  // Canvas-based signature drawing
  // Save as image blob
};

// Fingerprint placeholder
const FingerprintCapture = ({ onFingerprintCapture }) => {
  // Mock capture with placeholder image
  // Future: integrate with GREEN BIT DACTYSCAN84C
};
```

### **4. Location-Based Access Control**
```typescript
// Filter applications by user's location access
const ApplicationList = () => {
  const { user } = useAuth();
  
  // Automatically filter by user's primary_location_id
  const locationFilter = user.user_type === 'LOCATION_USER' 
    ? user.primary_location_id 
    : undefined;
    
  const applications = useApplications({ location_id: locationFilter });
};
```

### **5. In-Progress Applications Dashboard**
```typescript
const InProgressApplications = () => {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardHeader title="Ready for Biometrics" />
          <CardContent>
            {/* Applications in SUBMITTED status */}
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardHeader title="Ready for Payment" />
          <CardContent>
            {/* Applications in DOCUMENTS_PENDING status */}
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardHeader title="Ready for Collection" />
          <CardContent>
            {/* Applications in APPROVED status */}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
```

## 🚀 **Development Phases**

### **Phase 1: Core Infrastructure (Week 1)**
- [ ] Add fee structure lookup endpoint
- [ ] Create ApplicationFormWrapper with PersonFormWrapper integration
- [ ] Implement basic application creation (NEW_LICENSE)
- [ ] Add application search and in-progress list
- [ ] Location-based filtering

### **Phase 2: Biometric & File Upload (Week 2)**
- [ ] Integrate WebcamCapture for photo capture
- [ ] Create SignatureCapture component
- [ ] Add FingerprintCapture placeholder
- [ ] Implement document file upload
- [ ] Add biometric data management

### **Phase 3: Temporary Applications (Week 3)**
- [ ] Integrate temporary license creation
- [ ] Add parent-child application linking
- [ ] Implement urgency-based workflow
- [ ] Add related applications view

### **Phase 4: Full Workflow (Week 4)**
- [ ] Expand to 16-stage status workflow
- [ ] Add payment processing
- [ ] Implement business rules validation
- [ ] Add administrative features

## 🎯 **Success Criteria**

### **MVP Success**
- [ ] Clerk can create NEW_LICENSE application with person integration
- [ ] Biometric capture (photo, signature, fingerprint placeholder) works
- [ ] Applications are filtered by user's location
- [ ] In-progress list shows today's applications ready for next stage
- [ ] Quick person ID search allows continuing applications
- [ ] Temporary licenses can be created and linked to main applications

### **Full Success**
- [ ] Complete 16-stage workflow implemented
- [ ] All Madagascar business rules enforced
- [ ] Payment processing integrated
- [ ] Administrative dashboard complete
- [ ] Hardware integration ready (fingerprint, signature pad)

## 📁 **File Structure**
```
LINC Print Frontend/src/
├── pages/applications/
│   ├── ApplicationFormPage.tsx
│   ├── ApplicationListPage.tsx
│   ├── ApplicationDetailsPage.tsx
│   └── ApplicationManagementPage.tsx
├── components/applications/
│   ├── ApplicationFormWrapper.tsx
│   ├── ApplicationInProgressList.tsx
│   ├── ApplicationSearch.tsx
│   ├── BiometricCapture.tsx
│   ├── SignatureCapture.tsx
│   ├── FingerprintCapture.tsx
│   ├── ApplicationStatusBadge.tsx
│   ├── FeeCalculator.tsx
│   └── RelatedApplications.tsx
├── services/
│   ├── applicationService.ts
│   └── biometricService.ts
└── types/
    └── application.ts
```

This plan ensures we build a robust, scalable applications frontend that matches the existing design patterns while supporting the complex multi-stage workflow requirements for Madagascar's license system. 