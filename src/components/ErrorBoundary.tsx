/**
 * React Error Boundary Component for Auto-Reporting
 * 
 * Catches React component errors and automatically reports them to the issue tracking system.
 * Provides a fallback UI when errors occur.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Alert, Paper } from '@mui/material';
import { BugReport, Refresh } from '@mui/icons-material';
import { autoErrorReporter } from '../services/autoErrorReporter';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorReported: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorReported: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorReported: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Auto-report the React error
    this.reportReactError(error, errorInfo);
  }

  private async reportReactError(error: Error, errorInfo: ErrorInfo): Promise<void> {
    try {
      // Create a detailed error report for React errors
      const report = {
        title: `React Component Error: ${error.name}`,
        description: this.formatReactErrorDescription(error, errorInfo),
        category: 'BUG' as const,
        priority: 'HIGH' as const,
        report_type: 'AUTO_REPORTED_JS_ERROR' as const,
        error_message: error.message,
        stack_trace: error.stack,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        browser_version: navigator.userAgent,
        operating_system: navigator.platform,
        environment: process.env.NODE_ENV || 'development',
        console_logs: [], // Will be filled by the auto reporter
      };

      // Use the auto error reporter to send the report
      await fetch('/api/v1/issues/auto-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      });

      this.setState({ errorReported: true });

    } catch (reportError) {
      console.error('Failed to report React error:', reportError);
    }
  }

  private formatReactErrorDescription(error: Error, errorInfo: ErrorInfo): string {
    let description = `**Auto-reported React Component Error**\n\n`;
    description += `**Error Name:** ${error.name}\n`;
    description += `**Error Message:** ${error.message}\n\n`;
    
    if (error.stack) {
      description += `**Stack Trace:**\n\`\`\`\n${error.stack}\n\`\`\`\n\n`;
    }

    if (errorInfo.componentStack) {
      description += `**Component Stack:**\n\`\`\`\n${errorInfo.componentStack}\n\`\`\`\n\n`;
    }

    description += `**Timestamp:** ${new Date().toISOString()}\n`;
    description += `**URL:** ${window.location.href}\n`;
    description += `**User Agent:** ${navigator.userAgent}\n`;

    return description;
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorReported: false,
    });
  };

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI or provided fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            p: 3,
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 600,
              textAlign: 'center',
            }}
          >
            <BugReport
              sx={{
                fontSize: 64,
                color: 'error.main',
                mb: 2,
              }}
            />
            
            <Typography variant="h4" gutterBottom color="error">
              Oops! Something went wrong
            </Typography>
            
            <Typography variant="body1" color="text.secondary" paragraph>
              An unexpected error occurred in this component. We've been notified about this issue.
            </Typography>

            {this.state.errorReported && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Error reported automatically. Our team will investigate.
              </Alert>
            )}

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box sx={{ mt: 2, mb: 2 }}>
                <Alert severity="warning" sx={{ textAlign: 'left' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Development Error Details:
                  </Typography>
                  <Typography variant="body2" component="pre" sx={{ fontSize: '0.8rem' }}>
                    {this.state.error.message}
                  </Typography>
                </Alert>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
              <Button
                variant="outlined"
                onClick={this.handleRetry}
                startIcon={<Refresh />}
              >
                Try Again
              </Button>
              
              <Button
                variant="contained"
                onClick={this.handleReload}
                startIcon={<Refresh />}
              >
                Reload Page
              </Button>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              If this problem persists, please contact support.
            </Typography>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
