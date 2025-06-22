import { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  UserPlusIcon,
  CalendarDaysIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  doc, 
  updateDoc, 
  onSnapshot,
  Timestamp,
  FirestoreError 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';

interface ClientInfo {
  id: string;
  // Personal Info
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  gender: string;
  dateOfBirth?: string;
  idNumber?: string;
  passport?: string;
  country: string;
  
  // Address
  address1: string;
  address2?: string;
  suburb: string;
  cityTown: string;
  province: string;
  postalCode: string;
  
  // Contact Details
  preferredMethodOfContact: string;
  maritalStatus: string;
  employmentStatus: string;
  
  // Medical Info
  currentMedication?: string;
  chronicConditions?: string;
  currentTreatments?: string;
  
  // Service Info
  reasonForTransformation: string;
  whereDidYouHearAboutLifeArrow: string;
  myNearestTreatmentCentre: string;
  referrerName?: string;
  
  // Administrative
  status: 'active' | 'inactive' | 'pending-verification' | 'suspended';
  registrationDate?: Timestamp | Date | null;
  lastActivity?: Timestamp | Date | null;
  addedTime: Timestamp | Date;
  userId?: string;
}

export function ClientsManagement() {
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [centreFilter, setCentreFilter] = useState('all');
  const [viewingClient, setViewingClient] = useState<ClientInfo | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'status' | 'centre'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [updating, setUpdating] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = setupRealtimeListener();
    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    filterAndSortClients();
  }, [clients, searchTerm, statusFilter, centreFilter, sortBy, sortOrder]);

  const setupRealtimeListener = () => {
    try {
      setLoading(true);
      setError(null);
      
      const clientsQuery = query(
        collection(db, 'clients'),
        orderBy('addedTime', 'desc'),
        limit(100)
      );

      const unsubscribe = onSnapshot(
        clientsQuery,
        (snapshot) => {
          const clientsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as ClientInfo[];
          
          setClients(clientsData);
          setLoading(false);
          setError(null);
        },
        (error: FirestoreError) => {
          console.error('Error listening to clients:', error);
          setError(`Failed to load clients: ${error.message}`);
          setLoading(false);
          
          // Fallback to one-time fetch if real-time fails
          loadClientsOnce();
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up real-time listener:', error);
      setError('Failed to connect to database');
      setLoading(false);
      return null;
    }
  };

  const loadClientsOnce = async () => {
    try {
      setLoading(true);
      const clientsQuery = query(
        collection(db, 'clients'),
        orderBy('addedTime', 'desc'),
        limit(100)
      );
      
      const snapshot = await getDocs(clientsQuery);
      const clientsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ClientInfo[];
      
      setClients(clientsData);
      setError(null);
    } catch (error) {
      console.error('Error loading clients:', error);
      setError(error instanceof Error ? error.message : 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortClients = () => {
    let filtered = [...clients];

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(client => 
        client.firstName?.toLowerCase().includes(search) ||
        client.lastName?.toLowerCase().includes(search) ||
        client.email?.toLowerCase().includes(search) ||
        client.mobile?.includes(search) ||
        client.idNumber?.includes(search)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(client => client.status === statusFilter);
    }

    // Filter by treatment centre
    if (centreFilter !== 'all') {
      filtered = filtered.filter(client => client.myNearestTreatmentCentre === centreFilter);
    }

    // Sort clients
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          break;
        case 'date': {
          const aDate = getDateFromTimestamp(a.addedTime);
          const bDate = getDateFromTimestamp(b.addedTime);
          comparison = aDate.getTime() - bDate.getTime();
          break;
        }
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'centre':
          comparison = (a.myNearestTreatmentCentre || '').localeCompare(b.myNearestTreatmentCentre || '');
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredClients(filtered);
  };

  const getDateFromTimestamp = (timestamp: Timestamp | Date | undefined | null): Date => {
    if (!timestamp) return new Date(0);
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'object' && 'toDate' in timestamp) {
      return timestamp.toDate();
    }
    return new Date(0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'pending-verification':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'pending-verification':
        return <ClockIcon className="w-4 h-4" />;
      case 'suspended':
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      default:
        return <UserIcon className="w-4 h-4" />;
    }
  };

  const formatDate = (timestamp: Timestamp | Date | null | undefined) => {
    const date = getDateFromTimestamp(timestamp);
    if (date.getTime() === 0) return 'N/A';
    
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const toggleCardExpansion = (clientId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedCards(newExpanded);
  };

  const updateClientStatus = async (clientId: string, newStatus: 'active' | 'inactive' | 'pending-verification' | 'suspended') => {
    try {
      // Add client to updating set
      setUpdating(prev => new Set(prev).add(clientId));
      
      await updateDoc(doc(db, 'clients', clientId), {
        status: newStatus,
        lastUpdated: Timestamp.now(),
        lastActivity: Timestamp.now()
      });
      
      // The real-time listener will update the UI automatically
      
    } catch (error) {
      console.error('Error updating client status:', error);
      setError(error instanceof Error ? error.message : 'Failed to update client status');
    } finally {
      // Remove client from updating set
      setUpdating(prev => {
        const newSet = new Set(prev);
        newSet.delete(clientId);
        return newSet;
      });
    }
  };

  const retryLoad = () => {
    setError(null);
    const unsubscribe = setupRealtimeListener();
    return () => unsubscribe?.();
  };

  const uniqueCentres = [...new Set(clients.map(c => c.myNearestTreatmentCentre).filter(Boolean))];

  const ClientCard = ({ client }: { client: ClientInfo }) => {
    const isExpanded = expandedCards.has(client.id);
    const isUpdating = updating.has(client.id);
    
    return (
      <Card className="hover:shadow-md transition-shadow">
        <div className="p-6">
          {/* Header Row */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-primary-600" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {client.firstName} {client.lastName}
                  </h3>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
                    {getStatusIcon(client.status)}
                    <span className="ml-1 capitalize">{client.status.replace('-', ' ')}</span>
                  </span>
                  {isUpdating && (
                    <div className="animate-spin">
                      <LoadingSpinner />
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <EnvelopeIcon className="w-4 h-4" />
                    <span>{client.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <PhoneIcon className="w-4 h-4" />
                    <span>{client.mobile}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CalendarDaysIcon className="w-4 h-4" />
                    <span>Registered: {formatDate(client.addedTime)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => toggleCardExpansion(client.id)}
                variant="outline"
                size="sm"
              >
                {isExpanded ? (
                  <ChevronUpIcon className="w-4 h-4" />
                ) : (
                  <ChevronDownIcon className="w-4 h-4" />
                )}
              </Button>
              
              <Button
                onClick={() => setViewingClient(client)}
                variant="outline"
                size="sm"
              >
                <EyeIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="mt-6 border-t pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Personal Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Gender:</span> {client.gender}</div>
                    <div><span className="font-medium">Country:</span> {client.country}</div>
                    {client.idNumber && <div><span className="font-medium">ID Number:</span> {client.idNumber}</div>}
                    {client.passport && <div><span className="font-medium">Passport:</span> {client.passport}</div>}
                    <div><span className="font-medium">Marital Status:</span> {client.maritalStatus}</div>
                    <div><span className="font-medium">Employment:</span> {client.employmentStatus}</div>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Address</h4>
                  <div className="text-sm text-gray-600">
                    <div>{client.address1}</div>
                    {client.address2 && <div>{client.address2}</div>}
                    <div>{client.suburb}, {client.cityTown}</div>
                    <div>{client.province}, {client.postalCode}</div>
                  </div>
                </div>

                {/* Service Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Service Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Treatment Centre:</span> {client.myNearestTreatmentCentre}</div>
                    <div><span className="font-medium">How they heard about us:</span> {client.whereDidYouHearAboutLifeArrow}</div>
                    {client.referrerName && <div><span className="font-medium">Referrer:</span> {client.referrerName}</div>}
                  </div>
                </div>

                {/* Medical Info */}
                {(client.currentMedication || client.chronicConditions || client.currentTreatments) && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Medical Information</h4>
                  <div className="space-y-2 text-sm">
                    {client.currentMedication && <div><span className="font-medium">Current Medication:</span> {client.currentMedication}</div>}
                    {client.chronicConditions && <div><span className="font-medium">Chronic Conditions:</span> {client.chronicConditions}</div>}
                    {client.currentTreatments && <div><span className="font-medium">Current Treatments:</span> {client.currentTreatments}</div>}
                  </div>
                </div>
                )}
              </div>

              {/* Transformation Goal */}
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">Transformation Goal</h4>
                <p className="text-sm text-gray-600">{client.reasonForTransformation}</p>
              </div>

              {/* Actions */}
              <div className="mt-6 flex items-center space-x-3">
                <Select
                  value={client.status}
                  onChange={(value: string) => updateClientStatus(client.id, value as 'active' | 'inactive' | 'pending-verification' | 'suspended')}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'pending-verification', label: 'Pending Verification' },
                    { value: 'suspended', label: 'Suspended' }
                  ]}
                  disabled={isUpdating}
                />
                
                <Button variant="outline" size="sm" disabled={isUpdating}>
                  <PencilIcon className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                
                <Button variant="outline" size="sm" disabled={isUpdating}>
                  <CalendarDaysIcon className="w-4 h-4 mr-1" />
                  Book Appointment
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <LoadingSpinner />
            <p className="mt-4 text-gray-600">Loading clients...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center py-12">
          <Card className="max-w-md w-full">
            <div className="p-6 text-center">
              <ExclamationCircleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Clients</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={retryLoad} className="btn-primary">
                Try Again
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients Management</h1>
          <p className="text-gray-600">View and manage your client database</p>
        </div>
        <Button className="btn-primary">
          <UserPlusIcon className="w-5 h-5 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Search clients by name, email, phone, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<MagnifyingGlassIcon className="w-5 h-5" />}
              />
            </div>
            
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'pending-verification', label: 'Pending Verification' },
                { value: 'suspended', label: 'Suspended' }
              ]}
            />
            
            <Select
              value={centreFilter}
              onChange={setCentreFilter}
              options={[
                { value: 'all', label: 'All Centres' },
                ...uniqueCentres.map(centre => ({ value: centre, label: centre }))
              ]}
            />
            
            <Select
              value={`${sortBy}-${sortOrder}`}
              onChange={(value: string) => {
                const [sort, order] = value.split('-');
                setSortBy(sort as 'name' | 'date' | 'status' | 'centre');
                setSortOrder(order as 'asc' | 'desc');
              }}
              options={[
                { value: 'date-desc', label: 'Newest First' },
                { value: 'date-asc', label: 'Oldest First' },
                { value: 'name-asc', label: 'Name A-Z' },
                { value: 'name-desc', label: 'Name Z-A' },
                { value: 'status-asc', label: 'Status A-Z' }
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Results Summary */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">
          Showing {filteredClients.length} of {clients.length} clients
        </p>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>Status Distribution:</span>
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
            Active: {clients.filter(c => c.status === 'active').length}
          </span>
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
            Pending: {clients.filter(c => c.status === 'pending-verification').length}
          </span>
        </div>
      </div>

      {/* Clients List */}
      <div className="space-y-4">
        {filteredClients.map((client) => (
          <ClientCard key={client.id} client={client} />
        ))}
        
        {filteredClients.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <UserIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
              <p className="text-gray-600">
                {searchTerm ? 'Try adjusting your search criteria.' : 'No clients match the current filters.'}
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Client Detail Modal */}
      {viewingClient && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-50" onClick={() => setViewingClient(null)}></div>
            
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {viewingClient.firstName} {viewingClient.lastName}
                    </h2>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(viewingClient.status)}`}>
                      {getStatusIcon(viewingClient.status)}
                      <span className="ml-2 capitalize">{viewingClient.status.replace('-', ' ')}</span>
                    </span>
                  </div>
                  <Button variant="outline" onClick={() => setViewingClient(null)}>
                    Close
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                        <span>{viewingClient.email}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <PhoneIcon className="w-5 h-5 text-gray-400" />
                        <span>{viewingClient.mobile}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <MapPinIcon className="w-5 h-5 text-gray-400" />
                        <span>{viewingClient.address1}, {viewingClient.cityTown}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Transformation Goal</h3>
                    <p className="text-gray-600">{viewingClient.reasonForTransformation}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 