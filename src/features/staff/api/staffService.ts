import { deleteObject, ref } from 'firebase/storage';
import * as Schema from '@/lib/db-schema';
import { dbServices } from '@/lib/database';
import { db, storage as firebaseStorage } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

/**
 * Service for managing staff members
 */
export const staffService = {
  /**
   * Get all staff and admin users for a specific centre.
   * @param centreId The ID of the centre to filter by.
   */
  async getAll(centreId: string): Promise<Schema.UserDocument[]> {
    console.log("staffService.getAll called with centreId:", centreId);
    
    try {
      // If no centreId provided, get all staff members
      if (!centreId) {
        console.log("Getting all staff members (no centre filter)");
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef,
          where('role', 'in', ['staff', 'admin', 'Staff', 'Admin'])
        );
        const querySnapshot = await getDocs(q);
        const staff = querySnapshot.docs.map(doc => {
          // Cast the document data to any first to avoid TypeScript errors
          const data = doc.data() as any;
          
          // Create a proper full name
          const firstName = data.firstName || '';
          const lastName = data.lastName || '';
          const fullName = `${firstName} ${lastName}`.trim();
          const displayName = data.displayName || '';
          const email = data.email || '';
          
          // Log each staff member for debugging
          console.log(`Processing staff: ${doc.id}, Name: ${fullName || displayName || email}`);
          
          // Add the document ID and fullName property
          const staffMember: Schema.UserDocument = {
            ...data,
            id: doc.id,
            fullName: fullName || displayName || email || doc.id
          };
          return staffMember;
        });
        
        console.log(`Found ${staff.length} staff members`);
        return staff;
      }
      
      // Filter by centreId
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('centreIds', 'array-contains', centreId),
        where('role', 'in', ['staff', 'admin', 'Staff', 'Admin'])
      );
      const querySnapshot = await getDocs(q);
      const staff = querySnapshot.docs.map(doc => {
        // Cast the document data to any first to avoid TypeScript errors
        const data = doc.data() as any;
        
        // Create a proper full name
        const firstName = data.firstName || '';
        const lastName = data.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();
        const displayName = data.displayName || '';
        const email = data.email || '';
        
        // Log each staff member for debugging
        console.log(`Processing staff: ${doc.id}, Name: ${fullName || displayName || email}`);
        
        // Add the document ID and fullName property
        const staffMember: Schema.UserDocument = {
          ...data,
          id: doc.id,
          fullName: fullName || displayName || email || doc.id
        };
        return staffMember;
      });
      
      console.log(`Found ${staff.length} staff members for centre ${centreId}`);
      return staff;
    } catch (error) {
      console.error('Error fetching staff:', error);
      return [];
    }
  },
  
  /**
   * Get all staff and admin users for admin users.
   * This doesn't filter by centre, allowing admins to see all staff.
   */
  async getAllForAdmin(): Promise<Schema.UserDocument[]> {
    console.log("staffService.getAllForAdmin called");
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('role', 'in', ['staff', 'admin', 'Staff', 'Admin'])
    );
    const querySnapshot = await getDocs(q);
    const staff = querySnapshot.docs.map(doc => {
      // Cast the document data to any first to avoid TypeScript errors
      const data = doc.data() as any;
      // Add the document ID and fullName property
      const staffMember: Schema.UserDocument = {
        ...data,
        id: doc.id,
        fullName: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.displayName || data.email || doc.id
      };
      return staffMember;
    });
    
    console.log(`Found ${staff.length} staff members for admin`);
    return staff;
  },

  /**
   * Create a new staff member
   */
  async create(id: string, data: Omit<Schema.UserDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<Schema.UserDocument> {
    return await dbServices.users.create(data, id);
  },

  /**
   * Update an existing staff member
   */
  async update(id: string, data: Partial<Schema.UserDocument>): Promise<void> {
    await dbServices.users.update(id, data);
  },

  /**
   * Delete a staff member
   */
  async delete(member: Schema.UserDocument): Promise<void> {
    if (member.photoURL) {
      const photoRef = ref(firebaseStorage, member.photoURL);
      await deleteObject(photoRef).catch(err => console.error("Non-fatal: could not delete photo", err));
    }
    await dbServices.users.delete(member.id);
  },

  /**
   * Promote a staff member to admin
   */
  async promote(staffMember: Schema.UserDocument): Promise<void> {
    await dbServices.users.update(staffMember.id, { role: 'admin' });
  },

  /**
   * Reset a staff member's password
   */
  async resetPassword(email: string): Promise<void> {
    // This would typically call a Firebase function to reset the password
    // For now, we'll just log it
    console.log(`Password reset requested for ${email}`);
  }
};
