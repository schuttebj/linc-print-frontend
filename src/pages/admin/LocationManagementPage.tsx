/**
 * Location Management Page for Madagascar LINC Print System
 * Admin interface for managing office locations, provinces, and capacity
 */

import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS, api } from '../../config/api';
import lookupService, { OfficeType, EquipmentStatus, Province } from '../../services/lookupService';

// Location interfaces
interface Location {
  id: string;
  location_code: string;
  location_name: string;
  location_address: string;
  province_code: string;
  office_type: string;
  max_capacity: number;
  current_capacity: number;
  contact_phone: string;
  contact_email: string;
  is_operational: boolean;
  operational_hours: string;
  equipment_status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface LocationCreateData {
  location_code: string;
  location_name: string;
  location_address: string;
  province_code: string;
  office_type: string;
  max_capacity: number;
  current_capacity: number;
  contact_phone: string;
  contact_email: string;
  operational_hours: string;
  notes?: string;
}

interface LocationListResponse {
  locations: Location[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface ProvinceOption {
  code: string;
  name: string;
}

const OFFICE_TYPES = [
  { value: 'MAIN', label: 'Main Office' },
  { value: 'BRANCH', label: 'Branch Office' },
  { value: 'KIOSK', label: 'Service Kiosk' },
  { value: 'MOBILE', label: 'Mobile Unit' }
];

const EQUIPMENT_STATUS = [
  { value: 'OPERATIONAL', label: 'Operational', class: 'bg-green-100 text-green-800' },
  { value: 'MAINTENANCE', label: 'Maintenance', class: 'bg-yellow-100 text-yellow-800' },
  { value: 'OFFLINE', label: 'Offline', class: 'bg-red-100 text-red-800' }
];

const LocationManagementPage: React.FC = () => {
  // State management
  const [locations, setLocations] = useState<Location[]>([]);
  const [officeTypes, setOfficeTypes] = useState<OfficeType[]>([]);
  const [equipmentStatuses, setEquipmentStatuses] = useState<EquipmentStatus[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [provinceFilter, setProvinceFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  
  // Form data
  const [createForm, setCreateForm] = useState<LocationCreateData>({
    location_code: '',
    location_name: '',
    location_address: '',
    province_code: '',
    office_type: '',
    max_capacity: 50,
    current_capacity: 0,
    contact_phone: '',
    contact_email: '',
    operational_hours: '',
    notes: ''
  });

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load data when filters change
  useEffect(() => {
    loadLocations();
  }, [currentPage, searchTerm, provinceFilter, typeFilter, statusFilter]);

  // Set default form values when lookup data loads
  useEffect(() => {
    if (officeTypes.length > 0 && provinces.length > 0 && !createForm.office_type && !createForm.province_code) {
      setCreateForm(prev => ({
        ...prev,
        office_type: officeTypes[0]?.value || '',
        province_code: provinces[0]?.code || ''
      }));
    }
  }, [officeTypes, provinces]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load locations and lookup data
      const [locationsRes, provincesRes, officeTypesRes, equipmentStatusesRes] = await Promise.all([
        loadLocations(),
        lookupService.getProvinces(),
        lookupService.getOfficeTypes(),
        lookupService.getEquipmentStatuses()
      ]);
      
      setProvinces(provincesRes);
      setOfficeTypes(officeTypesRes);
      setEquipmentStatuses(equipmentStatusesRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(provinceFilter && { province: provinceFilter }),
        ...(typeFilter && { office_type: typeFilter }),
        ...(statusFilter && { operational: statusFilter })
      });

      const locationsEndpoint = API_ENDPOINTS.users.replace('/users', '/locations');
      const response = await api.get<LocationListResponse>(`${locationsEndpoint}?${params}`);
      setLocations(response.locations);
      setTotalPages(response.total_pages);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load locations');
      throw err;
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const locationsEndpoint = API_ENDPOINTS.users.replace('/users', '/locations');
      await api.post(locationsEndpoint, createForm);
      setShowCreateModal(false);
      setCreateForm({
        location_code: '',
        location_name: '',
        location_address: '',
        province_code: '',
        office_type: '',
        max_capacity: 50,
        current_capacity: 0,
        contact_phone: '',
        contact_email: '',
        operational_hours: '',
        notes: ''
      });
      await loadLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create location');
    }
  };

  const handleEditLocation = async (locationData: Partial<Location>) => {
    if (!selectedLocation) return;
    
    try {
      const locationsEndpoint = API_ENDPOINTS.users.replace('/users', '/locations');
      await api.put(`${locationsEndpoint}/${selectedLocation.id}`, locationData);
      setShowEditModal(false);
      setSelectedLocation(null);
      await loadLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update location');
    }
  };

  const handleDeleteLocation = async () => {
    if (!selectedLocation) return;
    
    try {
      const locationsEndpoint = API_ENDPOINTS.users.replace('/users', '/locations');
      await api.delete(`${locationsEndpoint}/${selectedLocation.id}`);
      setShowDeleteModal(false);
      setSelectedLocation(null);
      await loadLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete location');
    }
  };

  const handleToggleOperational = async (location: Location) => {
    try {
      const locationsEndpoint = API_ENDPOINTS.users.replace('/users', '/locations');
      await api.put(`${locationsEndpoint}/${location.id}`, {
        is_operational: !location.is_operational
      });
      await loadLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update location status');
    }
  };

  const getOfficeTypeClass = (type: string) => {
    switch (type) {
      case 'MAIN': return 'bg-purple-100 text-purple-800';
      case 'BRANCH': return 'bg-blue-100 text-blue-800';
      case 'KIOSK': return 'bg-green-100 text-green-800';
      case 'MOBILE': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEquipmentStatusInfo = (status: string) => {
    const statusInfo = equipmentStatuses.find(s => s.value === status);
    if (statusInfo) {
      return {
        label: statusInfo.label,
        class: status === 'OPERATIONAL' ? 'bg-green-100 text-green-800' :
               status === 'MAINTENANCE' ? 'bg-yellow-100 text-yellow-800' :
               'bg-red-100 text-red-800'
      };
    }
    return { label: 'Unknown', class: 'bg-gray-100 text-gray-800' };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Location Management</h1>
        <p className="text-gray-600">Manage office locations, capacity, and operational status</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-4 text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">{locations.length}</div>
          <div className="text-sm text-gray-600">Total Locations</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">
            {locations.filter(l => l.is_operational).length}
          </div>
          <div className="text-sm text-gray-600">Operational</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-orange-600">
            {locations.reduce((sum, l) => sum + l.current_capacity, 0)}
          </div>
          <div className="text-sm text-gray-600">Total Capacity</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-purple-600">
            {locations.reduce((sum, l) => sum + l.max_capacity, 0)}
          </div>
          <div className="text-sm text-gray-600">Daily Capacity</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <input
            type="text"
            placeholder="Search locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <select
            value={provinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Provinces</option>
            {provinces.map(province => (
              <option key={province.code} value={province.code}>
                {province.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Types</option>
            {officeTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="true">Operational</option>
            <option value="false">Closed</option>
          </select>
        </div>
        
        <div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Location
          </button>
        </div>
      </div>

      {/* Locations Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type & Province
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Capacity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Equipment
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {locations.map((location) => (
              <tr key={location.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {location.location_name}
                    </div>
                    <div className="text-sm text-gray-500">{location.location_code}</div>
                    <div className="text-xs text-gray-400">
                      {location.location_address}
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOfficeTypeClass(location.office_type)}`}>
                      {officeTypes.find(t => t.value === location.office_type)?.label || location.office_type}
                    </span>
                    <div className="text-sm text-gray-600">{location.province_code}</div>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {location.contact_phone && (
                      <div> {location.contact_phone}</div>
                    )}
                    {location.contact_email && (
                      <div> {location.contact_email}</div>
                    )}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    <div>{location.current_capacity}/{location.max_capacity}</div>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    location.is_operational 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {location.is_operational ? 'Operational' : 'Closed'}
                  </span>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  {(() => {
                    const statusInfo = getEquipmentStatusInfo(location.equipment_status);
                    return (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.class}`}>
                        {statusInfo.label}
                      </span>
                    );
                  })()}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setSelectedLocation(location);
                        setShowEditModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                    
                    <button
                      onClick={() => handleToggleOperational(location)}
                      className={`${
                        location.is_operational 
                          ? 'text-orange-600 hover:text-orange-900' 
                          : 'text-green-600 hover:text-green-900'
                      }`}
                    >
                      {location.is_operational ? 'Close' : 'Open'}
                    </button>
                    
                    <button
                      onClick={() => {
                        setSelectedLocation(location);
                        setShowDeleteModal(true);
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create Location Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Location</h3>
            
            <form onSubmit={handleCreateLocation} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location Name</label>
                  <input
                    type="text"
                    required
                    value={createForm.location_name}
                    onChange={(e) => setCreateForm({...createForm, location_name: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Province</label>
                  <select
                    required
                    value={createForm.province_code}
                    onChange={(e) => setCreateForm({...createForm, province_code: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Province</option>
                    {provinces.map(province => (
                      <option key={province.code} value={province.code}>{province.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Office Type</label>
                  <select
                    required
                    value={createForm.office_type}
                    onChange={(e) => setCreateForm({...createForm, office_type: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Type</option>
                    {officeTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location Address</label>
                  <textarea
                    required
                    value={createForm.location_address}
                    onChange={(e) => setCreateForm({...createForm, location_address: e.target.value})}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Capacity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={createForm.max_capacity}
                    onChange={(e) => setCreateForm({...createForm, max_capacity: parseInt(e.target.value)})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Capacity</label>
                  <input
                    type="number"
                    min="0"
                    max={createForm.max_capacity}
                    required
                    value={createForm.current_capacity}
                    onChange={(e) => setCreateForm({...createForm, current_capacity: parseInt(e.target.value)})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Operational Hours</label>
                  <input
                    type="text"
                    required
                    value={createForm.operational_hours}
                    onChange={(e) => setCreateForm({...createForm, operational_hours: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
                  <input
                    type="tel"
                    value={createForm.contact_phone}
                    onChange={(e) => setCreateForm({...createForm, contact_phone: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                  <input
                    type="email"
                    value={createForm.contact_email}
                    onChange={(e) => setCreateForm({...createForm, contact_email: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({...createForm, notes: e.target.value})}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Create Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedLocation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete location <strong>{selectedLocation.location_name}</strong>? 
              This action cannot be undone and will affect all associated users.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteLocation}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Delete Location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationManagementPage; 