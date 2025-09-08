/**
 * Analytics Service for Madagascar License System
 * Handles all API calls related to analytics and dashboard data
 */

import { api } from '../config/api';
import type { AxiosResponse } from 'axios';

// Analytics Data Types
export interface AnalyticsFilters {
  date_range?: string;
  location_id?: number | null;
  start_date?: string;
  end_date?: string;
}

export interface KPIData {
  total: number;
  pending?: number;
  approved?: number;
  rejected?: number;
  active?: number;
  expiring?: number;
  expired?: number;
  completed?: number;
  failed?: number;
  total_jobs?: number;
  total_revenue?: number;
  application_fees?: number;
  license_fees?: number;
  card_fees?: number;
  other_fees?: number;
  change_percent: number;
  trend: string;
  currency?: string;
}

export interface KPISummaryResponse {
  success: boolean;
  data: {
    applications: KPIData;
    licenses: KPIData;
    printing: KPIData;
    financial: KPIData;
    last_updated: string;
  };
  last_updated: string;
}

export interface TrendDataPoint {
  date: string;
  [key: string]: string | number;
}

export interface ChartDataResponse {
  success: boolean;
  data: TrendDataPoint[] | any[];
  metadata: {
    total_records?: number;
    date_range: string;
    location_id?: number | null;
    [key: string]: any;
  };
}

export interface AnalyticsResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  last_updated?: string;
}

export interface SystemHealth {
  api_performance: {
    avg_response_time_ms: number;
    uptime_percentage: number;
    error_rate_percentage: number;
    requests_per_minute: number;
  };
  database: {
    connection_pool_usage: number;
    query_performance_score: number;
    active_connections: number;
    slow_query_count: number;
  };
  storage: {
    disk_usage_percentage: number;
    document_storage_gb: number;
    backup_status: string;
    last_backup: string;
  };
  services: {
    biomini_agent_status: string;
    print_service_status: string;
    notification_service_status: string;
    background_jobs_pending: number;
  };
}

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  location: string;
  timestamp: string;
  severity: string;
}

export interface ActivityFeedResponse {
  success: boolean;
  data: {
    activities: ActivityItem[];
    total: number;
    page: number;
    per_page: number;
    has_more: boolean;
  };
  last_updated: string;
}

class AnalyticsService {
  private readonly BASE_URL = '/api/v1/analytics';

