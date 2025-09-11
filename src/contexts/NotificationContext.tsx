/**
 * Global Notification Context
 * Provides app-wide notification system that persists across navigation
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Snackbar, Alert, Slide, SlideProps } from '@mui/material';

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number; // milliseconds, default 4000
  action?: React.ReactNode;
}

interface NotificationContextType {
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  hideNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="left" />;
}

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const generateId = useCallback(() => {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = generateId();
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration || 4000,
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-dismiss after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        hideNotification(id);
      }, newNotification.duration);
    }
  }, [generateId]);

  const showSuccess = useCallback((message: string, duration = 4000) => {
    showNotification({ message, type: 'success', duration });
  }, [showNotification]);

  const showError = useCallback((message: string, duration = 6000) => {
    showNotification({ message, type: 'error', duration });
  }, [showNotification]);

  const showWarning = useCallback((message: string, duration = 5000) => {
    showNotification({ message, type: 'warning', duration });
  }, [showNotification]);

  const showInfo = useCallback((message: string, duration = 4000) => {
    showNotification({ message, type: 'info', duration });
  }, [showNotification]);

  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const value: NotificationContextType = {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideNotification,
    clearAllNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Render notifications - stack them vertically */}
      {notifications.map((notification, index) => (
        <Snackbar
          key={notification.id}
          open={true}
          onClose={() => hideNotification(notification.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          TransitionComponent={SlideTransition}
          sx={{
            // Stack multiple notifications vertically
            bottom: `${24 + (index * 80)}px !important`,
            zIndex: 1400 + index, // Ensure newer notifications appear on top
          }}
        >
          <Alert 
            onClose={() => hideNotification(notification.id)}
            severity={notification.type}
            variant="filled"
            sx={{ 
              width: '100%',
              maxWidth: '400px',
              backgroundColor: '#1976d2', // Material-UI primary blue
              color: 'white',
              '& .MuiAlert-message': {
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'white'
              },
              '& .MuiAlert-icon': {
                color: 'white'
              },
              '& .MuiAlert-action': {
                color: 'white',
                '& .MuiIconButton-root': {
                  color: 'white'
                }
              }
            }}
            action={notification.action}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
