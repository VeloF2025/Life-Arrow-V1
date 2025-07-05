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
          ? 'bg-primary-500 text-white'
          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
      }`}
    >
      <i className={`${icon} mr-3 text-lg`}></i>
      {label}
    </Link>
  );

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col h-0 flex-1 bg-gray-900">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <div className="bg-primary-500 p-2 rounded-md">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-2">
                <h1 className="text-xl font-bold text-white">Life Arrow</h1>
                <p className="text-xs text-gray-400">Admin Portal</p>
              </div>
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
              {userCan('scans.view') && (
                <NavLink to="/admin/scans" icon="fas fa-file-medical-alt" label="Scan Management" />
              )}
              {(userCan('MANAGE_ROLES') || userCan('MANAGE_USER_PERMISSIONS')) && (
                <NavLink to="/admin/settings" icon="fas fa-cog" label="Settings" />
              )}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-800 p-4">
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
                <p className="text-xs font-medium text-gray-400 capitalize">
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
