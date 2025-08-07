/**
 * Application Analytics Component
 * Charts and metrics related to license applications
 */

import React from 'react';
import { Grid, Box } from '@mui/material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts';

import ChartWidget from './ChartWidget';

interface ApplicationAnalyticsProps {
  dateRange: string;
  location: string;
}

const ApplicationAnalytics: React.FC<ApplicationAnalyticsProps> = ({
  dateRange,
  location
}) => {
  // Sample data for application trends
  const applicationTrendsData = [
    { date: '2024-01-01', newApps: 45, completed: 42, pending: 15, rejected: 3 },
    { date: '2024-01-02', newApps: 52, completed: 38, pending: 18, rejected: 2 },
    { date: '2024-01-03', newApps: 38, completed: 55, pending: 12, rejected: 4 },
    { date: '2024-01-04', newApps: 65, completed: 48, pending: 22, rejected: 1 },
    { date: '2024-01-05', newApps: 58, completed: 62, pending: 16, rejected: 3 },
    { date: '2024-01-06', newApps: 42, completed: 45, pending: 14, rejected: 2 },
    { date: '2024-01-07', newApps: 71, completed: 52, pending: 25, rejected: 5 }
  ];

  // Sample data for application types
  const applicationTypesData = [
    { name: "Learner's License", value: 35, color: '#1976d2' },
    { name: 'Driving License', value: 28, color: '#2e7d32' },
    { name: 'Professional License', value: 15, color: '#ed6c02' },
    { name: 'Renewals', value: 12, color: '#9c27b0' },
    { name: 'Duplicates', value: 6, color: '#0288d1' },
    { name: 'Captures', value: 4, color: '#d32f2f' }
  ];

  // Sample data for processing pipeline (funnel)
  const processingPipelineData = [
    { name: 'Submitted', value: 2847, fill: '#1976d2' },
    { name: 'Under Review', value: 2156, fill: '#2e7d32' },
    { name: 'Approved', value: 1823, fill: '#ed6c02' },
    { name: 'Completed', value: 1654, fill: '#388e3c' }
  ];

  // Sample data for processing times
  const processingTimesData = [
    { type: "Learner's", avgDays: 2.3, color: '#1976d2' },
    { type: 'Driving', avgDays: 5.7, color: '#2e7d32' },
    { type: 'Professional', avgDays: 8.2, color: '#ed6c02' },
    { type: 'Renewal', avgDays: 1.8, color: '#9c27b0' },
    { type: 'Duplicate', avgDays: 1.2, color: '#0288d1' }
  ];

  const COLORS = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#0288d1', '#d32f2f'];

  return (
    <Grid container spacing={3}>
      {/* Application Volume Trends */}
      <Grid item xs={12}>
        <ChartWidget 
          title="Application Volume Trends" 
          subtitle={`Daily application activities over the selected period`}
          height={350}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={applicationTrendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="newApps" 
                stroke="#1976d2" 
                strokeWidth={2}
                name="New Applications"
                dot={{ fill: '#1976d2', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="completed" 
                stroke="#2e7d32" 
                strokeWidth={2}
                name="Completed"
                dot={{ fill: '#2e7d32', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="pending" 
                stroke="#ed6c02" 
                strokeWidth={2}
                name="Pending"
                dot={{ fill: '#ed6c02', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="rejected" 
                stroke="#d32f2f" 
                strokeWidth={2}
                name="Rejected"
                dot={{ fill: '#d32f2f', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartWidget>
      </Grid>

      {/* Application Types Distribution */}
      <Grid item xs={12} md={6}>
        <ChartWidget 
          title="Application Types Distribution" 
          subtitle="Breakdown by application type"
          height={300}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={applicationTypesData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {applicationTypesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartWidget>
      </Grid>

      {/* Processing Times */}
      <Grid item xs={12} md={6}>
        <ChartWidget 
          title="Average Processing Times" 
          subtitle="Time from submission to completion by type"
          height={300}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={processingTimesData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="type" type="category" width={80} />
              <Tooltip formatter={(value) => [`${value} days`, 'Avg Processing Time']} />
              <Bar dataKey="avgDays" fill="#8884d8">
                {processingTimesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartWidget>
      </Grid>

      {/* Processing Pipeline */}
      <Grid item xs={12}>
        <ChartWidget 
          title="Application Processing Pipeline" 
          subtitle="Applications by processing status (funnel view)"
          height={250}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processingPipelineData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8">
                  {processingPipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </ChartWidget>
      </Grid>
    </Grid>
  );
};

export default ApplicationAnalytics;