/**
 * BioMini Web Agent Service
 * 
 * Service for integrating with Suprema BioMini Web Agent
 * Provides fingerprint capture functionality for React components
 */

const WEB_AGENT_URL = 'http://localhost:8084';

export interface BioMiniDeviceInfo {
  ID: string;
  ScannerType: string;
  Serial: string;
}

export interface BioMiniResponse {
  retValue: number;
  retString?: string;
  data?: string;
  ScannerInfos?: BioMiniDeviceInfo[];
  quality?: number;
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

  /**
   * Check if the BioMini Web Agent is running and accessible
   */
  async checkWebAgentConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${WEB_AGENT_URL}/api/getScannerList`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(3000)
      });

      this.status.available = response.ok;
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
   */
  async initializeDevice(): Promise<boolean> {
    if (!this.status.available) {
      const isAvailable = await this.checkWebAgentConnection();
      if (!isAvailable) {
        throw new Error('BioMini Web Agent is not running. Please start BioMiniWebAgent.exe');
      }
    }

    try {
      const response = await fetch(`${WEB_AGENT_URL}/api/initDevice`, {
        method: 'GET'
      });
      const result: BioMiniResponse = await response.json();

      if (result.retValue === 0) {
        this.status.initialized = true;
        this.status.error = undefined;
        
        // Get device list after initialization
        await this.getScannerList();
        return true;
      } else {
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
   */
  async getScannerList(): Promise<BioMiniDeviceInfo[]> {
    try {
      const response = await fetch(`${WEB_AGENT_URL}/api/getScannerList`, {
        method: 'GET'
      });
      const result: BioMiniResponse = await response.json();

      if (result.retValue === 0 && result.ScannerInfos) {
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
   * This is the main function your React component will use
   */
  async captureFingerprint(): Promise<File> {
    if (!this.status.initialized) {
      throw new Error('Device not initialized. Call initializeDevice() first.');
    }

    try {
      // Step 1: Capture single image
      const captureResponse = await fetch(`${WEB_AGENT_URL}/api/captureSingleImage`, {
        method: 'POST'
      });
      const captureResult: BioMiniResponse = await captureResponse.json();

      if (captureResult.retValue !== 0) {
        throw new Error(captureResult.retString || 'Fingerprint capture failed');
      }

      // Step 2: Get the image buffer
      const imageResponse = await fetch(`${WEB_AGENT_URL}/api/getImageBuffer`, {
        method: 'GET'
      });
      const imageResult: BioMiniResponse = await imageResponse.json();

      if (imageResult.retValue !== 0 || !imageResult.data) {
        throw new Error('Failed to retrieve fingerprint image data');
      }

      // Step 3: Convert base64 to File object
      const base64Data = imageResult.data;
      const binaryData = atob(base64Data);
      const bytes = new Uint8Array(binaryData.length);

      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: 'image/bmp' });
      const fingerprintFile = new File([blob], `fingerprint_${Date.now()}.bmp`, {
        type: 'image/bmp'
      });

      // Add metadata if available
      if (imageResult.quality) {
        (fingerprintFile as any).quality = imageResult.quality;
      }

      return fingerprintFile;
    } catch (error) {
      console.error('Fingerprint capture failed:', error);
      throw error;
    }
  }

  /**
   * Get fingerprint template data (for advanced use cases)
   */
  async getFingerprintTemplate(): Promise<string> {
    try {
      const response = await fetch(`${WEB_AGENT_URL}/api/getTemplateData`, {
        method: 'POST'
      });
      const result: BioMiniResponse = await response.json();

      if (result.retValue === 0 && result.data) {
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
      const response = await fetch(`${WEB_AGENT_URL}/api/startCapturing`, {
        method: 'POST'
      });
      const result: BioMiniResponse = await response.json();

      return result.retValue === 0;
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
      const response = await fetch(`${WEB_AGENT_URL}/api/abortCapturing`, {
        method: 'POST'
      });
      const result: BioMiniResponse = await response.json();

      return result.retValue === 0;
    } catch (error) {
      console.error('Failed to stop capture:', error);
      return false;
    }
  }

  /**
   * Uninitialize the device
   */
  async uninitializeDevice(): Promise<boolean> {
    try {
      const response = await fetch(`${WEB_AGENT_URL}/api/uninitDevice`, {
        method: 'GET'
      });
      const result: BioMiniResponse = await response.json();

      if (result.retValue === 0) {
        this.status.initialized = false;
        this.status.devices = [];
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to uninitialize device:', error);
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
}

// Export singleton instance
export const bioMiniService = new BioMiniService();
export default bioMiniService;
