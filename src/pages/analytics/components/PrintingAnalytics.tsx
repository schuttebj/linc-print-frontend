/**
 * Printing Analytics Component
 * Charts and metrics related to card printing and production
 */

import React from 'react';
import { Grid, Box, Typography, LinearProgress } from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  RadialBarChart,
  RadialBar
} from 'recharts';

import ChartWidget from './ChartWidget';

interface PrintingAnalyticsProps {
  dateRange: string;
  location: string;
}

const PrintingAnalytics: React.FC<PrintingAnalyticsProps> = ({
  dateRange,
  location
}) => {
  // Sample data for print queue performance
  const printQueueData = [
    { date: '2024-01-01', queued: 125, completed: 118, failed: 7, avgWaitHours: 2.3 },
    { date: '2024-01-02', queued: 134, completed: 128, failed: 6, avgWaitHours: 1.8 },
    { date: '2024-01-03', queued: 98, completed: 95, failed: 3, avgWaitHours: 1.5 },
    { date: '2024-01-04', queued: 156, completed: 149, failed: 7, avgWaitHours: 3.2 },
    { date: '2024-01-05', queued: 142, completed: 138, failed: 4, avgWaitHours: 2.1 },
    { date: '2024-01-06', queued: 89, completed: 87, failed: 2, avgWaitHours: 1.2 },
    { date: '2024-01-07', queued: 167, completed: 159, failed: 8, avgWaitHours: 2.8 }
  ];

  // Print quality metrics data
  const qualityMetrics = [
    { name: 'Pass Rate', value: 94.7, maxValue: 100, color: '#00ff00' },
    { name: 'Retry Rate', value: 4.2, maxValue: 10, color: '#ffc658' },
    { name: 'Defect Rate', value: 1.1, maxValue: 5, color: '#ff7300' }
  ];

  // Production efficiency by location
  const productionEfficiencyData = [
    { location: 'Antananarivo', completed: 456, inProgress: 23, failed: 8, pendingQA: 12 },
    { location: 'Toamasina', completed: 234, inProgress: 15, failed: 3, pendingQA: 8 },
    { location: 'Antsirabe', completed: 189, inProgress: 12, failed: 2, pendingQA: 5 },
    { location: 'Mahajanga', completed: 167, inProgress: 8, failed: 1, pendingQA: 4 }
  ];

  // Print job status distribution
  const printJobStatusData = [
    { status: 'Completed', count: 1046, color: '#00ff00' },
    { status: 'In Progress', count: 58, color: '#ffc658' },
    { status: 'Failed', count: 14, color: '#ff7300' },
    { status: 'Pending QA', count: 29, color: '#8884d8' }
  ];

  // Sample data for equipment utilization
  const equipmentData = [
    { printer: 'Printer A', utilization: 87, status: 'Active' },
    { printer: 'Printer B', utilization: 92, status: 'Active' },
    { printer: 'Printer C', utilization: 65, status: 'Maintenance' },
    { printer: 'Printer D', utilization: 78, status: 'Active' }
  ];

  return (
    <Grid container spacing={3}>
      {/* Print Quality Gauges */}
      <Grid item xs={12}>
        <ChartWidget 
          title="Print Quality Metrics" 
          subtitle="Quality assurance statistics"
          height={200}
        >
          <Grid container spacing={3} sx={{ height: '100%' }}>
            {qualityMetrics.map((metric, index) => (
              <Grid item xs={12} md={4} key={metric.name}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: metric.color, mb: 1 }}>
                    {metric.value}%
                  </Typography>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    {metric.name}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={(metric.value / metric.maxValue) * 100} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: metric.color,
                        borderRadius: 4
                      }
                    }}
                  />
                </Box>
              </Grid>
            ))}
          </Grid>
        </ChartWidget>
      </Grid>

      {/* Print Queue Performance */}
      <Grid item xs={12}>
        <ChartWidget 
          title="Print Queue Performance" 
          subtitle="Daily print job completion rates and wait times"
          height={350}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={printQueueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value, name) => {
                  if (name === 'avgWaitHours') {
                    return [`${value} hours`, 'Avg Wait Time'];
                  }
                  return [value, name];
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="queued" fill="#8884d8" name="Jobs Queued" />
              <Bar yAxisId="left" dataKey="completed" fill="#82ca9d" name="Jobs Completed" />
              <Bar yAxisId="left" dataKey="failed" fill="#ff7300" name="Jobs Failed" />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="avgWaitHours" 
                stroke="#ffc658" 
                strokeWidth={3}
                name="Avg Wait Time (hours)"
                dot={{ fill: '#ffc658', strokeWidth: 2, r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartWidget>
      </Grid>

      {/* Production Efficiency by Location */}
      <Grid item xs={12}>
        <ChartWidget 
          title="Production Efficiency by Location" 
          subtitle="Print job completion status across locations"
          height={300}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={productionEfficiencyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="location" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" stackId="a" fill="#00ff00" name="Completed" />
              <Bar dataKey="inProgress" stackId="a" fill="#ffc658" name="In Progress" />
              <Bar dataKey="failed" stackId="a" fill="#ff7300" name="Failed" />
              <Bar dataKey="pendingQA" stackId="a" fill="#8884d8" name="Pending QA" />
            </BarChart>
          </ResponsiveContainer>
        </ChartWidget>
      </Grid>

      {/* Equipment Utilization */}
      <Grid item xs={12}>
        <ChartWidget 
          title="Equipment Utilization" 
          subtitle="Printer utilization rates and status"
          height={250}
        >
          <Grid container spacing={2} sx={{ height: '100%', alignItems: 'center' }}>
            {equipmentData.map((equipment, index) => (
              <Grid item xs={12} md={3} key={equipment.printer}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {equipment.printer}
                  </Typography>
                  <Typography variant="h4" sx={{ 
                    fontWeight: 700, 
                    color: equipment.status === 'Active' ? '#00ff00' : '#ff7300',
                    mb: 1 
                  }}>
                    {equipment.utilization}%
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: equipment.status === 'Active' ? 'success.main' : 'warning.main',
                      fontWeight: 600
                    }}
                  >
                    {equipment.status}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={equipment.utilization} 
                    sx={{ 
                      mt: 1,
                      height: 6, 
                      borderRadius: 3,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: equipment.status === 'Active' ? '#00ff00' : '#ff7300',
                        borderRadius: 3
                      }
                    }}
                  />
                </Box>
              </Grid>
            ))}
          </Grid>
        </ChartWidget>
      </Grid>
    </Grid>
  );
};

export default PrintingAnalytics;