import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, CssBaseline, Box } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import App from './App'
import { useCompactMode } from './config/theme'
import IssueReportButton from './components/IssueReportButton'
import ErrorBoundary from './components/ErrorBoundary'
import { consoleLogCapture } from './services/consoleLogCapture'
import { autoErrorReporter } from './services/autoErrorReporter'
import './index.css'

// Initialize console log capture and auto error reporting
consoleLogCapture;
autoErrorReporter;

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

// Theme wrapper component with issue reporter
const ThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentTheme } = useCompactMode();

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <Box sx={{ position: 'relative', minHeight: '100vh' }}>
        {children}
        
        {/* Issue Report Button */}
        <IssueReportButton />
      </Box>
    </ThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeWrapper>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#333',
                  color: '#fff',
                },
              }}
            />
          </ThemeWrapper>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
) 