  // Helper method to build query string
  private buildQueryString(params: Record<string, any>): string {
    const queryString = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryString.append(key, value.toString());
      }
    });
    return queryString.toString();
  }

  // KPI Endpoints
  async getKPISummary(filters: AnalyticsFilters = {}): Promise<KPISummaryResponse> {
    const queryString = this.buildQueryString(filters);
    const url = `${this.BASE_URL}/kpi/summary${queryString ? `?${queryString}` : ''}`;
    
    console.log('🔍 Analytics KPI Summary call:', { url, filters });
    
    try {
      const result = await api.get<KPISummaryResponse>(url);
      console.log('✅ KPI Summary success:', result);
      return result;
    } catch (error) {
      console.error('❌ KPI Summary error:', error);
      throw error;
    }
  }

  async getApplicationKPI(filters: AnalyticsFilters = {}): Promise<AnalyticsResponse<KPIData>> {
    const queryString = this.buildQueryString(filters);
    const url = `${this.BASE_URL}/kpi/applications${queryString ? `?${queryString}` : ''}`;
    return await api.get<AnalyticsResponse<KPIData>>(url);
  }

  async getLicenseKPI(filters: AnalyticsFilters = {}): Promise<AnalyticsResponse<KPIData>> {
    const queryString = this.buildQueryString(filters);
    const url = `${this.BASE_URL}/kpi/licenses${queryString ? `?${queryString}` : ''}`;
    return await api.get<AnalyticsResponse<KPIData>>(url);
  }

  async getPrintingKPI(filters: AnalyticsFilters = {}): Promise<AnalyticsResponse<KPIData>> {
    const queryString = this.buildQueryString(filters);
    const url = `${this.BASE_URL}/kpi/printing${queryString ? `?${queryString}` : ''}`;
    return await api.get<AnalyticsResponse<KPIData>>(url);
  }

  async getFinancialKPI(filters: AnalyticsFilters = {}): Promise<AnalyticsResponse<KPIData>> {
    const queryString = this.buildQueryString(filters);
    const url = `${this.BASE_URL}/kpi/financial${queryString ? `?${queryString}` : ''}`;
    return await api.get<AnalyticsResponse<KPIData>>(url);
  }

  // Chart Data Endpoints
  async getApplicationTrends(filters: AnalyticsFilters = {}): Promise<ChartDataResponse> {
    const queryString = this.buildQueryString(filters);
    const url = `${this.BASE_URL}/charts/applications/trends${queryString ? `?${queryString}` : ''}`;
    
    console.log('🔍 Application Trends call:', { url, filters });
    
    try {
      const result = await api.get<ChartDataResponse>(url);
      console.log('✅ Application Trends success:', result);
      return result;
    } catch (error) {
      console.error('❌ Application Trends error:', error);
      throw error;
    }
  }

  async getApplicationTypeDistribution(filters: AnalyticsFilters = {}): Promise<ChartDataResponse> {
    const queryString = this.buildQueryString(filters);
    const url = `${this.BASE_URL}/charts/applications/types${queryString ? `?${queryString}` : ''}`;
    return await api.get<ChartDataResponse>(url);
  }

  async getProcessingPipeline(filters: AnalyticsFilters = {}): Promise<ChartDataResponse> {
    const queryString = this.buildQueryString(filters);
    const url = `${this.BASE_URL}/charts/applications/pipeline${queryString ? `?${queryString}` : ''}`;
    return await api.get<ChartDataResponse>(url);
  }

  // System Health Endpoints
  async getSystemHealth(): Promise<AnalyticsResponse<SystemHealth>> {
    const url = `${this.BASE_URL}/system/health`;
    
    console.log('🔍 System Health call:', { url });
    
    try {
      const result = await api.get<AnalyticsResponse<SystemHealth>>(url);
      console.log('✅ System Health success:', result);
      return result;
    } catch (error) {
      console.error('❌ System Health error:', error);
      throw error;
    }
  }

  // Activity Feed Endpoints
  async getRecentActivity(params: {
    limit?: number;
    offset?: number;
  } = {}): Promise<ActivityFeedResponse> {
    const queryString = this.buildQueryString(params);
    const url = `${this.BASE_URL}/activity/recent${queryString ? `?${queryString}` : ''}`;
    
    console.log('🔍 Recent Activity call:', { url, params });
    
    try {
      const result = await api.get<ActivityFeedResponse>(url);
      console.log('✅ Recent Activity success:', result);
      return result;
    } catch (error) {
      console.error('❌ Recent Activity error:', error);
      throw error;
    }
  }

  // Location Performance Endpoints (Admin only)
  async getLocationPerformance(filters: AnalyticsFilters = {}): Promise<ChartDataResponse> {
    const queryString = this.buildQueryString(filters);
    const url = `${this.BASE_URL}/locations/performance${queryString ? `?${queryString}` : ''}`;
    
    console.log('🔍 Location Performance call:', { url, filters });
    
    try {
      const result = await api.get<ChartDataResponse>(url);
      console.log('✅ Location Performance success:', result);
      return result;
    } catch (error) {
      console.error('❌ Location Performance error:', error);
      throw error;
    }
  }

  // Export Endpoints
  async exportAnalyticsData(exportRequest: {
    export_type: string;
    data_types: string[];
    date_range?: string;
    location_id?: number | null;
    email?: string;
  }): Promise<AnalyticsResponse<any>> {
    const url = `${this.BASE_URL}/export`;
    
    console.log('🔍 Export Analytics call:', { url, exportRequest });
    
    try {
      const result = await api.post<AnalyticsResponse<any>>(url, exportRequest);
      console.log('✅ Export Analytics success:', result);
      return result;
    } catch (error) {
      console.error('❌ Export Analytics error:', error);
      throw error;
    }
  }

  async getExportStatus(exportId: string): Promise<AnalyticsResponse<any>> {
    const url = `${this.BASE_URL}/export/${exportId}/status`;
    return await api.get<AnalyticsResponse<any>>(url);
  }

  // Utility method to format filters for API calls
  formatFiltersForAPI(filters: {
    dateRange?: string;
    location?: string | number;
    refreshInterval?: string;
    chartType?: string;
  }): AnalyticsFilters {
    const apiFilters: AnalyticsFilters = {};

    if (filters.dateRange) {
      apiFilters.date_range = filters.dateRange;
    }

    if (filters.location && filters.location !== 'all') {
      apiFilters.location_id = typeof filters.location === 'string' 
        ? parseInt(filters.location) 
        : filters.location;
    }

    return apiFilters;
  }

  // Helper method to get formatted KPI data for dashboard
  async getDashboardKPIData(filters: any): Promise<{
    totalApplications: string;
    activeLicenses: string;
    cardsPrinted: string;
    revenueGenerated: string;
    [key: string]: any;
  }> {
    try {
      const apiFilters = this.formatFiltersForAPI(filters);
      const kpiData = await this.getKPISummary(apiFilters);

      return {
        totalApplications: kpiData.data.applications.total.toLocaleString(),
        activeLicenses: kpiData.data.licenses.active?.toLocaleString() || '0',
        cardsPrinted: kpiData.data.printing.completed?.toLocaleString() || '0',
        revenueGenerated: `₨ ${kpiData.data.financial.total_revenue?.toLocaleString() || '0'}`,
        applicationsChangePercent: kpiData.data.applications.change_percent,
        applicationsTrend: kpiData.data.applications.trend,
        licensesChangePercent: kpiData.data.licenses.change_percent,
        licensesTrend: kpiData.data.licenses.trend,
        printingChangePercent: kpiData.data.printing.change_percent,
        printingTrend: kpiData.data.printing.trend,
        financialChangePercent: kpiData.data.financial.change_percent,
        financialTrend: kpiData.data.financial.trend,
        lastUpdated: kpiData.last_updated
      };
    } catch (error) {
      console.error('Error fetching dashboard KPI data:', error);
      throw error;
    }
  }
}

// Create and export instance
export const analyticsService = new AnalyticsService();
export default analyticsService;
