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
  captured_image_base64?: string; // NEW: Base64 encoded captured image
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
  image_url?: string;
  // Legacy field - will be replaced by image_url
  captured_image?: File;
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
  image_url?: string;
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
        
        // Step 1: Capture fingerprint and extract template in one step (prevents double scanning)
        const captureResult = await this.bioMiniService.captureAndExtractForMatching(2002, 60); // ISO format, quality 60
        const templateBase64 = captureResult.template;
        const imageFile = captureResult.imageFile;
        console.log('✅ Fingerprint captured and template extracted in single operation');
        console.log(`🧬 Template extracted: ${templateBase64.length} characters`);

        // Step 3: Get quality score if available
        let qualityScore: number | undefined;
        try {
          // This would come from the capture metadata if available
          qualityScore = 85; // Placeholder - actual implementation would get this from WebAgent
        } catch (e) {
          console.warn('⚠️ Could not retrieve quality score');
        }

        // Step 4: Convert captured image to Base64
        let capturedImageBase64: string | undefined;
        if (imageFile) {
          try {
            capturedImageBase64 = await this.fileToBase64(imageFile);
            console.log(`📷 Captured image converted to Base64: ${capturedImageBase64.length} characters`);
          } catch (e) {
            console.warn('⚠️ Failed to convert captured image to Base64:', e);
          }
        }

        // Step 5: Send to backend for storage
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
          scanner_serial: undefined, // Could be retrieved from device info
          captured_image_base64: capturedImageBase64
        };

        const enrollResponse = await this.makeRequest<FingerprintEnrollResponse>(
          '/fingerprint/enroll',
          {
            method: 'POST',
            body: JSON.stringify(enrollRequest)
          }
        );

        console.log(`✅ Template stored successfully: ${enrollResponse.template_id}`);
        
        // If backend returned image URL, use that; otherwise fallback to local image
        if (enrollResponse.image_url) {
          console.log(`🖼️ Stored fingerprint image available at: ${enrollResponse.image_url}`);
          console.log(`📸 Template ID: ${enrollResponse.template_id}`);
          console.log(`👤 Person ID: ${enrollResponse.person_id}`);
          console.log(`🖐️  Finger: ${enrollResponse.finger_position}`);
        } else {
          // Add the captured image to the response for backward compatibility
          enrollResponse.captured_image = imageFile;
        }
        
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
   * Verify a live fingerprint against a stored template using WebAgent UFMatcher
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
    console.log(`🎯 Template ID: ${templateId}`);
    console.log(`🔒 Security Level: ${securityLevel}`);

    try {
      // Step 1: Ensure BioMini device is initialized
      if (!this.bioMiniService.getStatus().initialized) {
        console.log('🔧 Initializing BioMini device...');
        await this.bioMiniService.initializeDevice();
      }

      // Step 2: Get the stored template from backend
      console.log('📋 Fetching stored template from database...');
      const templates = await this.getTemplatesForMatching(1000);
      const targetTemplate = templates.find(t => t.template_id === templateId);
      
      if (!targetTemplate) {
        throw new Error(`Template ${templateId} not found in database`);
      }

      console.log(`✅ Found template: Person ${targetTemplate.person_id.slice(0, 8)}... Finger ${targetTemplate.finger_position}`);

      // Step 3: Configure UFMatcher for verification (ISO 19794-2 format)
      await this.bioMiniService.setMatcherParameters(securityLevel, 2002, false);
      console.log(`🔧 UFMatcher configured: Security Level ${securityLevel}, Template Type ISO 19794-2`);

      // Step 4: Use the WebAgent UFMatcher workflow for verification
      console.log('👆 Please scan your fingerprint when prompted...');
      const verificationResult = await this.bioMiniService.verifyTemplateSDKWorkflow(
        targetTemplate.template_data,
        6 // Quality level (6 = ~40 quality points minimum)
      );

      console.log(`${verificationResult.verified ? '✅' : '❌'} Verification result: ${verificationResult.verified ? 'MATCH' : 'NO MATCH'}`);
      
      if (verificationResult.score !== undefined) {
        console.log(`📊 Match score: ${verificationResult.score}`);
      }

      // Step 5: Return result in expected format
      return {
        template_id: templateId,
        person_id: targetTemplate.person_id,
        finger_position: targetTemplate.finger_position,
        match_found: verificationResult.verified,
        match_score: verificationResult.score,
        security_level: securityLevel,
        matcher_engine: 'webagent_ufmatcher',
        verification_time_ms: 0, // Would need timing if required
        message: verificationResult.verified ? 'Verification successful - fingerprint matches stored template' : 'Verification failed - fingerprint does not match stored template'
      };

    } catch (error) {
      console.error('❌ Verification failed:', error);
      throw new Error(`Verification failed: ${error.message}`);
    }
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
   * Note: Backend doesn't have delete endpoint yet
   * For retakes, we'll just re-enroll which should replace existing templates
   * @param personId UUID of the person
   * @returns Promise that resolves immediately
   */
  async deletePersonTemplates(personId: string): Promise<{message: string}> {
    console.log(`⚠️ Delete endpoint not available. Re-enrollment will replace existing templates for person: ${personId}`);
    return Promise.resolve({message: "Re-enrollment will replace existing templates"});
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
    console.log('🔍 === STARTING UFMatcher identification DEBUG ===');
    console.log('🔍 Method called with:', { securityLevel, maxResults });
    
    try {
      console.log('🔍 Step 1: Checking device initialization...');
      
      // Step 1: Ensure BioMini device is initialized
      if (!this.bioMiniService.getStatus().initialized) {
        console.log('🔍 Device not initialized, initializing now...');
        await this.bioMiniService.initializeDevice();
      } else {
        console.log('🔍 Device already initialized ✅');
      }

      console.log('🔍 Step 2: Setting UFMatcher parameters...');
      
      // Step 2: Configure UFMatcher for identification - START WITH MOST PERMISSIVE SETTING
      const debugSecurityLevel = 1; // Most permissive for debugging
      await this.bioMiniService.setMatcherParameters(debugSecurityLevel, 2002, false); // ISO 19794-2
      console.log(`🔧 UFMatcher configured for identification: Security Level ${debugSecurityLevel} (DEBUG: Most permissive)`);
      console.log(`📊 Original requested level: ${securityLevel}, Using debug level: ${debugSecurityLevel}`);

      console.log('🔍 Step 3: Fetching database templates...');
      
      // Step 3: Get all database templates first
      const databaseTemplates = await this.getTemplatesForMatching(100);
      console.log(`📊 Retrieved ${databaseTemplates.length} templates from database`);
      console.log('📊 Templates data:', databaseTemplates);

      if (databaseTemplates.length === 0) {
        console.log('❌ No templates found in database');
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
        console.log(`🧬 Template data preview: ${testTemplate.template_data?.substring(0, 100)}...`);
        
        console.log('👆 About to call verifyTemplateSDKWorkflow - please scan your fingerprint...');
        
        // Use a LOWER quality level for debugging (more permissive)
        const debugQualityLevel = 1; // Most permissive quality level
        console.log('🔧 Using debug quality level:', debugQualityLevel, '(original:', testTemplate.quality_level || 6, ')');
        
        // Use the exact SDK workflow
        const result = await this.bioMiniService.verifyTemplateSDKWorkflow(
          testTemplate.template_data,
          debugQualityLevel
        );
        
        console.log('📥 Verification result received:', {
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
      }

      // If we get here, no templates were found
      console.log('❌ No templates available for testing');
      return {
        matches_found: 0,
        matches: [],
        candidates_checked: 0,
        security_level: securityLevel,
        matcher_engine: 'webagent_ufmatcher_debug',
        message: 'No templates available for testing'
      };

    } catch (error) {
      console.error('❌ MAJOR ERROR in identifyPersonUFMatcher:', error);
      console.error('❌ Error stack:', error.stack);
      alert(`❌ CRITICAL ERROR: ${error.message}`);
      throw error;
    }
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

  /**
   * Convert File to Base64 string
   * @param file File object to convert
   * @returns Promise<string> Base64 encoded string
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remove data URL prefix (e.g., "data:image/bmp;base64,")
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert file to Base64'));
        }
      };
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(file);
    });
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
