import React, { useState, useEffect } from 'react';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  sendEmailVerification
} from 'firebase/auth';
import { storage, auth } from '../../lib/firebase';
import { dbServices } from '../../lib/database';
import { Permissions } from '../../lib/permissions';
import { usePermissions } from '../../hooks/usePermissions';
import type { UserDocument } from '../../lib/db-schema';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  UserGroupIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  MapPinIcon,
  PhoneIcon,
  UserIcon,
  CameraIcon,
  PhotoIcon,
  ShieldCheckIcon,
  KeyIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { TextArea } from '../ui/TextArea';
import LoadingSpinner from '../ui/LoadingSpinner';

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  qualifications: string;
  specializations: string[];
  status: 'active' | 'inactive' | 'on-leave';
  hireDate: Date;
  centre?: string; // Legacy field for backward compatibility
  centreIds?: string[]; // New field for multiple centres
  photoURL?: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
  salary?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  // Admin promotion tracking fields
  hasAdminAccount?: boolean;
  adminUserId?: string;
  promotedToAdmin?: boolean;
  promotedAt?: Date;
  promotedBy?: string;
}

interface StaffFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  qualifications: string;
  specializations: string;
  status: 'active' | 'inactive' | 'on-leave';
  hireDate: string;
  centre: string; // Keep for legacy compatibility
  centreIds: string[]; // New field for multiple centres
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  salary: string;
  notes: string;
}

interface TreatmentCentre {
  id: string;
  name: string;
  address: {
    street: string;
    suburb: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    coordinates: { lat: number; lng: number };
  };
  adminIds: string[];
  staffIds: string[];
  services: string[];
  equipment: string[];
  operatingHours: {
    [day: string]: { open: string; close: string; closed?: boolean };
  };
  timezone: string;
  isActive: boolean;
  phone?: string;
  email?: string;
  description?: string;
  images?: string[];
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
}

const initialFormData: StaffFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  position: '',
  department: '',
  qualifications: '',
  specializations: '',
  status: 'active',
  hireDate: '',
  centre: '',
  centreIds: [],
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
  street: '',
  city: '',
  province: '',
  postalCode: '',
  salary: '',
  notes: ''
};

// Constants for form options
const positions = [
  'Doctor', 'Nurse', 'Therapist', 'Wellness Coach', 'Nutritionist', 
  'Administrative Assistant', 'Manager', 'Receptionist', 'Cleaner', 'Security'
];

const departments = [
  'Medical', 'Therapy', 'Wellness', 'Nutrition', 'Administration', 
  'Management', 'Reception', 'Maintenance', 'Security'
];

const provinces = [
  'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 
  'Limpopo', 'Mpumalanga', 'North West', 'Free State', 'Northern Cape'
];

