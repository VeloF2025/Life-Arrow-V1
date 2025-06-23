import { useState, useEffect } from 'react';
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  TagIcon,
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
import type { ServiceManagement } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';
import { formatPrice as formatPriceUtil } from '../../lib/utils';

interface ServiceFormData {
  name: string;
  description: string;
  category: ServiceManagement['category'];
  duration: number;
  price: number;
  requiredQualifications: string[];
  equipmentRequired: string[];
  preparationInstructions: string;
  followUpRequired: boolean;
  maxConcurrentBookings: number;
  advanceBookingDays: number;
  cancellationHours: number;
  requiresApproval: boolean;
}

const CATEGORIES = [
  { value: 'scanning', label: 'Scanning' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'treatment', label: 'Treatment' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'follow-up', label: 'Follow-up' }
];

export function ServicesManagement() {
  const [services, setServices] = useState<ServiceManagement[]>([]);
  const [centres, setCentres] = useState<{ id: string; name: string; services?: string[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  
  // Form states
  const [isCreating, setIsCreating] = useState(false);
  const [editingService, setEditingService] = useState<ServiceManagement | null>(null);
  const [viewingService, setViewingService] = useState<ServiceManagement | null>(null);
  const [deletingService, setDeletingService] = useState<ServiceManagement | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Load services and centres from Firebase
  useEffect(() => {
    setLoading(true);
    setError(null);

    // Set up real-time listener for centres
    const centresQuery = query(collection(db, 'centres'), orderBy('createdAt', 'desc'));
    const unsubscribeCentres = onSnapshot(centresQuery, 
      (snapshot) => {
        const centresData = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || 'Unnamed Centre',
          services: doc.data().services || [],
          ...doc.data()
        }));
        setCentres(centresData);
        console.log('Centres updated:', centresData.map(c => `${c.name}: ${c.services?.length || 0} services`));
      },
      (error) => {
        console.error('Centres listener failed:', error);
      }
    );

    // Set up real-time listener for services
    const servicesQuery = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
    const unsubscribeServices = onSnapshot(servicesQuery, 
      (snapshot) => {
        const servicesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        })) as ServiceManagement[];
        
        setServices(servicesData);
        setLoading(false);
        console.log('Services updated:', servicesData.map(s => `${s.name}: available at ${s.availableAtCentres?.length || 0} centres`));
      },
      (error) => {
        console.error('Services listener failed:', error);
        // Fallback to one-time fetch
        fetchServicesOnce();
      }
    );

    return () => {
      unsubscribeCentres();
      unsubscribeServices();
    };
  }, []);

  const fetchServicesOnce = async () => {
    try {
      const q = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const servicesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as ServiceManagement[];
      
      setServices(servicesData);
      setError(null);
    } catch (error) {
      console.error('Error fetching services:', error);
      setError('Failed to load services. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || service.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && service.isActive) ||
                         (filterStatus === 'inactive' && !service.isActive);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleCreateService = async (formData: ServiceFormData) => {
    try {
      setUpdating('creating');
      
      const newService = {
        ...formData,
        isActive: true,
        availableAtCentres: [], // Will be set when centres are assigned
        bookingSettings: {
          advanceBookingDays: formData.advanceBookingDays,
          cancellationHours: formData.cancellationHours,
          requiresApproval: formData.requiresApproval,
        },
        analytics: {
          totalBookings: 0,
          revenue: 0,
          averageRating: 0,
          noShowRate: 0,
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await addDoc(collection(db, 'services'), newService);
      setIsCreating(false);
      setError(null);
    } catch (error) {
      console.error('Error creating service:', error);
      setError('Failed to create service. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const handleUpdateService = async (formData: ServiceFormData) => {
    if (!editingService) return;

    try {
      setUpdating(editingService.id);
      
      const updatedData = {
        ...formData,
        bookingSettings: {
          advanceBookingDays: formData.advanceBookingDays,
          cancellationHours: formData.cancellationHours,
          requiresApproval: formData.requiresApproval,
        },
        updatedAt: Timestamp.now()
      };

      await updateDoc(doc(db, 'services', editingService.id), updatedData);
      setEditingService(null);
      setError(null);
    } catch (error) {
      console.error('Error updating service:', error);
      setError('Failed to update service. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const handleDeleteService = async () => {
    if (!deletingService) return;

    try {
      setUpdating(deletingService.id);
      await deleteDoc(doc(db, 'services', deletingService.id));
      setDeletingService(null);
      setError(null);
    } catch (error) {
      console.error('Error deleting service:', error);
      setError('Failed to delete service. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const handleToggleServiceStatus = async (service: ServiceManagement) => {
    try {
      setUpdating(service.id);
      await updateDoc(doc(db, 'services', service.id), {
        isActive: !service.isActive,
        updatedAt: Timestamp.now()
      });
      setError(null);
    } catch (error) {
      console.error('Error updating service status:', error);
      setError('Failed to update service status. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const handleUpdateServiceCentres = async (serviceId: string, centreIds: string[]) => {
    try {
      setUpdating(serviceId);
      
      if (serviceId === 'all') {
        // Link all services to all centres
        for (const service of services) {
          await updateDoc(doc(db, 'services', service.id), {
            availableAtCentres: centreIds,
            updatedAt: Timestamp.now()
          });
        }
        
        // Update all centres to include all services
        for (const centre of centres) {
          await updateDoc(doc(db, 'centres', centre.id), {
            services: services.map(s => s.id),
            updatedAt: Timestamp.now()
          });
        }
      } else {
        // Update single service's availableAtCentres
        await updateDoc(doc(db, 'services', serviceId), {
          availableAtCentres: centreIds,
          updatedAt: Timestamp.now()
        });

        // Update each centre's services array - FIXED LOGIC
        for (const centre of centres) {
          const currentServices = centre.services || [];
          let updatedServices = [...currentServices];
          
          if (centreIds.includes(centre.id)) {
            // Add service to centre if not already there
            if (!updatedServices.includes(serviceId)) {
              updatedServices.push(serviceId);
            }
          } else {
            // Remove service from centre
            updatedServices = updatedServices.filter((id: string) => id !== serviceId);
          }
          
          // Always update if the services array changed
          if (JSON.stringify(updatedServices.sort()) !== JSON.stringify(currentServices.sort())) {
            await updateDoc(doc(db, 'centres', centre.id), {
              services: updatedServices,
              updatedAt: Timestamp.now()
            });
            console.log(`Updated centre ${centre.name}: services = [${updatedServices.join(', ')}]`);
          }
        }
      }
      
      setError(null);
      console.log(`Successfully updated service ${serviceId} for centres: [${centreIds.join(', ')}]`);
    } catch (error) {
      console.error('Error updating service centres:', error);
      setError('Failed to update service centres. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const formatPrice = (priceInCents: number) => {
    return formatPriceUtil(priceInCents);
  };

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
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services Management</h1>
          <p className="text-gray-600">Manage your service offerings, pricing, and centre availability</p>
        </div>
        <Button
          onClick={() => setIsCreating(true)}
          className="btn-primary"
          disabled={updating === 'creating'}
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          {updating === 'creating' ? 'Creating...' : 'Add Service'}
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

      {/* Filters */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <div className="relative">
              <FunnelIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Select
                value={filterCategory}
                onChange={(value) => setFilterCategory(value)}
                options={[
                  { value: 'all', label: 'All Categories' },
                  ...CATEGORIES
                ]}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <Select
              value={filterStatus}
              onChange={(value) => setFilterStatus(value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
            />
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{filteredServices.length}</span> of{' '}
              <span className="font-medium">{services.length}</span> services
            </div>
          </div>
        </div>
      </Card>

      {/* Services Grid */}
      <div className="space-y-4">
        {filteredServices.map((service) => (
          <ServiceCard 
            key={service.id} 
            service={service}
            centres={centres}
            onView={() => setViewingService(service)}
            onEdit={() => setEditingService(service)}
            onDelete={() => setDeletingService(service)}
            onToggleStatus={() => handleToggleServiceStatus(service)}
            onUpdateCentres={(centreIds) => handleUpdateServiceCentres(service.id, centreIds)}
            formatPrice={formatPrice}
            isUpdating={updating === service.id}
          />
        ))}
        
        {filteredServices.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <UserGroupIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
              <p className="text-gray-600">
                {searchTerm || filterCategory !== 'all' || filterStatus !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Get started by adding your first service'
                }
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Modals */}
      {viewingService && (
        <ServiceDetailsModal 
          service={viewingService} 
          onClose={() => setViewingService(null)}
          formatPrice={formatPrice}
        />
      )}
      
      {(isCreating || editingService) && (
        <ServiceFormModal
          service={editingService}
          onClose={() => {
            setIsCreating(false);
            setEditingService(null);
          }}
          onSubmit={editingService ? handleUpdateService : handleCreateService}
        />
      )}

      {deletingService && (
        <DeleteConfirmModal
          service={deletingService}
          onClose={() => setDeletingService(null)}
          onConfirm={handleDeleteService}
        />
      )}
    </div>
  );
}

const ServiceCard = ({ service, centres, onView, onEdit, onDelete, onToggleStatus, onUpdateCentres, formatPrice, isUpdating }: {
  service: ServiceManagement;
  centres: { id: string; name: string; services?: string[] }[];
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  onUpdateCentres: (centreIds: string[]) => void;
  formatPrice: (price: number) => string;
  isUpdating: boolean;
}) => (
  <Card className="hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
          <span className={`px-2 py-1 text-xs rounded-full ${
            service.isActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {service.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        
        <p className="text-gray-600 text-sm mb-4">{service.description}</p>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div>
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <ClockIcon className="w-4 h-4 mr-2" />
              <span className="font-medium">Duration:</span>
              <span className="ml-1">{service.duration} minutes</span>
            </div>
            
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <CurrencyDollarIcon className="w-4 h-4 mr-2" />
              <span className="font-medium">Price:</span>
              <span className="ml-1">{formatPrice(service.price)}</span>
            </div>
            
            <div className="flex items-center text-sm text-gray-600">
              <TagIcon className="w-4 h-4 mr-2" />
              <span className="font-medium">Category:</span>
              <span className="ml-1 capitalize">{service.category}</span>
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600 mb-2">
              <span className="font-medium">Equipment:</span> {service.equipmentRequired.length} items
            </div>
            
            <div className="text-sm text-gray-600 mb-2">
              <span className="font-medium">Qualifications:</span> {service.requiredQualifications.length} required
            </div>
            
            <div className="text-sm text-gray-600">
              <span className="font-medium">Max Concurrent:</span> {service.maxConcurrentBookings}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center">
            <span className="font-medium">Bookings:</span>
            <span className="ml-1">{service.analytics.totalBookings}</span>
          </div>
          <div className="flex items-center">
            <span className="font-medium">Revenue:</span>
            <span className="ml-1">{formatPrice(service.analytics.revenue)}</span>
          </div>
          <div className="flex items-center">
            <span className="font-medium">Rating:</span>
            <span className="ml-1">{service.analytics.averageRating}/5</span>
          </div>
        </div>

        {/* Centres Management Section */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">Available at Centres</h4>
            <span className="text-xs text-gray-500">
              {service.availableAtCentres?.length || 0} of {centres.length} centres
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {centres.map((centre) => {
              const isSelected = service.availableAtCentres?.includes(centre.id) || false;
              
              return (
                <label
                  key={centre.id}
                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      const currentCentres = service.availableAtCentres || [];
                      let newCentres;
                      
                      if (e.target.checked) {
                        newCentres = [...currentCentres, centre.id];
                      } else {
                        newCentres = currentCentres.filter(id => id !== centre.id);
                      }
                      
                      onUpdateCentres(newCentres);
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    disabled={isUpdating}
                  />
                  <span className="text-sm text-gray-700">{centre.name}</span>
                </label>
              );
            })}
          </div>
          
          {centres.length === 0 && (
            <p className="text-sm text-gray-500 italic">No centres available</p>
          )}
        </div>
      </div>
      
      <div className="flex space-x-2 ml-4">
        <Button
          onClick={onView}
          className="btn-secondary text-sm p-2"
          disabled={isUpdating}
        >
          <EyeIcon className="w-4 h-4" />
        </Button>
        <Button
          onClick={onEdit}
          className="btn-primary text-sm p-2"
          disabled={isUpdating}
        >
          <PencilIcon className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => onToggleStatus()}
          className={`text-sm p-2 ${service.isActive ? 'btn bg-orange-600 text-white hover:bg-orange-700' : 'btn bg-green-600 text-white hover:bg-green-700'}`}
          disabled={isUpdating}
        >
          {isUpdating ? '...' : (service.isActive ? 'Deactivate' : 'Activate')}
        </Button>
        <Button
          onClick={() => onDelete()}
          className="btn bg-red-600 text-white hover:bg-red-700 text-sm p-2"
          disabled={isUpdating}
        >
          <TrashIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  </Card>
);

const ServiceDetailsModal = ({ service, onClose, formatPrice }: {
  service: ServiceManagement;
  onClose: () => void;
  formatPrice: (price: number) => string;
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{service.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-700">Description</label>
            <p className="mt-1 text-gray-900">{service.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700">Category</label>
              <p className="mt-1 text-gray-900 capitalize">{service.category}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Duration</label>
              <p className="mt-1 text-gray-900">{service.duration} minutes</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Price</label>
            <p className="mt-1 text-2xl font-bold text-primary-600">{formatPrice(service.price)}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Required Qualifications</label>
            <div className="mt-1 flex flex-wrap gap-1">
              {service.requiredQualifications.map((qual: string, index: number) => (
                <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                  {qual}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Equipment Required</label>
            <div className="mt-1 flex flex-wrap gap-1">
              {service.equipmentRequired.map((equipment: string, index: number) => (
                <span key={index} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                  {equipment}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Preparation Instructions</label>
            <p className="mt-1 text-gray-900">{service.preparationInstructions}</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700">Advance Booking</label>
              <p className="mt-1 text-gray-900">{service.bookingSettings.advanceBookingDays} days</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Cancellation Window</label>
              <p className="mt-1 text-gray-900">{service.bookingSettings.cancellationHours} hours</p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Analytics</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Bookings:</span>
                <span className="ml-2 font-medium">{service.analytics.totalBookings}</span>
              </div>
              <div>
                <span className="text-gray-600">Revenue:</span>
                <span className="ml-2 font-medium">{formatPrice(service.analytics.revenue)}</span>
              </div>
              <div>
                <span className="text-gray-600">Average Rating:</span>
                <span className="ml-2 font-medium">{service.analytics.averageRating}/5</span>
              </div>
              <div>
                <span className="text-gray-600">No-Show Rate:</span>
                <span className="ml-2 font-medium">{(service.analytics.noShowRate * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  </div>
);

const ServiceFormModal = ({ service, onClose, onSubmit }: {
  service?: ServiceManagement | null;
  onClose: () => void;
  onSubmit: (data: ServiceFormData) => void;
}) => {
  const [formData, setFormData] = useState<ServiceFormData>({
    name: service?.name || '',
    description: service?.description || '',
    category: service?.category || 'consultation',
    duration: service?.duration || 30,
    price: service?.price || 0,
    requiredQualifications: service?.requiredQualifications || [],
    equipmentRequired: service?.equipmentRequired || [],
    preparationInstructions: service?.preparationInstructions || '',
    followUpRequired: service?.followUpRequired || false,
    maxConcurrentBookings: service?.maxConcurrentBookings || 1,
    advanceBookingDays: service?.bookingSettings.advanceBookingDays || 14,
    cancellationHours: service?.bookingSettings.cancellationHours || 24,
    requiresApproval: service?.bookingSettings.requiresApproval || false,
  });

  // Separate state for the price in Rands (for display)
  const [priceInRands, setPriceInRands] = useState<string>(
    service ? (service.price / 100).toFixed(2) : '0.00'
  );

  const [newQualification, setNewQualification] = useState('');
  const [newEquipment, setNewEquipment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Convert price from Rands to cents before submitting
    const priceInCents = Math.round(parseFloat(priceInRands) * 100);
    onSubmit({
      ...formData,
      price: priceInCents
    });
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPriceInRands(value);
    // Update the formData price in cents for validation
    const priceInCents = Math.round(parseFloat(value || '0') * 100);
    setFormData(prev => ({ ...prev, price: priceInCents }));
  };

  const addQualification = () => {
    if (newQualification.trim()) {
      setFormData(prev => ({
        ...prev,
        requiredQualifications: [...prev.requiredQualifications, newQualification.trim()]
      }));
      setNewQualification('');
    }
  };

  const removeQualification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requiredQualifications: prev.requiredQualifications.filter((_, i) => i !== index)
    }));
  };

  const addEquipment = () => {
    if (newEquipment.trim()) {
      setFormData(prev => ({
        ...prev,
        equipmentRequired: [...prev.equipmentRequired, newEquipment.trim()]
      }));
      setNewEquipment('');
    }
  };

  const removeEquipment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      equipmentRequired: prev.equipmentRequired.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {service ? 'Edit Service' : 'Create New Service'}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Name
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
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <Select
                  value={formData.category}
                  onChange={(value) => setFormData(prev => ({ ...prev, category: value as ServiceManagement['category'] }))}
                  options={CATEGORIES}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <Input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: Number(e.target.value) }))}
                  min="1"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price (Rands)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={priceInRands}
                onChange={handlePriceChange}
                placeholder="0.00"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Enter price in Rands (e.g., 150.00 for R150.00)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Required Qualifications
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
                {formData.requiredQualifications.map((qual: string, index: number) => (
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Equipment Required
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  type="text"
                  value={newEquipment}
                  onChange={(e) => setNewEquipment(e.target.value)}
                  placeholder="Add equipment"
                  className="flex-1"
                />
                <Button type="button" onClick={addEquipment} size="sm">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {formData.equipmentRequired.map((equipment: string, index: number) => (
                  <span key={index} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded flex items-center gap-1">
                    {equipment}
                    <button
                      type="button"
                      onClick={() => removeEquipment(index)}
                      className="text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preparation Instructions
              </label>
              <textarea
                value={formData.preparationInstructions}
                onChange={(e) => setFormData(prev => ({ ...prev, preparationInstructions: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Concurrent Bookings
                </label>
                <Input
                  type="number"
                  value={formData.maxConcurrentBookings}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxConcurrentBookings: Number(e.target.value) }))}
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Advance Booking (days)
                </label>
                <Input
                  type="number"
                  value={formData.advanceBookingDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, advanceBookingDays: Number(e.target.value) }))}
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cancellation Window (hours)
                </label>
                <Input
                  type="number"
                  value={formData.cancellationHours}
                  onChange={(e) => setFormData(prev => ({ ...prev, cancellationHours: Number(e.target.value) }))}
                  min="1"
                  required
                />
              </div>
              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.requiresApproval}
                    onChange={(e) => setFormData(prev => ({ ...prev, requiresApproval: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Requires Approval</span>
                </label>
              </div>
            </div>

            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.followUpRequired}
                  onChange={(e) => setFormData(prev => ({ ...prev, followUpRequired: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Follow-up Required</span>
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <Button type="button" onClick={onClose} variant="outline">
              Cancel
            </Button>
            <Button type="submit">
              {service ? 'Update Service' : 'Create Service'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DeleteConfirmModal = ({ service, onClose, onConfirm }: {
  service: ServiceManagement;
  onClose: () => void;
  onConfirm: () => void;
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg max-w-md w-full">
      <div className="p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Delete Service</h2>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete "{service.name}"? This action cannot be undone.
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