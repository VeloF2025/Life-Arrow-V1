/**
 * Life Arrow Permissions System
 * 
 * This module defines all permissions and role-based access controls for the application.
 * It provides utilities for checking permissions based on user roles and specific resources.
 */

// Define all possible permissions in the system
export const Permissions = {
  // Appointment permissions
  VIEW_OWN_APPOINTMENTS: 'view_own_appointments',
  VIEW_CENTRE_APPOINTMENTS: 'view_centre_appointments',
  VIEW_ALL_APPOINTMENTS: 'view_all_appointments',
  CREATE_APPOINTMENT: 'create_appointment',
  EDIT_OWN_APPOINTMENT: 'edit_own_appointment',
  EDIT_ANY_APPOINTMENT: 'edit_any_appointment',
  DELETE_APPOINTMENT: 'delete_appointment',
  
  // Staff permissions
  VIEW_STAFF: 'view_staff',
  VIEW_STAFF_DETAILS: 'view_staff_details',
  CREATE_STAFF: 'create_staff',
  EDIT_STAFF: 'edit_staff',
  DELETE_STAFF: 'delete_staff',
  
  // Service permissions
  VIEW_SERVICES: 'view_services',
  CREATE_SERVICE: 'create_service',
  EDIT_SERVICE: 'edit_service',
  DELETE_SERVICE: 'delete_service',
  PERFORM_SERVICE: 'perform_service',
  
  // Admin permissions
  VIEW_ADMINS: 'view_admins',
  CREATE_ADMIN: 'create_admin',
  EDIT_ADMIN: 'edit_admin',
  DELETE_ADMIN: 'delete_admin',
  PROMOTE_TO_ADMIN: 'promote_to_admin',
  DEMOTE_FROM_ADMIN: 'demote_from_admin',
  
  // Centre permissions
  VIEW_CENTRE: 'view_centre',
  CREATE_CENTRE: 'create_centre',
  EDIT_CENTRE: 'edit_centre',
  DELETE_CENTRE: 'delete_centre',
  
  // Client permissions
  VIEW_CLIENTS: 'view_clients',
  VIEW_CLIENT_DETAILS: 'view_client_details',
  CREATE_CLIENT: 'create_client',
  EDIT_CLIENT: 'edit_client',
  DELETE_CLIENT: 'delete_client',
  IMPORT_CLIENTS: 'import_clients',

  // Scan management permissions
  VIEW_SCANS: 'scans.view',
  UPLOAD_SCANS: 'scans.upload',
  ASSIGN_SCANS: 'scans.assign',
  DELETE_SCANS: 'scans.delete',

  // Super admin permissions
  MANAGE_SYSTEM: 'manage_system',
  PROMOTE_TO_SUPERADMIN: 'promote_to_superadmin',
  
  // Role and permission management
  MANAGE_ROLES: 'manage_roles',
  MANAGE_USER_PERMISSIONS: 'manage_user_permissions'
};

// Define client permissions
const clientPermissions = [
  Permissions.VIEW_OWN_APPOINTMENTS,
  Permissions.CREATE_APPOINTMENT,
  Permissions.EDIT_OWN_APPOINTMENT,
  Permissions.VIEW_SERVICES,
];

// Define staff permissions (includes client permissions)
const staffPermissions = [
  ...clientPermissions,
  
  // Staff-specific permissions
  Permissions.VIEW_CENTRE_APPOINTMENTS,
  Permissions.PERFORM_SERVICE,
  Permissions.VIEW_CLIENTS,
  Permissions.VIEW_CLIENT_DETAILS,
];

// Define admin permissions (includes staff permissions)
const adminPermissions = [
  ...staffPermissions,
  
  // Admin-specific permissions
  Permissions.VIEW_STAFF,
  Permissions.VIEW_STAFF_DETAILS,
  Permissions.CREATE_STAFF,
  Permissions.EDIT_STAFF,
  Permissions.DELETE_STAFF,
  
  Permissions.CREATE_SERVICE,
  Permissions.EDIT_SERVICE,
  Permissions.DELETE_SERVICE,
  
  Permissions.EDIT_ANY_APPOINTMENT,
  Permissions.DELETE_APPOINTMENT,
  
  Permissions.EDIT_CENTRE,
  Permissions.VIEW_ADMINS,

  // Client Management
  Permissions.CREATE_CLIENT,
  Permissions.EDIT_CLIENT,
  Permissions.DELETE_CLIENT,
  Permissions.IMPORT_CLIENTS,
  
  // Scan Management
  Permissions.VIEW_SCANS,
  Permissions.UPLOAD_SCANS,
  Permissions.ASSIGN_SCANS,
  Permissions.DELETE_SCANS,
];

// Define permissions for each role
export const RolePermissions: Record<string, string[]> = {
  'client': clientPermissions,
  'staff': staffPermissions,
  'admin': adminPermissions,
  'super-admin': Object.values(Permissions),
};

/**
 * Check if a user role has a specific permission
 * @param role The user's role
 * @param permission The permission to check
 * @returns boolean indicating if the role has the permission
 */
export function hasPermission(role: string, permission: string): boolean {
  if (!role || !permission) return false;
  
  // Normalize role name
  const normalizedRole = role.toLowerCase();
  
  // Super admin has all permissions
  if (normalizedRole === 'super-admin') return true;
  
  // Check if the role exists in our permissions map
  if (!RolePermissions[normalizedRole]) return false;
  
  // Check if the role has the specific permission
  return RolePermissions[normalizedRole].includes(permission);
}

/**
 * Check if a user has permission for a specific resource
 * @param role The user's role
 * @param permission The permission to check
 * @param userId The user's ID
 * @param resourceOwnerId The ID of the resource owner
 * @param userCentreIds Array of centre IDs the user is associated with
 * @param resourceCentreId The centre ID associated with the resource
 * @returns boolean indicating if the user has permission for the resource
 */
export function hasResourcePermission(
  role: string,
  permission: string,
  userId: string,
  resourceOwnerId?: string,
  userCentreIds?: string[],
  resourceCentreId?: string
): boolean {
  // First check if the role has the basic permission
  if (!hasPermission(role, permission)) return false;
  
  // Owner always has permission for their own resources
  if (resourceOwnerId && userId === resourceOwnerId) return true;
  
  // Check centre-based permissions
  if (
    resourceCentreId && 
    userCentreIds && 
    !userCentreIds.includes(resourceCentreId)
  ) {
    // If the resource belongs to a centre the user is not associated with,
    // only super-admin can access it
    return role.toLowerCase() === 'super-admin';
  }
  
  return true;
}

/**
 * Get all permissions for a specific role
 * @param role The user's role
 * @returns Array of permissions for the role
 */
export function getPermissionsForRole(role: string): string[] {
  if (!role) return [];
  
  const normalizedRole = role.toLowerCase();
  
  if (normalizedRole === 'super-admin') {
    return Object.values(Permissions);
  }
  
  return RolePermissions[normalizedRole] || [];
}
