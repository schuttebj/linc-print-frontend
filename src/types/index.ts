/**
 * TypeScript types for Madagascar Driver's License System
 */

// Person-related types
export interface Person {
  id: string;
  surname: string;
  first_name: string;
  middle_name?: string;
  person_nature: 'Male' | 'Female';
  birth_date?: string;
  nationality_code: string;
  preferred_language: string;
  email?: string;
  work_phone?: string;
  cell_phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

// Role interface
export interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
}

// User and authentication types
export interface User {
  id: string;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  is_superuser: boolean;
  user_type?: 'SYSTEM_USER' | 'NATIONAL_ADMIN' | 'PROVINCIAL_ADMIN' | 'LOCATION_USER';
  scope_province?: string;
  primary_location_id?: string;
  roles: Role[];
  permissions: string[];
  created_at: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

// Permission constants for Madagascar system
export const PERMISSIONS = {
  // Person management
  PERSONS_CREATE: 'persons.create',
  PERSONS_READ: 'persons.read',
  PERSONS_UPDATE: 'persons.update',
  PERSONS_DELETE: 'persons.delete',
  PERSONS_SEARCH: 'persons.search',
  PERSONS_CHECK_DUPLICATES: 'persons.check_duplicates',
} as const;

export const ROLES = {
  ADMIN: 'Admin',
  CLERK: 'Clerk',
  SUPERVISOR: 'Supervisor',
  PRINTER: 'Printer',
} as const;

// Location interface
export interface Location {
  id: string;
  name: string;
  code: string;
  full_code: string;
  province_code: string;
  office_type: string;
  is_operational: boolean;
  created_at: string;
  updated_at: string;
}

// Application Types for Madagascar License System
export interface Application {
  id: string;
  application_number: string;
  person_id: string;
  person?: Person;
  location_id: string;
  location?: Location;
  application_type: ApplicationType;
  license_categories: LicenseCategory[];
  status: ApplicationStatus;
  is_urgent: boolean;
  urgency_reason?: string;
  is_temporary_license: boolean;
  validity_period_days?: number;
  
  // Requirements flags
  medical_certificate_required: boolean;
  medical_certificate_provided?: string;
  parental_consent_required: boolean;
  parental_consent_provided?: string;
  requires_existing_license: boolean;
  existing_license_verified?: boolean;
  
  // Test attempts
  theory_test_attempts: number;
  practical_test_attempts: number;
  
  // Biometric data
  photo_url?: string;
  signature_url?: string;
  fingerprint_url?: string;
  
  // Status workflow
  submitted_at?: string;
  approved_at?: string;
  completed_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  
  // Metadata
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  
  // Related applications
  parent_application_id?: string;
  related_applications?: Application[];
}

export interface ApplicationCreate {
  person_id: string;
  location_id: string;
  application_type: ApplicationType;
  license_categories: LicenseCategory[];
  is_urgent: boolean;
  urgency_reason?: string;
  is_temporary_license: boolean;
  validity_period_days?: number;
}

export interface ApplicationUpdate {
  license_categories?: LicenseCategory[];
  is_urgent?: boolean;
  urgency_reason?: string;
  medical_certificate_provided?: string;
  parental_consent_provided?: string;
  existing_license_verified?: boolean;
  photo_url?: string;
  signature_url?: string;
  fingerprint_url?: string;
}

// Enums for applications
export enum ApplicationType {
  NEW_LICENSE = 'NEW_LICENSE',
  LEARNERS_PERMIT = 'LEARNERS_PERMIT', 
  RENEWAL = 'RENEWAL',
  DUPLICATE = 'DUPLICATE',
  UPGRADE = 'UPGRADE',
  TEMPORARY_LICENSE = 'TEMPORARY_LICENSE',
  INTERNATIONAL_PERMIT = 'INTERNATIONAL_PERMIT'
}

export enum LicenseCategory {
  A_PRIME = 'A′',  // Moped (16+)
  A = 'A',         // Full Motorcycle (18+)
  B = 'B',         // Light Vehicle (18+)
  C = 'C',         // Heavy Goods (21+)
  D = 'D',         // Passenger Transport (21+)
  E = 'E'          // Large Trailers (21+)
}

export enum ApplicationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  DOCUMENTS_PENDING = 'DOCUMENTS_PENDING',
  THEORY_TEST_REQUIRED = 'THEORY_TEST_REQUIRED',
  THEORY_PASSED = 'THEORY_PASSED',
  THEORY_FAILED = 'THEORY_FAILED',
  PRACTICAL_TEST_REQUIRED = 'PRACTICAL_TEST_REQUIRED',
  PRACTICAL_PASSED = 'PRACTICAL_PASSED',
  PRACTICAL_FAILED = 'PRACTICAL_FAILED',
  APPROVED = 'APPROVED',
  SENT_TO_PRINTER = 'SENT_TO_PRINTER',
  CARD_PRODUCTION = 'CARD_PRODUCTION',
  READY_FOR_COLLECTION = 'READY_FOR_COLLECTION',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

// Fee Structure
export interface FeeStructure {
  fee_type: string;
  display_name: string;
  description: string;
  amount: number;
  currency: string;
  applies_to_categories: string[];
  applies_to_application_types: string[];
  is_mandatory: boolean;
  effective_from?: string;
  effective_until?: string;
}

// Lookup data
export interface LookupOption {
  value: string;
  label: string;
}

export interface ApplicationLookups {
  license_categories: LookupOption[];
  application_types: LookupOption[];
  application_statuses: LookupOption[];
  fee_structures: FeeStructure[];
}

// Biometric capture data
export interface BiometricCaptureData {
  photo?: File;
  signature?: File;
  fingerprint?: File;
}

// Form data interfaces for multi-step form
export interface ApplicationFormData {
  // Step 1: Person (handled by PersonFormWrapper)
  person: Person | null;
  
  // Step 2: Application Details
  application_type: ApplicationType;
  license_categories: LicenseCategory[];
  is_urgent: boolean;
  urgency_reason?: string;
  is_temporary_license: boolean;
  validity_period_days?: number;
  
  // Step 3: Requirements
  medical_certificate_file?: File;
  parental_consent_file?: File;
  existing_license_verified?: boolean;
  
  // Step 4: Biometric Data
  biometric_data: BiometricCaptureData;
  
  // Step 5: Review & Submit
  selected_fees: FeeStructure[];
  total_amount: number;
  notes?: string;
} 