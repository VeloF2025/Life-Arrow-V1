import { useState, useCallback } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as Schema from '@/lib/db-schema';
import { auth as firebaseAuth, storage as firebaseStorage } from '@/lib/firebase';
import { staffService } from '../api/staffService';

const initialAvailability: Schema.Availability = {
  monday: [{ isAvailable: false, start: '09:00', end: '17:00' }],
  tuesday: [{ isAvailable: false, start: '09:00', end: '17:00' }],
  wednesday: [{ isAvailable: false, start: '09:00', end: '17:00' }],
  thursday: [{ isAvailable: false, start: '09:00', end: '17:00' }],
  friday: [{ isAvailable: false, start: '09:00', end: '17:00' }],
  saturday: [{ isAvailable: false, start: '09:00', end: '17:00' }],
  sunday: [{ isAvailable: false, start: '09:00', end: '17:00' }],
};

// Initial form data
const initialFormData: Partial<Schema.UserDocument> = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'staff',
  phone: '',
  photoURL: '',
  primaryCentreId: '',
  bio: '',
  position: '',
  department: '',
  specializations: [],
  serviceIds: [],
  centreIds: [],
  availability: initialAvailability,
};

/**
 * Custom hook for managing staff form functionality
 */
export function useStaffForm() {
  const [formData, setFormData] = useState<Partial<Schema.UserDocument>>(initialFormData);
  const [editingMember, setEditingMember] = useState<Schema.UserDocument | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setEditingMember(null);
    setFormData(initialFormData);
    setPhotoFile(null);
    setPhotoPreview(null);
    setSubmitting(false);
    setError(null);
    setPassword('');
    setConfirmPassword('');
    if (isSuccess) setIsSuccess(false);
  }, []);

  // Set form data for editing
  const editStaff = useCallback((member: Schema.UserDocument) => {
    setEditingMember(member);
    setFormData({
      ...initialFormData,
      ...member,
      availability: {
        ...initialAvailability,
        ...(member.availability || {}),
      },
    });
    setPhotoPreview(member.photoURL || null);
  }, []);

  // Handle input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: Partial<Schema.UserDocument>) => ({ ...prev, [name]: value }));
  }, []);

  const handleMultiSelectChange = useCallback((name: 'serviceIds' | 'centreIds', value: string[]) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleAvailabilityChange = useCallback((day: keyof Schema.Availability, field: keyof Schema.TimeSlot, value: string | boolean) => {
    setFormData(prev => {
      const currentAvailability = prev.availability || initialAvailability;
      return {
        ...prev,
        availability: {
          ...currentAvailability,
          [day]: [{
            ...(currentAvailability[day]?.[0] || { isAvailable: false, start: '', end: '' }),
            [field]: value,
          }],
        },
      };
    });
  }, []);

  // Handle photo upload
  const handlePhotoChange = useCallback((file: File | null) => {
    setPhotoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      let finalPhotoURL = formData.photoURL || '';

      // Upload photo if provided
      if (photoFile) {
        const storageRef = ref(firebaseStorage, `staff-photos/${Date.now()}-${photoFile.name}`);
        const uploadResult = await uploadBytes(storageRef, photoFile);
        finalPhotoURL = await getDownloadURL(uploadResult.ref);
      }

      if (editingMember) {
        // Update existing staff member
        await staffService.update(editingMember.id, {
          ...formData,
          photoURL: finalPhotoURL || formData.photoURL,
        });
      } else {
        // Create new staff member
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setSubmitting(false);
          return;
        }

        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setSubmitting(false);
          return;
        }

        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
          firebaseAuth,
          formData.email || '',
          password
        );

        const userId = userCredential.user.uid;
        
        // Create a properly structured user document
        const dataToSave: Omit<Schema.UserDocument, 'id' | 'createdAt' | 'updatedAt'> = {
          ...initialFormData as Omit<Schema.UserDocument, 'id' | 'createdAt' | 'updatedAt'>,
          ...formData as Omit<Schema.UserDocument, 'id' | 'createdAt' | 'updatedAt'>,
          photoURL: finalPhotoURL,
          emailVerified: userCredential.user.emailVerified,
        };

        // Save user data to Firestore
        await staffService.create(userId, dataToSave);
      }

      resetForm();
      setIsSuccess(true);
    } catch (err: any) {
      console.error('Error saving staff:', err);
      setError(err.message || 'Failed to save staff member.');
    } finally {
      setSubmitting(false);
    }
  }, [formData, photoFile, password, confirmPassword, editingMember, resetForm]);

  return {
    formData,
    editingMember,
    photoPreview,
    password,
    confirmPassword,
    submitting,
    error,
    isSuccess,
    setFormData,
    setPassword,
    setConfirmPassword,
    setError,
    handleInputChange,
    handleMultiSelectChange,
    handleAvailabilityChange,
    handlePhotoChange,
    handleSubmit,
    resetForm,
    editStaff,
    isEditing: !!editingMember,
  };
}
