/**
 * Production Biometric API Service
 * Handles communication with the backend biometric endpoints
 * 
 * Workflow:
 * 1. Frontend captures fingerprint via WebAgent
 * 2. Frontend extracts ISO 19794-2 template
 * 3. Frontend sends template to backend for storage
 * 4. Backend handles verification using stored templates
 */

import { BioMiniService } from './bioMiniService';

interface BiometricApiConfig {
  baseUrl: string;
  apiKey?: string;
}

interface FingerprintEnrollRequest {
  person_id: string;
  application_id?: string;
  finger_position: number; // 1-10 (ISO standard)
  template_base64: string;
  template_format: string;
  quality_level?: number;
  quality_score?: number;
  capture_device?: string;
  capture_software?: string;
  scanner_serial?: string;
}

interface FingerprintEnrollResponse {
  template_id: string;
  person_id: string;
  finger_position: number;
  template_format: string;
  template_size: number;
  quality_score?: number;
  template_hash: string;
  enrolled_at: string;
  message: string;
}

interface FingerprintVerifyRequest {
  template_id: string;
  probe_template_base64: string;
  application_id?: string;
  security_level?: number; // 1-7
  use_webagent_matching?: boolean;
}

interface FingerprintVerifyResponse {
  template_id: string;
  person_id: string;
  finger_position: number;
  match_found: boolean;
  match_score?: number;
  security_level: number;
  matcher_engine: string;
  verification_time_ms: number;
  message: string;
}

interface FingerprintTemplateInfo {
  template_id: string;
  person_id: string;
  finger_position: number;
  template_format: string;
  template_size: number;
  quality_score?: number;
  is_verified: boolean;
  enrolled_at: string;
  captured_by?: string;
}

interface BiometricSystemStats {
  total_templates: number;
  total_persons_enrolled: number;
  total_verifications: number;
  verifications_24h: number;
  system_status: string;
}

export class BiometricApiService {
  private config: BiometricApiConfig;
  private bioMiniService: BioMiniService;

