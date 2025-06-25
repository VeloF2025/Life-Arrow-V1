/**
 * Database Service
 * 
 * This service provides methods for interacting with the Firestore database
 * using the schema defined in db-schema.ts.
 */

import { 
  doc, 
  collection, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  QueryConstraint,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import * as Schema from './db-schema';

/**
 * Generic database service for CRUD operations
 */
export class DatabaseService<T extends Schema.BaseDocument> {
  constructor(private collectionName: string) {}
  
  /**
   * Create a new document
   * @param data Document data
   * @param id Optional document ID (will be generated if not provided)
   * @returns Promise resolving to the created document
   */
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>, id?: string): Promise<T> {
    const docRef = id 
      ? doc(db, this.collectionName, id) 
      : doc(collection(db, this.collectionName));
    
    const timestamp = serverTimestamp();
    const docData = {
      ...data,
      id: docRef.id,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    
    await setDoc(docRef, docData);
    
    // Return the created document with proper date objects
    return {
      ...docData,
      id: docRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as T;
  }
  
  /**
   * Get a document by ID
   * @param id Document ID
   * @returns Promise resolving to the document or null if not found
   */
  async getById(id: string): Promise<T | null> {
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    return this.processDocument(docSnap) as T;
  }
  
  /**
   * Update a document
   * @param id Document ID
   * @param data Data to update
   * @returns Promise resolving when the update is complete
   */
  async update(id: string, data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }
  
  /**
   * Delete a document
   * @param id Document ID
   * @returns Promise resolving when the delete is complete
   */
  async delete(id: string): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await deleteDoc(docRef);
  }
  
  /**
   * Query documents
   * @param constraints Query constraints
   * @returns Promise resolving to an array of documents
   */
  async query(constraints: QueryConstraint[] = []): Promise<T[]> {
    const q = query(collection(db, this.collectionName), ...constraints);
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => this.processDocument(doc) as T);
  }
  
  /**
   * Process a document snapshot to convert Firestore timestamps to Date objects
   * @param doc Document snapshot
   * @returns Processed document data
   */
  protected processDocument(doc: DocumentSnapshot): any {
    const data = doc.data();
    if (!data) return null;
    
    // Convert Firestore timestamps to Date objects
    const processed = { ...data, id: doc.id } as Record<string, any>;
    
    // Helper function to convert Timestamp to Date if it exists
    const convertTimestampField = (fieldName: string) => {
      if (processed[fieldName] instanceof Timestamp) {
        processed[fieldName] = processed[fieldName].toDate();
      }
    };
    
    // Convert common timestamp fields
    convertTimestampField('createdAt');
    convertTimestampField('updatedAt');
    convertTimestampField('lastLoginAt');
    convertTimestampField('startTime');
    convertTimestampField('endTime');
    
    return processed;
  }
}

/**
 * User database service
 */
export class UserService extends DatabaseService<Schema.UserDocument> {
  constructor() {
    super(Schema.Collections.USERS);
  }
  
  /**
   * Get all users
   * @returns Promise resolving to an array of all users
   */
  async getAll(): Promise<Schema.UserDocument[]> {
    return this.query([orderBy('email')]);
  }
  
  /**
   * Get users by role
   * @param role User role
   * @returns Promise resolving to an array of users with the specified role
   */
  async getByRole(role: string): Promise<Schema.UserDocument[]> {
    return this.query([where('role', '==', role), orderBy('lastName')]);
  }
  
  /**
   * Get users by centre
   * @param centreId Centre ID
   * @returns Promise resolving to an array of users associated with the specified centre
   */
  async getByCentre(centreId: string): Promise<Schema.UserDocument[]> {
    return this.query([where('centreIds', 'array-contains', centreId), orderBy('lastName')]);
  }
  
  /**
   * Get staff users who can perform a specific service
   * @param serviceId Service ID
   * @returns Promise resolving to an array of staff users who can perform the service
   */
  async getStaffByService(serviceId: string): Promise<Schema.UserDocument[]> {
    return this.query([
      where('role', '==', 'staff'),
      where('serviceIds', 'array-contains', serviceId),
      orderBy('lastName')
    ]);
  }
  
