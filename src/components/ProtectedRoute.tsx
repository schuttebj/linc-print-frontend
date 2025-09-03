/**
 * Protected Route Component for Madagascar Driver's License System
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography, Skeleton, AppBar, Toolbar, Drawer } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

const DRAWER_WIDTH = 300;

// Skeleton Components for Shadow Loading
const SidebarSkeleton: React.FC = () => (
  <Box sx={{ 
    width: DRAWER_WIDTH,
    bgcolor: '#fafafa', 
    height: '100vh', 
    p: 2,
    borderRight: '1px solid #e0e0e0'
  }}>
    {/* Header Section */}
    <Box sx={{ 
      p: 2, 
      borderBottom: '1px solid #e0e0e0',
      bgcolor: 'white',
      mb: 1,
      borderRadius: 1
    }}>
      <Skeleton variant="text" width="80%" height={24} sx={{ mb: 1.5 }} />
      <Skeleton variant="rectangular" width="100%" height={40} sx={{ borderRadius: 1 }} />
    </Box>
    
    {/* Navigation Items */}
    <Box sx={{ px: 1 }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <Box key={i} sx={{ mb: 0.5 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1.5, 
            p: 1.5,
            borderRadius: 1 
          }}>
            <Skeleton variant="circular" width={20} height={20} />
            <Skeleton variant="text" width={`${60 + Math.random() * 40}%`} height={20} />
          </Box>
        </Box>
      ))}
    </Box>
  </Box>
);

const HeaderSkeleton: React.FC = () => (
  <AppBar 
    position="fixed" 
    sx={{ 
      bgcolor: '#ffffff',
      borderBottom: '1px solid #e0e0e0',
      boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
      color: '#1a1a1a',
      left: DRAWER_WIDTH,
      width: `calc(100% - ${DRAWER_WIDTH}px)`,
    }}
  >
    <Toolbar sx={{ minHeight: '64px !important', px: 2, justifyContent: 'space-between' }}>
      {/* Page Title and Breadcrumbs */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Skeleton variant="text" width={200} height={28} />
        <Skeleton variant="text" width={300} height={18} />
      </Box>
      
      {/* User Profile Skeleton */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Skeleton variant="circular" width={32} height={32} />
        <Box sx={{ minWidth: 0 }}>
          <Skeleton variant="text" width={100} height={20} />
          <Skeleton variant="text" width={80} height={16} />
        </Box>
      </Box>
    </Toolbar>
  </AppBar>
);

const MainContentSkeleton: React.FC = () => (
  <Box sx={{ 
    flexGrow: 1, 
    paddingTop: '64px',
    p: 2, 
    height: 'calc(100vh - 64px)', 
    overflow: 'auto' 
  }}>
    {/* Main Container Skeleton */}
    <Box maxWidth="lg" sx={{ 
      py: 1, 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      mx: 'auto'
    }}>
      <Box sx={{ 
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#f8f9fa',
        boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
        borderRadius: 2,
        overflow: 'hidden'
      }}>
        {/* Top Section Skeleton */}
        <Box sx={{ 
          bgcolor: 'white', 
          borderBottom: '1px solid #e0e0e0',
          p: 2
        }}>
          <Skeleton variant="text" width={200} height={28} sx={{ mb: 1 }} />
          <Skeleton variant="text" width={400} height={20} sx={{ mb: 2 }} />
          
          {/* Filter Row Skeleton */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Skeleton variant="rectangular" width={120} height={40} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rectangular" width={120} height={40} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rectangular" width={200} height={40} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rectangular" width={100} height={40} sx={{ borderRadius: 1 }} />
          </Box>
        </Box>
        
        {/* Content Area Skeleton */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <Box sx={{ 
            bgcolor: 'white',
            boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
            borderRadius: 2,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Table Header Skeleton */}
            <Box sx={{ 
              display: 'flex', 
              bgcolor: '#f8f9fa',
              borderBottom: '1px solid #e0e0e0',
              p: 2 
            }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Box key={i} sx={{ flex: 1, px: 1 }}>
                  <Skeleton variant="text" width="80%" height={20} />
                </Box>
              ))}
            </Box>
            
            {/* Table Rows Skeleton */}
            <Box sx={{ flex: 1 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Box key={i} sx={{ 
                  display: 'flex', 
                  borderBottom: '1px solid #f0f0f0',
                  p: 2,
                  '&:hover': { bgcolor: '#fafafa' }
                }}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Box key={j} sx={{ flex: 1, px: 1 }}>
                      <Skeleton 
                        variant="text" 
                        width={`${50 + Math.random() * 40}%`} 
                        height={16} 
                      />
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
            
            {/* Pagination Skeleton */}
            <Box sx={{ 
              p: 2, 
              borderTop: '1px solid #e0e0e0', 
              bgcolor: 'white',
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Skeleton variant="text" width={120} height={20} />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Skeleton variant="circular" width={32} height={32} />
                <Skeleton variant="circular" width={32} height={32} />
                <Skeleton variant="circular" width={32} height={32} />
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  </Box>
);

const LayoutSkeleton: React.FC = () => (
  <Box sx={{ display: 'flex', minHeight: '100vh' }}>
    {/* Left Sidebar Skeleton */}
    <SidebarSkeleton />
    
    {/* Right Content Area */}
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Top Header Skeleton */}
      <HeaderSkeleton />
      
      {/* Main Content Skeleton */}
      <MainContentSkeleton />
    </Box>
  </Box>
);

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission
}) => {
  const { isAuthenticated, isLoading, user, userDataLoading, hasPermission } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication (initial token verification)
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
          bgcolor: '#f8f9fa'
        }}
      >
        <CircularProgress size={48} />
        <Typography variant="h6" color="text.secondary">
          Verifying authentication...
        </Typography>
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Show layout skeleton while user data is loading asynchronously
  // This prevents the "Access Denied" flash during async user loading
  if (isAuthenticated && (!user || userDataLoading)) {
    return <LayoutSkeleton />;
  }

  // Check permission if required (only after user data is loaded)
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h5" color="error">
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary">
          You don't have permission to access this page.
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute; 