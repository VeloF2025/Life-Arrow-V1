import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CalendarDaysIcon, 
  ListBulletIcon,
  Squares2X2Icon,
  FunnelIcon,
  PlusIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  UserIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { collection, query, orderBy, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import LoadingSpinner from '../ui/LoadingSpinner';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { formatPrice } from '../../lib/utils';
import type { Appointment, TreatmentCentre, StaffMember, ServiceManagement } from '../../types';

type ViewMode = 'calendar' | 'list' | 'grid';
type FilterBy = 'all' | 'centre' | 'staff' | 'client' | 'service';
type DateRange = 'today' | 'week' | 'month' | 'custom';
type Status = 'all' | 'scheduled' | 'completed' | 'cancelled' | 'no-show';

interface SuperAdminSystemInterfaceProps {
  preSelectedClientId?: string;
  preSelectedClientName?: string;
}

const SuperAdminSystemInterface = ({ 
  preSelectedClientId, 
  preSelectedClientName 
}: SuperAdminSystemInterfaceProps) => {
  const navigate = useNavigate();
  
  // View and filter state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterBy, setFilterBy] = useState<FilterBy>('all');
  const [dateRange, setDateRange] = useState<DateRange>('week');
  const [statusFilter, setStatusFilter] = useState<Status>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCentreId, setSelectedCentreId] = useState<string>('all');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  
  // Custom date range
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Show filters panel
  const [showFilters, setShowFilters] = useState(false);

  // Helper function to get date range
  const getDateRangeFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'custom':
        return { 
          start: customStartDate ? new Date(customStartDate) : startOfWeek(now), 
          end: customEndDate ? new Date(customEndDate) : endOfWeek(now) 
        };
      default:
        return { start: startOfWeek(now), end: endOfWeek(now) };
    }
  };

  // Fetch centres for filtering
  const { data: centres = [] } = useQuery({
    queryKey: ['centres'],
    queryFn: async (): Promise<TreatmentCentre[]> => {
      const snapshot = await getDocs(collection(db, 'centres'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TreatmentCentre));
    }
  });

  // Fetch staff for filtering
  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async (): Promise<StaffMember[]> => {
      const snapshot = await getDocs(collection(db, 'users'));
      return snapshot.docs
        .filter(doc => doc.data().role === 'staff')
        .map(doc => ({ id: doc.id, ...doc.data() } as StaffMember));
    }
  });

  // Fetch appointments
  const { data: appointments = [], isLoading, error, refetch } = useQuery({
    queryKey: ['appointments', statusFilter, dateRange, selectedCentreId, selectedStaffId, customStartDate, customEndDate],
    queryFn: async (): Promise<Appointment[]> => {
      try {
        let appointmentsQuery = query(collection(db, 'appointments'), orderBy('dateTime', 'desc'));

        const snapshot = await getDocs(appointmentsQuery);
        const appointmentsList: Appointment[] = [];
        const { start, end } = getDateRangeFilter();

        for (const doc of snapshot.docs) {
          const data = doc.data();
          const appointmentDate = data.dateTime.toDate();
          
          // Apply date range filter
          if (appointmentDate < start || appointmentDate > end) continue;
          
          // Apply status filter
          if (statusFilter !== 'all' && data.status !== statusFilter) continue;
          
          // Apply centre filter
          if (selectedCentreId !== 'all' && data.centreId !== selectedCentreId) continue;
          
          // Apply staff filter
          if (selectedStaffId !== 'all' && data.staffId !== selectedStaffId) continue;

          appointmentsList.push({
            id: doc.id,
            clientId: data.clientId,
            clientName: data.clientName || 'Unknown Client',
            serviceId: data.serviceId,
            serviceName: data.serviceName || 'Unknown Service',
            centreId: data.centreId,
            centreName: data.centreName || 'Unknown Centre',
            staffId: data.staffId,
            staffName: data.staffName || 'Unknown Staff',
            dateTime: appointmentDate,
            duration: data.duration || 60,
            status: data.status || 'scheduled',
            notes: data.notes,
            price: data.price || 0,
            country: data.country || 'South Africa'
          } as Appointment);
        }

        return appointmentsList;
      } catch (error) {
        console.error('Error fetching appointments:', error);
        return [];
      }
    },
    refetchInterval: 30000
  });

  // Filter appointments based on search
  const filteredAppointments = appointments.filter(appointment => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      appointment.clientName?.toLowerCase().includes(searchLower) ||
      appointment.serviceName?.toLowerCase().includes(searchLower) ||
      appointment.centreName?.toLowerCase().includes(searchLower) ||
      appointment.staffName?.toLowerCase().includes(searchLower) ||
      appointment.notes?.toLowerCase().includes(searchLower)
    );
  });

  // Statistics
  const stats = {
    total: filteredAppointments.length,
    scheduled: filteredAppointments.filter(a => a.status === 'scheduled').length,
    completed: filteredAppointments.filter(a => a.status === 'completed').length,
    cancelled: filteredAppointments.filter(a => a.status === 'cancelled').length,
    noShow: filteredAppointments.filter(a => a.status === 'no-show').length,
    revenue: filteredAppointments
      .filter(a => a.status === 'completed')
      .reduce((sum, a) => sum + (a.price || 0), 0)
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no-show': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCreateAppointment = () => {
    navigate('/appointments', { 
      state: { 
        mode: 'create',
        preSelectedClientId,
        preSelectedClientName 
      } 
    });
  };

  const handleViewClient = (clientId: string) => {
    navigate('/admin/clients', { state: { selectedClientId: clientId } });
  };

  const handleEditAppointment = (appointmentId: string) => {
    navigate('/appointments', { 
      state: { 
        mode: 'edit', 
        appointmentId 
      } 
    });
  };

  // Render statistics cards
  const renderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      <Card className="p-4">
        <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        <div className="text-sm text-gray-600">Total Appointments</div>
      </Card>
      <Card className="p-4">
        <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
        <div className="text-sm text-gray-600">Scheduled</div>
      </Card>
      <Card className="p-4">
        <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
        <div className="text-sm text-gray-600">Completed</div>
      </Card>
      <Card className="p-4">
        <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
        <div className="text-sm text-gray-600">Cancelled</div>
      </Card>
      <Card className="p-4">
        <div className="text-2xl font-bold text-yellow-600">{stats.noShow}</div>
        <div className="text-sm text-gray-600">No Show</div>
      </Card>
      <Card className="p-4">
        <div className="text-2xl font-bold text-green-600">
          {formatPrice(stats.revenue, 'South Africa')}
        </div>
        <div className="text-sm text-gray-600">Revenue</div>
      </Card>
    </div>
  );

  // Render filters panel
  const renderFilters = () => (
    <Card className={`transition-all duration-300 ${showFilters ? 'block' : 'hidden'} mb-6`}>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as Status)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no-show">No Show</option>
            </select>
          </div>

          {/* Centre Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Centre</label>
            <select
              value={selectedCentreId}
              onChange={(e) => setSelectedCentreId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Centres</option>
              {centres.map(centre => (
                <option key={centre.id} value={centre.id}>{centre.name}</option>
              ))}
            </select>
          </div>

          {/* Staff Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Staff Member</label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Staff</option>
              {staff.map(member => (
                <option key={member.id} value={member.id}>
                  {member.firstName} {member.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Date Range */}
        {dateRange === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );

  // Render appointment list view
  const renderListView = () => (
    <div className="space-y-4">
      {filteredAppointments.map(appointment => (
        <Card key={appointment.id} className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {appointment.clientName}
                  </h3>
                  <div className="mt-1 text-sm text-gray-600">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <CalendarDaysIcon className="w-4 h-4 mr-1" />
                        {format(appointment.dateTime, 'PPP p')}
                      </span>
                      <span className="flex items-center">
                        <BuildingOfficeIcon className="w-4 h-4 mr-1" />
                        {appointment.centreName}
                      </span>
                      <span className="flex items-center">
                        <UserIcon className="w-4 h-4 mr-1" />
                        {appointment.staffName}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    {appointment.serviceName}
                  </div>
                  <div className="text-sm text-gray-600">
                    {appointment.duration} min • {formatPrice(appointment.price || 0, appointment.country)}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                    {appointment.status}
                  </span>
                </div>
              </div>
              {appointment.notes && (
                <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <strong>Notes:</strong> {appointment.notes}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewClient(appointment.clientId)}
              >
                <EyeIcon className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEditAppointment(appointment.id)}
              >
                <PencilIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
      
      {filteredAppointments.length === 0 && (
        <Card className="p-12 text-center">
          <CalendarDaysIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Appointments Found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No appointments match your search criteria.' : 'No appointments scheduled for the selected period.'}
          </p>
          <Button onClick={handleCreateAppointment}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Create New Appointment
          </Button>
        </Card>
      )}
    </div>
  );

  // Render grid view
  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredAppointments.map(appointment => (
        <Card key={appointment.id} className="p-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-gray-900 truncate">
                {appointment.clientName}
              </h3>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                {appointment.status}
              </span>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <CalendarDaysIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{format(appointment.dateTime, 'MMM d, p')}</span>
              </div>
              <div className="flex items-center">
                <BuildingOfficeIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{appointment.centreName}</span>
              </div>
              <div className="flex items-center">
                <UserIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{appointment.staffName}</span>
              </div>
            </div>
            
            <div className="border-t pt-3">
              <div className="font-medium text-gray-900">{appointment.serviceName}</div>
              <div className="text-sm text-gray-600">
                {appointment.duration} min • {formatPrice(appointment.price || 0, appointment.country)}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleViewClient(appointment.clientId)}
              >
                <EyeIcon className="w-4 h-4 mr-1" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleEditAppointment(appointment.id)}
              >
                <PencilIcon className="w-4 h-4 mr-1" />
                Edit
              </Button>
            </div>
          </div>
        </Card>
      ))}
      
      {filteredAppointments.length === 0 && (
        <div className="col-span-full">
          <Card className="p-12 text-center">
            <CalendarDaysIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Appointments Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'No appointments match your search criteria.' : 'No appointments scheduled for the selected period.'}
            </p>
            <Button onClick={handleCreateAppointment}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Create New Appointment
            </Button>
          </Card>
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-12 text-center">
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Appointments</h3>
        <p className="text-gray-600 mb-4">Unable to load appointments data.</p>
        <Button onClick={() => refetch()}>
          <ArrowPathIcon className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointment Management</h1>
          <p className="mt-1 text-gray-600">Comprehensive system-wide appointment overview</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button variant="outline" onClick={() => refetch()}>
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleCreateAppointment}>
            <PlusIcon className="w-4 h-4 mr-2" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {renderStats()}

      {/* View Controls and Search */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* View Mode Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">View:</span>
            <div className="flex space-x-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <ListBulletIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Squares2X2Icon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`p-2 rounded-lg ${viewMode === 'calendar' ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <CalendarDaysIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search appointments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center"
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              Filters
              <ChevronDownIcon className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Filters Panel */}
      {renderFilters()}

      {/* Content based on view mode */}
      {viewMode === 'list' && renderListView()}
      {viewMode === 'grid' && renderGridView()}
      {viewMode === 'calendar' && (
        <Card className="p-12 text-center">
          <CalendarDaysIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Calendar View</h3>
          <p className="text-gray-600">Calendar view coming soon! Use list or grid view for now.</p>
        </Card>
      )}
    </div>
  );
};

export default SuperAdminSystemInterface; 