  /**
   * Update a user's role and permissions
   * @param userId User ID
   * @param role New role
   * @param permissions Optional array of specific permissions
   * @returns Promise resolving when the update is complete
   */
  async updateRole(userId: string, role: string, permissions?: string[]): Promise<void> {
    const updateData: any = { role };
    
    if (permissions) {
      updateData.permissions = permissions;
    }
    
    return this.update(userId, updateData);
  }
}

/**
 * Centre database service
 */
export class CentreService extends DatabaseService<Schema.CentreDocument> {
  constructor() {
    super(Schema.Collections.CENTRES);
  }
  
  /**
   * Get centres by admin user
   * @param adminId Admin user ID
   * @returns Promise resolving to an array of centres administered by the specified user
   */
  async getByAdmin(adminId: string): Promise<Schema.CentreDocument[]> {
    return this.query([where('adminIds', 'array-contains', adminId), orderBy('name')]);
  }
  
  /**
   * Add a user to a centre
   * @param centreId Centre ID
   * @param userId User ID
   * @param role User's role in the centre ('admin' or 'staff')
   * @returns Promise resolving when the update is complete
   */
  async addUser(centreId: string, userId: string, role: 'admin' | 'staff'): Promise<void> {
    const centre = await this.getById(centreId);
    if (!centre) throw new Error(`Centre with ID ${centreId} not found`);
    
    const fieldName = role === 'admin' ? 'adminIds' : 'staffIds';
    const userIds = centre[fieldName] || [];
    
    if (!userIds.includes(userId)) {
      await this.update(centreId, {
        [fieldName]: [...userIds, userId]
      });
    }
    
    // Update the user's centreIds as well
    const userService = new UserService();
    const user = await userService.getById(userId);
    if (user) {
      const centreIds = user.centreIds || [];
      if (!centreIds.includes(centreId)) {
        await userService.update(userId, {
          centreIds: [...centreIds, centreId]
        });
      }
    }
  }
  
  /**
   * Remove a user from a centre
   * @param centreId Centre ID
   * @param userId User ID
   * @param role User's role in the centre ('admin' or 'staff')
   * @returns Promise resolving when the update is complete
   */
  async removeUser(centreId: string, userId: string, role: 'admin' | 'staff'): Promise<void> {
    const centre = await this.getById(centreId);
    if (!centre) throw new Error(`Centre with ID ${centreId} not found`);
    
    const fieldName = role === 'admin' ? 'adminIds' : 'staffIds';
    const userIds = centre[fieldName] || [];
    
    if (userIds.includes(userId)) {
      await this.update(centreId, {
        [fieldName]: userIds.filter(id => id !== userId)
      });
    }
    
    // Update the user's centreIds as well
    const userService = new UserService();
    const user = await userService.getById(userId);
    if (user) {
      const centreIds = user.centreIds || [];
      if (centreIds.includes(centreId)) {
        await userService.update(userId, {
          centreIds: centreIds.filter(id => id !== centreId)
        });
      }
    }
  }
}

/**
 * Service database service
 */
export class ServiceService extends DatabaseService<Schema.ServiceDocument> {
  constructor() {
    super(Schema.Collections.SERVICES);
  }
  
  /**
   * Get services by centre
   * @param centreId Centre ID
   * @returns Promise resolving to an array of services available at the specified centre
   */
  async getByCentre(centreId: string): Promise<Schema.ServiceDocument[]> {
    return this.query([
      where('centreIds', 'array-contains', centreId),
      where('isActive', '==', true),
      orderBy('name')
    ]);
  }
  
  /**
   * Get services by staff member
   * @param staffId Staff user ID
   * @returns Promise resolving to an array of services the staff member can perform
   */
  async getByStaff(staffId: string): Promise<Schema.ServiceDocument[]> {
    return this.query([
      where('staffIds', 'array-contains', staffId),
      where('isActive', '==', true),
      orderBy('name')
    ]);
  }
  
