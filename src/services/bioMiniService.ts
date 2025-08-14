/**
 * BioMini Web Agent Service
 * 
 * Service for integrating with Suprema BioMini Web Agent
 * Provides fingerprint capture functionality for React components
 */

// Use Vite proxy in development, LINC BioMini Proxy in production
// In development, use Vite proxy. In production, use our CORS proxy.
const WEB_AGENT_URL = import.meta.env.DEV ? '/biomini' : 'http://127.0.0.1:8891';

export interface BioMiniDeviceInfo {
  ID?: string;
  ScannerType?: string;
  Serial?: string;
  DeviceHandle: number | string; // API returns number
  DeviceIndex?: number;
  ScannerName?: string; // API uses ScannerName (capital N)
  DeviceType?: string;
}

export interface BioMiniResponse {
  retValue: number | string; // API returns string "0" for success
  retString?: string;
  data?: string;
  ScannerInfos?: BioMiniDeviceInfo[];
  quality?: number;
  captureEnd?: boolean;
  IsFingerOn?: boolean;
  lfdScore?: number;
  ScannerCount?: number;
  sessionId?: string;
  imageBase64?: string;
  templateBase64?: string; // For template data
  retVerify?: boolean | string; // For verify results
  matchedIndex?: number; // For identify results
  matchedID?: string; // For identify results
  verifySucceed?: boolean; // For file verification
  score?: number; // Verification score
  unsupportedVariables?: string; // For setParameters response
}

export interface BioMiniServiceStatus {
  available: boolean;
  initialized: boolean;
  devices: BioMiniDeviceInfo[];
  error?: string;
}

class BioMiniService {
  private status: BioMiniServiceStatus = {
    available: false,
    initialized: false,
    devices: []
  };
  private sessionId: string = '';
  private pageId: string = '';
  private deviceHandle: string = '';
  private sessionInitialized: boolean = false;

  constructor() {
    // Generate unique page ID for session management
    this.pageId = '0'; // Sample UI uses '0'
  }

  /**
   * Initialize session like the working BiominiWebAgent.js
   */
  private async initializeSession(): Promise<void> {
    if (this.sessionInitialized) return;

    try {
      console.log('🔄 Initializing BioMini session...');
      
      // Create session ID like BiominiWebAgent.js line 775
      const sessionUrl = `${WEB_AGENT_URL}/api/createSessionID?dummy=${this.getDummyParam()}`;
      const sessionResponse = await fetch(sessionUrl, { method: 'GET' });
      const sessionResult: BioMiniResponse = await sessionResponse.json();
      
      if (sessionResult.sessionId) {
        this.sessionId = sessionResult.sessionId;
        console.log('✅ Session created:', this.sessionId);
        
        // Set cookie like the working sample
        const expires = new Date();
        expires.setTime(Date.now() + 1000 * 60 * 60); // 1 hour
        document.cookie = `username=${this.sessionId}; expires=${expires.toUTCString()}`;
      }
      
      this.sessionInitialized = true;
    } catch (error) {
      console.warn('⚠️ Session initialization failed, continuing without session:', error);
      this.sessionInitialized = true; // Continue anyway
    }
  }

  /**
   * Generate cache busting parameter (like the real sample UI)
   */
  private getDummyParam(): string {
    return Math.random().toString();
  }

  /**
   * Check if API response indicates success
   * Handles both string "0" and number 0 return values
   */
  private isApiSuccess(retValue: number | string): boolean {
    return retValue === 0 || retValue === "0";
  }

