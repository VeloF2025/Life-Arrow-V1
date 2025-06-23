import { useState, useEffect } from 'react';
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
  UserIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { db } from '../../lib/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  Timestamp,
  getDocs
} from 'firebase/firestore';
import type { TreatmentCentre } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';

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
  const [centres, setCentres] = useState<TreatmentCentre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvince, setFilterProvince] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewingCentre, setViewingCentre] = useState<TreatmentCentre | null>(null);
  const [editingCentre, setEditingCentre] = useState<TreatmentCentre | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingCentre, setDeletingCentre] = useState<TreatmentCentre | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  // Staff data for showing assignments
  const [staffData, setStaffData] = useState<any[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);

  // Load centres from Firebase
  useEffect(() => {
    setLoading(true);
    setError(null);

    // Try real-time listener first
    const q = query(collection(db, 'centres'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const centresData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        })) as TreatmentCentre[];
        
        setCentres(centresData);
        setLoading(false);
      },
      (error) => {
        console.error('Real-time listener failed:', error);
        // Fallback to one-time fetch
        fetchCentresOnce();
      }
    );

    return () => unsubscribe();
  }, []);

  const fetchCentresOnce = async () => {
    try {
      const q = query(collection(db, 'centres'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const centresData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as TreatmentCentre[];
      
      setCentres(centresData);
      setError(null);
    } catch (error) {
      console.error('Error fetching centres:', error);
      setError('Failed to load centres. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

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

  const handleCreateCentre = async (centreData: Partial<TreatmentCentre>) => {
    try {
      setUpdating('creating');
      
      const newCentre = {
        code: `NEW-${Date.now()}`,
        services: [],
        staffAssigned: [],
        timezone: 'Africa/Johannesburg',
        isActive: true,
        analytics: {
          utilizationRate: 0,
          revenue: 0,
          clientSatisfaction: 0,
          averageWaitTime: 0
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        ...centreData
      };

      await addDoc(collection(db, 'centres'), newCentre);
      setIsCreating(false);
      setError(null);
    } catch (error) {
      console.error('Error creating centre:', error);
      setError('Failed to create centre. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const handleUpdateCentre = async (centreData: Partial<TreatmentCentre>) => {
    if (!editingCentre) return;

    try {
      setUpdating(editingCentre.id);
      
      const updatedData = {
        ...centreData,
        updatedAt: Timestamp.now()
      };

      await updateDoc(doc(db, 'centres', editingCentre.id), updatedData);
      setEditingCentre(null);
      setError(null);
    } catch (error) {
      console.error('Error updating centre:', error);
      setError('Failed to update centre. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const handleDeleteCentre = async () => {
    if (!deletingCentre) return;

    try {
      setUpdating(deletingCentre.id);
      await deleteDoc(doc(db, 'centres', deletingCentre.id));
      setDeletingCentre(null);
      setError(null);
    } catch (error) {
      console.error('Error deleting centre:', error);
      setError('Failed to delete centre. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  // Load staff data to show assignments
  const loadStaffData = async () => {
    setStaffLoading(true);
    try {
      const staffRef = collection(db, 'staff');
      const q = query(staffRef, orderBy('lastName'));
      const snapshot = await getDocs(q);
      
      const staff = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setStaffData(staff);
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setStaffLoading(false);
    }
  };

  // Get staff assigned to a centre
  const getAssignedStaff = (centreName: string) => {
    return staffData.filter(staff => 
      staff.centre === centreName || 
      (staff.workingCentres && staff.workingCentres.includes(centreName))
    );
  };

  // Load staff data when component mounts
  useEffect(() => {
    loadStaffData();
  }, []);

  // const handleToggleCentreStatus = async (centre: TreatmentCentre) => {
  //   try {
  //     setUpdating(centre.id);
  //     await updateDoc(doc(db, 'centres', centre.id), {
  //       isActive: !centre.isActive,
  //       updatedAt: Timestamp.now()
  //     });
  //     setError(null);
  //   } catch (error) {
  //     console.error('Error updating centre status:', error);
  //     setError('Failed to update centre status. Please try again.');
  //   } finally {
  //     setUpdating(null);
  //   }
  // };

  // TODO: Add toggle functionality to CentreCard component
  // const toggleCentreStatus = handleToggleCentreStatus;

  const formatOperatingHours = (centre: TreatmentCentre) => {
    const days = Object.entries(centre.operatingHours);
    const openDays = days.filter(([, hours]) => hours.isOpen);
    if (openDays.length === 0) return 'Closed';
    if (openDays.length === 7) return 'Open daily';
    return `${openDays.length} days/week`;
  };

  const CentreCard = ({ centre }: { centre: TreatmentCentre }) => (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{centre.name}</h3>
            <div className="flex items-center text-gray-600 mb-2">
              <MapPinIcon className="w-4 h-4 mr-2" />
              <span className="text-sm">
                {centre.address.suburb}, {centre.address.city}
              </span>
            </div>
            <div className="flex items-center text-gray-600 mb-2">
              <PhoneIcon className="w-4 h-4 mr-2" />
              <span className="text-sm">{centre.contactInfo.phone}</span>
            </div>
            <div className="flex items-center text-gray-600 mb-3">
              <UserIcon className="w-4 h-4 mr-2" />
              <span className="text-sm">
                Manager: {centre.contactInfo.managerName}
              </span>
            </div>
            <div className="flex items-center text-gray-600 mb-3">
              <UserIcon className="w-4 h-4 mr-2" />
              <span className="text-sm">
                Staff Assigned: {getAssignedStaff(centre.name).length}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <span className={`px-3 py-1 text-sm rounded-full ${
              centre.isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {centre.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
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
              <span className="font-medium">Services:</span> {centre.services?.length || 0} offered
            </div>
            
            <div className="text-sm text-gray-600">
              <span className="font-medium">Staff:</span> {getAssignedStaff(centre.name).length} assigned
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
      
      <div className="flex space-x-2 ml-4 p-4">
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

          <div className="mt-6">
            <h3 className="font-semibold text-gray-900 mb-3">Assigned Staff</h3>
            {staffLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="md" />
              </div>
            ) : (() => {
              const assignedStaff = getAssignedStaff(centre.name);
              return assignedStaff.length > 0 ? (
                <div className="space-y-3">
                  {assignedStaff.map((staff: any) => (
                    <div key={staff.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-medium text-sm">
                            {staff.firstName?.[0]}{staff.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {staff.firstName} {staff.lastName}
                          </p>
                          <p className="text-sm text-gray-600">
                            {staff.position} • {staff.department}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">{staff.email}</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          staff.status === 'active' 
                            ? 'text-green-800 bg-green-100' 
                            : staff.status === 'on-leave'
                            ? 'text-yellow-800 bg-yellow-100'
                            : 'text-red-800 bg-red-100'
                        }`}>
                          {staff.status === 'on-leave' ? 'On Leave' : 
                           staff.status?.charAt(0)?.toUpperCase() + staff.status?.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <UserIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No staff assigned to this centre</p>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

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
          disabled={updating === 'creating'}
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          {updating === 'creating' ? 'Creating...' : 'Add Centre'}
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <div className="flex items-center p-4">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-3" />
            <div className="flex-1">
              <p className="text-red-800">{error}</p>
            </div>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

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