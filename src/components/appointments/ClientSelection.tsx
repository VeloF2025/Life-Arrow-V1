import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, query, orderBy, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  MagnifyingGlassIcon, 
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';

interface SelectedClient {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface ClientSelectionProps {
  onNext: (client: SelectedClient) => void;
}

interface ClientInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  status: string;
  myNearestTreatmentCentre: string;
  addedTime?: Date | { toDate(): Date } | null;
}

const ClientSelection = ({ onNext }: ClientSelectionProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<SelectedClient | null>(null);

  // Fetch clients with real-time search
  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ['clients-search', searchTerm],
    queryFn: async (): Promise<ClientInfo[]> => {
      try {
        let clientsQuery;
        
        if (searchTerm.trim()) {
          // Search by first name (simplified for now)
          clientsQuery = query(
            collection(db, 'clients'),
            where('firstName', '>=', searchTerm),
            where('firstName', '<=', searchTerm + '\uf8ff'),
            orderBy('firstName'),
            limit(20)
          );
        } else {
          // Default: get recent clients
          clientsQuery = query(
            collection(db, 'clients'),
            orderBy('addedTime', 'desc'),
            limit(20)
          );
        }
        
        const snapshot = await getDocs(clientsQuery);
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ClientInfo[];
      } catch (error) {
        console.error('Error fetching clients:', error);
        return [];
      }
    },
    enabled: true
  });

  const handleClientSelect = (client: ClientInfo) => {
    const selectedClientData: SelectedClient = {
      id: client.id,
      name: `${client.firstName} ${client.lastName}`,
      email: client.email,
      phone: client.mobile
    };
    setSelectedClient(selectedClientData);
  };

  const handleNext = () => {
    if (selectedClient) {
      onNext(selectedClient);
    }
  };

  // Filter clients based on active status
  const activeClients = clients.filter(client => 
    client.status === 'active' || !client.status
  );

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Client</h2>
        <p className="text-gray-600">
          Search and select the client you want to book an appointment for
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-8">
          <p className="text-red-600">Error loading clients. Please try again.</p>
        </div>
      )}

      {/* Clients List */}
      {!isLoading && !error && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {activeClients.length === 0 ? (
            <div className="text-center py-8">
              <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'No clients found matching your search' : 'No active clients found'}
              </p>
            </div>
          ) : (
            activeClients.map((client) => {
              const isSelected = selectedClient?.id === client.id;
              
              return (
                <Card
                  key={client.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleClientSelect(client)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {client.firstName} {client.lastName}
                      </h3>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center">
                          <EnvelopeIcon className="w-4 h-4 mr-2" />
                          <span>{client.email}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <PhoneIcon className="w-4 h-4 mr-2" />
                          <span>{client.mobile}</span>
                        </div>
                        
                        {client.myNearestTreatmentCentre && (
                          <div className="text-xs text-gray-500 mt-1">
                            Preferred Centre: {client.myNearestTreatmentCentre}
                          </div>
                        )}
                      </div>
                    </div>

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

      {/* Continue Button */}
      {selectedClient && (
        <div className="pt-6 border-t">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-blue-900 mb-1">Selected Client</h4>
            <p className="text-sm text-blue-800">
              <strong>{selectedClient.name}</strong> - {selectedClient.email}
            </p>
          </div>
          
          <Button 
            onClick={handleNext}
            className="w-full"
            size="lg"
          >
            Continue to Centre Selection
          </Button>
        </div>
      )}
    </div>
  );
};

export default ClientSelection; 