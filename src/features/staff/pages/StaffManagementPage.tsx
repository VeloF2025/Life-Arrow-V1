import { useStaffList } from '../hooks/useStaffList';
import { StaffList } from '../components/StaffList';
import * as Schema from '@/lib/db-schema';

export function StaffManagementPage() {
  const {
    staff, // This is the filtered staff list from the hook
    loading,
    error,
    searchTerm,
    setSearchTerm,
    loadStaff,
    deleteStaffMember,
    promoteStaffToAdmin,
    permissions,
  } = useStaffList();

  // The useStaffList hook does not provide a password reset function.
  // We create a placeholder here to satisfy the StaffList component's prop requirements.
  const handleResetPassword = (member: Schema.UserDocument) => {
    // In a real implementation, this would likely open a modal
    // and call a service to trigger a password reset email.
    alert(`Password reset for ${member.email} is not yet implemented.`);
    console.log('Requesting password reset for:', member);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Staff Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all staff members, with tools to manage their roles and access.
          </p>
        </div>
      </div>
      <div className="mt-8">
        <StaffList
          staff={staff}
          loading={loading}
          error={error}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onDelete={deleteStaffMember} // Correctly passing the function from the hook
          onPromote={promoteStaffToAdmin} // Correctly passing the function from the hook
          onResetPassword={handleResetPassword} // Passing the placeholder function
          onDataRefetch={loadStaff}
          permissions={permissions}
        />
      </div>
    </div>
  );
}
