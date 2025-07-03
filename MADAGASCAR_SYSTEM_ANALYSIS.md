# Madagascar License System Analysis
## Current State vs Required State

### Executive Summary

This document provides a comprehensive analysis of the current LINC Print system and identifies required modifications to support the Madagascar license workflow. The user has specified a complete workflow redesign that separates application submission from test scheduling, licensing, payment processing, and card ordering into distinct phases.

## Current System Overview

### 1. License Categories ✅ COMPLETE
**Current State**: 14 detailed license categories with superseding matrix
- A1, A2, A: Motorcycles and mopeds
- B1, B, B2, BE: Light vehicles
- C1, C, C1E, CE: Heavy goods vehicles
- D1, D, D2: Passenger transport

**Assessment**: No changes needed - the current 14-category system is correct per user confirmation.

### 2. Application Types ✅ CURRENT
**Current Types** (Frontend & Backend):
```typescript
enum ApplicationType {
  NEW_LICENSE = 'NEW_LICENSE',
  LEARNERS_PERMIT = 'LEARNERS_PERMIT', 
  RENEWAL = 'RENEWAL',
  REPLACEMENT = 'REPLACEMENT',
  TEMPORARY_LICENSE = 'TEMPORARY_LICENSE',
  INTERNATIONAL_PERMIT = 'INTERNATIONAL_PERMIT'
}
```

**Assessment**: Current application types cover all necessary scenarios.

### 3. Application Status Workflow ⚠️ NEEDS MODIFICATION
**Current Status Flow** (17 stages):
```typescript
DRAFT → SUBMITTED → ON_HOLD → DOCUMENTS_PENDING → THEORY_TEST_REQUIRED → 
THEORY_PASSED → THEORY_FAILED → PRACTICAL_TEST_REQUIRED → PRACTICAL_PASSED → 
PRACTICAL_FAILED → APPROVED → SENT_TO_PRINTER → CARD_PRODUCTION → 
READY_FOR_COLLECTION → COMPLETED → REJECTED → CANCELLED
```

**Required Changes**: Need to separate into distinct phases:
1. **Application Phase**: Capture application details
2. **Test Phase**: Schedule and conduct tests
3. **Approval Phase**: License approval after tests and payment
4. **Card Ordering Phase**: Separate card ordering with hold logic

## Required System Modifications

### 1. ❌ MISSING: Test Management Module

**Current State**: Basic test tracking in `ApplicationTestAttempt` model
**Required**: Comprehensive test management system

**Needed Components**:
```typescript
interface TestSession {
  id: string;
  application_id: string;
  test_type: 'THEORY' | 'PRACTICAL';
  scheduled_date: Date;
  examiner_id: string;
  instructor_id?: string; // For practical tests
  test_center_id: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'NO_SHOW';
  result?: TestResult;
  score?: number;
  result_notes?: string;
  authorized_by?: string; // Supervisor authorization
  authorized_at?: Date;
}

interface Examiner {
  id: string;
  user_id: string;
  examiner_code: string;
  qualified_categories: LicenseCategory[];
  qualified_test_types: TestType[];
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  unauthorized_tests: TestSession[]; // Tests pending authorization
}
```

**Backend Requirements**:
- Test scheduling endpoints
- Examiner management CRUD
- Test result capture API
- Supervisor authorization workflow
- Test fee tracking

### 2. ❌ MISSING: Renewal & External License Capture

**Current State**: Basic renewal support in application types
**Required**: Comprehensive renewal workflow with external license validation

**Needed Components**:
```typescript
interface RenewalApplication extends Application {
  previous_license_number: string;
  previous_license_source: 'SYSTEM' | 'EXTERNAL';
  external_license_details?: ExternalLicenseDetails;
  license_verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verified_by?: string;
  verification_notes?: string;
}

interface ExternalLicenseCapture {
  license_number: string;
  categories: LicenseCategory[];
  issue_date: Date;
  expiry_date: Date;
  issuing_authority: string;
  verification_documents: File[];
  clerk_verification: boolean;
  verification_notes: string;
}
```

**Backend Requirements**:
- External license capture endpoints
- License verification workflow
- Document upload for verification
- License validation business rules

### 3. ❌ MISSING: Separate Payment Transaction Module

**Current State**: Payment tracking within applications
**Required**: Independent transaction management system

