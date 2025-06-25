import { useState, useEffect } from 'react';
import { 
  UserIcon, 
  MagnifyingGlassIcon, 
  ShieldCheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { dbServices } from '../../lib/database';
import { Permissions } from '../../lib/permissions';
import { usePermissions } from '../../hooks/usePermissions';
import { syncUserCustomClaims, updateUserRole } from '../../lib/auth';
import type { UserProfile, UserRole } from '../../types';

interface UserWithPermissions extends UserProfile {
  permissions?: string[];
  photoUrl?: string; // Ensure consistent naming with photoUrl instead of photoURL
}

export function UserPermissionManagement() {
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [roles, setRoles] = useState<{id: string; name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserWithPermissions | null>(null);
  
  const { userCan } = usePermissions();
  const canManageUserPermissions = userCan(Permissions.MANAGE_USER_PERMISSIONS);
  
  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);
  
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const fetchedUsers = await dbServices.users.getAll();
      setUsers(fetchedUsers as UserWithPermissions[]);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchRoles = async () => {
    try {
      const fetchedRoles = await dbServices.roles.getAll();
      const roles = fetchedRoles.map((role: any) => ({ id: role.id, name: role.name }));
      setRoles(roles);
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };
  
  const handleEditUser = (user: UserWithPermissions) => {
    setCurrentUser(user);
    setShowEditModal(true);
  };
  
  const filteredUsers = searchQuery
    ? users.filter(user => 
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">User Permission Management</h2>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
            <button 
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              <XMarkIcon className="w-5 h-5 inline" />
            </button>
          </div>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Custom Permissions
              </th>
              {canManageUserPermissions && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={canManageUserPermissions ? 5 : 4} className="px-6 py-4 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {user.photoUrl ? (
                        <img
                          src={user.photoUrl}
                          alt={`${user.firstName} ${user.lastName}`}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-primary-600" />
                        </div>
                      )}
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.permissions && user.permissions.length > 0 ? (
                        user.permissions.slice(0, 3).map((permission, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {permission}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">No custom permissions</span>
                      )}
                      {user.permissions && user.permissions.length > 3 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          +{user.permissions.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>
                  {canManageUserPermissions && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-indigo-600 hover:text-indigo-900 flex items-center justify-end"
                      >
                        <ShieldCheckIcon className="w-5 h-5 mr-1" />
                        Edit Permissions
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {showEditModal && currentUser && (
        <UserPermissionModal
          user={currentUser}
          roles={roles}
          onClose={() => setShowEditModal(false)}
          onSave={fetchUsers}
        />
      )}
    </div>
  );
}

interface UserPermissionModalProps {
  user: UserWithPermissions;
  roles: {id: string; name: string}[];
  onClose: () => void;
  onSave: () => void;
}

function UserPermissionModal({ user, roles, onClose, onSave }: UserPermissionModalProps) {
  const [formData, setFormData] = useState({
    role: user.role,
    permissions: user.permissions || []
  });
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Get all available permissions from the Permissions object
    const permissionValues = Object.values(Permissions);
    setAvailablePermissions(permissionValues);
  }, []);
  
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, role: e.target.value as UserRole }));
  };
  
  const handlePermissionToggle = (permission: string) => {
    setFormData(prev => {
      const permissions = [...prev.permissions];
      
      if (permissions.includes(permission)) {
        return { ...prev, permissions: permissions.filter(p => p !== permission) };
      } else {
        return { ...prev, permissions: [...permissions, permission] };
      }
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      // Update user role and permissions
      await updateUserRole(user.id, formData.role, formData.permissions);
      
      // Sync user custom claims
      await syncUserCustomClaims(user.id);
      
      onSave();
      onClose();
    } catch (err) {
      console.error('Error updating user permissions:', err);
      setError('Failed to update user permissions. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Edit User Permissions: {user.firstName} {user.lastName}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleRoleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.name}>
                    {role.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Changing a user's role will update their base permissions.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Permissions
              </label>
              <div className="border border-gray-300 rounded-md p-4 max-h-60 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {availablePermissions.map((permission) => (
                    <div key={permission} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`permission-${permission}`}
                        checked={formData.permissions.includes(permission)}
                        onChange={() => handlePermissionToggle(permission)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor={`permission-${permission}`}
                        className="ml-2 block text-sm text-gray-900"
                      >
                        {permission}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Custom permissions are added to the user's role-based permissions.
              </p>
            </div>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 text-right">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary mr-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`btn-primary ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {saving ? 'Saving...' : 'Update Permissions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
