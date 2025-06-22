import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import type { UserRole } from '../../types';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: Date;
}

export default function UserRoleManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as User[];
      
      setUsers(usersData.sort((a, b) => a.email.localeCompare(b.email)));
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    setUpdating(userId);
    try {
      // Update user profile
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: new Date()
      });

      // Update admin profile if changing to/from admin roles
      if (newRole === 'admin' || newRole === 'super-admin') {
        const permissions = {
          canCreateAdmins: newRole === 'super-admin',
          canDeleteAdmins: newRole === 'super-admin',
          canManageSystem: newRole === 'super-admin',
          canViewAllData: newRole === 'super-admin',
        };

        await updateDoc(doc(db, 'adminProfiles', userId), {
          role: newRole,
          permissions,
          updatedAt: new Date()
        });
      }

      // Reload users to reflect changes
      await loadUsers();
      
      console.log(`✅ User role updated to ${newRole}`);
    } catch (error) {
      console.error('Error updating user role:', error);
    } finally {
      setUpdating(null);
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'super-admin':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'client':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2">Loading users...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        User Role Management
      </h3>
      
      <div className="space-y-4">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <div>
                  <p className="font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                  {user.role.replace('-', ' ').toUpperCase()}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <select
                value={user.role}
                onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                disabled={updating === user.id}
                className="block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="client">Client</option>
                <option value="admin">Admin</option>
                <option value="super-admin">Super Admin</option>
              </select>
              
              {updating === user.id && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
              )}
            </div>
          </div>
        ))}
        
        {users.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No users found
          </div>
        )}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <Button
          onClick={loadUsers}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          Refresh Users
        </Button>
      </div>
    </Card>
  );
} 