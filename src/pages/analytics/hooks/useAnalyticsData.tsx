/**
 * Analytics Data Hook
 * Custom hook for fetching and managing analytics data with tab support
 */

import { useState, useEffect, useCallback } from 'react';
import { analyticsService, type AnalyticsFilters } from '../../../services/analyticsService';

interface KPIData {
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  totalLicenses: number;
  activeLicenses: number;
  expiringLicenses: number;
  expiredLicenses: number;
  totalPrintJobs: number;
  completedJobs: number;
  pendingJobs: number;
  failedJobs: number;
  totalRevenue: number;
  applicationFees: number;
  licenseFees: number;
  cardFees: number;
  otherFees: number;
}

interface ChartData {
  applications: any[];
  licenses: any[];
  printing: any[];
  financial: any[];
  system: any[];
  api: any[];
}

interface AnalyticsData {
  kpi: KPIData;
  charts: ChartData;
  systemHealth: any;
  activityFeed: any[];
  lastUpdated: Date;
}

export const useAnalyticsData = (dateRange: string, selectedLocation: string) => {
  const [data, setData] = useState<AnalyticsData>({
    kpi: {} as KPIData,
    charts: {
      applications: [],
      licenses: [],
      printing: [],
      financial: [],
      system: [],
      api: []
    },
    systemHealth: {},
    activityFeed: [],
    lastUpdated: new Date()
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch real analytics data from API
  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Format filters for API
      const filters: AnalyticsFilters = {
        date_range: dateRange,
        location_id: selectedLocation === 'all' ? null : parseInt(selectedLocation)
      };

      console.log('🔍 Fetching analytics data with filters:', filters);

      // Fetch data from multiple endpoints in parallel
      console.log('🔄 Starting parallel API calls...');
      
      const [
        kpiSummary,
        applicationTrends,
        licenseTrends,
        printingTrends,
        financialTrends,
        systemHealth,
        recentActivity
      ] = await Promise.all([
        analyticsService.getKPISummary(filters).catch(err => {
          console.error('❌ KPI Summary failed:', err);
          throw err;
        }),
        analyticsService.getApplicationTrends(filters).catch(err => {
          console.error('❌ Application Trends failed:', err);
          return { data: [], metadata: {} };
        }),
        analyticsService.getLicenseTrends(filters).catch(err => {
          console.error('❌ License Trends failed:', err);
          return { data: [], metadata: {} };
        }),
        analyticsService.getPrintingTrends(filters).catch(err => {
          console.error('❌ Printing Trends failed:', err);
          return { data: [], metadata: {} };
        }),
        analyticsService.getFinancialTrends(filters).catch(err => {
          console.error('❌ Financial Trends failed:', err);
          return { data: [], metadata: {} };
        }),
        analyticsService.getSystemHealth().catch(err => {
          console.error('❌ System Health failed:', err);
          return { data: {} };
        }),
        analyticsService.getRecentActivity({ limit: 10 }).catch(err => {
          console.error('❌ Recent Activity failed:', err);
          return { data: { activities: [] } };
        })
      ]);

      console.log('✅ Analytics data fetched successfully:', {
        kpiSummary: kpiSummary ? 'OK' : 'FAILED',
        applicationTrends: applicationTrends ? 'OK' : 'FAILED',
        licenseTrends: licenseTrends ? 'OK' : 'FAILED',
        printingTrends: printingTrends ? 'OK' : 'FAILED',
        financialTrends: financialTrends ? 'OK' : 'FAILED',
        systemHealth: systemHealth ? 'OK' : 'FAILED',
        recentActivity: recentActivity ? 'OK' : 'FAILED'
      });

      // Transform API data to match our interface
      const analyticsData: AnalyticsData = {
        kpi: {
          totalApplications: kpiSummary.data.applications.total,
          pendingApplications: kpiSummary.data.applications.pending || 0,
          approvedApplications: kpiSummary.data.applications.approved || 0,
          rejectedApplications: kpiSummary.data.applications.rejected || 0,
          totalLicenses: kpiSummary.data.licenses.total,
          activeLicenses: kpiSummary.data.licenses.active || 0,
          expiringLicenses: kpiSummary.data.licenses.expiring || 0,
          expiredLicenses: kpiSummary.data.licenses.expired || 0,
          totalPrintJobs: kpiSummary.data.printing.total_jobs || 0,
          completedJobs: kpiSummary.data.printing.completed || 0,
          pendingJobs: kpiSummary.data.printing.pending || 0,
          failedJobs: kpiSummary.data.printing.failed || 0,
          totalRevenue: kpiSummary.data.financial.total_revenue || 0,
          applicationFees: kpiSummary.data.financial.application_fees || 0,
          licenseFees: kpiSummary.data.financial.license_fees || 0,
          cardFees: kpiSummary.data.financial.card_fees || 0,
          otherFees: kpiSummary.data.financial.other_fees || 0
        },
        charts: {
          applications: applicationTrends.data || [],
          licenses: licenseTrends.data || [],
          printing: printingTrends.data || [],
          financial: financialTrends.data || [],
          system: [], // System-level charts would go here
          api: [] // API performance charts would go here
        },
        systemHealth: systemHealth.data,
        activityFeed: recentActivity.data.activities,
        lastUpdated: new Date()
      };

      setData(analyticsData);

    } catch (err) {
      console.error('❌ Analytics data fetch error:', err);
      setError('Failed to fetch analytics data');
      
      // Fall back to empty data on error
      const fallbackData: AnalyticsData = {
        kpi: {
          totalApplications: 0,
          pendingApplications: 0,
          approvedApplications: 0,
          rejectedApplications: 0,
          totalLicenses: 0,
          activeLicenses: 0,
          expiringLicenses: 0,
          expiredLicenses: 0,
          totalPrintJobs: 0,
          completedJobs: 0,
          pendingJobs: 0,
          failedJobs: 0,
          totalRevenue: 0,
          applicationFees: 0,
          licenseFees: 0,
          cardFees: 0,
          otherFees: 0
        },
        charts: {
          applications: [],
          licenses: [],
          printing: [],
          financial: [],
          system: [],
          api: []
        },
        systemHealth: {},
        activityFeed: [],
        lastUpdated: new Date()
      };
      setData(fallbackData);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedLocation]);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    fetchAnalyticsData();

    const interval = setInterval(() => {
      fetchAnalyticsData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchAnalyticsData]);

  // Manual refresh function
  const refreshData = useCallback(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  return {
    data,
    loading,
    error,
    refreshData
  };
};

// Mock data generators based on filters
const generateKPIData = (dateRange: string, location: string): KPIData => {
  const locationMultiplier = location === 'all' ? 1 : 0.3;
  const timeMultiplier = getDateRangeMultiplier(dateRange);
  
  // Base numbers for applications
  const baseApplications = 1000;
  const totalApps = Math.floor(baseApplications * locationMultiplier * timeMultiplier);
  
  // Base numbers for licenses
  const baseLicenses = 45000;
  const totalLicenses = Math.floor(baseLicenses * locationMultiplier);
  
  // Base numbers for printing
  const basePrintJobs = 1500;
  const totalJobs = Math.floor(basePrintJobs * locationMultiplier * timeMultiplier);
  
  // Base numbers for revenue
  const baseRevenue = 100000;
  const totalRev = Math.floor(baseRevenue * locationMultiplier * timeMultiplier);
  
  return {
    totalApplications: totalApps,
    pendingApplications: Math.floor(totalApps * 0.15),
    approvedApplications: Math.floor(totalApps * 0.75),
    rejectedApplications: Math.floor(totalApps * 0.10),
    totalLicenses: totalLicenses,
    activeLicenses: Math.floor(totalLicenses * 0.85),
    expiringLicenses: Math.floor(totalLicenses * 0.10),
    expiredLicenses: Math.floor(totalLicenses * 0.05),
    totalPrintJobs: totalJobs,
    completedJobs: Math.floor(totalJobs * 0.92),
    pendingJobs: Math.floor(totalJobs * 0.05),
    failedJobs: Math.floor(totalJobs * 0.03),
    totalRevenue: totalRev,
    applicationFees: Math.floor(totalRev * 0.35),
    licenseFees: Math.floor(totalRev * 0.45),
    cardFees: Math.floor(totalRev * 0.15),
    otherFees: Math.floor(totalRev * 0.05)
  };
};

const generateChartsData = (dateRange: string, location: string): ChartData => {
  // Generate sample time series data
  const timeMultiplier = getDateRangeMultiplier(dateRange);
  const locationMultiplier = location === 'all' ? 1 : 0.3;
  
  const daysCount = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 90;
  const applications = Array.from({ length: daysCount }, (_, i) => ({
    date: new Date(Date.now() - (daysCount - i) * 24 * 60 * 60 * 1000).toISOString(),
    newApps: Math.floor((Math.random() * 50 + 30) * locationMultiplier),
    completed: Math.floor((Math.random() * 45 + 25) * locationMultiplier),
    pending: Math.floor((Math.random() * 20 + 10) * locationMultiplier),
    rejected: Math.floor((Math.random() * 5 + 1) * locationMultiplier)
  }));

  const licenses = Array.from({ length: daysCount }, (_, i) => ({
    date: new Date(Date.now() - (daysCount - i) * 24 * 60 * 60 * 1000).toISOString(),
    issued: Math.floor((Math.random() * 25 + 15) * locationMultiplier),
    renewed: Math.floor((Math.random() * 20 + 10) * locationMultiplier),
    expired: Math.floor((Math.random() * 8 + 3) * locationMultiplier)
  }));

  const printing = Array.from({ length: daysCount }, (_, i) => ({
    date: new Date(Date.now() - (daysCount - i) * 24 * 60 * 60 * 1000).toISOString(),
    printed: Math.floor((Math.random() * 60 + 40) * locationMultiplier),
    pending: Math.floor((Math.random() * 10 + 5) * locationMultiplier),
    failed: Math.floor((Math.random() * 3 + 1) * locationMultiplier)
  }));

  const financial = Array.from({ length: daysCount }, (_, i) => ({
    date: new Date(Date.now() - (daysCount - i) * 24 * 60 * 60 * 1000).toISOString(),
    revenue: Math.floor((Math.random() * 5000 + 3000) * locationMultiplier),
    fees: Math.floor((Math.random() * 2000 + 1000) * locationMultiplier),
    costs: Math.floor((Math.random() * 1000 + 500) * locationMultiplier)
  }));

  const system = Array.from({ length: daysCount }, (_, i) => ({
    date: new Date(Date.now() - (daysCount - i) * 24 * 60 * 60 * 1000).toISOString(),
    responseTime: Math.floor(Math.random() * 100 + 200),
    uptime: 99.5 + Math.random() * 0.5,
    errorRate: Math.random() * 0.5
  }));

  const api = Array.from({ length: daysCount }, (_, i) => ({
    date: new Date(Date.now() - (daysCount - i) * 24 * 60 * 60 * 1000).toISOString(),
    requests: Math.floor((Math.random() * 1000 + 500) * locationMultiplier),
    successful: Math.floor((Math.random() * 950 + 450) * locationMultiplier),
    errors: Math.floor((Math.random() * 50 + 10) * locationMultiplier)
  }));

  return {
    applications,
    licenses,
    printing,
    financial,
    system,
    api
  };
};

const getDateRangeMultiplier = (dateRange: string): number => {
  switch (dateRange) {
    case '7days':
      return 0.2;
    case '30days':
      return 1;
    case '90days':
      return 3;
    case '6months':
      return 6;
    case '1year':
      return 12;
    default:
      return 1;
  }
};

export default useAnalyticsData;