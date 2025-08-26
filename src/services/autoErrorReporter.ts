/**
 * Auto Error Reporter Service for Issue Tracking
 * 
 * Automatically captures and reports JavaScript errors, API failures, and other issues.
 * Includes throttling to prevent spam and duplicate reporting.
 */

import axios from 'axios';
import { consoleLogCapture } from './consoleLogCapture';

interface ErrorReport {
  title: string;
  description: string;
  category: 'BUG' | 'PERFORMANCE' | 'DATA_ERROR';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  report_type: 'AUTO_REPORTED_JS_ERROR' | 'AUTO_REPORTED_API_ERROR';
  error_message: string;
  stack_trace?: string;
  page_url: string;
  user_agent: string;
  browser_version: string;
  operating_system: string;
  environment: string;
  console_logs?: string[];
  network_logs?: any[];
}

interface AutoReporterConfig {
  enabled: boolean;
  throttleMs: number;
  maxReportsPerSession: number;
  reportApiErrors: boolean;
  reportJsErrors: boolean;
  reportUnhandledRejections: boolean;
  excludePatterns: string[];
}

class AutoErrorReporter {
  private config: AutoReporterConfig = {
    enabled: true,
    throttleMs: 30000, // 30 seconds between similar errors
    maxReportsPerSession: 20,
    reportApiErrors: true,
    reportJsErrors: true,
    reportUnhandledRejections: true,
    excludePatterns: [
      'Script error',
      'Non-Error promise rejection captured',
      'ResizeObserver loop limit exceeded',
      'Network request failed', // Too noisy for auto-reporting
    ],
  };

  private reportedErrors: Set<string> = new Set();
  private errorTimestamps: Map<string, number> = new Map();
  private sessionReportCount: number = 0;
  private apiInterceptorId?: number;

  constructor(config?: Partial<AutoReporterConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    if (this.config.enabled) {
      this.initialize();
    }
  }

  private initialize(): void {
    // Capture global JavaScript errors
    if (this.config.reportJsErrors) {
      this.setupGlobalErrorHandler();
    }

    // Capture unhandled promise rejections
    if (this.config.reportUnhandledRejections) {
      this.setupUnhandledRejectionHandler();
    }

    // Intercept axios requests for API error reporting
    if (this.config.reportApiErrors) {
      this.setupApiErrorInterceptor();
    }
  }

  private setupGlobalErrorHandler(): void {
    window.addEventListener('error', (event) => {
      const error = event.error;
      const message = event.message || 'Unknown JavaScript error';
      
      if (this.shouldReportError(message)) {
        this.reportJavaScriptError({
          message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error,
        });
      }
    });
  }

