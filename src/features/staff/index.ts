// Re-export components, hooks, and pages from the staff feature
export { StaffManagementPage } from './pages/StaffManagementPage';
export { StaffList } from './components/StaffList';
export { StaffForm } from './components/StaffForm';
export { PhotoUploadModal } from './components/PhotoUploadModal';
export { 
  ConfirmationModal,
  DeleteStaffModal,
  PromoteStaffModal,
  PasswordResetModal 
} from './components/ConfirmationModals';

// Re-export hooks
export { useStaffList } from './hooks/useStaffList';
export { useStaffForm } from './hooks/useStaffForm';
export { usePhotoUpload } from './hooks/usePhotoUpload';

// Re-export services
export { staffService } from './api/staffService';
