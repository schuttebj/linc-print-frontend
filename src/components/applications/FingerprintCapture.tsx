import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Alert,
  Chip,
  Grid,
  Paper,
  CircularProgress,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox
} from '@mui/material';
import {
  Fingerprint as FingerprintIcon,
  Warning as WarningIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

import bioMiniService from '../../services/bioMiniService';
import { biometricApiService } from '../../services/biometricApiService';

interface FingerprintCaptureProps {
  onFingerprintCapture: (fingerprintFile: File) => void;
  disabled?: boolean;
  personId?: string; // New: Person ID for verification/enrollment
  demoMode?: boolean; // New: Demo mode to skip verification
}

const FingerprintCapture: React.FC<FingerprintCaptureProps> = ({
  onFingerprintCapture,
  disabled = false,
  personId,
  demoMode = false
}) => {
  const [scannerStatus, setScannerStatus] = useState<'not_connected' | 'initializing' | 'ready' | 'scanning' | 'service_unavailable'>('not_connected');
  const [bioMiniAvailable, setBioMiniAvailable] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [deviceInfo, setDeviceInfo] = useState<{model?: string, serial?: string}>({});
  const [capturedImageUrl, setCapturedImageUrl] = useState<string>('');
  const [lastCaptureTime, setLastCaptureTime] = useState<string>('');
  const [storedFingerprintImage, setStoredFingerprintImage] = useState<string>(''); // For showing enrolled fingerprint during verification
  const [captureTimeoutId, setCaptureTimeoutId] = useState<number | null>(null);
  const [captureAbortController, setCaptureAbortController] = useState<AbortController | null>(null);
  
  // New state for verification/enrollment
  const [operationMode, setOperationMode] = useState<'determine' | 'enroll' | 'verify'>('determine');
  const [existingTemplates, setExistingTemplates] = useState<any[]>([]);
  const [verificationResult, setVerificationResult] = useState<{success: boolean; score?: number; message?: string} | null>(null);
  const [capturedTemplate, setCapturedTemplate] = useState<string>('');
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [isProcessingBiometric, setIsProcessingBiometric] = useState(false);
  
  // Internal demo mode state (not prop-based)
  const [internalDemoMode, setInternalDemoMode] = useState<boolean>(
    demoMode || localStorage.getItem('biometric_demo_mode') === 'true'
  );

  // Finger selection state
  const [selectedFinger, setSelectedFinger] = useState<number>(2); // Default: Right Index
  const [useDifferentFinger, setUseDifferentFinger] = useState<boolean>(false);
  const [fingerChangeReason, setFingerChangeReason] = useState<string>('');
  const [enrollmentCompleted, setEnrollmentCompleted] = useState<boolean>(false);

  // Finger mapping and change reasons
  const FINGER_NAMES = {
    1: 'Right Thumb',
    2: 'Right Index',
    3: 'Right Middle',
    4: 'Right Ring',
    5: 'Right Little',
    6: 'Left Thumb',
    7: 'Left Index',
    8: 'Left Middle',
    9: 'Left Ring',
    10: 'Left Little'
  };

  const FINGER_CHANGE_REASONS = [
    'Finger lost',
    'Finger deformed/scarred',
    'Skin condition',
    'Worn ridges',
    'Burn damage',
    'Temporary injury'
  ];

  // Helper function to check if a finger has an enrolled template
  const getTemplateForFinger = (fingerPosition: number) => {
    return existingTemplates.find(template => template.finger_position === fingerPosition);
  };

  // Helper function to update operation mode based on selected finger
  const updateOperationModeForFinger = (fingerPosition: number) => {
    const template = getTemplateForFinger(fingerPosition);
    if (template) {
      console.log(`🔍 Selected finger ${FINGER_NAMES[fingerPosition]} has existing template - switching to verify mode`);
      setOperationMode('verify');
      // Generate stored fingerprint visualization for verification
      loadStoredFingerprintImage(template);
    } else {
      console.log(`📝 Selected finger ${FINGER_NAMES[fingerPosition]} has no template - switching to enroll mode`);
      setOperationMode('enroll');
      setStoredFingerprintImage(''); // Clear stored image
    }
  };

  // Load stored fingerprint image or generate fallback
  const loadStoredFingerprintImage = (template: any) => {
    console.log('🖼️ Loading stored fingerprint image...');
    
    // Check if template has stored image URL
    if (template.image_url) {
      console.log(`📷 Using stored fingerprint image: ${template.image_url}`);
      console.log(`🖼️ Full Verification URL: ${template.image_url}`);
      console.log(`📸 Template ID: ${template.template_id}`);
      console.log(`👤 Person ID: ${template.person_id}`);
      console.log(`🖐️  Finger: ${template.finger_position}`);
      setStoredFingerprintImage(template.image_url);
      setCapturedImageUrl(template.image_url);
      setLastCaptureTime(new Date(template.enrolled_at).toLocaleString());
      
      // Create a File object from the URL for the parent component
      fetch(template.image_url)
        .then(response => response.blob())
        .then(blob => {
          const filename = `stored_fingerprint_${template.finger_position}.png`;
          const imageFile = new File([blob], filename, { type: 'image/png' });
          onFingerprintCapture(imageFile);
          console.log('✅ Stored fingerprint image loaded and displayed');
        })
        .catch(error => {
          console.warn('⚠️ Failed to load stored fingerprint image, falling back to visualization:', error);
          // Fallback to visualization if image fails to load
          generateFallbackVisualization(template);
        });
    } else {
      console.log('📷 No stored image found, generating fallback visualization');
      generateFallbackVisualization(template);
    }
  };

  // Create enrollment fallback image
  const createEnrollmentFallback = (result: any) => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = '#e8f5e8';
      ctx.fillRect(0, 0, 400, 400);
      ctx.strokeStyle = '#4caf50';
      ctx.lineWidth = 3;
      ctx.strokeRect(10, 10, 380, 380);
      ctx.font = '16px Arial';
      ctx.fillStyle = '#2e7d32';
      ctx.textAlign = 'center';
      ctx.fillText('ENROLLED', 200, 180);
      ctx.fillText(`${FINGER_NAMES[result.finger_position]}`, 200, 200);
      ctx.fillText('Template Stored', 200, 220);
      ctx.font = '12px Arial';
      ctx.fillText(`Template ID: ${result.template_id.substring(0, 8)}...`, 200, 250);
    }
    
    canvas.toBlob((blob) => {
      if (blob) {
        const enrollmentFile = new File([blob], 'enrolled_fingerprint.png', { type: 'image/png' });
        const imageUrl = URL.createObjectURL(enrollmentFile);
        setCapturedImageUrl(imageUrl);
        onFingerprintCapture(enrollmentFile);
        console.log('✅ Enrollment fallback image created');
      }
    }, 'image/png');
  };

  // Generate fallback visualization when no stored image is available
  const generateFallbackVisualization = (template: any) => {
    console.log('🎨 Generating fallback fingerprint visualization...');
    
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Background
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, 400, 400);
      
      // Draw a placeholder fingerprint pattern
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      // Draw concentric ovals for simple fingerprint representation
      const centerX = 200;
      const centerY = 200;
      
      for (let i = 0; i < 8; i++) {
        const radiusX = 30 + i * 15;
        const radiusY = 40 + i * 18;
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // Add template info overlay with better styling
      ctx.font = 'bold 16px Arial';
      ctx.fillStyle = '#333';
      ctx.textAlign = 'center';
      ctx.fillText(`${FINGER_NAMES[template.finger_position]}`, 200, 50);
      
      ctx.font = '14px Arial';
      ctx.fillStyle = '#666';
      ctx.fillText(`Enrolled: ${new Date(template.enrolled_at).toLocaleDateString()}`, 200, 350);
      
      if (template.quality_score) {
        ctx.fillText(`Quality: ${template.quality_score}%`, 200, 370);
      }
      
      // Add "stored template" indicator
      ctx.font = '12px Arial';
      ctx.fillStyle = '#888';
      ctx.fillText('(Stored Template Preview)', 200, 390);
    }
    
    canvas.toBlob((blob) => {
      if (blob) {
        const fingerprintFile = new File([blob], `fallback_fingerprint_${template.finger_position}.png`, { type: 'image/png' });
        const imageUrl = URL.createObjectURL(fingerprintFile);
        setStoredFingerprintImage(imageUrl);
        setCapturedImageUrl(imageUrl);
        setLastCaptureTime(new Date(template.enrolled_at).toLocaleString());
        
        onFingerprintCapture(fingerprintFile);
        console.log('✅ Fallback fingerprint visualization generated');
      }
    }, 'image/png');
  };

  // Check for existing templates when personId is provided
  useEffect(() => {
    const checkExistingTemplates = async () => {
      console.log(`🔧 Initializing biometric component - PersonID: ${personId}, DemoMode: ${internalDemoMode}`);
      console.log(`🔧 PersonId type: ${typeof personId}, PersonId value: "${personId}"`);
      
      if (!personId || internalDemoMode) {
        console.log('⚠️ No person ID or demo mode - defaulting to enrollment mode');
        setOperationMode('enroll'); // Demo mode or no person ID - just enroll
        return;
      }

      try {
        console.log('🔍 Checking for existing fingerprint templates for person:', personId);
        const templates = await biometricApiService.getPersonTemplates(personId);
        setExistingTemplates(templates);
        
        // If templates exist, start in verification mode for subsequent applications
        if (templates.length > 0) {
          console.log(`✅ Found ${templates.length} existing template(s) - entering verification mode`);
          console.log(`📋 Available templates:`, templates.map(t => `${FINGER_NAMES[t.finger_position]} (${new Date(t.enrolled_at).toLocaleDateString()})`).join(', '));
          setOperationMode('verify');
          
          // Set default finger to first enrolled finger for verification
          setSelectedFinger(templates[0].finger_position);
          setUseDifferentFinger(templates[0].finger_position !== 2); // Mark as different if not right index
          
          // Generate stored fingerprint visualization for the default finger
          loadStoredFingerprintImage(templates[0]);
        } else {
          console.log('📝 No existing templates found - entering enrollment mode');
          setOperationMode('enroll');
        }
      } catch (error) {
        console.error('❌ Error checking existing templates:', error);
        setOperationMode('enroll'); // Default to enrollment on error
      }
    };

    checkExistingTemplates();
  }, [personId, internalDemoMode]);

  // Update operation mode when selected finger changes
  useEffect(() => {
    if (existingTemplates.length > 0 && selectedFinger) {
      updateOperationModeForFinger(selectedFinger);
    }
  }, [selectedFinger, existingTemplates]);

  // Check BioMini Web Agent availability
  const checkBioMiniService = async () => {
    try {
      const isAvailable = await bioMiniService.checkWebAgentConnection();
      setBioMiniAvailable(isAvailable);
      
      if (isAvailable) {
        setScannerStatus('not_connected');
        setErrorMessage('');
      } else {
        setScannerStatus('service_unavailable');
        setErrorMessage('BioMini Web Agent not running. Please start BioMiniWebAgent.exe');
      }
    } catch (error) {
      setBioMiniAvailable(false);
      setScannerStatus('service_unavailable');
      setErrorMessage('Failed to connect to BioMini service');
    }
  };

  // Initialize BioMini device
  const initializeBioMiniDevice = async () => {
    setScannerStatus('initializing');
    setErrorMessage('');

    try {
      await bioMiniService.initializeDevice();
      // Use getAvailableDevices() instead of getScannerList() (which is not supported)
      const devices = bioMiniService.getAvailableDevices();
      
      if (devices.length > 0) {
        setScannerStatus('ready');
        setDeviceInfo({
          model: getDeviceModel(devices[0].ScannerType || devices[0].DeviceType || ''),
          serial: devices[0].ScannerName || devices[0].Serial || String(devices[0].DeviceHandle)
        });
        console.log('✅ BioMini device initialized:', devices[0]);
      } else {
        throw new Error('No BioMini devices found. Check USB connection.');
      }
    } catch (error) {
      console.error('Device initialization error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Device initialization failed');
      setScannerStatus('not_connected');
    }
  };

  // Stop current scanning operation
  const stopScanning = () => {
    console.log('🛑 Stopping fingerprint capture...');
    
    // Clear timeout if set
    if (captureTimeoutId) {
      clearTimeout(captureTimeoutId);
      setCaptureTimeoutId(null);
    }
    
    // Abort any ongoing request
    if (captureAbortController) {
      captureAbortController.abort();
      setCaptureAbortController(null);
    }
    
    setScannerStatus('ready');
    setErrorMessage('Scan cancelled. Please try again.');
  };

  // Enhanced biometric capture that handles verification/enrollment
  const handleEnhancedBiometricCapture = async () => {
    if (internalDemoMode) {
      console.log('🎭 Demo mode - auto-generating success');
      handleDemoCapture();
      return;
    }

    if (!personId) {
      console.error('❌ Person ID is missing - cannot proceed with biometric workflow');
      setErrorMessage('Person ID is required for biometric verification/enrollment. Please ensure a person is selected.');
      return;
    }

    setIsProcessingBiometric(true);
    setErrorMessage('');
    setVerificationResult(null);

    try {
      console.log(`🚀 Starting ${operationMode} workflow for person: ${personId}`);
      console.log(`🔧 Operation mode: ${operationMode}, Existing templates: ${existingTemplates.length}`);
      
      if (operationMode === 'verify') {
        await handleVerificationWorkflow();
      } else {
        await handleEnrollmentWorkflow();
      }
    } catch (error) {
      console.error(`❌ ${operationMode} failed:`, error);
      setErrorMessage(`${operationMode === 'verify' ? 'Verification' : 'Enrollment'} failed: ${error.message}`);
    } finally {
      setIsProcessingBiometric(false);
    }
  };

  // Handle verification workflow
  const handleVerificationWorkflow = async () => {
    console.log(`🔍 Starting verification for ${FINGER_NAMES[selectedFinger]} finger...`);
    setScannerStatus('scanning');
    
    // Use the template for the selected finger
    const template = getTemplateForFinger(selectedFinger);
    if (!template) {
      throw new Error(`No enrolled template found for ${FINGER_NAMES[selectedFinger]} finger. Please enroll this finger first.`);
    }
    
    try {
      console.log(`🧬 Verifying against template: ${template.template_id} (finger position ${template.finger_position})`);
      
      const result = await biometricApiService.verifyFingerprint(
        template.template_id,
        4 // Security level 4
      );
      
      setScannerStatus('ready');
      setLastCaptureTime(new Date().toLocaleString());
      
      if (result.match_found) {
        console.log('✅ Verification successful!');
        setVerificationResult({
          success: true,
          score: result.match_score,
          message: `Identity verified using ${FINGER_NAMES[template.finger_position]} finger`
        });
        
        // Keep showing the stored fingerprint - don't replace with placeholder
        // The success will be indicated through the border color and success message
        console.log('🎨 Keeping stored fingerprint visualization with success indicators');
        
        // Create a minimal file for the callback if needed
        const successFile = new File(['verification_success'], 'verified_fingerprint.png', { type: 'image/png' });
        onFingerprintCapture(successFile);
        
        return;
      } else {
        console.log('❌ Verification failed');
        setVerificationResult({
          success: false,
          score: result.match_score,
          message: 'Fingerprint does not match enrolled template'
        });
        
        // Keep showing the stored fingerprint - failure will be indicated through border and message
        console.log('🎨 Keeping stored fingerprint visualization with failure indicators');
        
        // Create a minimal file for the callback if needed
        const failureFile = new File(['verification_failed'], 'verification_failed.png', { type: 'image/png' });
        onFingerprintCapture(failureFile);
        
        throw new Error('Verification failed - fingerprint does not match');
      }
    } catch (error) {
      setScannerStatus('ready');
      console.error(`❌ Verification error:`, error);
      setVerificationResult({
        success: false,
        message: error.message || 'Verification failed due to technical error'
      });
      throw error;
    }
  };

  // Handle enrollment workflow
  const handleEnrollmentWorkflow = async () => {
    console.log('📝 Starting enrollment workflow...');
    
    if (!personId) {
      throw new Error('Person ID is required for enrollment');
    }
    
    try {
      setScannerStatus('scanning');
      
      // Enroll new fingerprint directly without deleting existing ones
      // The backend should handle replacing existing templates
      console.log(`🔍 Starting single fingerprint enrollment for finger: ${selectedFinger}...`);
      const results = await biometricApiService.enrollFingerprints(
        personId,
        [selectedFinger], // Use selected finger
        undefined // No application ID needed here
      );
      
      if (results.length > 0) {
        console.log('✅ Enrollment successful!');
        const result = results[0];
        
        setVerificationResult({
          success: true,
          message: `Fingerprint enrolled successfully for ${FINGER_NAMES[result.finger_position]} finger`
        });
        
        setEnrollmentCompleted(true);
        setLastCaptureTime(new Date().toLocaleString());
        setScannerStatus('ready');
        
        // Use the stored fingerprint image URL if available, otherwise fallback to captured image
        if (result.image_url) {
          console.log('📸 Using stored fingerprint image from backend');
          console.log(`🖼️ Full Image URL: ${result.image_url}`);
          console.log(`📸 Template ID: ${result.template_id}`);
          console.log(`👤 Person ID: ${result.person_id}`);
          console.log(`🖐️  Finger: ${result.finger_position}`);
          setCapturedImageUrl(result.image_url);
          
          // Convert URL to File for callback
          fetch(result.image_url)
            .then(response => response.blob())
            .then(blob => {
              const imageFile = new File([blob], `enrolled_fingerprint_${result.finger_position}.png`, { type: 'image/png' });
              onFingerprintCapture(imageFile);
              console.log('✅ Stored fingerprint image displayed');
            })
            .catch(() => {
              console.warn('⚠️ Failed to load stored image, using fallback');
              // Create fallback if stored image fails
              createEnrollmentFallback(result);
            });
        } else if (result.captured_image) {
          console.log('📸 Using legacy captured fingerprint image from enrollment');
          const imageUrl = URL.createObjectURL(result.captured_image);
          setCapturedImageUrl(imageUrl);
          onFingerprintCapture(result.captured_image);
          console.log('✅ Legacy fingerprint image displayed');
        } else {
          console.warn('⚠️ No captured image available in enrollment result, creating placeholder');
          createEnrollmentFallback(result);
        }
      }
    } catch (error) {
      console.error('❌ Enrollment failed:', error);
      throw error;
    }
  };

  // Capture fingerprint using BioMini
  const handleBioMiniCapture = async () => {
    if (scannerStatus !== 'ready') return;

    setScannerStatus('scanning');
    setErrorMessage('');

    // Create abort controller for this capture attempt
    const abortController = new AbortController();
    setCaptureAbortController(abortController);

    // Set timeout for capture (30 seconds)
    const timeoutId = window.setTimeout(() => {
      console.log('⏰ Fingerprint capture timeout');
      stopScanning();
      setErrorMessage('Scan timeout. Please place finger firmly on scanner and try again.');
    }, 30000);
    setCaptureTimeoutId(timeoutId);

    try {
      console.log('🔍 Starting fingerprint capture...');
      
      // Pass abort signal to the service (will need to update service to support this)
      const fingerprintFile = await bioMiniService.captureFingerprint();
      
      // Clear timeout and abort controller on success
      if (captureTimeoutId) {
        clearTimeout(captureTimeoutId);
        setCaptureTimeoutId(null);
      }
      setCaptureAbortController(null);
      
      // Create URL for image preview
      const imageUrl = URL.createObjectURL(fingerprintFile);
      setCapturedImageUrl(imageUrl);
      setLastCaptureTime(new Date().toLocaleTimeString());
      
      console.log('✅ Fingerprint captured successfully:', {
        name: fingerprintFile.name,
        size: fingerprintFile.size,
        type: fingerprintFile.type
      });
      
      // Pass the file to parent component
      onFingerprintCapture(fingerprintFile);
      setScannerStatus('ready');
    } catch (error) {
      // Clear timeout and abort controller on error
      if (captureTimeoutId) {
        clearTimeout(captureTimeoutId);
        setCaptureTimeoutId(null);
      }
      setCaptureAbortController(null);
      
      // Don't show error if it was cancelled
      if (!abortController.signal.aborted) {
        console.error('❌ BioMini capture error:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Fingerprint capture failed');
      }
      setScannerStatus('ready');
    }
  };

  // Disconnect device
  const disconnectDevice = async () => {
    try {
      // Stop any active scanning first
      if (scannerStatus === 'scanning') {
        stopScanning();
      }
      
      await bioMiniService.uninitializeDevice();
      setScannerStatus('not_connected');
      setDeviceInfo({});
      setErrorMessage('');
      
      // Clean up image URL to prevent memory leaks
      if (capturedImageUrl) {
        URL.revokeObjectURL(capturedImageUrl);
        setCapturedImageUrl('');
        setLastCaptureTime('');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  // Helper function to get readable device model
  const getDeviceModel = (scannerType: string): string => {
    const typeMap: { [key: string]: string } = {
      'SFR700': 'BioMini Slim 2',
      'SFR600': 'BioMini Slim',
      'SFR500': 'BioMini Plus',
      'SFR550': 'BioMini Plus 2',
      'BMS2S': 'BioMini Slim 2S',
      'BMS3': 'BioMini Slim 3'
    };
    return typeMap[scannerType] || 'BioMini Device';
  };

  // Check BioMini service on component mount and auto-initialize if available  
  useEffect(() => {
    const initializeIfAvailable = async () => {
      console.log('🔍 Checking BioMini service availability...');
      
      try {
        const isAvailable = await bioMiniService.checkWebAgentConnection();
        setBioMiniAvailable(isAvailable);
        
        if (isAvailable) {
          setScannerStatus('not_connected');
          setErrorMessage('');
          
          // Auto-initialize device for better UX
          console.log('🚀 Service detected, auto-initializing device...');
          setScannerStatus('initializing');
          
          try {
            await bioMiniService.initializeDevice();
            const devices = bioMiniService.getAvailableDevices();
            
            if (devices.length > 0) {
              setScannerStatus('ready');
              setDeviceInfo({
                model: getDeviceModel(devices[0].ScannerType || devices[0].DeviceType || ''),
                serial: devices[0].ScannerName || devices[0].Serial || String(devices[0].DeviceHandle)
              });
              console.log('✅ Auto-initialization successful:', devices[0]);
            } else {
              setScannerStatus('not_connected');
              setErrorMessage('No BioMini devices found. Check USB connection.');
            }
          } catch (initError) {
            console.error('Auto-initialization failed:', initError);
            setScannerStatus('not_connected');
            setErrorMessage('Device initialization failed. Click "Initialize Device" to retry.');
          }
        } else {
          setScannerStatus('service_unavailable');
          setErrorMessage('BioMini Web Agent not running. Please start BioMiniWebAgent.exe');
        }
      } catch (error) {
        setBioMiniAvailable(false);
        setScannerStatus('service_unavailable');
        setErrorMessage('Failed to connect to BioMini service');
      }
    };
    
    initializeIfAvailable();
  }, []);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Clean up image URLs to prevent memory leaks
      if (capturedImageUrl) {
        URL.revokeObjectURL(capturedImageUrl);
      }
      if (storedFingerprintImage) {
        URL.revokeObjectURL(storedFingerprintImage);
      }
      
      // Clear any active timeout
      if (captureTimeoutId) {
        clearTimeout(captureTimeoutId);
      }
      
      // Abort any ongoing request
      if (captureAbortController) {
        captureAbortController.abort();
      }
    };
  }, [capturedImageUrl, storedFingerprintImage, captureTimeoutId, captureAbortController]);

  // Demo capture function for testing without real hardware
  const handleDemoCapture = () => {
    console.log('🎭 Demo mode - generating placeholder fingerprint data');
    setScannerStatus('scanning');
    setIsProcessingBiometric(true);
    
    setTimeout(() => {
      // Create a placeholder File for testing
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Draw a more realistic demo fingerprint pattern
        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(0, 0, 400, 400);
        
        // Create fingerprint ridges
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;
        
        // Draw concentric oval patterns to simulate fingerprint ridges
        for (let i = 0; i < 15; i++) {
          ctx.beginPath();
          ctx.ellipse(200, 200, 40 + i * 8, 60 + i * 6, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        
        // Add some ridge breaks for realism
        ctx.strokeStyle = '#f8f8f8';
        ctx.lineWidth = 4;
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI * 2) / 8;
          const x = 200 + Math.cos(angle) * (60 + Math.random() * 40);
          const y = 200 + Math.sin(angle) * (40 + Math.random() * 30);
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.stroke();
        }
        
        // Add demo text at bottom
        ctx.font = '12px Arial';
        ctx.fillStyle = '#999';
        ctx.textAlign = 'center';
        ctx.fillText('DEMO MODE', 200, 380);
      }
      
      canvas.toBlob((blob) => {
        if (blob) {
          const fingerprintFile = new File([blob], 'demo_fingerprint.png', { type: 'image/png' });
          
          // Create URL for preview
          const imageUrl = URL.createObjectURL(fingerprintFile);
          setCapturedImageUrl(imageUrl);
          setLastCaptureTime(new Date().toLocaleTimeString());
          
          // Set success result for demo
          setVerificationResult({
            success: true,
            message: `Demo enrollment completed successfully for ${FINGER_NAMES[selectedFinger]} finger`
          });
          
          setEnrollmentCompleted(true);
          
          // Call the original callback to satisfy parent component
          onFingerprintCapture(fingerprintFile);
          setScannerStatus('ready');
          setIsProcessingBiometric(false);
        }
      }, 'image/png');
    }, 1500); // Shorter delay for demo
  };

  const handleTestCapture = () => {
    // Legacy test function - now redirects to demo capture
    handleDemoCapture();
  };

  return (
    <Box>
      {/* Operation Mode */}
      {personId ? (
        <Alert severity={operationMode === 'verify' ? 'success' : 'info'} sx={{ mb: 2, py: 1 }}>
          <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
            {operationMode === 'verify' ? (
              <>
                <strong>🔍 Verification Mode</strong> - Will verify {FINGER_NAMES[selectedFinger]} finger
                {getTemplateForFinger(selectedFinger) && (
                  <span> (enrolled on {new Date(getTemplateForFinger(selectedFinger).enrolled_at).toLocaleDateString()})</span>
                )}
              </>
            ) : (
              <>
                <strong>📝 Enrollment Mode</strong> - Will enroll {FINGER_NAMES[selectedFinger]} finger
                {existingTemplates.length > 0 && (
                  <span> ({existingTemplates.length} other finger(s) already enrolled)</span>
                )}
              </>
            )}
          </Typography>
        </Alert>
      ) : (
        <Alert severity="warning" sx={{ mb: 2, py: 1 }}>
          <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
            <strong>⚠️ No Person Selected</strong> - Person ID required for biometric verification/enrollment
          </Typography>
        </Alert>
      )}

      {/* Demo/Production Mode Toggle */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={internalDemoMode}
              onChange={(e) => {
                const newDemoMode = e.target.checked;
                setInternalDemoMode(newDemoMode);
                localStorage.setItem('biometric_demo_mode', newDemoMode.toString());
                
                // Clear any existing results when switching modes
                setVerificationResult(null);
                if (capturedImageUrl) {
                  URL.revokeObjectURL(capturedImageUrl);
                  setCapturedImageUrl('');
                  setLastCaptureTime('');
                }
                if (storedFingerprintImage) {
                  URL.revokeObjectURL(storedFingerprintImage);
                  setStoredFingerprintImage('');
                }
                
                console.log(`🔄 Switched to ${newDemoMode ? 'Demo' : 'Production'} mode`);
              }}
              size="small"
            />
          }
          label={
            <Typography variant="body2" sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
              Mode
            </Typography>
          }
        />
        <Box
          sx={{
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            backgroundColor: internalDemoMode ? '#ff9800' : '#4caf50',
            color: 'white',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            minWidth: '80px',
            textAlign: 'center'
          }}
        >
          {internalDemoMode ? 'Demo' : 'Production'}
        </Box>
      </Box>

      {/* Finger Selection */}
      {!enrollmentCompleted && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Finger Selection
            </Typography>
            
            {/* Current finger display */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {operationMode === 'verify' ? 'Selected for verification' : 'Selected for enrollment'}: <strong>{FINGER_NAMES[selectedFinger]}</strong>
                {getTemplateForFinger(selectedFinger) && (
                  <Chip 
                    label="Enrolled" 
                    size="small" 
                    color="success" 
                    sx={{ ml: 1, fontSize: '0.7rem', height: '18px' }}
                  />
                )}
              </Typography>
            </Box>
            
            {/* Use different finger checkbox */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={useDifferentFinger}
                  onChange={(e) => {
                    setUseDifferentFinger(e.target.checked);
                    if (!e.target.checked) {
                      // Reset based on mode
                      if (operationMode === 'verify' && existingTemplates.length > 0) {
                        setSelectedFinger(existingTemplates[0].finger_position); // Reset to first enrolled finger
                      } else {
                        setSelectedFinger(2); // Reset to Right Index for enrollment
                      }
                      setFingerChangeReason('');
                    }
                  }}
                  size="small"
                />
              }
              label={
                <Typography variant="body2">
                  Use a different finger?
                </Typography>
              }
            />
            
            {/* Finger selection dropdown */}
            {useDifferentFinger && (
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Select Finger</InputLabel>
                  <Select
                    value={selectedFinger}
                    label="Select Finger"
                    onChange={(e) => {
                      const newFinger = Number(e.target.value);
                      setSelectedFinger(newFinger);
                      updateOperationModeForFinger(newFinger);
                    }}
                  >
                    {Object.entries(FINGER_NAMES).map(([position, name]) => {
                      const fingerPos = Number(position);
                      const template = getTemplateForFinger(fingerPos);
                      const isEnrolled = !!template;
                      return (
                        <MenuItem key={position} value={fingerPos}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                            <Typography variant="body2">{name}</Typography>
                            {isEnrolled && (
                              <Chip 
                                label="Enrolled" 
                                size="small" 
                                color="success" 
                                sx={{ fontSize: '0.7rem', height: '16px' }}
                              />
                            )}
                          </Box>
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
                
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Reason</InputLabel>
                  <Select
                    value={fingerChangeReason}
                    label="Reason"
                    onChange={(e) => setFingerChangeReason(e.target.value)}
                  >
                    {FINGER_CHANGE_REASONS.map((reason) => (
                      <MenuItem key={reason} value={reason}>
                        {reason}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
            
            {fingerChangeReason === 'Temporary injury' && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Note: For temporary injuries, the system will default back to Right Index finger for future applications.
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error/Status Alerts */}
      {errorMessage && (
        <Alert severity={bioMiniAvailable ? "error" : "warning"} sx={{ mb: 2 }}>
          <Typography variant="body2">{errorMessage}</Typography>
          {!bioMiniAvailable && (
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Download and run BioMiniWebAgent.exe from your IT administrator.
            </Typography>
          )}
        </Alert>
      )}



      {/* Control Buttons */}
      <Grid container spacing={1}>
        <Grid item xs={12} sm={4}>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            startIcon={<InfoIcon />}
            disabled={disabled}
            onClick={checkBioMiniService}
          >
            Check Service
          </Button>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            startIcon={<SettingsIcon />}
            disabled={disabled || !bioMiniAvailable || scannerStatus === 'initializing' || scannerStatus === 'scanning'}
            onClick={scannerStatus === 'ready' ? disconnectDevice : initializeBioMiniDevice}
          >
            {scannerStatus === 'ready' ? 'Disconnect' : scannerStatus === 'initializing' ? 'Connecting...' : 'Initialize Device'}
          </Button>
        </Grid>
        <Grid item xs={12} sm={4}>
          {scannerStatus === 'scanning' ? (
            <Button
              fullWidth
              size="small"
              variant="contained"
              color="error"
              startIcon={<ErrorIcon />}
              disabled={disabled}
              onClick={stopScanning}
            >
              Stop Scan
            </Button>
          ) : enrollmentCompleted ? (
            /* Show Retake Button in place of main capture button after enrollment */
            <Button
              fullWidth
              size="small"
              variant="outlined"
              color="warning"
              startIcon={<FingerprintIcon />}
              disabled={disabled || isProcessingBiometric}
              onClick={async () => {
                try {
                  setIsProcessingBiometric(true);
                  
                  // Clear previous results before retaking (re-enrollment will replace existing template)
                  setVerificationResult(null);
                  setEnrollmentCompleted(false);
                  if (capturedImageUrl) {
                    URL.revokeObjectURL(capturedImageUrl);
                    setCapturedImageUrl('');
                    setLastCaptureTime('');
                  }
                  if (storedFingerprintImage) {
                    URL.revokeObjectURL(storedFingerprintImage);
                    setStoredFingerprintImage('');
                  }
                  
                  console.log('🔄 Ready for fingerprint retake (re-enrollment will replace existing template)...');
                } catch (error) {
                  console.error('❌ Error preparing for retake:', error);
                  setErrorMessage('Failed to prepare for retake. Please try again.');
                } finally {
                  setIsProcessingBiometric(false);
                }
              }}
            >
              {isProcessingBiometric ? 'Preparing...' : 'Retake Fingerprint'}
            </Button>
          ) : (
            /* Show main capture button when not enrolled */
            <Button
              fullWidth
              size="small"
              variant="contained"
              startIcon={<FingerprintIcon />}
              disabled={disabled || (scannerStatus !== 'ready' && !internalDemoMode)}
              onClick={internalDemoMode ? handleDemoCapture : (bioMiniAvailable ? handleEnhancedBiometricCapture : handleTestCapture)}
            >
              {internalDemoMode ? 'Generate Demo Data' : 
               operationMode === 'verify' ? 'Verify Fingerprint' : 'Enroll Fingerprint'}
            </Button>
          )}
        </Grid>
      </Grid>

      {/* Verification/Enrollment Results */}
      {verificationResult && (
        <Alert severity={verificationResult.success ? 'success' : 'error'} sx={{ mt: 2, mb: 2 }}>
          <Typography variant="body2">
            <strong>{verificationResult.success ? '✅ Success!' : '❌ Failed'}</strong>
          </Typography>
          <Typography variant="body2">
            {verificationResult.message}
          </Typography>
          {verificationResult.score !== undefined && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>Match Score:</strong> {verificationResult.score}
            </Typography>
          )}
        </Alert>
      )}





      {/* Service Status */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Service: {bioMiniAvailable ? '🟢 Connected' : '🔴 Offline'} | 
          Device: {deviceInfo.model || 'Not Connected'} |
          Mode: {bioMiniAvailable ? 'Hardware' : 'Simulation'}
        </Typography>
      </Box>
    </Box>
  );
};

export default FingerprintCapture; 