import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { ProfileCompletionForm } from '../../components/forms/ProfileCompletionForm';
import { AppointmentManagement } from '../../features/appointments/components/AppointmentManagement';
import { 
  ChartBarIcon,
  CalendarDaysIcon,
  UserCircleIcon,
  HeartIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  BookOpenIcon,
  CogIcon,
  StarIcon,
  TrophyIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { profile, loading } = useUserProfile();
  const profileCompletion = useProfileCompletion();
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleCompleteProfile = () => {
    setActiveSection('profile-completion');
  };

  const handleProfileCompletionSuccess = () => {
    // After successful completion, refresh profile data and go to profile section
    setActiveSection('profile');
    // Force refresh of profile completion status
    window.location.reload();
  };

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
    { id: 'profile', label: 'Profile', icon: UserCircleIcon },
    { id: 'appointments', label: 'Appointments', icon: CalendarDaysIcon },
    { id: 'health-metrics', label: 'Health Metrics', icon: HeartIcon },
    { id: 'goals', label: 'My Goals', icon: TrophyIcon },
    { id: 'assessments', label: 'Assessments', icon: ClipboardDocumentListIcon },
    { id: 'sessions', label: 'Session Notes', icon: BookOpenIcon },
    { id: 'messages', label: 'Messages', icon: ChatBubbleLeftRightIcon },
    { id: 'settings', label: 'Settings', icon: CogIcon },
  ];

  const statCards = [
    {
      title: 'Upcoming Appointments',
      value: '3',
      subtitle: 'Next: Tomorrow 2:00 PM',
      icon: CalendarDaysIcon,
      color: 'stat-card-blue',
      trend: '+2 this week'
    },
    {
      title: 'Goals Achieved',
      value: '7/10',
      subtitle: '70% completion rate',
      icon: TrophyIcon,
      color: 'stat-card-green',
      trend: '+3 this month'
    },
    {
      title: 'Health Score',
      value: '85',
      subtitle: 'Excellent progress',
      icon: HeartIcon,
      color: 'stat-card-purple',
      trend: '+5 points'
    },
    {
      title: 'Active Programs',
      value: '2',
      subtitle: 'Wellness & Nutrition',
      icon: StarIcon,
      color: 'stat-card-orange',
      trend: 'On track'
    }
  ];

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
                <HeartIcon className="w-6 h-6 text-white" />
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-semibold text-white">Life Arrow</h1>
                <p className="text-xs text-gray-400">Wellness Platform</p>
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
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  setSidebarOpen(false); // Close mobile sidebar on item click
                }}
                className={
                  activeSection === item.id ? 'sidebar-item-active' : 'sidebar-item'
                }
              >
                <Icon className="sidebar-icon" />
                {item.label}
              </div>
            );
          })}
        </nav>

        {/* User Profile at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-700">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {profile?.firstName?.[0] || 'C'}{profile?.lastName?.[0] || 'T'}
              </span>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-white">
                {profile?.firstName || 'Client'} {profile?.lastName || 'Test'}
              </p>
              <p className="text-xs text-gray-400 capitalize">Client Member</p>
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
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Wellness Dashboard</h1>
                <p className="hidden sm:block text-gray-600">Welcome back, {profile?.firstName || 'Client'}! Ready to continue your wellness journey?</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">R ZAR</p>
              </div>
              <div className="w-8 h-8 bg-primary-500 rounded-full"></div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{profile?.firstName || 'Client'} {profile?.lastName || 'Test'}</p>
                <p className="text-xs text-gray-500">Client Member</p>
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-secondary text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-container">
          {activeSection === 'overview' && (
            <div className="space-y-8">
              {/* Profile Completion Banner */}
              {!profileCompletion.loading && !profileCompletion.isCompleted && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <div className="flex items-start space-x-4">
                    <div className="text-yellow-500 mt-1">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 8.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-yellow-800 mb-2">
                        Complete Your Profile ({profileCompletion.completionPercentage}%)
                      </h3>
                      <p className="text-yellow-800 mb-4">
                        Please complete your detailed profile information to get personalized wellness recommendations and unlock all features.
                      </p>
                      <button 
                        onClick={handleCompleteProfile}
                        className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
                      >
                        Complete Profile
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Welcome Banner */}
              <div className="welcome-banner">
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                      Great to see you, {profile?.firstName || 'Client'}!
                    </h1>
                    <p className="text-primary-100">Today is {currentDate}</p>
                    <p className="text-primary-100">You're making excellent progress on your wellness goals.</p>
                  </div>
                  <div className="hidden md:block">
                    <HeartIcon className="h-16 w-16 text-primary-200" />
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="stats-grid">
                {statCards.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div key={index} className={stat.color}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="icon-wrapper-blue">
                          <Icon className="h-6 w-6 text-blue-600" />
                        </div>
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                          {stat.trend}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                        <p className="text-sm text-gray-500 mt-1">{stat.subtitle}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Content Grid */}
              <div className="content-grid">
                {/* Recent Activity */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <TrophyIcon className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Goal Achieved: Daily Water Intake</p>
                        <p className="text-xs text-gray-500">2 hours ago</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <CalendarDaysIcon className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Appointment Scheduled</p>
                        <p className="text-xs text-gray-500">Yesterday</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <ClipboardDocumentListIcon className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Assessment Completed</p>
                        <p className="text-xs text-gray-500">2 days ago</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upcoming Tasks */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Tasks</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Complete wellness assessment</p>
                        <p className="text-xs text-gray-500">Due: Tomorrow</p>
                      </div>
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                        Pending
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Log daily meals</p>
                        <p className="text-xs text-gray-500">Due: Today</p>
                      </div>
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                        Overdue
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Weekly check-in</p>
                        <p className="text-xs text-gray-500">Due: Friday</p>
                      </div>
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        Upcoming
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'profile' && (
            <div className="card">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Complete Your Profile</h2>
                <p className="text-gray-600 mt-1">Please provide additional information to enhance your experience</p>
              </div>
              <div className="p-6">
                <ProfileCompletionForm onSuccess={handleProfileCompletionSuccess} />
              </div>
            </div>
          )}

          {activeSection === 'profile-completion' && (
            <div className="card">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Complete Your Profile</h2>
                <p className="text-gray-600 mt-1">Please provide additional information to enhance your experience</p>
              </div>
              <div className="p-6">
                <ProfileCompletionForm onSuccess={handleProfileCompletionSuccess} />
              </div>
            </div>
          )}

          {activeSection === 'appointments' && (
            <div className="card">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">My Appointments</h2>
                <p className="text-gray-600 mt-1">Schedule and manage your appointments</p>
              </div>
              <div className="p-6">
                <AppointmentManagement 
                  initialClientId={profile?.id} 
                  onAppointmentBooked={() => {
                    // Refresh or show success message
                    console.log('Appointment booked successfully!');
                  }}
                  clientMode={true}
                />
              </div>
            </div>
          )}

          {activeSection === 'health-metrics' && (
            <div className="card">
              <div className="text-center py-12">
                <HeartIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Health Metrics</h2>
                <p className="text-gray-600">Track your health metrics and progress over time.</p>
              </div>
            </div>
          )}

          {activeSection === 'goals' && (
            <div className="card">
              <div className="text-center py-12">
                <TrophyIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">My Goals</h2>
                <p className="text-gray-600">Set and track your wellness goals and achievements.</p>
              </div>
            </div>
          )}

          {activeSection === 'assessments' && (
            <div className="card">
              <div className="text-center py-12">
                <ClipboardDocumentListIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Assessments</h2>
                <p className="text-gray-600">Complete health assessments and view your results.</p>
              </div>
            </div>
          )}

          {activeSection === 'sessions' && (
            <div className="card">
              <div className="text-center py-12">
                <BookOpenIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Session Notes</h2>
                <p className="text-gray-600">Your session notes and treatment history will appear here.</p>
              </div>
            </div>
          )}

          {activeSection === 'messages' && (
            <div className="card">
              <div className="text-center py-12">
                <ChatBubbleLeftRightIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Messages</h2>
                <p className="text-gray-600">Communicate with your healthcare providers and support team.</p>
              </div>
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="card">
              <div className="text-center py-12">
                <CogIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Settings</h2>
                <p className="text-gray-600">Manage your account settings and preferences.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
