import { useState, useEffect } from 'react';
import { 
  PencilIcon, 
  TrashIcon, 
  PlusIcon,
  ShieldCheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { dbServices } from '../../lib/database';
import { Permissions } from '../../lib/permissions';
import { usePermissions } from '../../hooks/usePermissions';
import { syncUserCustomClaims, batchSyncAllUserClaims } from '../../lib/auth';

// Define the Role type
interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [syncingClaims, setSyncingClaims] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: number; failed: number } | null>(null);
  
  const { userCan } = usePermissions();
  const canManageRoles = userCan(Permissions.MANAGE_ROLES);
  
  // Fetch roles on component mount
  useEffect(() => {
    fetchRoles();
  }, []);
  
  const fetchRoles = async () => {
    try {
      setLoading(true);
      const fetchedRoles = await dbServices.roles.getAll();
      setRoles(fetchedRoles as Role[]);
      setError(null);
    } catch (err) {
      console.error('Error fetching roles:', err);
      setError('Failed to load roles. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddRole = () => {
    setCurrentRole(null);
    setShowAddModal(true);
  };
  
  const handleEditRole = (role: Role) => {
    setCurrentRole(role);
    setShowEditModal(true);
  };
  
  const handleDeleteRole = async (roleId: string) => {
    if (!window.confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
      return;
    }
    
    try {
      await dbServices.roles.delete(roleId);
      await fetchRoles();
    } catch (err) {
      console.error('Error deleting role:', err);
      setError('Failed to delete role. Please try again.');
    }
  };
  
  const handleSyncAllUserClaims = async () => {
    try {
      setSyncingClaims(true);
      setSyncResult(null);
      const result = await batchSyncAllUserClaims();
      setSyncResult(result);
    } catch (err) {
      console.error('Error syncing user claims:', err);
      setError('Failed to sync user claims. Please try again.');
    } finally {
      setSyncingClaims(false);
    }
  };
  
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
          <h2 className="text-xl font-semibold text-gray-800">Role Management</h2>
          <div className="flex space-x-2">
            {canManageRoles && (
              <button
                onClick={handleAddRole}
                className="btn-primary flex items-center"
              >
                <PlusIcon className="w-5 h-5 mr-1" />
                Add Role
              </button>
            )}
            {canManageRoles && (
              <button
                onClick={handleSyncAllUserClaims}
                disabled={syncingClaims}
                className={`btn-secondary flex items-center ${syncingClaims ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <ShieldCheckIcon className="w-5 h-5 mr-1" />
                {syncingClaims ? 'Syncing...' : 'Sync User Claims'}
              </button>
            )}
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
        
        {syncResult && (
          <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md">
            Claims sync completed: {syncResult.success} successful, {syncResult.failed} failed
            <button 
              onClick={() => setSyncResult(null)}
              className="ml-2 text-green-500 hover:text-green-700"
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
                Role Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Permissions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Updated
              </th>
              {canManageRoles && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {roles.length === 0 ? (
              <tr>
                <td colSpan={canManageRoles ? 5 : 4} className="px-6 py-4 text-center text-gray-500">
                  No roles found. Add a role to get started.
                </td>
              </tr>
            ) : (
              roles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{role.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">{role.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.length > 0 ? (
                        role.permissions.slice(0, 3).map((permission, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {permission}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">No permissions</span>
                      )}
                      {role.permissions.length > 3 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          +{role.permissions.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {role.updatedAt.toLocaleDateString()}
                    </div>
                  </td>
                  {canManageRoles && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditRole(role)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {showAddModal && (
        <RoleFormModal
          onClose={() => setShowAddModal(false)}
          onSave={fetchRoles}
        />
      )}
      
      {showEditModal && currentRole && (
        <RoleFormModal
          role={currentRole}
          onClose={() => setShowEditModal(false)}
          onSave={fetchRoles}
        />
      )}
    </div>
  );
}

interface RoleFormModalProps {
  role?: Role;
  onClose: () => void;
  onSave: () => void;
}

function RoleFormModal({ role, onClose, onSave }: RoleFormModalProps) {
  const [formData, setFormData] = useState({
    name: role?.name || '',
    description: role?.description || '',
    permissions: role?.permissions || []
  });
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Get all available permissions from the Permissions object
    const permissionValues = Object.values(Permissions);
    setAvailablePermissions(permissionValues);
  }, []);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
    
    if (!formData.name.trim()) {
      setError('Role name is required');
      return;
    }
    
    try {
      setSaving(true);
      
      if (role) {
        // Update existing role
        await dbServices.roles.update(role.id, {
          name: formData.name,
          description: formData.description,
          permissions: formData.permissions
        });
      } else {
        // Create new role
        await dbServices.roles.create({
          name: formData.name,
          description: formData.description,
          permissions: formData.permissions
        });
      }
      
      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving role:', err);
      setError('Failed to save role. Please try again.');
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
              {role ? 'Edit Role' : 'Add New Role'}
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
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Role Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permissions
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
              {saving ? 'Saving...' : role ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
