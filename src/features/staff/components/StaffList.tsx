import { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import * as Schema from '@/lib/db-schema';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { StaffForm } from './StaffForm';
import { useStaffForm } from '../hooks/useStaffForm';

interface StaffListProps {
  staff: Schema.UserDocument[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onDelete: (member: Schema.UserDocument) => void;
  onPromote: (member: Schema.UserDocument) => void;
  onResetPassword: (member: Schema.UserDocument) => void;
  onDataRefetch: () => void;
  permissions: {
    canViewStaff: boolean;
    canCreateStaff: boolean;
    canEditStaff: boolean;
    canDeleteStaff: boolean;
    canPromoteStaff: boolean;
    canResetPassword: boolean;
  };
}

export function StaffList({
  staff,
  loading,
  error,
  searchTerm,
  onSearchChange,
  onDelete,
  onPromote,
  onResetPassword,
  onDataRefetch,
  permissions,
}: StaffListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const staffForm = useStaffForm();

  useEffect(() => {
    if (staffForm.isSuccess) {
      setIsModalOpen(false);
      onDataRefetch();
      staffForm.resetForm();
    }
  }, [staffForm.isSuccess, onDataRefetch, staffForm]);

  const handleAddNew = () => {
    staffForm.resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (member: Schema.UserDocument) => {
    staffForm.editStaff(member);
    setIsModalOpen(true);
  };

  const { canViewStaff, canCreateStaff, canEditStaff, canDeleteStaff, canPromoteStaff, canResetPassword } = permissions;

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12" />
        <h3 className="mt-2 text-sm font-medium">Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!canViewStaff) {
    return (
      <div className="p-6 text-center">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500">You do not have permission to view staff.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="relative w-1/3">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search staff..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-md"
          />
        </div>
        {canCreateStaff && (
          <Button
            onClick={handleAddNew}
            leftIcon={<PlusIcon className="h-5 w-5" />}
          >
            Add New Staff
          </Button>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={staffForm.isEditing ? 'Edit Staff Member' : 'Add New Staff Member'}
      >
        <StaffForm
          isEditing={staffForm.isEditing}
          error={staffForm.error}
          formData={staffForm.formData}
          onInputChange={staffForm.handleInputChange}
          onMultiSelectChange={staffForm.handleMultiSelectChange}
          onAvailabilityChange={staffForm.handleAvailabilityChange}
          onSubmit={staffForm.handleSubmit}
          onCancel={() => setIsModalOpen(false)}
          submitting={staffForm.submitting}
          photoPreview={staffForm.photoPreview}
          onPhotoClick={() => document.getElementById('photo-upload')?.click()}
          onClearPhoto={() => staffForm.handlePhotoChange(null)}
          password={staffForm.password}
          confirmPassword={staffForm.confirmPassword}
          onPasswordChange={(e) => staffForm.setPassword(e.target.value)}
          onConfirmPasswordChange={(e) => staffForm.setConfirmPassword(e.target.value)}
        />
        <input
          id="photo-upload"
          type="file"
          className="hidden"
          onChange={(e) => e.target.files && staffForm.handlePhotoChange(e.target.files[0])}
          accept="image/*"
        />
      </Modal>

      {staff.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500">No staff members found.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {staff.map((member) => (
              <li key={member.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {member.photoURL ? (
                      <img
                        src={member.photoURL}
                        alt={`${member.firstName} ${member.lastName}`}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 font-medium">
                          {member.firstName?.[0] || ''}{member.lastName?.[0] || ''}
                        </span>
                      </div>
                    )}
                    <div className="ml-4">
                      <div className="font-medium text-gray-900">
                        {member.firstName} {member.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                      <div className="text-sm text-gray-500">
                        {member.position}
                        {member.position && member.department && ' • '}
                        {member.department}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {canEditStaff && (
                      <button onClick={() => handleEdit(member)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                    )}
                    {canDeleteStaff && (
                      <button onClick={() => onDelete(member)} className="text-red-600 hover:text-red-900 ml-4">Delete</button>
                    )}
                    {canPromoteStaff && member.role !== 'admin' && member.role !== 'super-admin' && (
                      <button onClick={() => onPromote(member)} className="text-blue-600 hover:text-blue-900 ml-4">Promote</button>
                    )}
                    {canResetPassword && (
                      <button onClick={() => onResetPassword(member)} className="text-gray-600 hover:text-gray-900 ml-4">Reset Password</button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
