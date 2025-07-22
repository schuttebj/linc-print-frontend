/**
 * Transaction Service for LINC Print Frontend
 * Handles all transaction-related API communication including POS system
 */

import { api } from '../config/api';

export interface PersonPaymentSummary {
  person_id: string;
  person_name: string;
  person_id_number: string;
  payable_applications: PayableApplicationItem[];
  payable_card_orders: PayableCardOrderItem[];
  total_applications_amount: number;
  total_card_orders_amount: number;
  grand_total_amount: number;
}

export interface PayableApplicationItem {
  id: string;
  application_number: string;
  application_type: string;
  license_category: string;
  status: string;
  fees: any[];
  total_amount: number;
}

export interface PayableCardOrderItem {
  id: string;
  order_number: string;
  card_type: string;
  urgency_level: number;
  fee_amount: number;
  application_number: string;
  application_type: string;
}

export interface PaymentRequest {
  person_id: string;
  location_id: string;
  application_ids: string[];
  card_order_ids: string[];
  payment_method: string;
  payment_reference?: string;
  notes?: string;
}

export interface PaymentResponse {
  transaction: Transaction;
  receipt_url?: string;
  updated_applications: string[];
  updated_card_orders: string[];
  success_message: string;
}

export interface Transaction {
  id: string;
  transaction_number: string;
  transaction_type: string;
  status: string;
  person_id: string;
  location_id: string;
  total_amount: number;
  payment_method?: string;
  payment_reference?: string;
  processed_by: string;
  processed_at?: string;
  receipt_number?: string;
  receipt_printed: boolean;
  receipt_printed_at?: string;
  notes?: string;
  metadata?: any;
  created_at: string;
  updated_at?: string;
  items: TransactionItem[];
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  item_type: string;
  description: string;
  amount: number;
  application_id?: string;
  card_order_id?: string;
  fee_structure_id?: string;
  metadata?: any;
  created_at: string;
}

export interface CardOrder {
  id: string;
  order_number: string;
  status: string;
  application_id: string;
  person_id: string;
  card_type: string;
  urgency_level: number;
  fee_amount: number;
  payment_required: boolean;
  ordered_by: string;
  ordered_at: string;
  payment_deadline?: string;
  production_started_at?: string;
  production_completed_at?: string;
  ready_for_collection_at?: string;
  collected_at?: string;
  collected_by?: string;
  card_data?: any;
  production_metadata?: any;
  order_notes?: string;
  collection_notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface FeeStructure {
  id: string;
  fee_type: string;
  display_name: string;
  description?: string;
  amount: number;
  currency: string;
  is_active: boolean;
  effective_from: string;
  effective_until?: string;
  created_at: string;
  updated_at?: string;
  created_by: string;
  last_updated_by?: string;
}

export interface TransactionSummary {
  date: string;
  location_id: string;
  total_transactions: number;
  total_amount: number;
  payment_methods: { [key: string]: { count: number; amount: number } };
}

export interface CardOrderCreate {
  application_id: string;
  card_type?: string;
  urgency_level?: number;
  payment_deadline?: string;
  order_notes?: string;
}

export interface FeeStructureUpdate {
  display_name?: string;
  description?: string;
  amount?: number;
  is_active?: boolean;
  effective_until?: string;
}

class TransactionService {
  private baseUrl = '/api/v1/transactions';

  /**
   * POS System - Search person for payment
   */
  async searchPersonForPayment(idNumber: string): Promise<PersonPaymentSummary> {
    try {
      const response = await api.get<PersonPaymentSummary>(
        `${this.baseUrl}/pos/search/${encodeURIComponent(idNumber)}`
      );
      return response;
    } catch (error: any) {
      console.error('Error searching person for payment:', error);
      throw new Error(error.response?.data?.detail || 'Failed to search for person');
    }
  }

  /**
   * POS System - Process payment
   */
  async processPayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
    try {
      const response = await api.post<PaymentResponse>(
        `${this.baseUrl}/pos/process-payment`,
        paymentData
      );
      return response;
    } catch (error: any) {
      console.error('Error processing payment:', error);
      throw new Error(error.response?.data?.detail || 'Failed to process payment');
    }
  }

