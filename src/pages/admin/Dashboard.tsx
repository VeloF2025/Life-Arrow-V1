import { useState } from 'react';
import { auth } from '../../lib/firebase';
import { useUserProfile } from '../../hooks/useUserProfile';
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
  HeartIcon
} from '@heroicons/react/24/outline';
import UserRoleManager from '../../components/admin/UserRoleManager';
import CreateAdminForm from '../../components/forms/CreateAdminForm';
import { elevateCurrentUserToSuperAdmin } from '../../utils/elevateCurrentUser';

// Import the new management components
import { ServicesManagement } from '../../components/admin/ServicesManagement';
import { CentresManagement } from '../../components/admin/CentresManagement';
import { ClientsManagement } from '../../components/admin/ClientsManagement';
import { AdminSetup } from '../../components/admin/AdminSetup';
import AuditPage from './AuditPage';
// import { StaffManagement } from '../../components/admin/StaffManagement';
// import { AppointmentsManagement } from '../../components/admin/AppointmentsManagement';

type AdminSection = 'overview' | 'clients' | 'appointments' | 'services' | 'centres' | 'staff' | 'scans' | 'videos' | 'wellness-plans' | 'reports' | 'settings' | 'audit' | 'site-health';

export function Dashboard() {
  const { profile, loading } = useUserProfile();
  const [showUserRoles, setShowUserRoles] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [showAdminSetup, setShowAdminSetup] = useState(false);
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');

  const isSuperAdmin = profile?.role === 'super-admin';

  const handleLogout = async () => {
    await signOut(auth);
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
    ...(profile?.role === 'super-admin' ? [{ id: 'site-health', label: 'Site Health', icon: HeartIcon }] : []),
  ] as const;

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
        return profile?.role === 'super-admin' ? <AuditPage /> : null;
      case 'audit':
        return profile?.role === 'super-admin' ? <AuditPage /> : null;
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

      {/* Stats Grid */}
      <div className="stats-grid">
        {/* Active Clients */}
        <div className="stat-card-blue">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Clients</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">127</p>
              <div className="flex items-center mt-2">
                <ChevronUpIcon className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 ml-1">12% from last month</span>
              </div>
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
              <p className="text-3xl font-bold text-gray-900 mt-2">24</p>
              <div className="flex items-center mt-2">
                <ChevronUpIcon className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 ml-1">8% from yesterday</span>
              </div>
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
              <p className="text-3xl font-bold text-gray-900 mt-2">R89,420</p>
              <div className="flex items-center mt-2">
                <ChevronDownIcon className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600 ml-1">3% from last month</span>
              </div>
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
              <p className="text-3xl font-bold text-gray-900 mt-2">94.2%</p>
              <div className="flex items-center mt-2">
                <ChevronUpIcon className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 ml-1">1.2% from last month</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <ChartPieIcon className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

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
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600">Manage team members, qualifications, and schedules</p>
        </div>
        <button className="btn btn-primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Staff Member
        </button>
      </div>
      
      <div className="card">
        <div className="text-center py-12">
          <UserGroupIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Staff Management</h3>
          <p className="text-gray-600">Full staff management interface coming soon...</p>
        </div>
      </div>
    </div>
  );

  const renderAppointmentsManagement = () => (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments Management</h1>
          <p className="text-gray-600">Book, manage, and track appointments</p>
        </div>
        <button className="btn btn-primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          Book Appointment
        </button>
      </div>
      
      <div className="card">
        <div className="text-center py-12">
          <CalendarDaysIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Appointments Management</h3>
          <p className="text-gray-600">Full appointments management interface coming soon...</p>
        </div>
      </div>
    </div>
  );

  const renderClientsManagement = () => (
    <ClientsManagement />
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="sidebar">
        {/* Logo/Header */}
        <div className="sidebar-header">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
              <ChartPieIcon className="w-6 h-6 text-white" />
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-semibold text-white">Life Arrow</h1>
              <p className="text-xs text-gray-400">Admin Portal</p>
            </div>
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
                onClick={() => setActiveSection(item.id as AdminSection)}
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
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <header className="main-header">
          <div className="px-8 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Search clients, appointments, staff..."
                className="w-96 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">R ZAR</p>
              </div>
              <div className="w-8 h-8 bg-primary-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">{profile?.firstName} {profile?.lastName}</p>
                <p className="text-xs text-gray-500 capitalize">{profile?.role?.replace('-', ' ')}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        {renderMainContent()}
      </div>
    </div>
  );
} 