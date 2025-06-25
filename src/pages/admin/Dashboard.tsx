import { useState } from 'react';
import { auth } from '../../lib/firebase';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useDashboardData } from '../../hooks/useDashboardData';
import { signOut } from 'firebase/auth';
import { 
  ChartBarIcon,
  UsersIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  PlusIcon,
  CalendarIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  UserGroupIcon,
  CogIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  ChartPieIcon,
  ClipboardDocumentListIcon,
  BuildingOfficeIcon,
  HeartIcon,
  CodeBracketIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import UserRoleManager from '../../components/admin/UserRoleManager';
import CreateAdminForm from '../../components/forms/CreateAdminForm';
import { elevateCurrentUserToSuperAdmin } from '../../utils/elevateCurrentUser';

// Import the new management components
import { ServicesManagement } from '../../components/admin/ServicesManagement';
import { CentresManagement } from '../../components/admin/CentresManagement';
import { ClientsManagement } from '../../components/admin/ClientsManagement';
import { StaffManagement } from '../../components/admin/StaffManagement';
import { AdminSetup } from '../../components/admin/AdminSetup';
import AuditPage from './AuditPage';
import ClientAppointmentInterface from '../../components/appointments/ClientAppointmentInterface';
import { AppointmentManagement } from '../../components/admin/AppointmentManagement';
import SystemLogsViewer from '../../components/admin/SystemLogsViewer';
import { ProfileDropdown } from '../../components/ui/ProfileDropdown';
import { UserProfileValidator } from '../../components/admin/UserProfileValidator';
import { SettingsManagement } from '../../components/admin/SettingsManagement';
import Settings from '../admin/Settings';

type AdminSection = 'overview' | 'clients' | 'appointments' | 'services' | 'centres' | 'staff' | 'scans' | 'videos' | 'wellness-plans' | 'reports' | 'settings' | 'audit' | 'site-health' | 'system-logs';

export function Dashboard() {
  const { profile, loading } = useUserProfile();
  const { stats, loading: statsLoading, error: statsError } = useDashboardData(profile);
  const [showUserRoles, setShowUserRoles] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [showAdminSetup, setShowAdminSetup] = useState(false);
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [siteHealthTab, setSiteHealthTab] = useState<'audit' | 'profiles'>('audit');

  const isSuperAdmin = profile?.role === 'super-admin';

  const handleLogout = async () => {
    await signOut(auth);
  };

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Helper function to format growth percentage
  const formatGrowth = (growth: number) => {
    const isPositive = growth >= 0;
    const Icon = isPositive ? ChevronUpIcon : ChevronDownIcon;
    const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
    const iconColorClass = isPositive ? 'text-green-500' : 'text-red-500';
    
    return (
      <div className="flex items-center mt-2">
        <Icon className={`w-4 h-4 ${iconColorClass}`} />
        <span className={`text-sm ${colorClass} ml-1`}>
          {Math.abs(growth).toFixed(1)}% from last month
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric', 
    month: 'long',
    day: 'numeric'
  });

  const navigationItems = [
    { id: 'overview', label: 'Dashboard', icon: ChartBarIcon },
    { id: 'clients', label: 'Clients', icon: UsersIcon },
    { id: 'appointments', label: 'Appointments', icon: CalendarDaysIcon },
    { id: 'services', label: 'Services', icon: ClipboardDocumentListIcon },
    { id: 'centres', label: 'Treatment Centres', icon: BuildingOfficeIcon },
    { id: 'staff', label: 'Staff', icon: UserGroupIcon },
    { id: 'scans', label: 'Scans', icon: ChartPieIcon },
    { id: 'videos', label: 'Videos', icon: VideoCameraIcon },
    { id: 'wellness-plans', label: 'Wellness Plans', icon: DocumentTextIcon },
    { id: 'reports', label: 'Reports', icon: ChartBarIcon },
    { id: 'settings', label: 'Settings', icon: CogIcon },
    { id: 'system-logs', label: 'System Logs', icon: CodeBracketIcon },
    ...(profile?.role === 'super-admin' ? [{ id: 'site-health', label: 'Site Health', icon: HeartIcon }] : []),
  ] as const;

  const renderSiteHealth = () => {
    if (profile?.role !== 'super-admin') return null;
    
    return (
      <div className="page-container">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Site Health & System Maintenance</h1>
          <p className="text-gray-600">Monitor system health, fix user profile issues, and run diagnostics</p>
        </div>
        
        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setSiteHealthTab('audit')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                siteHealthTab === 'audit'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <CodeBracketIcon className="w-5 h-5 inline mr-2" />
              System Audit
            </button>
            <button
              onClick={() => setSiteHealthTab('profiles')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                siteHealthTab === 'profiles'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UsersIcon className="w-5 h-5 inline mr-2" />
              User Profile Validation
            </button>
          </nav>
        </div>
        
        {/* Tab Content */}
        {siteHealthTab === 'audit' && <AuditPage />}
        {siteHealthTab === 'profiles' && <UserProfileValidator />}
      </div>
    );
  };

  const renderMainContent = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverviewDashboard();
      case 'clients':
        return renderClientsManagement();
      case 'services':
        return renderServicesManagement();
      case 'centres':
        return renderCentresManagement();
      case 'staff':
        return renderStaffManagement();
      case 'appointments':
        return renderAppointmentsManagement();
      case 'site-health':
        return renderSiteHealth();
      case 'audit':
        return profile?.role === 'super-admin' ? <AuditPage /> : null;
      case 'system-logs':
        return renderSystemLogs();
      case 'settings':
        return renderSettings();
      default:
        return (
          <div className="page-container">
            <div className="card">
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {navigationItems.find(item => item.id === activeSection)?.label}
                </h3>
                <p className="text-gray-600">This section is under development.</p>
              </div>
            </div>
          </div>
        );
    }
  };

  const renderOverviewDashboard = () => (
    <div className="page-container">
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, {profile?.firstName}!
            </h1>
            <p className="text-primary-100">Today is {currentDate}</p>
          </div>
          <div className="flex space-x-3">
            <button className="btn bg-white text-primary-600 hover:bg-gray-50">
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Client
            </button>
            <button className="btn bg-primary-600 text-white hover:bg-primary-700 border-primary-600">
              <CalendarIcon className="w-5 h-5 mr-2" />
              Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Stats Loading State */}
      {statsLoading && (
        <div className="stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card-blue">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Error State */}
      {statsError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">⚠️ {statsError}</p>
        </div>
      )}

      {/* Stats Grid */}
      {!statsLoading && !statsError && (
        <div className="stats-grid">
          {/* Active Clients */}
          <div className="stat-card-blue">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Clients</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.activeClients.toLocaleString()}
                </p>
                {formatGrowth(stats.clientsGrowth)}
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <UsersIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Today's Appointments */}
          <div className="stat-card-green">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Appointments</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.todayAppointments.toLocaleString()}
                </p>
                {formatGrowth(stats.appointmentsGrowth)}
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CalendarDaysIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Monthly Revenue */}
          <div className="stat-card-yellow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {formatCurrency(stats.monthlyRevenue)}
                </p>
                {formatGrowth(stats.revenueGrowth)}
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <BanknotesIcon className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          {/* Completion Rate */}
          <div className="stat-card-purple">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.completionRate.toFixed(1)}%
                </p>
                {formatGrowth(stats.completionGrowth)}
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <ChartPieIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Management Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <button 
          onClick={() => setActiveSection('clients')}
          className="card hover:bg-gray-50 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <UsersIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Clients</h3>
              <p className="text-sm text-gray-600">View & manage client database</p>
            </div>
          </div>
        </button>

        <button 
          onClick={() => setActiveSection('services')}
          className="card hover:bg-gray-50 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <ClipboardDocumentListIcon className="w-6 h-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Services</h3>
              <p className="text-sm text-gray-600">Manage service offerings</p>
            </div>
          </div>
        </button>

        <button 
          onClick={() => setActiveSection('centres')}
          className="card hover:bg-gray-50 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Treatment Centres</h3>
              <p className="text-sm text-gray-600">Manage locations & facilities</p>
            </div>
          </div>
        </button>

        <button 
          onClick={() => setActiveSection('appointments')}
          className="card hover:bg-gray-50 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <CalendarDaysIcon className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Appointments</h3>
              <p className="text-sm text-gray-600">Book & manage appointments</p>
            </div>
          </div>
        </button>
      </div>

      {/* Super Admin Site Health Quick Action */}
      {isSuperAdmin && (
        <div className="mb-8">
          <button 
            onClick={() => setActiveSection('site-health')}
            className="card hover:bg-red-50 transition-colors cursor-pointer text-left w-full border-red-200 hover:border-red-300"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <HeartIcon className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Site Health</h3>
                  <p className="text-sm text-gray-600">Monitor system performance & security</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm font-medium text-green-600">System Healthy</span>
                  </div>
                  <p className="text-xs text-gray-500">Last checked: 2 hours ago</p>
                </div>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Super Admin Section */}
      {isSuperAdmin && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Super Admin Actions</h3>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => setShowUserRoles(!showUserRoles)}
              className="btn btn-secondary w-full sm:w-auto"
            >
              {showUserRoles ? 'Hide' : 'Show'} User Role Manager
            </button>
            
            <button
              onClick={() => setShowCreateAdmin(!showCreateAdmin)}
              className="btn btn-primary w-full sm:w-auto ml-0 sm:ml-3"
            >
              {showCreateAdmin ? 'Hide' : 'Show'} Create Admin
            </button>

            <button
              onClick={() => setShowAdminSetup(!showAdminSetup)}
              className="btn bg-green-600 text-white hover:bg-green-700 w-full sm:w-auto ml-0 sm:ml-3"
            >
              {showAdminSetup ? 'Hide' : 'Show'} Admin Setup
            </button>

            <button
              onClick={elevateCurrentUserToSuperAdmin}
              className="btn bg-red-600 text-white hover:bg-red-700 w-full sm:w-auto ml-0 sm:ml-3"
            >
              Elevate to Super Admin
            </button>
          </div>

          {showUserRoles && (
            <div className="mt-6">
              <UserRoleManager />
            </div>
          )}

          {showCreateAdmin && (
            <div className="mt-6">
              <CreateAdminForm />
            </div>
          )}

          {showAdminSetup && (
            <div className="mt-6">
              <AdminSetup />
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderServicesManagement = () => (
    <ServicesManagement />
  );

  const renderCentresManagement = () => (
    <CentresManagement />
  );

  const renderStaffManagement = () => (
    <StaffManagement />
  );

  const renderAppointmentsManagement = () => (
    <div className="page-container">
      <AppointmentManagement />
    </div>
  );

  const renderClientsManagement = () => (
    <ClientsManagement />
  );

  const renderSystemLogs = () => {
    return <SystemLogsViewer />;
  };
  
  const renderSettings = () => {
    return <Settings />;
  };

  return (
    <div className="flex min-h-screen w-full bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out z-50 lg:static lg:z-auto`}>
        {/* Logo/Header */}
        <div className="sidebar-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <ChartPieIcon className="w-6 h-6 text-white" />
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-semibold text-white">Life Arrow</h1>
                <p className="text-xs text-gray-400">Admin Portal</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id as AdminSection);
                  setSidebarOpen(false); // Close mobile sidebar on item click
                }}
                className={isActive ? 'sidebar-item-active' : 'sidebar-item'}
              >
                <Icon className="sidebar-icon" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User Profile at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-700">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {profile?.firstName?.[0]}{profile?.lastName?.[0]}
              </span>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-white">
                {profile?.firstName} {profile?.lastName}
              </p>
              <p className="text-xs text-gray-400 capitalize">{profile?.role?.replace('-', ' ')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content flex-1">
        {/* Header */}
        <header className="main-header">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <Bars3Icon className="w-6 h-6" />
              </button>
              <input
                type="text"
                placeholder="Search clients, appointments, staff..."
                className="hidden sm:block w-64 lg:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">R ZAR</p>
              </div>
              {profile && <ProfileDropdown user={profile} />}
            </div>
          </div>
        </header>

        {/* Page Content - Let page-container handle padding */}
        <div className="w-full">
          {renderMainContent()}
        </div>
      </div>
    </div>
  );
} 
