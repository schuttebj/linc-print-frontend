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
  license_category: LicenseCategory;
  status: ApplicationStatus;
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
  related_applications?: Application[];
}

export interface ApplicationCreate {
  person_id: string;
  location_id: string;
  application_type: ApplicationType;
  license_category: LicenseCategory;
  is_urgent: boolean;
  urgency_reason?: string;
  is_temporary_license: boolean;
  validity_period_days?: number;
  is_on_hold?: boolean;
  parent_application_id?: string;
  replacement_reason?: string;
  // Medical information for this specific application
  medical_information?: MedicalInformation;
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
  RENEWAL = 'RENEWAL',
  REPLACEMENT = 'REPLACEMENT',
  TEMPORARY_LICENSE = 'TEMPORARY_LICENSE',
  INTERNATIONAL_PERMIT = 'INTERNATIONAL_PERMIT'
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
  D2 = 'D2'        // Specialized public transport (articulated buses, 24+)
}

export enum ApplicationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  ON_HOLD = 'ON_HOLD',
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
  examination_date?: string;
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
  license_type: 'LEARNERS_PERMIT' | 'DRIVERS_LICENSE';
  categories: LicenseCategory[];
  issue_date: string;
  expiry_date: string;
  issuing_location: string;
  // External licenses require manual verification
  verified: boolean;
  verification_source: 'MANUAL';
  verification_notes?: string;
  verified_by?: string;
  verified_at?: string;
  // Auto-population fields
  is_auto_populated?: boolean; // True if auto-populated for prerequisites
  required_for_category?: LicenseCategory; // Category this license is required for
}

export interface LicenseVerificationData {
  person_id: string;
  system_licenses: SystemLicense[];
  external_licenses: ExternalLicense[];
  all_license_categories: LicenseCategory[]; // Combined from all licenses
  requires_verification: boolean; // True if any external licenses exist
}

// Form data interfaces for multi-step form (update existing)
export interface ApplicationFormData {
  // Step 1: Person (handled by PersonFormWrapper)
  person: Person | null;
  
  // Step 2: Application Details
  application_type: ApplicationType;
  license_category: LicenseCategory;
  is_urgent: boolean;
  urgency_reason?: string;
  is_temporary_license: boolean;
  validity_period_days?: number;
  is_on_hold?: boolean;
  parent_application_id?: string;
  replacement_reason?: string;
  // Location selection for admin users
  selected_location_id?: string;
  // Vehicle type selection
  vehicle_transmission: TransmissionType;
  modified_vehicle_for_disability: boolean;
  
  // Step 3: Requirements
  medical_certificate_file?: File;
  medical_certificate_verified_manually?: boolean;
  parental_consent_file?: File;
  existing_license_verified?: boolean;
  // Updated: License verification data
  license_verification: LicenseVerificationData | null;
  
  // Step 4: Medical Information
  medical_information: MedicalInformation | null;
  
  // Step 5: Biometric Data
  biometric_data: BiometricCaptureData;
  
