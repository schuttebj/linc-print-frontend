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

// Equipment status interface removed - no longer needed for location management

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

  // Equipment status methods removed - no longer needed for location management

  /**
   * Get provinces
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
      // Return fallback data
      return [
        { code: 'T', name: 'ANTANANARIVO' },
        { code: 'D', name: 'ANTSIRANANA (DIEGO SUAREZ)' },
        { code: 'F', name: 'FIANARANTSOA' },
        { code: 'M', name: 'MAHAJANGA' },
        { code: 'A', name: 'TOAMASINA' },
        { code: 'U', name: 'TOLIARA' },
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
        office_types
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
        this.getOfficeTypes()
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
        office_types
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