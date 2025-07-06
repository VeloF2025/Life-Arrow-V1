import React, { useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { ScanManagement } from '../../features/scans/components/ScanManagement';
import ScanAnalysis from '../../features/scans/components/ScanAnalysis';
import { ChevronDownIcon } from '@heroicons/react/24/solid';

const AccordionSection: React.FC<{ title: string; isOpen: boolean; onClick: () => void; children: React.ReactNode }> = ({ title, isOpen, onClick, children }) => (
  <div className="border-b border-gray-200">
    <h2>
      <button
        type="button"
        className="flex items-center justify-between w-full p-5 font-medium text-left text-gray-700 hover:bg-gray-100 focus:outline-none"
        onClick={onClick}
        aria-expanded={isOpen}
      >
        <span>{title}</span>
        <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>
    </h2>
    <div className={`${isOpen ? 'block' : 'hidden'} p-5 border-t border-gray-200`}>
      {children}
    </div>
  </div>
);

const ScanManagementPage: React.FC = () => {
  const [openSection, setOpenSection] = useState<'upload' | 'analysis' | null>('upload');

  const handleToggle = (section: 'upload' | 'analysis') => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Scan Management</h1>
        <p className="mt-1 text-sm text-gray-500">Upload, match, and analyze client scan data.</p>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <AccordionSection
          title="Scan Upload & Match"
          isOpen={openSection === 'upload'}
          onClick={() => handleToggle('upload')}
        >
          <ScanManagement />
        </AccordionSection>

        <AccordionSection
          title="Scan Analysis"
          isOpen={openSection === 'analysis'}
          onClick={() => handleToggle('analysis')}
        >
          <ScanAnalysis />
        </AccordionSection>
      </div>
    </AdminLayout>
  );
};

export default ScanManagementPage;