  constructor(config: BiometricApiConfig) {
    this.config = config;
    this.bioMiniService = new BioMiniService();
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl}/api/v1/biometric${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Complete enrollment workflow: Capture → Extract → Store
   * @param personId UUID of the person
   * @param fingerPositions Array of finger positions to capture (1-10)
   * @param applicationId Optional application ID
   * @returns Array of enrollment results
   */
  async enrollFingerprints(
    personId: string,
    fingerPositions: number[],
    applicationId?: string
  ): Promise<FingerprintEnrollResponse[]> {
    console.log('🚀 Starting production fingerprint enrollment workflow...');
    console.log(`👤 Person ID: ${personId}`);
    console.log(`🖐️ Finger positions: ${fingerPositions.join(', ')}`);

    // Ensure BioMini device is initialized
    if (!this.bioMiniService.getStatus().initialized) {
      await this.bioMiniService.initializeDevice();
    }

    // Set parameters for ISO 19794-2 templates (vendor-independent)
    await this.bioMiniService.setMatcherParameters(4, 2002, false); // ISO format
    console.log('🔧 WebAgent configured for ISO 19794-2 templates');

    const results: FingerprintEnrollResponse[] = [];

    for (const fingerPosition of fingerPositions) {
      try {
        console.log(`\n📸 Capturing finger position ${fingerPosition}...`);
        
        // Step 1: Capture fingerprint via WebAgent
        const imageFile = await this.bioMiniService.captureFingerprint();
        console.log('✅ Fingerprint captured successfully');

        // Step 2: Extract ISO 19794-2 template
        const templateBase64 = await this.bioMiniService.extractTemplate(2002, 6); // ISO format, quality 6
        console.log(`🧬 Template extracted: ${templateBase64.length} characters`);

        // Step 3: Get quality score if available
        let qualityScore: number | undefined;
        try {
          // This would come from the capture metadata if available
          qualityScore = 85; // Placeholder - actual implementation would get this from WebAgent
        } catch (e) {
          console.warn('⚠️ Could not retrieve quality score');
        }

        // Step 4: Send to backend for storage
        const enrollRequest: FingerprintEnrollRequest = {
          person_id: personId,
          application_id: applicationId,
          finger_position: fingerPosition,
          template_base64: templateBase64,
          template_format: 'ISO19794-2',
          quality_level: 6,
          quality_score: qualityScore,
          capture_device: 'BioMini Slim 2',
          capture_software: 'WebAgent',
          scanner_serial: undefined // Could be retrieved from device info
        };

        const enrollResponse = await this.makeRequest<FingerprintEnrollResponse>(
          '/fingerprint/enroll',
          {
            method: 'POST',
            body: JSON.stringify(enrollRequest)
          }
        );

        console.log(`✅ Template stored successfully: ${enrollResponse.template_id}`);
        results.push(enrollResponse);

        // Small delay between captures for user experience
        if (fingerPosition !== fingerPositions[fingerPositions.length - 1]) {
          console.log('⏰ Waiting 2 seconds before next capture...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        console.error(`❌ Failed to enroll finger position ${fingerPosition}:`, error);
        throw new Error(`Failed to enroll finger position ${fingerPosition}: ${error.message}`);
      }
    }

    console.log(`🎉 Enrollment complete! ${results.length} templates stored`);
    return results;
  }

  /**
   * Verify a live fingerprint against a stored template
   * @param templateId ID of stored template to verify against
   * @param securityLevel Security level 1-7 (default: 4)
   * @param applicationId Optional application ID for audit
   * @returns Verification result
   */
  async verifyFingerprint(
    templateId: string,
    securityLevel: number = 4,
    applicationId?: string
  ): Promise<FingerprintVerifyResponse> {
    console.log('🔍 Starting production fingerprint verification...');
    console.log(`🆔 Template ID: ${templateId}`);

    // Ensure BioMini device is initialized
    if (!this.bioMiniService.getStatus().initialized) {
      await this.bioMiniService.initializeDevice();
    }

    // Set security parameters
    await this.bioMiniService.setMatcherParameters(securityLevel, 2002, false);
    console.log(`🔧 Security level set to ${securityLevel}`);

    // Capture and extract probe template
    console.log('👆 Please scan your fingerprint...');
    const imageFile = await this.bioMiniService.captureFingerprint();
    const probeTemplate = await this.bioMiniService.extractTemplate(2002, 6);
    console.log(`🧬 Probe template extracted: ${probeTemplate.length} characters`);

    // Send to backend for verification
    const verifyRequest: FingerprintVerifyRequest = {
      template_id: templateId,
      probe_template_base64: probeTemplate,
      application_id: applicationId,
      security_level: securityLevel,
      use_webagent_matching: true // Use WebAgent for now, can switch to server-side later
    };

    const verifyResponse = await this.makeRequest<FingerprintVerifyResponse>(
      '/fingerprint/verify',
      {
        method: 'POST',
        body: JSON.stringify(verifyRequest)
      }
    );

    console.log(`${verifyResponse.match_found ? '✅' : '❌'} Verification result: ${verifyResponse.match_found ? 'MATCH' : 'NO MATCH'}`);
    if (verifyResponse.match_score) {
      console.log(`📊 Match score: ${verifyResponse.match_score}`);
    }

    return verifyResponse;
  }

  /**
   * Get all fingerprint templates for a person
   * @param personId UUID of the person
   * @returns Array of template information
   */
  async getPersonTemplates(personId: string): Promise<FingerprintTemplateInfo[]> {
    return this.makeRequest<FingerprintTemplateInfo[]>(`/fingerprint/templates/${personId}`);
  }

  /**
   * Get biometric system statistics
   * @returns System statistics
   */
  async getSystemStats(): Promise<BiometricSystemStats> {
    return this.makeRequest<BiometricSystemStats>('/system/stats');
  }

  /**
   * Initialize BioMini device for production use
   */
  async initializeDevice(): Promise<void> {
    await this.bioMiniService.initializeDevice();
  }

  /**
   * Get device status
   */
  getDeviceStatus() {
    return this.bioMiniService.getStatus();
  }

  /**
   * Set API configuration
   */
  setConfig(config: Partial<BiometricApiConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Create singleton instance for the app
export const biometricApiService = new BiometricApiService({
  baseUrl: process.env.NODE_ENV === 'production' 
    ? 'https://your-backend-domain.com' 
    : 'http://localhost:8000'
});

// Export types for use in components
export type {
  FingerprintEnrollRequest,
  FingerprintEnrollResponse,
  FingerprintVerifyRequest,
  FingerprintVerifyResponse,
  FingerprintTemplateInfo,
  BiometricSystemStats
};
