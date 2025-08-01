/**
 * Analytics Data Hook
 * Custom hook for fetching and managing analytics data
 */

import { useState, useEffect, useCallback } from 'react';

interface AnalyticsData {
  applications: any;
  licenses: any;
  printing: any;
  financial: any;
  system: any;
}

export const useAnalyticsData = (dateRange: string, selectedLocation: string) => {
  const [data, setData] = useState<AnalyticsData>({
    applications: {},
    licenses: {},
    printing: {},
    financial: {},
    system: {}
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulate API call to fetch analytics data
  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock data based on filters
      const mockData: AnalyticsData = {
        applications: generateApplicationsData(dateRange, selectedLocation),
        licenses: generateLicensesData(dateRange, selectedLocation),
        printing: generatePrintingData(dateRange, selectedLocation),
        financial: generateFinancialData(dateRange, selectedLocation),
        system: generateSystemData()
      };

      setData(mockData);
    } catch (err) {
      setError('Failed to fetch analytics data');
      console.error('Analytics data fetch error:', err);
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
const generateApplicationsData = (dateRange: string, location: string) => {
  const baseCount = location === 'all' ? 1000 : 300;
  const multiplier = getDateRangeMultiplier(dateRange);
  
  return {
    totalApplications: Math.floor(baseCount * multiplier),
    pendingApplications: Math.floor(baseCount * multiplier * 0.15),
    approvedApplications: Math.floor(baseCount * multiplier * 0.75),
    rejectedApplications: Math.floor(baseCount * multiplier * 0.10),
  };
};

const generateLicensesData = (dateRange: string, location: string) => {
  const baseCount = location === 'all' ? 45000 : 12000;
  const multiplier = getDateRangeMultiplier(dateRange);
  
  return {
    totalLicenses: Math.floor(baseCount * multiplier),
    activeLicenses: Math.floor(baseCount * multiplier * 0.85),
    expiringLicenses: Math.floor(baseCount * multiplier * 0.10),
    expiredLicenses: Math.floor(baseCount * multiplier * 0.05),
  };
};

const generatePrintingData = (dateRange: string, location: string) => {
  const baseCount = location === 'all' ? 1500 : 400;
  const multiplier = getDateRangeMultiplier(dateRange);
  
  return {
    totalPrintJobs: Math.floor(baseCount * multiplier),
    completedJobs: Math.floor(baseCount * multiplier * 0.92),
    pendingJobs: Math.floor(baseCount * multiplier * 0.05),
    failedJobs: Math.floor(baseCount * multiplier * 0.03),
  };
};

const generateFinancialData = (dateRange: string, location: string) => {
  const baseRevenue = location === 'all' ? 100000 : 25000;
  const multiplier = getDateRangeMultiplier(dateRange);
  
  return {
    totalRevenue: Math.floor(baseRevenue * multiplier),
    applicationFees: Math.floor(baseRevenue * multiplier * 0.35),
    licenseFees: Math.floor(baseRevenue * multiplier * 0.45),
    cardFees: Math.floor(baseRevenue * multiplier * 0.15),
    otherFees: Math.floor(baseRevenue * multiplier * 0.05),
  };
};

const generateSystemData = () => {
  return {
    apiResponseTime: Math.floor(Math.random() * 100 + 200), // 200-300ms
    databasePerformance: Math.floor(Math.random() * 50 + 95), // 95-100%
    storageUsage: Math.floor(Math.random() * 20 + 60), // 60-80%
    errorRate: Math.random() * 0.5, // 0-0.5%
    uptime: 99.5 + Math.random() * 0.5, // 99.5-100%
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