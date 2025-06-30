/**
 * Application Service for Madagascar License System
 * Handles all API calls related to license applications
 */

import { api } from '../config/api';
import { 
  Application, 
  ApplicationCreate, 
  ApplicationUpdate, 
  ApplicationLookups,
  FeeStructure,
  Person
} from '../types';

class ApplicationService {
  private readonly basePath = '/api/v1/applications';
  private readonly lookupsPath = '/api/v1/lookups';

  // Basic CRUD operations
  async createApplication(applicationData: ApplicationCreate): Promise<Application> {
    return await api.post(this.basePath, applicationData);
  }

  async getApplication(id: string): Promise<Application> {
    return await api.get(`${this.basePath}/${id}`);
  }

  async updateApplication(id: string, applicationData: ApplicationUpdate): Promise<Application> {
    return await api.put(`${this.basePath}/${id}`, applicationData);
  }

  async deleteApplication(id: string): Promise<void> {
    await api.delete(`${this.basePath}/${id}`);
  }

  // Search and filtering
  async getApplications(params: {
    skip?: number;
    limit?: number;
    status?: string;
    application_type?: string;
    location_id?: string;
    is_urgent?: boolean;
  } = {}): Promise<Application[]> {
    const queryString = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryString.append(key, value.toString());
      }
    });
    
    const url = queryString.toString() ? `${this.basePath}?${queryString}` : this.basePath;
    return await api.get(url);
  }

  async searchApplications(searchParams: {
    application_number?: string;
    person_id?: string;
    application_type?: string;
    status?: string;
    location_id?: string;
    license_categories?: string[];
    date_from?: string;
    date_to?: string;
    is_urgent?: boolean;
    is_temporary_license?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<Application[]> {
    const queryString = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(item => queryString.append(key, item));
        } else {
          queryString.append(key, value.toString());
        }
      }
    });
    
    const url = `${this.basePath}/search?${queryString}`;
    return await api.get(url);
  }

  // Person-specific searches
  async getApplicationsByPerson(personId: string): Promise<Application[]> {
    return await api.get(`${this.basePath}/search/person/${personId}`);
  }

  // In-progress applications for dashboard
  async getInProgressApplications(params: {
    date?: string;
    stage?: string;
  } = {}): Promise<Application[]> {
    const queryString = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryString.append(key, value.toString());
      }
    });
    
    const url = queryString.toString() ? `${this.basePath}/in-progress?${queryString}` : `${this.basePath}/in-progress`;
    return await api.get(url);
  }

  // Status management
  async updateApplicationStatus(
    id: string, 
    newStatus: string,
    reason?: string,
    notes?: string
  ): Promise<Application> {
    return await api.post(`${this.basePath}/${id}/status`, {
      new_status: newStatus,
      reason,
      notes
    });
  }

  // File uploads
  async uploadDocument(
    applicationId: string,
    file: File,
    documentType: string,
    notes?: string
  ): Promise<{ status: string; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    if (notes) {
      formData.append('notes', notes);
    }

    // Use fetch directly for file uploads as the api helper may not handle FormData properly
    const url = `${this.basePath}/${applicationId}/documents`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}` // Temporary, will use auth context
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async uploadBiometricData(
    applicationId: string,
    file: File,
    dataType: 'PHOTO' | 'SIGNATURE' | 'FINGERPRINT',
    captureMethod?: string
  ): Promise<{ status: string; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('data_type', dataType);
    if (captureMethod) {
      formData.append('capture_method', captureMethod);
    }

    // Use fetch directly for file uploads as the api helper may not handle FormData properly
    const url = `${this.basePath}/${applicationId}/biometric-data`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}` // Temporary, will use auth context
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return await response.json();
  }

  // Fee management
  async getApplicationFees(applicationId: string): Promise<FeeStructure[]> {
    return await api.get(`${this.basePath}/${applicationId}/fees`);
  }

  async processFeePayment(
    applicationId: string,
    feeId: string,
    paymentMethod: string,
    paymentReference?: string
  ): Promise<any> {
    return await api.post(
      `${this.basePath}/${applicationId}/fees/${feeId}/pay`,
      {
        payment_method: paymentMethod,
        payment_reference: paymentReference
      }
    );
  }

  // Related applications
  async getAssociatedApplications(applicationId: string): Promise<Application[]> {
    return await api.get(`${this.basePath}/${applicationId}/associated`);
  }

  // Statistics
  async getApplicationStatistics(locationId?: string): Promise<any> {
    const queryString = locationId ? `?location_id=${locationId}` : '';
    const url = `${this.basePath}/statistics${queryString}`;
    return await api.get(url);
  }

  // Lookup data
  async getLookupData(): Promise<ApplicationLookups> {
    const response = await api.get(`${this.lookupsPath}/all`) as any;
    return {
      license_categories: response.license_categories || [],
      application_types: response.application_types || [],
      application_statuses: response.application_statuses || [],
      fee_structures: response.fee_structures || []
    };
  }

  async getFeeStructures(): Promise<FeeStructure[]> {
    return await api.get(`${this.lookupsPath}/fee-structures`);
  }

  // Helper methods for business logic
  calculateApplicationFees(
    applicationType: string,
    licenseCategories: string[],
    feeStructures: FeeStructure[]
  ): FeeStructure[] {
    return feeStructures.filter(fee => {
      // Check if fee applies to this application type
      const appTypeMatch = fee.applies_to_application_types.includes(applicationType) ||
                           fee.applies_to_application_types.length === 0;
      
      // Check if fee applies to any of the selected license categories
      const categoryMatch = fee.applies_to_categories.some(cat => 
        licenseCategories.includes(cat)
      ) || fee.applies_to_categories.length === 0;
      
      return appTypeMatch && categoryMatch && fee.is_mandatory;
    });
  }

  calculateTotalAmount(fees: FeeStructure[]): number {
    return fees.reduce((total, fee) => total + fee.amount, 0);
  }

  // Application validation helpers
  validateAgeRequirements(birthDate: string, licenseCategories: string[]): string[] {
    const errors: string[] = [];
    const age = this.calculateAge(birthDate);
    
    const ageRequirements = {
      'A′': 16, // Moped
      'A': 18,  // Full Motorcycle
      'B': 18,  // Light Vehicle
      'C': 21,  // Heavy Goods
      'D': 21,  // Passenger Transport
      'E': 21   // Large Trailers
    };
    
    licenseCategories.forEach(category => {
      const minAge = ageRequirements[category as keyof typeof ageRequirements];
      if (minAge && age < minAge) {
        errors.push(`Minimum age for category ${category} is ${minAge} years (applicant is ${age})`);
      }
    });
    
    return errors;
  }

  private calculateAge(birthDate: string): number {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  // Madagascar-specific business rules
  requiresMedicalCertificate(age: number, licenseCategories: string[]): boolean {
    // Medical certificate required for:
    // 1. Heavy categories (C, D, E)
    // 2. Applicants 60+ years old
    const heavyCategories = ['C', 'D', 'E'];
    const hasHeavyCategory = licenseCategories.some(cat => heavyCategories.includes(cat));
    
    return hasHeavyCategory || age >= 60;
  }

  requiresParentalConsent(age: number, licenseCategories: string[]): boolean {
    // Parental consent required for A′ category applicants aged 16-17
    return licenseCategories.includes('A′') && age >= 16 && age < 18;
  }

  requiresExistingLicense(licenseCategories: string[]): boolean {
    // C, D, E categories require existing B license
    const heavyCategories = ['C', 'D', 'E'];
    return licenseCategories.some(cat => heavyCategories.includes(cat));
  }
}

export const applicationService = new ApplicationService();
export default applicationService; 