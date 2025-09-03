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
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    paddingTop: '64px', // Account for fixed header
  }}>
    <Box sx={{ p: 2, height: 'calc(100vh - 64px)', overflow: 'auto' }}>
      {/* Universal Content Block Skeleton - matches real content structure */}
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
          background: 'linear-gradient(135deg, #f8f9fa 0%, #f1f3f5 100%)',
          boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
          borderRadius: 2,
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* Subtle animated gradient overlay */}
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
            animation: 'shimmer 2s infinite',
            '@keyframes shimmer': {
              '0%': { transform: 'translateX(-100%)' },
              '100%': { transform: 'translateX(100%)' }
            }
          }} />
          
          {/* Simple content placeholder */}
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            position: 'relative',
            zIndex: 1
          }}>
            <Box sx={{ textAlign: 'center', opacity: 0.3 }}>
              <CircularProgress 
                size={40} 
                sx={{ 
                  color: '#1976d2',
                  opacity: 0.7,
                  mb: 2
                }} 
              />
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#666',
                  fontSize: '0.875rem'
                }}
              >
                Loading content...
              </Typography>
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