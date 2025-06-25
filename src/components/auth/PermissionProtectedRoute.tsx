import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import LoadingSpinner from '../ui/LoadingSpinner';

interface PermissionProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredPermissions?: string[];
  requireAll?: boolean; // If true, user must have ALL permissions; if false, ANY permission is sufficient
}

/**
 * A route component that protects content based on user permissions
 * More flexible than role-based protection as it allows for granular access control
 */
export function PermissionProtectedRoute({
  children,
  requiredPermission,
  requiredPermissions = [],
  requireAll = false,
}: PermissionProtectedRouteProps) {
  const { loading, isAuthenticated, can, profile } = usePermissions();
  
  // Add single permission to array if provided
  if (requiredPermission) {
    requiredPermissions = [...requiredPermissions, requiredPermission];
  }
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // If no permissions are required, allow access
  if (requiredPermissions.length === 0) {
    return <>{children}</>;
  }
  
  // Check permissions
  const hasAccess = requireAll
    ? requiredPermissions.every(permission => can(permission))
    : requiredPermissions.some(permission => can(permission));
  
  if (!hasAccess) {
    // Redirect based on user role
    if (profile?.role === 'client') {
      return <Navigate to="/client/dashboard" replace />;
    } else if (profile?.role === 'admin' || profile?.role === 'super-admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      // Default fallback
      return <Navigate to="/" replace />;
    }
  }
  
  return <>{children}</>;
}

export default PermissionProtectedRoute;
