import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService } from '../api/clientService';
import type { Client } from '@/types';
import { usePermissions } from '@/lib/usePermissions';
import { useClientSearch } from './useClientSearch';

type ClientStatus = 'all' | 'active' | 'inactive' | 'pending';

export function useClients() {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  
  // Use the client search hook for search functionality
  const {
    searchTerm,
    debouncedSearchTerm,
    searchInputRef,
    handleSearchChange,
    clearSearch
  } = useClientSearch();
  
  // State
  const [filterStatus, setFilterStatus] = useState<ClientStatus>('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAppointmentsModal, setShowAppointmentsModal] = useState(false);

  // Permissions
  const canViewClients = can('view_clients');
  const canCreateClients = can('create_clients');
  const canEditClients = can('edit_clients');
  const canDeleteClients = can('delete_clients');

  // Fetch clients
  const { 
    data: clients = [], 
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['clients', searchTerm, filterStatus],
    queryFn: () => clientService.getAll(searchTerm, filterStatus),
    enabled: canViewClients
  });

  // Create client mutation
  const createClient = useMutation({
    mutationFn: ({ clientData, photoFile }: { clientData: Partial<Client>, photoFile?: File }) => 
      clientService.create(clientData, photoFile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowCreateModal(false);
    }
  });

  // Update client mutation
  const updateClient = useMutation({
    mutationFn: ({ id, clientData, photoFile }: { id: string, clientData: Partial<Client>, photoFile?: File }) => 
      clientService.update(id, clientData, photoFile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowEditModal(false);
      setSelectedClient(null);
    }
  });

  // Delete client mutation
  const deleteClient = useMutation({
    mutationFn: (id: string) => clientService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowDeleteModal(false);
      setSelectedClient(null);
    }
  });

  // Update client status mutation
  const updateClientStatus = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => 
      clientService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    }
  });

  // Handlers
  const handleViewDetails = useCallback((client: Client) => {
    setSelectedClient(client);
    setShowDetailsModal(true);
  }, []);

  const handleEdit = useCallback((client: Client) => {
    setSelectedClient(client);
    setShowEditModal(true);
  }, []);

  const handleDelete = useCallback((client: Client) => {
    setSelectedClient(client);
    setShowDeleteModal(true);
  }, []);

  const handleCreateNew = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const handleViewAppointments = useCallback((client: Client) => {
    setSelectedClient(client);
    setShowAppointmentsModal(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (selectedClient) {
      deleteClient.mutate(selectedClient.id);
    }
  }, [selectedClient, deleteClient]);

  // Filtered clients - filtering is now handled by the backend via searchTerm
  const filteredClients = useMemo(() => {
    return clients;
  }, [clients]);
  
  // Handle filter change
  const handleFilterChange = useCallback((status: ClientStatus) => {
    setFilterStatus(status);
  }, []);

  return {
    // State
    clients: filteredClients,
    searchTerm,
    debouncedSearchTerm,
    filterStatus,
    setFilterStatus,
    selectedClient,
    setSelectedClient,
    isLoading,
    error,
    
    // Search functionality
    searchInputRef,
    handleSearchChange,
    clearSearch,
    
    // Modal state
    showCreateModal,
    setShowCreateModal,
    showEditModal,
    setShowEditModal,
    showDeleteModal,
    setShowDeleteModal,
    showDetailsModal,
    setShowDetailsModal,
    showAppointmentsModal,
    setShowAppointmentsModal,
    
    // Permissions
    canViewClients,
    canCreateClients,
    canEditClients,
    canDeleteClients,
    
    // Handlers
    handleFilterChange,
    handleViewDetails,
    handleEdit,
    handleDelete,
    handleCreateNew,
    handleViewAppointments,
    confirmDelete,
    
    // Mutations
    createClient,
    updateClient,
    deleteClient,
    updateClientStatus,
    
    // Refetch
    refetch
  };
}

export default useClients;
