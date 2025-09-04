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
  template_type: string;
  data: any;
  generator_version: string;
  generated_at: string;
}

interface TemplatesInfo {
  templates: string[];
  generator_version: string;
  timestamp: string;
}

const DocumentTemplatesPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatorInfo, setGeneratorInfo] = useState<GeneratorInfo | null>(null);
  const [templatesInfo, setTemplatesInfo] = useState<TemplatesInfo | null>(null);
  const [sampleData, setSampleData] = useState<SampleData | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('receipt');
  const [lastGeneratedPdf, setLastGeneratedPdf] = useState<string | null>(null);

  const fetchGeneratorInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(API_ENDPOINTS.documentTest.generatorInfo, {
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

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(API_ENDPOINTS.documentTest.templates, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setTemplatesInfo(data);
    } catch (err: any) {
      setError(`Failed to fetch templates: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchSampleData = async (templateType?: string) => {
    const template = templateType || selectedTemplate;
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(API_ENDPOINTS.documentTest.sampleData(template), {
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

  const generateSamplePdf = async (action: 'preview' | 'download' | 'print', templateType?: string) => {
    const template = templateType || selectedTemplate;
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(API_ENDPOINTS.documentTest.samplePdf(template), {
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
          a.download = `sample_${template}_${new Date().toISOString().slice(0, 19).replace(/:/g, '')}.pdf`;
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
    fetchTemplates();
  }, []);

  const getTemplateName = (template: string): string => {
    const names: Record<string, string> = {
      'receipt': 'Receipt / Reçu',
      'card_order_confirmation': 'Card Order Confirmation / Confirmation de Commande'
    };
    return names[template] || template;
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Document Templates
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
        Preview and manage document templates for official government forms and receipts
      </Typography>
      <Typography variant="body2" color="success.main" sx={{ mb: 3, fontStyle: 'italic' }}>
        ✓ Documents are generated in-memory and streamed directly to your browser
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Template Selection */}
      {templatesInfo && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Available Document Templates
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              {templatesInfo.templates.map((template) => (
                <Chip
                  key={template}
                  label={getTemplateName(template)}
                  onClick={() => setSelectedTemplate(template)}
                  color={selectedTemplate === template ? 'primary' : 'default'}
                  variant={selectedTemplate === template ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
            <Typography variant="body2" color="text.secondary">
              Selected Template: <strong>{getTemplateName(selectedTemplate)}</strong>
            </Typography>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        {/* Generator Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Document Generation Service
              </Typography>
              
              {generatorInfo ? (
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Service Status</Typography>
                    <Chip 
                      label={generatorInfo.status === 'Operational' ? 'Active' : generatorInfo.status} 
                      color={generatorInfo.status === 'Operational' ? 'success' : 'default'} 
                      size="small" 
                    />
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">Version</Typography>
                    <Chip label={generatorInfo.version} color="primary" size="small" />
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">Supported Output Formats</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      <Chip label="PDF" variant="outlined" size="small" />
                    </Box>
                  </Box>
                  
                  {templatesInfo && (
                    <Box>
                      <Typography variant="body2" color="text.secondary">Available Templates</Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                        {templatesInfo.templates.map((template) => (
                          <Chip key={template} label={getTemplateName(template)} variant="outlined" size="small" />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Stack>
              ) : (
                <Typography color="text.secondary">Loading service information...</Typography>
              )}
              
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Button 
                  variant="outlined" 
                  startIcon={<RefreshIcon />}
                  onClick={fetchGeneratorInfo}
                  disabled={loading}
                  size="small"
                >
                  Refresh Status
                </Button>
                <Button 
                  variant="outlined" 
                  startIcon={<RefreshIcon />}
                  onClick={fetchTemplates}
                  disabled={loading}
                  size="small"
                >
                  Refresh Templates
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* PDF Generation Controls */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Document Preview & Generation
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Generate sample documents using the selected template for preview, printing, or download
              </Typography>

              <Stack spacing={2}>
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={16} /> : <PreviewIcon />}
                  onClick={() => generateSamplePdf('preview')}
                  disabled={loading}
                  fullWidth
                >
                  {loading ? 'Generating Document...' : `Preview ${getTemplateName(selectedTemplate)}`}
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={() => generateSamplePdf('print')}
                  disabled={loading}
                  fullWidth
                >
                  Generate & Print Document
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => generateSamplePdf('download')}
                  disabled={loading}
                  fullWidth
                >
                  Download PDF Document
                </Button>

                <Button
                  variant="text"
                  startIcon={<CodeIcon />}
                  onClick={() => fetchSampleData()}
                  disabled={loading}
                  size="small"
                >
                  View Template Data Structure
                </Button>

                {lastGeneratedPdf && (
                  <Button
                    variant="text"
                    startIcon={<RefreshIcon />}
                    onClick={refreshLastPdf}
                    size="small"
                  >
                    Re-open Last Generated Document
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
                Template Data Structure
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                View the data structure used for document generation. This shows the format expected for real document generation.
              </Typography>

              {sampleData && (
                <Paper sx={{ p: 2, bgcolor: '#f5f5f5', overflow: 'auto' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Template: {getTemplateName(sampleData.template_type)} | Generated: {new Date(sampleData.generated_at).toLocaleString()}
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

export default DocumentTemplatesPage;
