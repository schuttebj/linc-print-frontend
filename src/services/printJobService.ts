// Print Job Service for Madagascar License System
// Handles communication with print job backend for card ordering and queue management

import { api } from '../config/api';

// Get API base URL function
const getApiBaseUrl = (): string => {
  const env = (import.meta as any).env;
  
  if (env?.VITE_API_BASE_URL) {
    return env.VITE_API_BASE_URL;
  }
  
  if (env?.DEV || env?.MODE === 'development') {
    return 'http://localhost:8000';
  }
  
  return 'https://madagascar-license-backend.onrender.com';
};

// Types for print job system
export interface PrintJobCreateRequest {
  application_id: string;
  additional_application_ids?: string[];
  card_template?: string;
  production_notes?: string;
  location_id?: string; // Optional location for admin users to specify print location
}

export interface PrintJobResponse {
  id: string;
  job_number: string;
  status: 'QUEUED' | 'ASSIGNED' | 'PRINTING' | 'PRINTED' | 'QUALITY_CHECK' | 'COMPLETED' | 'REPRINT_REQUIRED' | 'CANCELLED' | 'FAILED';
  priority: 'NORMAL' | 'HIGH' | 'URGENT' | 'REPRINT';
  queue_position?: number;
  
  // Person and location
  person_id: string;
  person_name?: string;
  print_location_id: string;
  print_location_name?: string;
  
  // Assigned user information
  assigned_to_user_id?: string;
  assigned_to_user_name?: string;
  
  // Card details
  card_number: string;
  card_template: string;
  
  // Timing
  submitted_at: string;
  assigned_at?: string;
  printing_started_at?: string;
  printing_completed_at?: string;
  completed_at?: string;
  
  // Quality check
  quality_check_result?: 'PENDING' | 'PASSED' | 'FAILED_PRINTING' | 'FAILED_DATA' | 'FAILED_DAMAGE';
  quality_check_notes?: string;
  
  // Files
  pdf_files_generated: boolean;
  
  // Reprint info
  original_print_job_id?: string;
  reprint_reason?: string;
  reprint_count: number;
  
  // Associated applications
  applications: PrintJobApplicationResponse[];
}

export interface PrintJobApplicationResponse {
  application_id: string;
  application_number: string;
  application_type: string;
  is_primary: boolean;
  added_at: string;
}

export interface PersonLicenseInfo {
  license_id: string;
  category: string;
  issue_date: string;
  expiry_date?: string;
  status: string;
  restrictions: {
    driver_restrictions: string[];
    vehicle_restrictions: string[];
  };
}

export interface PrintJobDetailResponse extends PrintJobResponse {
  // License data
  licenses: PersonLicenseInfo[];
  
  // User information
  assigned_to_user_id?: string;
  assigned_to_user_name?: string;
  quality_check_by_user_id?: string;
  quality_check_by_user_name?: string;
  
  // Detailed timing
  quality_check_started_at?: string;
  quality_check_completed_at?: string;
  collection_ready_at?: string;
  
  // Production details
  production_batch_id?: string;
  production_notes?: string;
  printer_hardware_id?: string;
  
  // Queue management
  queue_changes?: Array<{
    action: string;
    reason: string;
    user_id: string;
    timestamp: string;
    old_position?: number;
    new_position?: number;
  }>;
  
  // File paths
  pdf_front_path?: string;
  pdf_back_path?: string;
  pdf_combined_path?: string;
}

export interface PrintQueueResponse {
  location_id: string;
  location_name?: string;
  current_queue_size: number;
  total_jobs_processed: number;
  average_processing_time_minutes?: number;
  last_updated: string;
  
  // Current queue
  queued_jobs: PrintJobResponse[];
  in_progress_jobs: PrintJobResponse[];
  completed_today: number;
}

export interface PrintJobStatistics {
  location_id?: string;
  location_name?: string;
  
  // Counts by status
  total_jobs: number;
  queued_jobs: number;
  in_progress_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  reprint_jobs: number;
  
  // Quality metrics
  qa_pass_rate: number;
  average_completion_time_hours?: number;
  
  // Daily statistics
  jobs_completed_today: number;
  jobs_submitted_today: number;
  
  // Time period
  period_start?: string;
  period_end?: string;
}

export interface PrintJobSearchResponse {
  jobs: PrintJobResponse[];
  total_count: number;
  page: number;
  page_size: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

export interface QueueMoveRequest {
  reason: string;
}

export interface PrintJobAssignRequest {
  printer_user_id: string;
}

export interface PrintJobStartRequest {
  printer_hardware_id?: string;
}

export interface PrintJobCompleteRequest {
  production_notes?: string;
}

export interface QualityCheckRequest {
  qa_result: 'PENDING' | 'PASSED' | 'FAILED_PRINTING' | 'FAILED_DATA' | 'FAILED_DAMAGE';
  qa_notes?: string;
}

class PrintJobService {
  private baseURL = `${getApiBaseUrl()}/api/v1/printing`;

  private async makeRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem('access_token');
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }

