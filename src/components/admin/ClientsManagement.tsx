import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
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
  ExclamationCircleIcon,
  XMarkIcon,
  CheckIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  DocumentArrowUpIcon,
  LinkIcon
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
  FirestoreError,
  addDoc,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';
import { TextArea } from '../ui/TextArea';
import LoadingSpinner from '../ui/LoadingSpinner';
import ClientAppointmentManagement from './ClientAppointmentManagement';
import { Modal } from '../ui/Modal';
import type { TreatmentCentre, ClientRegistrationData } from '../../types';

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
  photoUrl?: string;
  
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
  reasonForTransformation?: string;
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

interface ImportResults {
  successful: number;
  failed: number;
  errors: string[];
}

interface Centre {
  id: string;
  name: string;
  address: {
    country: string;
  };
}

export function ClientsManagement() {
  const navigate = useNavigate();
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
  
  // Add client form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Import functionality state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<Array<Record<string, unknown>>>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    successful: number;
    failed: number;
    errors: string[];
  } | null>(null);

  // Form data state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    gender: '',
    idNumber: '',
    passport: '',
    country: 'South Africa',
    address1: '',
    address2: '',
    suburb: '',
    cityTown: '',
    province: '',
    postalCode: '',
    preferredMethodOfContact: 'Email',
    maritalStatus: '',
    employmentStatus: '',
    currentMedication: '',
    chronicConditions: '',
    currentTreatments: '',
    reasonForTransformation: '',
    whereDidYouHearAboutLifeArrow: '',
    myNearestTreatmentCentre: '',
    referrerName: '',
    status: 'active' as 'active' | 'inactive' | 'pending-verification' | 'suspended'
  });

  // Delete functionality state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingClient, setDeletingClient] = useState<ClientInfo | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Treatment Centre Lookup state
  const [showCentresLookup, setShowCentresLookup] = useState(false);
  const [centres, setCentres] = useState<TreatmentCentre[]>([]);
  const [centresLoading, setCentresLoading] = useState(false);
  const [centresError, setCentresError] = useState<string | null>(null);

  // Client appointment management state
  const [showClientAppointments, setShowClientAppointments] = useState(false);
  const [selectedClientForAppointments, setSelectedClientForAppointments] = useState<ClientInfo | null>(null);

  // Remove unused photo state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  // Reset form data
  const resetFormData = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      mobile: '',
      gender: '',
      idNumber: '',
      passport: '',
      country: 'South Africa',
      address1: '',
      address2: '',
      suburb: '',
      cityTown: '',
      province: '',
      postalCode: '',
      preferredMethodOfContact: 'Email',
      maritalStatus: '',
      employmentStatus: '',
      currentMedication: '',
      chronicConditions: '',
      currentTreatments: '',
      reasonForTransformation: '',
      whereDidYouHearAboutLifeArrow: '',
      myNearestTreatmentCentre: '',
      referrerName: '',
      status: 'active'
    });
  };

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const baseClientData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        mobile: formData.mobile.trim(),
        gender: formData.gender,
        idNumber: formData.idNumber.trim() || null,
        passport: formData.passport.trim() || null,
        country: formData.country,
        address1: formData.address1.trim(),
        address2: formData.address2.trim() || null,
        suburb: formData.suburb.trim(),
        cityTown: formData.cityTown.trim(),
        province: formData.province,
        postalCode: formData.postalCode.trim(),
        preferredMethodOfContact: formData.preferredMethodOfContact,
        maritalStatus: formData.maritalStatus,
        employmentStatus: formData.employmentStatus,
        currentMedication: formData.currentMedication.trim() || null,
        chronicConditions: formData.chronicConditions.trim() || null,
        currentTreatments: formData.currentTreatments.trim() || null,
        reasonForTransformation: formData.reasonForTransformation.trim(),
        whereDidYouHearAboutLifeArrow: formData.whereDidYouHearAboutLifeArrow,
        myNearestTreatmentCentre: formData.myNearestTreatmentCentre,
        referrerName: formData.referrerName.trim() || null,
        status: formData.status,
        lastActivity: serverTimestamp()
      };

      if (editingClient) {
        // For editing, only update the fields and add lastUpdated timestamp
        await updateDoc(doc(db, 'clients', editingClient.id), {
          ...baseClientData,
          lastUpdated: serverTimestamp()
        });
      } else {
        // For new clients, add the creation timestamps
        const newClientData = {
          ...baseClientData,
          addedTime: serverTimestamp(),
          registrationDate: serverTimestamp()
        };
        await addDoc(collection(db, 'clients'), newClientData);
      }

      resetFormData();
      setShowAddForm(false);
      setEditingClient(null);
    } catch (error) {
      console.error('Error saving client:', error);
      setError('Failed to save client. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit
  const handleEdit = (client: ClientInfo) => {
    setEditingClient(client);
    setFormData({
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      mobile: client.mobile,
      gender: client.gender,
      idNumber: client.idNumber || '',
      passport: client.passport || '',
      country: client.country,
      address1: client.address1,
      address2: client.address2 || '',
      suburb: client.suburb,
      cityTown: client.cityTown,
      province: client.province,
      postalCode: client.postalCode,
      preferredMethodOfContact: client.preferredMethodOfContact,
      maritalStatus: client.maritalStatus,
      employmentStatus: client.employmentStatus,
      currentMedication: client.currentMedication || '',
      chronicConditions: client.chronicConditions || '',
      currentTreatments: client.currentTreatments || '',
      reasonForTransformation: client.reasonForTransformation,
      whereDidYouHearAboutLifeArrow: client.whereDidYouHearAboutLifeArrow,
      myNearestTreatmentCentre: client.myNearestTreatmentCentre,
      referrerName: client.referrerName || '',
      status: client.status
    });
    setShowAddForm(true);
  };

  // Handle delete
  const handleDelete = (client: ClientInfo) => {
    setDeletingClient(client);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingClient) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'clients', deletingClient.id));
      setShowDeleteModal(false);
      setDeletingClient(null);
    } catch (error) {
      console.error('Error deleting client:', error);
      setError('Failed to delete client. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeletingClient(null);
  };

  // Import functionality
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setImportFile(file);
      parseCSV(file);
    } else {
      setError('Please select a valid CSV file.');
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const data = lines.slice(1).filter(line => line.trim()).map((line, index) => {
        const values = line.split(',').map(v => v.trim());
        const row: any = { _rowIndex: index + 2 };
        headers.forEach((header, i) => {
          row[header] = values[i] || '';
        });
        return row;
      });
      
      setImportPreview(data.slice(0, 10));
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importFile) return;
    
    setImporting(true);
    setImportProgress(0);
    setImportResults(null);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const data = lines.slice(1).filter(line => line.trim()).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, i) => {
          row[header] = values[i] || '';
        });
        return row;
      });

      let successful = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 0; i < data.length; i++) {
        try {
          const row = data[i];
          
          const clientData = {
            firstName: row['First Name'] || row['firstName'] || '',
            lastName: row['Last Name'] || row['lastName'] || '',
            email: (row['Email'] || row['email'] || '').toLowerCase(),
            mobile: row['Mobile'] || row['mobile'] || row['Phone'] || '',
            gender: row['Gender'] || row['gender'] || '',
            idNumber: row['ID Number'] || row['idNumber'] || null,
            passport: row['Passport'] || row['passport'] || null,
            country: row['Country'] || row['country'] || 'South Africa',
            address1: row['Address'] || row['address1'] || row['Address 1'] || '',
            address2: row['Address 2'] || row['address2'] || null,
            suburb: row['Suburb'] || row['suburb'] || '',
            cityTown: row['City'] || row['cityTown'] || row['City/Town'] || '',
            province: row['Province'] || row['province'] || '',
            postalCode: row['Postal Code'] || row['postalCode'] || '',
            preferredMethodOfContact: row['Preferred Contact'] || row['preferredMethodOfContact'] || 'Email',
            maritalStatus: row['Marital Status'] || row['maritalStatus'] || '',
            employmentStatus: row['Employment Status'] || row['employmentStatus'] || '',
            currentMedication: row['Current Medication'] || row['currentMedication'] || null,
            chronicConditions: row['Chronic Conditions'] || row['chronicConditions'] || null,
            currentTreatments: row['Current Treatments'] || row['currentTreatments'] || null,
            reasonForTransformation: row['Transformation Goal'] || row['reasonForTransformation'] || '',
            whereDidYouHearAboutLifeArrow: row['How Heard About Us'] || row['whereDidYouHearAboutLifeArrow'] || 'Other',
            myNearestTreatmentCentre: row['Treatment Centre'] || row['myNearestTreatmentCentre'] || '',
            referrerName: row['Referrer'] || row['referrerName'] || null,
            status: (row['Status'] || row['status'] || 'active') as 'active' | 'inactive' | 'pending-verification' | 'suspended',
            addedTime: serverTimestamp(),
            registrationDate: serverTimestamp(),
            lastActivity: serverTimestamp()
          };

          if (!clientData.firstName || !clientData.lastName || !clientData.email || !clientData.mobile) {
            throw new Error(`Row ${i + 2}: Missing required fields (First Name, Last Name, Email, Mobile)`);
          }

          await addDoc(collection(db, 'clients'), clientData);
          successful++;
        } catch (error) {
          failed++;
          errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        setImportProgress(Math.round(((i + 1) / data.length) * 100));
      }

      setImportResults({ successful, failed, errors });
    };
    
    reader.readAsText(importFile);
    setImporting(false);
  };

  const resetImport = () => {
    setImportFile(null);
    setImportPreview([]);
    setImportProgress(0);
    setImportResults(null);
    setShowImportModal(false);
  };

  const downloadTemplate = () => {
    const headers = [
      'First Name', 'Last Name', 'Email', 'Mobile', 'Gender', 'ID Number', 
      'Country', 'Address', 'Address 2', 'Suburb', 'City', 'Province', 'Postal Code',
      'Preferred Contact', 'Marital Status', 'Employment Status', 
      'Current Medication', 'Chronic Conditions', 'Current Treatments',
      'Transformation Goal', 'How Heard About Us', 'Treatment Centre', 'Referrer', 'Status'
    ];
    
    const csvContent = headers.join(',') + '\n' +
      'John,Doe,john.doe@example.com,+27821234567,Male,8001015009088,South Africa,123 Main Street,,Sandton,Johannesburg,Gauteng,2196,Email,Single,Employed,,,"Weight loss and fitness improvement","Social Media","Sandton Centre",,active';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'client_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Constants for form options
  const provinces = [
    'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 
    'Limpopo', 'Mpumalanga', 'North West', 'Free State', 'Northern Cape'
  ];

  const genders = ['Male', 'Female', 'Other', 'Prefer not to say'];
  
  const maritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed', 'Other'];
  
  const employmentStatuses = ['Employed', 'Self-employed', 'Unemployed', 'Student', 'Retired', 'Other'];
  
  const contactMethods = ['Email', 'Phone', 'SMS', 'WhatsApp'];
  
  const hearAboutOptions = [
    'Social Media', 'Google Search', 'Referral', 'Healthcare Provider',
    'Friend/Family', 'Advertisement', 'Other'
  ];

  const treatmentCentres = [
    'Sandton Centre', 'Rosebank Centre', 'Centurion Centre', 'Cape Town Centre',
    'Durban Centre', 'Port Elizabeth Centre', 'Bloemfontein Centre'
  ];

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
    setupRealtimeListener();
  };

  const handleBookAppointment = (client: ClientInfo) => {
    // Navigate to appointments page with the client pre-selected
    navigate('/appointments', { 
      state: { 
        preSelectedClientId: client.id,
        preSelectedClientName: `${client.firstName} ${client.lastName}`
      } 
    });
  };

  const handleViewAppointments = (client: ClientInfo) => {
    setSelectedClientForAppointments(client);
    setShowClientAppointments(true);
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
              <div className="w-12 h-12 rounded-full overflow-hidden">
                {client.photoUrl ? (
                  <img
                    src={client.photoUrl}
                    alt={`${client.firstName} ${client.lastName}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary-100 flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-primary-600" />
                  </div>
                )}
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
                
                <Button variant="outline" size="sm" disabled={isUpdating} onClick={() => handleEdit(client)}>
                  <PencilIcon className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={isUpdating}
                  onClick={() => handleViewAppointments(client)}
                >
                  <CalendarDaysIcon className="w-4 h-4 mr-1" />
                  View Appointments
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={isUpdating} 
                  onClick={() => handleDelete(client)}
                  className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                >
                  <TrashIcon className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  };

  // Treatment Centre Lookup Functions
  const loadCentres = async () => {
    setCentresLoading(true);
    setCentresError(null);
    try {
      const centresQuery = query(
        collection(db, 'centres'),
        orderBy('name', 'asc')
      );
      const snapshot = await getDocs(centresQuery);
      const centresData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCentres(centresData);
    } catch (error) {
      console.error('Error loading centres:', error);
      setCentresError('Failed to load treatment centres');
    } finally {
      setCentresLoading(false);
    }
  };

  const handleCentreSelect = (centreName: string) => {
    setFormData(prev => ({ ...prev, myNearestTreatmentCentre: centreName }));
    setShowCentresLookup(false);
  };

  // Photo upload functions
  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Photo size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setShowCamera(true);
      // Store the stream for the camera modal
      (window as any).cameraStream = stream;
    } catch (error) {
      console.error('Camera access denied:', error);
      setError('Camera access denied. Please use file upload instead.');
    }
  };

  const capturePhoto = () => {
    const video = document.getElementById('camera-video-client') as HTMLVideoElement;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (video && context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
          setPhotoFile(file);
          
          const reader = new FileReader();
          reader.onload = (e) => {
            setPhotoPreview(e.target?.result as string);
          };
          reader.readAsDataURL(file);
          
          closeCameraModal();
        }
      }, 'image/jpeg', 0.8);
    }
  };

  const closeCameraModal = () => {
    const stream = (window as any).cameraStream;
    if (stream) {
      stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      delete (window as any).cameraStream;
    }
    setShowCamera(false);
  };

  const uploadPhoto = async (file: File, clientId: string): Promise<string> => {
    const photoRef = ref(storage, `clients/${clientId}/photo_${Date.now()}`);
    await uploadBytes(photoRef, file);
    return await getDownloadURL(photoRef);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
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
        <div className="flex space-x-3">
          <Button 
            onClick={() => setShowImportModal(true)}
            variant="outline"
            className="border-primary-600 text-primary-600 hover:bg-primary-50"
          >
            <DocumentArrowUpIcon className="w-5 h-5 mr-2" />
            Import Clients
          </Button>
          <Button 
            onClick={() => {
              setEditingClient(null);
              resetFormData();
              setShowAddForm(true);
            }}
            className="btn-primary"
          >
            <UserPlusIcon className="w-5 h-5 mr-2" />
            Add Client
          </Button>
        </div>
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
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden">
                      {viewingClient.photoUrl ? (
                        <img
                          src={viewingClient.photoUrl}
                          alt={`${viewingClient.firstName} ${viewingClient.lastName}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-primary-100 flex items-center justify-center">
                          <UserIcon className="w-8 h-8 text-primary-600" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {viewingClient.firstName} {viewingClient.lastName}
                      </h2>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(viewingClient.status)}`}>
                        {getStatusIcon(viewingClient.status)}
                        <span className="ml-2 capitalize">{viewingClient.status.replace('-', ' ')}</span>
                      </span>
                    </div>
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

      {/* Add/Edit Client Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingClient ? 'Edit Client' : 'Add New Client'}
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingClient(null);
                    resetFormData();
                  }}
                >
                  <XMarkIcon className="w-6 h-6" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      required
                    />
                    <Input
                      label="Last Name"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      required
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                    />
                    <Input
                      label="Mobile Phone"
                      value={formData.mobile}
                      onChange={(e) => handleInputChange('mobile', e.target.value)}
                      required
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => handleInputChange('gender', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        required
                      >
                        <option value="">Select Gender</option>
                        {genders.map(gender => (
                          <option key={gender} value={gender}>{gender}</option>
                        ))}
                      </select>
                    </div>
                    <Input
                      label="ID Number"
                      value={formData.idNumber}
                      onChange={(e) => handleInputChange('idNumber', e.target.value)}
                      placeholder="South African ID number"
                    />
                  </div>
                </div>

                {/* Address Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Address Line 1"
                      value={formData.address1}
                      onChange={(e) => handleInputChange('address1', e.target.value)}
                      required
                    />
                    <Input
                      label="Address Line 2 (Optional)"
                      value={formData.address2}
                      onChange={(e) => handleInputChange('address2', e.target.value)}
                    />
                    <Input
                      label="Suburb"
                      value={formData.suburb}
                      onChange={(e) => handleInputChange('suburb', e.target.value)}
                      required
                    />
                    <Input
                      label="City/Town"
                      value={formData.cityTown}
                      onChange={(e) => handleInputChange('cityTown', e.target.value)}
                      required
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Province</label>
                      <select
                        value={formData.province}
                        onChange={(e) => handleInputChange('province', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        required
                      >
                        <option value="">Select Province</option>
                        {provinces.map(province => (
                          <option key={province} value={province}>{province}</option>
                        ))}
                      </select>
                    </div>
                    <Input
                      label="Postal Code"
                      value={formData.postalCode}
                      onChange={(e) => handleInputChange('postalCode', e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Contact & Personal Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contact & Personal Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Contact Method</label>
                      <select
                        value={formData.preferredMethodOfContact}
                        onChange={(e) => handleInputChange('preferredMethodOfContact', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        required
                      >
                        {contactMethods.map(method => (
                          <option key={method} value={method}>{method}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Marital Status</label>
                      <select
                        value={formData.maritalStatus}
                        onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        required
                      >
                        <option value="">Select Marital Status</option>
                        {maritalStatuses.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Employment Status</label>
                      <select
                        value={formData.employmentStatus}
                        onChange={(e) => handleInputChange('employmentStatus', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        required
                      >
                        <option value="">Select Employment Status</option>
                        {employmentStatuses.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        required
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="pending-verification">Pending Verification</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Medical Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Medical Information (Optional)</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <TextArea
                      label="Current Medication"
                      value={formData.currentMedication}
                      onChange={(e) => handleInputChange('currentMedication', e.target.value)}
                      placeholder="List any current medications"
                      rows={2}
                    />
                    <TextArea
                      label="Chronic Conditions"
                      value={formData.chronicConditions}
                      onChange={(e) => handleInputChange('chronicConditions', e.target.value)}
                      placeholder="List any chronic conditions"
                      rows={2}
                    />
                    <TextArea
                      label="Current Treatments"
                      value={formData.currentTreatments}
                      onChange={(e) => handleInputChange('currentTreatments', e.target.value)}
                      placeholder="List any current treatments"
                      rows={2}
                    />
                  </div>
                </div>

                {/* Service Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Service Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">How did you hear about Life Arrow?</label>
                      <select
                        value={formData.whereDidYouHearAboutLifeArrow}
                        onChange={(e) => handleInputChange('whereDidYouHearAboutLifeArrow', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        required
                      >
                        <option value="">Select Option</option>
                        {hearAboutOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nearest Treatment Centre</label>
                      <div className="flex space-x-2">
                        <Input
                          value={formData.myNearestTreatmentCentre}
                          onChange={(e) => handleInputChange('myNearestTreatmentCentre', e.target.value)}
                          placeholder="Select or enter treatment centre"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowCentresLookup(true);
                            loadCentres();
                          }}
                          className="px-3"
                        >
                          <LinkIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <Input
                      label="Referrer Name (Optional)"
                      value={formData.referrerName}
                      onChange={(e) => handleInputChange('referrerName', e.target.value)}
                      placeholder="Name of person who referred you"
                    />
                  </div>
                  <TextArea
                    label="Reason for Transformation (Optional)"
                    value={formData.reasonForTransformation}
                    onChange={(e) => handleInputChange('reasonForTransformation', e.target.value)}
                    placeholder="Describe your transformation goals"
                    rows={3}
                    className="mt-4"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingClient(null);
                      resetFormData();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-primary-600 hover:bg-primary-700"
                  >
                    {submitting ? (
                      <>
                        <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                        {editingClient ? 'Updating...' : 'Adding...'}
                      </>
                    ) : (
                      <>
                        <CheckIcon className="w-4 h-4 mr-2" />
                        {editingClient ? 'Update Client' : 'Add Client'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Import Clients</h2>
                <Button variant="ghost" onClick={resetImport}>
                  <XMarkIcon className="w-6 h-6" />
                </Button>
              </div>

              {!importResults ? (
                <div className="space-y-6">
                  {/* Instructions */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium text-blue-900 mb-2">Import Instructions</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Upload a CSV file with client information</li>
                      <li>• Required fields: First Name, Last Name, Email, Mobile</li>
                      <li>• Download the template below for the correct format</li>
                      <li>• Duplicate emails will be skipped</li>
                    </ul>
                  </div>

                  {/* Download Template */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Need a template?</span>
                    <Button variant="outline" onClick={downloadTemplate}>
                      <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
                      Download Template
                    </Button>
                  </div>

                  {/* File Upload */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <div className="text-center">
                      <DocumentArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <div className="text-sm text-gray-600 mb-4">
                        <label htmlFor="csv-upload" className="cursor-pointer">
                          <span className="font-medium text-primary-600 hover:text-primary-500">
                            Click to upload
                          </span>
                          <span> or drag and drop</span>
                        </label>
                        <input
                          id="csv-upload"
                          type="file"
                          accept=".csv"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </div>
                      <p className="text-xs text-gray-500">CSV files only</p>
                    </div>
                  </div>

                  {/* File Preview */}
                  {importFile && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">
                          Preview: {importFile.name}
                        </h3>
                        <span className="text-sm text-gray-500">
                          Showing first {importPreview.length} rows
                        </span>
                      </div>
                      
                      {importPreview.length > 0 && (
                        <div className="border rounded-lg overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                {Object.keys(importPreview[0]).filter(key => key !== '_rowIndex').slice(0, 6).map(key => (
                                  <th key={key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                    {key}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {importPreview.slice(0, 5).map((row, index) => (
                                <tr key={index}>
                                  {Object.entries(row).filter(([key]) => key !== '_rowIndex').slice(0, 6).map(([key, value]) => (
                                    <td key={key} className="px-4 py-2 text-sm text-gray-900 truncate max-w-32">
                                      {String(value)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Import Progress */}
                  {importing && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Importing clients...</span>
                        <span className="text-sm text-gray-500">{importProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${importProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end space-x-3 pt-6 border-t">
                    <Button variant="outline" onClick={resetImport}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleImport}
                      disabled={!importFile || importing}
                      className="bg-primary-600 hover:bg-primary-700"
                    >
                      {importing ? (
                        <>
                          <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <DocumentArrowUpIcon className="w-4 h-4 mr-2" />
                          Import Clients
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                /* Import Results */
                <div className="space-y-6">
                  <div className="text-center">
                    <CheckCircleIcon className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Import Complete</h3>
                    <div className="space-y-2">
                      <p className="text-green-600">
                        ✓ {importResults.successful} clients imported successfully
                      </p>
                      {importResults.failed > 0 && (
                        <p className="text-red-600">
                          ✗ {importResults.failed} clients failed to import
                        </p>
                      )}
                    </div>
                  </div>

                  {importResults.errors.length > 0 && (
                    <div className="max-h-60 overflow-y-auto">
                      <h4 className="font-medium text-gray-900 mb-2">Import Errors:</h4>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <ul className="text-sm text-red-800 space-y-1">
                          {importResults.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-6 border-t">
                    <Button onClick={resetImport} className="bg-primary-600 hover:bg-primary-700">
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-500 mr-3" />
                <h2 className="text-lg font-bold text-gray-900">Delete Client</h2>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <strong>{deletingClient.firstName} {deletingClient.lastName}</strong>? 
                This action cannot be undone and will permanently remove all client data, including:
              </p>
              
              <ul className="text-sm text-gray-600 mb-6 space-y-1">
                <li>• Personal and contact information</li>
                <li>• Medical history and conditions</li>
                <li>• Appointment history</li>
                <li>• Service records</li>
              </ul>
              
              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline" 
                  onClick={cancelDelete}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleting ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <TrashIcon className="w-4 h-4 mr-2" />
                      Delete Client
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Treatment Centres Lookup Modal */}
      {showCentresLookup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Select Treatment Centre</h2>
                <Button variant="ghost" onClick={() => setShowCentresLookup(false)}>
                  <XMarkIcon className="w-6 h-6" />
                </Button>
              </div>

              {centresLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : centresError ? (
                <div className="text-center py-12">
                  <ExclamationCircleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Centres</h3>
                  <p className="text-gray-600 mb-4">{centresError}</p>
                  <Button onClick={loadCentres} variant="outline">
                    <ArrowPathIcon className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              ) : centres.length === 0 ? (
                <div className="text-center py-12">
                  <MapPinIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Treatment Centres Found</h3>
                  <p className="text-gray-600">No treatment centres are currently available.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {centres.map((centre) => (
                    <div
                      key={centre.id}
                      onClick={() => handleCentreSelect(centre.name)}
                      className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 hover:border-primary-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-medium text-gray-900">{centre.name}</h3>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          centre.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {centre.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <MapPinIcon className="w-4 h-4 mr-2" />
                          <span>{centre.address?.street || centre.address?.suburb || 'Address not available'}, {centre.address?.city}</span>
                        </div>
                        <div className="flex items-center">
                          <PhoneIcon className="w-4 h-4 mr-2" />
                          <span>{centre.contactInfo?.phone || 'Phone not available'}</span>
                        </div>
                        {centre.contactInfo?.managerName && (
                          <div className="flex items-center">
                            <UserIcon className="w-4 h-4 mr-2" />
                            <span>Manager: {centre.contactInfo.managerName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Client Appointments Modal */}
      {showClientAppointments && selectedClientForAppointments && (
        <Modal
          isOpen={showClientAppointments}
          onClose={() => {
            setShowClientAppointments(false);
            setSelectedClientForAppointments(null);
          }}
          title={`Appointments for ${selectedClientForAppointments.firstName} ${selectedClientForAppointments.lastName}`}
          size="xl"
        >
          <ClientAppointmentManagement
            clientId={selectedClientForAppointments.id}
            clientName={`${selectedClientForAppointments.firstName} ${selectedClientForAppointments.lastName}`}
            onClose={() => {
              setShowClientAppointments(false);
              setSelectedClientForAppointments(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
} 