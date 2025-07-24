/**
 * TypeScript types for Madagascar Driver's License System
 */

// Person-related types
export interface Person {
  id: string;
  surname: string;
  first_name: string;
  last_name?: string; // Added for compatibility
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
  aliases?: PersonAlias[];
}

export interface PersonAlias {
  id: string;
  document_type: string;
  document_number: string;
  country_of_issue: string;
  name_in_document?: string;
  is_primary: boolean;
  is_current: boolean;
  issue_date?: string;
  expiry_date?: string;
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
  primary_location?: string; // Added for UI display
  roles: Role[];
  permissions: string[];
  created_at: string;
  
  // Method to check location access (will be added by AuthContext)
  can_access_location?: (locationId: string) => boolean;
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

// Biometric Data interface to match enhanced backend response
export interface BiometricDataItem {
  id: string;
  application_id: string;
  data_type: 'PHOTO' | 'SIGNATURE' | 'FINGERPRINT';
  file_path: string;
  file_url: string; // New: Direct API URL for authenticated access
  file_size: number;
  file_format: string;
  capture_method: string;
  image_resolution?: string;
  quality_score?: number;
  is_verified: boolean;
  metadata?: {
    processing_info?: {
      cropped_to_iso?: boolean;
      enhanced?: boolean;
      compression_ratio?: number;
      license_ready_compression?: number;
      license_ready_size?: number;
    };
    standard_version?: {
      file_path: string;
      filename: string;
      file_size: number;
      dimensions: string;
    };
    license_ready_version?: {
      file_path: string;
      filename: string;
      file_size: number;
      dimensions: string;
    };
  };
  created_at: string;
  updated_at?: string;
  notes?: string;
}

// Enhanced photo data with license-ready info
export interface PhotoBiometricData extends BiometricDataItem {
  license_ready?: {
    file_path: string;
    filename: string;
    file_size: number;
    dimensions: string;
    file_url: string; // Direct URL to license-ready endpoint
  };
}

// Organized biometric data structure from enhanced backend
export interface OrganizedBiometricData {
  photo?: PhotoBiometricData;
  signature?: BiometricDataItem;
  fingerprint?: BiometricDataItem;
}

// Legacy BiometricData interface (for backward compatibility)
export interface BiometricData {
  id: string;
  application_id: string;
  data_type: 'PHOTO' | 'SIGNATURE' | 'FINGERPRINT';
  file_path: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
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
  license_category: LicenseCategory;
  status: ApplicationStatus;
  test_result?: TestResult; // Test result for NEW_LICENSE and LEARNERS_PERMIT applications
  is_urgent: boolean;
  urgency_reason?: string;
  is_temporary_license: boolean;
  validity_period_days?: number;
  
  // New fields for enhanced workflow
  is_on_hold: boolean;
  parent_application_id?: string;
  replacement_reason?: string;
  
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
  
  // Biometric data (legacy URLs)
  photo_url?: string;
  signature_url?: string;
  fingerprint_url?: string;
  
  // New biometric data structure from backend
  biometric_data?: BiometricDataItem[];
  
  // Status workflow
  submitted_at?: string;
  approved_at?: string;
  completed_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  
  // Payment stage tracking (for staged payments)
  test_payment_completed?: boolean;
  test_payment_date?: string;
  card_payment_completed?: boolean;
  card_payment_date?: string;
  current_payment_stage?: string;
  
  // Card ordering
  can_order_card?: boolean;
  
  // Metadata
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  
  // Related applications
  related_applications?: Application[];
}

export interface ApplicationCreate {
  person_id: string;
  location_id: string;
  application_type: ApplicationType;
  license_category: LicenseCategory;
  // Medical information for this specific application
  medical_information?: MedicalInformation;
  // External license verification data
  license_verification?: LicenseVerificationData;
  // License capture data (for DRIVERS_LICENSE_CAPTURE and LEARNERS_PERMIT_CAPTURE)
  license_capture?: LicenseCaptureData;
  // Section B data
  never_been_refused?: boolean;
  refusal_details?: string;
  // Section C data (for duplicates, renewals, etc.)
  replacement_reason?: 'theft' | 'loss' | 'destruction' | 'recovery' | 'new_card' | 'change_particulars';
  office_of_issue?: string;
  police_reported?: boolean;
  police_station?: string;
  police_reference_number?: string;
  date_of_change?: string;
}

export interface ApplicationUpdate {
  license_category?: LicenseCategory;
  is_urgent?: boolean;
  urgency_reason?: string;
  is_on_hold?: boolean;
  replacement_reason?: string;
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
  LEARNERS_PERMIT_DUPLICATE = 'LEARNERS_PERMIT_DUPLICATE',
  RENEWAL = 'RENEWAL',
  TEMPORARY_LICENSE = 'TEMPORARY_LICENSE',
  INTERNATIONAL_PERMIT = 'INTERNATIONAL_PERMIT',
  DRIVERS_LICENSE_CAPTURE = 'DRIVERS_LICENSE_CAPTURE',
  LEARNERS_PERMIT_CAPTURE = 'LEARNERS_PERMIT_CAPTURE',
  PROFESSIONAL_LICENSE = 'PROFESSIONAL_LICENSE',
  FOREIGN_CONVERSION = 'FOREIGN_CONVERSION'
}

export enum LicenseCategory {
  // Motorcycles and Mopeds
  A1 = 'A1',       // Small motorcycles and mopeds (<125cc, 16+)
  A2 = 'A2',       // Mid-range motorcycles (power limited, up to 35kW, 18+)
  A = 'A',         // Unlimited motorcycles (large motorcycles, 20+)
  
