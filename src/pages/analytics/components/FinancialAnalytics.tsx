/**
 * Financial Analytics Component
 * Charts and metrics related to revenue and financial performance
 */

import React from 'react';
import { Grid, Box, Typography, Chip } from '@mui/material';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

import ChartWidget from './ChartWidget';

interface FinancialAnalyticsProps {
  dateRange: string;
  location: string;
}

const FinancialAnalytics: React.FC<FinancialAnalyticsProps> = ({
  dateRange,
  location
}) => {
  // Subtle blue palette
  const BLUE = {
    dark: '#1e3a8a',
    main: '#1d4ed8',
    mid: '#3b82f6',
    light: '#93c5fd',
    xlight: '#dbeafe'
  };

  // Revenue trends data
  const revenueTrendsData = [
    { month: 'Jan', applicationFees: 15420, licenseFees: 23150, cardFees: 8950, lateFees: 1200 },
    { month: 'Feb', applicationFees: 18250, licenseFees: 27340, cardFees: 10230, lateFees: 1450 },
    { month: 'Mar', applicationFees: 16890, licenseFees: 25670, cardFees: 9780, lateFees: 980 },
    { month: 'Apr', applicationFees: 21340, licenseFees: 31250, cardFees: 12450, lateFees: 1680 },
    { month: 'May', applicationFees: 19750, licenseFees: 29450, cardFees: 11320, lateFees: 1320 },
    { month: 'Jun', applicationFees: 22890, licenseFees: 33670, cardFees: 13210, lateFees: 1890 }
  ];

  // Fee collection by service type
  const feeCollectionData = [
    { service: 'New Applications', revenue: 125430, transactions: 1247, avgFee: 100.5 },
    { service: 'Renewals', revenue: 89670, transactions: 1123, avgFee: 79.9 },
    { service: 'Duplicates', revenue: 34560, transactions: 432, avgFee: 80.0 },
    { service: 'Rush Processing', revenue: 28950, transactions: 193, avgFee: 150.0 },
    { service: 'Late Fees', revenue: 8450, transactions: 169, avgFee: 50.0 }
  ];

  // Payment methods distribution
  const paymentMethodsData = [
    { method: 'Cash', value: 45, amount: 123450, color: BLUE.main },
    { method: 'Card', value: 32, amount: 87830, color: BLUE.mid },
    { method: 'Mobile Money', value: 18, amount: 49380, color: BLUE.light },
    { method: 'Bank Transfer', value: 5, amount: 13720, color: BLUE.dark }
  ];

  // Revenue targets and performance
  const revenueTargetsData = [
    { category: 'Application Fees', target: 300000, actual: 287450, percentage: 95.8 },
    { category: 'License Fees', target: 450000, actual: 467230, percentage: 103.8 },
    { category: 'Card Fees', target: 150000, actual: 142340, percentage: 94.9 },
    { category: 'Other Fees', target: 50000, actual: 34280, percentage: 68.6 }
  ];

  // Daily revenue breakdown
  const dailyRevenueData = [
    { day: 'Mon', revenue: 12450, transactions: 124 },
    { day: 'Tue', revenue: 15670, transactions: 156 },
    { day: 'Wed', revenue: 18920, transactions: 189 },
    { day: 'Thu', revenue: 16340, transactions: 163 },
    { day: 'Fri', revenue: 21230, transactions: 212 },
    { day: 'Sat', revenue: 8950, transactions: 89 },
    { day: 'Sun', revenue: 4560, transactions: 45 }
  ];

  const COLORS = [BLUE.xlight, BLUE.light, BLUE.mid, BLUE.main];

  // Calculate total revenue
  const totalRevenue = revenueTrendsData.reduce((acc, month) => 
    acc + month.applicationFees + month.licenseFees + month.cardFees + month.lateFees, 0
  );

  const formatCurrency = (value: number) => `₨ ${value.toLocaleString()}`;

  return (
    <Grid container spacing={3}>
      {/* Revenue Summary Cards */}
      <Grid item xs={12}>
        <ChartWidget 
          title="Revenue Summary" 
          subtitle={`Total revenue: ${formatCurrency(totalRevenue)} over selected period`}
          height={120}
        >
          <Grid container spacing={2} sx={{ height: '100%', alignItems: 'center' }}>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: BLUE.main }}>
                  {formatCurrency(125430)}
                </Typography>
                <Typography variant="body2" color="text.secondary">Application Fees</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: BLUE.mid }}>
                  {formatCurrency(170530)}
                </Typography>
                <Typography variant="body2" color="text.secondary">License Fees</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: BLUE.light }}>
                  {formatCurrency(65940)}
                </Typography>
                <Typography variant="body2" color="text.secondary">Card Fees</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: BLUE.dark }}>
                  {formatCurrency(8520)}
                </Typography>
                <Typography variant="body2" color="text.secondary">Other Fees</Typography>
              </Box>
            </Grid>
          </Grid>
        </ChartWidget>
      </Grid>

      {/* Revenue Trends */}
      <Grid item xs={12} lg={8}>
        <ChartWidget 
          title="Revenue Trends" 
          subtitle="Monthly revenue breakdown by fee type"
          height={350}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueTrendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `₨${(value/1000).toFixed(0)}K`} />
              <Tooltip formatter={(value) => [formatCurrency(value as number), '']} />
              <Legend />
              <defs>
                <linearGradient id="rev1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BLUE.xlight} stopOpacity={0.6}/>
                  <stop offset="95%" stopColor={BLUE.xlight} stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="rev2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BLUE.light} stopOpacity={0.6}/>
                  <stop offset="95%" stopColor={BLUE.light} stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="rev3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BLUE.mid} stopOpacity={0.6}/>
                  <stop offset="95%" stopColor={BLUE.mid} stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="rev4" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BLUE.main} stopOpacity={0.6}/>
                  <stop offset="95%" stopColor={BLUE.main} stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="applicationFees" stackId="1" stroke={BLUE.main} fill="url(#rev4)" name="Application Fees" />
              <Area type="monotone" dataKey="licenseFees" stackId="1" stroke={BLUE.mid} fill="url(#rev3)" name="License Fees" />
              <Area type="monotone" dataKey="cardFees" stackId="1" stroke={BLUE.light} fill="url(#rev2)" name="Card Fees" />
              <Area type="monotone" dataKey="lateFees" stackId="1" stroke={BLUE.xlight} fill="url(#rev1)" name="Late Fees" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartWidget>
      </Grid>

      {/* Payment Methods Distribution */}
      <Grid item xs={12} lg={4}>
        <ChartWidget 
          title="Payment Methods" 
          subtitle="Distribution by payment type"
          height={350}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={paymentMethodsData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ method, value }) => `${method}: ${value}%`}
              >
                {paymentMethodsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value}%`, name]} />
            </PieChart>
          </ResponsiveContainer>
        </ChartWidget>
      </Grid>

      {/* Fee Collection by Service */}
      <Grid item xs={12}>
        <ChartWidget 
          title="Revenue by Service Type" 
          subtitle="Revenue breakdown and average fees by service"
          height={300}
        >
          <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feeCollectionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="service" />
              <YAxis yAxisId="left" tickFormatter={(value) => `₨${(value/1000).toFixed(0)}K`} />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'revenue') return [formatCurrency(value as number), 'Revenue'];
                  if (name === 'transactions') return [value, 'Transactions'];
                  if (name === 'avgFee') return [formatCurrency(value as number), 'Avg Fee'];
                  return [value, name];
                }}
              />
              <Legend />
                <defs>
                  <linearGradient id="revBar" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={BLUE.light} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={BLUE.main} stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <Bar yAxisId="left" dataKey="revenue" fill="url(#revBar)" name="Revenue" />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="avgFee" 
                  stroke={BLUE.dark} 
                strokeWidth={3}
                name="Avg Fee"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartWidget>
      </Grid>

      {/* Daily Revenue Pattern */}
      <Grid item xs={12}>
        <ChartWidget 
          title="Daily Revenue Pattern" 
          subtitle="Average daily revenue and transaction volume"
          height={250}
        >
          <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyRevenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis yAxisId="left" tickFormatter={(value) => `₨${(value/1000).toFixed(0)}K`} />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'revenue') return [formatCurrency(value as number), 'Revenue'];
                  return [value, 'Transactions'];
                }}
              />
              <Legend />
                <defs>
                  <linearGradient id="dayRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BLUE.light} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={BLUE.main} stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <Bar yAxisId="left" dataKey="revenue" fill="url(#dayRev)" name="Daily Revenue" />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="transactions" 
                  stroke={BLUE.dark} 
                strokeWidth={2}
                name="Transactions"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartWidget>
      </Grid>
    </Grid>
  );
};

export default FinancialAnalytics;