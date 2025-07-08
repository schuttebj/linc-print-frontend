/**
 * License Service for Madagascar License System
 * Handles all API calls related to license management
 */

import api from '../config/api';
import { API_BASE_URL, API_VERSION } from '../config/api';

// License types based on backend schemas
export interface License {
  id: string;
  license_number: string;
  person_id: string;
  created_from_application_id: string;
  
  // License details
  category: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  issue_date: string;
  issuing_location_id: string;
  issued_by_user_id: string;
  
  // Restrictions and conditions
  restrictions: string[];
  medical_restrictions: string[];
  
  // Professional permit
  has_professional_permit: boolean;
  professional_permit_categories: string[];
  professional_permit_expiry?: string;
  
  // Status information
  status_changed_date?: string;
  suspension_reason?: string;
  suspension_start_date?: string;
  suspension_end_date?: string;
  cancellation_reason?: string;
  cancellation_date?: string;
  
  // History and references
  previous_license_id?: string;
  is_upgrade: boolean;
  upgrade_from_category?: string;
  captured_from_license_number?: string;
  
  // Compliance
  sadc_compliance_verified: boolean;
  international_validity: boolean;
  vienna_convention_compliant: boolean;
  
  // Computed properties
  is_active: boolean;
  is_suspended: boolean;
  is_cancelled: boolean;
  
  // Current card information
  current_card?: LicenseCard;
  
  // Audit fields
  created_at: string;
  updated_at: string;
}

export interface LicenseDetail extends License {
  // All cards for this license
  cards: LicenseCard[];
  
  // Status history
  status_history: LicenseStatusHistory[];
  
  // Person information (basic)
  person_name?: string;
  person_surname?: string;
  
  // Location information
  issuing_location_name?: string;
  issuing_location_code?: string;
}

export interface LicenseCard {
  id: string;
  card_number: string;
  status: 'PENDING_PRODUCTION' | 'IN_PRODUCTION' | 'READY_FOR_COLLECTION' | 'COLLECTED' | 'EXPIRED' | 'DAMAGED' | 'LOST' | 'STOLEN';
  card_type: string;
  issue_date: string;
  expiry_date: string;
  valid_from: string;
  is_current: boolean;
  is_expired: boolean;
  
  // Collection information
  ready_for_collection_date?: string;
  collected_date?: string;
  collection_reference?: string;
  
  // Production information
  ordered_date?: string;
  production_started?: string;
  production_completed?: string;
  
  // Card specifications
  card_template: string;
  iso_compliance_version: string;
  days_until_expiry?: number;
  is_near_expiry: boolean;
}

export interface LicenseStatusHistory {
  id: string;
  from_status?: string;
  to_status: string;
  changed_at: string;
  reason?: string;
  notes?: string;
  system_initiated: boolean;
  
  // Suspension details
  suspension_start_date?: string;
  suspension_end_date?: string;
}

export interface PersonLicensesSummary {
  person_id: string;
  person_name: string;
  total_licenses: number;
  active_licenses: number;
  suspended_licenses: number;
  cancelled_licenses: number;
  
  // License categories held
  categories: string[];
  
  // Recent activity
  latest_license_date?: string;
  latest_license_number?: string;
  
  // Current cards
  cards_ready_for_collection: number;
  cards_near_expiry: number;
}

export interface LicenseSearchFilters {
  license_number?: string;
  person_id?: string;
  category?: string;
  status?: string;
  issuing_location_id?: string;
  
  // Date filters
  issued_after?: string;
  issued_before?: string;
  
  // Professional permit filters
  has_professional_permit?: boolean;
  
  // Pagination
  page?: number;
  size?: number;
}

