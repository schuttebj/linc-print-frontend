/**
 * Lookup Service for Madagascar Driver's License System
 * Fetches dropdown data from backend enums
 */

import { api, API_ENDPOINTS } from '../config/api';

// Types for lookup data
export interface DocumentType {
  value: string;
  label: string;
  requires_expiry: boolean;
}

export interface PersonNature {
  value: string;
  label: string;
}

export interface AddressType {
  value: string;
  label: string;
}

export interface Language {
  value: string;
  label: string;
}

export interface Nationality {
  value: string;
  label: string;
}

export interface PhoneCountryCode {
  value: string;
  label: string;
}

export interface Country {
  value: string;
  label: string;
}

export interface Province {
  code: string;
  name: string;
}

export interface UserStatus {
  value: string;
  label: string;
}

export interface UserType {
  value: string;
  label: string;
}

export interface OfficeType {
  value: string;
  label: string;
}

export interface Location {
  id: string;
  name: string;
  code: string;
  province_code: string;
  office_type: string;
  is_operational: boolean;
}

// Application-related lookup interfaces
export interface LicenseCategory {
  value: string;
  label: string;
  description?: string;
  minimum_age?: number;
}

export interface ApplicationType {
  value: string;
  label: string;
  description?: string;
}

export interface ApplicationStatus {
  value: string;
  label: string;
  description?: string;
}

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

export interface AllLookupData {
  document_types: DocumentType[];
  person_natures: PersonNature[];
  address_types: AddressType[];
  languages: Language[];
  nationalities: Nationality[];
  phone_country_codes: PhoneCountryCode[];
  countries: Country[];
  provinces: Province[];
  user_statuses: UserStatus[];
  user_types: UserType[];
  office_types: OfficeType[];
  // Application-related lookups
  license_categories: LicenseCategory[];
  application_types: ApplicationType[];
  application_statuses: ApplicationStatus[];
  fee_structures: FeeStructure[];
}

/**
 * Lookup Service Class with caching
 */
