import { useState } from 'react';
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'practitioner' | 'admin' | 'manager' | 'receptionist';
  qualifications: string[];
  assignedCentres: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Mock data
const initialStaff: StaffMember[] = [
  {
    id: '1',
    firstName: 'Dr. Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@lifearrow.co.za',
    phone: '+27 21 123 4567',
    role: 'practitioner',
    qualifications: ['Wellness Consultant', 'Nutritionist'],
    assignedCentres: ['1'],
    isActive: true,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: '2',
    firstName: 'Michael',
    lastName: 'Smith',
    email: 'michael.smith@lifearrow.co.za',
    phone: '+27 11 987 6543',
    role: 'manager',
    qualifications: ['Centre Management'],
    assignedCentres: ['2'],
    isActive: true,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-18')
  }
];

const ROLES = [
  { value: 'practitioner', label: 'Practitioner' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'receptionist', label: 'Receptionist' }
];

export function StaffManagement() {
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewingStaff, setViewingStaff] = useState<StaffMember | null>(null);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);

  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || member.role === filterRole;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && member.isActive) ||
                         (filterStatus === 'inactive' && !member.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleCreateStaff = (staffData: Partial<StaffMember>) => {
    const newStaff: StaffMember = {
      id: Date.now().toString(),
      assignedCentres: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...staffData
    } as StaffMember;

    setStaff(prev => [...prev, newStaff]);
    setIsCreating(false);
  };

  const handleUpdateStaff = (staffData: Partial<StaffMember>) => {
    if (!editingStaff) return;

    const updatedStaff = {
      ...editingStaff,
      ...staffData,
      updatedAt: new Date()
    };

    setStaff(prev => prev.map(member => 
      member.id === editingStaff.id ? updatedStaff : member
    ));
    setEditingStaff(null);
  };

  const handleDeleteStaff = () => {
    if (!deletingStaff) return;

    setStaff(prev => prev.filter(member => member.id !== deletingStaff.id));
    setDeletingStaff(null);
  };

  const toggleStaffStatus = (staffId: string) => {
    setStaff(prev => prev.map(member => 
      member.id === staffId 
        ? { ...member, isActive: !member.isActive, updatedAt: new Date() }
        : member
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Staff Management</h2>
          <p className="text-gray-600">Manage your team members and their qualifications</p>
        </div>
        <Button
          onClick={() => setIsCreating(true)}
          className="flex items-center space-x-2"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Add Staff Member</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <Select
            value={filterRole}
            onChange={(value) => setFilterRole(value)}
            options={[
              { value: 'all', label: 'All Roles' },
              ...ROLES
            ]}
            className="w-48"
          />
          <Select
            value={filterStatus}
            onChange={(value) => setFilterStatus(value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
            className="w-32"
          />
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredStaff.map((member) => (
          <StaffCard 
            key={member.id} 
            member={member}
            onView={() => setViewingStaff(member)}
            onEdit={() => setEditingStaff(member)}
            onDelete={() => setDeletingStaff(member)}
            onToggleStatus={() => toggleStaffStatus(member.id)}
          />
        ))}
      </div>

      {filteredStaff.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <UserIcon className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No staff members found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        </div>
      )}

      {/* Modals */}
      {viewingStaff && (
        <StaffDetailsModal 
          member={viewingStaff} 
          onClose={() => setViewingStaff(null)}
        />
      )}
      
      {(isCreating || editingStaff) && (
        <StaffFormModal
          member={editingStaff}
          onClose={() => {
            setIsCreating(false);
            setEditingStaff(null);
          }}
          onSubmit={editingStaff ? handleUpdateStaff : handleCreateStaff}
        />
      )}

      {deletingStaff && (
        <DeleteConfirmModal
          member={deletingStaff}
          onClose={() => setDeletingStaff(null)}
          onConfirm={handleDeleteStaff}
        />
      )}
    </div>
  );
}

const StaffCard = ({ member, onView, onEdit, onDelete, onToggleStatus }: {
  member: StaffMember;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}) => (
  <Card className="hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {member.firstName} {member.lastName}
        </h3>
        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
          member.isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {member.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div className="flex space-x-1">
        <button
          onClick={onView}
          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
        >
          <EyeIcon className="w-4 h-4" />
        </button>
        <button
          onClick={onEdit}
          className="p-1 text-gray-400 hover:text-yellow-600 transition-colors"
        >
          <PencilIcon className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>

    <div className="space-y-2 mb-4 text-sm text-gray-600">
      <p><span className="font-medium">Role:</span> {member.role}</p>
      <p><span className="font-medium">Email:</span> {member.email}</p>
      <p><span className="font-medium">Phone:</span> {member.phone}</p>
    </div>

    <div className="mb-4">
      <span className="text-sm font-medium text-gray-700">Qualifications:</span>
      <div className="flex flex-wrap gap-1 mt-1">
        {member.qualifications.map((qual, index) => (
          <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
            {qual}
          </span>
        ))}
      </div>
    </div>

    <div className="flex space-x-2">
      <Button
        onClick={onToggleStatus}
        variant={member.isActive ? "outline" : "primary"}
        size="sm"
        className="flex-1"
      >
        {member.isActive ? 'Deactivate' : 'Activate'}
      </Button>
      <Button
        onClick={onEdit}
        variant="outline"
        size="sm"
        className="flex-1"
      >
        Edit
      </Button>
    </div>
  </Card>
);

const StaffDetailsModal = ({ member, onClose }: {
  member: StaffMember;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {member.firstName} {member.lastName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700">Role</label>
              <p className="mt-1 text-gray-900 capitalize">{member.role}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Status</label>
              <p className="mt-1">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  member.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {member.isActive ? 'Active' : 'Inactive'}
                </span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-gray-900">{member.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <p className="mt-1 text-gray-900">{member.phone}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Qualifications</label>
            <div className="mt-1 flex flex-wrap gap-1">
              {member.qualifications.map((qual, index) => (
                <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                  {qual}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Assigned Centres</label>
            <p className="mt-1 text-gray-900">
              {member.assignedCentres.length} centre(s) assigned
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  </div>
);

const StaffFormModal = ({ member, onClose, onSubmit }: {
  member?: StaffMember | null;
  onClose: () => void;
  onSubmit: (data: Partial<StaffMember>) => void;
}) => {
  const [formData, setFormData] = useState({
    firstName: member?.firstName || '',
    lastName: member?.lastName || '',
    email: member?.email || '',
    phone: member?.phone || '',
    role: member?.role || 'practitioner',
    qualifications: member?.qualifications || []
  });

  const [newQualification, setNewQualification] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addQualification = () => {
    if (newQualification.trim()) {
      setFormData(prev => ({
        ...prev,
        qualifications: [...prev.qualifications, newQualification.trim()]
      }));
      setNewQualification('');
    }
  };

  const removeQualification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      qualifications: prev.qualifications.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {member ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <Input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <Input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <Select
                value={formData.role}
                onChange={(value) => setFormData(prev => ({ ...prev, role: value as StaffMember['role'] }))}
                options={ROLES}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Qualifications
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  type="text"
                  value={newQualification}
                  onChange={(e) => setNewQualification(e.target.value)}
                  placeholder="Add qualification"
                  className="flex-1"
                />
                <Button type="button" onClick={addQualification} size="sm">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {formData.qualifications.map((qual, index) => (
                  <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded flex items-center gap-1">
                    {qual}
                    <button
                      type="button"
                      onClick={() => removeQualification(index)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <Button type="button" onClick={onClose} variant="outline">
              Cancel
            </Button>
            <Button type="submit">
              {member ? 'Update Staff Member' : 'Add Staff Member'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DeleteConfirmModal = ({ member, onClose, onConfirm }: {
  member: StaffMember;
  onClose: () => void;
  onConfirm: () => void;
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg max-w-md w-full">
      <div className="p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Delete Staff Member</h2>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete "{member.firstName} {member.lastName}"? This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-3">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button onClick={onConfirm} variant="primary" className="bg-red-600 hover:bg-red-700">
            Delete
          </Button>
        </div>
      </div>
    </div>
  </div>
); 