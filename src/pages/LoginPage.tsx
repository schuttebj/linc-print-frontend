/**
 * Login Page for Madagascar Driver's License System
 * Enhanced security with proper error handling and validation
 */

import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  Stack,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff, AdminPanelSettings } from '@mui/icons-material';
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
        }}
      >
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #10367d 0%, #74b4da 100%)',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={3} alignItems="center">
              {/* Logo and Title */}
              <Box sx={{ textAlign: 'center' }}>
                <AdminPanelSettings
                  sx={{
                    fontSize: 64,
                    color: 'primary.main',
                    mb: 2,
                  }}
                />
                <Typography
                  variant="h4"
                  component="h1"
                  gutterBottom
                  sx={{
                    fontWeight: 600,
                    color: 'primary.main',
                  }}
                >
                  LINC License System
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mb: 3 }}
                >
                  Driver's License Management Portal
                </Typography>
              </Box>

              {/* Login Form */}
              <Box
                component="form"
                onSubmit={handleSubmit(onSubmit)}
                sx={{ width: '100%' }}
              >
                <Stack spacing={3}>
                  {/* Error Alert */}
                  {loginError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {loginError}
                    </Alert>
                  )}

                  {/* Username Field */}
                  <Controller
                    name="username"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Username"
                        variant="outlined"
                        fullWidth
                        error={!!errors.username}
                        helperText={errors.username?.message}
                        disabled={isSubmitting}
                        autoComplete="username"
                        autoFocus
                      />
                    )}
                  />

                  {/* Password Field */}
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        variant="outlined"
                        fullWidth
                        error={!!errors.password}
                        helperText={errors.password?.message}
                        disabled={isSubmitting}
                        autoComplete="current-password"
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={togglePasswordVisibility}
                                edge="end"
                                disabled={isSubmitting}
                              >
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />

                  {/* Login Button */}
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={isSubmitting}
                    sx={{
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      mt: 2,
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        Signing In...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </Stack>
              </Box>

              {/* Demo Credentials */}
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  backgroundColor: 'grey.50',
                  borderRadius: 2,
                  width: '100%',
                }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  Demo Credentials:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Admin:</strong> admin1 / password123
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Clerk:</strong> clerk1 / password123
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Supervisor:</strong> supervisor1 / password123
                </Typography>
              </Box>

              {/* Footer */}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ textAlign: 'center', mt: 2 }}
              >
                © 2025 LINC Driver's License System
                <br />
                Secure • Modern • Efficient
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default LoginPage; 