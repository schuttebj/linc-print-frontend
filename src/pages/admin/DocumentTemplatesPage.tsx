import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Chip,
  IconButton,
  Collapse,
  Tooltip,
  Skeleton,
  Grid,
  Divider,
  Stack
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  Visibility as PreviewIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Code as CodeIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
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

interface TemplateItem {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  lastGenerated?: string;
  sampleDataLoaded: boolean;
  sampleData?: SampleData;
}

const DocumentTemplatesPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatorInfo, setGeneratorInfo] = useState<GeneratorInfo | null>(null);
  const [templatesInfo, setTemplatesInfo] = useState<TemplatesInfo | null>(null);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const getTemplateName = (template: string): string => {
    const names: Record<string, string> = {
      'receipt': 'Payment Receipt',
      'card_order_confirmation': 'Card Order Confirmation',
      'license_verification': 'License Verification Document'
    };
    return names[template] || template;
  };

  const getTemplateDescription = (template: string): string => {
    const descriptions: Record<string, string> = {
      'receipt': 'Official payment receipt for government transactions',
      'card_order_confirmation': 'Card order confirmation for license applications',
      'license_verification': 'License verification document for card printing authorization'
    };
    return descriptions[template] || 'Document template';
  };

  const fetchGeneratorInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(API_ENDPOINTS.documents.generatorInfo, {
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

      const response = await fetch(API_ENDPOINTS.documents.templates, {
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

      // Convert to TemplateItem format
      const templateItems: TemplateItem[] = data.templates.map((template: string) => ({
        id: template,
        name: getTemplateName(template),
        description: getTemplateDescription(template),
        status: 'active' as const,
        sampleDataLoaded: false
      }));

      setTemplates(templateItems);
    } catch (err: any) {
      setError(`Failed to fetch templates: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchSampleData = async (templateId: string) => {
    try {
      const response = await fetch(API_ENDPOINTS.documents.sampleData(templateId), {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Update the specific template with sample data
      setTemplates(prev => prev.map(template => 
        template.id === templateId 
          ? { ...template, sampleDataLoaded: true, sampleData: data }
          : template
      ));
    } catch (err: any) {
      setError(`Failed to fetch sample data: ${err.message}`);
    }
  };

  const generateSamplePdf = async (templateId: string, action: 'preview' | 'download' | 'print') => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(API_ENDPOINTS.documents.samplePdf(templateId), {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Update last generated timestamp
      setTemplates(prev => prev.map(template => 
        template.id === templateId 
          ? { ...template, lastGenerated: new Date().toLocaleString() }
          : template
      ));

      switch (action) {
        case 'preview':
          window.open(url, '_blank');
          break;
        
        case 'download':
          const a = document.createElement('a');
          a.href = url;
          a.download = `${templateId}_${new Date().toISOString().slice(0, 19).replace(/:/g, '')}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          break;
        
        case 'print':
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

  const toggleRowExpansion = (templateId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(templateId)) {
      newExpanded.delete(templateId);
    } else {
      newExpanded.add(templateId);
      // Load sample data when expanding
      const template = templates.find(t => t.id === templateId);
      if (template && !template.sampleDataLoaded) {
        fetchSampleData(templateId);
      }
    }
    setExpandedRows(newExpanded);
  };

  useEffect(() => {
    fetchGeneratorInfo();
    fetchTemplates();
  }, []);

  // Skeleton loader component for templates
  const TemplatesResultsSkeleton = () => (
    <TableContainer sx={{ flex: 1 }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Template</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Description</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Last Generated</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: 3 }).map((_, index) => (
            <React.Fragment key={index}>
              <TableRow>
                <TableCell sx={{ py: 1, px: 2 }}>
                  <Box display="flex" alignItems="center">
                    <Skeleton variant="circular" width={24} height={24} sx={{ mr: 1 }} />
                    <Skeleton variant="text" width="100%" height={20} />
                  </Box>
                </TableCell>
                <TableCell sx={{ py: 1, px: 2 }}>
                  <Skeleton variant="text" width="100%" height={20} />
                </TableCell>
                <TableCell sx={{ py: 1, px: 2 }}>
                  <Skeleton variant="rounded" width={60} height={24} />
                </TableCell>
                <TableCell sx={{ py: 1, px: 2 }}>
                  <Skeleton variant="text" width="80%" height={20} />
                </TableCell>
                <TableCell sx={{ py: 1, px: 2 }}>
                  <Box display="flex" gap={1}>
                    <Skeleton variant="circular" width={32} height={32} />
                    <Skeleton variant="circular" width={32} height={32} />
                    <Skeleton variant="circular" width={32} height={32} />
                  </Box>
                </TableCell>
              </TableRow>
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper 
        elevation={0}
        sx={{ 
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#f8f9fa',
          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        {/* Header Section */}
        <Box sx={{ 
          bgcolor: 'white', 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          flexShrink: 0,
          p: 2
        }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
              Document Templates
            </Typography>
            <Button
              variant="contained"
              onClick={() => {
                fetchGeneratorInfo();
                fetchTemplates();
              }}
              startIcon={<RefreshIcon />}
              size="small"
            >
              Refresh
            </Button>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Preview and manage document templates for official government forms and receipts
          </Typography>
          <Typography variant="body2" color="success.main" sx={{ fontStyle: 'italic' }}>
            ✓ Documents are generated in-memory and streamed directly to your browser
          </Typography>

          {/* Service Status */}
          {generatorInfo && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="caption" color="text.secondary">Service Status</Typography>
                  <Chip 
                    label={generatorInfo.status === 'Operational' ? 'Active' : generatorInfo.status} 
                    color={generatorInfo.status === 'Operational' ? 'success' : 'default'} 
                    size="small" 
                    sx={{ display: 'block', width: 'fit-content' }}
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="caption" color="text.secondary">Version</Typography>
                  <Chip label={generatorInfo.version} color="primary" size="small" sx={{ display: 'block', width: 'fit-content' }} />
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="caption" color="text.secondary">Output Format</Typography>
                  <Chip label="PDF" variant="outlined" size="small" sx={{ display: 'block', width: 'fit-content' }} />
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="caption" color="text.secondary">Templates Available</Typography>
                  <Chip label={templates.length.toString()} variant="outlined" size="small" sx={{ display: 'block', width: 'fit-content' }} />
                </Grid>
              </Grid>
            </Box>
          )}
        </Box>

        {/* Content Area */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'hidden',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ m: 2, flexShrink: 0 }}>
              {error}
            </Alert>
          )}

          {/* Templates Table */}
          <Paper 
            elevation={0}
            sx={{ 
              bgcolor: 'white',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderRadius: 0
            }}
          >
            {loading && templates.length === 0 ? (
              <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <TemplatesResultsSkeleton />
              </Box>
            ) : (
              <>
                {templates.length === 0 ? (
                  <Box sx={{ p: 2 }}>
                    <Alert severity="info">
                      No document templates found. Please check the service configuration.
                    </Alert>
                  </Box>
                ) : (
                  <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <TableContainer sx={{ flex: 1 }}>
                      <Table stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Template</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Description</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Last Generated</TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', bgcolor: '#f8f9fa' }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {templates.map((template) => (
                            <React.Fragment key={template.id}>
                              <TableRow hover>
                                <TableCell sx={{ py: 1, px: 2 }}>
                                  <Box display="flex" alignItems="center">
                                    <IconButton
                                      size="small"
                                      onClick={() => toggleRowExpansion(template.id)}
                                    >
                                      {expandedRows.has(template.id) ? 
                                        <ExpandLessIcon /> : <ExpandMoreIcon />
                                      }
                                    </IconButton>
                                    <Box sx={{ ml: 1 }}>
                                      <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                                        {template.name}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        ID: {template.id}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ py: 1, px: 2 }}>
                                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                    {template.description}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 1, px: 2 }}>
                                  <Chip
                                    label={template.status}
                                    color={template.status === 'active' ? 'success' : 'default'}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell sx={{ py: 1, px: 2 }}>
                                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                    {template.lastGenerated || 'Never'}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ py: 1, px: 2 }}>
                                  <Box display="flex" gap={1}>
                                    <Tooltip title="Preview PDF">
                                      <IconButton
                                        size="small"
                                        onClick={() => generateSamplePdf(template.id, 'preview')}
                                        disabled={loading}
                                      >
                                        <PreviewIcon />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Download PDF">
                                      <IconButton
                                        size="small"
                                        onClick={() => generateSamplePdf(template.id, 'download')}
                                        disabled={loading}
                                      >
                                        <DownloadIcon />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Print PDF">
                                      <IconButton
                                        size="small"
                                        onClick={() => generateSamplePdf(template.id, 'print')}
                                        disabled={loading}
                                      >
                                        <PrintIcon />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </TableCell>
                              </TableRow>
                              
                              {/* Expanded row with template details */}
                              <TableRow>
                                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
                                  <Collapse in={expandedRows.has(template.id)} timeout="auto" unmountOnExit>
                                    <Box margin={1}>
                                      <Typography variant="h6" gutterBottom component="div" sx={{ fontSize: '0.875rem' }}>
                                        Template Information
                                      </Typography>
                                      
                                      {template.sampleDataLoaded && template.sampleData ? (
                                        <Grid container spacing={2}>
                                          {/* Template Metadata */}
                                          <Grid item xs={12} md={6}>
                                            <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                                              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                                                Template Details
                                              </Typography>
                                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                <Box>
                                                  <Typography variant="caption" color="text.secondary">Template Type:</Typography>
                                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{template.name}</Typography>
                                                </Box>
                                                <Box>
                                                  <Typography variant="caption" color="text.secondary">Generator Version:</Typography>
                                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{template.sampleData.generator_version}</Typography>
                                                </Box>
                                                <Box>
                                                  <Typography variant="caption" color="text.secondary">Last Generated:</Typography>
                                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                    {new Date(template.sampleData.generated_at).toLocaleString()}
                                                  </Typography>
                                                </Box>
                                                <Box>
                                                  <Typography variant="caption" color="text.secondary">Output Format:</Typography>
                                                  <Chip label="PDF" size="small" color="primary" sx={{ fontSize: '0.7rem', height: '20px' }} />
                                                </Box>
                                              </Box>
                                            </Paper>
                                          </Grid>

                                          {/* Template Content Summary */}
                                          <Grid item xs={12} md={6}>
                                            <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                                              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                                                Document Content
                                              </Typography>
                                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                {template.id === 'receipt' && (
                                                  <>
                                                    <Typography variant="body2">• Government headers and official branding</Typography>
                                                    <Typography variant="body2">• Transaction and receipt numbers</Typography>
                                                    <Typography variant="body2">• Beneficiary information</Typography>
                                                    <Typography variant="body2">• Itemized payment details</Typography>
                                                    <Typography variant="body2">• Payment method and processing info</Typography>
                                                    <Typography variant="body2">• Official footer and contact information</Typography>
                                                  </>
                                                )}
                                                {template.id === 'card_order_confirmation' && (
                                                  <>
                                                    <Typography variant="body2">• Government headers and official branding</Typography>
                                                    <Typography variant="body2">• Order number and processing details</Typography>
                                                    <Typography variant="body2">• Applicant information</Typography>
                                                    <Typography variant="body2">• Order status and delivery timeline</Typography>
                                                    <Typography variant="body2">• Important collection notices</Typography>
                                                    <Typography variant="body2">• Signature area for confirmation</Typography>
                                                  </>
                                                )}
                                                {template.id === 'license_verification' && (
                                                  <>
                                                    <Typography variant="body2">• Government headers and verification title</Typography>
                                                    <Typography variant="body2">• License holder personal information</Typography>
                                                    <Typography variant="body2">• Card-eligible licenses with restrictions</Typography>
                                                    <Typography variant="body2">• Learner's permits (if applicable)</Typography>
                                                    <Typography variant="body2">• Signature sections for holder and officer</Typography>
                                                    <Typography variant="body2">• Authorization confirmation text</Typography>
                                                  </>
                                                )}
                                              </Box>
                                            </Paper>
                                          </Grid>

                                          {/* Optional: Show sample data toggle */}
                                          <Grid item xs={12}>
                                            <details>
                                              <summary style={{ cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#1976d2' }}>
                                                Show Sample Data Structure (Developer Info)
                                              </summary>
                                              <Paper sx={{ p: 2, bgcolor: '#f5f5f5', mt: 1, overflow: 'auto', maxHeight: '200px' }}>
                                                <pre style={{ 
                                                  fontSize: '11px', 
                                                  margin: 0, 
                                                  overflow: 'auto',
                                                  whiteSpace: 'pre-wrap'
                                                }}>
                                                  {JSON.stringify(template.sampleData.data, null, 2)}
                                                </pre>
                                              </Paper>
                                            </details>
                                          </Grid>
                                        </Grid>
                                      ) : (
                                        <Box sx={{ p: 2, textAlign: 'center' }}>
                                          <Typography variant="body2" color="text.secondary">
                                            Loading template information...
                                          </Typography>
                                        </Box>
                                      )}
                                    </Box>
                                  </Collapse>
                                </TableCell>
                              </TableRow>
                            </React.Fragment>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </>
            )}
          </Paper>
        </Box>
      </Paper>
    </Container>
  );
};

export default DocumentTemplatesPage;