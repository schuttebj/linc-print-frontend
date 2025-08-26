/**
 * Console Log Capture Service for Issue Reporting
 * 
 * Captures and buffers console messages to include in issue reports.
 * Configurable buffer size with automatic rotation.
 */

interface LogEntry {
  timestamp: string;
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  args?: any[];
}

interface LogCaptureConfig {
  maxEntries: number;
  enabledLevels: Array<'log' | 'warn' | 'error' | 'info' | 'debug'>;
  includeTimestamps: boolean;
  includeStackTraces: boolean;
}

class ConsoleLogCapture {
  private logBuffer: LogEntry[] = [];
  private config: LogCaptureConfig = {
    maxEntries: 100,
    enabledLevels: ['error', 'warn', 'info', 'log'],
    includeTimestamps: true,
    includeStackTraces: true,
  };
  
  private originalConsole: {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
    info: typeof console.info;
    debug: typeof console.debug;
  };

  constructor(config?: Partial<LogCaptureConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Store original console methods
    this.originalConsole = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      info: console.info.bind(console),
      debug: console.debug.bind(console),
    };

    this.initializeCapture();
  }

  private initializeCapture(): void {
    // Override console methods to capture logs
    this.interceptConsoleMethod('log');
    this.interceptConsoleMethod('warn');
    this.interceptConsoleMethod('error');
    this.interceptConsoleMethod('info');
    this.interceptConsoleMethod('debug');
  }

  private interceptConsoleMethod(level: keyof typeof this.originalConsole): void {
    const originalMethod = this.originalConsole[level];
    
    console[level] = (...args: any[]) => {
      // Call original method first
      originalMethod(...args);
      
      // Capture if enabled for this level
      if (this.config.enabledLevels.includes(level)) {
        this.captureLog(level, args);
      }
    };
  }

  private captureLog(level: LogEntry['level'], args: any[]): void {
    try {
      // Format message
      const message = args
        .map(arg => {
          if (typeof arg === 'string') return arg;
          if (typeof arg === 'object') return JSON.stringify(arg, null, 2);
          return String(arg);
        })
        .join(' ');

      // Create log entry
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        args: this.config.includeStackTraces ? args : undefined,
      };

      // Add to buffer
      this.addToBuffer(entry);
    } catch (error) {
      // Don't let log capture break the application
      this.originalConsole.error('Failed to capture log:', error);
    }
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);
    
    // Rotate buffer if it exceeds max size
    if (this.logBuffer.length > this.config.maxEntries) {
      this.logBuffer = this.logBuffer.slice(-this.config.maxEntries);
    }
  }

  /**
   * Get captured logs as formatted strings
   */
  public getLogs(): string[] {
    return this.logBuffer.map(entry => {
      const timestamp = this.config.includeTimestamps 
        ? `[${entry.timestamp}] ` 
        : '';
      const level = `[${entry.level.toUpperCase()}] `;
      
      return `${timestamp}${level}${entry.message}`;
    });
  }

  /**
   * Get raw log entries with full metadata
   */
  public getRawLogs(): LogEntry[] {
    return [...this.logBuffer];
  }

  /**
   * Get logs filtered by level
   */
  public getLogsByLevel(levels: LogEntry['level'][]): string[] {
    return this.logBuffer
      .filter(entry => levels.includes(entry.level))
      .map(entry => {
        const timestamp = this.config.includeTimestamps 
          ? `[${entry.timestamp}] ` 
          : '';
        const level = `[${entry.level.toUpperCase()}] `;
        
        return `${timestamp}${level}${entry.message}`;
      });
  }

  /**
   * Get only error logs (useful for auto-reporting)
   */
  public getErrorLogs(): string[] {
    return this.getLogsByLevel(['error']);
  }

  /**
   * Get recent logs (last N entries)
   */
  public getRecentLogs(count: number = 20): string[] {
    const recentEntries = this.logBuffer.slice(-count);
    return recentEntries.map(entry => {
      const timestamp = this.config.includeTimestamps 
        ? `[${entry.timestamp}] ` 
        : '';
      const level = `[${entry.level.toUpperCase()}] `;
      
      return `${timestamp}${level}${entry.message}`;
    });
  }

  /**
   * Clear the log buffer
   */
  public clearLogs(): void {
    this.logBuffer = [];
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<LogCaptureConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): LogCaptureConfig {
    return { ...this.config };
  }

  /**
   * Restore original console methods (cleanup)
   */
  public restore(): void {
    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.info = this.originalConsole.info;
    console.debug = this.originalConsole.debug;
  }

  /**
   * Get buffer statistics
   */
  public getStats(): {
    totalEntries: number;
    bufferSize: number;
    maxEntries: number;
    oldestEntry?: string;
    newestEntry?: string;
  } {
    return {
      totalEntries: this.logBuffer.length,
      bufferSize: this.logBuffer.length,
      maxEntries: this.config.maxEntries,
      oldestEntry: this.logBuffer[0]?.timestamp,
      newestEntry: this.logBuffer[this.logBuffer.length - 1]?.timestamp,
    };
  }
}

// Create and export singleton instance
export const consoleLogCapture = new ConsoleLogCapture();

// Export class for custom instances if needed
export { ConsoleLogCapture };

// Export types
export type { LogEntry, LogCaptureConfig };
