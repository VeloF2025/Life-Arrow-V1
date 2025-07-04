import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serviceService } from '../api/serviceService';
import ServiceForm from './ServiceForm';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { showSuccessToast, showErrorToast } from '@/utils/toast';
import type { Service } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const ServiceManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Fetch all services
  const { data: services, isLoading, error } = useQuery<Service[]>({ 
    queryKey: ['services'], 
    queryFn: serviceService.getAll 
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<Service>) => {
      console.log('Creating service with data:', data);
      return serviceService.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      showSuccessToast('Service created successfully!');
      setIsModalOpen(false);
    },
    onError: (err) => {
      console.error('Create failed:', err);
      showErrorToast('Failed to create service: ' + (err instanceof Error ? err.message : String(err)));
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: { id: string; service: Record<string, any> }) => {
      console.log('Update mutation called with:', data);
      return serviceService.update(data.id, data.service);
    },
    onSuccess: () => {
      console.log('Update successful!');
      queryClient.invalidateQueries({ queryKey: ['services'] });
      showSuccessToast('Service updated successfully!');
      setIsModalOpen(false);
      setEditingService(null);
    },
    onError: (err) => {
      console.error('Update failed:', err);
      showErrorToast('Failed to update service: ' + (err instanceof Error ? err.message : String(err)));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      console.log('Deleting service with ID:', id);
      return serviceService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      showSuccessToast('Service deleted successfully!');
    },
    onError: (err) => {
      console.error('Delete failed:', err);
      showErrorToast('Failed to delete service: ' + (err instanceof Error ? err.message : String(err)));
    },
  });

  // Handle form submission for both create and update
  const handleFormSubmit = (formData: any) => {
    console.log('Form submitted with data:', formData);
    
    if (editingService) {
      console.log('Updating existing service with ID:', editingService.id);
      updateMutation.mutate({ 
        id: editingService.id, 
        service: {
          ...formData,
          id: editingService.id // Ensure ID is preserved
        }
      });
    } else {
      console.log('Creating new service');
      createMutation.mutate(formData);
    }
  };

  // Open modal for creating a new service
  const openCreateModal = () => {
    setEditingService(null);
    setIsModalOpen(true);
  };

  // Open modal for editing an existing service
  const openEditModal = (service: Service) => {
    console.log('Opening edit modal for service:', service);
    setEditingService({...service}); // Create a copy to avoid reference issues
    setIsModalOpen(true);
  };

  // Handle service deletion with confirmation
  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      deleteMutation.mutate(id);
    }
  };

  // Ensure services is an array and de-duplicate it to prevent key errors
  // IMPORTANT: Always call hooks before any conditional returns to maintain consistent hook order
  const serviceList = useMemo(() => {
    const serviceArray = services || [];
    // Using a Map to filter out duplicate services by ID
    return Array.from(new Map(serviceArray.map(item => [item.id, item])).values());
  }, [services]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div>Error loading services: {error instanceof Error ? error.message : String(error)}</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Service Management</h1>
        <Button onClick={openCreateModal}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Service
        </Button>
      </div>

      {!serviceList?.length ? (
        <p>No services found. Create your first service to get started.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {serviceList.map((service) => (
                <tr key={service.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{service.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{service.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{service.duration} min</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R {service.price?.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${service.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {service.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(service)}><PencilIcon className="h-5 w-5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(service.id)}><TrashIcon className="h-5 w-5 text-red-600" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingService ? 'Edit Service' : 'Create Service'}>
        <ServiceForm
          onSubmit={handleFormSubmit}
          initialValues={editingService || undefined}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default ServiceManagement;
