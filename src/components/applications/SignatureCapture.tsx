import React, { useRef, useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Paper,
  Alert,
  Grid
} from '@mui/material';
import {
  Create as CreateIcon,
  Clear as ClearIcon,
  Save as SaveIcon,
  TouchApp as TouchIcon
} from '@mui/icons-material';

interface SignatureCaptureProps {
  onSignatureCapture: (signatureFile: File) => void;
  disabled?: boolean;
  width?: number;
  height?: number;
}

const SignatureCapture: React.FC<SignatureCaptureProps> = ({
  onSignatureCapture,
  disabled = false,
  width = 600,
  height = 200
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Set up canvas
    canvas.width = width;
    canvas.height = height;
    
    // Set drawing properties
    context.strokeStyle = '#000000';
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    
    // Fill with white background
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
  }, [width, height]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const touch = e.touches[0];
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (point: { x: number; y: number }) => {
    if (disabled) return;
    
    setIsDrawing(true);
    setLastPoint(point);
    setHasSignature(true);
    
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (context) {
      context.beginPath();
      context.moveTo(point.x, point.y);
    }
  };

  const draw = (point: { x: number; y: number }) => {
    if (!isDrawing || disabled || !lastPoint) return;
    
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!context) return;
    
    context.lineTo(point.x, point.y);
    context.stroke();
    
    setLastPoint(point);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPoint(null);
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getMousePos(e);
    startDrawing(point);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getMousePos(e);
    draw(point);
  };

  const handleMouseUp = () => {
    stopDrawing();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const point = getTouchPos(e);
    startDrawing(point);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const point = getTouchPos(e);
    draw(point);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    stopDrawing();
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!context) return;
    
    // Clear canvas and fill with white background
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    
    setHasSignature(false);
  };

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;
    
    try {
      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png', 1.0);
      });
      
      if (!blob) {
        console.error('Failed to create signature blob');
        return;
      }
      
      // Convert blob to File
      const signatureFile = new File([blob], 'signature.png', { type: 'image/png' });
      
      onSignatureCapture(signatureFile);
    } catch (error) {
      console.error('Error saving signature:', error);
    }
  };

  return (
    <>
      <Box sx={{ mb: 2 }}>
        <Paper
          elevation={2}
          sx={{
            display: 'inline-block',
            border: '2px solid #e0e0e0',
            borderRadius: 1,
            overflow: 'hidden',
            cursor: disabled ? 'not-allowed' : 'crosshair'
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              display: 'block',
              maxWidth: '100%',
              height: 'auto',
              backgroundColor: '#ffffff'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </Paper>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={clearSignature}
            disabled={disabled || !hasSignature}
          >
            Clear
          </Button>
        </Grid>
        <Grid item xs={12} sm={8}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveSignature}
            disabled={disabled || !hasSignature}
          >
            Save Signature
          </Button>
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2">
          <TouchIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
          <strong>Instructions:</strong> Use your mouse to draw your signature in the box above. 
          On touch devices, use your finger to sign. Click "Clear" to start over or "Save Signature" when finished.
        </Typography>
      </Alert>
    </>
  );
};

export default SignatureCapture; 