  /**
   * Add a staff member to a service
   * @param serviceId Service ID
   * @param staffId Staff user ID
   * @returns Promise resolving when the update is complete
   */
  async addStaff(serviceId: string, staffId: string): Promise<void> {
    const service = await this.getById(serviceId);
    if (!service) throw new Error(`Service with ID ${serviceId} not found`);
    
    const staffIds = service.staffIds || [];
    
    if (!staffIds.includes(staffId)) {
      await this.update(serviceId, {
        staffIds: [...staffIds, staffId]
      });
    }
    
    // Update the staff user's serviceIds as well
    const userService = new UserService();
    const user = await userService.getById(staffId);
    if (user) {
      const serviceIds = user.serviceIds || [];
      if (!serviceIds.includes(serviceId)) {
        await userService.update(staffId, {
          serviceIds: [...serviceIds, serviceId]
        });
      }
    }
  }
  
  /**
   * Remove a staff member from a service
   * @param serviceId Service ID
   * @param staffId Staff user ID
   * @returns Promise resolving when the update is complete
   */
  async removeStaff(serviceId: string, staffId: string): Promise<void> {
    const service = await this.getById(serviceId);
    if (!service) throw new Error(`Service with ID ${serviceId} not found`);
    
    const staffIds = service.staffIds || [];
    
    if (staffIds.includes(staffId)) {
      await this.update(serviceId, {
        staffIds: staffIds.filter(id => id !== staffId)
      });
    }
    
    // Update the staff user's serviceIds as well
    const userService = new UserService();
    const user = await userService.getById(staffId);
    if (user) {
      const serviceIds = user.serviceIds || [];
      if (serviceIds.includes(serviceId)) {
        await userService.update(staffId, {
          serviceIds: serviceIds.filter(id => id !== serviceId)
        });
      }
    }
  }
}

/**
 * Appointment database service
 */
export class AppointmentService extends DatabaseService<Schema.AppointmentDocument> {
  constructor() {
    super(Schema.Collections.APPOINTMENTS);
  }
  
  /**
   * Get appointments by client
   * @param clientId Client user ID
   * @returns Promise resolving to an array of appointments for the specified client
   */
  async getByClient(clientId: string): Promise<Schema.AppointmentDocument[]> {
    return this.query([
      where('clientId', '==', clientId),
      orderBy('startTime', 'desc')
    ]);
  }
  
  /**
   * Get appointments by staff member
   * @param staffId Staff user ID
   * @returns Promise resolving to an array of appointments for the specified staff member
   */
  async getByStaff(staffId: string): Promise<Schema.AppointmentDocument[]> {
    return this.query([
      where('staffId', '==', staffId),
      orderBy('startTime', 'desc')
    ]);
  }
  
  /**
   * Get appointments by centre
   * @param centreId Centre ID
   * @returns Promise resolving to an array of appointments at the specified centre
   */
  async getByCentre(centreId: string): Promise<Schema.AppointmentDocument[]> {
    return this.query([
      where('centreId', '==', centreId),
      orderBy('startTime', 'desc')
    ]);
  }
  
  /**
   * Get appointments by date range
   * @param startDate Start date
   * @param endDate End date
   * @returns Promise resolving to an array of appointments within the specified date range
   */
  async getByDateRange(startDate: Date, endDate: Date): Promise<Schema.AppointmentDocument[]> {
    return this.query([
      where('startTime', '>=', startDate),
      where('startTime', '<=', endDate),
      orderBy('startTime')
    ]);
  }
  
  /**
   * Update appointment status
   * @param appointmentId Appointment ID
   * @param status New status
   * @param reason Optional reason for status change
   * @returns Promise resolving when the update is complete
   */
  async updateStatus(
    appointmentId: string, 
    status: Schema.AppointmentDocument['status'], 
    reason?: string
  ): Promise<void> {
    const updateData: any = { status };
    
    if (reason && status === 'cancelled') {
      updateData.cancellationReason = reason;
    }
    
    return this.update(appointmentId, updateData);
  }
}