export interface LicenseListResponse {
  licenses: License[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface CreateLicenseFromApplication {
  application_id: string;
  license_category: string;
  restrictions?: string[];
  medical_restrictions?: string[];
  
  // Professional permit data (if applicable)
  has_professional_permit?: boolean;
  professional_permit_categories?: string[];
  professional_permit_expiry?: string;
  
  // Captured license data (for capture applications)
  captured_from_license_number?: string;
  
  // Card ordering
  order_card_immediately?: boolean;
  card_expiry_years?: number;
}

export interface AuthorizationData {
  restrictions?: string[];
  medical_restrictions?: string[];
  professional_permit?: {
    eligible: boolean;
    categories: string[];
    expiry_years?: number;
  };
  captured_license_data?: {
    original_license_number?: string;
  };
  test_results?: Record<string, any>;
}

export interface LicenseStatusUpdate {
  status: string;
  reason?: string;
  notes?: string;
  suspension_start_date?: string;
  suspension_end_date?: string;
}

export interface LicenseRestrictionsUpdate {
  restrictions: string[];
  medical_restrictions?: string[];
  reason?: string;
}

export interface CardCreate {
  license_id: string;
  card_type?: string;
  expiry_years?: number;
  replacement_reason?: string;
}

export interface CardStatusUpdate {
  status: string;
  notes?: string;
  collection_reference?: string;
}

export interface LicenseNumberValidation {
  license_number: string;
  is_valid: boolean;
  error_message?: string;
  province_code?: string;
  location_code?: string;
  sequence_number?: number;
  check_digit?: number;
}

export interface RestrictionDetail {
  code: string;
  description: string;
  category: string;
  display_name: string;
}

export interface AvailableRestrictions {
  restrictions: RestrictionDetail[];
  total: number;
}

export interface LicenseStatistics {
  total_licenses: number;
  active_licenses: number;
  suspended_licenses: number;
  cancelled_licenses: number;
  
  // By category
  by_category: Record<string, number>;
  
  // By location
  by_location: Record<string, number>;
  
  // Recent activity
  issued_this_month: number;
  issued_this_year: number;
  
  // Card statistics
  cards_pending_collection: number;
  cards_near_expiry: number;
}

class LicenseService {
  private basePath = `${API_BASE_URL}/api/${API_VERSION}/licenses`;

  // License Creation Methods
  async createFromApplication(data: CreateLicenseFromApplication): Promise<License> {
    return await api.post<License>(`${this.basePath}/from-application`, data);
  }

  async createFromAuthorizedApplication(applicationId: string, authorizationData: AuthorizationData): Promise<License> {
    return await api.post<License>(`${this.basePath}/from-authorized-application/${applicationId}`, authorizationData);
  }

  // License Query Methods
  async getLicense(licenseId: string): Promise<LicenseDetail> {
    return await api.get<LicenseDetail>(`${this.basePath}/${licenseId}`);
  }

  async getLicenseByNumber(licenseNumber: string): Promise<License> {
    return await api.get<License>(`${this.basePath}/number/${licenseNumber}`);
  }

  async getPersonLicenses(personId: string, activeOnly: boolean = false, skip: number = 0, limit: number = 100): Promise<License[]> {
    const params = new URLSearchParams({
      active_only: activeOnly.toString(),
      skip: skip.toString(),
      limit: limit.toString()
    });
    
    return await api.get<License[]>(`${this.basePath}/person/${personId}?${params}`);
  }

  async getPersonLicensesSummary(personId: string): Promise<PersonLicensesSummary> {
    return await api.get<PersonLicensesSummary>(`${this.basePath}/person/${personId}/summary`);
  }

  async searchLicenses(filters: LicenseSearchFilters): Promise<LicenseListResponse> {
    return await api.post<LicenseListResponse>(`${this.basePath}/search`, filters);
  }

  // License Management Methods
  async updateLicenseStatus(licenseId: string, statusUpdate: LicenseStatusUpdate): Promise<License> {
    return await api.put<License>(`${this.basePath}/${licenseId}/status`, statusUpdate);
  }

  async updateLicenseRestrictions(licenseId: string, restrictionsUpdate: LicenseRestrictionsUpdate): Promise<License> {
    return await api.put<License>(`${this.basePath}/${licenseId}/restrictions`, restrictionsUpdate);
  }

  async updateProfessionalPermit(licenseId: string, permitUpdate: {
    has_professional_permit: boolean;
    professional_permit_categories: string[];
    professional_permit_expiry: string;
  }): Promise<License> {
    return await api.put<License>(`${this.basePath}/${licenseId}/professional-permit`, permitUpdate);
  }

  // Card Management Methods
  async createCard(cardData: CardCreate): Promise<LicenseCard> {
    return await api.post<LicenseCard>(`${this.basePath}/cards`, cardData);
  }

  async updateCardStatus(cardId: string, statusUpdate: CardStatusUpdate): Promise<LicenseCard> {
    return await api.put<LicenseCard>(`${this.basePath}/cards/${cardId}/status`, statusUpdate);
  }

  async getLicenseCards(licenseId: string): Promise<LicenseCard[]> {
    return await api.get<LicenseCard[]>(`${this.basePath}/${licenseId}/cards`);
  }

  async getCurrentCard(licenseId: string): Promise<LicenseCard | null> {
    return await api.get<LicenseCard | null>(`${this.basePath}/${licenseId}/cards/current`);
  }

  // Utility Methods
  async validateLicenseNumber(licenseNumber: string): Promise<LicenseNumberValidation> {
    const params = new URLSearchParams({ license_number: licenseNumber });
    return await api.post<LicenseNumberValidation>(`${this.basePath}/validate-number?${params}`);
  }

  async getAvailableRestrictions(): Promise<AvailableRestrictions> {
    return await api.get<AvailableRestrictions>(`${this.basePath}/restrictions/available`);
  }

  async getLicenseStatistics(): Promise<LicenseStatistics> {
    return await api.get<LicenseStatistics>(`${this.basePath}/statistics/overview`);
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return await api.get<{ status: string; timestamp: string }>(`${this.basePath}/health`);
  }

  // Utility Functions for Frontend
  formatLicenseNumber(licenseNumber: string): string {
    // Format: TXXX12345678X -> T-XXX-12345678-X
    if (licenseNumber.length >= 11) {
      const province = licenseNumber.slice(0, 1);
      const location = licenseNumber.slice(1, 4);
      const sequence = licenseNumber.slice(4, -1);
      const checkDigit = licenseNumber.slice(-1);
      return `${province}-${location}-${sequence}-${checkDigit}`;
    }
    return licenseNumber;
  }

  getStatusColor(status: string): 'success' | 'warning' | 'error' | 'info' {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'SUSPENDED':
        return 'warning';
      case 'CANCELLED':
        return 'error';
      default:
        return 'info';
    }
  }

  getCardStatusColor(status: string): 'success' | 'warning' | 'error' | 'info' {
    switch (status) {
      case 'COLLECTED':
        return 'success';
      case 'READY_FOR_COLLECTION':
        return 'info';
      case 'IN_PRODUCTION':
        return 'warning';
      case 'EXPIRED':
      case 'DAMAGED':
      case 'LOST':
      case 'STOLEN':
        return 'error';
      default:
        return 'info';
    }
  }

  isNearExpiry(expiryDate: string, daysThreshold: number = 30): boolean {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= daysThreshold && diffDays > 0;
  }

  getDaysUntilExpiry(expiryDate: string): number {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getRestrictionDisplayName(code: string): string {
    const restrictionMap: Record<string, string> = {
      '01': 'Corrective Lenses Required',
      '02': 'Prosthetics',
      '03': 'Automatic Transmission Only',
      '04': 'Electric Vehicles Only',
      '05': 'Disability Adapted Vehicles',
      '06': 'Tractor Vehicles Only',
      '07': 'Industrial/Agriculture Only'
    };
    return restrictionMap[code] || `Restriction ${code}`;
  }

  getProfessionalPermitDisplayName(category: string): string {
    const categoryMap: Record<string, string> = {
      'P': 'Passengers (Professional Permit P)',
      'D': 'Dangerous Goods (Professional Permit D)',
      'G': 'Goods (Professional Permit G)'
    };
    return categoryMap[category] || `Professional Permit ${category}`;
  }
}

export const licenseService = new LicenseService();
export default licenseService; 