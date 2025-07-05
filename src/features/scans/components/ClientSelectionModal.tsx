import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { clientService } from '../../clients/api/clientService';
import type { Client } from '@/types';

interface ClientSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientSelected: (clientId: string) => void;
  isLoading?: boolean;
}

export const ClientSelectionModal: React.FC<ClientSelectionModalProps> = ({
  isOpen,
  onClose,
  onClientSelected,
  isLoading: externalIsLoading
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  
  // Combine external loading state with internal loading state
  const isLoading = externalIsLoading || isLoadingClients;

  // Fetch clients on component mount
  useEffect(() => {
    const fetchClients = async () => {
      setIsLoadingClients(true);
      try {
        const clientsData = await clientService.getAll();
        setClients(clientsData);
        setFilteredClients(clientsData);
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setIsLoadingClients(false);
      }
    };

    if (isOpen) {
      fetchClients();
    }
  }, [isOpen]);

  // Filter clients based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredClients(clients);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = clients.filter(
        client =>
          client.firstName?.toLowerCase().includes(term) ||
          client.lastName?.toLowerCase().includes(term) ||
          client.email?.toLowerCase().includes(term) ||
          client.phone?.includes(term)
      );
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients]);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-10 overflow-y-auto"
    >
      <div className="fixed inset-0 bg-black bg-opacity-30" aria-hidden="true" />
      <div className="min-h-screen px-4 text-center">
        {/* This element is to trick the browser into centering the modal contents. */}
        <span className="inline-block h-screen align-middle" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <Dialog.Title
            as="h3"
            className="text-lg font-medium leading-6 text-gray-900"
          >
            Select Client
          </Dialog.Title>

          <div className="mt-4">
            <input
              type="text"
              placeholder="Search clients..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="mt-4 max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : filteredClients.length === 0 ? (
              <p className="text-center py-4 text-gray-500">No clients found</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <li
                    key={client.id}
                    className="py-3 px-2 hover:bg-gray-50 cursor-pointer"
                    onClick={() => onClientSelected(client.id!)}
                  >
                    <div className="flex items-center">
                      {client.photoUrl ? (
                        <img
                          src={client.photoUrl}
                          alt={`${client.firstName} ${client.lastName}`}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 font-medium">
                            {client.firstName?.[0]}
                            {client.lastName?.[0]}
                          </span>
                        </div>
                      )}
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {client.firstName} {client.lastName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {client.email || client.phone || 'No contact info'}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