**Needed Components**:
```typescript
interface Transaction {
  id: string;
  transaction_number: string;
  transaction_type: 'APPLICATION_FEE' | 'TEST_FEE' | 'CARD_PRODUCTION_FEE' | 'TEMPORARY_LICENSE_FEE';
  related_application_id?: string;
  related_test_session_id?: string;
  amount: number;
  currency: 'MGA'; // Madagascar Ariary
  payment_status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  payment_method?: 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CARD';
  payment_reference?: string;
  receipt_number?: string;
  processed_by: string;
  processed_at?: Date;
  notes?: string;
}

interface PaymentCollection {
  session_id: string;
  clerk_id: string;
  transactions: Transaction[];
  total_amount: number;
  collection_date: Date;
  reconciliation_status: 'PENDING' | 'RECONCILED';
}
```

**Backend Requirements**:
- Transaction CRUD operations
- Payment processing workflow
- Receipt generation
- Financial reporting and reconciliation

### 4. ❌ MISSING: Card Ordering Module

**Current State**: Direct printing workflow from approved applications
**Required**: Separate card ordering phase with business logic

**Needed Components**:
```typescript
interface CardOrder {
  id: string;
  application_id: string;
  order_type: 'STANDARD_LICENSE' | 'TEMPORARY_LICENSE';
  person_id: string;
  approved_licenses: ApprovedLicense[]; // Multiple if person has multiple approvals
  upcoming_applications: Application[]; // Warn clerk about pending applications
  order_status: 'PENDING_PAYMENT' | 'PAID' | 'READY_FOR_PRINTING' | 'SENT_TO_PRINTER' | 'COMPLETED';
  hold_printing: boolean;
  hold_reason?: string;
  card_production_fee: number;
  payment_status: 'PENDING' | 'PAID';
  payment_transaction_id?: string;
  ordered_by: string; // Clerk
  ordered_at: Date;
  printed_at?: Date;
}

interface ApprovedLicense {
  application_id: string;
  license_categories: LicenseCategory[];
  authorized_categories: LicenseCategory[]; // Including superseded
  restrictions: LicenseRestriction[];
  issue_date: Date;
  expiry_date: Date;
  license_number?: string; // Generated when card ordered
}
```

**Frontend Requirements**:
- Card ordering interface for clerks
- Multiple application warning system
- Hold printing decision logic
- Card production payment workflow

### 5. ⚠️ NEEDS ENHANCEMENT: Application Workflow Separation

**Current Issues**: 
- Application approval leads directly to printing
- No separation between license approval and card ordering
- Payment tied to application rather than separate transactions

**Required Changes**:

**Phase 1: Application Submission**
```typescript
interface ApplicationPhase {
  // Current application submission
  // Add: Test scheduling preference
  // Add: Application-only payment (if any)
  test_preference: {
    preferred_theory_date?: Date;
    preferred_practical_date?: Date;
    test_center_preference?: string;
  };
}
```

**Phase 2: Test Management**
```typescript
interface TestPhase {
  application_id: string;
  theory_session?: TestSession;
  practical_session?: TestSession;
  payment_status: 'PENDING' | 'PAID'; // Test fees paid before test
  can_proceed_to_approval: boolean;
}
```

**Phase 3: License Approval**
```typescript
interface ApprovalPhase {
  application_id: string;
  test_results_approved: boolean;
  payment_verified: boolean;
  documents_verified: boolean;
  medical_verified: boolean;
  approved_license: ApprovedLicense;
  ready_for_card_ordering: boolean;
}
```

**Phase 4: Card Ordering**
```typescript
interface CardOrderingPhase {
  person_id: string;
  approved_licenses: ApprovedLicense[];
  upcoming_applications: Application[];
  clerk_warnings: string[];
  card_order?: CardOrder;
}
```

## Implementation Priority

### High Priority (Core Workflow) 🔴
1. **Test Management Module**
   - Examiner management system
   - Test scheduling and result capture
   - Supervisor authorization workflow

2. **Card Ordering Module** 
   - Separate card ordering from license approval
   - Multiple application warning system
   - Hold printing logic

3. **Transaction Management**
   - Independent payment tracking
   - Multiple fee types (application, test, card production)
   - Receipt generation

### Medium Priority (Business Logic) 🟡
4. **Renewal & External License Capture**
   - External license verification workflow
   - Document upload and clerk verification
   - System integration for renewals

5. **Enhanced Application Status Flow**
   - Separate application phases
   - Status transitions between phases
   - Business rule validation

### Low Priority (Optimization) 🟢
6. **Reporting & Analytics**
   - Financial reconciliation
   - Test performance metrics
   - Application processing analytics

## Database Schema Changes Required

### New Tables Needed:
```sql
-- Test Management
CREATE TABLE examiners (...)
CREATE TABLE test_sessions (...)
CREATE TABLE test_authorizations (...)

-- Transaction Management  
CREATE TABLE transactions (...)
CREATE TABLE payment_collections (...)

-- Card Ordering
CREATE TABLE card_orders (...)
CREATE TABLE approved_licenses (...)

-- External License Capture
CREATE TABLE external_licenses (...)
CREATE TABLE license_verifications (...)
```

