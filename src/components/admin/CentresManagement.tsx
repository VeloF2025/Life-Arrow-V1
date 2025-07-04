import { useState, useEffect } from 'react';
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  MapPinIcon,
  PhoneIcon,
  UserIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { db } from '../../lib/firebase';
import { 
  collection, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  getDocs
} from 'firebase/firestore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

// Define the Centre interface
interface Centre {
  id: string;
  name: string;
  address: {
    street: string;
    suburb: string;
    city: string;
    province: string;
    postalCode: string;
    country?: string;
    coordinates?: { lat: number; lng: number };
  };
  contactInfo: {
    phoneNumber?: string;
    phone?: string;
    email?: string;
    managerName: string;
  };
  facilities: {
    availableEquipment: string[];
    amenities?: string[];
  };
  services?: string[];
  operatingHours: {
    [day: string]: { open: string; close: string; closed?: boolean };
  };
  capacity: {
    maxDailyAppointments: number;
    maxConcurrentAppointments: number;
    maxWalkIns?: number;
  };
  isActive: boolean;
  specialNotes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

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

// Simple LoadingSpinner component
const LoadingSpinner = () => {
  return (
    <div className="flex justify-center items-center p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
};

// Helper component for displaying a centre card
const CentreCard = ({ centre, onView, onEdit, onDelete }: { 
  centre: Centre; 
  onView: (centre: Centre) => void; 
  onEdit: (centre: Centre) => void; 
  onDelete: (centre: Centre) => void; 
}) => {
  return (
    <Card className="mb-4 overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold">{centre.name}</h3>
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onView(centre)}
            >
              <EyeIcon className="h-4 w-4 mr-1" />
              View
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onEdit(centre)}
            >
              <PencilIcon className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onDelete(centre)}
              className="text-red-600 hover:text-red-800"
            >
              <TrashIcon className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
        
        <div className="flex items-center text-sm text-gray-600 mb-1">
          <MapPinIcon className="h-4 w-4 mr-1" />
          <span>
            {centre.address?.street || 'No street'}, 
            {centre.address?.suburb || 'No suburb'}, 
            {centre.address?.city || 'No city'}
          </span>
        </div>
        
        <div className="flex items-center text-sm text-gray-600 mb-1">
          <PhoneIcon className="h-4 w-4 mr-1" />
          <span>{(centre.contactInfo?.phone || centre.contactInfo?.phoneNumber || 'No phone')}</span>
        </div>
        
        <div className="flex items-center text-sm text-gray-600">
          <UserIcon className="h-4 w-4 mr-1" />
          <span>Manager: {centre.contactInfo?.managerName || 'Not assigned'}</span>
        </div>
        
        <div className="mt-3 flex items-center">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${centre.isActive === false ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            {centre.isActive === false ? 'Inactive' : 'Active'}
          </span>
        </div>
      </div>
    </Card>
  );
};

