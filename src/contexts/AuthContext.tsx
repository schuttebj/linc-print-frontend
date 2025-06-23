/**
 * Authentication Context for Madagascar Driver's License System
 * Enhanced security with cross-domain authentication between Vercel (frontend) and Render (backend)
 * 
 * Security Strategy:
 * - Access tokens stored in memory only (most secure)
 * - Refresh tokens in httpOnly cookies with SameSite=None for cross-domain
 * - Automatic token refresh with exponential backoff
 * - Proper logout and session management
 * - Role-based access control for Madagascar permissions
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_ENDPOINTS, setAuthToken } from '../config/api';

// Import types from our main types file
import { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
}

interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    accessToken: null,
  });

  // Token refresh retry state
  const [refreshRetryCount, setRefreshRetryCount] = useState(0);
  const maxRefreshRetries = 3;

  // Activity tracking for 5-minute timeout
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [activityTimeout, setActivityTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

  // Initialize authentication on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  // Set up automatic token refresh with exponential backoff
  useEffect(() => {
    if (authState.isAuthenticated && authState.accessToken) {
      const refreshInterval = setInterval(() => {
        refreshToken();
      }, 14 * 60 * 1000); // Refresh every 14 minutes
      return () => clearInterval(refreshInterval);
    }
  }, [authState.isAuthenticated, authState.accessToken]);

  // Set up activity tracking and inactivity timeout
  useEffect(() => {
    if (authState.isAuthenticated) {
      // Clear existing timeout
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }

      // Set up new timeout
      const timeoutId = setTimeout(() => {
        console.log('User inactive for 5 minutes, logging out...');
        logout();
      }, INACTIVITY_TIMEOUT);

      setActivityTimeout(timeoutId);

      // Activity event listeners
      const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      
      const handleActivity = () => {
        const now = Date.now();
        setLastActivity(now);
        
        // Clear existing timeout
        if (activityTimeout) {
          clearTimeout(activityTimeout);
        }
        
        // Set new timeout
        const newTimeoutId = setTimeout(() => {
          console.log('User inactive for 5 minutes, logging out...');
          logout();
        }, INACTIVITY_TIMEOUT);
        
        setActivityTimeout(newTimeoutId);
      };

      // Add event listeners
      activityEvents.forEach(event => {
        document.addEventListener(event, handleActivity, true);
      });

      // Cleanup function
      return () => {
        if (activityTimeout) {
          clearTimeout(activityTimeout);
        }
        activityEvents.forEach(event => {
          document.removeEventListener(event, handleActivity, true);
        });
      };
    }
  }, [authState.isAuthenticated, activityTimeout]);

  /**
   * Initialize authentication state
   * Attempts to refresh token to restore session
   */
  const initializeAuth = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      const refreshSuccess = await refreshToken();
      if (!refreshSuccess) {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          accessToken: null,
        });
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        accessToken: null,
      });
    }
  };

  /**
   * Login user with credentials
   */
  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      const response = await fetch(`${API_ENDPOINTS.auth}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for refresh token
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Login failed');
      }

      const loginData = await response.json();
      const { access_token, user } = loginData;

      // Set auth token in memory for API calls
      setAuthToken(access_token);

      // Reset retry count on successful login
      setRefreshRetryCount(0);

      setAuthState({
        user: {
          ...user,
          roles: user.roles || [],
          permissions: user.permissions || [],
        },
        isAuthenticated: true,
        isLoading: false,
        accessToken: access_token,
      });

      return true;
    } catch (error) {
      console.error('Login error:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        user: null,
        isAuthenticated: false,
        accessToken: null,
      }));
      throw error;
    }
  };

  /**
   * Logout user and clear session
   */
  const logout = async (): Promise<void> => {
    try {
      // Call logout endpoint to invalidate server-side session
      if (authState.accessToken) {
        await fetch(`${API_ENDPOINTS.auth}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authState.accessToken}`,
          },
          credentials: 'include',
        }).catch(() => {
          // Ignore logout API errors - still clear local state
        });
      }
    } finally {
      // Clear auth token from memory
      setAuthToken(null);

      // Always clear local auth state
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        accessToken: null,
      });

      // Reset retry count
      setRefreshRetryCount(0);

      // Clear activity timeout
      if (activityTimeout) {
        clearTimeout(activityTimeout);
        setActivityTimeout(null);
      }

      // Clear any other stored data
      localStorage.removeItem('user_preferences');
      sessionStorage.clear();
    }
  };

  /**
   * Refresh access token using httpOnly refresh token with exponential backoff
   */
  const refreshToken = async (): Promise<boolean> => {
    try {
      // Check if we've exceeded max retries
      if (refreshRetryCount >= maxRefreshRetries) {
        console.warn('Max refresh retries exceeded, logging out');
        await logout();
        return false;
      }

      const response = await fetch(`${API_ENDPOINTS.auth}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for refresh token
      });

      if (!response.ok) {
        // Increment retry count on failure
        setRefreshRetryCount(prev => prev + 1);
        
        // If unauthorized, clear session
        if (response.status === 401) {
          await logout();
        }
        return false;
      }

      const tokenData = await response.json();
      const { access_token } = tokenData;

      // Get updated user info with new token
      const userResponse = await fetch(`${API_ENDPOINTS.auth}/me`, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
        credentials: 'include',
      });

      if (!userResponse.ok) {
        setRefreshRetryCount(prev => prev + 1);
        return false;
      }

      const userData = await userResponse.json();

      // Set auth token in memory for API calls
      setAuthToken(access_token);

      // Reset retry count on success
      setRefreshRetryCount(0);

      // Update auth state with new token and user data
      setAuthState({
        user: {
          ...userData,
          roles: userData.roles || [],
          permissions: userData.permissions || [],
        },
        isAuthenticated: true,
        isLoading: false,
        accessToken: access_token,
      });

      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      setRefreshRetryCount(prev => prev + 1);
      
      // If we've hit max retries, logout
      if (refreshRetryCount + 1 >= maxRefreshRetries) {
        await logout();
      }
      
      return false;
    }
  };

  /**
   * Check if user has specific permission
   */
  const hasPermission = (permission: string): boolean => {
    if (!authState.user) return false;
    if (authState.user.is_superuser) return true;
    return authState.user.permissions.includes(permission);
  };

  /**
   * Check if user has specific role
   */
  const hasRole = (role: string): boolean => {
    if (!authState.user) return false;
    if (authState.user.is_superuser) return true;
    return authState.user.roles.some(userRole => userRole.name === role || userRole.display_name === role);
  };

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!authState.user) return false;
    if (authState.user.is_superuser) return true;
    return permissions.some(permission => authState.user!.permissions.includes(permission));
  };

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = (roles: string[]): boolean => {
    if (!authState.user) return false;
    if (authState.user.is_superuser) return true;
    return roles.some(role => authState.user!.roles.some(userRole => userRole.name === role || userRole.display_name === role));
  };

  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    refreshToken,
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAnyRole,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use authentication context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Hook for protected components with enhanced permission checking
 */
export const useRequireAuth = (
  requiredPermission?: string, 
  requiredRole?: string,
  requiredPermissions?: string[],
  requiredRoles?: string[]
) => {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      // Redirect to login if not authenticated
      window.location.href = '/login';
    }
  }, [auth.isAuthenticated, auth.isLoading]);

  // Check permissions/roles
  const hasAccess = React.useMemo(() => {
    if (!auth.isAuthenticated) return false;
    
    // Check single permission
    if (requiredPermission && !auth.hasPermission(requiredPermission)) return false;
    
    // Check single role
    if (requiredRole && !auth.hasRole(requiredRole)) return false;
    
    // Check multiple permissions (user must have ALL)
    if (requiredPermissions && !requiredPermissions.every(perm => auth.hasPermission(perm))) return false;
    
    // Check multiple roles (user must have ALL)
    if (requiredRoles && !requiredRoles.every(role => auth.hasRole(role))) return false;
    
    return true;
  }, [auth, requiredPermission, requiredRole, requiredPermissions, requiredRoles]);

  return {
    ...auth,
    hasAccess,
  };
}; 