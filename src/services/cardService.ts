/**
 * Card Service for Madagascar License System
 * Handles all card-related API operations
 */

import { API_BASE_URL, getAuthToken } from '../config/api';

// Types for card management
export interface CardData {
  id: string;
  card_number: string;
  person_id: string;
  person_name?: string;
  card_type: 'STANDARD' | 'TEMPORARY' | 'DUPLICATE' | 'REPLACEMENT' | 'EMERGENCY';
  status: 'PENDING_ORDER' | 'ORDERED' | 'PENDING_PRODUCTION' | 'IN_PRODUCTION' | 'QUALITY_CONTROL' | 'PRODUCTION_COMPLETED' | 'READY_FOR_COLLECTION' | 'COLLECTED' | 'EXPIRED' | 'CANCELLED' | 'DAMAGED' | 'LOST' | 'STOLEN';
  production_status: string;
  
  // Validity
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  is_temporary: boolean;
  
  // Production info
  ordered_date?: string;
  production_start_date?: string;
  production_completed_date?: string;
  ready_for_collection_date?: string;
  collected_date?: string;
  
  // Locations
  production_location_id?: string;
  collection_location_id?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface CardSearchFilters {
  // Pagination
  page: number;
  size: number;
  
  // Basic filters
  person_id?: string;
  card_type?: string;
  status?: string[];
  is_active?: boolean;
  is_temporary?: boolean;
  
  // Date filters
  created_after?: string;
  created_before?: string;
  ordered_after?: string;
  ordered_before?: string;
  expires_before?: string;
  
  // Location filters
  production_location_id?: string;
  collection_location_id?: string;
  
  // Search terms
  card_number?: string;
  person_name?: string;
  collection_reference?: string;
}

export interface CardListResponse {
  cards: CardData[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface CardCreate {
  person_id: string;
  license_ids: string[];
  card_type?: string;
  valid_for_years?: number;
  production_location_id?: string;
  collection_location_id?: string;
  primary_license_id?: string;
  replacement_reason?: string;
  production_notes?: string;
}

export interface TestCardCreate {
  license_id: string;
}

class CardService {
  private baseURL = `${API_BASE_URL}/api/v1/cards`;

  private async getAuthHeaders(): Promise<Headers> {
    const token = getAuthToken();
    const headers = new Headers({
      'Content-Type': 'application/json',
    });
    
    if (token) {
      headers.append('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        // Keep original error message if parsing fails
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Search cards with filters
  async searchCards(filters: CardSearchFilters): Promise<CardListResponse> {
    const params = new URLSearchParams();
    
    // Add pagination
    params.append('page', filters.page.toString());
    params.append('size', filters.size.toString());
    
    // Add filters
    if (filters.person_id) params.append('person_id', filters.person_id);
    if (filters.card_type) params.append('card_type', filters.card_type);
    if (filters.status && filters.status.length > 0) {
      filters.status.forEach(status => params.append('status', status));
    }
    if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters.is_temporary !== undefined) params.append('is_temporary', filters.is_temporary.toString());
    
    // Add date filters
    if (filters.created_after) params.append('created_after', filters.created_after);
    if (filters.created_before) params.append('created_before', filters.created_before);
    if (filters.ordered_after) params.append('ordered_after', filters.ordered_after);
    if (filters.ordered_before) params.append('ordered_before', filters.ordered_before);
    if (filters.expires_before) params.append('expires_before', filters.expires_before);
    
    // Add location filters
    if (filters.production_location_id) params.append('production_location_id', filters.production_location_id);
    if (filters.collection_location_id) params.append('collection_location_id', filters.collection_location_id);
    
    // Add search terms
    if (filters.card_number) params.append('card_number', filters.card_number);
    if (filters.person_name) params.append('person_name', filters.person_name);
    if (filters.collection_reference) params.append('collection_reference', filters.collection_reference);

    const response = await fetch(`${this.baseURL}/search?${params}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<CardListResponse>(response);
  }

  // Get card by ID
  async getCard(cardId: string): Promise<CardData> {
    const response = await fetch(`${this.baseURL}/${cardId}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<CardData>(response);
  }

  // Get card by card number
  async getCardByNumber(cardNumber: string): Promise<CardData> {
    const response = await fetch(`${this.baseURL}/number/${cardNumber}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<CardData>(response);
  }

  // Get cards for a person
  async getPersonCards(personId: string, activeOnly: boolean = false): Promise<CardData[]> {
    const params = new URLSearchParams();
    if (activeOnly) params.append('active_only', 'true');

    const response = await fetch(`${this.baseURL}/person/${personId}?${params}`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<CardData[]>(response);
  }

  // Create a new card
  async createCard(cardData: CardCreate): Promise<CardData> {
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(cardData),
    });

    return this.handleResponse<CardData>(response);
  }

  // Create test card for a license (simplified for testing)
  async createTestCard(licenseId: string): Promise<CardData> {
    const response = await fetch(`${this.baseURL}/test`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ license_id: licenseId }),
    });

    return this.handleResponse<CardData>(response);
  }

  // Update card status
  async updateCardStatus(cardId: string, status: string, notes?: string): Promise<CardData> {
    const response = await fetch(`${this.baseURL}/${cardId}/status`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ status, notes }),
    });

    return this.handleResponse<CardData>(response);
  }

  // Mark card as collected
  async markCardCollected(cardId: string, collectionReference?: string, notes?: string): Promise<CardData> {
    const response = await fetch(`${this.baseURL}/${cardId}/collect`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ collection_reference: collectionReference, notes }),
    });

    return this.handleResponse<CardData>(response);
  }

  // Regenerate card files
  async regenerateCardFiles(cardId: string): Promise<{success: boolean, message: string, print_job_id: string}> {
    const response = await fetch(`${this.baseURL}/${cardId}/regenerate-files`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
    });

    return this.handleResponse<{success: boolean, message: string, print_job_id: string}>(response);
  }

  // Get card front preview
  async getCardFrontPreview(cardId: string): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/${cardId}/preview/front`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        // Keep original error message if parsing fails
      }
      
      throw new Error(errorMessage);
    }

    return response.blob();
  }

  // Get card back preview
  async getCardBackPreview(cardId: string): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/${cardId}/preview/back`, {
      method: 'GET',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        // Keep original error message if parsing fails
      }
      
      throw new Error(errorMessage);
    }

    return response.blob();
  }

  // Helper methods for status and formatting
  getStatusColor(status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' {
    switch (status) {
      case 'PENDING_ORDER':
        return 'default';
      case 'ORDERED':
      case 'PENDING_PRODUCTION':
        return 'info';
      case 'IN_PRODUCTION':
        return 'primary';
      case 'QUALITY_CONTROL':
        return 'warning';
      case 'PRODUCTION_COMPLETED':
      case 'READY_FOR_COLLECTION':
      case 'COLLECTED':
        return 'success';
      case 'EXPIRED':
      case 'CANCELLED':
      case 'DAMAGED':
      case 'LOST':
      case 'STOLEN':
        return 'error';
      default:
        return 'default';
    }
  }

  formatCardNumber(cardNumber: string): string {
    // Format card number for display
    if (cardNumber.length >= 8) {
      // Format as: XXXX-XXXX-XX
      return cardNumber.replace(/(.{4})(.{4})(.*)/, '$1-$2-$3');
    }
    return cardNumber;
  }

  getCardTypeDisplayName(cardType: string): string {
    switch (cardType) {
      case 'STANDARD':
        return 'Standard Card';
      case 'TEMPORARY':
        return 'Temporary License';
      case 'DUPLICATE':
        return 'Duplicate Card';
      case 'REPLACEMENT':
        return 'Replacement Card';
      case 'EMERGENCY':
        return 'Emergency Card';
      default:
        return cardType;
    }
  }

  getStatusDisplayName(status: string): string {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }
}

// Create and export service instance
const cardService = new CardService();
export default cardService; 