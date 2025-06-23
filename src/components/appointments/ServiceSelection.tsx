import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  ClockIcon, 
  CurrencyDollarIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { formatPrice } from '../../lib/utils';
import type { ServiceManagement, TreatmentCentre } from '../../types';

interface ServiceSelectionProps {
  centre: TreatmentCentre;
  onNext: (service: ServiceManagement) => void;
  onBack: () => void;
}

const ServiceSelection = ({ centre, onNext, onBack }: ServiceSelectionProps) => {
  const [selectedService, setSelectedService] = useState<ServiceManagement | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Fetch available services for the selected centre
  const { data: services, isLoading } = useQuery({
    queryKey: ['centre-services', centre.id],
    queryFn: async () => {
      const servicesRef = collection(db, 'services');
      const q = query(
        servicesRef, 
        where('isActive', '==', true),
        where('availableAtCentres', 'array-contains', centre.id)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as ServiceManagement[];
    }
  });

  const categories = [
    { value: 'all', label: 'All Services' },
    { value: 'scanning', label: 'Scanning' },
    { value: 'consultation', label: 'Consultation' },
    { value: 'treatment', label: 'Treatment' },
    { value: 'assessment', label: 'Assessment' },
    { value: 'follow-up', label: 'Follow-up' }
  ];

  const filteredServices = services?.filter(service => 
    filterCategory === 'all' || service.category === filterCategory
  );

  const handleServiceSelect = (service: ServiceManagement) => {
    setSelectedService(service);
  };

  const handleNext = () => {
    if (selectedService) {
      onNext(selectedService);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!services?.length) {
    return (
      <div className="text-center py-12">
        <InformationCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Services Available</h3>
        <p className="text-gray-600 mb-4">
          This centre currently has no services available for booking.
        </p>
        <Button onClick={onBack} variant="outline">
          Choose Different Centre
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Select Service
        </h2>
        <p className="text-gray-600">
          Choose the service you'd like to book at {centre.name}.
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category.value}
            onClick={() => setFilterCategory(category.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filterCategory === category.value
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Services Grid */}
      <div className="grid gap-4">
        {filteredServices?.map((service) => (
          <div
            key={service.id}
            onClick={() => handleServiceSelect(service)}
            className={`p-6 border rounded-lg cursor-pointer transition-all ${
              selectedService?.id === service.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {service.name}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(service.category)}`}>
                    {service.category}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-3">
                  {service.description}
                </p>
              </div>
              
              <div className="text-right ml-4">
                <div className="flex items-center space-x-1 text-lg font-semibold text-gray-900">
                  <CurrencyDollarIcon className="w-5 h-5" />
                  <span>{formatPrice(service.price, centre.address.country)}</span>
                </div>
                <div className="flex items-center space-x-1 text-sm text-gray-500 mt-1">
                  <ClockIcon className="w-4 h-4" />
                  <span>{service.duration} min</span>
                </div>
              </div>
            </div>

            {/* Service Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {/* Equipment Required */}
              {service.equipmentRequired?.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Equipment Used:</h4>
                  <ul className="text-gray-600 space-y-1">
                    {service.equipmentRequired.map((equipment, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-500" />
                        <span>{equipment}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Qualifications Required */}
              {service.requiredQualifications?.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Specialist Required:</h4>
                  <ul className="text-gray-600 space-y-1">
                    {service.requiredQualifications.map((qualification, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <CheckCircleIcon className="w-4 h-4 text-blue-500" />
                        <span>{qualification}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Preparation Instructions */}
            {service.preparationInstructions && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-1">Preparation Required:</h4>
                <p className="text-yellow-700 text-sm">{service.preparationInstructions}</p>
              </div>
            )}

            {/* Booking Settings */}
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
              <span>Book up to {service.bookingSettings?.advanceBookingDays || 30} days ahead</span>
              <span>Cancel {service.bookingSettings?.cancellationHours || 24}h before</span>
              {service.bookingSettings?.requiresApproval && (
                <span className="text-orange-600">Requires approval</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button onClick={onBack} variant="outline">
          Back to Centres
        </Button>
        <Button
          onClick={handleNext}
          disabled={!selectedService}
          size="lg"
        >
          Continue to Time Slots
        </Button>
      </div>
    </div>
  );
};

// Helper function to get category color
const getCategoryColor = (category: string): string => {
  const colors = {
    scanning: 'bg-blue-100 text-blue-700',
    consultation: 'bg-green-100 text-green-700',
    treatment: 'bg-purple-100 text-purple-700',
    assessment: 'bg-orange-100 text-orange-700',
    'follow-up': 'bg-gray-100 text-gray-700'
  };
  return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-700';
};

export default ServiceSelection; 