/**
 * Role database service
 */
export class RoleService extends DatabaseService<Schema.RoleDocument> {
  constructor() {
    super(Schema.Collections.ROLES);
  }
  
  /**
   * Get all roles
   * @returns Promise resolving to an array of all roles
   */
  async getAll(): Promise<Schema.RoleDocument[]> {
    return this.query([orderBy('name')]);
  }
  
  /**
   * Get all non-system roles
   * @returns Promise resolving to an array of custom roles
   */
  async getCustomRoles(): Promise<Schema.RoleDocument[]> {
    return this.query([where('isSystem', '==', false), orderBy('name')]);
  }
  
  /**
   * Get all system roles
   * @returns Promise resolving to an array of system roles
   */
  async getSystemRoles(): Promise<Schema.RoleDocument[]> {
    return this.query([where('isSystem', '==', true), orderBy('name')]);
  }
}

/**
 * Permission database service
 */
export class PermissionService extends DatabaseService<Schema.PermissionDocument> {
  constructor() {
    super(Schema.Collections.PERMISSIONS);
  }
  
  /**
   * Get permissions by category
   * @param category Permission category
   * @returns Promise resolving to an array of permissions in the specified category
   */
  async getByCategory(category: string): Promise<Schema.PermissionDocument[]> {
    return this.query([where('category', '==', category), orderBy('name')]);
  }
}

/**
 * Notification database service
 */
export class NotificationService extends DatabaseService<Schema.NotificationDocument> {
  constructor() {
    super(Schema.Collections.NOTIFICATIONS);
  }
  
  /**
   * Get notifications for a user
   * @param userId User ID
   * @param onlyUnread Whether to only get unread notifications
   * @returns Promise resolving to an array of notifications for the specified user
   */
  async getForUser(userId: string, onlyUnread = false): Promise<Schema.NotificationDocument[]> {
    const constraints: QueryConstraint[] = [
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    ];
    
    if (onlyUnread) {
      constraints.push(where('isRead', '==', false));
    }
    
    return this.query(constraints);
  }
  
  /**
   * Mark a notification as read
   * @param notificationId Notification ID
   * @returns Promise resolving when the update is complete
   */
  async markAsRead(notificationId: string): Promise<void> {
    return this.update(notificationId, { isRead: true });
  }
  
  /**
   * Mark all notifications for a user as read
   * @param userId User ID
   * @returns Promise resolving when the update is complete
   */
  async markAllAsRead(userId: string): Promise<void> {
    const notifications = await this.getForUser(userId, true);
    
    const promises = notifications.map(notification => 
      this.update(notification.id, { isRead: true })
    );
    
    await Promise.all(promises);
  }
}

/**
 * Audit log database service
 */
export class AuditLogService extends DatabaseService<Schema.AuditLogDocument> {
  constructor() {
    super(Schema.Collections.AUDIT_LOGS);
  }
  
  /**
   * Log an action
   * @param userId User ID
   * @param action Action description
   * @param details Action details
   * @returns Promise resolving to the created audit log
   */
  async logAction(
    userId: string, 
    action: string, 
    details: any, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<Schema.AuditLogDocument> {
    return this.create({
      userId,
      action,
      details,
      ipAddress,
      userAgent
    });
  }
  
  /**
   * Get audit logs for a user
   * @param userId User ID
   * @returns Promise resolving to an array of audit logs for the specified user
   */
  async getForUser(userId: string): Promise<Schema.AuditLogDocument[]> {
    return this.query([
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    ]);
  }
}

/**
 * Export database services
 */
export const dbServices = {
  users: new UserService(),
  centres: new CentreService(),
  services: new ServiceService(),
  appointments: new AppointmentService(),
  roles: new RoleService(),
  permissions: new PermissionService(),
  notifications: new NotificationService(),
  auditLogs: new AuditLogService(),
};
