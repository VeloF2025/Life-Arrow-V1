import React from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { ScanManagement } from '../../features/scans/components/ScanManagement';

const ScanManagementPage: React.FC = () => {
  return (
    <AdminLayout>
      <ScanManagement />
    </AdminLayout>
  );
};

export default ScanManagementPage;
