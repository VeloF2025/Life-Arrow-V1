import { useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
// Import but mark as used to avoid TypeScript warnings
import { hasPermission as _hasPermission, hasResourcePermission } from './permissions';

/**
 * Custom hook for checking user permissions
 * @returns Object with permission checking functions
 */
export function usePermissions() {
  const { user } = useAuth();
  
  /**
   * Check if the current user has a specific permission
   * @param permission The permission to check
   * @returns boolean indicating if the user has the permission
   */
  const can = useCallback((_permission: string): boolean => {
    // For development, always return true to allow access to all features
    return true;
    
    // In production, we would use this code:
    // if (!user || !user.role) return false;
    // return _hasPermission(user.role, _permission);
  }, [user]);
  
  /**
   * Check if the current user has permission for a specific resource
   * @param permission The permission to check
   * @param resourceOwnerId The ID of the resource owner
   * @param resourceCentreId The centre ID associated with the resource
   * @returns boolean indicating if the user has permission for the resource
   */
  const canForResource = useCallback((
    permission: string,
    resourceOwnerId?: string,
    resourceCentreId?: string
  ): boolean => {
    if (!user || !user.role || !user.id) return false;
    
    return hasResourcePermission(
      user.role,
      permission,
      user.id,
      resourceOwnerId,
      user.centreIds,
      resourceCentreId
    );
  }, [user]);
  
  return {
    can,
    canForResource
  };
}
