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
import { API_ENDPOINTS, setAuthToken, getAuthToken } from '../config/api';

// Import types from our main types file
import { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  userDataLoading: boolean; // New: Track user data loading separately from auth loading
}

interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  loadUserDataAsync: () => Promise<void>; // New: Async user data loading method
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
    userDataLoading: false,
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
   * Fast token refresh without user data loading
   * Returns true if token refresh succeeded
   */
  const refreshTokenOnly = async (): Promise<boolean> => {
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

      // Set auth token in memory for API calls
      setAuthToken(access_token);
      
      // Also store in localStorage as fallback for page reloads
      localStorage.setItem('access_token', access_token);

      console.log('✅ Token refresh successful (user data will load async)');
      return true;
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      return false;
    }
  };

  /**
   * Load user data asynchronously (non-blocking)
   * Called after token refresh to populate user details
   */
  const loadUserDataAsync = async (): Promise<void> => {
    try {
      console.log('🔄 Loading user data asynchronously...');
      setAuthState(prev => ({ ...prev, userDataLoading: true }));
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${API_ENDPOINTS.auth}/me`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Don't logout on user data failure - user can still use the app with JWT permissions
        console.warn('⚠️ User data fetch failed, continuing with JWT permissions only');
        setAuthState(prev => ({ ...prev, userDataLoading: false }));
        return;
      }

      const userData = await response.json();
      
      setAuthState(prev => ({ 
        ...prev, 
        user: enhanceUserWithLocationAccess(userData),
        userDataLoading: false
      }));

      console.log('✅ User data loaded successfully');
    } catch (error) {
      console.warn('⚠️ Failed to load user data:', error);
      // Don't logout - user can still use app with permissions from JWT
      setAuthState(prev => ({ ...prev, userDataLoading: false }));
    }
  };

  /**
   * Initialize authentication state
   * Fast token refresh + async user data loading for better performance
   */
  const initializeAuth = async () => {
    try {
      console.log('🔄 Initializing authentication...');
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      // STEP 1: Fast token refresh (just verify token)
      const refreshSuccess = await refreshTokenOnly();
      console.log('🔄 Refresh token result:', refreshSuccess);
      
      if (refreshSuccess) {
        // STEP 2: Show authenticated layout immediately
        setAuthState(prev => ({ 
          ...prev, 
          isAuthenticated: true, 
          isLoading: false,
          accessToken: getAuthToken(),
          user: null  // User data loads async
        }));
        
        // STEP 3: Load user data asynchronously (non-blocking)
        loadUserDataAsync();
      } else {
        console.log('❌ Refresh failed, clearing auth state');
        performSilentLogout();
      }
    } catch (error) {
      console.error('❌ Auth initialization failed:', error);
      performSilentLogout();
    }
  };

  /**
   * Helper function to enhance user object with location access method
   */
  const enhanceUserWithLocationAccess = (userData: any): User => {
    const can_access_location = (locationId: string): boolean => {
      if (!userData) return false;
      
      // System and National admins have access to all locations
      if (userData.is_superuser || 
          userData.user_type === 'SYSTEM_USER' || 
          userData.user_type === 'NATIONAL_ADMIN') {
        return true;
      }
      
      // Provincial admin has access to locations in their province
      if (userData.user_type === 'PROVINCIAL_ADMIN') {
        // This would need to be enhanced with actual location-to-province mapping
        // For now, allow access if they have a scope_province
        return !!userData.scope_province;
      }
      
      // Location user can only access their primary location
      if (userData.user_type === 'LOCATION_USER') {
        return userData.primary_location_id === locationId;
      }
      
      return false;
    };

    return {
      ...userData,
      roles: userData.roles || [],
      permissions: userData.permissions || [],
      can_access_location
    };
  };

  /**
   * Login user with username and password
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
      
      // Also store in localStorage as fallback for page reloads
      localStorage.setItem('access_token', access_token);

      // Reset logout flag on successful login
      setIsLoggingOut(false);

      // Set authenticated state but trigger skeleton loading for consistency
      setAuthState({
        user: null, // Clear user to trigger skeleton
        isAuthenticated: true,
        isLoading: false,
        accessToken: access_token,
        userDataLoading: true, // Trigger skeleton loading
      });

      // Load user data asynchronously to show skeleton briefly
      setTimeout(() => {
        setAuthState(prev => ({
          ...prev,
          user: enhanceUserWithLocationAccess(user),
          userDataLoading: false,
        }));
      }, 100); // Brief delay to ensure skeleton shows

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
    
    // Clear auth token from localStorage
    localStorage.removeItem('access_token');
    
    // Clear auth state
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      accessToken: null,
      userDataLoading: false,
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
   * Legacy method that includes user data loading (used by interval refresh)
   */
  const refreshToken = async (): Promise<boolean> => {
    try {
      // Use the fast token refresh
      const tokenSuccess = await refreshTokenOnly();
      if (!tokenSuccess) {
        return false;
      }

      // For interval refresh, we want to update user data as well
      try {
        const userController = new AbortController();
        const userTimeoutId = setTimeout(() => userController.abort(), 10000);
        
        const userResponse = await fetch(`${API_ENDPOINTS.auth}/me`, {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
          },
          credentials: 'include',
          signal: userController.signal,
        });

        clearTimeout(userTimeoutId);

        if (userResponse.ok) {
          const userData = await userResponse.json();
          
          // Update auth state with new token and user data
          setAuthState(prev => ({
            ...prev,
            user: enhanceUserWithLocationAccess(userData),
            isAuthenticated: true,
            isLoading: false,
            accessToken: getAuthToken(),
            userDataLoading: false,
          }));
        } else {
          // Token is valid but user data failed - continue without user data
          setAuthState(prev => ({
            ...prev,
            isAuthenticated: true,
            isLoading: false,
            accessToken: getAuthToken(),
            userDataLoading: false,
          }));
        }
      } catch (userError) {
        console.warn('⚠️ User data update failed during interval refresh:', userError);
        // Continue with just token - user data will be available from JWT claims
      }

      console.log('✅ Token refresh successful (interval)');
      return true;
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      return false;
    }
  };

  /**
   * Check if user has specific permission
   * Falls back to JWT claims during async user loading for better UX
   */
  const hasPermission = (permission: string): boolean => {
    // If user data is loaded, use it for permission checks
    if (authState.user) {
      if (authState.user.is_superuser) return true;
      return authState.user.permissions.includes(permission);
    }
    
    // During async user loading, try to get permissions from JWT token claims
    // This provides better UX by avoiding "Access Denied" flashes
    if (authState.isAuthenticated && authState.accessToken) {
      try {
        // Parse JWT payload (basic client-side parsing for permissions)
        const token = authState.accessToken;
        const payload = JSON.parse(atob(token.split('.')[1]));
        const permissions = payload.permissions || [];
        
        // Check if user is superuser from JWT
        if (payload.is_superuser) return true;
        
        return permissions.includes(permission);
      } catch (error) {
        // If JWT parsing fails, fall back to false during loading
        console.warn('Failed to parse JWT for permissions during loading:', error);
        return false;
      }
    }
    
    return false;
  };

  /**
   * Check if user has specific role
   * Falls back to JWT claims during async user loading for better UX
   */
  const hasRole = (role: string): boolean => {
    // If user data is loaded, use it for role checks
    if (authState.user) {
      if (authState.user.is_superuser) return true;
      return authState.user.roles.some(userRole => userRole.name === role || userRole.display_name === role);
    }
    
    // During async user loading, try to get roles from JWT token claims
    if (authState.isAuthenticated && authState.accessToken) {
      try {
        // Parse JWT payload (basic client-side parsing for roles)
        const token = authState.accessToken;
        const payload = JSON.parse(atob(token.split('.')[1]));
        const roles = payload.roles || [];
        
        // Check if user is superuser from JWT
        if (payload.is_superuser) return true;
        
        return roles.includes(role);
      } catch (error) {
        // If JWT parsing fails, fall back to false during loading
        console.warn('Failed to parse JWT for roles during loading:', error);
        return false;
      }
    }
    
    return false;
  };

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some(role => hasRole(role));
  };

  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    refreshToken,
    loadUserDataAsync,
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
