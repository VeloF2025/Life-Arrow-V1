import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { ref, deleteObject } from 'firebase/storage';

import { usePermissions } from '@/hooks/usePermissions';
import { dbServices } from '@/lib/database';
import { auth as firebaseAuth, storage as firebaseStorage } from '@/lib/firebase';
import { updateUserRole } from '@/lib/auth';
import { uploadPhoto, validatePhoto } from '@/lib/storage';
import * as Schema from '@/lib/db-schema';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';

// Static data for form dropdowns
const positions = ['Therapist', 'Receptionist', 'Manager', 'Consultant', 'Specialist'];
const departments = ['Clinical', 'Administration', 'Wellness', 'Support'];

export function StaffManagement() {
  // ~ Hooks ~
  const { can, permissions } = usePermissions();

  // ~ State ~
  const [staff, setStaff] = useState<Schema.UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingMember, setEditingMember] = useState<Schema.UserDocument | null>(null);

  // New user form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Photo state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Promotion state
  const [promotingStaff, setPromotingStaff] = useState<string | null>(null);
  const [showPromoteConfirm, setShowPromoteConfirm] = useState<Schema.UserDocument | null>(null);
  const [promotionError, setPromotionError] = useState<string | null>(null);
  
  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Schema.UserDocument | null>(null);

  // Password Reset state
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState<Schema.UserDocument | null>(null);

  const initialFormData: Partial<Schema.UserDocument> = {
    email: '',
    firstName: '',
    lastName: '',
    role: 'staff',
    isActive: true,
    emailVerified: false,
    phone: '',
    photoURL: '',
    centreIds: [],
    primaryCentreId: '',
    bio: '',
    position: '',
    department: '',
    specializations: [],
  };

  const [formData, setFormData] = useState<Partial<Schema.UserDocument>>(initialFormData);

  // ~ Permissions ~
  const canViewStaff = useMemo(() => can('staff:view'), [can]);
  const canCreateStaff = useMemo(() => can('staff:create'), [can]);
  const canEditStaff = useMemo(() => can('staff:edit'), [can]);
  const canDeleteStaff = useMemo(() => can('staff:delete'), [can]);
  const canPromoteStaff = useMemo(() => can('staff:promote'), [can]);
  const canResetPassword = useMemo(() => can('staff:reset-password'), [can]);

  // ~ Data Loading ~
  const loadStaff = useCallback(async () => {
    if (!canViewStaff) return;
    setLoading(true);
    try {
      const allUsers = await dbServices.users.getAll();
      setStaff(allUsers.filter(u => u.role === 'staff' || u.role === 'admin'));
      setError(null);
    } catch (err) {
      setError('Failed to load staff.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [canViewStaff]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  // ~ Handlers ~
  const resetFormData = () => {
    setEditingMember(null);
    setFormData(initialFormData);
    setShowAddForm(false);
    setPhotoFile(null);
    setPhotoPreview(null);
    setSubmitting(false);
    setError(null);
    setPromotionError(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: Partial<Schema.UserDocument>) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editingMember && !canEditStaff) {
      setError("You don't have permission to edit staff.");
      return;
    }
    if (!editingMember && !canCreateStaff) {
      setError("You don't have permission to create staff.");
      return;
    }
    if (!editingMember && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!editingMember && password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (!formData.email) {
      setError('Email is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let finalPhotoURL = editingMember?.photoURL || formData.photoURL || '';
      if (photoFile) {
        setUploadingPhoto(true);
        const uploadedUrl = await uploadPhoto(photoFile, `staff-photos/${Date.now()}-${photoFile.name}`);
        setUploadingPhoto(false);
        if (uploadedUrl) {
          finalPhotoURL = uploadedUrl;
        } else {
          setError('Failed to upload photo.');
          setSubmitting(false);
          return;
        }
      }

      if (editingMember) {
        const dataToUpdate = { ...formData, photoURL: finalPhotoURL };
        await dbServices.users.update(editingMember.id, dataToUpdate);
      } else {
        const userCredential = await createUserWithEmailAndPassword(firebaseAuth, formData.email, password);
        const userId = userCredential.user.uid;
        
        // Create a properly structured user document
        const dataToSave: Omit<Schema.UserDocument, 'id' | 'createdAt' | 'updatedAt'> = {
          ...initialFormData as Omit<Schema.UserDocument, 'id' | 'createdAt' | 'updatedAt'>,
          ...formData as Omit<Schema.UserDocument, 'id' | 'createdAt' | 'updatedAt'>,
          photoURL: finalPhotoURL,
          emailVerified: userCredential.user.emailVerified,
        };
        
        await dbServices.users.create(dataToSave, userId);
      }

      await loadStaff();
      resetFormData();
    } catch (err: any) {
      console.error('Error saving staff member:', err);
      setError(err.message || 'Failed to save staff member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (member: Schema.UserDocument) => {
    setEditingMember(member);
    setFormData(member);
    setPhotoPreview(member.photoURL || null);
    setShowAddForm(true);
  };

  const handleDelete = async (member: Schema.UserDocument) => {
    if (!canDeleteStaff) {
      setError("You don't have permission to delete staff.");
      return;
    }
    
    try {
      if (member.photoURL) {
        const photoRef = ref(firebaseStorage, member.photoURL);
        await deleteObject(photoRef).catch(err => console.error("Non-fatal: could not delete photo", err));
      }
      await dbServices.users.delete(member.id);
      setShowDeleteConfirm(null);
      await loadStaff();
    } catch (err) {
      setError('Failed to delete staff member.');
      console.error(err);
    }
  };

  const promoteStaffToAdmin = async (staffMember: Schema.UserDocument) => {
    if (!canPromoteStaff) {
      setPromotionError("You don't have permission to promote staff.");
      return;
    }
    setPromotingStaff(staffMember.id);
    setPromotionError(null);
    try {
      await updateUserRole(staffMember.id, 'admin');
      await loadStaff();
    } catch (error: any) {
      setPromotionError(error.message || 'Failed to promote staff.');
    } finally {
      setPromotingStaff(null);
      setShowPromoteConfirm(null);
    }
  };

  const handlePasswordReset = async (email: string) => {
    if (!canResetPassword) {
      setError("You don't have permission to reset passwords.");
      return;
    }
    setResettingPassword(email);
    try {
      await sendPasswordResetEmail(firebaseAuth, email);
      alert('Password reset email sent successfully.');
    } catch (error: any) {
      setError(error.message || 'Failed to send password reset email.');
    } finally {
      setResettingPassword(null);
      setShowPasswordReset(null);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validatePhoto(file);
      if (!validation.isValid) {
        setError(validation.error);
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCameraModal(true);
      }
    } catch (err) {
      setError("Could not access the camera. Please ensure you have given permission.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCameraModal(false);
  };
  
  const closeCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCameraModal(false);
  };

  const handleTakePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (blob) {
          const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
          setPhotoFile(file);
          setPhotoPreview(URL.createObjectURL(file));
        }
      }, 'image/jpeg');
      closeCamera();
    }
  };

  const filteredStaff = useMemo(() =>
    staff.filter(member => {
      const search = searchTerm.toLowerCase();
      return (
        (member.firstName || '').toLowerCase().includes(search) ||
        (member.lastName || '').toLowerCase().includes(search) ||
        (member.email || '').toLowerCase().includes(search) ||
        (member.position || '').toLowerCase().includes(search) ||
        (member.department || '').toLowerCase().includes(search)
      );
    }),
    [staff, searchTerm]
  );



  if (!canViewStaff) {
    return (
      <div className="p-6 text-center">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500">You don't have permission to view staff management.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
      <Card className="mt-6">
        <div className="p-4 sm:p-6">
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <p className="mt-2 text-sm text-gray-700">A list of all the staff members in your account.</p>
            </div>
            <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
              {canCreateStaff && <Button onClick={() => setShowAddForm(true)}>Add Staff</Button>}
            </div>
          </div>
          <div className="mt-4">
            <Input type="text" placeholder="Search staff..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        {loading && <LoadingSpinner />}
        {error && <p className="text-red-500 p-4">{error}</p>}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Name</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Title</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Role</th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredStaff.map((member) => (
                  <tr key={member.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <img className="h-10 w-10 rounded-full object-cover" src={member.photoURL || `https://ui-avatars.com/api/?name=${member.firstName}+${member.lastName}`} alt="" />
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">{member.firstName} {member.lastName}</div>
                          <div className="text-gray-500">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <div className="text-gray-900">{member.position}</div>
                      <div className="text-gray-500">{member.department}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${member.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 capitalize">{member.role}</td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      {canEditStaff && <Button variant="ghost" onClick={() => handleEdit(member)}>Edit</Button>}
                      {canDeleteStaff && <Button variant="ghost" onClick={() => setShowDeleteConfirm(member)}>Delete</Button>}
                      {canPromoteStaff && member.role !== 'admin' && <Button variant="ghost" onClick={() => setShowPromoteConfirm(member)}>Promote to Admin</Button>}
                      {canResetPassword && <Button variant="ghost" onClick={() => setShowPasswordReset(member)}>Reset Password</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Modal isOpen={showAddForm} onClose={resetFormData} title={editingMember ? 'Edit Staff Member' : 'Add New Staff Member'}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <Input name="firstName" label="First Name" value={formData.firstName || ''} onChange={handleInputChange} required />
            </div>
            <div className="sm:col-span-3">
              <Input name="lastName" label="Last Name" value={formData.lastName || ''} onChange={handleInputChange} required />
            </div>
            <div className="sm:col-span-4">
              <Input name="email" label="Email" type="email" value={formData.email || ''} onChange={handleInputChange} required disabled={!!editingMember} />
            </div>
            {!editingMember && (
              <>
                <div className="sm:col-span-3">
                  <Input name="password" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div className="sm:col-span-3">
                  <Input name="confirmPassword" label="Confirm Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                </div>
              </>
            )}
            <div className="sm:col-span-6">
              <label className="block text-sm font-medium text-gray-700">Photo</label>
              <div className="mt-1 flex items-center space-x-4">
                {photoPreview ? (
                  <div className="relative">
                    <img src={photoPreview} alt="Preview" className="h-24 w-24 rounded-full object-cover" />
                    <button
                      type="button"
                      className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview(null);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <span className="h-24 w-24 overflow-hidden rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="h-12 w-12 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </span>
                )}
                <div className="flex space-x-2">
                  <label htmlFor="photo-upload" className="cursor-pointer rounded-md bg-white py-2 px-3 text-sm font-medium leading-4 text-gray-700 shadow-sm border border-gray-300 hover:bg-gray-50 focus:outline-none">
                    Upload
                    <input
                      id="photo-upload"
                      name="photo"
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                    />
                  </label>
                  <button
                    type="button"
                    className="rounded-md bg-white py-2 px-3 text-sm font-medium leading-4 text-gray-700 shadow-sm border border-gray-300 hover:bg-gray-50 focus:outline-none"
                    onClick={openCamera}
                  >
                    Camera
                  </button>
                </div>
              </div>
            </div>
            <div className="sm:col-span-2">
              <Input name="phone" label="Phone" value={formData.phone || ''} onChange={handleInputChange} />
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="position" className="block text-sm font-medium text-gray-700">Position</label>
              <select id="position" name="position" value={formData.position || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm">
                <option value="">Select position...</option>
                {positions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="department" className="block text-sm font-medium text-gray-700">Department</label>
              <select id="department" name="department" value={formData.department || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm">
                <option value="">Select department...</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={resetFormData}>Cancel</Button>
            <Button type="submit" disabled={submitting || uploadingPhoto}>
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal isOpen={!!showPromoteConfirm} onClose={() => setShowPromoteConfirm(null)} title="Confirm Promotion">
        {showPromoteConfirm && (
          <div>
            <p>Are you sure you want to promote {showPromoteConfirm.firstName} {showPromoteConfirm.lastName} to an Admin role?</p>
            <div className="mt-4 flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowPromoteConfirm(null)}>Cancel</Button>
              <Button onClick={() => promoteStaffToAdmin(showPromoteConfirm)} disabled={!!promotingStaff}>
                {promotingStaff === showPromoteConfirm.id ? 'Promoting...' : 'Confirm'}
              </Button>
            </div>
            {promotionError && <p className="text-red-500 mt-2">{promotionError}</p>}
          </div>
        )}
      </Modal>
      <Modal isOpen={!!showPasswordReset} onClose={() => setShowPasswordReset(null)} title="Confirm Password Reset">
        {showPasswordReset && (
          <div>
            <p>Are you sure you want to send a password reset email to {showPasswordReset.email}?</p>
            <div className="mt-4 flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowPasswordReset(null)}>Cancel</Button>
              <Button onClick={() => handlePasswordReset(showPasswordReset.email)} disabled={!!resettingPassword}>
                {resettingPassword === showPasswordReset.email ? 'Sending...' : 'Send Email'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <Modal isOpen={showCameraModal} onClose={closeCamera} title="Take Photo">
          <div>
            <video ref={videoRef} autoPlay playsInline className="w-full h-auto"></video>
            <canvas ref={canvasRef} className="hidden"></canvas>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleTakePhoto}>Capture</Button>
            </div>
          </div>
      </Modal>
      <Modal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="Confirm Deletion">
        {showDeleteConfirm && (
          <div>
            <p>Are you sure you want to delete {showDeleteConfirm.firstName} {showDeleteConfirm.lastName}? This action cannot be undone.</p>
            <p className="mt-2 text-sm text-gray-500">Note: Their authentication account must be deleted separately from the Firebase Console.</p>
            <div className="mt-4 flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => handleDelete(showDeleteConfirm)}>Delete</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}