    return response.json();
  }

  // Get accessible print queues based on user's role
  async getAccessiblePrintQueues(): Promise<any[]> {
    return await this.makeRequest<any[]>('/queues');
  }

  // Get specific print queue for a location (with access validation)
  async getPrintQueueByLocation(locationId: string): Promise<any> {
    return await this.makeRequest<any>(`/queue/${locationId}`);
  }

  // Create print job with location validation
  async createPrintJob(printJobData: any): Promise<any> {
    return await this.makeRequest<any>('/jobs', {
      method: 'POST',
      body: JSON.stringify(printJobData)
    });
  }

  // Get print queue for location
  async getPrintQueue(
    locationId: string,
    status?: string[],
    limit?: number
  ): Promise<PrintQueueResponse> {
    const params = new URLSearchParams();
    if (status) {
      status.forEach(s => params.append('status', s));
    }
    if (limit) {
      params.append('limit', limit.toString());
    }

    const queryString = params.toString();
    const endpoint = `/queue/${locationId}${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<PrintQueueResponse>(endpoint);
  }

  // Move job to top of queue
  async moveJobToTop(jobId: string, reason: string): Promise<PrintJobResponse> {
    return this.makeRequest<PrintJobResponse>(`/jobs/${jobId}/move-to-top`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Assign job to printer
  async assignJobToPrinter(jobId: string, printerUserId: string): Promise<PrintJobResponse> {
    return this.makeRequest<PrintJobResponse>(`/jobs/${jobId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ printer_user_id: printerUserId }),
    });
  }

  // Start printing job
  async startPrintingJob(jobId: string, printerHardwareId?: string): Promise<PrintJobResponse> {
    return this.makeRequest<PrintJobResponse>(`/jobs/${jobId}/start`, {
      method: 'POST',
      body: JSON.stringify({ printer_hardware_id: printerHardwareId }),
    });
  }

  // Complete printing job
  async completePrintingJob(jobId: string, productionNotes?: string): Promise<PrintJobResponse> {
    return this.makeRequest<PrintJobResponse>(`/jobs/${jobId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ production_notes: productionNotes }),
    });
  }

  // Start quality check
  async startQualityCheck(jobId: string): Promise<PrintJobResponse> {
    return this.makeRequest<PrintJobResponse>(`/jobs/${jobId}/qa-start`, {
      method: 'POST',
    });
  }

  // Complete quality check
  async completeQualityCheck(
    jobId: string,
    qaResult: QualityCheckRequest['qa_result'],
    qaNotes?: string
  ): Promise<PrintJobResponse> {
    return this.makeRequest<PrintJobResponse>(`/jobs/${jobId}/qa-complete`, {
      method: 'POST',
      body: JSON.stringify({
        qa_result: qaResult,
        qa_notes: qaNotes,
      }),
    });
  }

  // Get print job details
  async getPrintJob(jobId: string): Promise<PrintJobDetailResponse> {
    return this.makeRequest<PrintJobDetailResponse>(`/jobs/${jobId}`);
  }

  // Search print jobs
  async searchPrintJobs(
    filters: {
      location_id?: string;
      status?: string[];
      person_id?: string;
      application_id?: string;
      job_number?: string;
      date_from?: string;
      date_to?: string;
      priority?: string;
      assigned_to?: string;
    },
    page: number = 1,
    pageSize: number = 20
  ): Promise<PrintJobSearchResponse> {
    const params = new URLSearchParams();
    
    // Add filters
    if (filters.location_id) params.append('location_id', filters.location_id);
    if (filters.status) {
      filters.status.forEach(s => params.append('status', s));
    }
    if (filters.person_id) params.append('person_id', filters.person_id);
    if (filters.application_id) params.append('application_id', filters.application_id);
    if (filters.job_number) params.append('job_number', filters.job_number);
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.assigned_to) params.append('assigned_to', filters.assigned_to);
    
    // Add pagination
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());

    return this.makeRequest<PrintJobSearchResponse>(`/jobs?${params.toString()}`);
  }

  // Get print job statistics
  async getPrintStatistics(locationId: string, days: number = 30): Promise<PrintJobStatistics> {
    return this.makeRequest<PrintJobStatistics>(`/statistics/${locationId}?days=${days}`);
  }

  // Get status display name
  getStatusDisplayName(status: string): string {
    const statusMap: Record<string, string> = {
      'QUEUED': 'Queued',
      'ASSIGNED': 'Assigned',
      'PRINTING': 'Printing',
      'PRINTED': 'Printed',
      'QUALITY_CHECK': 'Quality Check',
      'COMPLETED': 'Completed',
      'REPRINT_REQUIRED': 'Reprint Required',
      'CANCELLED': 'Cancelled',
      'FAILED': 'Failed'
    };
    return statusMap[status] || status;
  }

  // Get status color for Material-UI chips
  getStatusColor(status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' {
    const colorMap: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      'QUEUED': 'info',
      'ASSIGNED': 'primary',
      'PRINTING': 'warning',
      'PRINTED': 'secondary',
      'QUALITY_CHECK': 'warning',
      'COMPLETED': 'success',
      'REPRINT_REQUIRED': 'error',
      'CANCELLED': 'default',
      'FAILED': 'error'
    };
    return colorMap[status] || 'default';
  }

  // Get priority display name
  getPriorityDisplayName(priority: string): string {
    const priorityMap: Record<string, string> = {
      'NORMAL': 'Normal',
      'HIGH': 'High',
      'URGENT': 'Urgent',
      'REPRINT': 'Reprint'
    };
    return priorityMap[priority] || priority;
  }

  // Get priority color
  getPriorityColor(priority: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' {
    const colorMap: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      'NORMAL': 'default',
      'HIGH': 'warning',
      'URGENT': 'error',
      'REPRINT': 'info'
    };
    return colorMap[priority] || 'default';
  }

  // Format date for display
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Format short date
  formatShortDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-GB', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

export default new PrintJobService(); 