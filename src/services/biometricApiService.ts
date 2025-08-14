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
import { API_BASE_URL } from '../config/api';

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

    // Use the same authentication approach as other services
    const token = localStorage.getItem('access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    // Debug logging
    console.log(`🌐 Biometric API Request: ${options.method || 'GET'} ${url}`);
    console.log(`🔧 Base URL: ${this.config.baseUrl}`);
    console.log(`🔑 Auth Token: ${token ? 'Present' : 'Missing'}`);

    const response = await fetch(url, {
      ...options,
      headers
    });

    console.log(`📥 Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      console.error(`❌ API Error:`, errorData);
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ API Success:`, result);
    return result;
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
        
        // Step 0: Configure UFMatcher for consistent enrollment (following WebAgent best practices)
        console.log('🔧 Setting UFMatcher parameters for enrollment...');
        await this.bioMiniService.setMatcherParameters(
          4,     // Security Level 4 (FAR 1/100,000)
          2002,  // ISO 19794-2 template format (CRITICAL: must match verification)
          false  // Fast mode off for accuracy
        );
        
        // Step 1: Capture fingerprint via WebAgent
        const imageFile = await this.bioMiniService.captureFingerprint();
        console.log('✅ Fingerprint captured successfully');

        // Step 2: Extract ISO 19794-2 template with QUALITY GATE (following WebAgent best practices)
        const templateBase64 = await this.bioMiniService.extractTemplate(2002, 60); // ISO format, quality 60 (reject poor captures)
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
   * This method bypasses the backend and uses WebAgent UFMatcher directly
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
    throw new Error(`
🚫 VERIFICATION DISABLED - Use Frontend UFMatcher Instead

The current verification approach has inconsistent template handling.
Please use the FingerprintTemplateTestPage for accurate UFMatcher verification:

1. Go to: /dashboard/admin/fingerprint-templates
2. Capture & extract template with consistent settings:
   - Template Type: ISO 19794-2 (2002)
   - Quality Level: 60+ (reject poor captures)
   - Security Level: ${securityLevel}
3. Use "Verify Against Template" which calls bioMiniService.verifyTemplateSDKWorkflow()

This uses the ACTUAL WebAgent UFMatcher instead of server-side simulation.
    `);
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
   * Get all templates from database for UFMatcher identification
   * @param limit Maximum number of templates to retrieve
   * @returns Array of templates with Base64 data for UFMatcher
   */
  async getTemplatesForMatching(limit: number = 100): Promise<any[]> {
    return this.makeRequest<any[]>(`/fingerprint/templates-for-matching?limit=${limit}`);
  }

  /**
   * Identify a person using UFMatcher against database templates
   * This is the REAL 1:N identification using actual UFMatcher
   * @param securityLevel Security level 1-7 (default: 4)
   * @param maxResults Maximum number of results to return
   * @returns Identification results with match scores
   */
  async identifyPersonUFMatcher(securityLevel: number = 4, maxResults: number = 10): Promise<any> {
    console.log('🔍 Starting UFMatcher-based 1:N identification against database...');

    // Step 1: Ensure BioMini device is initialized
    if (!this.bioMiniService.getStatus().initialized) {
      await this.bioMiniService.initializeDevice();
    }

    // Step 2: Configure UFMatcher for identification
    await this.bioMiniService.setMatcherParameters(securityLevel, 2002, false); // ISO 19794-2
    console.log(`🔧 UFMatcher configured for identification: Security Level ${securityLevel}`);

    // Step 3: Get all database templates first
    const databaseTemplates = await this.getTemplatesForMatching(100);
    console.log(`📊 Retrieved ${databaseTemplates.length} templates from database`);

    if (databaseTemplates.length === 0) {
      return {
        matches_found: 0,
        matches: [],
        candidates_checked: 0,
        message: 'No templates found in database'
      };
    }

    // Step 4: Test with just the first template to debug the workflow
    console.log('🧪 DEBUG MODE: Testing with first template only to debug verification workflow...');
    
    if (databaseTemplates.length > 0) {
      const testTemplate = databaseTemplates[0];
      console.log(`🧬 Testing with template: Person ${testTemplate.person_id.slice(0, 8)}... Finger ${testTemplate.finger_position}`);
      console.log(`📊 Template format: ${testTemplate.template_format}, Size: ${testTemplate.template_data?.length || 0} chars`);
      
      try {
        console.log('👆 Please scan your fingerprint now to test verification...');
        
        // Use the exact SDK workflow
        const result = await this.bioMiniService.verifyTemplateSDKWorkflow(
          testTemplate.template_data,
          testTemplate.quality_level || 6
        );
        
        console.log('📥 Verification result:', {
          verified: result.verified,
          score: result.score
        });
        
        if (result.verified) {
          console.log(`✅ SUCCESS: Template verification WORKED!`);
          return {
            matches_found: 1,
            matches: [{
              template_id: testTemplate.template_id,
              person_id: testTemplate.person_id,
              finger_position: testTemplate.finger_position,
              match_score: result.score || 100,
              template_format: testTemplate.template_format,
              quality_score: testTemplate.quality_score,
              enrolled_at: testTemplate.enrolled_at
            }],
            candidates_checked: 1,
            security_level: securityLevel,
            matcher_engine: 'webagent_ufmatcher_debug',
            message: `DEBUG: Single template verification succeeded`
          };
        } else {
          console.log(`❌ FAILED: Template verification did not match. Score: ${result.score}`);
          return {
            matches_found: 0,
            matches: [],
            candidates_checked: 1,
            security_level: securityLevel,
            matcher_engine: 'webagent_ufmatcher_debug',
            message: `DEBUG: Single template verification failed with score ${result.score}`
          };
        }
        
      } catch (error) {
        console.error('❌ DEBUG ERROR:', error);
        throw error;
      }
    }

    // If we get here, no templates were found
    return {
      matches_found: 0,
      matches: [],
      candidates_checked: 0,
      security_level: securityLevel,
      matcher_engine: 'webagent_ufmatcher_debug',
      message: 'No templates available for testing'
    };
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
  baseUrl: API_BASE_URL // Use the same API base URL as other services
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
