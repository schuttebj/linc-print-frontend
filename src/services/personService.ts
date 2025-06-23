/**
 * Person Service for Madagascar Driver's License System
 * API service for person management operations
 */

import axios, { AxiosResponse } from 'axios';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://linc-print-backend.onrender.com';

// Create axios instance with default config
const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors gracefully
    if (!error.response) {
      console.warn('Network error or request timeout:', error.message);
      return Promise.reject(new Error('Network connection failed. Please check your internet connection.'));
    }
    
    // Handle auth errors
    if (error.response?.status === 401) {
      console.warn('Authentication failed, clearing tokens');
      // Token expired or invalid
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    // Handle server errors
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response.status, error.response.data);
      return Promise.reject(new Error('Server error. Please try again later.'));
    }
    
    return Promise.reject(error);
  }
);

// Types for Madagascar person data
export interface PersonCreate {
  surname: string;
  first_name: string;
  middle_name?: string;
  person_nature: string; // '01' for Male, '02' for Female
  birth_date?: string;
  nationality_code?: string;
  preferred_language?: string;
  email_address?: string;
  work_phone?: string;
  cell_phone?: string;
}

export interface PersonUpdate extends Partial<PersonCreate> {
  is_active?: boolean;
}

export interface PersonAlias {
  id?: string;
  document_type: 'MG_ID' | 'PASSPORT';
  document_number: string;
  is_primary: boolean;
  expiry_date?: string;
  country_of_origin?: string;
}

export interface PersonAddress {
  id?: string;
  address_type: 'RESIDENTIAL' | 'POSTAL';
  street_line1?: string;
  street_line2?: string;
  locality: string;
  postal_code: string;
  town: string;
  country?: string;
  is_primary: boolean;
}

export interface Person {
  id: string;
  surname: string;
  first_name: string;
  middle_name?: string;
  person_nature: string;
  birth_date?: string;
  nationality_code: string;
  preferred_language: string;
  email_address?: string;
  work_phone?: string;
  cell_phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  aliases: PersonAlias[];
  addresses: PersonAddress[];
}

export interface PersonSearchParams {
  search_text?: string;
  document_number?: string;
  surname?: string;
  first_name?: string;
  locality?: string;
  phone_number?: string;
  document_type?: string;
  is_active?: boolean;
  skip?: number;
  limit?: number;
}

export interface PersonSearchResult {
  persons: Person[];
  total: number;
  skip: number;
  limit: number;
}

export interface DuplicateCheckResult {
  duplicates: Array<{
    person: Person;
    similarity_score: number;
    matching_fields: string[];
  }>;
  threshold: number;
}

// Person Service Class
class PersonService {
  // Create a new person
  async createPerson(personData: PersonCreate): Promise<Person> {
    const response: AxiosResponse<Person> = await api.post('/persons/', personData);
    return response.data;
  }

  // Search for persons
  async searchPersons(params: PersonSearchParams): Promise<PersonSearchResult> {
    const response: AxiosResponse<PersonSearchResult> = await api.get('/persons/search', {
      params,
    });
    return response.data;
  }

  // Get person by ID
  async getPersonById(personId: string): Promise<Person> {
    const response: AxiosResponse<Person> = await api.get(`/persons/${personId}`);
    return response.data;
  }

  // Update person
  async updatePerson(personId: string, personData: PersonUpdate): Promise<Person> {
    const response: AxiosResponse<Person> = await api.put(`/persons/${personId}`, personData);
    return response.data;
  }

  // Delete person (soft delete)
  async deletePerson(personId: string): Promise<void> {
    await api.delete(`/persons/${personId}`);
  }

  // Check for duplicates
  async checkDuplicates(personData: PersonCreate, threshold: number = 0.7): Promise<DuplicateCheckResult> {
    const response: AxiosResponse<DuplicateCheckResult> = await api.post('/persons/check-duplicates', {
      person_data: personData,
      threshold,
    });
    return response.data;
  }

  // Alias (Document) Management
  async createPersonAlias(personId: string, aliasData: Omit<PersonAlias, 'id'>): Promise<PersonAlias> {
    const response: AxiosResponse<PersonAlias> = await api.post(`/persons/${personId}/aliases`, aliasData);
    return response.data;
  }

  async updatePersonAlias(personId: string, aliasId: string, aliasData: Partial<PersonAlias>): Promise<PersonAlias> {
    const response: AxiosResponse<PersonAlias> = await api.put(`/persons/${personId}/aliases/${aliasId}`, aliasData);
    return response.data;
  }

  async deletePersonAlias(personId: string, aliasId: string): Promise<void> {
    await api.delete(`/persons/${personId}/aliases/${aliasId}`);
  }

  async setPrimaryAlias(personId: string, aliasId: string): Promise<PersonAlias> {
    const response: AxiosResponse<PersonAlias> = await api.post(`/persons/${personId}/aliases/${aliasId}/set-primary`);
    return response.data;
  }

  // Address Management
  async createPersonAddress(personId: string, addressData: Omit<PersonAddress, 'id'>): Promise<PersonAddress> {
    const response: AxiosResponse<PersonAddress> = await api.post(`/persons/${personId}/addresses`, addressData);
    return response.data;
  }

  async updatePersonAddress(personId: string, addressId: string, addressData: Partial<PersonAddress>): Promise<PersonAddress> {
    const response: AxiosResponse<PersonAddress> = await api.put(`/persons/${personId}/addresses/${addressId}`, addressData);
    return response.data;
  }

  async deletePersonAddress(personId: string, addressId: string): Promise<void> {
    await api.delete(`/persons/${personId}/addresses/${addressId}`);
  }

  async setPrimaryAddress(personId: string, addressId: string): Promise<PersonAddress> {
    const response: AxiosResponse<PersonAddress> = await api.post(`/persons/${personId}/addresses/${addressId}/set-primary`);
    return response.data;
  }
}

// Export singleton instance
export const personService = new PersonService();
export default personService; 