export function StaffManagement() {
  const { profile: currentUserProfile } = useUserProfile();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [centres, setCentres] = useState<TreatmentCentre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [centresError, setCentresError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Treatment centres lookup state
  const [centresLoading, setCentresLoading] = useState(false);

  // Photo handling state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);

  // Promotion state
  const [promotingStaff, setPromotingStaff] = useState<string | null>(null);
  const [showPromoteConfirm, setShowPromoteConfirm] = useState<StaffMember | null>(null);
  const [promotionError, setPromotionError] = useState<string | null>(null);

  // Password reset state
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState<StaffMember | null>(null);

  // Permission checks
  const { userCan } = usePermissions();
  const canViewStaff = userCan(Permissions.VIEW_STAFF);
  const canCreateStaff = userCan(Permissions.CREATE_STAFF);
  const canEditStaff = userCan(Permissions.EDIT_STAFF);
  const canDeleteStaff = userCan(Permissions.DELETE_STAFF);

  // Early return if no view permission
  if (!canViewStaff) {
    return (
      <div className="p-6">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">
            You don't have permission to view staff management.
          </p>
        </div>
      </div>
    );
  }

  const [formData, setFormData] = useState<StaffFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    qualifications: '',
    specializations: '',
    status: 'active' as 'active' | 'inactive' | 'on-leave',
    hireDate: '',
    centre: '',
    centreIds: [] as string[],
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    street: '',
    city: '',
    province: '',
    postalCode: '',
    salary: '',
    notes: ''
  });

  // Reset form data
  const resetFormData = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      qualifications: '',
      specializations: '',
      status: 'active',
      hireDate: '',
      centre: '',
      centreIds: [],
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelationship: '',
      street: '',
      city: '',
      province: '',
      postalCode: '',
      salary: '',
      notes: ''
    });
  };

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Photo upload utility function
  const uploadPhoto = async (file: File, staffId: string): Promise<string> => {
    const photoRef = ref(storage, `staff/${staffId}/photo_${Date.now()}`);
    await uploadBytes(photoRef, file);
    return await getDownloadURL(photoRef);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // Prepare staff data
      const staffData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        position: formData.position.trim(),
        department: formData.department.trim(),
        qualifications: formData.qualifications.trim(),
        specializations: formData.specializations.split(',').map(s => s.trim()).filter(s => s),
        role: 'staff',
        isActive: formData.status === 'active',
        centreIds: formData.centreIds,
        primaryCentreId: formData.centreIds[0] || undefined,
        emergencyContact: {
          name: formData.emergencyContactName.trim(),
          phone: formData.emergencyContactPhone.trim(),
          relationship: formData.emergencyContactRelationship.trim()
        },
        address: {
          street: formData.street.trim(),
          city: formData.city.trim(),
          province: formData.province,
          postalCode: formData.postalCode.trim()
        },
        notes: formData.notes.trim() || undefined
      };

      let staffId: string;

      if (editingMember) {
        // Update existing staff member
        staffId = editingMember.id;
        
        // Upload photo if selected
        let photoURL = editingMember.photoURL;
        if (photoFile) {
          photoURL = await uploadPhoto(photoFile, staffId);
        }
        
        await dbServices.users.update(staffId, {
          ...staffData,
          ...(photoURL && { photoURL: photoURL })
        });
      } else {
        // Create new staff member
        const newStaffMember = await dbServices.users.create({
          ...staffData,
          emailVerified: false
        });
        staffId = newStaffMember.id;
        
        // Upload photo if selected
        if (photoFile) {
          const photoURL = await uploadPhoto(photoFile, staffId);
          await dbServices.users.update(staffId, { photoURL: photoURL });
        }
      }

      // Reset form and close modal
      resetFormData();
      setShowAddForm(false);
      setEditingMember(null);
      
      // Reload staff data
      const staffUsers = await dbServices.users.getByRole('staff');
      const updatedStaffData = staffUsers.map(user => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || '',
        position: user.position || '',
        department: user.department || '',
        qualifications: user.qualifications || [],
        specializations: user.specializations || [],
        status: user.isActive ? 'active' : 'inactive',
        hireDate: user.createdAt,
        centre: user.primaryCentreId || '',
        centreIds: user.centreIds || [],
        photoURL: user.photoURL || '',
        emergencyContact: user.emergencyContact || {
          name: '',
          phone: '',
          relationship: ''
        },
        address: user.address || {
          street: '',
          city: '',
          province: '',
          postalCode: ''
        },
        notes: user.notes || '',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      })) as StaffMember[];
      
      setStaff(updatedStaffData);

    } catch (error) {
      console.error('Error saving staff member:', error);
      setError('Failed to save staff member. Please try again.');
    }
  };

  // Handle edit
  const handleEdit = (member: StaffMember) => {
    setEditingMember(member);
    setFormData({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phone: member.phone,
      position: member.position,
      department: member.department,
      qualifications: member.qualifications || '',
      specializations: member.specializations.join(', '),
      status: member.status,
      hireDate: member.hireDate.toISOString().split('T')[0],
      centre: member.centre || '',
      centreIds: member.centreIds || [],
      emergencyContactName: member.emergencyContact?.name || '',
      emergencyContactPhone: member.emergencyContact?.phone || '',
      emergencyContactRelationship: member.emergencyContact?.relationship || '',
      street: member.address?.street || '',
      city: member.address?.city || '',
      province: member.address?.province || '',
      postalCode: member.address?.postalCode || '',
      salary: member.salary?.toString() || '',
      notes: member.notes || ''
    });
    setShowAddForm(true);
  };

  // Load staff data from database services
  useEffect(() => {
    const loadStaff = async () => {
      try {
        const staffUsers = await dbServices.users.getByRole('staff');
        const staffData = staffUsers.map(user => ({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone || '',
          position: user.position || '',
          department: user.department || '',
          qualifications: user.qualifications || '',
          specializations: user.specializations || [],
          status: user.isActive ? 'active' : 'inactive',
          hireDate: user.createdAt,
          centre: user.primaryCentreId || '',
          centreIds: user.centreIds || [],
          photoURL: user.photoURL || '',
          emergencyContact: user.emergencyContact || {
            name: '',
            phone: '',
            relationship: ''
          },
          address: user.address || {
            street: '',
            city: '',
            province: '',
            postalCode: ''
          },
          notes: user.notes || '',
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        })) as StaffMember[];
        
        setStaff(staffData);
        setLoading(false);
        setError(null);
      } catch (error) {
        console.error('Error loading staff:', error);
        setError('Unable to load staff data. Please check your connection and try again.');
        setLoading(false);
      }
    };

    loadStaff();
  }, []);

  // Load centres on component mount for displaying centre names
  useEffect(() => {
    const loadCentresData = async () => {
      try {
        const centresData = await dbServices.centres.query([]);
        setCentres(centresData);
      } catch (error) {
        console.error('Error loading centres for display:', error);
      }
    };

    loadCentresData();
  }, []);

  // Filter staff
  const filteredStaff = staff.filter((member: StaffMember) => {
    const matchesSearch = 
      member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone.includes(searchTerm) ||
      member.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.department.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const handleStatusToggle = async (member: StaffMember) => {
    const newStatus = member.status === 'active' ? 'inactive' : 'active';
    
    try {
      await dbServices.users.update(member.id, { isActive: newStatus === 'active' });
    } catch (error) {
      console.error('Error updating staff status:', error);
      setError('Failed to update staff status. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;

    try {
      await dbServices.users.delete(id);
    } catch (error) {
      console.error('Error deleting staff member:', error);
      setError('Failed to delete staff member. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-800 bg-green-100';
      case 'inactive': return 'text-red-800 bg-red-100';
      case 'on-leave': return 'text-yellow-800 bg-yellow-100';
      default: return 'text-gray-800 bg-gray-100';
    }
  };

  // Load treatment centres for lookup
  const loadCentres = async () => {
    setCentresLoading(true);
    setCentresError(null);
    
    try {
      const centresData = await dbServices.centres.query([]);
      setCentres(centresData);
    } catch (error) {
      console.error('Error loading centres:', error);
      setCentresError('Failed to load treatment centres');
    } finally {
      setCentresLoading(false);
    }
  };

  // Handle centre selection - now supports multiple selections
  const handleCentreSelect = (centre: TreatmentCentre) => {
    // Check if centre is already selected
    if (formData.centreIds.includes(centre.id)) {
      // Centre already selected, show message or do nothing
      return;
    }
    
    // Add centre to the selection
    setFormData(prev => ({ 
      ...prev, 
      centreIds: [...prev.centreIds, centre.id],
      // Update legacy centre field with first centre name for backward compatibility
      centre: prev.centreIds.length === 0 ? centre.name : prev.centre
    }));
    setShowCentresLookup(false);
  };

  // Photo upload functions
  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Photo size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setShowCameraModal(true);
      // Store the stream for the camera modal
      (window as any).cameraStream = stream;
    } catch (error) {
      console.error('Camera access denied:', error);
      setError('Camera access denied. Please use file upload instead.');
    }
  };

  const capturePhoto = () => {
    const video = document.getElementById('camera-video') as HTMLVideoElement;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (video && context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
          setPhotoFile(file);
          
          const reader = new FileReader();
          reader.onload = (e) => {
            setPhotoPreview(e.target?.result as string);
          };
          reader.readAsDataURL(file);
          
          closeCameraModal();
        }
      }, 'image/jpeg', 0.8);
    }
  };

  const closeCameraModal = () => {
    const stream = (window as any).cameraStream;
    if (stream) {
      stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      delete (window as any).cameraStream;
    }
    setShowCameraModal(false);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  // Staff-to-Admin conversion function
  const promoteStaffToAdmin = async (staffMember: StaffMember) => {
    if (!currentUserProfile || currentUserProfile.role !== 'super-admin') {
      setPromotionError('Only super-admins can promote staff to admin');
      return;
    }

    setPromotingStaff(staffMember.id);
    setPromotionError(null);

    try {
      // Generate a temporary password
      const tempPassword = `TempAdmin${Math.random().toString(36).slice(2)}${Date.now()}`;

      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        staffMember.email,
        tempPassword
      );

      // Send email verification
      await sendEmailVerification(userCredential.user);

      // Send password reset email so admin can set their own password
      await sendPasswordResetEmail(auth, staffMember.email);

      // Create user profile in Firestore
      await dbServices.users.create({
        id: userCredential.user.uid,
        email: staffMember.email,
        firstName: staffMember.firstName,
        lastName: staffMember.lastName,
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Update with admin profile details
      await dbServices.users.update(userCredential.user.uid, {
        position: staffMember.position,
        department: staffMember.department,
        phone: staffMember.phone,
        centreIds: staffMember.centreIds,
        primaryCentreId: staffMember.centreIds[0] || null,
        permissions: []
      });

      // Update staff record to mark as promoted but keep active
      await dbServices.users.update(staffMember.id, {
        // Keep original status - don't change to inactive
        hasAdminAccount: true, // Flag to show they have admin access
        adminUserId: userCredential.user.uid,
        notes: `${staffMember.notes || ''}\n\nPromoted to Admin on ${new Date().toLocaleDateString()} by ${currentUserProfile.firstName} ${currentUserProfile.lastName}. Staff member retains original role with admin privileges.`,
        promotedToAdmin: true,
        promotedAt: new Date(),
        promotedBy: currentUserProfile.id,
        updatedAt: new Date()
      });

      console.log('✅ Staff member promoted to admin successfully');
      setShowPromoteConfirm(null);
      
      // Refresh staff list using the database service
      const staffUsers = await dbServices.users.getByRole('staff');
      const updatedStaffData = staffUsers.map(user => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || '',
        position: user.position || '',
        department: user.department || '',
        qualifications: user.qualifications || [],
        specializations: user.specializations || [],
        status: user.isActive ? 'active' : 'inactive',
        hireDate: user.createdAt,
        centre: user.primaryCentreId || '',
        centreIds: user.centreIds || [],
        photoURL: user.photoURL || '',
        emergencyContact: user.emergencyContact || {
          name: '',
          phone: '',
          relationship: ''
        },
        address: user.address || {
          street: '',
          city: '',
          province: '',
          postalCode: ''
        },
        notes: user.notes || '',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        hasAdminAccount: (user as any).hasAdminAccount || false,
        adminUserId: (user as any).adminUserId
      })) as StaffMember[];
      
      setStaff(updatedStaffData);
    } catch (error: any) {
      console.error('❌ Error promoting staff to admin:', error);
      let errorMessage = 'Failed to promote staff to admin. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists. The staff member may already have an admin account.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak.';
      }
      
      setPromotionError(errorMessage);
    } finally {
      setPromotingStaff(null);
    }
  };

  // Password reset function
  const resetStaffPassword = async (staffMember: StaffMember) => {
    if (!currentUserProfile || currentUserProfile.role !== 'super-admin') {
      setPromotionError('Only super-admins can reset passwords');
      return;
    }

    setResettingPassword(staffMember.id);
    setPromotionError(null);

    try {
      await sendPasswordResetEmail(auth, staffMember.email);
      console.log('✅ Password reset email sent successfully');
      setShowPasswordReset(null);
    } catch (error: any) {
      console.error('❌ Error sending password reset email:', error);
      setPromotionError('Failed to send password reset email. Please try again.');
    } finally {
      setResettingPassword(null);
    }
  };

  // Check if user is super admin
  const isSuperAdmin = currentUserProfile?.role === 'super-admin';

  const statusCounts = {
    active: staff.filter(s => s.status === 'active').length,
    inactive: staff.filter(s => s.status === 'inactive').length,
    onLeave: staff.filter(s => s.status === 'on-leave').length
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600">Manage team members, qualifications, and schedules</p>
        </div>
        {canCreateStaff && (
          <Button 
            onClick={() => {
              setEditingMember(null);
              resetFormData();
              setShowAddForm(true);
            }}
            className="bg-primary-600 hover:bg-primary-700"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Staff Member
          </Button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <XMarkIcon className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Search */}
      <Card className="mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search staff by name, email, phone, position..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{staff.length}</p>
            <p className="text-sm text-gray-600">Total Staff</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{statusCounts.active}</p>
            <p className="text-sm text-gray-600">Active</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{statusCounts.onLeave}</p>
            <p className="text-sm text-gray-600">On Leave</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{statusCounts.inactive}</p>
            <p className="text-sm text-gray-600">Inactive</p>
          </div>
        </Card>
      </div>

      {/* Staff List */}
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Showing {filteredStaff.length} of {staff.length} staff members
        </p>

        {filteredStaff.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <UserGroupIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No staff found</h3>
              <p className="text-gray-600">No staff members match the current search.</p>
            </div>
          </Card>
        ) : (
          filteredStaff.map((member) => (
            <Card key={member.id} className="hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 mr-3">
                        {member.photoURL ? (
                          <img 
                            src={member.photoURL} 
                            alt={`${member.firstName} ${member.lastName}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-primary-100 flex items-center justify-center">
                            <span className="text-primary-600 font-medium">
                              {member.firstName[0]}{member.lastName[0]}
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {member.firstName} {member.lastName}
                        </h3>
                        <p className="text-gray-600">{member.position} • {member.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {member.hasAdminAccount && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium flex items-center">
                          <ShieldCheckIcon className="w-3 h-3 mr-1" />
                          Admin
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                        {member.status === 'on-leave' ? 'On Leave' : member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                    <div>
                      <strong>Email:</strong> {member.email}
                    </div>
                    <div>
                      <strong>Phone:</strong> {member.phone}
                    </div>
                    <div>
                      <strong>Hire Date:</strong> {member.hireDate.toLocaleDateString()}
                    </div>
                  </div>

                  {/* Assigned Centres */}
                  {(member.centreIds && member.centreIds.length > 0) || member.centre ? (
                    <div className="mb-4">
                      <strong className="text-gray-700">Assigned Centres:</strong>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {/* Show new centreIds array */}
                        {member.centreIds && member.centreIds.length > 0 ? (
                          member.centreIds.map((centreId, index) => {
                            const centre = centres.find(c => c.id === centreId);
                            return (
                              <span key={centreId} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                {centre?.name || `Centre ${index + 1}`}
                              </span>
                            );
                          })
                        ) : (
                          /* Fallback to legacy centre field */
                          member.centre && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {member.centre} (Legacy)
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <span className="text-sm text-gray-500 italic">No centres assigned</span>
                    </div>
                  )}

                  {member.qualifications.length > 0 && (
                    <div className="mb-2">
                      <strong className="text-gray-700">Qualifications:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {member.qualifications}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col space-y-2 ml-4">
                  {canEditStaff && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(member)}
                    >
                      <PencilIcon className="w-4 h-4" />
                    </Button>
                  )}
                  
                  {/* Super Admin Only Actions */}
                  {isSuperAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPromoteConfirm(member)}
                        className="text-purple-600 hover:text-purple-700"
                        disabled={promotingStaff === member.id || member.hasAdminAccount}
                        title={member.hasAdminAccount ? "Already has admin account" : "Promote to Admin"}
                      >
                        {promotingStaff === member.id ? (
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        ) : (
                          <ShieldCheckIcon className="w-4 h-4" />
                        )}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPasswordReset(member)}
                        className="text-blue-600 hover:text-blue-700"
                        disabled={resettingPassword === member.id}
                        title="Send Password Reset Email"
                      >
                        {resettingPassword === member.id ? (
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        ) : (
                          <KeyIcon className="w-4 h-4" />
                        )}
                      </Button>
                    </>
                  )}
                  
                  {canDeleteStaff && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStatusToggle(member)}
                      className={member.status === 'active' ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                    >
                      {member.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Button>
                  )}
                  {canDeleteStaff && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(member.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Staff Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingMember ? 'Edit Staff Member' : 'Add New Staff Member'}
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingMember(null);
                    resetFormData();
                  }}
                >
                  <XMarkIcon className="w-6 h-6" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      required
                    />
                    <Input
                      label="Last Name"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      required
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                    />
                    <Input
                      label="Phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Photo Upload Section */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Photo</h3>
                  <div className="flex items-center space-x-4">
                    {/* Photo Preview */}
                    <div className="relative">
                      {photoPreview || (editingMember?.photoURL) ? (
                        <div className="relative">
                          <img
                            src={photoPreview || editingMember?.photoURL}
                            alt="Profile preview"
                            className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={removePhoto}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white p-0"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gray-200 border-2 border-dashed border-gray-300 flex items-center justify-center">
                          <UserIcon className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Upload Buttons */}
                    <div className="flex flex-col space-y-2">
                      <input
                        id="photo-input"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('photo-input')?.click()}
                        disabled={uploadingPhoto}
                      >
                        <PhotoIcon className="w-4 h-4 mr-2" />
                        Upload Photo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCameraCapture}
                        disabled={uploadingPhoto}
                      >
                        <CameraIcon className="w-4 h-4 mr-2" />
                        Take Photo
                      </Button>
                      {uploadingPhoto && (
                        <div className="flex items-center text-sm text-gray-600">
                          <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Maximum file size: 5MB. Supported formats: JPG, PNG, GIF
                  </p>
                </div>

                {/* Professional Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Professional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                      <select
                        value={formData.position}
                        onChange={(e) => handleInputChange('position', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        required
                      >
                        <option value="">Select Position</option>
                        {positions.map(pos => (
                          <option key={pos} value={pos}>{pos}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                      <select
                        value={formData.department}
                        onChange={(e) => handleInputChange('department', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        required
                      >
                        <option value="">Select Department</option>
                        {departments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    <Input
                      label="Hire Date"
                      type="date"
                      value={formData.hireDate}
                      onChange={(e) => handleInputChange('hireDate', e.target.value)}
                      required
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        required
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="on-leave">On Leave</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <Input
                      label="Qualifications (comma-separated)"
                      value={formData.qualifications}
                      onChange={(e) => handleInputChange('qualifications', e.target.value)}
                      placeholder="e.g. MD, PhD, RN"
                    />
                    <Input
                      label="Specializations (comma-separated)"
                      value={formData.specializations}
                      onChange={(e) => handleInputChange('specializations', e.target.value)}
                      placeholder="e.g. Cardiology, Pediatrics"
                    />
                  </div>
                </div>

                {/* Address Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Street Address"
                      value={formData.street}
                      onChange={(e) => handleInputChange('street', e.target.value)}
                    />
                    <Input
                      label="City"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Province</label>
                      <select
                        value={formData.province}
                        onChange={(e) => handleInputChange('province', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select Province</option>
                        {provinces.map(province => (
                          <option key={province} value={province}>{province}</option>
                        ))}
                      </select>
                    </div>
                    <Input
                      label="Postal Code"
                      value={formData.postalCode}
                      onChange={(e) => handleInputChange('postalCode', e.target.value)}
                    />
                  </div>
                </div>

                {/* Emergency Contact */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="Contact Name"
                      value={formData.emergencyContactName}
                      onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                    />
                    <Input
                      label="Contact Phone"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                    />
                    <Input
                      label="Relationship"
                      value={formData.emergencyContactRelationship}
                      onChange={(e) => handleInputChange('emergencyContactRelationship', e.target.value)}
                      placeholder="e.g. Spouse, Parent, Sibling"
                    />
                  </div>
                </div>

                {/* Centre Assignment */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Centre Assignment</h3>
                  <div className="space-y-4">
                    {/* Currently Selected Centres */}
                    {formData.centreIds.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Assigned Centres ({formData.centreIds.length})
                        </label>
                        <div className="space-y-2">
                          {formData.centreIds.map((centreId, index) => {
                            const centre = centres.find(c => c.id === centreId);
                            return (
                              <div key={centreId} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center">
                                  <BuildingOfficeIcon className="w-5 h-5 text-blue-600 mr-3" />
                                  <div>
                                    <p className="font-medium text-blue-900">
                                      {centre?.name || `Centre ${index + 1}`}
                                    </p>
                                    {centre && (
                                      <p className="text-sm text-blue-600">
                                        {centre.address.city}, {centre.address.province}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const updatedCentreIds = formData.centreIds.filter(id => id !== centreId);
                                    setFormData(prev => ({ ...prev, centreIds: updatedCentreIds }));
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <XMarkIcon className="w-4 h-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Add Centre Button */}
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowCentresLookup(true);
                          loadCentres();
                        }}
                        className="w-full sm:w-auto"
                      >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        {formData.centreIds.length === 0 ? 'Assign Centres' : 'Add Another Centre'}
                      </Button>
                      <p className="text-xs text-gray-500 mt-1">
                        Staff can be assigned to multiple treatment centres
                      </p>
                    </div>

                    {/* Legacy single centre field for backward compatibility */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Primary Centre (Legacy)
                      </label>
                      <Input
                        value={formData.centre}
                        onChange={(e) => handleInputChange('centre', e.target.value)}
                        placeholder="Primary centre name (optional)"
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        This field is kept for backward compatibility. Use the centre assignment above instead.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Salary (Optional)"
                      type="number"
                      value={formData.salary}
                      onChange={(e) => handleInputChange('salary', e.target.value)}
                      placeholder="Monthly salary in ZAR"
                    />
                  </div>
                  <TextArea
                    label="Notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Additional notes about this staff member"
                    rows={3}
                    className="mt-4"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingMember(null);
                      resetFormData();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-primary-600 hover:bg-primary-700"
                  >
                    {submitting ? (
                      <>
                        <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                        {editingMember ? 'Updating...' : 'Adding...'}
                      </>
                    ) : (
                      <>
                        <CheckIcon className="w-4 h-4 mr-2" />
                        {editingMember ? 'Update Staff Member' : 'Add Staff Member'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Treatment Centres Lookup Modal */}
      {showCentresLookup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Select Treatment Centre</h2>
                <Button variant="ghost" onClick={() => setShowCentresLookup(false)}>
                  <XMarkIcon className="w-6 h-6" />
                </Button>
              </div>

              {centresLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : centresError ? (
                <div className="text-center py-12">
                  <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Centres</h3>
                  <p className="text-gray-600 mb-4">{centresError}</p>
                  <Button onClick={loadCentres}>Try Again</Button>
                </div>
              ) : centres.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">No treatment centres found</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {centres.map((centre) => {
                    const isSelected = formData.centreIds.includes(centre.id);
                    return (
                      <Card 
                        key={centre.id} 
                        className={`transition-shadow ${
                          isSelected 
                            ? 'opacity-50 bg-gray-50 border-gray-300 cursor-not-allowed' 
                            : 'hover:shadow-md cursor-pointer'
                        }`}
                      >
                        <div 
                          className="p-4"
                          onClick={() => !isSelected && handleCentreSelect(centre)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {centre.name}
                                </h3>
                                {isSelected && (
                                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                    ✓ Selected
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                <div className="flex items-center">
                                  <MapPinIcon className="w-4 h-4 mr-2" />
                                  {centre.address.street}, {centre.address.suburb}, {centre.address.city}
                                </div>
                                <div className="flex items-center">
                                  <PhoneIcon className="w-4 h-4 mr-2" />
                                  {centre.phone}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Take Photo</h2>
                <Button variant="ghost" onClick={closeCameraModal}>
                  <XMarkIcon className="w-6 h-6" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Video Preview */}
                <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                  <video
                    id="camera-video"
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-64 object-cover"
                    ref={(video) => {
                      if (video && (window as any).cameraStream) {
                        video.srcObject = (window as any).cameraStream;
                      }
                    }}
                  />
                  
                  {/* Capture Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-white rounded-full opacity-50"></div>
                  </div>
                </div>

                {/* Camera Controls */}
                <div className="flex justify-center space-x-4">
                  <Button
                    variant="outline"
                    onClick={closeCameraModal}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={capturePhoto}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <CameraIcon className="w-5 h-5 mr-2" />
                    Capture Photo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Promote to Admin Confirmation Modal */}
      {showPromoteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                  <ShieldCheckIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Promote to Admin</h2>
                  <p className="text-sm text-gray-600">This action will create an admin account</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  You are about to promote <strong>{showPromoteConfirm.firstName} {showPromoteConfirm.lastName}</strong> to admin status.
                </p>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-yellow-800 mb-2">What will happen:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                    <li>Create admin account with email: <strong>{showPromoteConfirm.email}</strong></li>
                    <li>Send password setup email to the staff member</li>
                    <li>Copy qualifications and specializations to admin profile</li>
                    <li>Staff member retains current role with additional admin privileges</li>
                    <li>Assign to centres: {showPromoteConfirm.centreIds?.length || 0} centre(s)</li>
                  </ul>
                </div>

                {promotionError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-2" />
                      <span className="text-red-700 text-sm">{promotionError}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPromoteConfirm(null);
                    setPromotionError(null);
                  }}
                  disabled={promotingStaff === showPromoteConfirm.id}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => promoteStaffToAdmin(showPromoteConfirm)}
                  disabled={promotingStaff === showPromoteConfirm.id}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {promotingStaff === showPromoteConfirm.id ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                      Promoting...
                    </>
                  ) : (
                    <>
                      <ShieldCheckIcon className="w-4 h-4 mr-2" />
                      Promote to Admin
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Confirmation Modal */}
      {showPasswordReset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <KeyIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Send Password Reset</h2>
                  <p className="text-sm text-gray-600">Email password reset link</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  Send a password reset email to <strong>{showPasswordReset.firstName} {showPasswordReset.lastName}</strong>?
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-blue-800 mb-2">What will happen:</h4>
                  <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                    <li>Password reset email sent to: <strong>{showPasswordReset.email}</strong></li>
                    <li>Staff member can click the link to set a new password</li>
                    <li>Link expires in 24 hours for security</li>
                  </ul>
                </div>

                {promotionError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-2" />
                      <span className="text-red-700 text-sm">{promotionError}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPasswordReset(null);
                    setPromotionError(null);
                  }}
                  disabled={resettingPassword === showPasswordReset.id}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => resetStaffPassword(showPasswordReset)}
                  disabled={resettingPassword === showPasswordReset.id}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {resettingPassword === showPasswordReset.id ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <KeyIcon className="w-4 h-4 mr-2" />
                      Send Reset Email
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 