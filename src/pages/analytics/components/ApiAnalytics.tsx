/**
 * API Analytics Component for Madagascar License System
 * Displays comprehensive API request analytics from the middleware audit logs
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon
} from '@mui/icons-material';
import { API_ENDPOINTS, api } from '../../../config/api';

interface ApiAnalyticsData {
  period: {
    start_time: string;
    end_time: string;
    hours: number;
  };
  overview: {
    total_requests: number;
    successful_requests: number;
    success_rate_percent: number;
    average_response_time_ms: number;
  };
  top_endpoints: Array<{
    endpoint: string;
    request_count: number;
    avg_duration_ms: number;
  }>;
  status_code_distribution: Array<{
    status_code: number;
    count: number;
  }>;
  slowest_endpoints: Array<{
    endpoint: string;
    avg_duration_ms: number;
    max_duration_ms: number;
    request_count: number;
  }>;
  most_active_users: Array<{
    user_id: string;
    request_count: number;
  }>;
  error_analysis: Array<{
    endpoint: string;
    total_requests: number;
    error_requests: number;
    error_rate_percent: number;
  }>;
}

interface ApiAnalyticsProps {
  dateRange?: string;
  location?: string;
}

const ApiAnalytics: React.FC<ApiAnalyticsProps> = ({ dateRange = '24hours' }) => {
  const [data, setData] = useState<ApiAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoursFilter, setHoursFilter] = useState(24);

  useEffect(() => {
    loadApiAnalytics();
  }, [hoursFilter]);

  const loadApiAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get<ApiAnalyticsData>(
        `${API_ENDPOINTS.apiRequestAnalytics}?hours=${hoursFilter}`
      );
      
      setData(response);
    } catch (err) {
      console.error('Failed to load API analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load API analytics');
    } finally {
      setLoading(false);
    }
  };

  const getStatusCodeColor = (statusCode: number): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    if (statusCode >= 200 && statusCode < 300) return 'success';
    if (statusCode >= 300 && statusCode < 400) return 'info';
    if (statusCode >= 400 && statusCode < 500) return 'warning';
    if (statusCode >= 500) return 'error';
    return 'default';
  };

  const formatDuration = (durationMs: number): string => {
    if (durationMs < 1000) return `${Math.round(durationMs)}ms`;
    return `${(durationMs / 1000).toFixed(2)}s`;
  };

  const formatEndpoint = (endpoint: string): string => {
    // Shorten long endpoints for display
    if (endpoint.length > 40) {
      return `...${endpoint.substring(endpoint.length - 37)}`;
    }
    return endpoint;
  };

  const getHealthColor = (value: number, thresholds: { good: number; warning: number }): string => {
    if (value >= thresholds.good) return '#4caf50'; // Green
    if (value >= thresholds.warning) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress size={40} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading API Analytics...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        <Typography variant="h6">Error Loading API Analytics</Typography>
        <Typography variant="body2">{error}</Typography>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert severity="info">
        <Typography variant="h6">No API Analytics Data</Typography>
        <Typography variant="body2">No API request data available for the selected period.</Typography>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header with Time Filter */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          API Performance Analytics
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Time Period</InputLabel>
          <Select
            value={hoursFilter}
            onChange={(e) => setHoursFilter(Number(e.target.value))}
            label="Time Period"
          >
            <MenuItem value={1}>Last Hour</MenuItem>
            <MenuItem value={24}>Last 24 Hours</MenuItem>
            <MenuItem value={72}>Last 3 Days</MenuItem>
            <MenuItem value={168}>Last Week</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h4" color="primary.main">
                    {data.overview.total_requests.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Requests
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SuccessIcon color="success" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {data.overview.success_rate_percent.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Success Rate
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SpeedIcon color="info" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h4" color="info.main">
                    {formatDuration(data.overview.average_response_time_ms)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Response Time
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ErrorIcon color="error" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h4" color="error.main">
                    {data.overview.total_requests - data.overview.successful_requests}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Failed Requests
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {/* Top Endpoints */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Most Active Endpoints
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Endpoint</TableCell>
                      <TableCell align="right">Requests</TableCell>
                      <TableCell align="right">Avg Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.top_endpoints.slice(0, 8).map((endpoint, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {formatEndpoint(endpoint.endpoint)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={endpoint.request_count} 
                            size="small" 
                            color="primary"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {formatDuration(endpoint.avg_duration_ms)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Status Code Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Response Status Distribution
              </Typography>
              {data.status_code_distribution.map((status, index) => {
                const percentage = (status.count / data.overview.total_requests) * 100;
                return (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Chip 
                        label={`${status.status_code}`}
                        color={getStatusCodeColor(status.status_code)}
                        size="small"
                      />
                      <Typography variant="body2">
                        {status.count} ({percentage.toFixed(1)}%)
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={percentage} 
                      sx={{ 
                        height: 8, 
                        borderRadius: 1,
                        backgroundColor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getHealthColor(
                            status.status_code, 
                            { good: 200, warning: 300 }
                          )
                        }
                      }} 
                    />
                  </Box>
                );
              })}
            </CardContent>
          </Card>
        </Grid>

        {/* Slowest Endpoints */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Slowest Endpoints
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Endpoint</TableCell>
                      <TableCell align="right">Avg Time</TableCell>
                      <TableCell align="right">Max Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.slowest_endpoints.slice(0, 8).map((endpoint, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {formatEndpoint(endpoint.endpoint)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography 
                            variant="body2" 
                            color={endpoint.avg_duration_ms > 2000 ? 'error.main' : 'text.primary'}
                          >
                            {formatDuration(endpoint.avg_duration_ms)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography 
                            variant="body2" 
                            color={endpoint.max_duration_ms > 5000 ? 'error.main' : 'text.primary'}
                          >
                            {formatDuration(endpoint.max_duration_ms)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Error Analysis */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Error Analysis
              </Typography>
              {data.error_analysis.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Endpoint</TableCell>
                        <TableCell align="right">Error Rate</TableCell>
                        <TableCell align="right">Errors/Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.error_analysis.slice(0, 6).map((error, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                              {formatEndpoint(error.endpoint)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip 
                              label={`${error.error_rate_percent.toFixed(1)}%`}
                              color={error.error_rate_percent > 10 ? 'error' : 'warning'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">
                              {error.error_requests}/{error.total_requests}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="success">
                  <Typography variant="body2">No errors detected in this period!</Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ApiAnalytics;
