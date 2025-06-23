import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useLocationDetection } from '../../hooks/useLocationDetection';
import type { TreatmentCentre, ServiceManagement, TimeSlot, BookingData, Appointment, StaffMember } from '../../types';

// Import components
import BookingProgress from './BookingProgress';
import ClientSelection from './ClientSelection';
import CentreSelection from './CentreSelection';
import ServiceSelection from './ServiceSelection';
import StaffSelection from './StaffSelection';
import TimeSlotSelection from './TimeSlotSelection';
import BookingConfirmation from './BookingConfirmation';
import MyAppointments from './MyAppointments';
import LoadingSpinner from '../ui/LoadingSpinner';

interface ClientAppointmentInterfaceProps {
  isAdminMode?: boolean;
  preSelectedClientId?: string; // For booking from client management
  preSelectedClientName?: string; // Display name for pre-selected client
}

interface SelectedClient {
  id: string;
  name: string;
  email: string;
  phone: string;
}

const ClientAppointmentInterface = ({ isAdminMode = false, preSelectedClientId, preSelectedClientName }: ClientAppointmentInterfaceProps) => {
  const { profile } = useUserProfile();
  const { location } = useLocationDetection();
  const [bookingStep, setBookingStep] = useState(isAdminMode && !preSelectedClientId ? 0 : 1); // Start at 0 for client selection in admin mode
  const [bookingData, setBookingData] = useState<Partial<BookingData>>({});
  const [selectedClient, setSelectedClient] = useState<SelectedClient | null>(null);

  // Handle pre-selected client from navigation
  useEffect(() => {
    if (preSelectedClientId && preSelectedClientName) {
      const preSelected: SelectedClient = {
        id: preSelectedClientId,
        name: preSelectedClientName,
        email: '', // Will be filled when needed
        phone: ''  // Will be filled when needed
      };
      setSelectedClient(preSelected);
      setBookingStep(1); // Skip client selection step
    }
  }, [preSelectedClientId, preSelectedClientName]);

  // Fetch user's existing appointments (or all appointments for admin)
  const { data: userAppointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['user-appointments', profile?.id, isAdminMode, selectedClient?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const appointmentsRef = collection(db, 'appointments');
      let q;
      
      if (isAdminMode) {
        if (selectedClient) {
          // Show appointments for selected client
          q = query(
            appointmentsRef,
            where('clientId', '==', selectedClient.id),
            orderBy('startTime', 'desc')
          );
        } else {
          // Show all appointments
          q = query(appointmentsRef, orderBy('startTime', 'desc'));
        }
      } else {
        // Clients see only their appointments
        q = query(
          appointmentsRef,
          where('clientId', '==', profile.id),
          orderBy('startTime', 'desc')
        );
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime?.toDate(),
        endTime: doc.data().endTime?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Appointment[];
    },
    enabled: !!profile?.id
  });

  const handleClientSelect = (client: SelectedClient) => {
    setSelectedClient(client);
    setBookingStep(1);
  };

  const handleCentreSelect = (centre: TreatmentCentre) => {
    setBookingData(prev => ({ ...prev, centre }));
    setBookingStep(2);
  };

  const handleServiceSelect = (service: ServiceManagement) => {
    setBookingData(prev => ({ ...prev, service }));
    // We'll check for auto-staff selection in the next step
    setBookingStep(3);
  };

  const handleStaffSelect = (staff: StaffMember) => {
    setBookingData(prev => ({ ...prev, staff }));
    setBookingStep(4);
  };

  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    // Include client information for admin bookings
    const updatedBookingData = { 
      ...bookingData, 
      timeSlot,
      // Add client information for admin bookings
      ...(isAdminMode && selectedClient && {
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        clientEmail: selectedClient.email
      })
    };
    
    setBookingData(updatedBookingData);
    setBookingStep(5);
  };

  const handleBookingComplete = () => {
    // Reset booking flow
    setBookingData({});
    setSelectedClient(null);
    setBookingStep(isAdminMode && !preSelectedClientId ? 0 : 1);
  };

  const handleBackStep = () => {
    if (bookingStep > (isAdminMode && !preSelectedClientId ? 0 : 1)) {
      setBookingStep(bookingStep - 1);
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center bg-white p-8 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600">
            Please log in to access the appointment system.
          </p>
        </div>
      </div>
    );
  }

  const pageTitle = isAdminMode ? 'Appointment Management' : 'Book Your Appointment';
  const pageSubtitle = isAdminMode 
    ? 'Manage appointments for all clients and centres' 
    : 'Choose your preferred treatment centre, service, and time';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {pageTitle}
              </h1>
              <p className="mt-2 text-gray-600">
                {pageSubtitle}
              </p>
              {selectedClient && isAdminMode && (
                <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                  <span className="mr-2">📋</span>
                  Booking for: <span className="font-semibold ml-1">{selectedClient.name}</span>
                </div>
              )}
            </div>
            {isAdminMode && (
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Admin Mode
                </span>
                <span className="text-sm text-gray-500">
                  {profile.firstName} {profile.lastName}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Wizard - Takes up 2/3 of the space */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {isAdminMode ? 'Create New Appointment' : 'Book New Appointment'}
                </h2>
                <BookingProgress 
                  currentStep={bookingStep} 
                  isAdminMode={isAdminMode}
                  hasPreSelectedClient={!!preSelectedClientId}
                />
              </div>
              
              <div className="p-6">
                {bookingStep === 0 && (
                  <ClientSelection 
                    onNext={handleClientSelect}
                  />
                )}
                
                {bookingStep === 1 && (
                  <CentreSelection 
                    userLocation={location}
                    onNext={handleCentreSelect}
                  />
                )}
                
                {bookingStep === 2 && bookingData.centre && (
                  <ServiceSelection 
                    centre={bookingData.centre}
                    onNext={handleServiceSelect}
                    onBack={handleBackStep}
                  />
                )}
                
                {bookingStep === 3 && bookingData.centre && bookingData.service && (
                  <StaffSelection 
                    centre={bookingData.centre}
                    service={bookingData.service}
                    onNext={handleStaffSelect}
                    onBack={handleBackStep}
                  />
                )}
                
                {bookingStep === 4 && bookingData.centre && bookingData.service && bookingData.staff && (
                  <TimeSlotSelection 
                    centre={bookingData.centre}
                    service={bookingData.service}
                    staff={bookingData.staff}
                    onNext={handleTimeSlotSelect}
                    onBack={handleBackStep}
                  />
                )}
                
                {bookingStep === 5 && bookingData.centre && bookingData.service && bookingData.staff && bookingData.timeSlot && (
                  <BookingConfirmation 
                    bookingData={bookingData as BookingData}
                    onComplete={handleBookingComplete}
                    onBack={handleBackStep}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Appointments List - Takes up 1/3 of the space */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-fit">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
                <h2 className="text-lg font-semibold text-gray-900">
                  {isAdminMode ? 'All Appointments' : 'My Appointments'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {isAdminMode ? 'Recent appointments across all centres' : 'Your upcoming and past appointments'}
                </p>
              </div>
              
              <div className="p-6">
                {appointmentsLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <MyAppointments appointments={userAppointments || []} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientAppointmentInterface; 