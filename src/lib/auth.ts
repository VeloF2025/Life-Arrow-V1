/**
 * Authentication and Authorization Utilities
 * 
 * This module provides utilities for managing authentication and authorization
 * including Firebase custom claims for role-based access control.
 */

import { db, functions } from './firebase';
import { 
  doc, 
  updateDoc, 
  collection, 
  where, 
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getPermissionsForRole } from './permissions';
import type { UserProfile, UserRole } from '../types';
import { dbServices } from './database';
import * as Schema from './db-schema';

/**
 * Updates a user's role in Firestore using the new unified schema
 * @param userId The ID of the user to update
 * @param newRole The new role to assign to the user
 * @param permissions Optional array of specific permissions to assign
 * @returns Promise that resolves when the update is complete
 */
export async function updateUserRole(
  userId: string, 
  newRole: string, 
  permissions?: string[]
): Promise<void> {
  try {
    // Get the user from the new unified schema
    const user = await dbServices.users.getById(userId);
    
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    const oldRole = user.role;
    
    // Update the user's role
    await dbServices.users.update(userId, {
      role: newRole,
      // If permissions are provided, update them too
      ...(permissions ? { permissions } : {})
    });
    
    // Update the user's custom claims
    await syncUserCustomClaims(userId);
    
    console.log(`User role updated from ${oldRole} to ${newRole} with updated custom claims.`);
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

/**
 * Fetches a user's permissions based on their role and any custom permissions
 * @param userProfile The user's profile
 * @returns Array of permission strings
 */
export function getUserPermissions(userProfile: UserProfile): string[] {
  if (!userProfile || !userProfile.role) {
    return [];
  }
  
  // Get base permissions from role
  const rolePermissions = getPermissionsForRole(userProfile.role);
  
  // Add any custom permissions assigned directly to the user
  // TypeScript fix: Add permissions property to UserProfile in types.ts if not already there
  const customPermissions = (userProfile as any).permissions || [];
  
  // Combine and deduplicate permissions
  return [...new Set([...rolePermissions, ...customPermissions])];
}

/**
 * Checks if a user has a specific permission
 * @param userProfile The user's profile
 * @param permission The permission to check
 * @returns Boolean indicating if the user has the permission
 */
export function userHasPermission(userProfile: UserProfile, permission: string): boolean {
  if (!userProfile || !userProfile.role) {
    return false;
  }
  
  // Super-admin has all permissions
  if (userProfile.role === 'super-admin') {
    return true;
  }
  
  // Check for wildcard permission
  const permissions = getUserPermissions(userProfile);
  if (permissions.includes('*')) {
    return true;
  }
  
  // Check for specific permission
  return permissions.includes(permission);
}

/**
 * Fetches all users with a specific role using the new database service
 * @param role The role to filter by
 * @returns Promise that resolves to an array of user profiles
 */
export async function getUsersByRole(role: string): Promise<UserProfile[]> {
  try {
    const users = await dbServices.users.getByRole(role);
    
    // Convert to UserProfile type with proper type casting for role
    return users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL,
      role: user.role as UserRole,
      // These properties will need to be added to UserProfile type in types.ts
      ...(user as any)
    })) as UserProfile[];
  } catch (error) {
    console.error('Error fetching users by role:', error);
    throw error;
  }
}

/**
 * Synchronizes a user's Firebase Authentication custom claims with their role and permissions
 * @param userId The ID of the user to sync
 * @returns Promise that resolves when the sync is complete
 */
export async function syncUserCustomClaims(userId: string): Promise<void> {
  try {
    // Get the user from the database
    const user = await dbServices.users.getById(userId);
    
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // Get the role document to get permissions
    const roleQuery = await dbServices.roles.query([
      where('name', '==', user.role)
    ]);
    
    let rolePermissions: string[] = [];
    if (roleQuery.length > 0) {
      rolePermissions = roleQuery[0].permissions || [];
    }
    
    // Combine role permissions with user-specific permissions
    const userPermissions = user.permissions || [];
    const allPermissions = [...new Set([...rolePermissions, ...userPermissions])];
    
    // Prepare the claims object
    const claims = {
      role: user.role,
      permissions: allPermissions,
      centreIds: user.centreIds || [],
      primaryCentreId: user.primaryCentreId || null,
      lastUpdated: new Date().getTime()
    };
    
    // Call the Firebase Cloud Function to update custom claims
    // This requires a Cloud Function to be set up
    const updateClaims = httpsCallable(functions, 'updateUserClaims');
    await updateClaims({ userId, claims });
    
    console.log(`Custom claims updated for user ${userId}`);
    
    // For development/testing, we'll also store the claims in Firestore
    // This allows us to use them without waiting for Firebase Auth to refresh
    await updateDoc(doc(db, 'userClaims', userId), {
      ...claims,
      updatedAt: serverTimestamp()
    });
    
  } catch (error) {
    console.error('Error syncing user custom claims:', error);
    throw error;
  }
}

/**
 * Batch updates custom claims for all users
 * @returns Promise that resolves when the batch update is complete
 */
export async function batchSyncAllUserClaims(): Promise<{ success: number; failed: number }> {
  try {
    // Get all users
    const usersRef = collection(db, Schema.Collections.USERS);
    const usersSnapshot = await getDocs(usersRef);
    
    let successCount = 0;
    let failedCount = 0;
    
    // Process in batches of 10 to avoid overloading Firebase Functions
    const batchSize = 10;
    const userIds = usersSnapshot.docs.map(doc => doc.id);
    
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      // Process each batch in parallel
      const results = await Promise.allSettled(
        batch.map(userId => syncUserCustomClaims(userId))
      );
      
      // Count successes and failures
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          failedCount++;
          console.error(`Failed to sync claims for a user:`, result.reason);
        }
      });
      
      // Small delay to avoid rate limiting
      if (i + batchSize < userIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return { success: successCount, failed: failedCount };
  } catch (error) {
    console.error('Error in batch sync of user claims:', error);
    throw error;
  }
}
