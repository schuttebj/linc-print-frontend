/**
 * API Configuration for Madagascar Driver's License System
 * Handles backend URL configuration and API utilities
 */

// Environment-based API configuration
const getApiBaseUrl = (): string => {
  const env = (import.meta as any).env;
  
  // Debug logging
  console.log('🔧 Environment Detection:', {
    VITE_API_BASE_URL: env?.VITE_API_BASE_URL,
    DEV: env?.DEV,
    PROD: env?.PROD,
    MODE: env?.MODE
  });

  // Check for environment variable first
  if (env?.VITE_API_BASE_URL) {
    console.log('✅ Using VITE_API_BASE_URL:', env.VITE_API_BASE_URL);
    return env.VITE_API_BASE_URL;
  }

  // Check if we're in development mode
  if (env?.DEV || env?.MODE === 'development') {
    console.log('🔧 Development mode detected, using localhost');
    return 'http://localhost:8000'; // Local backend development server
  }

  // Production backend URL - Madagascar Render deployment
  console.log('🚀 Production mode detected, using Render backend');
  return 'https://linc-print-backend.onrender.com'; // Madagascar backend
};

export const API_BASE_URL = getApiBaseUrl();
export const API_VERSION = 'v1';

// Additional safeguard - log the final API base URL
console.log('🎯 Final API_BASE_URL:', API_BASE_URL);

// Validate that we're not accidentally using the frontend URL
if (API_BASE_URL.includes('linc-print-frontend') || API_BASE_URL.includes('vercel.app')) {
  console.error('❌ CRITICAL ERROR: API_BASE_URL is pointing to frontend instead of backend!');
  console.error('❌ Current URL:', API_BASE_URL);
  console.error('❌ Expected backend URL: https://linc-print-backend.onrender.com');
}
export const API_ENDPOINTS = {
  // Authentication
  auth: `${API_BASE_URL}/api/${API_VERSION}/auth`,
  
  // Person Management - Madagascar endpoints
  persons: `${API_BASE_URL}/api/${API_VERSION}/persons`,
  
  // Specific person endpoints
  personSearch: `${API_BASE_URL}/api/${API_VERSION}/persons/search`,
  personById: (id: string) => `${API_BASE_URL}/api/${API_VERSION}/persons/${id}`,
  personDuplicates: `${API_BASE_URL}/api/${API_VERSION}/persons/check-duplicates`,
  
  // Person aliases (documents)
  personAliases: (personId: string) => `${API_BASE_URL}/api/${API_VERSION}/persons/${personId}/aliases`,
  personAliasById: (personId: string, aliasId: string) => `${API_BASE_URL}/api/${API_VERSION}/persons/${personId}/aliases/${aliasId}`,
  personSetPrimaryAlias: (personId: string, aliasId: string) => `${API_BASE_URL}/api/${API_VERSION}/persons/${personId}/aliases/${aliasId}/set-primary`,
  
  // Person addresses
  personAddresses: (personId: string) => `${API_BASE_URL}/api/${API_VERSION}/persons/${personId}/addresses`,
  personAddressById: (personId: string, addressId: string) => `${API_BASE_URL}/api/${API_VERSION}/persons/${personId}/addresses/${addressId}`,
  personSetPrimaryAddress: (personId: string, addressId: string) => `${API_BASE_URL}/api/${API_VERSION}/persons/${personId}/addresses/${addressId}/set-primary`,
  
  // User management
  users: `${API_BASE_URL}/api/${API_VERSION}/users`,
  userById: (id: string) => `${API_BASE_URL}/api/${API_VERSION}/users/${id}`,
  
  // Location management
  locations: `${API_BASE_URL}/api/${API_VERSION}/locations`,
  locationById: (id: string) => `${API_BASE_URL}/api/${API_VERSION}/locations/${id}`,
  
  // Role management
  roles: `${API_BASE_URL}/api/${API_VERSION}/roles`,
  roleById: (id: string) => `${API_BASE_URL}/api/${API_VERSION}/roles/${id}`,
  
  // Audit logs
  audit: `${API_BASE_URL}/api/${API_VERSION}/audit`,
  auditUser: (userId: string) => `${API_BASE_URL}/api/${API_VERSION}/audit/user/${userId}`,
  auditResource: (resourceType: string, resourceId: string) => `${API_BASE_URL}/api/${API_VERSION}/audit/resource/${resourceType}/${resourceId}`,
  auditStatistics: `${API_BASE_URL}/api/${API_VERSION}/audit/statistics`,
  auditSecurity: `${API_BASE_URL}/api/${API_VERSION}/audit/security/suspicious-activity`,
  auditExport: `${API_BASE_URL}/api/${API_VERSION}/audit/export`,
  
  // Admin endpoints
  adminInitTables: `${API_BASE_URL}/admin/init-tables`,
  adminInitUsers: `${API_BASE_URL}/admin/init-users`,
  adminDropTables: `${API_BASE_URL}/admin/drop-tables`,
  
  // Health check
  health: `${API_BASE_URL}/health`,
  
  // Lookup endpoints
  lookups: {
    documentTypes: `${API_BASE_URL}/api/${API_VERSION}/lookups/document-types`,
    personNatures: `${API_BASE_URL}/api/${API_VERSION}/lookups/person-natures`,
    addressTypes: `${API_BASE_URL}/api/${API_VERSION}/lookups/address-types`,
    languages: `${API_BASE_URL}/api/${API_VERSION}/lookups/languages`,
    nationalities: `${API_BASE_URL}/api/${API_VERSION}/lookups/nationalities`,
    phoneCountryCodes: `${API_BASE_URL}/api/${API_VERSION}/lookups/phone-country-codes`,
    countries: `${API_BASE_URL}/api/${API_VERSION}/lookups/countries`,
    provinces: `${API_BASE_URL}/api/${API_VERSION}/lookups/provinces`,
    userStatuses: `${API_BASE_URL}/api/${API_VERSION}/lookups/user-statuses`,
    userTypes: `${API_BASE_URL}/api/${API_VERSION}/lookups/user-types`,
    officeTypes: `${API_BASE_URL}/api/${API_VERSION}/lookups/office-types`,
    equipmentStatuses: `${API_BASE_URL}/api/${API_VERSION}/lookups/equipment-statuses`,
    // Application-related lookups
    feeStructures: `${API_BASE_URL}/api/${API_VERSION}/lookups/fee-structures`,
    licenseCategories: `${API_BASE_URL}/api/${API_VERSION}/lookups/license-categories`,
    applicationTypes: `${API_BASE_URL}/api/${API_VERSION}/lookups/application-types`,
    applicationStatuses: `${API_BASE_URL}/api/${API_VERSION}/lookups/application-statuses`,
    all: `${API_BASE_URL}/api/${API_VERSION}/lookups/all`,
  },

  // Applications endpoints
  applications: `${API_BASE_URL}/api/${API_VERSION}/applications`,
  applicationById: (id: string) => `${API_BASE_URL}/api/${API_VERSION}/applications/${id}`,
  applicationsByPerson: (personId: string) => `${API_BASE_URL}/api/${API_VERSION}/applications/search/person/${personId}`,
  personLicenses: (personId: string) => `${API_BASE_URL}/api/${API_VERSION}/applications/person/${personId}/licenses`,
  applicationsInProgress: `${API_BASE_URL}/api/${API_VERSION}/applications/in-progress`,
  applicationStatus: (id: string) => `${API_BASE_URL}/api/${API_VERSION}/applications/${id}/status`,
  applicationDocuments: (id: string) => `${API_BASE_URL}/api/${API_VERSION}/applications/${id}/documents`,
  applicationBiometrics: (id: string) => `${API_BASE_URL}/api/${API_VERSION}/applications/${id}/biometric-data`,
  applicationFees: (id: string) => `${API_BASE_URL}/api/${API_VERSION}/applications/${id}/fees`,
  applicationFeePayment: (id: string, feeId: string) => `${API_BASE_URL}/api/${API_VERSION}/applications/${id}/fees/${feeId}/pay`,
  applicationAssociated: (id: string) => `${API_BASE_URL}/api/${API_VERSION}/applications/${id}/associated`,
  applicationStatistics: `${API_BASE_URL}/api/${API_VERSION}/applications/statistics`,
  
  // Standalone image processing (doesn't require application)
  processImage: `${API_BASE_URL}/api/${API_VERSION}/applications/process-image`,

  // License endpoints (issued licenses management)
  licenses: `${API_BASE_URL}/api/${API_VERSION}/licenses`,
  licenseById: (id: string) => `${API_BASE_URL}/api/${API_VERSION}/licenses/${id}`,
  activeLicenses: `${API_BASE_URL}/api/${API_VERSION}/licenses/active`,
  pendingActivationLicenses: `${API_BASE_URL}/api/${API_VERSION}/licenses/pending-activation`,
  personCurrentLicenses: (personId: string) => `${API_BASE_URL}/api/${API_VERSION}/licenses/person/${personId}/current`,
  personAllLicenses: (personId: string) => `${API_BASE_URL}/api/${API_VERSION}/licenses/person/${personId}`,
  activateLicense: (applicationId: string) => `${API_BASE_URL}/api/${API_VERSION}/licenses/activate/${applicationId}`,
  suspendLicense: (licenseId: string) => `${API_BASE_URL}/api/${API_VERSION}/licenses/${licenseId}/suspend`,
  reactivateLicense: (licenseId: string) => `${API_BASE_URL}/api/${API_VERSION}/licenses/${licenseId}/reactivate`,
  renewLicense: (licenseId: string) => `${API_BASE_URL}/api/${API_VERSION}/licenses/${licenseId}/renew`,
  licenseStatistics: `${API_BASE_URL}/api/${API_VERSION}/licenses/statistics/summary`,
  licensePreview: (applicationId: string) => `${API_BASE_URL}/api/${API_VERSION}/licenses/applications/${applicationId}/preview`,
} as const;

