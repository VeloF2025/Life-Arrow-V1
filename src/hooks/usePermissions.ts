import { useMemo } from 'react';
import { useUserProfile } from './useUserProfile';
import { hasPermission, hasResourcePermission, getPermissionsForRole } from '../lib/permissions';

/**
 * Custom hook for checking permissions based on the current user's role
 * Extends useUserProfile with permission-checking capabilities
 */
export function usePermissions() {
  const { profile, loading, error, isAuthenticated } = useUserProfile();
  
  const userRole = profile?.role || '';
  const userId = profile?.id || '';
  const userCentreIds = profile?.centreIds || [];
  
  // Memoize permissions to avoid recalculation on each render
  const userPermissions = useMemo(() => {
    return getPermissionsForRole(userRole);
  }, [userRole]);
  
  /**
   * Check if the current user has a specific permission
   * @param permission The permission to check
   * @returns boolean indicating if the user has the permission
   */
  const can = (permission: string): boolean => {
    if (!isAuthenticated || !profile) return false;
    return hasPermission(userRole, permission);
  };
  
  /**
   * Check if the current user has permission for a specific resource
   * @param permission The permission to check
   * @param resourceOwnerId The ID of the resource owner
   * @param resourceCentreId The centre ID associated with the resource
   * @returns boolean indicating if the user has permission for the resource
   */
  const canForResource = (
    permission: string,
    resourceOwnerId?: string,
    resourceCentreId?: string
  ): boolean => {
    if (!isAuthenticated || !profile) return false;
    
    return hasResourcePermission(
      userRole,
      permission,
      userId,
      resourceOwnerId,
      userCentreIds,
      resourceCentreId
    );
  };
  
  // Alias for 'can' function for more readable code
  const userCan = can;

  return {
    // Re-export useUserProfile values
    profile,
    loading,
    error,
    isAuthenticated,
    
    // Permission-specific values
    userRole,
    userPermissions,
    can,
    canForResource,
    userCan,
  };
}
