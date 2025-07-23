/**
 * Application Service for Madagascar License System
 * Handles all API calls related to license applications
 */

import { api, API_ENDPOINTS, getAuthToken } from '../config/api';
import type { AxiosResponse } from 'axios';
import { 
  Application, 
  ApplicationCreate, 
  ApplicationUpdate, 
  ApplicationLookups,
  FeeStructure,
  Person,
  ApplicationStatus, 
  ApplicationType, 
  CreateApplicationRequest, 
  TestResult,
  LicenseCategory,
  ApplicationForOrdering
} from '../types';

class ApplicationService {
  // Basic CRUD operations
  async createApplication(applicationData: ApplicationCreate): Promise<Application> {
    return await api.post(API_ENDPOINTS.applications, applicationData);
  }

  async getApplication(id: string): Promise<Application> {
    return await api.get(API_ENDPOINTS.applicationById(id));
  }

  async updateApplication(id: string, applicationData: ApplicationUpdate): Promise<Application> {
    return await api.put(API_ENDPOINTS.applicationById(id), applicationData);
  }

  async deleteApplication(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.applicationById(id));
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
    
    const url = queryString.toString() ? `${API_ENDPOINTS.applications}?${queryString}` : API_ENDPOINTS.applications;
    
    // Add debugging
    console.log('🔍 getApplications call:', {
      url,
      params,
      queryString: queryString.toString(),
      endpoint: API_ENDPOINTS.applications
    });
    
    try {
      const result = await api.get<Application[]>(url);
      console.log('✅ getApplications success:', { 
        count: Array.isArray(result) ? result.length : 'not array',
        result: typeof result === 'object' ? Object.keys(result) : typeof result
      });
      return result;
    } catch (error) {
      console.error('❌ getApplications error:', {
        error: error instanceof Error ? error.message : error,
        url,
        params
      });
      throw error;
    }
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
    