  // Light Vehicles
  B1 = 'B1',       // Light quadricycles (motorized tricycles/quadricycles, 16+)
  B = 'B',         // Standard passenger cars and light vehicles (up to 3.5t, 18+)
  B2 = 'B2',       // Taxis or commercial passenger vehicles (21+)
  BE = 'BE',       // Category B with trailer exceeding 750kg (18+)
  
  // Heavy Goods Vehicles
  C1 = 'C1',       // Medium-sized goods vehicles (3.5-7.5t, 18+)
  C = 'C',         // Heavy goods vehicles (over 7.5t, 21+)
  C1E = 'C1E',     // C1 category vehicles with heavy trailer (18+)
  CE = 'CE',       // Full heavy combination vehicles (21+)
  
  // Passenger Transport (Public Transport)
  D1 = 'D1',       // Small buses (up to 16 passengers, 21+)
  D = 'D',         // Standard buses and coaches (over 16 passengers, 24+)
  D2 = 'D2',       // Specialized public transport (articulated buses, 24+)
  
  // Learner's Permit Codes (used only for LEARNERS_PERMIT applications)
  LEARNERS_1 = '1', // Motor cycle without a sidecar, motor tricycle or motor quadrucycle, with engine of any capacity
  LEARNERS_2 = '2', // Light motor vehicle, other than a motor cycle, motor tricycle or motor quadrucycle
  LEARNERS_3 = '3'  // Any motor vehicle other than a motor cycle, motor tricycle or motor quadrucycle
}

export enum ApplicationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  PAID = 'PAID',
  ON_HOLD = 'ON_HOLD',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  ABSENT = 'ABSENT',
  CARD_PAYMENT_PENDING = 'CARD_PAYMENT_PENDING',
  APPROVED = 'APPROVED',
  SENT_TO_PRINTER = 'SENT_TO_PRINTER',
  CARD_PRODUCTION = 'CARD_PRODUCTION',
  READY_FOR_COLLECTION = 'READY_FOR_COLLECTION',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export enum TestResult {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  ABSENT = 'ABSENT'
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
export interface ProcessedBiometricFile {
  filename: string;
  file_size: number;
  dimensions: string;
  format: string;
  iso_compliant?: boolean;
  processed_url: string;
}

export interface BiometricCaptureData {
  photo?: File | ProcessedBiometricFile;
  signature?: File;
  fingerprint?: File;
}

// Medical Information for Driver's License Applications
export interface MedicalInformation {
  // Vision Tests
  vision_test: VisionTestData;
  
  // Medical Conditions (required by backend)
  medical_conditions: MedicalConditions;
  
  // Physical Assessment (required by backend)
  physical_assessment: PhysicalAssessment;
  
  // Medical Certificates
  medical_certificate_file?: File;
  medical_certificate_passed: boolean;
  medical_practitioner_name?: string;
  practice_number?: string;
  
  // Overall medical clearance
  medical_clearance: boolean;
  medical_restrictions: string[];
  medical_notes?: string;
  examined_by?: string;
  examination_date?: string; // Will be converted to date for API
}

export interface VisionTestData {
  // Visual Acuity (6/12 minimum each eye, or 6/9 if one eye impaired)
  visual_acuity_right_eye: string; // e.g., "6/6", "6/9", "6/12"
  visual_acuity_left_eye: string;
  visual_acuity_binocular: string;
  
  // Visual Field (120 degrees horizontal minimum, or 115 degrees if one eye impaired)
  visual_field_horizontal_degrees: number;
  visual_field_left_eye_degrees?: number;
  visual_field_right_eye_degrees?: number;
  
  // Corrective Lenses
  corrective_lenses_required: boolean; // Auto-determined based on acuity
  corrective_lenses_already_used: boolean; // Manual check by clerk
  
  // Overall vision status
  vision_meets_standards: boolean; // Auto-determined
  vision_restrictions: string[]; // Auto-populated based on requirements
}

export interface MedicalConditions {
  // Neurological Conditions
  epilepsy: boolean;
  epilepsy_controlled: boolean;
  epilepsy_medication?: string;
  seizures_last_occurrence?: string;
  
  // Mental Health
  mental_illness: boolean;
  mental_illness_type?: string;
  mental_illness_controlled: boolean;
  mental_illness_medication?: string;
  
  // Cardiovascular
  heart_condition: boolean;
  heart_condition_type?: string;
  blood_pressure_controlled: boolean;
  
  // Diabetes
  diabetes: boolean;
  diabetes_type?: 'TYPE_1' | 'TYPE_2' | 'GESTATIONAL';
  diabetes_controlled: boolean;
  diabetes_medication?: string;
  
  // Substance Use
  alcohol_dependency: boolean;
  drug_dependency: boolean;
  substance_treatment_program: boolean;
  
  // Other conditions
  fainting_episodes: boolean;
  dizziness_episodes: boolean;
  muscle_coordination_issues: boolean;
  
  // Medications that may affect driving
  medications_affecting_driving: boolean;
  current_medications: string[];
  
  // Overall medical fitness
  medically_fit_to_drive: boolean;
  conditions_requiring_monitoring: string[];
}

export interface PhysicalAssessment {
  // Hearing
  hearing_adequate: boolean;
  hearing_aid_required: boolean;
  
  // Physical disabilities
  limb_disabilities: boolean;
  limb_disability_details?: string;
  adaptive_equipment_required: boolean;
  adaptive_equipment_type?: string[];
  
  // Mobility
  mobility_impairment: boolean;
  mobility_aid_required: boolean;
  mobility_aid_type?: string;
  
  // Reaction time
  reaction_time_adequate: boolean;
  
  // Overall physical fitness
  physically_fit_to_drive: boolean;
  physical_restrictions: string[];
}

// License verification types
export interface SystemLicense {
  id: string;
  license_number: string;
  license_type: 'LEARNERS_PERMIT' | 'DRIVERS_LICENSE';
  categories: LicenseCategory[];
  issue_date: string;
  expiry_date: string;
  status: LicenseStatus;
  issuing_location: string;
  application_id: string;
  // System licenses are always trusted
  verified: true;
  verification_source: 'SYSTEM';
}

export interface ExternalLicense {
  id?: string; // temp ID for form management
  license_number: string;
  license_category: LicenseCategory; // Single category for the form
  license_type: 'LEARNERS_PERMIT' | 'DRIVERS_LICENSE';
  categories: LicenseCategory[]; // Full categories array for system compatibility
  issue_date: string;
  expiry_date: string;
  issuing_authority: string; // Added for form compatibility
  issuing_location: string;
  restrictions: string; // Added for form compatibility
  // External licenses require manual verification
  verified: boolean;
  verification_source: 'MANUAL';
  verification_notes?: string;
  verified_by?: string;
  verified_at?: string;
  // Auto-population fields
  is_auto_populated?: boolean; // True if auto-populated for prerequisites
  required_for_category?: LicenseCategory; // Category this license is required for
  is_required: boolean; // Whether this external license is mandatory for the application
}

export interface LicenseVerificationData {
  person_id: string;
  system_licenses: SystemLicense[];
  external_licenses: ExternalLicense[];
  all_license_categories: LicenseCategory[]; // Combined from all licenses
  requires_verification: boolean; // True if any external licenses exist
}

// License capture interface for DRIVERS_LICENSE_CAPTURE and LEARNERS_PERMIT_CAPTURE applications
export interface CapturedLicense {
  id: string; // temp ID for form management
  license_number?: string; // For learner's permits
  license_category: LicenseCategory; // Single category only
  issue_date: string;
  restrictions: {
    driver_restrictions: string[];
    vehicle_restrictions: string[];
  }; // License restrictions in new structured format
  verified: boolean;
  verification_notes?: string;
}

export interface LicenseCaptureData {
  captured_licenses: CapturedLicense[];
  application_type: ApplicationType;
}

// Form data interfaces for multi-step form (update existing)
export interface ApplicationFormData {
  // Step 1: Person (handled by PersonFormWrapper)
  person: Person | null;
  
  // Step 2: Application Details - Section B
  application_type: ApplicationType;
  license_category: LicenseCategory;
  // Location selection for admin users
  selected_location_id?: string;
  
  // Section B: Never been refused declaration
  never_been_refused: boolean;
  refusal_details?: string;
  
  // Professional Driving Permit specific fields (for PROFESSIONAL_LICENSE applications)
  professional_permit_categories: ProfessionalPermitCategory[];
  professional_permit_previous_refusal: boolean;
  professional_permit_refusal_details?: string;
  
  // Step 3: Section C - Notice/Replacement Details (for specific application types)
  replacement_reason?: 'theft' | 'loss' | 'destruction' | 'recovery' | 'new_card' | 'change_particulars';
  office_of_issue?: string;
  police_reported?: boolean;
  police_station?: string;
  police_reference_number?: string;
  date_of_change?: string;
  
  // Step 4: Requirements - Section D (will be defined later)
  medical_certificate_file?: File;
  parental_consent_file?: File;
  // License verification data (for general applications)
  license_verification: LicenseVerificationData | null;
  // License capture data (for DRIVERS_LICENSE_CAPTURE and LEARNERS_PERMIT_CAPTURE only)
  license_capture: LicenseCaptureData | null;
  
  // Step 5: Medical Information (when required)
  medical_information: MedicalInformation | null;
  
  // Step 6: Biometric Data
  biometric_data: {
    photo?: File | string | {
      filename: string;
      file_size: number;
      dimensions: string;
      format: string;
      iso_compliant: boolean;
      processed_url: string;
      base64_data?: string; // For processed images
    };
    signature?: File | string | {
      filename: string;
      file_size: number;
      format: string;
      processed_url: string;
      base64_data?: string; // For processed images
    };
    fingerprint?: File | string | {
      filename: string;
      file_size: number;
      format: string;
      processed_url: string;
      base64_data?: string; // For processed images
    };
  };
  
  // Final step data
  selected_fees: FeeStructure[];
  total_amount: number;
  notes?: string;
}

// New types for Madagascar licensing logic
export interface ExternalLicenseDetails {
  license_number: string;
  license_type: 'LEARNERS_PERMIT' | 'DRIVERS_LICENSE';
  categories: LicenseCategory[];
  issue_date: string;
  expiry_date: string;
  issuing_location: string;
  verified_by_clerk: boolean;
  verification_notes?: string;
}

export interface LicenseValidationResult {
  is_valid: boolean;
  message: string;
  missing_prerequisites: LicenseCategory[];
  age_violations: { category: LicenseCategory; required_age: number; current_age: number }[];
  invalid_combinations: string[];
}

export interface ExistingLicenseCheck {
  person_id: string;
  has_active_licenses: boolean;
  active_licenses: ActiveLicense[];
  has_learners_permit: boolean;
  learners_permit?: ActiveLicense;
  can_apply_for: LicenseCategory[];
  must_renew: LicenseCategory[];
  can_upgrade_to: LicenseCategory[];
}

export interface ActiveLicense {
  id: string;
  license_number: string;
  categories: LicenseCategory[];
  license_type: 'LEARNERS_PERMIT' | 'DRIVERS_LICENSE';
  issue_date: string;
  expiry_date: string;
  status: LicenseStatus;
  is_valid: boolean;
}

// New enums for licensing validation
export enum LicenseStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED',
  REVOKED = 'REVOKED',
  PENDING = 'PENDING'
}

export enum LicensePrerequisite {
  REQUIRES_B = 'REQUIRES_B',
  REQUIRES_B_OR_C_OR_D = 'REQUIRES_B_OR_C_OR_D',
  REQUIRES_LEARNERS_PERMIT = 'REQUIRES_LEARNERS_PERMIT'
}

// License Category Rules based on Madagascar superseding matrix
export interface LicenseCategoryRule {
  category: LicenseCategory;
  minimum_age: number;
  prerequisites: LicenseCategory[];
  supersedes: LicenseCategory[]; // Categories this license allows you to drive
  description: string;
  restrictions: string[];
  requires_learners_permit: boolean;
  allows_learners_permit: boolean;
  test_requirements: string[];
  medical_requirements: string[];
}

// Comprehensive superseding matrix for Madagascar
export const SUPERSEDING_MATRIX: Record<LicenseCategory, LicenseCategory[]> = {
  // Motorcycles
  [LicenseCategory.A]: [LicenseCategory.A, LicenseCategory.A1, LicenseCategory.A2],
  [LicenseCategory.A1]: [LicenseCategory.A1, LicenseCategory.A2],
  [LicenseCategory.A2]: [LicenseCategory.A1, LicenseCategory.A2],
  
  // Light Vehicles
  [LicenseCategory.B]: [LicenseCategory.B, LicenseCategory.B1, LicenseCategory.B2],
  [LicenseCategory.B1]: [LicenseCategory.B1],
  [LicenseCategory.B2]: [LicenseCategory.B1, LicenseCategory.B2],
  
  // Heavy Goods Vehicles
  [LicenseCategory.C]: [LicenseCategory.B, LicenseCategory.B1, LicenseCategory.B2, LicenseCategory.C, LicenseCategory.C1],
  [LicenseCategory.C1]: [LicenseCategory.B, LicenseCategory.B1, LicenseCategory.B2, LicenseCategory.C1],
  
  // Trailers
  [LicenseCategory.BE]: [LicenseCategory.B, LicenseCategory.B1, LicenseCategory.B2, LicenseCategory.BE],
  [LicenseCategory.CE]: [LicenseCategory.B, LicenseCategory.B1, LicenseCategory.B2, LicenseCategory.C, LicenseCategory.C1, LicenseCategory.BE, LicenseCategory.CE],
  [LicenseCategory.C1E]: [LicenseCategory.B, LicenseCategory.B1, LicenseCategory.B2, LicenseCategory.C, LicenseCategory.C1, LicenseCategory.BE, LicenseCategory.C1E],
  
  // Passenger Transport
  [LicenseCategory.D]: [LicenseCategory.B, LicenseCategory.B1, LicenseCategory.B2, LicenseCategory.C, LicenseCategory.C1, LicenseCategory.D, LicenseCategory.D1],
  [LicenseCategory.D1]: [LicenseCategory.B, LicenseCategory.B1, LicenseCategory.B2, LicenseCategory.C, LicenseCategory.C1, LicenseCategory.D1],
  [LicenseCategory.D2]: [LicenseCategory.B, LicenseCategory.B1, LicenseCategory.B2, LicenseCategory.C, LicenseCategory.C1, LicenseCategory.D, LicenseCategory.D1, LicenseCategory.D2, LicenseCategory.BE, LicenseCategory.CE, LicenseCategory.C1E],
  
  // Learner's Permits
  [LicenseCategory.LEARNERS_1]: [LicenseCategory.LEARNERS_1],
  [LicenseCategory.LEARNERS_2]: [LicenseCategory.LEARNERS_2],
  [LicenseCategory.LEARNERS_3]: [LicenseCategory.LEARNERS_3]
};

// Detailed license category rules
export const LICENSE_CATEGORY_RULES: Record<LicenseCategory, LicenseCategoryRule> = {
  [LicenseCategory.A1]: {
    category: LicenseCategory.A1,
    minimum_age: 16,
    prerequisites: [],
    supersedes: [LicenseCategory.A1],
    description: "Small motorcycles and mopeds (<125 cc)",
    restrictions: [
      "No prior licence required",
      "Motorcycle-specific theory and practical tests required",
      "Vision and medical fitness exam required",
      "Helmet mandatory for rider and passenger"
    ],
    requires_learners_permit: true,
    allows_learners_permit: true,
    test_requirements: ["Theory test", "Practical riding exam"],
    medical_requirements: ["Vision exam", "Medical fitness exam"]
  },
  
  [LicenseCategory.A2]: {
    category: LicenseCategory.A2,
    minimum_age: 18,
    prerequisites: [LicenseCategory.A1], // Must hold A1 for ≥2 years
    supersedes: [LicenseCategory.A1, LicenseCategory.A2],
    description: "Mid-range motorcycles (power-limited ≤35 kW)",
    restrictions: [
      "Must hold A1 for ≥2 years before upgrading",
      "Theory and practical tests required",
      "Medical/vision exam required",
      "Helmet requirement"
    ],
    requires_learners_permit: true,
    allows_learners_permit: true,
    test_requirements: ["Theory test", "Practical riding exam"],
    medical_requirements: ["Vision exam", "Medical fitness exam"]
  },
  
  [LicenseCategory.A]: {
    category: LicenseCategory.A,
    minimum_age: 18, // Or 24 years for direct access
    prerequisites: [LicenseCategory.A2], // Must hold A2 for ≥2 years
    supersedes: [LicenseCategory.A, LicenseCategory.A1, LicenseCategory.A2],
    description: "Unlimited motorcycles (no power restriction)",
    restrictions: [
      "Must hold A2 for ≥2 years (or ≥24 years old for direct access)",
      "Same testing and medical requirements as A1/A2"
    ],
    requires_learners_permit: true,
    allows_learners_permit: true,
    test_requirements: ["Theory test", "Practical riding exam"],
    medical_requirements: ["Vision exam", "Medical fitness exam"]
  },
  
  [LicenseCategory.B1]: {
    category: LicenseCategory.B1,
    minimum_age: 16,
    prerequisites: [],
    supersedes: [LicenseCategory.B1],
    description: "Light quadricycles (motorized tricycles, quadricycles)",
    restrictions: [
      "No prior licence required",
      "Light-vehicle theory test and practical driving exam",
      "Vision and medical exam required"
    ],
    requires_learners_permit: true,
    allows_learners_permit: true,
    test_requirements: ["Theory test", "Practical driving exam"],
    medical_requirements: ["Vision exam", "Medical exam"]
  },
  
  [LicenseCategory.B]: {
    category: LicenseCategory.B,
    minimum_age: 18,
    prerequisites: [],
    supersedes: [LicenseCategory.B, LicenseCategory.B1, LicenseCategory.B2],
    description: "Standard passenger cars and light goods vehicles (≤3,500 kg, ≤8 seats)",
    restrictions: [
      "Must first pass a learner's permit (theory test)",
      "Medical and vision exams required",
      "Provisional licence may apply before full card"
    ],
    requires_learners_permit: true,
    allows_learners_permit: true,
    test_requirements: ["Theory test", "Practical driving exam"],
    medical_requirements: ["Vision exam", "Medical exam"]
  },
  
  [LicenseCategory.B2]: {
    category: LicenseCategory.B2,
    minimum_age: 18,
    prerequisites: [LicenseCategory.B], // Full B plus PSV endorsement
    supersedes: [LicenseCategory.B1, LicenseCategory.B2],
    description: "Taxis or commercial passenger vehicles",
    restrictions: [
      "Full B plus PSV endorsement required",
      "Passenger-carry safety and first-aid course",
      "Clean driving record required",
      "Medical fitness check"
    ],
    requires_learners_permit: false,
    allows_learners_permit: false,
    test_requirements: ["PSV endorsement", "Safety course"],
    medical_requirements: ["Medical fitness check"]
  },
  
  [LicenseCategory.BE]: {
    category: LicenseCategory.BE,
    minimum_age: 18,
    prerequisites: [LicenseCategory.B], // Must hold full Category B
    supersedes: [LicenseCategory.B, LicenseCategory.B1, LicenseCategory.B2, LicenseCategory.BE],
    description: "B vehicles towing trailers (>750 kg trailer)",
    restrictions: [
      "Must hold a full Category B licence",
      "Additional trailer-handling practical test",
      "Trailer-specific theory test"
    ],
    requires_learners_permit: false,
    allows_learners_permit: false,
    test_requirements: ["Trailer theory test", "Trailer practical test"],
    medical_requirements: ["Standard B requirements"]
  },
  
  [LicenseCategory.C1]: {
    category: LicenseCategory.C1,
    minimum_age: 18,
    prerequisites: [LicenseCategory.B], // Must hold full B for ≥2 years
    supersedes: [LicenseCategory.B, LicenseCategory.B1, LicenseCategory.B2, LicenseCategory.C1],
    description: "Medium goods vehicles (3,500–7,500 kg)",
    restrictions: [
      "Must hold full Category B licence (often for ≥2 years)",
      "Heavy-vehicle theory and practical tests",
      "Annual medical and vision exams",
      "Tachograph-training course"
    ],
    requires_learners_permit: false,
    allows_learners_permit: false,
    test_requirements: ["Heavy vehicle theory", "Heavy vehicle practical", "Tachograph training"],
    medical_requirements: ["Annual medical exam", "Vision exam"]
  },
  
  [LicenseCategory.C]: {
    category: LicenseCategory.C,
    minimum_age: 21,
    prerequisites: [LicenseCategory.C1], // C1 for ≥2 years (or B for ≥2 years)
    supersedes: [LicenseCategory.B, LicenseCategory.B1, LicenseCategory.B2, LicenseCategory.C, LicenseCategory.C1],
    description: "Heavy goods vehicles (>7,500 kg)",
    restrictions: [
      "C1 for ≥2 years (or B for ≥2 years)",
      "Advanced heavy-combination handling",
      "Annual medical and vision exams"
    ],
    requires_learners_permit: false,
    allows_learners_permit: false,
    test_requirements: ["Advanced heavy vehicle practical"],
    medical_requirements: ["Annual medical exam", "Vision exam"]
  },
  
  [LicenseCategory.C1E]: {
    category: LicenseCategory.C1E,
    minimum_age: 21,
    prerequisites: [LicenseCategory.C1],
    supersedes: [LicenseCategory.B, LicenseCategory.B1, LicenseCategory.B2, LicenseCategory.C, LicenseCategory.C1, LicenseCategory.BE, LicenseCategory.C1E],
    description: "C1 vehicles with heavy trailer (>750 kg)",
    restrictions: [
      "Full C1 licence required",
      "Trailer-combination practical test",
      "Tachograph and ADR training if applicable"
    ],
    requires_learners_permit: false,
    allows_learners_permit: false,
    test_requirements: ["Trailer combination test", "ADR training (if applicable)"],
    medical_requirements: ["Annual medical exam"]
  },
  
  [LicenseCategory.CE]: {
    category: LicenseCategory.CE,
    minimum_age: 21,
    prerequisites: [LicenseCategory.C],
    supersedes: [LicenseCategory.B, LicenseCategory.B1, LicenseCategory.B2, LicenseCategory.C, LicenseCategory.C1, LicenseCategory.BE, LicenseCategory.CE, LicenseCategory.C1E],
    description: "Full heavy combinations (tractors + large/semi-trailers)",
    restrictions: [
      "Category C licence required",
      "Advanced combination practical exam",
      "ADR training for hazardous loads",
      "Regular medical exams"
    ],
    requires_learners_permit: false,
    allows_learners_permit: false,
    test_requirements: ["Advanced combination exam", "ADR training"],
    medical_requirements: ["Regular medical exams"]
  },
  
  [LicenseCategory.D1]: {
    category: LicenseCategory.D1,
    minimum_age: 21,
    prerequisites: [LicenseCategory.B],
    supersedes: [LicenseCategory.B, LicenseCategory.B1, LicenseCategory.B2, LicenseCategory.C, LicenseCategory.C1, LicenseCategory.D1],
    description: "Small buses (≤16 passengers)",
    restrictions: [
      "Full Category B licence required",
      "PSV endorsement or PCV course",
      "First-aid and passenger-safety training",
      "Medical fitness exam",
      "Criminal background check"
    ],
    requires_learners_permit: false,
    allows_learners_permit: false,
    test_requirements: ["PCV course", "First-aid training", "Passenger safety"],
    medical_requirements: ["Medical fitness exam", "Background check"]
  },
  
  [LicenseCategory.D]: {
    category: LicenseCategory.D,
    minimum_age: 24,
    prerequisites: [LicenseCategory.D1], // D1 for ≥2 years
    supersedes: [LicenseCategory.B, LicenseCategory.B1, LicenseCategory.B2, LicenseCategory.C, LicenseCategory.C1, LicenseCategory.D, LicenseCategory.D1],
    description: "Standard buses/coaches (>16 passengers)",
    restrictions: [
      "D1 for ≥2 years (or B + D1)",
      "Enhanced PCV practical test",
      "Regular medical and vision checks",
      "Criminal background check"
    ],
    requires_learners_permit: false,
    allows_learners_permit: false,
    test_requirements: ["Enhanced PCV practical test"],
    medical_requirements: ["Regular medical and vision checks", "Background check"]
  },
  
  [LicenseCategory.D2]: {
    category: LicenseCategory.D2,
    minimum_age: 24,
    prerequisites: [LicenseCategory.D],
    supersedes: [LicenseCategory.B, LicenseCategory.B1, LicenseCategory.B2, LicenseCategory.C, LicenseCategory.C1, LicenseCategory.D, LicenseCategory.D1, LicenseCategory.D2, LicenseCategory.BE, LicenseCategory.CE, LicenseCategory.C1E],
    description: "Specialized public-transport vehicles (articulated buses)",
    restrictions: [
      "Full Category D licence required",
      "Articulated-bus practical exam",
      "Additional route-map or passenger-assist training"
    ],
    requires_learners_permit: false,
    allows_learners_permit: false,
    test_requirements: ["Articulated-bus practical exam", "Route-map training"],
    medical_requirements: ["Regular medical checks"]
  },
  
  // Learner's Permit Categories
  [LicenseCategory.LEARNERS_1]: {
    category: LicenseCategory.LEARNERS_1,
    minimum_age: 16,
    prerequisites: [],
    supersedes: [LicenseCategory.LEARNERS_1],
    description: "Learner's permit for motor cycles, motor tricycles and motor quadricycles with engine of any capacity",
    restrictions: ["Must be accompanied by licensed driver", "Display L plates", "Theory test required"],
    requires_learners_permit: false,
    allows_learners_permit: true,
    test_requirements: ["Theory test"],
    medical_requirements: ["Vision exam", "Medical fitness exam"]
  },
  
  [LicenseCategory.LEARNERS_2]: {
    category: LicenseCategory.LEARNERS_2,
    minimum_age: 17,
    prerequisites: [],
    supersedes: [LicenseCategory.LEARNERS_2],
    description: "Learner's permit for light motor vehicles, other than motor cycles, motor tricycles or motor quadricycles",
    restrictions: ["Must be accompanied by licensed driver", "Display L plates", "Theory test required"],
    requires_learners_permit: false,
    allows_learners_permit: true,
    test_requirements: ["Theory test"],
    medical_requirements: ["Vision exam", "Medical fitness exam"]
  },
  
  [LicenseCategory.LEARNERS_3]: {
    category: LicenseCategory.LEARNERS_3,
    minimum_age: 18,
    prerequisites: [],
    supersedes: [LicenseCategory.LEARNERS_3],
    description: "Learner's permit for any motor vehicle other than motor cycles, motor tricycles or motor quadricycles",
    restrictions: ["Must be accompanied by licensed driver", "Display L plates", "Theory test required"],
    requires_learners_permit: false,
    allows_learners_permit: true,
    test_requirements: ["Theory test"],
    medical_requirements: ["Vision exam", "Medical fitness exam"]
  }
};

// Helper function to get all authorized categories including superseded ones
export const getAuthorizedCategories = (appliedCategory: LicenseCategory): LicenseCategory[] => {
  return SUPERSEDING_MATRIX[appliedCategory];
};

// Helper function to check if category requires specific transmission
export const getTransmissionRestrictions = (
  categories: LicenseCategory[], 
  appliedTransmission: TransmissionType,
  hasDisabilityModification: boolean = false
): LicenseRestriction[] => {
  const restrictions: LicenseRestriction[] = [];
  
  // Transmission restrictions
  if (appliedTransmission === TransmissionType.AUTOMATIC) {
    restrictions.push(LicenseRestriction.AUTOMATIC_ONLY);
  }
  
  // Disability restrictions override other restrictions
  if (hasDisabilityModification) {
    restrictions.push(LicenseRestriction.MODIFIED_VEHICLE_ONLY);
  }
  
  return restrictions;
};

// Valid license category combinations - now supports all categories individually
export const VALID_COMBINATIONS = [
  // Individual categories (all are now valid to apply for individually)
  [LicenseCategory.A1],
  [LicenseCategory.A2], 
  [LicenseCategory.A],
  [LicenseCategory.B1],
  [LicenseCategory.B],
  [LicenseCategory.B2],
  [LicenseCategory.BE],
  [LicenseCategory.C1],
  [LicenseCategory.C],
  [LicenseCategory.C1E],
  [LicenseCategory.CE],
  [LicenseCategory.D1],
  [LicenseCategory.D],
  [LicenseCategory.D2]
];

// Constants
export const LEARNERS_PERMIT_VALIDITY_MONTHS = 6;
export const DEFAULT_TEMPORARY_LICENSE_DAYS = 90;

// New: Person license accumulation system
export interface PersonLicenseProfile {
  person_id: string;
  accumulated_categories: LicenseCategory[];
  latest_license_number?: string;
  latest_card_issue_date?: string;
  latest_card_expiry_date?: string;
  learners_permit_categories: LicenseCategory[];
  learners_permit_expiry?: string;
  updated_at: string;
}

// New: Replacement reasons
export enum ReplacementReason {
  LOST = 'LOST',
  STOLEN = 'STOLEN', 
  DAMAGED = 'DAMAGED',
  NAME_CHANGE = 'NAME_CHANGE',
  ADDRESS_CHANGE = 'ADDRESS_CHANGE',
  OTHER = 'OTHER'
}

// Transmission types
export enum TransmissionType {
  MANUAL = 'MANUAL',
  AUTOMATIC = 'AUTOMATIC'
}

// License restriction types
export enum LicenseRestriction {
  AUTOMATIC_ONLY = 'AUTOMATIC_ONLY',
  MODIFIED_VEHICLE_ONLY = 'MODIFIED_VEHICLE_ONLY',
  CORRECTIVE_LENSES = 'CORRECTIVE_LENSES',
  VISION_RESTRICTED = 'VISION_RESTRICTED'
}

// Professional Driving Permit Categories
export enum ProfessionalPermitCategory {
  P = 'P', // Passengers (21 years minimum)
  D = 'D', // Dangerous goods (25 years minimum) - automatically includes G
  G = 'G'  // Goods (18 years minimum)
}

// Helper functions for the new license system
export const isCommercialLicense = (category: LicenseCategory): boolean => {
  return [
    LicenseCategory.B2,   // Taxi/commercial passenger
    LicenseCategory.C1,   // Medium goods
    LicenseCategory.C,    // Heavy goods  
    LicenseCategory.C1E,  // Medium goods with trailer
    LicenseCategory.CE,   // Heavy combination
    LicenseCategory.D1,   // Small buses
    LicenseCategory.D,    // Standard buses
    LicenseCategory.D2    // Specialized transport
  ].includes(category);
};

export const requiresMedical60Plus = (category: LicenseCategory): boolean => {
  // All commercial licenses require medical for 60+
  return isCommercialLicense(category);
};

export const requiresMedicalAlways = (category: LicenseCategory): boolean => {
  // These categories always require medical regardless of age
  return [
    LicenseCategory.D1,   // Small buses
    LicenseCategory.D,    // Standard buses  
    LicenseCategory.D2    // Specialized transport
  ].includes(category);
};

export const getSupersededCategories = (category: LicenseCategory): LicenseCategory[] => {
  return SUPERSEDING_MATRIX[category].filter(cat => cat !== category);
};

export const getCategoryFamily = (category: LicenseCategory): 'A' | 'B' | 'C' | 'D' => {
  if ([LicenseCategory.A1, LicenseCategory.A2, LicenseCategory.A].includes(category)) {
    return 'A';
  }
  if ([LicenseCategory.B1, LicenseCategory.B, LicenseCategory.B2, LicenseCategory.BE].includes(category)) {
    return 'B';
  }
  if ([LicenseCategory.C1, LicenseCategory.C, LicenseCategory.C1E, LicenseCategory.CE].includes(category)) {
    return 'C';
  }
  return 'D';
};

// Mapping from learner's permit codes to actual license categories
export const LEARNERS_PERMIT_MAPPING: Record<string, LicenseCategory[]> = {
  '1': [LicenseCategory.A1, LicenseCategory.A2, LicenseCategory.A], // Motorcycles
  '2': [LicenseCategory.B1, LicenseCategory.B], // Light vehicles
  '3': [LicenseCategory.B, LicenseCategory.C1, LicenseCategory.C, LicenseCategory.D1, LicenseCategory.D, LicenseCategory.D2] // Any motor vehicle
};

// Reverse mapping from license categories to learner's permit codes
export const LICENSE_TO_LEARNERS_MAPPING: Record<LicenseCategory, string> = {
  [LicenseCategory.A1]: '1',
  [LicenseCategory.A2]: '1',
  [LicenseCategory.A]: '1',
  [LicenseCategory.B1]: '2',
  [LicenseCategory.B]: '2',
  [LicenseCategory.B2]: '2',
  [LicenseCategory.BE]: '2',
  [LicenseCategory.C1]: '3',
  [LicenseCategory.C]: '3',
  [LicenseCategory.C1E]: '3',
  [LicenseCategory.CE]: '3',
  [LicenseCategory.D1]: '3',
  [LicenseCategory.D]: '3',
  [LicenseCategory.D2]: '3',
  [LicenseCategory.LEARNERS_1]: '1',
  [LicenseCategory.LEARNERS_2]: '2',
  [LicenseCategory.LEARNERS_3]: '3'
};

// Add rules for learner's permit codes
export const LEARNERS_PERMIT_RULES: Record<string, LicenseCategoryRule> = {
  '1': {
    category: LicenseCategory.LEARNERS_1,
    minimum_age: 16,
    prerequisites: [],
    supersedes: [LicenseCategory.LEARNERS_1],
    description: "Learner's permit for motor cycles, motor tricycles and motor quadricycles with engine of any capacity",
    restrictions: ["Must be accompanied by licensed driver", "Display L plates", "Theory test required"],
    requires_learners_permit: false,
    allows_learners_permit: true,
    test_requirements: ["Theory test"],
    medical_requirements: ["Vision exam", "Medical fitness exam"]
  },
  '2': {
    category: LicenseCategory.LEARNERS_2,
    minimum_age: 17,
    prerequisites: [],
    supersedes: [LicenseCategory.LEARNERS_2],
    description: "Learner's permit for light motor vehicles, other than motor cycles, motor tricycles or motor quadricycles",
    restrictions: ["Must be accompanied by licensed driver", "Display L plates", "Theory test required"],
    requires_learners_permit: false,
    allows_learners_permit: true,
    test_requirements: ["Theory test"],
    medical_requirements: ["Vision exam", "Medical fitness exam"]
  },
  '3': {
    category: LicenseCategory.LEARNERS_3,
    minimum_age: 18,
    prerequisites: [],
    supersedes: [LicenseCategory.LEARNERS_3],
    description: "Learner's permit for any motor vehicle other than motor cycles, motor tricycles or motor quadricycles",
    restrictions: ["Must be accompanied by licensed driver", "Display L plates", "Theory test required"],
    requires_learners_permit: false,
    allows_learners_permit: true,
    test_requirements: ["Theory test"],
    medical_requirements: ["Vision exam", "Medical fitness exam"]
  }
};

// Application for card ordering
export interface ApplicationForOrdering {
  id: string;
  person_id: string;
  location_id: string;
  application_type: string;
  application_number?: string;
  status: string;
  person_name?: string;
  created_at: string;
  updated_at: string;
  test_result?: string;
  test_payment_completed?: boolean;
  card_payment_completed?: boolean;
  can_order_card?: boolean;
  order_reason?: string;
  person_licenses?: any[]; // Use any[] to be compatible with License[] from service
  person?: {
    id: string;
    first_name: string;
    surname: string;
    last_name?: string;
    id_number?: string;
    birth_date?: string;
  };
}