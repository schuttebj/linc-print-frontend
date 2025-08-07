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
  // Sample data for license categories (monotone blues)
  const licenseCategoriesData = [
    { category: 'Category A', count: 8542, color: BLUE.main },
    { category: 'Category B', count: 15632, color: BLUE.mid },
    { category: 'Category C', count: 12845, color: BLUE.light },
    { category: "Learner's", count: 5234, color: BLUE.dark },
    { category: 'Professional', count: 3125, color: BLUE.xlight }
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
    { status: 'Active', count: 45632, color: BLUE.main },
    { status: 'Expiring Soon', count: 3456, color: BLUE.mid },
    { status: 'Expired', count: 1234, color: BLUE.light },
    { status: 'Suspended', count: 234, color: BLUE.dark }
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
              <defs>
                <linearGradient id="barBlueH" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={BLUE.light} stopOpacity={0.6} />
                  <stop offset="100%" stopColor={BLUE.main} stopOpacity={0.9} />
                </linearGradient>
              </defs>
              <Bar dataKey="count" fill="url(#barBlueH)">
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
              <defs>
                <linearGradient id="areaBL1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BLUE.xlight} stopOpacity={0.6}/>
                  <stop offset="95%" stopColor={BLUE.xlight} stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="areaBL2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BLUE.light} stopOpacity={0.6}/>
                  <stop offset="95%" stopColor={BLUE.light} stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="areaBL3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BLUE.mid} stopOpacity={0.6}/>
                  <stop offset="95%" stopColor={BLUE.mid} stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="areaBL4" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BLUE.main} stopOpacity={0.6}/>
                  <stop offset="95%" stopColor={BLUE.main} stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="newIssues" stackId="1" stroke={BLUE.main} fill="url(#areaBL4)" name="New Issues" />
              <Area type="monotone" dataKey="renewals" stackId="1" stroke={BLUE.mid} fill="url(#areaBL3)" name="Renewals" />
              <Area type="monotone" dataKey="expiring" stackId="1" stroke={BLUE.light} fill="url(#areaBL2)" name="Expiring Soon" />
              <Area type="monotone" dataKey="expired" stackId="1" stroke={BLUE.xlight} fill="url(#areaBL1)" name="Expired" />
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
              <defs>
                <linearGradient id="barBlueV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BLUE.light} stopOpacity={0.6} />
                  <stop offset="100%" stopColor={BLUE.main} stopOpacity={0.9} />
                </linearGradient>
              </defs>
              <Bar dataKey="licenses" fill="url(#barBlueV)" name="licenses" />
            </BarChart>
          </ResponsiveContainer>
        </ChartWidget>
      </Grid>
    </Grid>
  );
};

export default LicenseAnalytics;