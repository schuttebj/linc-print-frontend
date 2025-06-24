/**
 * Authentication Context for Madagascar Driver's License System
 * Enhanced security with cross-domain authentication between Vercel (frontend) and Render (backend)
 * 
 * Security Strategy:
 * - Access tokens stored in memory only (most secure)
 * - Refresh tokens in httpOnly cookies with SameSite=None for cross-domain
 * - Automatic token refresh with exponential backoff
 * - Simple token expiry-based logout (no complex activity tracking)
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

  // Simple logout protection - only allow one logout at a time
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Initialize authentication on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  // Set up automatic token refresh - simplified approach
  useEffect(() => {
    if (authState.isAuthenticated && authState.accessToken && !isLoggingOut) {
      const refreshInterval = setInterval(async () => {
        try {
          const success = await refreshToken();
          if (!success) {
            // Token refresh failed - silent logout without API call
            console.log('Token refresh failed, silent logout');
            performSilentLogout();
          }
        } catch (error) {
          console.error('Token refresh error:', error);
          // Silent logout on refresh failure
          performSilentLogout();
        }
      }, 14 * 60 * 1000); // Refresh every 14 minutes

      return () => clearInterval(refreshInterval);
    }
  }, [authState.isAuthenticated, authState.accessToken, isLoggingOut]);

  /**
   * Initialize authentication state
   * Attempts to refresh token to restore session
   */
  const initializeAuth = async () => {
    try {
      console.log('🔄 Initializing authentication...');
      setAuthState(prev => ({ ...prev, isLoading: true }));
      const refreshSuccess = await refreshToken();
      console.log('🔄 Refresh token result:', refreshSuccess);
      if (!refreshSuccess) {
        console.log('❌ Refresh failed, clearing auth state');
        performSilentLogout();
      }
    } catch (error) {
      console.error('❌ Auth initialization failed:', error);
      performSilentLogout();
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

      // Reset logout flag on successful login
      setIsLoggingOut(false);

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

      console.log('✅ Login successful');
      return true;

    } catch (error) {
      console.error('❌ Login failed:', error);
      performSilentLogout();
      throw error;
    }
  };

  /**
   * Logout user - with protection against multiple calls
   */
  const logout = async (): Promise<void> => {
    // Prevent multiple simultaneous logout calls
    if (isLoggingOut) {
      console.log('🔄 Logout already in progress, skipping...');
      return;
    }

    setIsLoggingOut(true);
    console.log('🚪 Starting logout process...');

    try {
      // Try to call logout API (but don't wait or fail if it doesn't work)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      fetch(`${API_ENDPOINTS.auth}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        signal: controller.signal,
      }).then(() => {
        clearTimeout(timeoutId);
        console.log('✅ Logout API call successful');
      }).catch((error) => {
        clearTimeout(timeoutId);
        console.log('⚠️ Logout API call failed (continuing with local cleanup):', error.message);
      });

    } catch (error) {
      console.log('⚠️ Logout API error (continuing with local cleanup):', error);
    }

    // Always clear local state regardless of API call result
    performSilentLogout();
  };

  /**
   * Silent logout - clear local state without API calls
   * Used for token expiry, errors, etc.
   */
  const performSilentLogout = () => {
    console.log('🧹 Performing silent logout...');
    
    // Clear auth token from memory
    setAuthToken(null);
    
    // Clear auth state
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      accessToken: null,
    });

    // Clear any stored data
    localStorage.removeItem('user_preferences');
    sessionStorage.clear();

    // Reset logout flag
    setIsLoggingOut(false);
    
    console.log('✅ Silent logout completed');
  };

  /**
   * Refresh access token using httpOnly refresh token
   */
  const refreshToken = async (): Promise<boolean> => {
    try {
      // Don't refresh if already logging out
      if (isLoggingOut) {
        console.log('🔄 Skipping refresh - logout in progress');
        return false;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${API_ENDPOINTS.auth}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for refresh token
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Handle 401/403 responses silently (token expired/invalid)
        if (response.status === 401 || response.status === 403) {
          console.log('🔒 Token expired or invalid, silent logout');
          performSilentLogout();
        }
        return false;
      }

      const tokenData = await response.json();
      const { access_token } = tokenData;

      // Get updated user info with new token
      const userController = new AbortController();
      const userTimeoutId = setTimeout(() => userController.abort(), 10000);
      
      const userResponse = await fetch(`${API_ENDPOINTS.auth}/me`, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
        credentials: 'include',
        signal: userController.signal,
      });

      clearTimeout(userTimeoutId);

      if (!userResponse.ok) {
        if (userResponse.status === 401 || userResponse.status === 403) {
          console.log('🔒 User info fetch failed, silent logout');
          performSilentLogout();
        }
        return false;
      }

      const userData = await userResponse.json();

      // Set auth token in memory for API calls
      setAuthToken(access_token);

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

      console.log('✅ Token refresh successful');
      return true;
    } catch (error) {
      console.error('❌ Token refresh error:', error);
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