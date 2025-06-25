/**
 * Life Arrow Database Schema
 * 
 * This file defines the database schema for the Life Arrow application.
 * It provides TypeScript interfaces that match the Firestore collections and documents.
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Base document interface with common fields for all documents
 */
export interface BaseDocument {
  id: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  createdBy?: string; // User ID who created the document
  updatedBy?: string; // User ID who last updated the document
}

/**
 * User document interface
 * Single collection for all users with role-specific fields
 */
export interface UserDocument extends BaseDocument {
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  photoURL?: string;
  phone?: string;
  
  // Address fields
  address?: {
    street?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
  };
  
  // Role and permissions
  role: string; // 'client', 'staff', 'admin', 'super-admin'
  permissions?: string[]; // Array of permission strings
  
  // Centre associations
  centreIds?: string[]; // IDs of centres the user is associated with
  primaryCentreId?: string; // Primary centre for the user
  
  // Staff-specific fields
  position?: string;
  department?: string;
  specializations?: string[];
  qualifications?: string;
  bio?: string;
  experience?: string;
  availability?: {
    [key: string]: { // Day of week
      start: string; // HH:MM format
      end: string; // HH:MM format
      isAvailable: boolean;
    }[];
  };
  serviceIds?: string[]; // Services this staff member can perform
  
  // Client-specific fields
  preferredStaffIds?: string[];
  notes?: string;
  
  // Emergency contact
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  
  // Account status
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Timestamp | Date;
}

/**
 * Centre document interface
 */
export interface CentreDocument extends BaseDocument {
  name: string;
  description?: string;
  logoURL?: string;
  
  // Address
  address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  
  // Contact information
  phone?: string;
  email?: string;
  website?: string;
  
  // Operating hours
  operatingHours?: {
    [key: string]: { // Day of week
      open: string; // HH:MM format
      close: string; // HH:MM format
      isClosed: boolean;
    };
  };
  
  // Centre settings
  settings?: {
    appointmentDuration: number; // Default appointment duration in minutes
    appointmentBuffer: number; // Buffer time between appointments in minutes
    maxDaysInAdvance: number; // Maximum days in advance for booking
    allowClientCancellation: boolean; // Whether clients can cancel appointments
    cancellationDeadline: number; // Hours before appointment when cancellation is no longer allowed
  };
  
  // Associated users
  adminIds?: string[]; // Admin users for this centre
  staffIds?: string[]; // Staff users for this centre
}

/**
 * Service document interface
 */
export interface ServiceDocument extends BaseDocument {
  name: string;
  description?: string;
  duration: number; // Duration in minutes
  price: number;
  imageURL?: string;
  
  // Service categorization
  category?: string;
  tags?: string[];
  
  // Service availability
  isActive: boolean;
  centreIds: string[]; // Centres where this service is available
  
  // Staff who can perform this service
  staffIds?: string[];
}

/**
 * Appointment document interface
 */
export interface AppointmentDocument extends BaseDocument {
  clientId: string;
  staffId: string;
  serviceId: string;
  centreId: string;
  
  // Appointment time
  startTime: Timestamp | Date;
  endTime: Timestamp | Date;
  
  // Status
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  cancellationReason?: string;
  
  // Notes
  clientNotes?: string;
  staffNotes?: string;
  
  // Payment
  paymentStatus?: 'pending' | 'paid' | 'refunded' | 'waived';
  paymentAmount?: number;
  paymentMethod?: string;
  
  // Reminders
  reminderSent?: boolean;
  followUpSent?: boolean;
}

/**
 * Role document interface
 * Defines custom roles and their permissions
 */
export interface RoleDocument extends BaseDocument {
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean; // Whether this is a system role that cannot be modified
  isDefault: boolean; // Whether this is a default role for new users
}

/**
 * Permission document interface
 * Defines all available permissions in the system
 */
export interface PermissionDocument extends BaseDocument {
  name: string;
  description: string;
  category: string;
  isSystem: boolean; // Whether this is a system permission that cannot be modified
}

/**
 * Notification document interface
 */
export interface NotificationDocument extends BaseDocument {
  userId: string;
  title: string;
  message: string;
  type: 'appointment' | 'system' | 'message';
  isRead: boolean;
  relatedDocId?: string; // ID of related document (e.g., appointment)
  relatedDocType?: string; // Type of related document
}

/**
 * Audit log document interface
 * For tracking important system events and changes
 */
export interface AuditLogDocument extends BaseDocument {
  userId: string;
  action: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Collection names in Firestore
 */
export const Collections = {
  USERS: 'users',
  CENTRES: 'centres',
  SERVICES: 'services',
  APPOINTMENTS: 'appointments',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
  NOTIFICATIONS: 'notifications',
  AUDIT_LOGS: 'audit_logs',
};
