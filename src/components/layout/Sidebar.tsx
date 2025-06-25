import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUserProfile } from '../../hooks/useUserProfile';
import { usePermissions } from '../../hooks/usePermissions';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { profile: currentUserProfile } = useUserProfile();
  const { userCan } = usePermissions();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const NavLink: React.FC<{ to: string; icon: string; label: string }> = ({ to, icon, label }) => (
    <Link
      to={to}
      className={`flex items-center px-4 py-2 mt-2 text-sm font-medium rounded-md ${
        isActive(to)
          ? 'bg-indigo-700 text-white'
          : 'text-gray-300 hover:bg-indigo-600 hover:text-white'
      }`}
    >
      <i className={`${icon} mr-3 text-lg`}></i>
      {label}
    </Link>
  );

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col h-0 flex-1 bg-indigo-800">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <h1 className="text-xl font-bold text-white">Life Arrow</h1>
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {userCan('VIEW_DASHBOARD') && (
                <NavLink to="/admin" icon="fas fa-home" label="Dashboard" />
              )}
              {userCan('VIEW_APPOINTMENTS') && (
                <NavLink to="/admin/appointments" icon="far fa-calendar-alt" label="Appointments" />
              )}
              {userCan('VIEW_CLIENTS') && (
                <NavLink to="/admin/clients" icon="fas fa-users" label="Clients" />
              )}
              {userCan('VIEW_STAFF') && (
                <NavLink to="/admin/staff" icon="fas fa-user-tie" label="Staff" />
              )}
              {userCan('VIEW_SERVICES') && (
                <NavLink to="/admin/services" icon="fas fa-concierge-bell" label="Services" />
              )}
              {userCan('VIEW_CENTRES') && (
                <NavLink to="/admin/centres" icon="fas fa-building" label="Centres" />
              )}
              {userCan('VIEW_REPORTS') && (
                <NavLink to="/admin/reports" icon="fas fa-chart-bar" label="Reports" />
              )}
              {userCan('VIEW_AUDIT_LOGS') && (
                <NavLink to="/admin/audit" icon="fas fa-history" label="Audit Logs" />
              )}
              {(userCan('MANAGE_ROLES') || userCan('MANAGE_USER_PERMISSIONS')) && (
                <NavLink to="/admin/settings" icon="fas fa-cog" label="Settings" />
              )}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-indigo-700 p-4">
            <div className="flex items-center">
              <div>
                <img
                  className="inline-block h-9 w-9 rounded-full"
                  src={currentUserProfile?.photoUrl || 'https://via.placeholder.com/40'}
                  alt="Profile"
                />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">
                  {currentUserProfile?.firstName} {currentUserProfile?.lastName}
                </p>
                <p className="text-xs font-medium text-indigo-200 capitalize">
                  {currentUserProfile?.role}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
