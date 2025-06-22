import { useState } from 'react';
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  ClockIcon,
  PhoneIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import type { TreatmentCentre } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';

// Mock data for development
const mockCentres: TreatmentCentre[] = [
  {
    id: '1',
    name: 'Cape Town - V&A Waterfront',
    code: 'CPT-VNA',
    address: {
      street: '123 Main Street',
      suburb: 'V&A Waterfront',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '8001',
      country: 'South Africa'
    },
    contactInfo: {
      phone: '+27 21 123 4567',
      email: 'capetown@lifearrow.co.za',
      managerName: 'Sarah Johnson'
    },
    operatingHours: {
      monday: { isOpen: true, openTime: '08:00', closeTime: '17:00', breakTimes: [] },
      tuesday: { isOpen: true, openTime: '08:00', closeTime: '17:00', breakTimes: [] },
      wednesday: { isOpen: true, openTime: '08:00', closeTime: '17:00', breakTimes: [] },
      thursday: { isOpen: true, openTime: '08:00', closeTime: '17:00', breakTimes: [] },
      friday: { isOpen: true, openTime: '08:00', closeTime: '17:00', breakTimes: [] },
      saturday: { isOpen: true, openTime: '09:00', closeTime: '13:00', breakTimes: [] },
      sunday: { isOpen: false, openTime: '', closeTime: '', breakTimes: [] }
    },
    facilities: {
      availableEquipment: ['InBody Scanner', 'Consultation Room A', 'Consultation Room B', 'Reception Area'],
      roomsAvailable: [
        { id: '1', name: 'Consultation Room A', type: 'consultation', capacity: 2, equipment: ['Desk', 'Chairs'] },
        { id: '2', name: 'Consultation Room B', type: 'consultation', capacity: 2, equipment: ['Desk', 'Chairs'] }
      ],
      amenities: ['Parking', 'WiFi', 'Air Conditioning']
    },
    servicesOffered: ['service-1', 'service-2'],
    staffAssigned: ['staff-1', 'staff-2', 'staff-3'],
    timezone: 'Africa/Johannesburg',
    isActive: true,
    capacity: {
      maxDailyAppointments: 50,
      maxConcurrentAppointments: 8,
      maxWalkIns: 5
    },
    settings: {
      allowOnlineBooking: true,
      requiresInsurance: false,
      acceptsWalkIns: true,
      parkingAvailable: true,
      wheelchairAccessible: true
    },
    specialNotes: 'Parking available in the V&A Waterfront parking garage. Enter through the main entrance.',
    analytics: {
      utilizationRate: 75,
      revenue: 250000,
      clientSatisfaction: 4.2,
      averageWaitTime: 15
    },
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: '2',
    name: 'Johannesburg - Sandton City',
    code: 'JHB-STC',
    address: {
      street: '456 Nelson Mandela Square',
      suburb: 'Sandton',
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2196',
      country: 'South Africa'
    },
    contactInfo: {
      phone: '+27 11 987 6543',
      email: 'johannesburg@lifearrow.co.za',
      managerName: 'Michael Smith'
    },
    operatingHours: {
      monday: { isOpen: true, openTime: '07:30', closeTime: '18:00', breakTimes: [] },
      tuesday: { isOpen: true, openTime: '07:30', closeTime: '18:00', breakTimes: [] },
      wednesday: { isOpen: true, openTime: '07:30', closeTime: '18:00', breakTimes: [] },
      thursday: { isOpen: true, openTime: '07:30', closeTime: '18:00', breakTimes: [] },
      friday: { isOpen: true, openTime: '07:30', closeTime: '18:00', breakTimes: [] },
      saturday: { isOpen: true, openTime: '08:00', closeTime: '14:00', breakTimes: [] },
      sunday: { isOpen: false, openTime: '', closeTime: '', breakTimes: [] }
    },
    facilities: {
      availableEquipment: ['InBody Scanner', 'Metabolic Cart', 'Consultation Room A', 'Consultation Room B', 'Consultation Room C'],
      roomsAvailable: [
        { id: '1', name: 'Consultation Room A', type: 'consultation', capacity: 2, equipment: ['Desk', 'Chairs'] },
        { id: '2', name: 'Consultation Room B', type: 'consultation', capacity: 2, equipment: ['Desk', 'Chairs'] },
        { id: '3', name: 'Consultation Room C', type: 'consultation', capacity: 3, equipment: ['Desk', 'Chairs', 'Whiteboard'] }
      ],
      amenities: ['Parking', 'WiFi', 'Air Conditioning', 'Valet Parking']
    },
    servicesOffered: ['service-1', 'service-2', 'service-3'],
    staffAssigned: ['staff-4', 'staff-5', 'staff-6', 'staff-7'],
    timezone: 'Africa/Johannesburg',
    isActive: true,
    capacity: {
      maxDailyAppointments: 75,
      maxConcurrentAppointments: 12,
      maxWalkIns: 8
    },
    settings: {
      allowOnlineBooking: true,
      requiresInsurance: false,
      acceptsWalkIns: true,
      parkingAvailable: true,
      wheelchairAccessible: true
    },
    specialNotes: 'Located on Level 2 of Sandton City. Valet parking available.',
    analytics: {
      utilizationRate: 85,
      revenue: 380000,
      clientSatisfaction: 4.5,
      averageWaitTime: 12
    },
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-18')
  }
];

