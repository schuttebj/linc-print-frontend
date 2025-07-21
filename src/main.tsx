import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, CssBaseline, Box, Fab, Tooltip } from '@mui/material'
import { CompareArrows as CompactIcon } from '@mui/icons-material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import App from './App'
import { useCompactMode } from './config/theme'
import './index.css'

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

// Theme wrapper component with compact mode toggle
const ThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isCompact, setIsCompact, currentTheme } = useCompactMode();

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <Box sx={{ position: 'relative', minHeight: '100vh' }}>
        {children}
        
        {/* Compact Mode Toggle Button */}
        <Tooltip title={isCompact ? "Switch to Normal Mode" : "Switch to Compact Mode"} placement="left">
          <Fab
            color="primary"
            size="small"
            onClick={() => setIsCompact(!isCompact)}
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
            <CompactIcon sx={{ transform: isCompact ? 'rotate(90deg)' : 'none', transition: 'transform 0.3s' }} />
          </Fab>
        </Tooltip>
      </Box>
    </ThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
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
  </React.StrictMode>,
) 