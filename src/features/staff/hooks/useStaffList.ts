import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthState } from 'react-firebase-hooks/auth';
import * as Schema from '@/lib/db-schema';
import { staffService } from '../api/staffService';
import { usePermissions } from '@/lib/usePermissions';
import { auth } from '@/lib/firebase';
import { dbServices } from '@/lib/database';

export function useStaffList() {
  const [staff, setStaff] = useState<Schema.UserDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const { can } = usePermissions();
  const [user, authLoading] = useAuthState(auth);

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['userProfile', user?.uid],
    queryFn: async (): Promise<Schema.UserDocument | null> => {
      if (!user?.uid) return null;
      return dbServices.users.getById(user.uid);
    },
    enabled: !!user,
  });

  const canViewStaff = useMemo(() => can('view_staff'), [can]);
  const canCreateStaff = useMemo(() => can('create_staff'), [can]);
  const canEditStaff = useMemo(() => can('edit_staff'), [can]);
  const canDeleteStaff = useMemo(() => can('delete_staff'), [can]);
  const canPromoteStaff = useMemo(() => can('promote_to_admin'), [can]);
  const canResetPassword = useMemo(() => can('edit_staff'), [can]);

  const loadStaff = useCallback(async () => {
    // Allow super-admin and admin to view staff even without a primary centre
    if (!canViewStaff) {
      return;
    }

    // Check if user is super-admin or admin
    const isAdminUser = currentUser?.role === 'super-admin' || currentUser?.role === 'admin';
    
    // If not admin and no primary centre, return early
    if (!isAdminUser && !currentUser?.primaryCentreId) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let staffMembers;
      if (isAdminUser) {
        // For admin users, get all staff regardless of centre
        staffMembers = await staffService.getAllForAdmin();
      } else {
        // For regular staff, filter by their primary centre
        staffMembers = await staffService.getAll(currentUser?.primaryCentreId || '');
      }
      setStaff(staffMembers);
    } catch (err) {
      setError('Failed to load staff.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [canViewStaff, currentUser]);

  useEffect(() => {
    if (authLoading || userLoading) {
      setLoading(true);
      return;
    }

    if (user && !currentUser) {
      setLoading(false);
      // This can happen briefly while the user profile is loading
      // or if the profile document doesn't exist. A more specific error is better.
      setError('Failed to load your user profile. Please try again later.');
      setStaff([]);
      return;
    }
    
    if (!currentUser) {
        setLoading(false);
        setStaff([]);
        return;
    }

    // Check if user is admin or super-admin
    const isAdminUser = currentUser.role === 'super-admin' || currentUser.role === 'admin';

    // Only check for primaryCentreId if not an admin user
    if (!isAdminUser && !currentUser.primaryCentreId) {
      setLoading(false);
      setError('Your user profile is not assigned to a primary centre. Please contact an administrator to view staff.');
      setStaff([]);
      return;
    }
    
    loadStaff();

  }, [authLoading, userLoading, user, currentUser, loadStaff]);

  const deleteStaffMember = async (member: Schema.UserDocument): Promise<boolean> => {
    if (!canDeleteStaff) {
      setError("You don't have permission to delete staff.");
      return false;
    }
    try {
      await staffService.delete(member);
      await loadStaff();
      return true;
    } catch (err) {
      setError('Failed to delete staff member.');
      return false;
    }
  };

  const promoteStaffToAdmin = async (staffMember: Schema.UserDocument): Promise<boolean> => {
    if (!canPromoteStaff) {
      setError("You don't have permission to promote staff.");
      return false;
    }
    try {
      await staffService.promote(staffMember);
      await loadStaff();
      return true;
    } catch (err) {
      setError('Failed to promote staff member.');
      return false;
    }
  };

  const filteredStaff = useMemo(() =>
    staff.filter(member => {
      const search = searchTerm.toLowerCase();
      return (
        (member.firstName || '').toLowerCase().includes(search) ||
        (member.lastName || '').toLowerCase().includes(search) ||
        (member.email || '').toLowerCase().includes(search) ||
        (member.position || '').toLowerCase().includes(search) ||
        (member.department || '').toLowerCase().includes(search)
      );
    }),
    [staff, searchTerm]
  );

  return {
    staff: filteredStaff,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    loadStaff,
    deleteStaffMember,
    promoteStaffToAdmin,
    permissions: {
      canViewStaff,
      canCreateStaff,
      canEditStaff,
      canDeleteStaff,
      canPromoteStaff,
      canResetPassword
    }
  };
}
