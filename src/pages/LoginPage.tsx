/**
 * Login Page for Madagascar Driver's License System
 * Enhanced security with proper error handling and validation
 */

import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  OutlinedInput,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';

import { useAuth } from '../contexts/AuthContext';

// Validation schema
const loginSchema = yup.object({
  username: yup
    .string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters'),
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

interface LoginFormData {
  username: string;
  password: string;
}

// Custom LINC Logo Component
const LincLogo: React.FC<{ size?: number }> = ({ size = 64 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 231 231" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path 
      d="M230.43 15.94V149.39C230.43 158.19 223.29 165.33 214.49 165.33H191.11C182.31 165.33 175.17 158.19 175.17 149.39V136.29C175.17 127.49 168.03 120.35 159.23 120.35H126C117.2 120.35 110.06 113.21 110.06 104.41V71.18C110.06 62.38 102.92 55.24 94.1201 55.24H81.0201C72.2201 55.24 65.0801 48.1 65.0801 39.3V15.94C65.0801 7.14 72.2201 0 81.0201 0H214.47C223.27 0 230.41 7.14 230.41 15.94H230.43Z" 
      fill="#10367D"
    />
    <path 
      d="M165.33 191.12V214.5C165.33 223.3 158.19 230.44 149.39 230.44H15.94C7.14 230.44 0 223.3 0 214.5V81.0401C0 72.2401 7.14 65.1001 15.94 65.1001H39.32C48.12 65.1001 55.26 72.2401 55.26 81.0401V159.24C55.26 168.04 62.4 175.18 71.2 175.18H149.4C158.2 175.18 165.34 182.32 165.34 191.12H165.33Z" 
      fill="#10367D"
    />
  </svg>
);

const LoginPage: React.FC = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  // Redirect if already authenticated - always go to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (data: LoginFormData) => {
    try {
      setLoginError(null);
      const success = await login(data);
      
      if (success) {
        toast.success('Login successful!');
        // Navigation will be handled by the redirect above
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed. Please try again.';
      setLoginError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: '#f5f5f5',
        }}
      >
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #10367d 0%, #74b4da 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      p: 2
    }}>
      <Container maxWidth="sm">
        <Paper 
          elevation={0}
          sx={{ 
            bgcolor: 'white',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            borderRadius: 3,
            overflow: 'hidden',
            maxWidth: '400px',
            mx: 'auto'
          }}
        >
          {/* Header and Form Section */}
          <Box sx={{ p: 3 }}>
            {/* Logo and Title */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <LincLogo size={48} />
              <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600, mt: 1.5, mb: 0.5 }}>
                LINC License System
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                Driver's License Management Portal
              </Typography>
            </Box>

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Error Alert */}
              {loginError && (
                <Alert severity="error" sx={{ mb: 2, fontSize: '0.875rem' }}>
                  {loginError}
                </Alert>
              )}

              {/* Username Field */}
              <Box sx={{ mb: 2 }}>
                <Controller
                  name="username"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Username"
                      variant="outlined"
                      fullWidth
                      size="small"
                      error={!!errors.username}
                      helperText={errors.username?.message}
                      disabled={isSubmitting}
                      autoComplete="username"
                      autoFocus
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': {
                            borderWidth: '1px',
                            transition: 'border-color 0.2s ease-in-out',
                          },
                          '&:hover fieldset': {
                            borderWidth: '1px',
                          },
                          '&.Mui-focused fieldset': {
                            borderWidth: '1px',
                          },
                        },
                      }}
                    />
                  )}
                />
              </Box>

              {/* Password Field */}
              <Box sx={{ mb: 2 }}>
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth size="small" variant="outlined">
                      <InputLabel error={!!errors.password}>Password</InputLabel>
                      <OutlinedInput
                        {...field}
                        type={showPassword ? 'text' : 'password'}
                        error={!!errors.password}
                        disabled={isSubmitting}
                        autoComplete="current-password"
                        label="Password"
                        endAdornment={
                          <InputAdornment position="end">
                            <IconButton
                              onClick={togglePasswordVisibility}
                              edge="end"
                              disabled={isSubmitting}
                              size="small"
                            >
                              {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        }
                        sx={{
                          '& fieldset': {
                            borderWidth: '1px',
                            transition: 'border-color 0.2s ease-in-out',
                          },
                          '&:hover fieldset': {
                            borderWidth: '1px',
                          },
                          '&.Mui-focused fieldset': {
                            borderWidth: '1px',
                          },
                        }}
                      />
                      {errors.password && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, fontSize: '0.75rem' }}>
                          {errors.password.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Box>

              {/* Login Button */}
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="small"
                disabled={isSubmitting}
                sx={{
                  py: 1,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  mt: 1,
                }}
              >
                {isSubmitting ? (
                  <>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Demo Credentials */}
            <Box
              sx={{
                mt: 2,
                p: 1.5,
                backgroundColor: '#f8f9fa',
                borderRadius: 1,
                border: '1px solid #e0e0e0',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', mb: 1 }}>
                Demo Credentials:
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.75rem', mb: 0.25 }}>
                <strong>Admin:</strong> admin1 / password123
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.75rem', mb: 0.25 }}>
                <strong>Clerk:</strong> clerk1 / password123
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                <strong>Supervisor:</strong> supervisor1 / password123
              </Typography>
            </Box>

            {/* Footer */}
            <Box sx={{ 
              textAlign: 'center',
              mt: 2,
              pt: 2
            }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: '0.7rem' }}
              >
                © 2025 LINC Driver's License System
                <br />
                Secure • Modern • Efficient
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage; 