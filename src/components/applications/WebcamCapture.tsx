import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper
} from '@mui/material';
import {
  Camera as CameraIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Videocam as VideocamIcon
} from '@mui/icons-material';

interface WebcamCaptureProps {
  onPhotoCapture: (photoFile: File) => void;
  disabled?: boolean;
}

interface WebcamDevice {
  id: number;
  name: string;
  deviceId: string;
}

const WebcamCapture: React.FC<WebcamCaptureProps> = ({
  onPhotoCapture,
  disabled = false
}) => {
  const [open, setOpen] = useState(false);
  const [webcams, setWebcams] = useState<WebcamDevice[]>([]);
  const [selectedWebcam, setSelectedWebcam] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [previewActive, setPreviewActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // Refs for video and canvas
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ISO license photo requirements (in mm, converted to pixels at 300 DPI)
  const ISO_REQUIREMENTS = {
    width: 35, // mm
    height: 45, // mm
    headHeight: 32, // mm (head from chin to top)
    eyeLevel: 25, // mm from bottom
    dpi: 300
  };

  useEffect(() => {
    if (open) {
      loadAvailableWebcams();
    }
    
    // Cleanup stream when component unmounts
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [open]);

  const loadAvailableWebcams = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Detect webcams using browser WebRTC
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        if (videoDevices.length > 0) {
          // Convert browser-detected webcams to our format
          const detectedWebcams: WebcamDevice[] = videoDevices.map((device, index) => ({
            id: 9000 + index, // Use high numeric IDs
            name: device.label || `Webcam ${index + 1}`,
            deviceId: device.deviceId
          }));
          
          setWebcams(detectedWebcams);
          
          // Auto-select first detected webcam
          if (detectedWebcams.length > 0) {
            setSelectedWebcam(detectedWebcams[0].id);
          }
          
          console.info(`Detected ${detectedWebcams.length} local webcam(s)`);
        } else {
          setError('No webcams detected. Please ensure webcams are connected and camera permissions are granted.');
        }
      } else {
        setError('Your browser does not support webcam access.');
      }
      
    } catch (err: any) {
      console.error('Error loading webcams:', err);
      setError(err.message || 'Failed to load available webcams');
    } finally {
      setLoading(false);
    }
  };

  const startPreview = async () => {
    const selectedWebcamData = webcams.find((w: WebcamDevice) => w.id === selectedWebcam);
    if (!selectedWebcamData || !selectedWebcamData.deviceId) {
      setError('Please select a valid webcam');
      return;
    }

    try {
      setError('');
      console.log('Starting webcam preview for device:', selectedWebcamData.deviceId);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: selectedWebcamData.deviceId },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      console.log('Media stream obtained:', mediaStream);
      setStream(mediaStream);
      setPreviewActive(true);
      
    } catch (error: any) {
      console.error('Error starting preview:', error);
      setError(error.message || 'Failed to start webcam preview');
    }
  };

  // Handle stream assignment when preview becomes active
  useEffect(() => {
    if (previewActive && stream && videoRef.current) {
      console.log('Setting video srcObject');
      videoRef.current.srcObject = stream;
      
      // Try to play the video
      videoRef.current.play().catch((playError) => {
        console.error('Error playing video:', playError);
      });
    }
  }, [previewActive, stream]);

  const stopPreview = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setPreviewActive(false);
  };

  const handleCapture = async () => {
    if (!selectedWebcam || !videoRef.current || !canvasRef.current) {
      setError('Please start the webcam preview first');
      return;
    }

    try {
      setCapturing(true);
      setError('');
      setSuccess('');

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Failed to get canvas context');
      }

      // Set canvas size to video size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Capture frame
      context.drawImage(video, 0, 0);

      // Convert to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.95);
      });

      if (!blob) {
        throw new Error('Failed to capture photo');
      }

      // Convert blob to File
      const photoFile = new File([blob], 'webcam_capture.jpg', { type: 'image/jpeg' });

      setSuccess('Photo captured successfully!');
      onPhotoCapture(photoFile);
      
      stopPreview();
      setTimeout(() => {
        setOpen(false);
        setSuccess('');
      }, 1500);

    } catch (error: any) {
      console.error('Error capturing photo:', error);
      setError(error.message || 'Failed to capture photo');
    } finally {
      setCapturing(false);
    }
  };

  const handleClose = () => {
    if (!capturing) {
      stopPreview();
      setOpen(false);
      setError('');
      setSuccess('');
    }
  };

  const renderPreviewOverlay = () => {
    // License photo aspect ratio: 35mm x 45mm = 7:9 ratio
    const aspectRatio = 35 / 45; // width / height
    const containerHeight = 400; // Preview container height
    const overlayHeight = containerHeight * 0.8; // Use 80% of container height
    const overlayWidth = overlayHeight * aspectRatio;
    
    // Calculate guideline positions based on overlay dimensions
    const headHeightPx = (ISO_REQUIREMENTS.headHeight / ISO_REQUIREMENTS.height) * overlayHeight;
    const eyeLevelPx = (ISO_REQUIREMENTS.eyeLevel / ISO_REQUIREMENTS.height) * overlayHeight;

    return (
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: overlayWidth,
          height: overlayHeight,
          border: '3px solid #00ff00',
          borderRadius: 1,
          pointerEvents: 'none',
          zIndex: 10,
          backgroundColor: 'rgba(0, 255, 0, 0.05)'
        }}
      >
        {/* Head guideline (top of head) */}
        <Box
          sx={{
            position: 'absolute',
            top: overlayHeight - eyeLevelPx - headHeightPx,
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: '#ff9800',
            opacity: 0.9
          }}
        />
        {/* Eye level guideline */}
        <Box
          sx={{
            position: 'absolute',
            bottom: eyeLevelPx,
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: '#2196f3',
            opacity: 0.9
          }}
        />
        {/* Center line for face alignment */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: '50%',
            width: 1,
            backgroundColor: '#00ff00',
            opacity: 0.2
          }}
        />
        {/* Dimensions text */}
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            top: -30,
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#00ff00',
            backgroundColor: 'rgba(0,0,0,0.8)',
            px: 1,
            borderRadius: 0.5,
            fontSize: '12px',
            fontWeight: 'bold',
            textAlign: 'center'
          }}
        >
          License Photo Frame<br/>
          {ISO_REQUIREMENTS.width}mm × {ISO_REQUIREMENTS.height}mm
        </Typography>
        {/* Head height indicator */}
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            top: overlayHeight - eyeLevelPx - headHeightPx - 25,
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#ff9800',
            backgroundColor: 'rgba(0,0,0,0.8)',
            px: 1,
            borderRadius: 0.5,
            fontSize: '11px',
            textAlign: 'center'
          }}
        >
          Top of Head
        </Typography>
        {/* Eye level indicator */}
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            bottom: eyeLevelPx + 5,
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#2196f3',
            backgroundColor: 'rgba(0,0,0,0.8)',
            px: 1,
            borderRadius: 0.5,
            fontSize: '11px',
            textAlign: 'center'
          }}
        >
          Eye Level
        </Typography>
      </Box>
    );
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<CameraIcon />}
        onClick={() => setOpen(true)}
        disabled={disabled}
        fullWidth
      >
        Capture with Webcam
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CameraIcon />
            Capture License Photo - ISO Compliant
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              
              {success && (
                <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleIcon />}>
                  {success}
                </Alert>
              )}

              {webcams.length === 0 ? (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  No webcams are currently available. Please ensure webcams are connected and allow camera permissions.
                </Alert>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Select a webcam and start preview to capture an ISO-compliant license photo.
                  </Typography>

                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>Select Webcam</InputLabel>
                    <Select
                      value={selectedWebcam || ''}
                      label="Select Webcam"
                      onChange={(e) => setSelectedWebcam(e.target.value ? Number(e.target.value) : null)}
                    >
                      {webcams.map((webcam) => (
                        <MenuItem key={webcam.id} value={webcam.id}>
                          <Typography variant="body2">
                            {webcam.name}
                          </Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Live Preview Area */}
                  {selectedWebcam && (
                    <Card variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                          Live Preview
                        </Typography>
                        
                        <Box sx={{ position: 'relative', mb: 2 }}>
                          <Paper
                            elevation={3}
                            sx={{
                              position: 'relative',
                              width: '100%',
                              height: 400,
                              backgroundColor: '#000',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden'
                            }}
                          >
                            {/* Video element */}
                            <video
                              ref={videoRef}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                backgroundColor: '#333',
                                display: previewActive ? 'block' : 'none'
                              }}
                              muted
                              autoPlay
                              playsInline
                            />
                            
                            {/* Show instructions when preview is not active */}
                            {!previewActive && (
                              <Box sx={{ textAlign: 'center', color: 'white' }}>
                                <VideocamIcon sx={{ fontSize: 60, mb: 1 }} />
                                <Typography variant="body2">
                                  Click "Start Preview" to begin
                                </Typography>
                              </Box>
                            )}
                            
                            {/* Show overlay when preview is active */}
                            {previewActive && renderPreviewOverlay()}
                          </Paper>
                          
                          {/* Hidden canvas for capture */}
                          <canvas
                            ref={canvasRef}
                            style={{ display: 'none' }}
                          />
                        </Box>

                        <Grid container spacing={2} sx={{ mb: 2 }}>
                          <Grid item xs={6}>
                            <Button
                              fullWidth
                              variant={previewActive ? "outlined" : "contained"}
                              startIcon={<VideocamIcon />}
                              onClick={previewActive ? stopPreview : startPreview}
                              disabled={!selectedWebcam}
                            >
                              {previewActive ? 'Stop Preview' : 'Start Preview'}
                            </Button>
                          </Grid>
                          <Grid item xs={6}>
                            <Button
                              fullWidth
                              variant="contained"
                              color="primary"
                              startIcon={<CameraIcon />}
                              onClick={handleCapture}
                              disabled={!previewActive || capturing}
                            >
                              {capturing ? 'Capturing...' : 'Capture Photo'}
                            </Button>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  )}

                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>ISO License Photo Requirements:</strong>
                    </Typography>
                    <Typography variant="body2" component="ul" sx={{ mt: 1, pl: 2, mb: 0 }}>
                      <li>Photo size: {ISO_REQUIREMENTS.width}mm × {ISO_REQUIREMENTS.height}mm</li>
                      <li>Head height: {ISO_REQUIREMENTS.headHeight}mm (chin to top of head)</li>
                      <li>Eyes at {ISO_REQUIREMENTS.eyeLevel}mm from bottom</li>
                      <li>Neutral expression, looking directly at camera</li>
                      <li>Plain white or light gray background</li>
                      <li>Good lighting, no shadows on face</li>
                    </Typography>
                  </Alert>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose} disabled={capturing}>
            Cancel
          </Button>
          <Button
            onClick={loadAvailableWebcams}
            startIcon={<RefreshIcon />}
            disabled={loading || capturing}
          >
            Refresh Webcams
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default WebcamCapture; 