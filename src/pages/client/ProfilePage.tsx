import { ProfileManagement } from '../../components/forms/ProfileManagement';

export function ProfilePage() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600">Manage your personal information and wellness journey details</p>
      </div>
      
      <ProfileManagement />
    </div>
  );
} 