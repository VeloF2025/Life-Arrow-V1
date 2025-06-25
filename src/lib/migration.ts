/**
 * Database Migration Service
 * 
 * This service provides utilities for migrating data from the old database structure
 * to the new unified schema defined in db-schema.ts.
 */

import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  writeBatch, 
  query, 
  limit, 
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import * as Schema from './db-schema';
import { dbServices } from './database';

/**
 * Migration service for transferring data from old schema to new schema
 */
export class MigrationService {
  /**
   * Migrate all users from old collections to the new unified users collection
   * @returns Promise resolving to the number of users migrated
   */
  async migrateUsers(): Promise<number> {
    try {
      let migratedCount = 0;
      
      // Migrate from main users collection
      const usersSnapshot = await getDocs(collection(db, 'users'));
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // Skip if user already exists in new schema
        const existingUser = await dbServices.users.getById(userId);
        if (existingUser) continue;
        
        // Create base user document
        const newUser: Partial<Schema.UserDocument> = {
          id: userId,
          email: userData.email || '',
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          displayName: userData.displayName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
          photoURL: userData.avatar || userData.photoUrl || userData.photoURL || undefined,
          role: userData.role || 'client',
          isActive: true,
          emailVerified: userData.emailVerified || false,
          createdAt: userData.createdAt?.toDate() || new Date(),
          updatedAt: userData.updatedAt?.toDate() || new Date(),
        };
        
        // Add address fields if available
        if (userData.street || userData.city || userData.province || userData.postalCode) {
          newUser.address = {
            street: userData.street,
            city: userData.city,
            province: userData.province,
            postalCode: userData.postalCode,
            country: userData.country || 'South Africa', // Default country
          };
        }
        
        // Add phone if available
        if (userData.phone) {
          newUser.phone = userData.phone;
        }
        
        // Now fetch role-specific data based on user role
        switch (userData.role?.toLowerCase()) {
          case 'client': {
            try {
              const clientDoc = await getDoc(doc(db, 'clientProfiles', userId));
              if (clientDoc.exists()) {
                const clientData = clientDoc.data();
                
                // Add client-specific fields
                if (clientData.notes) newUser.notes = clientData.notes;
                if (clientData.preferredStaffIds) newUser.preferredStaffIds = clientData.preferredStaffIds;
                
                // Add emergency contact info if available
                if (clientData.emergencyContactName || clientData.emergencyContactPhone || clientData.emergencyContactRelationship) {
                  newUser.emergencyContact = {
                    name: clientData.emergencyContactName,
                    phone: clientData.emergencyContactPhone,
                    relationship: clientData.emergencyContactRelationship,
                  };
                }
              }
            } catch (error) {
              console.error('Error fetching client profile:', error);
            }
            break;
          }
          
          case 'admin':
          case 'super-admin': {
            try {
              const adminDoc = await getDoc(doc(db, 'adminProfiles', userId));
              if (adminDoc.exists()) {
                const adminData = adminDoc.data();
                
                // Add admin-specific fields
                if (adminData.position) newUser.position = adminData.position;
                if (adminData.department) newUser.department = adminData.department;
                if (adminData.centreIds) newUser.centreIds = adminData.centreIds;
                if (adminData.primaryCentreId) newUser.primaryCentreId = adminData.primaryCentreId;
              }
            } catch (error) {
              console.error('Error fetching admin profile:', error);
            }
            break;
          }
          
          case 'staff': {
            try {
              const staffDoc = await getDoc(doc(db, 'staff', userId));
              if (staffDoc.exists()) {
                const staffData = staffDoc.data();
                
                // Add staff-specific fields
                if (staffData.position) newUser.position = staffData.position;
                if (staffData.department) newUser.department = staffData.department;
                if (staffData.specializations) newUser.specializations = staffData.specializations;
                if (staffData.qualifications) newUser.qualifications = staffData.qualifications;
                if (staffData.bio) newUser.bio = staffData.bio;
                if (staffData.experience) newUser.experience = staffData.experience;
                if (staffData.availability) newUser.availability = staffData.availability;
                if (staffData.serviceIds) newUser.serviceIds = staffData.serviceIds;
                if (staffData.centreIds) newUser.centreIds = staffData.centreIds;
                
                // Add emergency contact info if available
                if (staffData.emergencyContactName || staffData.emergencyContactPhone || staffData.emergencyContactRelationship) {
                  newUser.emergencyContact = {
                    name: staffData.emergencyContactName,
                    phone: staffData.emergencyContactPhone,
                    relationship: staffData.emergencyContactRelationship,
                  };
                }
              }
            } catch (error) {
              console.error('Error fetching staff profile:', error);
            }
            break;
          }
        }
        
        // Create the user in the new schema
        await dbServices.users.create(newUser as any, userId);
        migratedCount++;
      }
      
      return migratedCount;
    } catch (error) {
      console.error('Error migrating users:', error);
      throw error;
    }
  }
  
  /**
   * Migrate all services from old services collection to the new schema
   * @returns Promise resolving to the number of services migrated
   */
  async migrateServices(): Promise<number> {
    try {
      let migratedCount = 0;
      
      const servicesSnapshot = await getDocs(collection(db, 'services'));
      
      for (const serviceDoc of servicesSnapshot.docs) {
        const serviceData = serviceDoc.data();
        const serviceId = serviceDoc.id;
        
        // Skip if service already exists in new schema
        const existingService = await dbServices.services.getById(serviceId);
        if (existingService) continue;
        
        // Create service document
        const newService: Partial<Schema.ServiceDocument> = {
          id: serviceId,
          name: serviceData.name || 'Unnamed Service',
          description: serviceData.description,
          duration: serviceData.duration || 60, // Default 60 minutes
          price: serviceData.price || 0,
          imageURL: serviceData.imageURL,
          category: serviceData.category,
          tags: serviceData.tags,
          isActive: serviceData.isActive !== false, // Default to active
          centreIds: serviceData.centreIds || [],
          staffIds: serviceData.staffIds || [],
          createdAt: serviceData.createdAt?.toDate() || new Date(),
          updatedAt: serviceData.updatedAt?.toDate() || new Date(),
        };
        
        // Create the service in the new schema
        await dbServices.services.create(newService as any, serviceId);
        migratedCount++;
      }
      
      return migratedCount;
    } catch (error) {
      console.error('Error migrating services:', error);
      throw error;
    }
  }
  
  /**
   * Migrate all appointments from old appointments collection to the new schema
   * @returns Promise resolving to the number of appointments migrated
   */
  async migrateAppointments(): Promise<number> {
    try {
      let migratedCount = 0;
      
      const appointmentsSnapshot = await getDocs(collection(db, 'appointments'));
      
      for (const appointmentDoc of appointmentsSnapshot.docs) {
        const appointmentData = appointmentDoc.data();
        const appointmentId = appointmentDoc.id;
        
        // Skip if appointment already exists in new schema
        const existingAppointment = await dbServices.appointments.getById(appointmentId);
        if (existingAppointment) continue;
        
        // Create appointment document
        const newAppointment: Partial<Schema.AppointmentDocument> = {
          id: appointmentId,
          clientId: appointmentData.clientId,
          staffId: appointmentData.staffId,
          serviceId: appointmentData.serviceId,
          centreId: appointmentData.centreId || 'default', // Default centre if not specified
          startTime: appointmentData.startTime?.toDate() || new Date(),
          endTime: appointmentData.endTime?.toDate() || new Date(),
          status: appointmentData.status || 'scheduled',
          cancellationReason: appointmentData.cancellationReason,
          clientNotes: appointmentData.clientNotes,
          staffNotes: appointmentData.staffNotes,
          paymentStatus: appointmentData.paymentStatus,
          paymentAmount: appointmentData.paymentAmount,
          paymentMethod: appointmentData.paymentMethod,
          reminderSent: appointmentData.reminderSent,
          followUpSent: appointmentData.followUpSent,
          createdAt: appointmentData.createdAt?.toDate() || new Date(),
          updatedAt: appointmentData.updatedAt?.toDate() || new Date(),
        };
        
        // Create the appointment in the new schema
        await dbServices.appointments.create(newAppointment as any, appointmentId);
        migratedCount++;
      }
      
      return migratedCount;
    } catch (error) {
      console.error('Error migrating appointments:', error);
      throw error;
    }
  }
  
  /**
   * Create default system roles in the new schema
   * @returns Promise resolving to the number of roles created
   */
  async createSystemRoles(): Promise<number> {
    try {
      const systemRoles = [
        {
          name: 'super-admin',
          description: 'Super administrator with full system access',
          permissions: ['*'], // Wildcard for all permissions
          isSystem: true,
          isDefault: false,
        },
        {
          name: 'admin',
          description: 'Administrator with centre management capabilities',
          permissions: [
            'view_staff', 'create_staff', 'edit_staff', 'delete_staff',
            'view_clients', 'create_client', 'edit_client', 'delete_client',
            'view_services', 'create_service', 'edit_service', 'delete_service',
            'view_centre_appointments', 'edit_any_appointment', 'delete_appointment',
            'view_centre', 'edit_centre',
            'view_admins',
          ],
          isSystem: true,
          isDefault: false,
        },
        {
          name: 'staff',
          description: 'Staff member who can manage appointments and clients',
          permissions: [
            'view_own_appointments', 'view_centre_appointments',
            'create_appointment', 'edit_own_appointment',
            'view_clients', 'view_client_details',
            'view_services', 'perform_service',
          ],
          isSystem: true,
          isDefault: false,
        },
        {
          name: 'client',
          description: 'Client who can book and manage their own appointments',
          permissions: [
            'view_own_appointments', 'create_appointment', 'edit_own_appointment',
            'view_services',
          ],
          isSystem: true,
          isDefault: true,
        },
      ];
      
      let createdCount = 0;
      
      for (const role of systemRoles) {
        // Check if role already exists
        const existingRoles = await dbServices.roles.query([
          query(collection(db, Schema.Collections.ROLES), 
            where('name', '==', role.name)
          )
        ]);
        
        if (existingRoles.length === 0) {
          await dbServices.roles.create(role as any);
          createdCount++;
        }
      }
      
      return createdCount;
    } catch (error) {
      console.error('Error creating system roles:', error);
      throw error;
    }
  }
  
  /**
   * Create default permissions in the new schema
   * @returns Promise resolving to the number of permissions created
   */
  async createSystemPermissions(): Promise<number> {
    try {
      const permissionCategories = [
        {
          category: 'appointments',
          permissions: [
            { name: 'view_own_appointments', description: 'View own appointments' },
            { name: 'view_centre_appointments', description: 'View all appointments in a centre' },
            { name: 'view_all_appointments', description: 'View all appointments across all centres' },
            { name: 'create_appointment', description: 'Create new appointments' },
            { name: 'edit_own_appointment', description: 'Edit own appointments' },
            { name: 'edit_any_appointment', description: 'Edit any appointment' },
            { name: 'delete_appointment', description: 'Delete appointments' },
          ],
        },
        {
          category: 'staff',
          permissions: [
            { name: 'view_staff', description: 'View staff list' },
            { name: 'view_staff_details', description: 'View staff details' },
            { name: 'create_staff', description: 'Create new staff members' },
            { name: 'edit_staff', description: 'Edit staff members' },
            { name: 'delete_staff', description: 'Delete staff members' },
          ],
        },
        {
          category: 'clients',
          permissions: [
            { name: 'view_clients', description: 'View client list' },
            { name: 'view_client_details', description: 'View client details' },
            { name: 'create_client', description: 'Create new clients' },
            { name: 'edit_client', description: 'Edit clients' },
            { name: 'delete_client', description: 'Delete clients' },
          ],
        },
        {
          category: 'services',
          permissions: [
            { name: 'view_services', description: 'View services list' },
            { name: 'create_service', description: 'Create new services' },
            { name: 'edit_service', description: 'Edit services' },
            { name: 'delete_service', description: 'Delete services' },
            { name: 'perform_service', description: 'Perform services (for staff)' },
          ],
        },
        {
          category: 'admin',
          permissions: [
            { name: 'view_admins', description: 'View admin list' },
            { name: 'create_admin', description: 'Create new admins' },
            { name: 'edit_admin', description: 'Edit admins' },
            { name: 'delete_admin', description: 'Delete admins' },
            { name: 'promote_to_admin', description: 'Promote users to admin' },
            { name: 'demote_from_admin', description: 'Demote users from admin' },
          ],
        },
        {
          category: 'centre',
          permissions: [
            { name: 'view_centre', description: 'View centre details' },
            { name: 'create_centre', description: 'Create new centres' },
            { name: 'edit_centre', description: 'Edit centres' },
            { name: 'delete_centre', description: 'Delete centres' },
          ],
        },
        {
          category: 'system',
          permissions: [
            { name: 'manage_system', description: 'Manage system settings' },
            { name: 'promote_to_superadmin', description: 'Promote users to super admin' },
          ],
        },
      ];
      
      let createdCount = 0;
      
      for (const category of permissionCategories) {
        for (const permission of category.permissions) {
          // Check if permission already exists
          const existingPermissions = await dbServices.permissions.query([
            query(collection(db, Schema.Collections.PERMISSIONS), 
              where('name', '==', permission.name)
            )
          ]);
          
          if (existingPermissions.length === 0) {
            await dbServices.permissions.create({
              name: permission.name,
              description: permission.description,
              category: category.category,
              isSystem: true,
            } as any);
            createdCount++;
          }
        }
      }
      
      return createdCount;
    } catch (error) {
      console.error('Error creating system permissions:', error);
      throw error;
    }
  }
  
  /**
   * Migrate all data from old schema to new schema
   * @returns Promise resolving to an object with migration statistics
   */
  async migrateAll(): Promise<{
    users: number;
    services: number;
    appointments: number;
    roles: number;
    permissions: number;
  }> {
    try {
      // Create system roles and permissions first
      const roles = await this.createSystemRoles();
      const permissions = await this.createSystemPermissions();
      
      // Then migrate user data
      const users = await this.migrateUsers();
      const services = await this.migrateServices();
      const appointments = await this.migrateAppointments();
      
      return {
        users,
        services,
        appointments,
        roles,
        permissions,
      };
    } catch (error) {
      console.error('Error in full migration:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const migrationService = new MigrationService();
