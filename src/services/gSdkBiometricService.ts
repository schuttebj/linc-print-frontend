/**
 * G-SDK Server-Side Biometric Service
 * Communicates with the backend G-SDK integration for server-side fingerprint matching
 */

import { API_BASE_URL } from '../config/api';

// G-SDK API Response Interfaces
interface GSdkStatus {
  connected: boolean;
  device_id: string | null;
  device_info: string | null;
  templates_stored: number;
  gateway_ip: string;
  gateway_port: number;
  gsdk_available: boolean;
}

interface GSdkStatusResponse {
  success: boolean;
  status: GSdkStatus;
  message: string;
}

interface GSdkTemplate {
  template_id: string;
  person_id: string;
  finger_position: number;
  template_format: string;
  quality_score: number;
  enrolled_at: string;
  template_data?: string;
}

interface GSdkTemplatesResponse {
  success: boolean;
  templates: GSdkTemplate[];
  total_count: number;
  message: string;
}

interface GSdkSystemComparison {
  webagent_system: {
    name: string;
    templates_stored: number;
    storage: string;
    matching: string;
    scalability: string;
    cost: string;
    pros: string[];
    cons: string[];
  };
  gsdk_system: {
    name: string;
    templates_stored: number;
    storage: string;
    matching: string;
    scalability: string;
    cost: string;
    device_connected: boolean;
    pros: string[];
    cons: string[];
  };
  recommendation: {
    current_scale: string;
    large_scale: string;
    hybrid_approach: string;
  };
}

interface GSdkComparisonResponse {
  success: boolean;
  comparison: GSdkSystemComparison;
  message: string;
}

class GSdkBiometricService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('token');
    
    console.log('🌐 G-SDK API Request:', options.method || 'GET', `${this.baseUrl}/api/v1/gsdk-biometric${endpoint}`);
    console.log('🔧 Base URL:', this.baseUrl);
    console.log('🔑 Auth Token:', token ? 'Present' : 'Missing');

    const response = await fetch(`${this.baseUrl}/api/v1/gsdk-biometric${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    console.log('📥 Response Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ API Success:', data);
    return data;
  }

  /**
   * Get G-SDK system status
   */
  async getStatus(): Promise<GSdkStatusResponse> {
    return this.makeRequest<GSdkStatusResponse>('/status');
  }

  /**
   * Initialize G-SDK connection to gateway and device
   */
  async initialize(config: {
    gatewayIp?: string;
    gatewayPort?: number;
    deviceIp?: string;
    devicePort?: number;
  } = {}) {
    const params = new URLSearchParams();
    if (config.gatewayIp) params.append('gateway_ip', config.gatewayIp);
    if (config.gatewayPort) params.append('gateway_port', config.gatewayPort.toString());
    if (config.deviceIp) params.append('device_ip', config.deviceIp);
    if (config.devicePort) params.append('device_port', config.devicePort.toString());

    return this.makeRequest(`/initialize?${params}`, {
      method: 'POST',
    });
  }

  /**
   * Capture fingerprint using G-SDK device
   */
  async captureFingerprint(config: {
    templateFormat?: number;
    qualityThreshold?: number;
  } = {}) {
    const params = new URLSearchParams();
    if (config.templateFormat !== undefined) params.append('template_format', config.templateFormat.toString());
    if (config.qualityThreshold !== undefined) params.append('quality_threshold', config.qualityThreshold.toString());

    return this.makeRequest(`/capture?${params}`, {
      method: 'POST',
    });
  }

  /**
   * Enroll fingerprint using G-SDK server-side processing
   */
  async enrollFingerprint(config: {
    personId: string;
    fingerPosition?: number;
    templateFormat?: number;
    qualityThreshold?: number;
  }) {
    const params = new URLSearchParams();
    params.append('person_id', config.personId);
    if (config.fingerPosition !== undefined) params.append('finger_position', config.fingerPosition.toString());
    if (config.templateFormat !== undefined) params.append('template_format', config.templateFormat.toString());
    if (config.qualityThreshold !== undefined) params.append('quality_threshold', config.qualityThreshold.toString());

    return this.makeRequest(`/enroll?${params}`, {
      method: 'POST',
    });
  }

  /**
   * Verify fingerprint using G-SDK server-side matching
   */
  async verifyFingerprint(config: {
    templateId: string;
    templateFormat?: number;
    qualityThreshold?: number;
  }) {
    const params = new URLSearchParams();
    params.append('template_id', config.templateId);
    if (config.templateFormat !== undefined) params.append('template_format', config.templateFormat.toString());
    if (config.qualityThreshold !== undefined) params.append('quality_threshold', config.qualityThreshold.toString());

    return this.makeRequest(`/verify?${params}`, {
      method: 'POST',
    });
  }

  /**
   * Perform 1:N identification using G-SDK server-side matching
   */
  async identifyFingerprint(config: {
    maxResults?: number;
    templateFormat?: number;
    qualityThreshold?: number;
  } = {}) {
    const params = new URLSearchParams();
    if (config.maxResults !== undefined) params.append('max_results', config.maxResults.toString());
    if (config.templateFormat !== undefined) params.append('template_format', config.templateFormat.toString());
    if (config.qualityThreshold !== undefined) params.append('quality_threshold', config.qualityThreshold.toString());

    return this.makeRequest(`/identify?${params}`, {
      method: 'POST',
    });
  }

  /**
   * Get all templates stored in G-SDK system
   */
  async getTemplates(): Promise<GSdkTemplatesResponse> {
    return this.makeRequest<GSdkTemplatesResponse>('/templates');
  }

  /**
   * Delete a template from G-SDK system
   */
  async deleteTemplate(templateId: string) {
    return this.makeRequest(`/templates/${templateId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Disconnect from G-SDK device and gateway
   */
  async disconnect() {
    return this.makeRequest('/disconnect', {
      method: 'POST',
    });
  }

  /**
   * Compare WebAgent vs G-SDK system performance
   */
  async compareSystems(): Promise<GSdkComparisonResponse> {
    return this.makeRequest<GSdkComparisonResponse>('/compare/systems');
  }

  /**
   * Clear G-SDK template cache (for testing)
   */
  async clearCache() {
    return this.makeRequest('/admin/clear-cache', {
      method: 'POST',
    });
  }
}

// Export singleton instance
export const gSdkBiometricService = new GSdkBiometricService();
export default gSdkBiometricService;
