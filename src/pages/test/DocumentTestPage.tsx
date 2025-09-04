import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Divider,
  Chip,
  Paper,
  Stack
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  Visibility as PreviewIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Code as CodeIcon
} from '@mui/icons-material';
import { getAuthToken, API_ENDPOINTS } from '../../config/api';

interface GeneratorInfo {
  service: string;
  version: string;
  status: string;
  supported_formats: string[];
  supported_templates: string[];
  timestamp: string;
}

interface SampleData {
  success: boolean;
  data: any;
  generator_version: string;
  generated_at: string;
}

const DocumentTestPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatorInfo, setGeneratorInfo] = useState<GeneratorInfo | null>(null);
  const [sampleData, setSampleData] = useState<SampleData | null>(null);
  const [lastGeneratedPdf, setLastGeneratedPdf] = useState<string | null>(null);

  const baseUrl = `${API_ENDPOINTS.base}/document-test`;

  const fetchGeneratorInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${baseUrl}/generator-info`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setGeneratorInfo(data);
    } catch (err: any) {
      setError(`Failed to fetch generator info: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchSampleData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${baseUrl}/sample-receipt-data`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setSampleData(data);
    } catch (err: any) {
      setError(`Failed to fetch sample data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateSamplePdf = async (action: 'preview' | 'download' | 'print') => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${baseUrl}/sample-receipt-pdf`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setLastGeneratedPdf(url);

      switch (action) {
        case 'preview':
          // Open in new tab for preview
          window.open(url, '_blank');
          break;
        
        case 'download':
          // Trigger download
          const a = document.createElement('a');
          a.href = url;
          a.download = `sample_receipt_${new Date().toISOString().slice(0, 19).replace(/:/g, '')}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          break;
        
        case 'print':
          // Open in new window and trigger print
          const printWindow = window.open(url, '_blank');
          if (printWindow) {
            printWindow.addEventListener('load', () => {
              printWindow.print();
            });
          }
          break;
      }

      // Clean up URL after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 5000);

    } catch (err: any) {
      setError(`Failed to generate PDF: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshLastPdf = () => {
    if (lastGeneratedPdf) {
      window.open(lastGeneratedPdf, '_blank');
    }
  };

  React.useEffect(() => {
    fetchGeneratorInfo();
  }, []);

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Document Generation Test
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Test interface for A4 document generation and PDF preview functionality
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Generator Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Generator Service Information
              </Typography>
              
              {generatorInfo ? (
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Service</Typography>
                    <Typography variant="body1">{generatorInfo.service}</Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">Version</Typography>
                    <Chip label={generatorInfo.version} color="primary" size="small" />
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">Status</Typography>
                    <Chip 
                      label={generatorInfo.status} 
                      color={generatorInfo.status === 'active' ? 'success' : 'default'} 
                      size="small" 
                    />
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">Supported Formats</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      {generatorInfo.supported_formats.map((format) => (
                        <Chip key={format} label={format.toUpperCase()} variant="outlined" size="small" />
                      ))}
                    </Box>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">Supported Templates</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      {generatorInfo.supported_templates.map((template) => (
                        <Chip key={template} label={template} variant="outlined" size="small" />
                      ))}
                    </Box>
                  </Box>
                </Stack>
              ) : (
                <Typography color="text.secondary">Loading...</Typography>
              )}
              
              <Button 
                variant="outlined" 
                startIcon={<RefreshIcon />}
                onClick={fetchGeneratorInfo}
                disabled={loading}
                sx={{ mt: 2 }}
              >
                Refresh Info
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* PDF Generation Controls */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                PDF Generation Test
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Generate sample receipt PDF for testing document generation
              </Typography>

              <Stack spacing={2}>
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={16} /> : <PreviewIcon />}
                  onClick={() => generateSamplePdf('preview')}
                  disabled={loading}
                  fullWidth
                >
                  {loading ? 'Generating...' : 'Preview PDF'}
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={() => generateSamplePdf('print')}
                  disabled={loading}
                  fullWidth
                >
                  Generate & Print
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => generateSamplePdf('download')}
                  disabled={loading}
                  fullWidth
                >
                  Download PDF
                </Button>

                {lastGeneratedPdf && (
                  <Button
                    variant="text"
                    startIcon={<RefreshIcon />}
                    onClick={refreshLastPdf}
                    size="small"
                  >
                    Re-open Last PDF
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Sample Data Viewer */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sample Data Structure
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                View the data structure used for receipt generation
              </Typography>

              <Button
                variant="outlined"
                startIcon={<CodeIcon />}
                onClick={fetchSampleData}
                disabled={loading}
                sx={{ mb: 2 }}
              >
                Load Sample Data
              </Button>

              {sampleData && (
                <Paper sx={{ p: 2, bgcolor: '#f5f5f5', overflow: 'auto' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Generated: {new Date(sampleData.generated_at).toLocaleString()}
                  </Typography>
                  <pre style={{ 
                    fontSize: '12px', 
                    margin: 0, 
                    overflow: 'auto',
                    maxHeight: '400px',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {JSON.stringify(sampleData.data, null, 2)}
                  </pre>
                </Paper>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DocumentTestPage;
