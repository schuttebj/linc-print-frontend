/**
 * BioMini Web Agent Service
 * 
 * Service for integrating with Suprema BioMini Web Agent
 * Provides fingerprint capture functionality for React components
 */

// Use Vite proxy in development, direct URL in production
const WEB_AGENT_URL = import.meta.env.DEV ? '/biomini' : 'https://localhost';

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

  constructor() {
    // Generate unique page ID for session management
    this.pageId = '0'; // Sample UI uses '0'
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
   * Uses CORRECT API implementation from BiominiWebAgent.js:
   * 1. POST to /api/captureSingle with data parameters
   * 2. Poll /api/getCaptureEnd until captureEnd: true
   * 3. Get image from /img/CaptureImg.bmp with session parameters
   */
  async captureFingerprint(): Promise<File> {
    if (!this.status.initialized || !this.deviceHandle) {
      throw new Error('Device not initialized. Call initializeDevice() first.');
    }

    try {
      // Step 1: Start capture using CORRECT API pattern (like BiominiWebAgent.js line 500)
      const captureData = new URLSearchParams({
        sHandle: this.deviceHandle,
        id: this.pageId,
        resetTimer: '30000'
      });

      const captureUrl = `${WEB_AGENT_URL}/api/captureSingle?dummy=${this.getDummyParam()}`;
      const captureResponse = await fetch(captureUrl, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      // Add data as query parameters (how jQuery does it)
      const captureUrlWithData = `${captureUrl}&${captureData.toString()}`;
      const captureResponseFinal = await fetch(captureUrlWithData, { method: 'GET' });
      const captureResult = await captureResponseFinal.json();

      if (captureResult.retValue !== 0) {
        throw new Error(captureResult.retString || 'Fingerprint capture failed');
      }

      console.log('Capture started, polling for completion...');

      // Step 2: Poll /api/getCaptureEnd until captureEnd: true (like BiominiWebAgent.js line 576)
      let captureComplete = false;
      let attempts = 0;
      const maxAttempts = 60; // Match the sample UI limit

      while (!captureComplete && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second intervals
        
        const checkData = new URLSearchParams({
          sHandle: this.deviceHandle,
          id: this.pageId
        });
        
        const checkUrl = `${WEB_AGENT_URL}/api/getCaptureEnd?dummy=${this.getDummyParam()}&${checkData.toString()}`;
        
        try {
          const checkResponse = await fetch(checkUrl, { method: 'GET' });
          const checkResult = await checkResponse.json();
          
          // Check for captureEnd property (like BiominiWebAgent.js line 585)
          if (checkResult.captureEnd === true) {
            captureComplete = true;
            console.log('Capture completed successfully');
          }
        } catch (error) {
          console.log(`Poll attempt ${attempts + 1}: checking capture status...`);
        }
        
        attempts++;
      }

      if (!captureComplete) {
        throw new Error('Capture timeout - please place finger on scanner and try again');
      }

      // Step 3: Get image using session parameters (like BiominiWebAgent.js line 604)
      const sessionData = `shandle=${this.deviceHandle}&id=${this.pageId}`;
      const imageUrl = `${WEB_AGENT_URL}/img/CaptureImg.bmp?dummy=${this.getDummyParam()}&${sessionData}`;
      
      const imageResponse = await fetch(imageUrl, { method: 'GET' });
      
      if (!imageResponse.ok) {
        throw new Error(`Failed to retrieve fingerprint image: ${imageResponse.status}`);
      }

      // Convert response to blob, then to File
      const imageBlob = await imageResponse.blob();
      const fingerprintFile = new File([imageBlob], `fingerprint_${Date.now()}.bmp`, {
        type: 'image/bmp'
      });

      console.log(`Fingerprint captured successfully: ${fingerprintFile.size} bytes`);
      return fingerprintFile;
    } catch (error) {
      console.error('Fingerprint capture failed:', error);
      throw error;
    }
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
}

// Export singleton instance
export const bioMiniService = new BioMiniService();
export default bioMiniService;
