import React, { useState } from 'react';
import { 
  Fab, 
  Tooltip, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  Stack,
  Alert
} from '@mui/material';
import { BugReport } from '@mui/icons-material';
import html2canvas from 'html2canvas';
import { consoleLogCapture } from '../services/consoleLogCapture';
import { API_BASE_URL } from '../config/api';
import axios from 'axios';

interface IssueReportButtonProps {
  // Future props for positioning, etc.
}

const ISSUE_CATEGORIES = [
  { value: 'BUG', label: 'Bug', color: 'error' as const },
  { value: 'FEATURE_REQUEST', label: 'Feature Request', color: 'info' as const },
  { value: 'PERFORMANCE', label: 'Performance', color: 'warning' as const },
  { value: 'UI_ISSUE', label: 'UI Issue', color: 'primary' as const },
  { value: 'DATA_ERROR', label: 'Data Error', color: 'error' as const },
  { value: 'OTHER', label: 'Other', color: 'default' as const },
];

const IssueReportButton: React.FC<IssueReportButtonProps> = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    steps_to_reproduce: '',
  });

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setFormData({
      title: '',
      description: '',
      category: '',
      steps_to_reproduce: '',
    });
  };

  const captureScreenshot = async (): Promise<string | null> => {
    try {
      // Capture the full page
      const canvas = await html2canvas(document.body, {
        allowTaint: true,
        useCORS: true,
        height: window.innerHeight,
        width: window.innerWidth,
        scrollX: 0,
        scrollY: 0,
      });
      
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          } else {
            resolve(null);
          }
        }, 'image/png');
      });
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      return null;
    }
  };

  const getConsoleLogs = (): string[] => {
    // Get recent console logs from the capture service
    return consoleLogCapture.getLogs();
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.description || !formData.category) {
      return;
    }

    setLoading(true);
    
    try {
      // Capture screenshot
      const screenshot = await captureScreenshot();
      
      // Get current page URL
      const currentUrl = window.location.href;
      
      // Get console logs
      const consoleLogs = getConsoleLogs();
      
      // Get user context
      const userAgent = navigator.userAgent;
      const browserVersion = navigator.userAgent;
      const operatingSystem = navigator.platform;
      
      const issueData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        steps_to_reproduce: formData.steps_to_reproduce,
        page_url: currentUrl,
        screenshot_data: screenshot,
        console_logs: consoleLogs,
        user_agent: userAgent,
        browser_version: browserVersion,
        operating_system: operatingSystem,
        environment: process.env.NODE_ENV || 'development',
        report_type: 'USER_REPORTED',
      };

      // Send to backend API
      const response = await axios.post(`${API_BASE_URL}/api/v1/issues/`, issueData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.status === 201) {
        alert('Issue reported successfully! Thank you for helping us improve the system.');
        handleClose();
      } else {
        throw new Error('Failed to submit issue');
      }
      
    } catch (error) {
      console.error('Failed to submit issue:', error);
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.detail || 'Failed to submit issue. Please try again.';
        alert(errorMessage);
      } else {
        alert('Failed to submit issue. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Tooltip title="Report an Issue" placement="left">
        <Fab
          color="secondary"
          size="small"
          onClick={handleOpen}
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            zIndex: 1000,
            opacity: 0.8,
            '&:hover': {
              opacity: 1,
            },
          }}
        >
          <BugReport />
        </Fab>
      </Tooltip>

      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <BugReport color="secondary" />
            <Typography variant="h6">Report an Issue</Typography>
          </Stack>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              We'll automatically capture a screenshot, current page URL, and console logs to help us debug the issue.
            </Alert>

            <TextField
              label="Issue Title"
              fullWidth
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief description of the issue"
            />

            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                label="Category"
              >
                {ISSUE_CATEGORIES.map((category) => (
                  <MenuItem key={category.value} value={category.value}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Chip 
                        label={category.label} 
                        color={category.color} 
                        size="small" 
                      />
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Description"
              fullWidth
              required
              multiline
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the issue, what you expected to happen, and what actually happened"
            />

            <TextField
              label="Steps to Reproduce (Optional)"
              fullWidth
              multiline
              rows={3}
              value={formData.steps_to_reproduce}
              onChange={(e) => setFormData({ ...formData, steps_to_reproduce: e.target.value })}
              placeholder="1. Go to... &#10;2. Click on... &#10;3. See error..."
            />

            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Automatically captured:</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Full page screenshot
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Current page URL: {window.location.href}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Recent console logs (last 100 entries)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Browser information
              </Typography>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={loading || !formData.title || !formData.description || !formData.category}
          >
            {loading ? 'Submitting...' : 'Report Issue'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default IssueReportButton;
