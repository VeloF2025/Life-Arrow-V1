import { useState } from 'react';
import * as Schema from '@/lib/db-schema';

// Define the user type that combines Firebase user with our custom user data
export interface AuthUser extends Partial<Schema.UserDocument> {
  id: string;
  email: string;
  role?: string;
  centreIds?: string[];
}

/**
 * Simplified auth hook for development purposes
 * This is a temporary solution until we implement the full auth system
 */
export function useAuth() {
  // For development, we'll use a mock admin user
  const mockUser: AuthUser = {
    id: 'mock-admin-id',
    email: 'admin@lifearrow.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    centreIds: ['centre-1'],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const [user] = useState<AuthUser | null>(mockUser);
  const [loading] = useState<boolean>(false);
  const [error] = useState<string | null>(null);

  // Mock auth functions
  const signIn = async () => {
    console.log('Mock sign in');
  };

  const signOut = async () => {
    console.log('Mock sign out');
  };

  const createUser = async () => {
    console.log('Mock create user');
  };

  const resetPassword = async () => {
    console.log('Mock reset password');
  };

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
    createUser,
    resetPassword
  };
}