/**
 * Get auth token from memory (set by AuthContext)
 */
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = (): string | null => {
  return authToken;
};

/**
 * Default headers for API requests
 */
export const getDefaultHeaders = (includeAuth = true): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (includeAuth) {
    // Add authentication header if available (from memory, not localStorage)
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
};

/**
 * API request wrapper with error handling
 */
export const apiRequest = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  try {
    console.log('🔍 API Request:', { url, method: options.method || 'GET' });
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getDefaultHeaders(),
        ...options.headers,
      },
    });

    console.log('📡 API Response:', { 
      status: response.status, 
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      url: response.url 
    });

    // Handle non-JSON responses (like HTML error pages)
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      console.error('❌ Non-JSON response received:', text.substring(0, 200));
      console.error('🔗 Response URL:', response.url);
      throw new Error(`API returned non-JSON response. Status: ${response.status}`);
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || data.message || `API request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

/**
 * Utility functions for common API operations
 */
export const api = {
  // GET request
  get: <T>(url: string): Promise<T> => 
    apiRequest<T>(url, { method: 'GET' }),

  // POST request
  post: <T>(url: string, data?: any): Promise<T> =>
    apiRequest<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  // PUT request
  put: <T>(url: string, data?: any): Promise<T> =>
    apiRequest<T>(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  // DELETE request
  delete: <T>(url: string): Promise<T> =>
    apiRequest<T>(url, { method: 'DELETE' }),
};

export default api; 