  private setupUnhandledRejectionHandler(): void {
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      let message = 'Unhandled Promise Rejection';
      let stack = '';

      if (reason instanceof Error) {
        message = reason.message;
        stack = reason.stack || '';
      } else if (typeof reason === 'string') {
        message = reason;
      } else {
        message = JSON.stringify(reason);
      }

      if (this.shouldReportError(message)) {
        this.reportJavaScriptError({
          message: `Promise Rejection: ${message}`,
          error: reason,
          stack,
        });
      }
    });
  }

  private setupApiErrorInterceptor(): void {
    // Add response interceptor to catch API errors
    this.apiInterceptorId = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (axios.isAxiosError(error)) {
          this.reportApiError(error);
        }
        return Promise.reject(error);
      }
    );
  }

  private shouldReportError(message: string): boolean {
    // Check if error should be excluded
    if (this.config.excludePatterns.some(pattern => message.includes(pattern))) {
      return false;
    }

    // Check session report limit
    if (this.sessionReportCount >= this.config.maxReportsPerSession) {
      return false;
    }

    // Check throttling
    const errorKey = this.getErrorKey(message);
    const lastReported = this.errorTimestamps.get(errorKey);
    const now = Date.now();

    if (lastReported && (now - lastReported) < this.config.throttleMs) {
      return false;
    }

    return true;
  }

  private getErrorKey(message: string): string {
    // Create a key for error deduplication
    return message.replace(/\d+/g, 'N').substring(0, 100);
  }

  private async reportJavaScriptError(errorInfo: {
    message: string;
    filename?: string;
    lineno?: number;
    colno?: number;
    error?: any;
    stack?: string;
  }): Promise<void> {
    try {
      const errorKey = this.getErrorKey(errorInfo.message);
      
      // Update tracking
      this.errorTimestamps.set(errorKey, Date.now());
      this.sessionReportCount++;

      // Determine priority based on error type
      let priority: ErrorReport['priority'] = 'MEDIUM';
      if (errorInfo.message.toLowerCase().includes('uncaught')) {
        priority = 'HIGH';
      }
      if (errorInfo.message.toLowerCase().includes('critical') || 
          errorInfo.message.toLowerCase().includes('fatal')) {
        priority = 'CRITICAL';
      }

      // Create error report
      const report: ErrorReport = {
        title: `JavaScript Error: ${errorInfo.message.substring(0, 100)}`,
        description: this.formatErrorDescription(errorInfo),
        category: 'BUG',
        priority,
        report_type: 'AUTO_REPORTED_JS_ERROR',
        error_message: errorInfo.message,
        stack_trace: errorInfo.error?.stack || errorInfo.stack,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        browser_version: navigator.userAgent,
        operating_system: navigator.platform,
        environment: process.env.NODE_ENV || 'development',
        console_logs: consoleLogCapture.getRecentLogs(50),
      };

      // Send to backend
      await this.sendErrorReport(report);

    } catch (reportError) {
      console.error('Failed to auto-report JavaScript error:', reportError);
    }
  }

  private async reportApiError(error: any): Promise<void> {
    try {
      // Only report 5xx errors and network failures (not 4xx client errors)
      if (error.response?.status && error.response.status < 500) {
        return;
      }

      const errorKey = this.getErrorKey(`API_${error.config?.url}_${error.code}`);
      
      if (!this.shouldReportError(errorKey)) {
        return;
      }

      // Update tracking
      this.errorTimestamps.set(errorKey, Date.now());
      this.sessionReportCount++;

      // Determine priority
      let priority: ErrorReport['priority'] = 'MEDIUM';
      if (error.code === 'NETWORK_ERROR' || !error.response) {
        priority = 'HIGH';
      }

      // Create error report
      const report: ErrorReport = {
        title: `API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
        description: this.formatApiErrorDescription(error),
        category: 'BUG',
        priority,
        report_type: 'AUTO_REPORTED_API_ERROR',
        error_message: error.message,
        stack_trace: error.stack,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        browser_version: navigator.userAgent,
        operating_system: navigator.platform,
        environment: process.env.NODE_ENV || 'development',
        console_logs: consoleLogCapture.getErrorLogs(),
        network_logs: [this.sanitizeApiError(error)],
      };

      // Send to backend
      await this.sendErrorReport(report);

    } catch (reportError) {
      console.error('Failed to auto-report API error:', reportError);
    }
  }

  private formatErrorDescription(errorInfo: {
    message: string;
    filename?: string;
    lineno?: number;
    colno?: number;
    error?: any;
  }): string {
    let description = `**Auto-reported JavaScript Error**\n\n`;
    description += `**Error Message:** ${errorInfo.message}\n\n`;
    
    if (errorInfo.filename) {
      description += `**File:** ${errorInfo.filename}\n`;
    }
    
    if (errorInfo.lineno) {
      description += `**Line:** ${errorInfo.lineno}\n`;
    }
    
    if (errorInfo.colno) {
      description += `**Column:** ${errorInfo.colno}\n`;
    }

    description += `\n**Timestamp:** ${new Date().toISOString()}\n`;
    description += `**User Agent:** ${navigator.userAgent}\n`;

    return description;
  }

  private formatApiErrorDescription(error: any): string {
    let description = `**Auto-reported API Error**\n\n`;
    description += `**Request:** ${error.config?.method?.toUpperCase()} ${error.config?.url}\n`;
    description += `**Error Code:** ${error.code || 'Unknown'}\n`;
    
    if (error.response) {
      description += `**Status:** ${error.response.status} ${error.response.statusText}\n`;
      description += `**Response Data:** ${JSON.stringify(error.response.data, null, 2)}\n`;
    } else if (error.request) {
      description += `**Network Error:** No response received\n`;
    }

    description += `\n**Timestamp:** ${new Date().toISOString()}\n`;

    return description;
  }

  private sanitizeApiError(error: any): any {
    // Remove sensitive data from API error logs
    return {
      method: error.config?.method,
      url: error.config?.url?.replace(/\/\d+/g, '/:id'), // Replace IDs
      status: error.response?.status,
      statusText: error.response?.statusText,
      code: error.code,
      message: error.message,
      timestamp: new Date().toISOString(),
    };
  }

  private async sendErrorReport(report: ErrorReport): Promise<void> {
    try {
      await axios.post('/api/v1/issues/auto-report', report, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000, // Don't block the app
      });
    } catch (error) {
      // Don't throw or log to avoid infinite loops
      // Just fail silently for auto-reporting
    }
  }

  public enable(): void {
    this.config.enabled = true;
    this.initialize();
  }

  public disable(): void {
    this.config.enabled = false;
    
    // Remove API interceptor
    if (this.apiInterceptorId !== undefined) {
      axios.interceptors.response.eject(this.apiInterceptorId);
    }
  }

  public updateConfig(config: Partial<AutoReporterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getStats(): {
    sessionReportCount: number;
    reportedErrorsCount: number;
    config: AutoReporterConfig;
  } {
    return {
      sessionReportCount: this.sessionReportCount,
      reportedErrorsCount: this.reportedErrors.size,
      config: { ...this.config },
    };
  }

  public clearStats(): void {
    this.sessionReportCount = 0;
    this.reportedErrors.clear();
    this.errorTimestamps.clear();
  }
}

// Create and export singleton instance
export const autoErrorReporter = new AutoErrorReporter();

// Export class for custom instances if needed
export { AutoErrorReporter };

// Export types
export type { ErrorReport, AutoReporterConfig };
