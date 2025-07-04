import { useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, ExclamationTriangleIcon, UserIcon } from '@heroicons/react/24/outline';
import { PlusIcon, ArrowPathIcon, TrashIcon } from '@heroicons/react/24/solid';

import { AppointmentManagement } from '@/features/appointments/components/AppointmentManagement';

import { useClients } from '../hooks/useClients';


import type { Client } from '@/types';
import { ClientCard } from './ClientCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';


export function ClientManagement() {
  
  
  const {
    clients,
    isLoading,
    error,
    searchTerm,
    debouncedSearchTerm,
    searchInputRef,
    handleSearchChange,
    clearSearch,
    filterStatus,
    handleFilterChange,
    handleCreateNew,
    handleEdit,
    handleDelete,
    handleViewDetails,
    confirmDelete,
    showDeleteModal,
    setShowDeleteModal,
    selectedClient,
    canViewClients,
    canCreateClients,
    canEditClients,
    canDeleteClients,
    refetch
  } = useClients();

  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [clientToBookAppointment, setClientToBookAppointment] = useState<Client | null>(null);

  const toggleCardExpansion = (clientId: string) => {
    const newExpandedCards = new Set(expandedCards);
    if (newExpandedCards.has(clientId)) {
      newExpandedCards.delete(clientId);
    } else {
      newExpandedCards.add(clientId);
    }
    setExpandedCards(newExpandedCards);
  };

  const handleBookAppointment = (client: Client) => {
    setClientToBookAppointment(client);
    setShowAppointmentModal(true);
  };

  

  

  if (!canViewClients) {
    return (
      <div className="container mx-auto p-8 text-center">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-400" />
        <h2 className="mt-4 text-xl font-semibold text-gray-800">Access Denied</h2>
        <p className="mt-2 text-gray-600">You do not have permission to view this page.</p>
      </div>
    );
  }

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
  ];

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">Client Management</h1>
        <div className="flex items-center space-x-2">
          {canCreateClients && (
            <Button onClick={handleCreateNew} className="bg-primary-600 hover:bg-primary-700">
              <PlusIcon className="w-5 h-5 mr-2" />
              New Client
            </Button>
          )}
          <Button onClick={() => refetch()} variant="outline">
            <ArrowPathIcon className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="search-clients" className="sr-only">Search clients</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                id="search-clients"
                type="text"
                placeholder="Search by name, email, or ID..."
                value={searchTerm}
                onChange={handleSearchChange}
                ref={searchInputRef}
                className="pl-10 w-full"
              />
              {searchTerm && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button onClick={clearSearch} className="p-1 rounded-full hover:bg-gray-200">
                    <XMarkIcon className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="status-filter" className="sr-only">Filter by status</label>
            <Select
              id="status-filter"
              value={filterStatus}
              onChange={(value) => handleFilterChange(value as Client['status'] | 'all')}
              options={statusOptions}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {isLoading && <LoadingSpinner text="Loading clients..." />}
      {error && (
        <div className="text-center text-red-500 bg-red-50 p-4 rounded-lg">
          <p>{error.message}</p>
        </div>
      )}

      {!isLoading && !error && clients.length === 0 && (
        <div className="text-center py-12">
          <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            {debouncedSearchTerm ? 'No clients found' : 'No clients yet'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {debouncedSearchTerm
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by creating a new client.'}
          </p>
          {canCreateClients && !debouncedSearchTerm && (
            <div className="mt-6">
              <Button onClick={handleCreateNew} className="bg-primary-600 hover:bg-primary-700">
                <PlusIcon className="w-5 h-5 mr-2" />
                Create First Client
              </Button>
            </div>
          )}
        </div>
      )}

      {!isLoading && !error && clients.length > 0 && (
        <div className="grid grid-cols-1 gap-6">
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              isExpanded={expandedCards.has(client.id)}
              onToggleExpand={() => toggleCardExpansion(client.id)}
              onEdit={() => handleEdit(client)}
              onDelete={() => handleDelete(client)}
              onViewDetails={() => handleViewDetails(client)}
              onBookAppointment={() => handleBookAppointment(client)}
              onViewAppointments={() => { /* Not implemented */ }}
              onLinkUser={() => { /* Not implemented */ }}
              canEdit={canEditClients}
              canDelete={canDeleteClients}
              searchTerm={debouncedSearchTerm}
            />
          ))}
        </div>
      )}

      {showDeleteModal && selectedClient && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Client"
          size="lg"
        >
          <div className="p-6">
            <div className="text-center">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Are you sure?</h3>
              <p className="mt-2 text-sm text-gray-500">
                This will permanently delete the client record for{' '}
                <strong>{selectedClient.firstName} {selectedClient.lastName}</strong>.
                This action cannot be undone.
              </p>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                <TrashIcon className="w-5 h-5 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showAppointmentModal && clientToBookAppointment && (
        <Modal
          isOpen={showAppointmentModal}
          onClose={() => setShowAppointmentModal(false)}
          title={`Book Appointment for ${clientToBookAppointment.firstName} ${clientToBookAppointment.lastName}`}
          size="xl"
        >
          <AppointmentManagement 
            initialClientId={clientToBookAppointment.id} 
            onAppointmentBooked={() => {
              setShowAppointmentModal(false);
              refetch();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

export default ClientManagement;
