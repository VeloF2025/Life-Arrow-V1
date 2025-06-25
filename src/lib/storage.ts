import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Uploads a photo to Firebase Storage and returns the download URL
 * @param file The file to upload
 * @param path The storage path (e.g., 'staff/123', 'profiles/123')
 * @returns Promise that resolves to the download URL of the uploaded file
 */
export const uploadPhoto = async (file: File, path: string): Promise<string> => {
  const photoRef = ref(storage, `${path}/photo_${Date.now()}`);
  await uploadBytes(photoRef, file);
  return await getDownloadURL(photoRef);
};

/**
 * Validates a photo file's size and type
 * @param file The file to validate
 * @param maxSize Maximum file size in bytes (default: 5MB)
 * @returns Object containing validation result and error message if any
 */
export const validatePhoto = (file: File, maxSize: number = 5 * 1024 * 1024) => {
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'Photo size must be less than 5MB'
    };
  }
  
  if (!file.type.startsWith('image/')) {
    return {
      isValid: false,
      error: 'Please select a valid image file'
    };
  }

  return {
    isValid: true,
    error: null
  };
};