// Delete confirmation modal component
const DeleteConfirmModal = ({ centre, onClose, onConfirm }: { 
  centre: Centre; 
  onClose: () => void;
  onConfirm: () => void;
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Delete Centre</h2>
              <p className="mt-2 text-gray-600">Are you sure you want to delete {centre.name}?</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>
          
          <p className="text-gray-600 mb-4">This action cannot be undone. This will permanently delete the centre and all associated data.</p>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export function CentresManagement() {
  const [centres, setCentres] = useState<Centre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvince, setFilterProvince] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  // For backward compatibility with existing code
  const [viewingCentre, setViewingCentre] = useState<Centre | null>(null);
  const [editingCentre, setEditingCentre] = useState<Centre | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingCentre, setDeletingCentre] = useState<Centre | null>(null);

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
        })) as Centre[];
        
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
      })) as Centre[];
      
      setCentres(centresData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching centres:', error);
      setError('Failed to load centres. Please try again.');
      setLoading(false);
    }
  };

  const filteredCentres = centres.filter(centre => {
    const matchesSearch = centre.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         centre.address.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         centre.address.province.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProvince = filterProvince === 'all' || centre.address.province.toLowerCase() === filterProvince.toLowerCase();
    
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'active' && centre.isActive) ||
                         (filterStatus === 'inactive' && !centre.isActive);
    
    return matchesSearch && matchesProvince && matchesStatus;
  });



  const handleDeleteCentre = async () => {
    if (!deletingCentre) return;
    
    try {
      setError(null);
      
      await deleteDoc(doc(db, 'centres', deletingCentre.id));
      
      setDeletingCentre(null);
      setError(null);
    } catch (error) {
      console.error('Error deleting centre:', error);
      setError('Failed to delete centre. Please try again.');
    }
  };



  if (loading) {
    return (
      <LoadingSpinner />
    );
  }

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Treatment Centres</h1>
        <Button
          onClick={() => setIsCreating(true)}
          className="flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-1" />
          Add Centre
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 flex items-start">
          <ExclamationTriangleIcon className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="mb-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center gap-4 p-4">
          <div className="relative flex-grow">
            <Input
              type="text"
              placeholder="Search centres..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          </div>
          
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-500" />
            <Select
              value={filterProvince}
              onChange={(value: string) => setFilterProvince(value)}
              className="w-40"
              options={[
                { value: 'all', label: 'All Provinces' },
                ...PROVINCES
              ]}
            />
            
            <Select
              value={filterStatus}
              onChange={(value: string) => setFilterStatus(value)}
              className="w-32"
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
            />
          </div>
        </div>
        
        <div className="flex items-center text-sm text-gray-600 px-4 pb-4">
          <FunnelIcon className="w-4 h-4 mr-2" />
          {filteredCentres.length} of {centres.length} centres
        </div>
      </Card>

      {filteredCentres.length === 0 ? (
        <div className="col-span-full py-8 text-center text-gray-500">
          No centres found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCentres.map((centre) => (
            <CentreCard
              key={centre.id}
              centre={centre}
              onView={(centre) => setViewingCentre(centre)}
              onEdit={(centre) => setEditingCentre(centre)}
              onDelete={(centre) => setDeletingCentre(centre)}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deletingCentre && (
        <DeleteConfirmModal
          centre={deletingCentre}
          onClose={() => setDeletingCentre(null)}
          onConfirm={handleDeleteCentre}
        />
      )}
      
      {/* View Centre Modal */}
      {viewingCentre && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold">{viewingCentre.name}</h2>
                <button
                  onClick={() => setViewingCentre(null)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900">Address</h3>
                  <p className="text-gray-600">
                    {viewingCentre.address?.street || 'No street'}, {viewingCentre.address?.suburb || 'No suburb'}<br />
                    {viewingCentre.address?.city || 'No city'}, {viewingCentre.address?.province || 'No province'}<br />
                    {viewingCentre.address?.postalCode || 'No postal code'}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900">Contact Information</h3>
                  <p className="text-gray-600">
                    Manager: {viewingCentre.contactInfo?.managerName || 'Not assigned'}<br />
                    Phone: {viewingCentre.contactInfo?.phone || viewingCentre.contactInfo?.phoneNumber || 'N/A'}<br />
                    Email: {viewingCentre.contactInfo?.email || 'N/A'}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900">Status</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${viewingCentre.isActive === false ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {viewingCentre.isActive === false ? 'Inactive' : 'Active'}
                  </span>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900">Capacity</h3>
                  <p className="text-gray-600">
                    Max Daily Appointments: {viewingCentre.capacity?.maxDailyAppointments || 'Not set'}<br />
                    Max Concurrent Appointments: {viewingCentre.capacity?.maxConcurrentAppointments || 'Not set'}<br />
                    {viewingCentre.capacity?.maxWalkIns !== undefined && (
                      <>Max Walk-ins: {viewingCentre.capacity.maxWalkIns}<br /></>
                    )}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900">Facilities</h3>
                  <div className="mt-2">
                    <h4 className="text-sm font-medium text-gray-700">Equipment</h4>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {viewingCentre.facilities?.availableEquipment?.map((item, index) => (
                        <span key={index} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded">
                          {item}
                        </span>
                      ))}
                      {(!viewingCentre.facilities?.availableEquipment || viewingCentre.facilities.availableEquipment.length === 0) && (
                        <span className="text-gray-500 text-sm">No equipment listed</span>
                      )}
                    </div>
                  </div>
                  
                  {viewingCentre.facilities.amenities && (
                    <div className="mt-2">
                      <h4 className="text-sm font-medium text-gray-700">Amenities</h4>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {viewingCentre.facilities?.amenities?.map((item, index) => (
                          <span key={index} className="bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded">
                            {item}
                          </span>
                        ))}
                        {(!viewingCentre.facilities?.amenities || viewingCentre.facilities.amenities.length === 0) && (
                          <span className="text-gray-500 text-sm">No amenities listed</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900">Special Notes</h3>
                  <p className="text-gray-600">
                    {viewingCentre.specialNotes || 'No special notes'}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <Button onClick={() => setViewingCentre(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit/Create Centre Modal - simplified placeholder */}
      {(editingCentre || isCreating) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold">
                  {isCreating ? 'Add New Centre' : `Edit ${editingCentre?.name || ''}`}
                </h2>
                <button
                  onClick={() => isCreating ? setIsCreating(false) : setEditingCentre(null)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Form would go here - simplified for this fix */}
                <p className="text-gray-600">Form implementation needed</p>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => isCreating ? setIsCreating(false) : setEditingCentre(null)}
                >
                  Cancel
                </Button>
                <Button>
                  {isCreating ? 'Create Centre' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
