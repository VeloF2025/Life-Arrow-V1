import { useState } from 'react';
import { 
  Cog6ToothIcon, 
  ShieldCheckIcon, 
  UserGroupIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import { RoleManagement } from '../../components/admin/RoleManagement';
import { UserPermissionManagement } from '../../components/admin/UserPermissionManagement';
import { usePermissions } from '../../hooks/usePermissions';
import { Permissions } from '../../lib/permissions';

type SettingsTab = 'roles' | 'permissions' | 'general';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('roles');
  const { userCan } = usePermissions();
  
  const canManageRoles = userCan(Permissions.MANAGE_ROLES);
  const canManageUserPermissions = userCan(Permissions.MANAGE_USER_PERMISSIONS);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'roles':
        return <RoleManagement />;
      case 'permissions':
        return <UserPermissionManagement />;
      case 'general':
        return (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">General Settings</h2>
            <p className="text-gray-600">
              General system settings will be available here in a future update.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600">
          Manage roles, permissions, and system configuration
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-white shadow-md rounded-lg p-4 h-fit">
          <nav className="space-y-1">
            {canManageRoles && (
              <button
                onClick={() => setActiveTab('roles')}
                className={`w-full flex items-center px-4 py-2 text-left rounded-md ${
                  activeTab === 'roles'
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ShieldCheckIcon className="w-5 h-5 mr-3" />
                Role Management
              </button>
            )}
            
            {canManageUserPermissions && (
              <button
                onClick={() => setActiveTab('permissions')}
                className={`w-full flex items-center px-4 py-2 text-left rounded-md ${
                  activeTab === 'permissions'
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <KeyIcon className="w-5 h-5 mr-3" />
                User Permissions
              </button>
            )}
            
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center px-4 py-2 text-left rounded-md ${
                activeTab === 'general'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Cog6ToothIcon className="w-5 h-5 mr-3" />
              General Settings
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
