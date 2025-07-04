import React from 'react';
import { StaffManagementPage } from '@/features/staff';

/**
 * StaffManagement component
 * 
 * This is a wrapper component that uses the new modular StaffManagementPage
 * from our feature-based architecture.
 */
const StaffManagement = () => {
  return <StaffManagementPage />;
};

export { StaffManagement };
export default StaffManagement;
