import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  MapPinIcon, 
  ClockIcon, 
  StarIcon,
  PhoneIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';
import type { TreatmentCentre, Location } from '../../types';
import { logger } from '../../lib/logger';

interface CentreSelectionProps {
  userLocation: Location | null;
  onNext: (centre: TreatmentCentre) => void;
}

const CentreSelection = ({ userLocation, onNext }: CentreSelectionProps) => {
  const [selectedCentre, setSelectedCentre] = useState<TreatmentCentre | null>(null);

  // Log component mount
  useEffect(() => {
    logger.componentMount('CentreSelection', { userLocation });
    logger.bookingEvent('Centre selection step started', { userLocation });
    
    return () => {
      logger.componentUnmount('CentreSelection');
    };
  }, [userLocation]);

  // Fetch available treatment centres using your existing data structure
  const { data: centres, isLoading, error } = useQuery({
    queryKey: ['treatment-centres'],
    queryFn: async () => {
      logger.databaseQuery('centres', 'fetch all active centres');
      
      try {
        const centresRef = collection(db, 'centres');
        const q = query(centresRef, where('isActive', '==', true));
        const snapshot = await getDocs(q);
        
        const centresData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        })) as TreatmentCentre[];

        logger.info('database', `All centres fetched: ${centresData.length}`, { centresData }, 'CentreSelection');
        logger.debug('database', 'Centres data structure', { 
          centres: centresData.map(c => ({ 
            name: c.name, 
            services: c.services?.length || 0,
            servicesData: c.services,
            isActive: c.isActive
          }))
        }, 'CentreSelection');

        // Filter centres that have services available
        const centresWithServices = centresData.filter(centre => 
          centre.services && centre.services.length > 0
        );

        logger.info('booking', `Centres with services: ${centresWithServices.length}`, {
          totalCentres: centresData.length,
          centresWithServices: centresWithServices.length,
          centresDetails: centresWithServices.map(c => ({
            name: c.name,
            serviceCount: c.services?.length || 0,
            services: c.services
          }))
        }, 'CentreSelection');

        if (centresWithServices.length === 0) {
          logger.warn('booking', 'No centres with services found', {
            totalCentres: centresData.length,
            centresDetails: centresData.map(c => ({
              name: c.name,
              hasServices: !!c.services,
              serviceCount: c.services?.length || 0,
              servicesField: c.services
            }))
          }, 'CentreSelection');
        }

        // Sort by distance if user location is available
        if (userLocation) {
          return centresWithServices
            .map(centre => ({
              ...centre,
              distance: calculateDistance(
                userLocation.coordinates,
                centre.address.coordinates
              )
            }))
            .sort((a, b) => (a.distance || 0) - (b.distance || 0));
        }

        return centresWithServices;
      } catch (error) {
        logger.databaseError('centres', 'fetch centres', error as Error);
        throw error;
      }
    }
  });

  // Log query state changes
  useEffect(() => {
    if (isLoading) {
      logger.debug('component', 'Loading centres...', undefined, 'CentreSelection');
    } else if (error) {
      logger.componentError('CentreSelection', error as Error);
    } else if (centres) {
      logger.info('component', `Centres loaded successfully: ${centres.length} centres`, {
        centreCount: centres.length,
        centres: centres.map(c => ({ name: c.name, id: c.id }))
      }, 'CentreSelection');
    }
  }, [isLoading, error, centres]);

  const handleCentreSelect = (centre: TreatmentCentre) => {
    setSelectedCentre(centre);
    logger.bookingEvent('Centre selected', {
      centreId: centre.id,
      centreName: centre.name,
      serviceCount: centre.services?.length || 0
    });
  };

  const handleNext = () => {
    if (selectedCentre) {
      logger.bookingEvent('Proceeding to service selection', {
        selectedCentre: {
          id: selectedCentre.id,
          name: selectedCentre.name,
          serviceCount: selectedCentre.services?.length || 0
        }
      });
      onNext(selectedCentre);
    } else {
      logger.warn('booking', 'Attempted to proceed without selecting centre', undefined, 'CentreSelection');
    }
  };

  // Calculate distance (simplified)
  const calculateDistance = (centre: TreatmentCentre) => {
    if (!userLocation || !centre.location) return null;
    
    const R = 6371; // Earth's radius in km
    const dLat = (centre.location.latitude - userLocation.coordinates.lat) * Math.PI / 180;
    const dLon = (centre.location.longitude - userLocation.coordinates.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(userLocation.coordinates.lat * Math.PI / 180) * Math.cos(centre.location.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return Math.round(distance * 10) / 10;
  };

  logger.debug('component', 'CentreSelection render state', {
    isLoading,
    hasError: !!error,
    centreCount: centres?.length || 0,
    selectedCentre: selectedCentre?.name || null
  }, 'CentreSelection');

  if (isLoading) {
    logger.debug('component', 'Showing loading spinner', undefined, 'CentreSelection');
    return (
      <Card className="p-6">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Finding available centres...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    logger.error('component', 'Showing error state', { error }, 'CentreSelection');
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <p>Error loading centres. Please try again.</p>
        </div>
      </Card>
    );
  }

  if (!centres || centres.length === 0) {
    logger.warn('component', 'Showing no centres available state', {
      centresData: centres,
      isUndefined: centres === undefined,
      isNull: centres === null,
      isEmpty: centres?.length === 0
    }, 'CentreSelection');
    
    return (
      <Card className="p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Centres Available</h3>
          <p className="text-gray-600 mb-4">
            No treatment centres with available services found in your area.
          </p>
          <p className="text-sm text-gray-500">
            Please contact support or try again later.
          </p>
        </div>
      </Card>
    );
  }

  logger.info('component', 'Rendering centre selection options', {
    centreCount: centres.length,
    userHasLocation: !!userLocation
  }, 'CentreSelection');

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Treatment Centre</h2>
        <p className="text-gray-600">
          Choose your preferred location for treatment
          {userLocation?.city && ` near ${userLocation.city}`}
        </p>
      </div>

      <div className="grid gap-4">
        {centres.map((centre) => {
          const distance = calculateDistance(centre);
          const isSelected = selectedCentre?.id === centre.id;
          
          return (
            <Card
              key={centre.id}
              className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => handleCentreSelect(centre)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {centre.name}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>{centre.address.street}, {centre.address.city}, {centre.address.province}</p>
                    
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        {centre.services?.length || 0} services available
                      </span>
                      
                      {distance && (
                        <span className="text-blue-600">
                          {distance} km away
                        </span>
                      )}
                    </div>

                    {centre.operatingHours && (
                      <p className="text-xs text-gray-500">
                        Hours: {centre.operatingHours.monday?.open} - {centre.operatingHours.monday?.close}
                      </p>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <div className="ml-4">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {selectedCentre && (
        <div className="pt-6 border-t">
          <Button 
            onClick={handleNext}
            className="w-full"
            size="lg"
          >
            Continue to Service Selection
          </Button>
        </div>
      )}
    </div>
  );
};

// Helper function to format operating hours
const formatOperatingHours = (centre: TreatmentCentre): string => {
  if (!centre.operatingHours) return 'Hours available';
  
  const days = Object.entries(centre.operatingHours);
  const openDays = days.filter(([, hours]) => hours.isOpen);
  
  if (openDays.length === 0) return 'Closed';
  if (openDays.length === 7) return 'Open daily';
  return `${openDays.length} days/week`;
};

export default CentreSelection; 