### Modified Tables:
```sql
-- Applications: Remove direct printing references
ALTER TABLE applications 
  DROP COLUMN print_ready,
  ADD COLUMN approved_for_card_ordering BOOLEAN DEFAULT FALSE;

-- Add phase tracking
ALTER TABLE applications
  ADD COLUMN current_phase VARCHAR(50) DEFAULT 'APPLICATION';
```

## API Endpoints Required

### Test Management
```typescript
// Test scheduling
POST /api/v1/tests/schedule
GET /api/v1/tests/examiner/{examiner_id}/schedule
PUT /api/v1/tests/{test_id}/results
POST /api/v1/tests/{test_id}/authorize

// Examiner management
GET /api/v1/examiners
POST /api/v1/examiners
PUT /api/v1/examiners/{examiner_id}
```

### Transaction Management
```typescript
// Transaction processing
POST /api/v1/transactions
GET /api/v1/transactions/application/{app_id}
PUT /api/v1/transactions/{transaction_id}/payment
GET /api/v1/transactions/reconciliation
```

### Card Ordering
```typescript
// Card ordering workflow
GET /api/v1/card-orders/person/{person_id}/eligibility
POST /api/v1/card-orders
PUT /api/v1/card-orders/{order_id}/hold
POST /api/v1/card-orders/{order_id}/payment
```

### Renewal & External Licenses
```typescript
// License verification
POST /api/v1/licenses/external/capture
PUT /api/v1/licenses/external/{license_id}/verify
GET /api/v1/licenses/person/{person_id}/all
```

## Frontend Components Required

### New Pages/Components:
1. **Test Management Dashboard** (`/admin/tests`)
2. **Examiner Management** (`/admin/examiners`)
3. **Card Ordering Interface** (`/clerk/card-orders`)
4. **Transaction Management** (`/admin/transactions`)
5. **External License Capture** (`/clerk/external-licenses`)

### Enhanced Components:
1. **Application workflow with phases**
2. **Payment collection interface**
3. **License verification forms**
4. **Multi-application warning system**

## Configuration & Business Rules

### Fee Structure (Madagascar Ariary):
```typescript
const FEE_STRUCTURE = {
  THEORY_TEST_A_B: 10000,      // A/A'/B categories
  THEORY_TEST_C_D_E: 15000,    // C/D/E categories  
  CARD_PRODUCTION: 38000,      // All physical cards
  TEMPORARY_LICENSE: {
    NORMAL: 30000,             // Standard temp license
    URGENT: 100000,            // Urgent processing
    EMERGENCY: 400000          // Emergency processing
  }
};
```

### Business Rules:
```typescript
const BUSINESS_RULES = {
  // Test requirements
  THEORY_REQUIRED: ['NEW_LICENSE', 'LEARNERS_PERMIT'],
  PRACTICAL_REQUIRED: ['NEW_LICENSE'],
  
  // Medical requirements
  MEDICAL_ALWAYS: ['D1', 'D', 'D2'], // Passenger transport
  MEDICAL_OVER_60: ['C1', 'C', 'C1E', 'CE'], // Commercial over 60
  
  // Prerequisites
  REQUIRES_B_LICENSE: ['C1', 'C', 'C1E', 'CE', 'D1', 'D', 'D2'],
  
  // Payment timing
  TEST_FEES_BEFORE_TEST: true,
  CARD_FEES_AT_ORDERING: true,
  
  // Card ordering
  WARN_UPCOMING_APPLICATIONS: true,
  ALLOW_HOLD_PRINTING: true
};
```

## Migration Strategy

### Phase 1: Core Infrastructure
1. Create new database tables
2. Implement transaction management
3. Basic test management module

### Phase 2: Workflow Separation  
1. Implement card ordering module
2. Separate application phases
3. Update status workflow

### Phase 3: External Integrations
1. External license capture
2. Renewal workflow enhancement
3. Payment system integration

### Phase 4: UI/UX Completion
1. Complete frontend interfaces
2. User training materials
3. System testing and validation

## Conclusion

The current system provides a solid foundation with the correct license categories and basic application management. However, significant development is required to implement the Madagascar-specific workflow that separates application submission, testing, approval, and card ordering into distinct phases with independent payment tracking.

The highest priority items are the test management module and card ordering system, as these represent the core workflow changes requested by the user. The transaction management system is also critical for proper financial tracking and reconciliation.

Estimated development effort: **6-8 weeks** for full implementation of all required modules and workflow changes. 