    const url = `${API_ENDPOINTS.applications}/search?${queryString}`;
    return await api.get(url);
  }

  // Person-specific searches
  async getApplicationsByPerson(personId: string): Promise<Application[]> {
    return await api.get(API_ENDPOINTS.applicationsByPerson(personId));
  }

  // Get person's existing licenses for verification
  async getPersonLicenses(personId: string): Promise<{ system_licenses: any[] }> {
    return await api.get(API_ENDPOINTS.personLicenses(personId));
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
    
    const url = queryString.toString() ? `${API_ENDPOINTS.applicationsInProgress}?${queryString}` : API_ENDPOINTS.applicationsInProgress;
    return await api.get(url);
  }

  // Status management
  async updateApplicationStatus(
    id: string, 
    newStatus: string,
    reason?: string,
    notes?: string
  ): Promise<Application> {
    // Build query parameters
    const queryParams = new URLSearchParams({
      new_status: newStatus
    });
    
    if (reason) {
      queryParams.append('reason', reason);
    }
    
    if (notes) {
      queryParams.append('notes', notes);
    }
    
    const url = `${API_ENDPOINTS.applicationStatus(id)}?${queryParams.toString()}`;
    return await api.post(url, {});
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
    const url = API_ENDPOINTS.applicationDocuments(applicationId);
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

  // Standalone image processing (doesn't require application)
  async processImage(
    file: File,
    dataType: 'PHOTO' | 'SIGNATURE' | 'FINGERPRINT'
  ): Promise<{
    status: string;
    message: string;
    data_type: string;
    processed_image: {
      data: string; // base64 encoded image data
      format: string;
      dimensions?: string;
      file_size: number;
    };
    processing_info?: {
      iso_compliant: boolean;
      cropped_automatically: boolean;
      enhanced: boolean;
      compression_ratio: number;
    };
    original_filename: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('data_type', dataType);

    // Use the proper token management system
    const token = getAuthToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    // Use fetch directly for file uploads
    const url = API_ENDPOINTS.processImage;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Image processing failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async uploadBiometricData(
    applicationId: string,
    formData: FormData
  ): Promise<{
    status: string;
    message: string;
    data_type: string;
    file_info: {
      filename: string;
      file_size: number;
      dimensions: string;
      format: string;
    };
    processing_info: {
      iso_compliant: boolean;
      cropped_automatically: boolean;
      enhanced: boolean;
      compression_ratio: number;
    };
    original_filename: string;
  }> {
    // Use fetch directly for file uploads as the api helper may not handle FormData properly
    const url = API_ENDPOINTS.applicationBiometrics(applicationId);
    const token = getAuthToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Upload failed: ${response.statusText}`);
    }

    return await response.json();
  }

  // Store biometric data for an application from captured data
  async storeBiometricDataForApplication(
    applicationId: string,
    biometricData: {
      photo?: any;
      signature?: any;
      fingerprint?: any;
    }
  ): Promise<{
    photo_result?: any;
    signature_result?: any;
    fingerprint_result?: any;
    success: boolean;
    errors: string[];
  }> {
    const results: any = {};
    const errors: string[] = [];

    try {
      // Store photo if available
      if (biometricData.photo?.base64_data) {
        try {
          const photoFormData = new FormData();
          
          // Convert base64 back to File object for upload
          const photoBlob = this.base64ToBlob(biometricData.photo.base64_data, 'image/jpeg');
          const photoFile = new File([photoBlob], biometricData.photo.filename || 'license_photo.jpg', {
            type: 'image/jpeg'
          });
          
          photoFormData.append('file', photoFile);
          photoFormData.append('data_type', 'PHOTO');
          photoFormData.append('capture_method', 'WEBCAM');
          
          results.photo_result = await this.uploadBiometricData(applicationId, photoFormData);
        } catch (error) {
          console.error('Photo upload failed:', error);
          errors.push(`Photo upload failed: ${error}`);
        }
      }

      // Store signature if available
      if (biometricData.signature?.base64_data) {
        try {
          const signatureFormData = new FormData();
          
          const signatureBlob = this.base64ToBlob(biometricData.signature.base64_data, 'image/png');
          const signatureFile = new File([signatureBlob], biometricData.signature.filename || 'signature.png', {
            type: 'image/png'
          });
          
          signatureFormData.append('file', signatureFile);
          signatureFormData.append('data_type', 'SIGNATURE');
          signatureFormData.append('capture_method', 'DIGITAL_PAD');
          
          results.signature_result = await this.uploadBiometricData(applicationId, signatureFormData);
        } catch (error) {
          console.error('Signature upload failed:', error);
          errors.push(`Signature upload failed: ${error}`);
        }
      }

      // Store fingerprint if available
      if (biometricData.fingerprint?.base64_data) {
        try {
          const fingerprintFormData = new FormData();
          
          const fingerprintBlob = this.base64ToBlob(biometricData.fingerprint.base64_data, 'image/png');
          const fingerprintFile = new File([fingerprintBlob], biometricData.fingerprint.filename || 'fingerprint.png', {
            type: 'image/png'
          });
          
          fingerprintFormData.append('file', fingerprintFile);
          fingerprintFormData.append('data_type', 'FINGERPRINT');
          fingerprintFormData.append('capture_method', 'MOCK_SCANNER');
          
          results.fingerprint_result = await this.uploadBiometricData(applicationId, fingerprintFormData);
        } catch (error) {
          console.error('Fingerprint upload failed:', error);
          errors.push(`Fingerprint upload failed: ${error}`);
        }
      }

      return {
        ...results,
        success: errors.length === 0,
        errors
      };

    } catch (error) {
      console.error('Biometric data storage failed:', error);
      return {
        success: false,
        errors: [`Biometric data storage failed: ${error}`]
      };
    }
  }

  // Helper method to convert base64 to Blob
  private base64ToBlob(base64: string, contentType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  }

  // Fee management
  async getApplicationFees(applicationId: string): Promise<FeeStructure[]> {
    return await api.get(API_ENDPOINTS.applicationFees(applicationId));
  }

  async processFeePayment(
    applicationId: string,
    feeId: string,
    paymentMethod: string,
    paymentReference?: string
  ): Promise<any> {
    return await api.post(
      API_ENDPOINTS.applicationFeePayment(applicationId, feeId),
      {
        payment_method: paymentMethod,
        payment_reference: paymentReference
      }
    );
  }

  // Related applications
  async getAssociatedApplications(applicationId: string): Promise<Application[]> {
    return await api.get(API_ENDPOINTS.applicationAssociated(applicationId));
  }

  // Statistics
  async getApplicationStatistics(locationId?: string): Promise<any> {
    const queryString = locationId ? `?location_id=${locationId}` : '';
    const url = `${API_ENDPOINTS.applicationStatistics}${queryString}`;
    return await api.get(url);
  }

  // Lookup data
  async getLookupData(): Promise<ApplicationLookups> {
    const response = await api.get(API_ENDPOINTS.lookups.all) as any;
    return {
      license_categories: response.license_categories || [],
      application_types: response.application_types || [],
      application_statuses: response.application_statuses || [],
      fee_structures: response.fee_structures || []
    };
  }

  async getFeeStructures(): Promise<FeeStructure[]> {
    return await api.get(API_ENDPOINTS.lookups.feeStructures);
  }

  // Helper methods for business logic
  calculateApplicationFees(
    applicationType: string,
    licenseCategories: string[],
    feeStructures: FeeStructure[]
  ): FeeStructure[] {
    // Different fee logic based on application type
    switch (applicationType) {
      case 'LEARNERS_PERMIT':
        // Learner's permits: Only theory test fees
        return feeStructures.filter(fee => 
          fee.fee_type.includes('theory_test') && 
          this.feeAppliesToCategories(fee, licenseCategories) &&
          this.isFeeEffective(fee)
        );

      case 'NEW_LICENSE':
        // Driver's license: Only practical test + card production (no theory since they passed it for learner's)
        return feeStructures.filter(fee => 
          (fee.fee_type.includes('practical_test') || fee.fee_type === 'card_production') &&
          this.feeAppliesToCategories(fee, licenseCategories) &&
          this.isFeeEffective(fee)
        );

      case 'RENEWAL':
        // License renewal: Only card production fee
        return feeStructures.filter(fee => 
          fee.fee_type === 'card_production' &&
          this.isFeeEffective(fee)
        );

      case 'DUPLICATE':
        // Duplicate license: Only card production fee
        return feeStructures.filter(fee => 
          fee.fee_type === 'card_production' &&
          this.isFeeEffective(fee)
        );

      case 'UPGRADE':
        // License upgrade: Theory + practical for new categories + card production
        return feeStructures.filter(fee => 
          (fee.fee_type.includes('theory_test') || 
           fee.fee_type.includes('practical_test') || 
           fee.fee_type === 'card_production') &&
          this.feeAppliesToCategories(fee, licenseCategories) &&
          this.isFeeEffective(fee)
        );

      case 'TEMPORARY_LICENSE':
        // Temporary license: Only temporary license fee
        return feeStructures.filter(fee => 
          fee.fee_type.includes('temporary_license') &&
          this.feeAppliesToCategories(fee, licenseCategories) &&
          this.isFeeEffective(fee)
        );

      case 'INTERNATIONAL_PERMIT':
        // International permit: Only international permit fee
        return feeStructures.filter(fee => 
          fee.fee_type === 'international_permit' &&
          this.isFeeEffective(fee)
        );

      default:
        // Fallback: Use existing logic for unknown types
        return feeStructures.filter(fee => {
          const appTypeMatch = fee.applies_to_application_types.includes(applicationType) ||
                               fee.applies_to_application_types.length === 0;
          
          const categoryMatch = this.feeAppliesToCategories(fee, licenseCategories);
          
          return appTypeMatch && categoryMatch && fee.is_mandatory && this.isFeeEffective(fee);
        });
    }
  }

  private feeAppliesToCategories(fee: FeeStructure, licenseCategories: string[]): boolean {
    // If fee applies to all categories (empty array), it applies
    if (fee.applies_to_categories.length === 0) {
      return true;
    }

    // Check if fee applies to any of the selected license categories
    return fee.applies_to_categories.some(cat => 
      licenseCategories.includes(cat)
    );
  }

  private isFeeEffective(fee: FeeStructure): boolean {
    const now = new Date();
    
    // Check if fee has started (effective_from)
    if (fee.effective_from) {
      const effectiveFrom = new Date(fee.effective_from);
      if (now < effectiveFrom) {
        return false;
      }
    }
    
    // Check if fee has expired (effective_until)
    if (fee.effective_until) {
      const effectiveUntil = new Date(fee.effective_until);
      if (now > effectiveUntil) {
        return false;
      }
    }
    
    return true;
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

  // Authorization functions
  async getPendingAuthorizationApplications(): Promise<Application[]> {
    return await api.get(API_ENDPOINTS.applicationsPendingAuthorization);
  }

  async getApplicationAuthorization(applicationId: string): Promise<any> {
    return await api.get(API_ENDPOINTS.applicationAuthorization(applicationId));
  }

  async createApplicationAuthorization(applicationId: string, authorizationData: any): Promise<any> {
    return await api.post(API_ENDPOINTS.applicationAuthorization(applicationId), authorizationData);
  }

  async updateApplicationAuthorization(applicationId: string, authorizationId: string, authorizationData: any): Promise<any> {
    return await api.put(API_ENDPOINTS.applicationAuthorizationUpdate(applicationId, authorizationId), authorizationData);
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

  // Fix NEW_LICENSE application workflow
  async fixNewLicenseWorkflow(applicationId: string): Promise<any> {
    const response: AxiosResponse<any> = await api.post(`/applications/fix-new-license-workflow/${applicationId}`);
    return response.data;
  }
}

export const applicationService = new ApplicationService();
export default applicationService; 