  /**
   * Get transactions with filtering
   */
  async getTransactions(params: {
    skip?: number;
    limit?: number;
    person_id?: string;
    location_id?: string;
    status?: string;
  } = {}): Promise<Transaction[]> {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
      const url = `${this.baseUrl}?${queryParams.toString()}`;
      const response = await api.get<Transaction[]>(url);
      return response;
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      throw new Error(error.response?.data?.detail || 'Failed to fetch transactions');
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(transactionId: string): Promise<Transaction> {
    try {
      const response = await api.get<Transaction>(`${this.baseUrl}/${transactionId}`);
      return response;
    } catch (error: any) {
      console.error('Error fetching transaction:', error);
      throw new Error(error.response?.data?.detail || 'Failed to fetch transaction');
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(transactionId: string): Promise<any> {
    try {
      const response = await api.get(`${this.baseUrl}/${transactionId}/receipt`);
      return response;
    } catch (error: any) {
      console.error('Error fetching receipt:', error);
      throw new Error(error.response?.data?.detail || 'Failed to fetch receipt');
    }
  }

  /**
   * Create card order
   */
  async createCardOrder(cardOrderData: CardOrderCreate): Promise<CardOrder> {
    try {
      const response = await api.post<CardOrder>(
        `${this.baseUrl}/card-orders`,
        cardOrderData
      );
      return response;
    } catch (error: any) {
      console.error('Error creating card order:', error);
      throw new Error(error.response?.data?.detail || 'Failed to create card order');
    }
  }

  /**
   * Get card orders with filtering
   */
  async getCardOrders(params: {
    skip?: number;
    limit?: number;
    status?: string;
    person_id?: string;
  } = {}): Promise<CardOrder[]> {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
      const url = `${this.baseUrl}/card-orders?${queryParams.toString()}`;
      const response = await api.get<CardOrder[]>(url);
      return response;
    } catch (error: any) {
      console.error('Error fetching card orders:', error);
      throw new Error(error.response?.data?.detail || 'Failed to fetch card orders');
    }
  }

  /**
   * Get fee structures
   */
  async getFeeStructures(): Promise<FeeStructure[]> {
    try {
      const response = await api.get<FeeStructure[]>(`${this.baseUrl}/fee-structures`);
      return response;
    } catch (error: any) {
      console.error('Error fetching fee structures:', error);
      throw new Error(error.response?.data?.detail || 'Failed to fetch fee structures');
    }
  }

  /**
   * Update fee structure (admin only)
   */
  async updateFeeStructure(
    feeStructureId: string, 
    updateData: FeeStructureUpdate
  ): Promise<FeeStructure> {
    try {
      const response = await api.put<FeeStructure>(
        `${this.baseUrl}/fee-structures/${feeStructureId}`,
        updateData
      );
      return response;
    } catch (error: any) {
      console.error('Error updating fee structure:', error);
      throw new Error(error.response?.data?.detail || 'Failed to update fee structure');
    }
  }

  /**
   * Get daily transaction summary
   */
  async getDailyTransactionSummary(
    date: string,
    locationId?: string
  ): Promise<TransactionSummary> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('summary_date', date);
      if (locationId) {
        queryParams.append('location_id', locationId);
      }

      const url = `${this.baseUrl}/reports/daily-summary?${queryParams.toString()}`;
      const response = await api.get<TransactionSummary>(url);
      return response;
    } catch (error: any) {
      console.error('Error fetching daily summary:', error);
      throw new Error(error.response?.data?.detail || 'Failed to fetch daily summary');
    }
  }

  /**
   * Get payment methods for display
   */
  getPaymentMethods(): Array<{ value: string; label: string }> {
    return [
      { value: 'CASH', label: 'Cash' },
      { value: 'MOBILE_MONEY', label: 'Mobile Money' },
      { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
      { value: 'CARD', label: 'Credit/Debit Card' },
      { value: 'CHEQUE', label: 'Cheque' }
    ];
  }

  /**
   * Get transaction statuses for filtering
   */
  getTransactionStatuses(): Array<{ value: string; label: string }> {
    return [
      { value: 'PENDING', label: 'Pending' },
      { value: 'PAID', label: 'Paid' },
      { value: 'CANCELLED', label: 'Cancelled' },
      { value: 'REFUNDED', label: 'Refunded' }
    ];
  }

  /**
   * Get card order statuses for filtering
   */
  getCardOrderStatuses(): Array<{ value: string; label: string }> {
    return [
      { value: 'PENDING_PAYMENT', label: 'Pending Payment' },
      { value: 'PAID', label: 'Paid' },
      { value: 'ORDERED', label: 'Ordered' },
      { value: 'IN_PRODUCTION', label: 'In Production' },
      { value: 'READY_FOR_COLLECTION', label: 'Ready for Collection' },
      { value: 'COLLECTED', label: 'Collected' },
      { value: 'CANCELLED', label: 'Cancelled' }
    ];
  }

  /**
   * Format payment method for display
   */
  formatPaymentMethod(method: string): string {
    const methods = this.getPaymentMethods();
    return methods.find(m => m.value === method)?.label || method;
  }

  /**
   * Format transaction status for display
   */
  formatTransactionStatus(status: string): string {
    const statuses = this.getTransactionStatuses();
    return statuses.find(s => s.value === status)?.label || status;
  }

  /**
   * Format card order status for display
   */
  formatCardOrderStatus(status: string): string {
    const statuses = this.getCardOrderStatuses();
    return statuses.find(s => s.value === status)?.label || status;
  }
}

// Export singleton instance
export const transactionService = new TransactionService();
export default transactionService; 