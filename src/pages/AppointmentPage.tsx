import { useLocation } from 'react-router-dom';
import { useUserProfile } from '../hooks/useUserProfile';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ClientAppointmentInterface from '../components/appointments/ClientAppointmentInterface';
import StaffScheduleInterface from '../components/appointments/StaffScheduleInterface';
import AdminCentreInterface from '../components/appointments/AdminCentreInterface';
import SuperAdminSystemInterface from '../components/appointments/SuperAdminSystemInterface';

const AppointmentPage = () => {
  const { profile, loading } = useUserProfile();
  const location = useLocation();
  
  // Extract pre-selected client data from navigation state
  const preSelectedClientId = location.state?.preSelectedClientId;
  const preSelectedClientName = location.state?.preSelectedClientName;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600">
            Please log in to access the appointment system.
          </p>
        </div>
      </div>
    );
  }

  // Route based on user role
  switch (profile.role) {
    case 'client':
      return <ClientAppointmentInterface />;
    case 'staff':
      return <StaffScheduleInterface />;
    case 'admin':
      // Admins get comprehensive centre-based appointment management
      return (
        <AdminCentreInterface 
          preSelectedClientId={preSelectedClientId}
          preSelectedClientName={preSelectedClientName}
        />
      );
    case 'super-admin':
      // Super admins get the full system-wide appointment management
      return (
        <SuperAdminSystemInterface 
          preSelectedClientId={preSelectedClientId}
          preSelectedClientName={preSelectedClientName}
        />
      );
    default:
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600">
              Your account role does not have access to the appointment system.
            </p>
          </div>
        </div>
      );
  }
};

export default AppointmentPage; 