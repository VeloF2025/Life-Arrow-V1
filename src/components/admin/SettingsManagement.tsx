import { useState } from 'react';
import { 
  Cog6ToothIcon, 
  UserGroupIcon, 
  ShieldCheckIcon,
  BuildingLibraryIcon,
  BellAlertIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { RoleManagement } from './RoleManagement';
import { UserPermissionManagement } from './UserPermissionManagement';
import { usePermissions } from '../../hooks/usePermissions';
import { Permissions } from '../../lib/permissions';

type SettingsTab = 'roles' | 'user-permissions' | 'centers' | 'notifications' | 'general';

export function SettingsManagement() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('roles');
  const { userCan } = usePermissions();
  
  const canManageRoles = userCan(Permissions.MANAGE_ROLES);
  const canManageUserPermissions = userCan(Permissions.MANAGE_USER_PERMISSIONS);
  
  const tabs = [
    { id: 'roles', label: 'Roles', icon: ShieldCheckIcon, permitted: canManageRoles },
    { id: 'user-permissions', label: 'User Permissions', icon: UserGroupIcon, permitted: canManageUserPermissions },
    { id: 'centers', label: 'Centers', icon: BuildingLibraryIcon, permitted: true },
    { id: 'notifications', label: 'Notifications', icon: BellAlertIcon, permitted: true },
    { id: 'general', label: 'General', icon: GlobeAltIcon, permitted: true },
  ].filter(tab => tab.permitted);
  
  const renderTabContent = () => {
    switch (activeTab) {
      case 'roles':
        return <RoleManagement />;
      case 'user-permissions':
        return <UserPermissionManagement />;
      case 'centers':
        return <CenterPlaceholder />;
      case 'notifications':
        return <NotificationPlaceholder />;
      case 'general':
        return <GeneralSettingsPlaceholder />;
      default:
        return null;
    }
  };
  
  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Cog6ToothIcon className="h-8 w-8 text-primary-500 mr-3" />
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Settings tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SettingsTab)}
                  className={`
                    py-4 px-1 border-b-2 font-medium text-sm flex items-center
                    ${isActive 
                      ? 'border-primary-500 text-primary-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                  `}
                >
                  <Icon className={`h-5 w-5 mr-2 ${isActive ? 'text-primary-500' : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
        
        <div className="p-0">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

// Placeholder components for other settings tabs
function CenterPlaceholder() {
  return (
    <div className="p-6 text-center">
      <BuildingLibraryIcon className="h-12 w-12 text-gray-400 mx-auto" />
      <h3 className="mt-4 text-lg font-medium text-gray-900">Center Management</h3>
      <p className="mt-2 text-gray-500">
        Configure center locations, operating hours, and service availability.
      </p>
      <p className="mt-4 text-sm text-gray-500">
        This feature is coming soon.
      </p>
    </div>
  );
}

function NotificationPlaceholder() {
  return (
    <div className="p-6 text-center">
      <BellAlertIcon className="h-12 w-12 text-gray-400 mx-auto" />
      <h3 className="mt-4 text-lg font-medium text-gray-900">Notification Settings</h3>
      <p className="mt-2 text-gray-500">
        Configure email templates, notification preferences, and automated alerts.
      </p>
      <p className="mt-4 text-sm text-gray-500">
        This feature is coming soon.
      </p>
    </div>
  );
}

function GeneralSettingsPlaceholder() {
  return (
    <div className="p-6 text-center">
      <GlobeAltIcon className="h-12 w-12 text-gray-400 mx-auto" />
      <h3 className="mt-4 text-lg font-medium text-gray-900">General Settings</h3>
      <p className="mt-2 text-gray-500">
        Configure system-wide settings, branding, and appearance.
      </p>
      <p className="mt-4 text-sm text-gray-500">
        This feature is coming soon.
      </p>
    </div>
  );
}