const PROVINCES = [
  { value: 'western-cape', label: 'Western Cape' },
  { value: 'gauteng', label: 'Gauteng' },
  { value: 'kwazulu-natal', label: 'KwaZulu-Natal' },
  { value: 'eastern-cape', label: 'Eastern Cape' },
  { value: 'free-state', label: 'Free State' },
  { value: 'limpopo', label: 'Limpopo' },
  { value: 'mpumalanga', label: 'Mpumalanga' },
  { value: 'north-west', label: 'North West' },
  { value: 'northern-cape', label: 'Northern Cape' }
];

export function CentresManagement() {
  const [centres, setCentres] = useState<TreatmentCentre[]>(mockCentres);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvince, setFilterProvince] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewingCentre, setViewingCentre] = useState<TreatmentCentre | null>(null);
  const [editingCentre, setEditingCentre] = useState<TreatmentCentre | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingCentre, setDeletingCentre] = useState<TreatmentCentre | null>(null);

  const filteredCentres = centres.filter(centre => {
    const matchesSearch = centre.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         centre.address.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         centre.address.suburb.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProvince = filterProvince === 'all' || centre.address.province.toLowerCase().includes(filterProvince.replace('-', ' '));
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && centre.isActive) ||
                         (filterStatus === 'inactive' && !centre.isActive);
    
    return matchesSearch && matchesProvince && matchesStatus;
  });

  const handleCreateCentre = (centreData: Partial<TreatmentCentre>) => {
    const newCentre: TreatmentCentre = {
      id: Date.now().toString(),
      code: `NEW-${Date.now()}`,
      servicesOffered: [],
      staffAssigned: [],
      timezone: 'Africa/Johannesburg',
      isActive: true,
      analytics: {
        utilizationRate: 0,
        revenue: 0,
        clientSatisfaction: 0,
        averageWaitTime: 0
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...centreData
    } as TreatmentCentre;

    setCentres(prev => [...prev, newCentre]);
    setIsCreating(false);
  };

  const handleUpdateCentre = (centreData: Partial<TreatmentCentre>) => {
    if (!editingCentre) return;

    const updatedCentre = {
      ...editingCentre,
      ...centreData,
      updatedAt: new Date()
    };

    setCentres(prev => prev.map(centre => 
      centre.id === editingCentre.id ? updatedCentre : centre
    ));
    setEditingCentre(null);
  };

  const handleDeleteCentre = () => {
    if (!deletingCentre) return;

    setCentres(prev => prev.filter(centre => centre.id !== deletingCentre.id));
    setDeletingCentre(null);
  };

  const formatOperatingHours = (centre: TreatmentCentre) => {
    const openDays = Object.entries(centre.operatingHours)
      .filter(([, hours]) => hours.isOpen)
      .map(([day]) => day.charAt(0).toUpperCase() + day.slice(1))
      .slice(0, 3);
    
    return openDays.length > 0 ? `${openDays.join(', ')}${openDays.length > 3 ? '...' : ''}` : 'Closed';
  };

  const CentreCard = ({ centre }: { centre: TreatmentCentre }) => (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{centre.name}</h3>
            <span className={`px-2 py-1 text-xs rounded-full ${
              centre.isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {centre.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="flex items-start text-sm text-gray-600 mb-2">
                <MapPinIcon className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p>{centre.address.street}</p>
                  <p>{centre.address.suburb}, {centre.address.city}</p>
                  <p>{centre.address.province} {centre.address.postalCode}</p>
                </div>
              </div>
              
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <PhoneIcon className="w-4 h-4 mr-2" />
                {centre.contactInfo.phone}
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <UserIcon className="w-4 h-4 mr-2" />
                Manager: {centre.contactInfo.managerName}
              </div>
            </div>
            
            <div>
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <ClockIcon className="w-4 h-4 mr-2" />
                {formatOperatingHours(centre)}
              </div>
              
              <div className="text-sm text-gray-600 mb-2">
                <span className="font-medium">Equipment:</span> {centre.facilities.availableEquipment.length} items
              </div>
              
              <div className="text-sm text-gray-600 mb-2">
                <span className="font-medium">Services:</span> {centre.servicesOffered.length} offered
              </div>
              
              <div className="text-sm text-gray-600">
                <span className="font-medium">Staff:</span> {centre.staffAssigned.length} assigned
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <span className="font-medium">Capacity:</span>
              <span className="ml-1">{centre.capacity.maxDailyAppointments}/day</span>
            </div>
            <div className="flex items-center">
              <span className="font-medium">Concurrent:</span>
              <span className="ml-1">{centre.capacity.maxConcurrentAppointments}</span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2 ml-4">
          <Button
            onClick={() => setViewingCentre(centre)}
            className="btn-secondary text-sm p-2"
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => setEditingCentre(centre)}
            className="btn-primary text-sm p-2"
          >
            <PencilIcon className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => setDeletingCentre(centre)}
            className="btn bg-red-600 text-white hover:bg-red-700 text-sm p-2"
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );

  const CentreDetailsModal = ({ centre, onClose }: { 
    centre: TreatmentCentre; 
    onClose: () => void; 
  }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{centre.name}</h2>
              <div className="flex items-center space-x-2 mt-2">
                <span className={`px-3 py-1 text-sm rounded-full ${
                  centre.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {centre.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Location & Contact</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Address</label>
                  <p className="text-gray-600">
                    {centre.address.street}<br/>
                    {centre.address.suburb}, {centre.address.city}<br/>
                    {centre.address.province} {centre.address.postalCode}<br/>
                    {centre.address.country}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-gray-600">{centre.contactInfo.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-gray-600">{centre.contactInfo.email}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Manager</label>
                  <p className="text-gray-600">{centre.contactInfo.managerName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Special Notes</label>
                  <p className="text-gray-600">{centre.specialNotes}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Operating Hours</h3>
              <div className="space-y-2">
                {Object.entries(centre.operatingHours).map(([day, hours]) => (
                  <div key={day} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 capitalize">{day}</span>
                    <span className="text-sm text-gray-600">
                      {hours.isOpen ? `${hours.openTime} - ${hours.closeTime}` : 'Closed'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold text-gray-900 mb-3">Facilities & Capacity</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700">Available Equipment</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {centre.facilities.availableEquipment.map((equipment: string, index: number) => (
                    <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                      {equipment}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Daily Capacity</label>
                    <p className="text-gray-600">{centre.capacity.maxDailyAppointments} appointments</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Concurrent Capacity</label>
                    <p className="text-gray-600">{centre.capacity.maxConcurrentAppointments} appointments</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Treatment Centres</h1>
          <p className="text-gray-600">Manage locations, facilities, and operating hours</p>
        </div>
        <Button 
          onClick={() => setIsCreating(true)}
          className="btn-primary"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Centre
        </Button>
      </div>

      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search centres..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select
            value={filterProvince}
            onChange={(value) => setFilterProvince(value)}
            options={[
              { value: 'all', label: 'All Provinces' },
              ...PROVINCES
            ]}
          />
          
          <Select
            value={filterStatus}
            onChange={(value) => setFilterStatus(value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
          />
          
          <div className="flex items-center text-sm text-gray-600">
            <FunnelIcon className="w-4 h-4 mr-2" />
            {filteredCentres.length} of {centres.length} centres
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {filteredCentres.map(centre => (
          <CentreCard key={centre.id} centre={centre} />
        ))}
        
        {filteredCentres.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <BuildingOfficeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No centres found</h3>
              <p className="text-gray-600">
                {searchTerm || filterProvince !== 'all' || filterStatus !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first treatment centre'
                }
              </p>
            </div>
          </Card>
        )}
      </div>

      {viewingCentre && (
        <CentreDetailsModal 
          centre={viewingCentre} 
          onClose={() => setViewingCentre(null)} 
        />
      )}

      {(isCreating || editingCentre) && (
        <CentreFormModal
          centre={editingCentre}
          onClose={() => {
            setIsCreating(false);
            setEditingCentre(null);
          }}
          onSubmit={editingCentre ? handleUpdateCentre : handleCreateCentre}
        />
      )}

      {deletingCentre && (
        <DeleteConfirmModal
          centre={deletingCentre}
          onClose={() => setDeletingCentre(null)}
          onConfirm={handleDeleteCentre}
        />
      )}
    </div>
  );
}

const CentreFormModal = ({ centre, onClose, onSubmit }: {
  centre?: TreatmentCentre | null;
  onClose: () => void;
  onSubmit: (data: Partial<TreatmentCentre>) => void;
}) => {
  const [formData, setFormData] = useState({
    name: centre?.name || '',
    code: centre?.code || '',
    address: centre?.address || {
      street: '',
      suburb: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'South Africa'
    },
    contactInfo: centre?.contactInfo || {
      phone: '',
      email: '',
      managerName: ''
    },
    specialNotes: centre?.specialNotes || '',
    capacity: centre?.capacity || {
      maxDailyAppointments: 50,
      maxConcurrentAppointments: 8,
      maxWalkIns: 5
    },
    settings: centre?.settings || {
      allowOnlineBooking: true,
      requiresInsurance: false,
      acceptsWalkIns: true,
      parkingAvailable: true,
      wheelchairAccessible: true
    },
    facilities: centre?.facilities || {
      availableEquipment: [],
      roomsAvailable: [],
      amenities: []
    },
    operatingHours: centre?.operatingHours || {
      monday: { isOpen: true, openTime: '08:00', closeTime: '17:00', breakTimes: [] },
      tuesday: { isOpen: true, openTime: '08:00', closeTime: '17:00', breakTimes: [] },
      wednesday: { isOpen: true, openTime: '08:00', closeTime: '17:00', breakTimes: [] },
      thursday: { isOpen: true, openTime: '08:00', closeTime: '17:00', breakTimes: [] },
      friday: { isOpen: true, openTime: '08:00', closeTime: '17:00', breakTimes: [] },
      saturday: { isOpen: true, openTime: '09:00', closeTime: '13:00', breakTimes: [] },
      sunday: { isOpen: false, openTime: '', closeTime: '', breakTimes: [] }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {centre ? 'Edit Centre' : 'Create New Centre'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Centre Name
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Centre Code
                </label>
                <Input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address
                  </label>
                  <Input
                    type="text"
                    value={formData.address.street}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, street: e.target.value }
                    }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Suburb
                  </label>
                  <Input
                    type="text"
                    value={formData.address.suburb}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, suburb: e.target.value }
                    }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <Input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, city: e.target.value }
                    }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Province
                  </label>
                  <Select
                    value={formData.address.province}
                    onChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, province: value }
                    }))}
                    options={PROVINCES.map(p => ({ value: p.label, label: p.label }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code
                  </label>
                  <Input
                    type="text"
                    value={formData.address.postalCode}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, postalCode: e.target.value }
                    }))}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={formData.contactInfo.phone}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    contactInfo: { ...prev.contactInfo, phone: e.target.value }
                  }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={formData.contactInfo.email}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    contactInfo: { ...prev.contactInfo, email: e.target.value }
                  }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manager Name
                </label>
                <Input
                  type="text"
                  value={formData.contactInfo.managerName}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    contactInfo: { ...prev.contactInfo, managerName: e.target.value }
                  }))}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Daily Capacity
                  </label>
                  <Input
                    type="number"
                    value={formData.capacity.maxDailyAppointments}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      capacity: { ...prev.capacity, maxDailyAppointments: Number(e.target.value) }
                    }))}
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Concurrent
                  </label>
                  <Input
                    type="number"
                    value={formData.capacity.maxConcurrentAppointments}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      capacity: { ...prev.capacity, maxConcurrentAppointments: Number(e.target.value) }
                    }))}
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Walk-ins
                  </label>
                  <Input
                    type="number"
                    value={formData.capacity.maxWalkIns}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      capacity: { ...prev.capacity, maxWalkIns: Number(e.target.value) }
                    }))}
                    min="0"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Special Notes
            </label>
            <textarea
              value={formData.specialNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, specialNotes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <Button type="button" onClick={onClose} variant="outline">
              Cancel
            </Button>
            <Button type="submit">
              {centre ? 'Update Centre' : 'Create Centre'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DeleteConfirmModal = ({ centre, onClose, onConfirm }: {
  centre: TreatmentCentre;
  onClose: () => void;
  onConfirm: () => void;
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg max-w-md w-full">
      <div className="p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Delete Centre</h2>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete "{centre.name}"? This action cannot be undone.
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