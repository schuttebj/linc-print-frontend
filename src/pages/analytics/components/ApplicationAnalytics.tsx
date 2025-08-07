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

  // Unified modern blue palette (subtle)
  const BLUE = {
    dark: '#1e3a8a',
    main: '#1d4ed8',
    mid: '#3b82f6',
    light: '#93c5fd',
    xlight: '#dbeafe'
  };

  // Sample data for application types (monochrome blues)
  const applicationTypesData = [
    { name: "Learner's License", value: 35, color: BLUE.main },
    { name: 'Driving License', value: 28, color: BLUE.mid },
    { name: 'Professional License', value: 15, color: BLUE.light },
    { name: 'Renewals', value: 12, color: BLUE.dark },
    { name: 'Duplicates', value: 6, color: BLUE.xlight },
    { name: 'Captures', value: 4, color: BLUE.mid }
  ];

  // Sample data for processing pipeline (funnel)
  const processingPipelineData = [
    { name: 'Submitted', value: 2847, fill: BLUE.xlight },
    { name: 'Under Review', value: 2156, fill: BLUE.light },
    { name: 'Approved', value: 1823, fill: BLUE.mid },
    { name: 'Completed', value: 1654, fill: BLUE.main }
  ];

  // Sample data for processing times
  const processingTimesData = [
    { type: "Learner's", avgDays: 2.3, color: BLUE.xlight },
    { type: 'Driving', avgDays: 5.7, color: BLUE.light },
    { type: 'Professional', avgDays: 8.2, color: BLUE.mid },
    { type: 'Renewal', avgDays: 1.8, color: BLUE.main },
    { type: 'Duplicate', avgDays: 1.2, color: BLUE.dark }
  ];

  const COLORS = [BLUE.xlight, BLUE.light, BLUE.mid, BLUE.main, BLUE.dark];

  return (
    <Grid container spacing={3}>
      {/* Application Volume Trends - stacked blue area with gradients */}
      <Grid item xs={12}>
        <ChartWidget 
          title="Application Volume Trends" 
          subtitle={`Daily application activities over the selected period`}
          height={350}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={applicationTrendsData}>
              <defs>
                <linearGradient id="areaBlue1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BLUE.xlight} stopOpacity={0.6}/>
                  <stop offset="95%" stopColor={BLUE.xlight} stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="areaBlue2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BLUE.light} stopOpacity={0.6}/>
                  <stop offset="95%" stopColor={BLUE.light} stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="areaBlue3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BLUE.mid} stopOpacity={0.6}/>
                  <stop offset="95%" stopColor={BLUE.mid} stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="areaBlue4" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BLUE.main} stopOpacity={0.6}/>
                  <stop offset="95%" stopColor={BLUE.main} stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis />
              <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString()} />
              <Legend />
              <Area type="monotone" dataKey="newApps" stackId="1" stroke={BLUE.main} fill="url(#areaBlue4)" name="New Applications" />
              <Area type="monotone" dataKey="completed" stackId="1" stroke={BLUE.mid} fill="url(#areaBlue3)" name="Completed" />
              <Area type="monotone" dataKey="pending" stackId="1" stroke={BLUE.light} fill="url(#areaBlue2)" name="Pending" />
              <Area type="monotone" dataKey="rejected" stackId="1" stroke={BLUE.xlight} fill="url(#areaBlue1)" name="Rejected" />
            </AreaChart>
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
              <defs>
                <linearGradient id="barBlue" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={BLUE.light} stopOpacity={0.6} />
                  <stop offset="100%" stopColor={BLUE.main} stopOpacity={0.9} />
                </linearGradient>
              </defs>
              <Bar dataKey="avgDays" fill="url(#barBlue)">
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
                <defs>
                  <linearGradient id="funnelBlue" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={BLUE.xlight} stopOpacity={0.7} />
                    <stop offset="100%" stopColor={BLUE.main} stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <Bar dataKey="value" fill="url(#funnelBlue)">
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