  // Step 6: Review & Submit
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

// Superseding Matrix - Which licenses are automatically included when you have a higher license
export const LICENSE_SUPERSEDING_MATRIX: Record<LicenseCategory, LicenseCategory[]> = {
  // Motorcycles
  [LicenseCategory.A1]: [LicenseCategory.A1],
  [LicenseCategory.A2]: [LicenseCategory.A1, LicenseCategory.A2],
  [LicenseCategory.A]: [LicenseCategory.A1, LicenseCategory.A2, LicenseCategory.A],
  
  // Light Vehicles
  [LicenseCategory.B1]: [LicenseCategory.B1],
  [LicenseCategory.B]: [LicenseCategory.B1, LicenseCategory.B],
  [LicenseCategory.B2]: [LicenseCategory.B1, LicenseCategory.B, LicenseCategory.B2],
  [LicenseCategory.BE]: [LicenseCategory.B1, LicenseCategory.B, LicenseCategory.BE],
  
  // Heavy Goods
  [LicenseCategory.C1]: [LicenseCategory.B1, LicenseCategory.B, LicenseCategory.B2, LicenseCategory.C1],
  [LicenseCategory.C]: [LicenseCategory.B1, LicenseCategory.B, LicenseCategory.B2, LicenseCategory.C1, LicenseCategory.C],
  [LicenseCategory.C1E]: [LicenseCategory.B1, LicenseCategory.B, LicenseCategory.B2, LicenseCategory.C1, LicenseCategory.BE, LicenseCategory.C1E],
  [LicenseCategory.CE]: [LicenseCategory.B1, LicenseCategory.B, LicenseCategory.B2, LicenseCategory.C1, LicenseCategory.C, LicenseCategory.BE, LicenseCategory.CE],
  
  // Passenger Transport
  [LicenseCategory.D1]: [LicenseCategory.B1, LicenseCategory.B, LicenseCategory.B2, LicenseCategory.C1, LicenseCategory.C, LicenseCategory.D1],
  [LicenseCategory.D]: [LicenseCategory.B1, LicenseCategory.B, LicenseCategory.B2, LicenseCategory.C1, LicenseCategory.C, LicenseCategory.D1, LicenseCategory.D],
  [LicenseCategory.D2]: [LicenseCategory.B1, LicenseCategory.B, LicenseCategory.B2, LicenseCategory.C1, LicenseCategory.C, LicenseCategory.D1, LicenseCategory.D, LicenseCategory.BE, LicenseCategory.CE, LicenseCategory.C1E, LicenseCategory.D2]
} as const;

// License category rules configuration
export const LICENSE_CATEGORY_RULES = {
  // Motorcycles and Mopeds
  [LicenseCategory.A1]: {
    min_age: 16,
    requires_existing: [],
    allows_learners_permit: true,
    allows_temporary_after_practical: true,
    description: 'Small motorcycles and mopeds (<125cc)',
    vehicle_types: ['Moped', 'Small motorcycle', 'Scooter']
  },
  [LicenseCategory.A2]: {
    min_age: 18,
    requires_existing: [],
    allows_learners_permit: true,
    allows_temporary_after_practical: true,
    description: 'Mid-range motorcycles (power limited to 35kW)',
    vehicle_types: ['Medium motorcycle', 'Power-limited motorcycle']
  },
  [LicenseCategory.A]: {
    min_age: 20,
    requires_existing: [],
    allows_learners_permit: true,
    allows_temporary_after_practical: true,
    description: 'Unlimited motorcycles (all motorcycles)',
    vehicle_types: ['All motorcycles', 'High-power motorcycle']
  },
  
  // Light Vehicles
  [LicenseCategory.B1]: {
    min_age: 16,
    requires_existing: [],
    allows_learners_permit: true,
    allows_temporary_after_practical: true,
    description: 'Light quadricycles',
    vehicle_types: ['Motorized tricycle', 'Light quadricycle']
  },
  [LicenseCategory.B]: {
    min_age: 18,
    requires_existing: [],
    allows_learners_permit: true,
    allows_temporary_after_practical: true,
    description: 'Standard passenger cars and light vehicles (up to 3.5t)',
    vehicle_types: ['Passenger car', 'Light van', 'Small truck']
  },
  [LicenseCategory.B2]: {
    min_age: 21,
    requires_existing: [LicenseCategory.B],
    allows_learners_permit: false,
    allows_temporary_after_practical: true,
    description: 'Taxis and commercial passenger vehicles',
    vehicle_types: ['Taxi', 'Commercial passenger vehicle']
  },
  [LicenseCategory.BE]: {
    min_age: 18,
    requires_existing: [LicenseCategory.B],
    allows_learners_permit: false,
    allows_temporary_after_practical: true,
    description: 'Category B vehicles with heavy trailer (>750kg)',
    vehicle_types: ['Car with trailer', 'Van with trailer']
  },
  
  // Heavy Goods Vehicles
  [LicenseCategory.C1]: {
    min_age: 18,
    requires_existing: [LicenseCategory.B],
    allows_learners_permit: false,
    allows_temporary_after_practical: true,
    description: 'Medium-sized goods vehicles (3.5-7.5t)',
    vehicle_types: ['Medium truck', 'Delivery truck']
  },
  [LicenseCategory.C]: {
    min_age: 21,
    requires_existing: [LicenseCategory.B],
    allows_learners_permit: false,
    allows_temporary_after_practical: true,
    description: 'Heavy goods vehicles (over 7.5t)',
    vehicle_types: ['Heavy truck', 'Lorry', 'Freight vehicle']
  },
  [LicenseCategory.C1E]: {
    min_age: 18,
    requires_existing: [LicenseCategory.C1],
    allows_learners_permit: false,
    allows_temporary_after_practical: true,
    description: 'C1 vehicles with heavy trailer',
    vehicle_types: ['Medium truck with trailer']
  },
  [LicenseCategory.CE]: {
    min_age: 21,
    requires_existing: [LicenseCategory.C],
    allows_learners_permit: false,
    allows_temporary_after_practical: true,
    description: 'Full heavy combination vehicles',
    vehicle_types: ['Tractor-trailer', 'Semi-trailer', 'Articulated truck']
  },
  
  // Passenger Transport
  [LicenseCategory.D1]: {
    min_age: 21,
    requires_existing: [LicenseCategory.B],
    allows_learners_permit: false,
    allows_temporary_after_practical: true,
    description: 'Small buses (up to 16 passengers)',
    vehicle_types: ['Minibus', 'Small public transport']
  },
  [LicenseCategory.D]: {
    min_age: 24,
    requires_existing: [LicenseCategory.B],
    allows_learners_permit: false,
    allows_temporary_after_practical: true,
    description: 'Standard buses and coaches (over 16 passengers)',
    vehicle_types: ['Bus', 'Coach', 'Public transport']
  },
  [LicenseCategory.D2]: {
    min_age: 24,
    requires_existing: [LicenseCategory.D],
    allows_learners_permit: false,
    allows_temporary_after_practical: true,
    description: 'Specialized public transport vehicles',
    vehicle_types: ['Articulated bus', 'Interurban bus', 'Specialized transport']
  }
} as const;

// Helper function to get all authorized categories including superseded ones
export const getAuthorizedCategories = (appliedCategory: LicenseCategory): LicenseCategory[] => {
  return LICENSE_SUPERSEDING_MATRIX[appliedCategory];
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
  return LICENSE_SUPERSEDING_MATRIX[category].filter(cat => cat !== category);
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