class LookupService {
  private static instance: LookupService;
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): LookupService {
    if (!LookupService.instance) {
      LookupService.instance = new LookupService();
    }
    return LookupService.instance;
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? Date.now() < expiry : false;
  }

  /**
   * Set cache with expiry
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
  }

  /**
   * Get document types
   */
  public async getDocumentTypes(): Promise<DocumentType[]> {
    const cacheKey = 'document_types';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const data = await api.get<DocumentType[]>(API_ENDPOINTS.lookups.documentTypes);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch document types:', error);
      // Return fallback data
      return [
        { value: 'MADAGASCAR_ID', label: 'MADAGASCAR ID (CIN/CNI)', requires_expiry: false },
        { value: 'PASSPORT', label: 'PASSPORT', requires_expiry: true },
        { value: 'FOREIGN_ID', label: 'FOREIGN ID', requires_expiry: true },
      ];
    }
  }

  /**
   * Get person natures/genders
   */
  public async getPersonNatures(): Promise<PersonNature[]> {
    const cacheKey = 'person_natures';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const data = await api.get<PersonNature[]>(API_ENDPOINTS.lookups.personNatures);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch person natures:', error);
      // Return fallback data
      return [
        { value: '01', label: 'MALE (LEHILAHY)' },
        { value: '02', label: 'FEMALE (VEHIVAVY)' },
      ];
    }
  }

  /**
   * Get address types
   */
  public async getAddressTypes(): Promise<AddressType[]> {
    const cacheKey = 'address_types';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const data = await api.get<AddressType[]>(API_ENDPOINTS.lookups.addressTypes);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch address types:', error);
      // Return fallback data
      return [
        { value: 'RESIDENTIAL', label: 'Residential' },
        { value: 'POSTAL', label: 'Postal' },
      ];
    }
  }

  /**
   * Get languages
   */
  public async getLanguages(): Promise<Language[]> {
    const cacheKey = 'languages';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const data = await api.get<Language[]>(API_ENDPOINTS.lookups.languages);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch languages:', error);
      // Return fallback data
      return [
        { value: 'MG', label: 'MALAGASY' },
        { value: 'FR', label: 'FRANÇAIS' },
        { value: 'EN', label: 'ENGLISH' },
      ];
    }
  }

  /**
   * Get nationalities
   */
  public async getNationalities(): Promise<Nationality[]> {
    const cacheKey = 'nationalities';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const data = await api.get<Nationality[]>(API_ENDPOINTS.lookups.nationalities);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch nationalities:', error);
      // Return fallback data
      return [
        { value: 'MG', label: 'MALAGASY' },
        { value: 'FR', label: 'FRENCH' },
        { value: 'US', label: 'AMERICAN' },
        { value: 'GB', label: 'BRITISH' },
        { value: 'ZA', label: 'SOUTH AFRICAN' },
      ];
    }
  }

  /**
   * Get phone country codes
   */
  public async getPhoneCountryCodes(): Promise<PhoneCountryCode[]> {
    const cacheKey = 'phone_country_codes';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const data = await api.get<PhoneCountryCode[]>(API_ENDPOINTS.lookups.phoneCountryCodes);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch phone country codes:', error);
      // Return fallback data
      return [
        { value: '+261', label: '+261 (MADAGASCAR)' },
        { value: '+27', label: '+27 (SOUTH AFRICA)' },
        { value: '+33', label: '+33 (FRANCE)' },
        { value: '+1', label: '+1 (USA)' },
        { value: '+44', label: '+44 (UK)' },
      ];
    }
  }

  /**
   * Get countries
   */
  public async getCountries(): Promise<Country[]> {
    const cacheKey = 'countries';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const data = await api.get<Country[]>(API_ENDPOINTS.lookups.countries);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch countries:', error);
      // Return fallback data
      return [
        { value: 'MG', label: 'MADAGASCAR' },
        { value: 'FR', label: 'FRANCE' },
        { value: 'US', label: 'UNITED STATES' },
        { value: 'GB', label: 'UNITED KINGDOM' },
        { value: 'ZA', label: 'SOUTH AFRICA' },
        { value: 'OTHER', label: 'OTHER' },
      ];
    }
  }

  /**
   * Get user statuses
   */
  public async getUserStatuses(): Promise<UserStatus[]> {
    const cacheKey = 'user_statuses';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const data = await api.get<UserStatus[]>(API_ENDPOINTS.lookups.userStatuses);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch user statuses:', error);
      // Return fallback data
      return [
        { value: 'ACTIVE', label: 'ACTIVE' },
        { value: 'INACTIVE', label: 'INACTIVE' },
        { value: 'SUSPENDED', label: 'SUSPENDED' },
        { value: 'LOCKED', label: 'LOCKED' },
        { value: 'PENDING_ACTIVATION', label: 'PENDING ACTIVATION' },
      ];
    }
  }

  /**
   * Get user types
   */
  public async getUserTypes(): Promise<UserType[]> {
    const cacheKey = 'user_types';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const data = await api.get<UserType[]>(API_ENDPOINTS.lookups.userTypes);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch user types:', error);
      // Return fallback data
      return [
        { value: 'SYSTEM_USER', label: 'SYSTEM USER' },
        { value: 'NATIONAL_ADMIN', label: 'NATIONAL ADMIN' },
        { value: 'PROVINCIAL_ADMIN', label: 'PROVINCIAL ADMIN' },
        { value: 'LOCATION_USER', label: 'LOCATION USER' },
      ];
    }
  }

  /**
   * Get office types
   */
  public async getOfficeTypes(): Promise<OfficeType[]> {
    const cacheKey = 'office_types';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const data = await api.get<OfficeType[]>(API_ENDPOINTS.lookups.officeTypes);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch office types:', error);
      // Return fallback data
      return [
        { value: 'MAIN', label: 'MAIN OFFICE' },
        { value: 'BRANCH', label: 'BRANCH OFFICE' },
        { value: 'KIOSK', label: 'SERVICE KIOSK' },
        { value: 'MOBILE', label: 'MOBILE UNIT' },
        { value: 'TEMPORARY', label: 'TEMPORARY OFFICE' },
      ];
    }
  }

  /**
   * Get license categories
   */
  public async getLicenseCategories(): Promise<LicenseCategory[]> {
    const cacheKey = 'license_categories';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const data = await api.get<LicenseCategory[]>(API_ENDPOINTS.lookups.licenseCategories);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch license categories:', error);
      // Return fallback data
      return [
        { value: 'A′', label: 'A′ - Light Motorcycle/Moped (16+ years)', minimum_age: 16 },
        { value: 'A', label: 'A - Full Motorcycle (18+ years)', minimum_age: 18 },
        { value: 'B', label: 'B - Light Vehicle/Car (18+ years)', minimum_age: 18 },
        { value: 'C', label: 'C - Heavy Goods Vehicle (21+ years)', minimum_age: 21 },
        { value: 'D', label: 'D - Passenger Transport (21+ years)', minimum_age: 21 },
        { value: 'E', label: 'E - Large Trailers (21+ years)', minimum_age: 21 },
      ];
    }
  }

  /**
   * Get application types
   */
  public async getApplicationTypes(): Promise<ApplicationType[]> {
    const cacheKey = 'application_types';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const data = await api.get<ApplicationType[]>(API_ENDPOINTS.lookups.applicationTypes);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch application types:', error);
      // Return fallback data
      return [
        { value: 'NEW_LICENSE', label: 'New License' },
        { value: 'LEARNERS_PERMIT', label: 'Learners Permit' },
        { value: 'RENEWAL', label: 'Renewal' },
        { value: 'DUPLICATE', label: 'Duplicate' },
        { value: 'UPGRADE', label: 'Upgrade' },
        { value: 'TEMPORARY_LICENSE', label: 'Temporary License' },
        { value: 'INTERNATIONAL_PERMIT', label: 'International Permit' },
      ];
    }
  }

  /**
   * Get application statuses
   */
  public async getApplicationStatuses(): Promise<ApplicationStatus[]> {
    const cacheKey = 'application_statuses';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const data = await api.get<ApplicationStatus[]>(API_ENDPOINTS.lookups.applicationStatuses);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch application statuses:', error);
      // Return fallback data
      return [
        { value: 'DRAFT', label: 'Draft' },
        { value: 'SUBMITTED', label: 'Submitted' },
        { value: 'DOCUMENTS_PENDING', label: 'Documents Pending' },
        { value: 'THEORY_TEST_REQUIRED', label: 'Theory Test Required' },
        { value: 'THEORY_PASSED', label: 'Theory Passed' },
        { value: 'THEORY_FAILED', label: 'Theory Failed' },
        { value: 'PRACTICAL_TEST_REQUIRED', label: 'Practical Test Required' },
        { value: 'PRACTICAL_PASSED', label: 'Practical Passed' },
        { value: 'PRACTICAL_FAILED', label: 'Practical Failed' },
        { value: 'APPROVED', label: 'Approved' },
        { value: 'SENT_TO_PRINTER', label: 'Sent to Printer' },
        { value: 'CARD_PRODUCTION', label: 'Card Production' },
        { value: 'READY_FOR_COLLECTION', label: 'Ready for Collection' },
        { value: 'COMPLETED', label: 'Completed' },
        { value: 'REJECTED', label: 'Rejected' },
        { value: 'CANCELLED', label: 'Cancelled' },
      ];
    }
  }

  /**
   * Get fee structures
   */
  public async getFeeStructures(): Promise<FeeStructure[]> {
    const cacheKey = 'fee_structures';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const data = await api.get<FeeStructure[]>(API_ENDPOINTS.lookups.feeStructures);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch fee structures:', error);
      // Return fallback data
      return [];
    }
  }

  /**
   * Get provinces for Madagascar
   */
  public async getProvinces(): Promise<Province[]> {
    const cacheKey = 'provinces';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const data = await api.get<Province[]>(API_ENDPOINTS.lookups.provinces);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch provinces:', error);
      // Return fallback data with actual Madagascar provinces
      return [
        { code: 'AN', name: 'Antananarivo' },
        { code: 'FI', name: 'Fianarantsoa' },
        { code: 'TM', name: 'Toamasina' },
        { code: 'MJ', name: 'Mahajanga' },
        { code: 'TD', name: 'Toliara' },
        { code: 'AS', name: 'Antsiranana' },
      ];
    }
  }

  /**
   * Get operational locations for dropdowns
   */
  public async getLocations(operationalOnly: boolean = true): Promise<Location[]> {
    const cacheKey = `locations_${operationalOnly ? 'operational' : 'all'}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const params = operationalOnly ? '?operational_only=true' : '';
      const data = await api.get<Location[]>(`${API_ENDPOINTS.locations}/summary${params}`);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      // Return fallback data
      return [
        { id: '1', name: 'Antananarivo Central', code: 'AN01', province_code: 'AN', office_type: 'PROVINCIAL_HEADQUARTERS', is_operational: true },
        { id: '2', name: 'Fianarantsoa Central', code: 'FI01', province_code: 'FI', office_type: 'PROVINCIAL_HEADQUARTERS', is_operational: true },
        { id: '3', name: 'Toamasina Central', code: 'TM01', province_code: 'TM', office_type: 'PROVINCIAL_HEADQUARTERS', is_operational: true },
        { id: '4', name: 'Mahajanga Central', code: 'MJ01', province_code: 'MJ', office_type: 'PROVINCIAL_HEADQUARTERS', is_operational: true },
        { id: '5', name: 'Toliara Central', code: 'TD01', province_code: 'TD', office_type: 'PROVINCIAL_HEADQUARTERS', is_operational: true },
        { id: '6', name: 'Antsiranana Central', code: 'AS01', province_code: 'AS', office_type: 'PROVINCIAL_HEADQUARTERS', is_operational: true },
      ];
    }
  }

  /**
   * Get all lookup data at once for efficiency
   */
  public async getAllLookups(): Promise<AllLookupData> {
    const cacheKey = 'all_lookups';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const data = await api.get<AllLookupData>(API_ENDPOINTS.lookups.all);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch all lookups:', error);
      // Fallback to individual calls
      const [
        document_types,
        person_natures,
        address_types,
        languages,
        nationalities,
        phone_country_codes,
        countries,
        provinces,
        user_statuses,
        user_types,
        office_types,
        license_categories,
        application_types,
        application_statuses,
        fee_structures
      ] = await Promise.all([
        this.getDocumentTypes(),
        this.getPersonNatures(),
        this.getAddressTypes(),
        this.getLanguages(),
        this.getNationalities(),
        this.getPhoneCountryCodes(),
        this.getCountries(),
        this.getProvinces(),
        this.getUserStatuses(),
        this.getUserTypes(),
        this.getOfficeTypes(),
        this.getLicenseCategories(),
        this.getApplicationTypes(),
        this.getApplicationStatuses(),
        this.getFeeStructures()
      ]);

      return {
        document_types,
        person_natures,
        address_types,
        languages,
        nationalities,
        phone_country_codes,
        countries,
        provinces,
        user_statuses,
        user_types,
        office_types,
        license_categories,
        application_types,
        application_statuses,
        fee_structures
      };
    }
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Clear specific cache entry
   */
  public clearCacheEntry(key: string): void {
    this.cache.delete(key);
    this.cacheExpiry.delete(key);
  }
}

// Export singleton instance
export const lookupService = LookupService.getInstance();
export default lookupService; 