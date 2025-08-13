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
  retVerify?: boolean; // For verify results
  matchedIndex?: number; // For identify results
  matchedID?: string; // For identify results
  verifySucceed?: boolean; // For file verification
  score?: number; // Verification score
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
      
      const url = `${WEB_AGENT_URL}/api/getTemplateData?dummy=${this.getDummyParam()}`;
      const params = new URLSearchParams({
        sHandle: this.deviceHandle,
        id: this.pageId,
        encrypt: encrypt.toString(),
        encryptKey: encryptKey,
        extractEx: 'false', // Use standard extraction
        qualityLevel: qualityLevel.toString()
      });

      const response = await fetch(`${url}&${params}`, { method: 'GET' });
      const result: BioMiniResponse = await response.json();

      if (this.isApiSuccess(result.retValue) && result.templateBase64) {
        console.log('✅ Template extracted successfully');
        console.log(`📊 Template length: ${result.templateBase64.length} characters`);
        console.log(`🔧 Template type: ${templateType === 2001 ? 'XPERIX' : templateType === 2002 ? 'ISO_19794_2' : 'ANSI378'}`);
        return result.templateBase64;
      } else {
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
  async verifyTemplate(templateData: string, qualityLevel: number = 6, encrypt: boolean = false, encryptKey: string = ''): Promise<{verified: boolean, score?: number}> {
    if (!this.status.initialized || !this.deviceHandle) {
      throw new Error('Device not initialized. Call initializeDevice() first.');
    }

    try {
      console.log('🔍 Verifying template against captured fingerprint...');
      
      const url = `${WEB_AGENT_URL}/db/verifyTemplate?dummy=${this.getDummyParam()}`;
      const params = new URLSearchParams({
        sHandle: this.deviceHandle,
        id: this.pageId,
        tempLen: templateData.length.toString(),
        tempData: templateData,
        encrypt: encrypt.toString(),
        encryptKey: encryptKey,
        extractEx: 'false',
        qualityLevel: qualityLevel.toString()
      });

      const response = await fetch(`${url}&${params}`, { method: 'GET' });
      const result: BioMiniResponse = await response.json();

      if (this.isApiSuccess(result.retValue)) {
        const verified = result.retVerify === true || result.retVerify === 'true';
        console.log(`${verified ? '✅' : '❌'} Template verification: ${verified ? 'MATCH' : 'NO MATCH'}`);
        
        if (result.score !== undefined) {
          console.log(`📊 Verification score: ${result.score}`);
        }
        
        return {
          verified,
          score: result.score
        };
      } else {
        throw new Error(result.retString || 'Template verification failed');
      }
    } catch (error) {
      console.error('❌ Template verification error:', error);
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
export default bioMiniService;