  /**
   * Check if the BioMini Web Agent is running and accessible
   * Uses REAL endpoints discovered from network capture
   */
  async checkWebAgentConnection(): Promise<boolean> {
    try {
      // Test the root endpoint (we know this works)
      const response = await fetch(`${WEB_AGENT_URL}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      
      this.status.available = response.ok;
      if (response.ok) {
        console.log('BioMini Web Agent connection confirmed');
      }
      return response.ok;
    } catch (error) {
      console.log('BioMini Web Agent not available:', error);
      this.status.available = false;
      this.status.error = 'Web Agent not running';
      return false;
    }
  }

  /**
   * Initialize the BioMini device
   * Uses CORRECT API pattern from BiominiWebAgent.js line 84: /api/initDevice
   */
  async initializeDevice(): Promise<boolean> {
    if (!this.status.available) {
      const isAvailable = await this.checkWebAgentConnection();
      if (!isAvailable) {
        throw new Error('BioMini Web Agent is not running. Please start BioMiniWebAgent.exe');
      }
    }

    try {
      // Initialize session first like the working sample
      await this.initializeSession();
      
      // Use CORRECT endpoint pattern from BiominiWebAgent.js
      const url = `${WEB_AGENT_URL}/api/initDevice?dummy=${this.getDummyParam()}`;
      const response = await fetch(url, {
        method: 'GET'
      });
      const result: BioMiniResponse = await response.json();

      // Check for success - API returns string "0" or number 0
      const isSuccess = this.isApiSuccess(result.retValue);
      
      if (isSuccess) {
        this.status.initialized = true;
        this.status.error = undefined;
        
        console.log('✅ Device initialization response:', result);
        
        // Store device info from initialization response
        if (result.ScannerInfos && result.ScannerInfos.length > 0) {
          this.status.devices = result.ScannerInfos;
          // Store device handle (DeviceHandle property from BiominiWebAgent.js line 503)
          this.deviceHandle = String(result.ScannerInfos[0].DeviceHandle);
          console.log('✅ Device initialized successfully');
          console.log('📱 Device handle:', this.deviceHandle);
          console.log('🔧 Device type:', result.ScannerInfos[0].DeviceType);
          console.log('📇 Scanner name:', result.ScannerInfos[0].ScannerName);
        }
        
        return true;
      } else {
        console.error('❌ Device initialization failed:', result);
        throw new Error(result.retString || 'Device initialization failed');
      }
    } catch (error) {
      this.status.initialized = false;
      this.status.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  /**
   * Get list of connected BioMini scanners
   * @deprecated This API is not supported by BioMiniWebAgent - use getAvailableDevices() instead
   */
  async getScannerList(): Promise<BioMiniDeviceInfo[]> {
    console.warn('⚠️  getScannerList() is deprecated - BioMiniWebAgent returns "Unsupported API". Use getAvailableDevices() instead.');
    
    try {
      // Add dummy parameter like all other API calls
      const url = `${WEB_AGENT_URL}/api/getScannerList?dummy=${this.getDummyParam()}`;
      const response = await fetch(url, {
        method: 'GET'
      });
      const result: BioMiniResponse = await response.json();

      if (this.isApiSuccess(result.retValue) && result.ScannerInfos) {
        this.status.devices = result.ScannerInfos;
        return result.ScannerInfos;
      } else {
        this.status.devices = [];
        return [];
      }
    } catch (error) {
      console.error('Failed to get scanner list:', error);
      this.status.devices = [];
      return [];
    }
  }

  /**
   * Capture a single fingerprint and return as File object
   * FIXED: Uses EXACT API implementation from BiominiWebAgent.js
   * 1. GET to /api/captureSingle?dummy=X&sHandle=Y&id=Z&resetTimer=30000
   * 2. Poll /api/getCaptureEnd?dummy=X&sHandle=Y&id=Z until captureEnd: true  
   * 3. Get image from /img/CaptureImg.bmp?dummy=X&shandle=Y&id=Z
   */
  async captureFingerprint(abortSignal?: AbortSignal): Promise<File> {
    if (!this.status.initialized || !this.deviceHandle) {
      throw new Error('Device not initialized. Call initializeDevice() first.');
    }

    try {
      console.log('🔄 Starting fingerprint capture...');
      console.log('📱 Device handle:', this.deviceHandle);
      console.log('🆔 Page ID:', this.pageId);
      console.log('🔐 Session ID:', this.sessionId);
      console.log('🍪 Current cookies:', document.cookie);

      // Step 1: Start capture - EXACT URL like BiominiWebAgent.js line 500
      const captureUrl = `${WEB_AGENT_URL}/api/captureSingle?dummy=${this.getDummyParam()}&sHandle=${this.deviceHandle}&id=${this.pageId}&resetTimer=30000`;
      console.log('📡 Capture URL:', captureUrl);

      const captureResponse = await fetch(captureUrl, { 
        method: 'GET',
        signal: abortSignal
      });
      const captureResult: BioMiniResponse = await captureResponse.json();

      console.log('📥 Capture API response:', captureResult);

      if (!this.isApiSuccess(captureResult.retValue)) {
        throw new Error(captureResult.retString || 'Fingerprint capture failed');
      }

      console.log('✅ Capture started successfully, polling for completion...');

      // Step 2: Poll /api/getCaptureEnd - EXACT pattern like BiominiWebAgent.js line 576
      let captureComplete = false;
      let attempts = 0;
      const maxAttempts = 60; // Match the sample UI limit (BiominiWebAgent.js line 615)

      while (!captureComplete && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second intervals
        
        const checkUrl = `${WEB_AGENT_URL}/api/getCaptureEnd?dummy=${this.getDummyParam()}&sHandle=${this.deviceHandle}&id=${this.pageId}`;
        
        try {
          const checkResponse = await fetch(checkUrl, { method: 'GET' });
          const checkResult: BioMiniResponse = await checkResponse.json();
          
          console.log(`📊 Poll ${attempts + 1}:`, checkResult);
          
          // Check for captureEnd property (like BiominiWebAgent.js line 585)
          if (checkResult.captureEnd === true) {
            captureComplete = true;
            console.log('🎉 Capture completed successfully!');
            if (checkResult.lfdScore) {
              console.log('🔍 LFD Score:', checkResult.lfdScore);
            }
            break; // Exit polling loop immediately
          } else {
            console.log(`⏳ Poll ${attempts + 1}: Still capturing... (captureEnd: ${checkResult.captureEnd})`);
          }
        } catch (error) {
          console.log(`❌ Poll ${attempts + 1} failed:`, error);
        }
        
        attempts++;
      }

      if (!captureComplete) {
        throw new Error('Capture timeout - please place finger firmly on scanner and try again');
      }

      // Step 3A: IMMEDIATE image fetch while session is still hot (critical timing!)
      console.log('⚡ Attempting IMMEDIATE image fetch (timing critical)...');
      try {
        const immediateImageUrl = `${WEB_AGENT_URL}/img/CaptureImg.bmp?dummy=${this.getDummyParam()}&shandle=${this.deviceHandle}&id=${this.pageId}`;
        console.log('🖼️ Immediate image URL:', immediateImageUrl);
        
        const immediateResponse = await fetch(immediateImageUrl, { 
          method: 'GET',
          headers: { 'Accept': 'image/bmp,image/*,*/*' }
        });
        
        console.log('📥 Immediate response:', immediateResponse.status, immediateResponse.statusText);
        
        if (immediateResponse.ok) {
          const immediateBlob = await immediateResponse.blob();
          console.log('📊 Immediate blob size:', immediateBlob.size, 'bytes');
          
          if (immediateBlob.size > 0) {
            const fingerprintFile = new File([immediateBlob], `fingerprint_${Date.now()}.bmp`, {
              type: 'image/bmp'
            });
            
            console.log(`✅ IMMEDIATE SUCCESS! Fingerprint: ${fingerprintFile.size} bytes`);
            return fingerprintFile; // Success - return immediately!
          }
        }
      } catch (immediateError) {
        console.log('❌ Immediate fetch failed:', immediateError.message);
      }

          // Step 3B: Fallback methods if immediate fetch failed
    console.log('🔄 Immediate fetch failed, trying fallback methods...');
    
    // Get image - EXACT URL like BiominiWebAgent.js line 604 
    // NOTE: Uses 'shandle' (not 'sHandle') in image URL
    const imageUrl = `${WEB_AGENT_URL}/img/CaptureImg.bmp?dummy=${this.getDummyParam()}&shandle=${this.deviceHandle}&id=${this.pageId}`;
    console.log('🖼️ Fallback image URL:', imageUrl);
    console.log('🌐 Full image URL for proxy:', imageUrl);
    
    let imageResponse: Response;
    
    try {
      imageResponse = await fetch(imageUrl, { 
        method: 'GET',
        headers: {
          'Accept': 'image/bmp,image/*,*/*',
        }
      });
      
      console.log('📥 Image response status:', imageResponse.status, imageResponse.statusText);
      console.log('📊 Image response headers:', Object.fromEntries(imageResponse.headers.entries()));
      
      if (!imageResponse.ok) {
        throw new Error(`Failed to retrieve fingerprint image: ${imageResponse.status} ${imageResponse.statusText}`);
      }
    } catch (imageError) {
      console.error('❌ Proxy image fetch failed with error:', imageError);
      throw new Error(`Proxy image fetch failed: ${imageError.message}. Check that both AgentCtrl_x64.exe and biomini-proxy are running.`);
    }

      // Convert response to blob, then to File
      const imageBlob = await imageResponse.blob();
      console.log('📊 Image blob size:', imageBlob.size, 'bytes');
      
      const fingerprintFile = new File([imageBlob], `fingerprint_${Date.now()}.bmp`, {
        type: 'image/bmp'
      });

      console.log(`✅ Fingerprint captured successfully: ${fingerprintFile.size} bytes`);
      console.log('📁 File details:', {
        name: fingerprintFile.name,
        size: fingerprintFile.size,
        type: fingerprintFile.type
      });
      
      return fingerprintFile;
    } catch (error) {
      console.error('❌ Fingerprint capture failed:', error);
      throw error;
    }
  }

  /**
   * Load image via img element (like BiominiWebAgent.js) - fallback for CORS issues
   */
  private async loadImageViaElement(imageUrl: string): Promise<Response> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Try to handle CORS
      
      img.onload = () => {
        try {
          // Create canvas and draw image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }
          
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          // Convert canvas to blob
          canvas.toBlob((blob) => {
            if (blob) {
              // Create a mock Response object from the blob
              const response = new Response(blob, {
                status: 200,
                statusText: 'OK',
                headers: {
                  'Content-Type': 'image/bmp'
                }
              });
              resolve(response);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          }, 'image/bmp');
        } catch (canvasError) {
          reject(new Error(`Canvas processing failed: ${canvasError.message}`));
        }
      };
      
      img.onerror = () => {
        reject(new Error(`Image failed to load: ${imageUrl}`));
      };
      
      // Set src to trigger loading
      img.src = imageUrl;
    });
  }

  /**
   * Convert base64 string to File object
   */
  private base64ToFile(base64: string, filename: string, mimeType: string = 'image/bmp'): File {
    // Remove data URL prefix if present
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    
    const binaryData = atob(base64Data);
    const bytes = new Uint8Array(binaryData.length);

    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
  }

  /**
   * Get fingerprint template data (for advanced use cases)
   */
  async getFingerprintTemplate(): Promise<string> {
    try {
      const url = `${WEB_AGENT_URL}/api/getTemplateData?dummy=${this.getDummyParam()}`;
      const response = await fetch(url, {
        method: 'POST'
      });
      const result: BioMiniResponse = await response.json();

      if (this.isApiSuccess(result.retValue) && result.data) {
        return result.data;
      } else {
        throw new Error(result.retString || 'Failed to get template data');
      }
    } catch (error) {
      console.error('Failed to get template data:', error);
      throw error;
    }
  }

  /**
   * Start live preview (for preview mode)
   */
  async startLivePreview(): Promise<boolean> {
    try {
      const url = `${WEB_AGENT_URL}/api/startCapturing?dummy=${this.getDummyParam()}`;
      const response = await fetch(url, {
        method: 'POST'
      });
      const result: BioMiniResponse = await response.json();

      return this.isApiSuccess(result.retValue);
    } catch (error) {
      console.error('Failed to start live preview:', error);
      return false;
    }
  }

  /**
   * Stop capturing
   */
  async stopCapture(): Promise<boolean> {
    try {
      const url = `${WEB_AGENT_URL}/api/abortCapturing?dummy=${this.getDummyParam()}`;
      const response = await fetch(url, {
        method: 'POST'
      });
      const result: BioMiniResponse = await response.json();

      return this.isApiSuccess(result.retValue);
    } catch (error) {
      console.error('Failed to stop capture:', error);
      return false;
    }
  }

  /**
   * Uninitialize the device
   * Uses REAL endpoint pattern (if it exists)
   */
  async uninitializeDevice(): Promise<boolean> {
    try {
      // Try the real endpoint pattern (though this wasn't in your network capture)
      const url = `${WEB_AGENT_URL}/uninitDevice?dummy=${this.getDummyParam()}`;
      const response = await fetch(url, {
        method: 'GET'
      });
      const result: BioMiniResponse = await response.json();

      if (this.isApiSuccess(result.retValue)) {
        this.status.initialized = false;
        this.status.devices = [];
        this.deviceHandle = '';
        console.log('Device uninitialized successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to uninitialize device:', error);
      // Don't throw - just reset our state
      this.status.initialized = false;
      this.status.devices = [];
      this.deviceHandle = '';
      return false;
    }
  }

  /**
   * Get current service status
   */
  getStatus(): BioMiniServiceStatus {
    return { ...this.status };
  }

  /**
   * Check if device is ready for capture
   */
  isReady(): boolean {
    return this.status.available && this.status.initialized && this.status.devices.length > 0;
  }

  /**
   * Get devices discovered during initialization
   * This replaces getScannerList() which is not supported
   */
  getAvailableDevices(): BioMiniDeviceInfo[] {
    return [...this.status.devices];
  }

  /**
   * Extract template data from the last captured fingerprint
   * @param templateType Template format (2001: XPERIX, 2002: ISO_19794_2, 2003: ANSI378)
   * @param qualityLevel Quality threshold (1-11, where 6=40 quality points)
   * @param encrypt Whether to encrypt the template
   * @param encryptKey Encryption key (if encrypt is true)
   */
  async extractTemplate(templateType: number = 2001, qualityLevel: number = 6, encrypt: boolean = false, encryptKey: string = ''): Promise<string> {
    if (!this.status.initialized || !this.deviceHandle) {
      throw new Error('Device not initialized. Call initializeDevice() first.');
    }

    try {
      console.log('🧬 Extracting fingerprint template...');
      console.log(`🔧 Template type: ${templateType} (${templateType === 2001 ? 'XPERIX' : templateType === 2002 ? 'ISO_19794_2' : 'ANSI378'})`);
      
      const url = `${WEB_AGENT_URL}/api/getTemplateData?dummy=${this.getDummyParam()}`;
      const params = new URLSearchParams({
        sHandle: this.deviceHandle,
        id: this.pageId,
        encrypt: encrypt.toString(),
        encryptKey: encryptKey,
        extractEx: 'false', // Use standard extraction
        qualityLevel: qualityLevel.toString(),
        templateType: templateType.toString() // Add template type parameter
      });

      const response = await fetch(`${url}&${params}`, { method: 'GET' });
      const result: BioMiniResponse = await response.json();

      console.log('📥 Template extraction API response:', {
        retValue: result.retValue,
        retString: result.retString,
        templateBase64Length: result.templateBase64?.length || 0
      });

      if (this.isApiSuccess(result.retValue) && result.templateBase64) {
        console.log('✅ Template extracted successfully');
        console.log(`📊 Template length: ${result.templateBase64.length} characters`);
        console.log(`🔧 Template type: ${templateType === 2001 ? 'XPERIX' : templateType === 2002 ? 'ISO_19794_2' : 'ANSI378'}`);
        console.log(`🧬 Template preview: ${result.templateBase64.substring(0, 50)}...`);
        return result.templateBase64;
      } else {
        console.error('❌ Template extraction failed:', result.retString);
        throw new Error(result.retString || 'Template extraction failed');
      }
    } catch (error) {
      console.error('❌ Template extraction error:', error);
      throw error;
    }
  }

  /**
   * Verify a template against the currently captured fingerprint
   * @param templateData Base64 encoded template data
   * @param qualityLevel Quality threshold (1-11)
   * @param encrypt Whether the template is encrypted
   * @param encryptKey Encryption key (if encrypted)
   */
  async verifyTemplate(templateData: string, qualityLevel: number = 6, templateType: number = 2001, encrypt: boolean = false, encryptKey: string = ''): Promise<{verified: boolean, score?: number}> {
    if (!this.status.initialized || !this.deviceHandle) {
      throw new Error('Device not initialized. Call initializeDevice() first.');
    }

    try {
      console.log('🔍 Verifying template against captured fingerprint...');
      console.log(`📊 Template length: ${templateData.length} characters`);
      console.log(`🎯 Quality level: ${qualityLevel}`);
      console.log(`🔧 Template type: ${templateType} (${templateType === 2001 ? 'XPERIX' : templateType === 2002 ? 'ISO_19794_2' : 'ANSI378'})`);
      
      const url = `${WEB_AGENT_URL}/db/verifyTemplate?dummy=${this.getDummyParam()}`;
      const params = new URLSearchParams({
        sHandle: this.deviceHandle,
        id: this.pageId,
        tempLen: templateData.length.toString(),
        tempData: templateData,
        encrypt: encrypt.toString(),
        encryptKey: encryptKey,
        extractEx: 'false',
        qualityLevel: qualityLevel.toString(),
        templateType: templateType.toString() // Add template type parameter
      });

      console.log(`🌐 Verification URL: ${url}&${params.toString()}`);

      const response = await fetch(`${url}&${params}`, { method: 'GET' });
      const result: BioMiniResponse = await response.json();

      console.log('📥 Verification API response:', {
        retValue: result.retValue,
        retString: result.retString,
        retVerify: result.retVerify,
        score: result.score
      });

      if (this.isApiSuccess(result.retValue)) {
        const verified = result.retVerify === true || 
                        result.retVerify === 'true' || 
                        result.retVerify === 'True' ||
                        result.retVerify === 'Success'; // CRITICAL FIX: WebAgent returns 'Success' for match
        console.log(`${verified ? '✅' : '❌'} Template verification: ${verified ? 'MATCH' : 'NO MATCH'}`);
        console.log(`🔍 Raw retVerify value: "${result.retVerify}" (type: ${typeof result.retVerify})`);
        
        if (result.score !== undefined) {
          console.log(`📊 Verification score: ${result.score}`);
        }
        
        return {
          verified,
          score: result.score
        };
      } else {
        console.error('❌ Verification API failed:', result.retString);
        throw new Error(result.retString || 'Template verification failed');
      }
    } catch (error) {
      console.error('❌ Template verification error:', error);
      throw error;
    }
  }

  /**
   * Set BioMini UFMatcher parameters including security level
   * @param securityLevel Security level 1-7 (1=FAR 1/100, 4=1/100,000, 7=1/100,000,000)
   * @param templateType Template type (2001=XPERIX, 2002=ISO, 2003=ANSI)
   * @param fastMode Enable fast mode for quicker matching
   */
  async setMatcherParameters(securityLevel: number = 4, templateType: number = 2001, fastMode: boolean = false): Promise<boolean> {
    if (!this.status.initialized || !this.deviceHandle) {
      throw new Error('Device not initialized. Call initializeDevice() first.');
    }

    try {
      console.log('🔧 Setting UFMatcher parameters...');
      console.log(`📊 Security Level: ${securityLevel} (FAR: 1/${Math.pow(10, securityLevel + 1)})`);
      console.log(`🧬 Template Type: ${templateType}`);
      console.log(`⚡ Fast Mode: ${fastMode}`);

      const url = `${WEB_AGENT_URL}/api/setParameters?dummy=${this.getDummyParam()}`;
      const params = new URLSearchParams({
        sHandle: this.deviceHandle,
        securitylevel: securityLevel.toString(),
        templateType: templateType.toString(),
        fastmode: fastMode ? '1' : '0',
        brightness: '-1', // Use default
        sensitivity: '-1', // Use default  
        timeout: '-1', // Use default
        fakeLevel: '0', // Use default
        detectFakeAdvancedMode: '0' // Use default
      });

      const response = await fetch(`${url}&${params}`, { method: 'GET' });
      const result: BioMiniResponse = await response.json();

      if (this.isApiSuccess(result.retValue)) {
        console.log('✅ UFMatcher parameters set successfully');
        if (result.unsupportedVariables) {
          console.warn('⚠️ Some parameters not supported:', result.unsupportedVariables);
        }
        return true;
      } else {
        console.error('❌ Failed to set UFMatcher parameters:', result.retString);
        throw new Error(result.retString || 'Failed to set matcher parameters');
      }

    } catch (error) {
      console.error('❌ Set matcher parameters error:', error);
      throw error;
    }
  }

  /**
   * Capture fingerprint using captureSingle and IMMEDIATELY verify with UFMatcher
   * This ensures the captured fingerprint is in the buffer when verification runs
   * @param templateData Base64 encoded template to verify against
   * @param qualityLevel Quality threshold (1-11)
   * @param abortSignal Optional abort signal for cancellation
   */
  async captureAndVerifyWithUFMatcher(templateData: string, qualityLevel: number = 6, abortSignal?: AbortSignal): Promise<{verified: boolean, score?: number, imageFile?: File}> {
    if (!this.status.initialized || !this.deviceHandle) {
      throw new Error('Device not initialized. Call initializeDevice() first.');
    }

    try {
      console.log('🔍 Starting UFMatcher-based verification with proper workflow...');
      
      // Step 1: Capture fingerprint using captureSingle API (this puts fingerprint in capture buffer)
      console.log('👆 Calling captureSingle to capture fingerprint into buffer...');
      const captureUrl = `${WEB_AGENT_URL}/api/captureSingle?dummy=${this.getDummyParam()}`;
      const captureParams = new URLSearchParams({
        sHandle: this.deviceHandle,
        id: this.pageId,
        resetTimer: '30000' // Keep fingerprint in buffer for 30 seconds
      });

      const captureResponse = await fetch(`${captureUrl}&${captureParams}`, { 
        method: 'GET',
        signal: abortSignal 
      });
      const captureResult: BioMiniResponse = await captureResponse.json();

      if (!this.isApiSuccess(captureResult.retValue)) {
        throw new Error(captureResult.retString || 'Fingerprint capture failed');
      }
      console.log('✅ Fingerprint captured and stored in device buffer');

      // Step 2: IMMEDIATELY call verifyTemplate while fingerprint is in buffer
      console.log('🧬 Immediately calling UFMatcher verifyTemplate while fingerprint is in buffer...');
      const verifyUrl = `${WEB_AGENT_URL}/db/verifyTemplate?dummy=${this.getDummyParam()}`;
      const verifyParams = new URLSearchParams({
        sHandle: this.deviceHandle,
        id: this.pageId,
        tempLen: templateData.length.toString(),
        tempData: templateData,
        encrypt: 'false',
        encryptKey: '',
        extractEx: 'false',
        qualityLevel: qualityLevel.toString()
      });

      const verifyResponse = await fetch(`${verifyUrl}&${verifyParams}`, { 
        method: 'GET',
        signal: abortSignal 
      });
      const verifyResult: BioMiniResponse = await verifyResponse.json();

      console.log('📥 UFMatcher verification response:', {
        retValue: verifyResult.retValue,
        retString: verifyResult.retString,
        retVerify: verifyResult.retVerify,
        score: verifyResult.score
      });

      // Step 3: Get the captured image from buffer
      console.log('📸 Getting captured image from buffer...');
      const imageUrl = `${WEB_AGENT_URL}/img/CaptureImg.bmp?dummy=${this.getDummyParam()}&sHandle=${this.deviceHandle}&id=${this.pageId}`;
      let imageFile: File | undefined;
      
      try {
        const imageResponse = await fetch(imageUrl, { signal: abortSignal });
        if (imageResponse.ok) {
          const imageBlob = await imageResponse.blob();
          if (imageBlob.size > 100) { // Only if we got a real image, not placeholder
            imageFile = new File([imageBlob], 'fingerprint.bmp', { type: 'image/bmp' });
          }
        }
      } catch (imageError) {
        console.warn('⚠️ Could not retrieve captured image:', imageError);
      }

      if (this.isApiSuccess(verifyResult.retValue)) {
        const verified = verifyResult.retVerify === true || 
                        verifyResult.retVerify === 'true' || 
                        verifyResult.retVerify === 'True' ||
                        verifyResult.retVerify === 'Success'; // CRITICAL FIX: WebAgent returns 'Success' for match
        console.log(`${verified ? '✅' : '❌'} UFMatcher result: ${verified ? 'MATCH' : 'NO MATCH'}`);
        console.log(`🔍 Raw retVerify value: "${verifyResult.retVerify}" (type: ${typeof verifyResult.retVerify})`);
        
        return {
          verified,
          score: verifyResult.score,
          imageFile
        };
      } else {
        console.error('❌ UFMatcher verification failed:', verifyResult.retString);
        throw new Error(verifyResult.retString || 'UFMatcher verification failed');
      }

    } catch (error) {
      console.error('❌ UFMatcher verification error:', error);
      throw error;
    }
  }

  /**
   * Use the EXACT workflow from the SDK documentation - just like the sample VerifyWithTemplate() function
   * This calls captureSingle then immediately verifyTemplate while fingerprint is in device buffer
   * @param templateData Base64 encoded template to verify against
   * @param qualityLevel Quality threshold (1-11)
   * @param abortSignal Optional abort signal for cancellation
   */
  async verifyTemplateSDKWorkflow(templateData: string, qualityLevel: number = 6, abortSignal?: AbortSignal): Promise<{verified: boolean, score?: number}> {
    if (!this.status.initialized || !this.deviceHandle) {
      throw new Error('Device not initialized. Call initializeDevice() first.');
    }

    try {
      console.log('🔍 Using EXACT SDK workflow: VerifyWithTemplate...');
      console.log('📋 Template data length:', templateData.length);
      
      // This is the EXACT workflow from BiominiWebAgent.js VerifyWithTemplate() function:
      // 1. Call verifyTemplate API directly (assumes user will scan when prompted)
      // 2. The API internally handles the capture and verification
      
      const url = `${WEB_AGENT_URL}/db/verifyTemplate?dummy=${this.getDummyParam()}`;
      const params = new URLSearchParams({
        sHandle: this.deviceHandle,
        id: this.pageId,
        tempLen: templateData.length.toString(),
        tempData: templateData,
        encrypt: 'false',         // cb_EncryptOpt
        encryptKey: '',           // txt_EncryptKey
        extractEx: 'false',       // cb_ExtractExMode
        qualityLevel: qualityLevel.toString()
        // Note: templateType is NOT sent here - it's set via setParameters first
      });

      console.log('🧬 Calling SDK verifyTemplate API (will prompt for fingerprint scan)...');
      console.log('👆 Please place your finger on the scanner when prompted...');
      
      const response = await fetch(`${url}&${params}`, { 
        method: 'GET',
        signal: abortSignal 
      });
      const result: BioMiniResponse = await response.json();

      console.log('📥 SDK verifyTemplate response:', {
        retValue: result.retValue,
        retString: result.retString,
        retVerify: result.retVerify,
        score: result.score
      });

      if (this.isApiSuccess(result.retValue)) {
        const verified = result.retVerify === true || 
                        result.retVerify === 'true' || 
                        result.retVerify === 'True' ||
                        result.retVerify === 'Success'; // CRITICAL FIX: WebAgent returns 'Success' for match
        console.log(`${verified ? '✅' : '❌'} SDK VerifyTemplate result: ${verified ? 'MATCH' : 'NO MATCH'}`);
        console.log(`🔍 Raw retVerify value: "${result.retVerify}" (type: ${typeof result.retVerify})`);
        
        return {
          verified,
          score: result.score
        };
      } else {
        console.error('❌ SDK verifyTemplate failed:', result.retString);
        throw new Error(result.retString || 'SDK template verification failed');
      }

    } catch (error) {
      console.error('❌ SDK verifyTemplate error:', error);
      throw error;
    }
  }

  /**
   * DEPRECATED: Use captureAndVerifyWithUFMatcher instead
   * Capture fingerprint and extract template for client-side matching
   */
  async captureAndExtractForMatching(templateType: number = 2001, qualityLevel: number = 6, abortSignal?: AbortSignal): Promise<{template: string, imageFile?: File}> {
    if (!this.status.initialized || !this.deviceHandle) {
      throw new Error('Device not initialized. Call initializeDevice() first.');
    }

    try {
      console.log('🔍 Capturing fingerprint for template matching...');
      console.log(`🔧 Template type: ${templateType}`);
      
      // Capture fingerprint using the existing captureFingerprint method
      const imageFile = await this.captureFingerprint(abortSignal);
      
      // Extract template from the captured fingerprint
      const template = await this.extractTemplate(templateType, qualityLevel);
      
      console.log('✅ Fingerprint captured and template extracted for matching');
      
      return {
        template,
        imageFile
      };

    } catch (error) {
      console.error('❌ Capture-and-extract error:', error);
      throw error;
    }
  }

  /**
   * Biometric template matching using binary data analysis
   * Fingerprint templates are binary structures containing minutiae data
   */
  static compareTemplates(template1: string, template2: string, threshold: number = 0.75): {match: boolean, similarity: number} {
    if (!template1 || !template2) {
      return {match: false, similarity: 0};
    }

    try {
      // Decode base64 templates to binary data
      const data1 = this.base64ToBytes(template1);
      const data2 = this.base64ToBytes(template2);
      
      // Use correlation coefficient for binary biometric data
      const similarity = this.calculateBinaryCorrelation(data1, data2);
      const match = similarity >= threshold;

      console.log(`🔍 Binary template comparison: ${(similarity * 100).toFixed(1)}% correlation (threshold: ${(threshold * 100).toFixed(1)}%)`);
      
      return {match, similarity};
    } catch (error) {
      console.error('❌ Template comparison error:', error);
      return {match: false, similarity: 0};
    }
  }

  /**
   * Advanced biometric template matching using multiple algorithms
   */
  static fuzzyCompareTemplates(template1: string, template2: string, threshold: number = 0.60): {match: boolean, similarity: number} {
    if (!template1 || !template2) {
      return {match: false, similarity: 0};
    }

    try {
      // Decode base64 templates to binary data
      const data1 = this.base64ToBytes(template1);
      const data2 = this.base64ToBytes(template2);
      
      // Calculate multiple similarity metrics
      const correlation = this.calculateBinaryCorrelation(data1, data2);
      const hamming = this.calculateHammingSimilarity(data1, data2);
      const jaccard = this.calculateJaccardSimilarity(data1, data2);
      
      // Weighted combination of metrics (correlation is most important for biometrics)
      const similarity = (correlation * 0.6) + (hamming * 0.25) + (jaccard * 0.15);
      const match = similarity >= threshold;

      console.log(`🧬 Advanced biometric comparison:`);
      console.log(`   Correlation: ${(correlation * 100).toFixed(1)}%`);
      console.log(`   Hamming: ${(hamming * 100).toFixed(1)}%`);
      console.log(`   Jaccard: ${(jaccard * 100).toFixed(1)}%`);
      console.log(`   Combined: ${(similarity * 100).toFixed(1)}% (threshold: ${(threshold * 100).toFixed(1)}%)`);
      
      return {match, similarity};
    } catch (error) {
      console.error('❌ Advanced template comparison error:', error);
      return {match: false, similarity: 0};
    }
  }

  /**
   * Convert base64 string to byte array
   */
  private static base64ToBytes(base64: string): Uint8Array {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Calculate binary correlation coefficient (good for biometric templates)
   */
  private static calculateBinaryCorrelation(data1: Uint8Array, data2: Uint8Array): number {
    const minLength = Math.min(data1.length, data2.length);
    if (minLength === 0) return 0;

    // Calculate means
    let sum1 = 0, sum2 = 0;
    for (let i = 0; i < minLength; i++) {
      sum1 += data1[i];
      sum2 += data2[i];
    }
    const mean1 = sum1 / minLength;
    const mean2 = sum2 / minLength;

    // Calculate correlation coefficient
    let numerator = 0, denom1 = 0, denom2 = 0;
    for (let i = 0; i < minLength; i++) {
      const diff1 = data1[i] - mean1;
      const diff2 = data2[i] - mean2;
      numerator += diff1 * diff2;
      denom1 += diff1 * diff1;
      denom2 += diff2 * diff2;
    }

    const denominator = Math.sqrt(denom1 * denom2);
    if (denominator === 0) return 0;

    const correlation = numerator / denominator;
    // Convert to 0-1 scale (correlation ranges from -1 to 1)
    return Math.max(0, (correlation + 1) / 2);
  }

  /**
   * Calculate Hamming distance similarity
   */
  private static calculateHammingSimilarity(data1: Uint8Array, data2: Uint8Array): number {
    const maxLength = Math.max(data1.length, data2.length);
    const minLength = Math.min(data1.length, data2.length);
    
    if (maxLength === 0) return 0;

    let differences = Math.abs(data1.length - data2.length); // Length difference penalty
    
    for (let i = 0; i < minLength; i++) {
      if (data1[i] !== data2[i]) {
        differences++;
      }
    }

    return 1 - (differences / maxLength);
  }

  /**
   * Calculate Jaccard similarity for binary data
   */
  private static calculateJaccardSimilarity(data1: Uint8Array, data2: Uint8Array): number {
    const minLength = Math.min(data1.length, data2.length);
    if (minLength === 0) return 0;

    let intersection = 0;
    let union = 0;

    for (let i = 0; i < minLength; i++) {
      const a = data1[i] > 0 ? 1 : 0;
      const b = data2[i] > 0 ? 1 : 0;
      
      if (a === 1 && b === 1) intersection++;
      if (a === 1 || b === 1) union++;
    }

    return union > 0 ? intersection / union : 0;
  }

  /**
   * Calculate Levenshtein distance between two arrays
   */
  private static levenshteinDistance(arr1: string[], arr2: string[]): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= arr2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= arr1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= arr2.length; i++) {
      for (let j = 1; j <= arr1.length; j++) {
        if (arr2[i - 1] === arr1[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[arr2.length][arr1.length];
  }

  /**
   * DEPRECATED: Old capture-and-verify method
   * Use captureAndExtractForMatching + client-side comparison instead
   */
  async captureAndVerifyTemplate(templateData: string, qualityLevel: number = 6, templateType: number = 2001, abortSignal?: AbortSignal): Promise<{verified: boolean, score?: number, imageFile?: File}> {
    if (!this.status.initialized || !this.deviceHandle) {
      throw new Error('Device not initialized. Call initializeDevice() first.');
    }

    try {
      console.log('🔍 Starting capture-and-verify workflow...');
      console.log(`📊 Template length: ${templateData.length} characters`);
      console.log(`🔧 Template type: ${templateType}`);
      
      // Step 1: Start fingerprint capture
      const captureUrl = `${WEB_AGENT_URL}/api/captureSingle?dummy=${this.getDummyParam()}`;
      const captureParams = new URLSearchParams({
        sHandle: this.deviceHandle,
        id: this.pageId,
        resetTimer: '30000'
      });

      console.log('👆 Please place finger on scanner and keep it there...');
      const captureResponse = await fetch(`${captureUrl}&${captureParams}`, { 
        method: 'GET',
        signal: abortSignal 
      });
      const captureResult: BioMiniResponse = await captureResponse.json();

      if (!this.isApiSuccess(captureResult.retValue)) {
        throw new Error(captureResult.retString || 'Capture failed');
      }

      // Step 2: Poll for capture completion
      let captureComplete = false;
      let attempts = 0;
      const maxAttempts = 300; // 30 seconds with 100ms intervals

      while (!captureComplete && attempts < maxAttempts) {
        if (abortSignal?.aborted) {
          throw new Error('Capture aborted');
        }

        await new Promise(resolve => setTimeout(resolve, 100));
        
        const statusUrl = `${WEB_AGENT_URL}/api/getCaptureEnd?dummy=${this.getDummyParam()}`;
        const statusParams = new URLSearchParams({
          sHandle: this.deviceHandle,
          id: this.pageId
        });

        const statusResponse = await fetch(`${statusUrl}&${statusParams}`, { 
          method: 'GET',
          signal: abortSignal 
        });
        const statusResult: BioMiniResponse = await statusResponse.json();

        if (this.isApiSuccess(statusResult.retValue) && statusResult.captureEnd) {
          captureComplete = true;
          console.log('✅ Fingerprint captured! Now verifying immediately...');
          break;
        }
        attempts++;
      }

      if (!captureComplete) {
        throw new Error('Capture timeout - fingerprint not detected');
      }

      // Step 3: IMMEDIATELY verify against template (while finger is still on scanner)
      const verifyUrl = `${WEB_AGENT_URL}/db/verifyTemplate?dummy=${this.getDummyParam()}`;
      const verifyParams = new URLSearchParams({
        sHandle: this.deviceHandle,
        id: this.pageId,
        tempLen: templateData.length.toString(),
        tempData: templateData,
        encrypt: 'false',
        encryptKey: '',
        extractEx: 'false',
        qualityLevel: qualityLevel.toString(),
        templateType: templateType.toString()
      });

      const verifyResponse = await fetch(`${verifyUrl}&${verifyParams}`, { 
        method: 'GET',
        signal: abortSignal 
      });
      const verifyResult: BioMiniResponse = await verifyResponse.json();

      console.log('📥 Verification API response:', {
        retValue: verifyResult.retValue,
        retString: verifyResult.retString,
        retVerify: verifyResult.retVerify,
        score: verifyResult.score
      });

      // Step 4: Get the captured image for display
      let imageFile: File | undefined;
      try {
        const imageUrl = `${WEB_AGENT_URL}/img/CaptureImg.bmp?dummy=${this.getDummyParam()}&shandle=${this.deviceHandle}&id=${this.pageId}`;
        const imageResponse = await fetch(imageUrl, { signal: abortSignal });
        
        if (imageResponse.ok) {
          const imageBlob = await imageResponse.blob();
          if (imageBlob.size > 34) { // Not the placeholder
            imageFile = new File([imageBlob], `fingerprint_${Date.now()}.bmp`, { type: 'image/bmp' });
          }
        }
      } catch (imageError) {
        console.warn('⚠️ Could not retrieve fingerprint image:', imageError);
      }

      // Step 5: Process verification result
      if (this.isApiSuccess(verifyResult.retValue)) {
        const verified = verifyResult.retVerify === true || 
                        verifyResult.retVerify === 'true' || 
                        verifyResult.retVerify === 'True' ||
                        verifyResult.retVerify === 'Success'; // CRITICAL FIX: WebAgent returns 'Success' for match
        console.log(`${verified ? '✅' : '❌'} Verification result: ${verified ? 'MATCH' : 'NO MATCH'}`);
        console.log(`🔍 Raw retVerify value: "${verifyResult.retVerify}" (type: ${typeof verifyResult.retVerify})`);
        
        if (verifyResult.score !== undefined) {
          console.log(`📊 Verification score: ${verifyResult.score}`);
        }

        console.log('✅ You can now remove your finger from the scanner');
        
        return {
          verified,
          score: verifyResult.score,
          imageFile
        };
      } else {
        console.error('❌ Verification API failed:', verifyResult.retString);
        throw new Error(verifyResult.retString || 'Template verification failed');
      }

    } catch (error) {
      console.error('❌ Capture-and-verify error:', error);
      throw error;
    }
  }

  /**
   * Get image data in different formats
   * @param fileType 1=BMP, 2=19794_4, 3=WSQ
   * @param compressionRatio Compression ratio (0.1-1.0)
   * @param width Image width (default: 288)
   * @param height Image height (default: 340)
   */
  async getImageData(fileType: number = 1, compressionRatio: number = 1.0, width: number = 288, height: number = 340): Promise<string> {
    if (!this.status.initialized || !this.deviceHandle) {
      throw new Error('Device not initialized. Call initializeDevice() first.');
    }

    try {
      console.log(`🖼️ Getting image data (format: ${fileType === 1 ? 'BMP' : fileType === 2 ? '19794_4' : 'WSQ'})...`);
      
      const url = `${WEB_AGENT_URL}/api/getImageData?dummy=${this.getDummyParam()}`;
      const params = new URLSearchParams({
        sHandle: this.deviceHandle,
        id: this.pageId,
        fileType: fileType.toString(),
        width: width.toString(),
        height: height.toString(),
        compressionRatio: compressionRatio.toString()
      });

      const response = await fetch(`${url}&${params}`, { method: 'GET' });
      const result: BioMiniResponse = await response.json();

      if (this.isApiSuccess(result.retValue) && result.imageBase64) {
        console.log('✅ Image data retrieved successfully');
        console.log(`📊 Image data length: ${result.imageBase64.length} characters`);
        return result.imageBase64;
      } else {
        throw new Error(result.retString || 'Image data retrieval failed');
      }
    } catch (error) {
      console.error('❌ Image data retrieval error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const bioMiniService = new BioMiniService();
export { BioMiniService };
export default bioMiniService;
