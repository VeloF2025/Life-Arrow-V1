import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  AcademicCapIcon,
  CheckIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';
import type { TreatmentCentre, ServiceManagement } from '../../types';

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  specializations: string[];
  qualifications: string[];
  centreIds: string[];
  isActive: boolean;
  photoUrl?: string;
}

interface StaffSelectionProps {
  centre: TreatmentCentre;
  service: ServiceManagement;
  onNext: (staff: StaffMember) => void;
  onBack: () => void;
  onStaffLoaded?: (staff: StaffMember[]) => void;
}

const StaffSelection = ({ centre, service, onNext, onBack }: StaffSelectionProps) => {
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [autoSelecting, setAutoSelecting] = useState(false);

  // Fetch available staff for this centre and service
  const { data: availableStaff = [], isLoading, error } = useQuery({
    queryKey: ['available-staff', centre.id, service.id],
    queryFn: async (): Promise<StaffMember[]> => {
      try {
        console.log('🔍 Fetching staff for centre:', centre.name, '(ID:', centre.id, ')');
        console.log('🔍 Service:', service.name, '(Category:', service.category, ')');

        // Step 1: Verify the service is available at this centre
        console.log('📋 Verifying service availability at centre...');
        if (!service.availableAtCentres?.includes(centre.id)) {
          console.log('❌ Service not available at this centre');
          console.log('   Service available at:', service.availableAtCentres);
          return [];
        }
        console.log('✅ Service is available at this centre');

        // Step 2: Get all staff (remove isActive filter temporarily for debugging)
        const staffQuery = query(
          collection(db, 'staff')
        );
        
        const snapshot = await getDocs(staffQuery);
        const allStaff = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as (StaffMember & { centre?: string; workingCentres?: string[] })[];

        console.log('📊 Total staff found:', allStaff.length);
        
        // Filter for active staff manually (more flexible)
        const activeStaff = allStaff.filter(staff => 
          staff.isActive !== false
        );
        
        console.log('📊 Active staff found:', activeStaff.length);

        // Step 3: Filter staff assigned to this centre
        const centreStaff = activeStaff.filter(staff => {
          console.log(`🔍 Checking staff ${staff.firstName} ${staff.lastName}:`, {
            staffCentre: staff.centre,
            staffCentreIds: staff.centreIds,
            staffWorkingCentres: staff.workingCentres,
            searchingForCentreId: centre.id,
            searchingForCentreName: centre.name
          });

          // Check new centreIds array format first
          if (staff.centreIds && Array.isArray(staff.centreIds)) {
            const match = staff.centreIds.includes(centre.id);
            console.log(`   ✓ centreIds check: ${match}`);
            if (match) return true;
          }
          
          // Check legacy centre string format (by name) - exact match first
          if (staff.centre && typeof staff.centre === 'string') {
            const staffCentreNormalized = staff.centre.trim();
            const searchCentreNormalized = centre.name.trim();
            
            // Try exact match first
            if (staffCentreNormalized === searchCentreNormalized) {
              console.log(`   ✓ centre name exact match: ${staffCentreNormalized} === ${searchCentreNormalized}`);
              return true;
            }
            
            // Try case-insensitive match
            if (staffCentreNormalized.toLowerCase() === searchCentreNormalized.toLowerCase()) {
              console.log(`   ✓ centre name case-insensitive match: ${staffCentreNormalized} ~= ${searchCentreNormalized}`);
              return true;
            }
            
            console.log(`   ❌ centre name no match: "${staffCentreNormalized}" vs "${searchCentreNormalized}"`);
          }

          // Check if staff has workingCentres array (alternative field name)
          if (staff.workingCentres && Array.isArray(staff.workingCentres)) {
            const match = staff.workingCentres.some(wc => 
              wc === centre.name || 
              wc === centre.id ||
              wc.toLowerCase() === centre.name.toLowerCase()
            );
            console.log(`   ✓ workingCentres check: ${match}`);
            if (match) return true;
          }

          console.log(`   ❌ No centre match found for ${staff.firstName} ${staff.lastName}`);
          return false;
        });

        console.log('🏥 Staff assigned to centre:', centreStaff.length);
        centreStaff.forEach(staff => {
          console.log(`   - ${staff.firstName} ${staff.lastName} (${staff.position})`);
        });

        // Step 4: For now, all centre staff are service-compatible 
        // TODO: Implement proper staff-service assignment in the database
        const serviceCompatibleStaff = centreStaff;

        console.log('🎯 Service-compatible staff:', serviceCompatibleStaff.length);
        
        if (serviceCompatibleStaff.length === 0) {
          console.log('⚠️  No staff found for this centre');
          console.log('   Centre:', centre.name);
          console.log('   Service:', service.name);
        }

        return serviceCompatibleStaff;
      } catch (error) {
        console.error('Error fetching available staff:', error);
        return [];
      }
    },
    enabled: !!centre.id && !!service.id
  });

  // Auto-select if only one staff member available
  useEffect(() => {
    if (!isLoading && availableStaff.length === 1 && !selectedStaff && !autoSelecting) {
      const autoSelectedStaff = availableStaff[0];
      setSelectedStaff(autoSelectedStaff);
      setAutoSelecting(true);
      
      // Automatically proceed to next step after a brief delay for UX
      setTimeout(() => {
        onNext(autoSelectedStaff);
      }, 1500);
    }
  }, [availableStaff, isLoading, selectedStaff, autoSelecting, onNext]);

  const handleStaffSelect = (staff: StaffMember) => {
    setSelectedStaff(staff);
  };

  const handleNext = () => {
    if (selectedStaff) {
      onNext(selectedStaff);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Staff Member</h2>
        <p className="text-gray-600">
          Choose the staff member you'd like to book your appointment with
        </p>
        <div className="mt-3 text-sm text-gray-500">
          <span className="font-medium">Service:</span> {service.name} • 
          <span className="font-medium ml-2">Centre:</span> {centre.name}
        </div>
      </div>

      {/* Auto-selection message */}
      {!isLoading && !error && availableStaff.length === 1 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            {autoSelecting ? (
              <>
                <LoadingSpinner />
                <div className="ml-3">
                  <h4 className="font-medium text-green-900">Auto-selecting Staff Member</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Proceeding to time selection with the available staff member...
                  </p>
                </div>
              </>
            ) : (
              <>
                <CheckIcon className="w-5 h-5 text-green-600 mr-2" />
                <div>
                  <h4 className="font-medium text-green-900">Only One Staff Member Available</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Automatically selecting the qualified staff member for this service.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-8">
          <p className="text-red-600">Error loading staff. Please try again.</p>
        </div>
      )}

      {/* Staff List */}
      {!isLoading && !error && (
        <div className="space-y-4">
          {availableStaff.length === 0 ? (
            <div className="text-center py-8">
              <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No available staff found</p>
              <p className="text-sm text-gray-400">
                No staff members are currently available for "{service.name}" at {centre.name}
              </p>
            </div>
          ) : (
            availableStaff.map((staff) => {
              const isSelected = selectedStaff?.id === staff.id;
              
              return (
                <Card
                  key={staff.id}
                  className={`p-6 ${availableStaff.length > 1 ? 'cursor-pointer' : ''} transition-all hover:shadow-md ${
                    isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : availableStaff.length > 1 ? 'hover:bg-gray-50' : ''
                  }`}
                  onClick={availableStaff.length > 1 ? () => handleStaffSelect(staff) : undefined}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Photo */}
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                        {staff.photoUrl ? (
                          <img 
                            src={staff.photoUrl} 
                            alt={`${staff.firstName} ${staff.lastName}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserIcon className="w-8 h-8 text-gray-400" />
                        )}
                      </div>

                      {/* Staff Info */}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {staff.firstName} {staff.lastName}
                        </h3>
                        
                        <p className="text-blue-600 font-medium mb-2">
                          {staff.position}
                        </p>

                        <div className="space-y-2 text-sm text-gray-600">
                          {/* Contact Info */}
                          <div className="flex items-center">
                            <EnvelopeIcon className="w-4 h-4 mr-2" />
                            <span>{staff.email}</span>
                          </div>
                          
                          <div className="flex items-center">
                            <PhoneIcon className="w-4 h-4 mr-2" />
                            <span>{staff.phone}</span>
                          </div>

                          {/* Specializations */}
                          {staff.specializations && staff.specializations.length > 0 && (
                            <div className="flex items-start">
                              <AcademicCapIcon className="w-4 h-4 mr-2 mt-0.5" />
                              <div>
                                <span className="font-medium">Specializations:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {staff.specializations.map((spec, index) => (
                                    <span 
                                      key={index}
                                      className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                                    >
                                      {spec}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Qualifications */}
                          {staff.qualifications && staff.qualifications.length > 0 && (
                            <div className="text-xs text-gray-500">
                              <span className="font-medium">Qualifications:</span> {staff.qualifications.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="ml-4">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <CheckIcon className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="flex items-center"
          disabled={autoSelecting}
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Services
        </Button>

        {selectedStaff && !autoSelecting && availableStaff.length > 1 && (
          <Button 
            onClick={handleNext}
            className="flex items-center"
          >
            Continue to Time Selection
            <ArrowLeftIcon className="w-4 h-4 ml-2 rotate-180" />
          </Button>
        )}

        {autoSelecting && (
          <Button 
            disabled
            className="flex items-center opacity-50"
          >
            Auto-proceeding...
            <LoadingSpinner />
          </Button>
        )}
      </div>

      {/* Selected Staff Summary */}
      {selectedStaff && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-1">Selected Staff Member</h4>
          <p className="text-sm text-blue-800">
            <strong>{selectedStaff.firstName} {selectedStaff.lastName}</strong> - {selectedStaff.position}
          </p>
        </div>
      )}
    </div>
  );
};

export default StaffSelection; 