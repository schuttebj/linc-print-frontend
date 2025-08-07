/**
 * License Analytics Component
 * Charts and metrics related to license management
 */

import React from 'react';
import { Grid, Box, Typography, Chip } from '@mui/material';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

import ChartWidget from './ChartWidget';

interface LicenseAnalyticsProps {
  dateRange: string;
  location: string;
}

const LicenseAnalytics: React.FC<LicenseAnalyticsProps> = ({
  dateRange,
  location
}) => {
  // Sample data for license categories
  const licenseCategoriesData = [
    { category: 'Category A', count: 8542, color: '#1976d2' },
    { category: 'Category B', count: 15632, color: '#2e7d32' },
    { category: 'Category C', count: 12845, color: '#ed6c02' },
    { category: "Learner's", count: 5234, color: '#9c27b0' },
    { category: 'Professional', count: 3125, color: '#0288d1' }
  ];

  // Sample data for license lifecycle
  const licenseLifecycleData = [
    { month: 'Jan', newIssues: 456, renewals: 234, expiring: 123, expired: 89 },
    { month: 'Feb', newIssues: 523, renewals: 287, expiring: 156, expired: 112 },
    { month: 'Mar', newIssues: 489, renewals: 312, expiring: 178, expired: 134 },
    { month: 'Apr', newIssues: 612, renewals: 356, expiring: 145, expired: 98 },
    { month: 'May', newIssues: 578, renewals: 389, expiring: 189, expired: 156 },
    { month: 'Jun', newIssues: 634, renewals: 423, expiring: 167, expired: 123 }
  ];

  // Sample data for geographic distribution
  const geographicData = [
    { region: 'Antananarivo', licenses: 18542, percentage: 40.6 },
    { region: 'Toamasina', licenses: 9823, percentage: 21.5 },
    { region: 'Antsirabe', licenses: 7234, percentage: 15.8 },
    { region: 'Mahajanga', licenses: 5634, percentage: 12.3 },
    { region: 'Fianarantsoa', licenses: 4509, percentage: 9.8 }
  ];

  // License status summary data
  const licenseStatusData = [
    { status: 'Active', count: 45632, color: '#2e7d32' },
    { status: 'Expiring Soon', count: 3456, color: '#ed6c02' },
    { status: 'Expired', count: 1234, color: '#d32f2f' },
    { status: 'Suspended', count: 234, color: '#9c27b0' }
  ];

  return (
    <Grid container spacing={3}>
      {/* License Status Summary */}
      <Grid item xs={12}>
        <ChartWidget 
          title="License Status Overview" 
          subtitle="Current status of all licenses in the system"
          height={120}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '100%' }}>
            {licenseStatusData.map((status, index) => (
              <Box key={status.status} sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: status.color }}>
                  {status.count.toLocaleString()}
                </Typography>
                <Chip 
                  label={status.status} 
                  size="small" 
                  sx={{ 
                    bgcolor: status.color + '20', 
                    color: status.color,
                    fontWeight: 600 
                  }} 
                />
              </Box>
            ))}
          </Box>
        </ChartWidget>
      </Grid>

      {/* License Categories Distribution */}
      <Grid item xs={12}>
        <ChartWidget 
          title="Active Licenses by Category" 
          subtitle="Distribution of issued licenses across categories"
          height={300}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={licenseCategoriesData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="category" type="category" width={80} />
              <Tooltip formatter={(value) => [value.toLocaleString(), 'Licenses']} />
              <Bar dataKey="count" fill="#8884d8">
                {licenseCategoriesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartWidget>
      </Grid>

      {/* License Lifecycle Trends */}
      <Grid item xs={12}>
        <ChartWidget 
          title="License Lifecycle Trends" 
          subtitle="New issues, renewals, and expirations over time"
          height={350}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={licenseLifecycleData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="newIssues" 
                stackId="1" 
                stroke="#8884d8" 
                fill="#8884d8"
                name="New Issues"
              />
              <Area 
                type="monotone" 
                dataKey="renewals" 
                stackId="1" 
                stroke="#82ca9d" 
                fill="#82ca9d"
                name="Renewals"
              />
              <Area 
                type="monotone" 
                dataKey="expiring" 
                stackId="1" 
                stroke="#ffc658" 
                fill="#ffc658"
                name="Expiring Soon"
              />
              <Area 
                type="monotone" 
                dataKey="expired" 
                stackId="1" 
                stroke="#ff7300" 
                fill="#ff7300"
                name="Expired"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartWidget>
      </Grid>

      {/* Geographic Distribution */}
      <Grid item xs={12}>
        <ChartWidget 
          title="Licenses by Region" 
          subtitle="Geographic distribution across Madagascar"
          height={300}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={geographicData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="region" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'licenses') {
                    return [value.toLocaleString(), 'Licenses'];
                  }
                  return [value + '%', 'Percentage'];
                }}
              />
              <Bar dataKey="licenses" fill="#1976d2" name="licenses" />
            </BarChart>
          </ResponsiveContainer>
        </ChartWidget>
      </Grid>
    </Grid>
  );
};

export default LicenseAnalytics;