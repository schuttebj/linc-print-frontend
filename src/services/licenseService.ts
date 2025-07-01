/**
 * License Service for Madagascar License System
 * Handles all API calls related to issued licenses (separate from applications)
 */

import { api, API_ENDPOINTS } from '../config/api';

export interface IssuedLicense {
  id: string;
  license_number: string;
  person_id: string;
  category: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'REVOKED';
  issue_date: string;
  expiry_date: string;
  location_id: string;
  restrictions: string[];
  created_at: string;
  updated_at: string;
}

export interface LicenseStatistics {
  total_active: number;
  total_suspended: number;
  total_expired: number;
  pending_activation: number;
  by_category: Record<string, number>;
  recent_activations: number;
  expiring_soon: number;
}

class LicenseService {
  // Basic CRUD operations for issued licenses
  async getLicenses(params: {
    skip?: number;
    limit?: number;
    status?: string;
    category?: string;
    location_id?: string;
  } = {}): Promise<IssuedLicense[]> {
    const queryString = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryString.append(key, value.toString());
      }
    });
    
    const url = queryString.toString() ? `${API_ENDPOINTS.licenses}?${queryString}` : API_ENDPOINTS.licenses;
    return await api.get(url);
  }

  async getLicense(id: string): Promise<IssuedLicense> {
    return await api.get(API_ENDPOINTS.licenseById(id));
  }

  // Get current valid licenses for a person (for license verification)
  async getPersonCurrentLicenses(personId: string): Promise<IssuedLicense[]> {
    return await api.get(API_ENDPOINTS.personCurrentLicenses(personId));
  }

  // Get all licenses for a person (including expired)
  async getPersonAllLicenses(personId: string, includeExpired: boolean = false): Promise<IssuedLicense[]> {
    const url = `${API_ENDPOINTS.personAllLicenses(personId)}?include_expired=${includeExpired}`;
    return await api.get(url);
  }

  // Get active licenses ready for printing/collection
  async getActiveLicenses(locationId?: string): Promise<IssuedLicense[]> {
    const url = locationId 
      ? `${API_ENDPOINTS.activeLicenses}?location_id=${locationId}`
      : API_ENDPOINTS.activeLicenses;
    return await api.get(url);
  }

  // Get licenses pending activation from applications
  async getPendingActivationLicenses(locationId?: string): Promise<IssuedLicense[]> {
    const url = locationId 
      ? `${API_ENDPOINTS.pendingActivationLicenses}?location_id=${locationId}`
      : API_ENDPOINTS.pendingActivationLicenses;
    return await api.get(url);
  }

  // License lifecycle management
  async activateLicenseFromApplication(applicationId: string): Promise<{
    success: boolean;
    license_id: string;
    license_number: string;
    message: string;
  }> {
    return await api.post(API_ENDPOINTS.activateLicense(applicationId), {});
  }

  async suspendLicense(licenseId: string, reason: string, notes?: string): Promise<{
    success: boolean;
    message: string;
    suspended_at: string;
  }> {
    return await api.post(API_ENDPOINTS.suspendLicense(licenseId), {
      reason,
      notes
    });
  }

  async reactivateLicense(licenseId: string, notes?: string): Promise<{
    success: boolean;
    message: string;
    reactivated_at: string;
  }> {
    return await api.post(API_ENDPOINTS.reactivateLicense(licenseId), {
      notes
    });
  }

  async renewLicense(licenseId: string, newExpiryDate: string): Promise<{
    success: boolean;
    new_license_id: string;
    message: string;
  }> {
    return await api.post(API_ENDPOINTS.renewLicense(licenseId), {
      new_expiry_date: newExpiryDate
    });
  }

  // Statistics and reporting
  async getLicenseStatistics(locationId?: string): Promise<LicenseStatistics> {
    const url = locationId 
      ? `${API_ENDPOINTS.licenseStatistics}?location_id=${locationId}`
      : API_ENDPOINTS.licenseStatistics;
    return await api.get(url);
  }

  // Preview what license will look like when activated from application
  async previewLicenseFromApplication(applicationId: string): Promise<{
    license_number: string;
    category: string;
    issue_date: string;
    expiry_date: string;
    restrictions: string[];
    photo_required: boolean;
    signature_required: boolean;
    fingerprint_required: boolean;
  }> {
    return await api.get(API_ENDPOINTS.licensePreview(applicationId));
  }

  // Utility methods
  isLicenseExpired(license: IssuedLicense): boolean {
    return new Date(license.expiry_date) < new Date();
  }

  isLicenseExpiringSoon(license: IssuedLicense, daysThreshold: number = 30): boolean {
    const expiryDate = new Date(license.expiry_date);
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
    return expiryDate <= thresholdDate;
  }

  isLicenseActive(license: IssuedLicense): boolean {
    return license.status === 'ACTIVE' && !this.isLicenseExpired(license);
  }

  formatLicenseNumber(licenseNumber: string): string {
    // Format: MDG-XXXXXX
    return licenseNumber.replace(/[^A-Z0-9]/g, '').toUpperCase();
  }

  getLicenseDisplayName(category: string): string {
    const categoryNames: Record<string, string> = {
      'A1': 'Motorcycle (≤125cc)',
      'A': 'Motorcycle (>125cc)',
      'B': 'Light Motor Vehicle',
      'C1': 'Medium Vehicle',
      'C': 'Heavy Vehicle',
      'D': 'Bus/Passenger Vehicle',
      'E': 'Articulated Vehicle'
    };
    return categoryNames[category] || category;
  }
}

export const licenseService = new LicenseService(); 