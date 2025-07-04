import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { appointmentService } from '../api/appointmentService';
import type { Appointment } from '@/types';

type ViewMode = 'calendar' | 'grid';
type FilterStatus = 'all' | 'scheduled' | 'completed' | 'cancelled' | 'confirmed';

export function useAppointments() {
  const queryClient = useQueryClient();
  
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCentreId, setSelectedCentreId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Fetch centres
  const { 
    data: centres = [],
    isLoading: centresLoading
  } = useQuery({
    queryKey: ['centres'],
    queryFn: appointmentService.getCentres
  });

  // Fetch appointments
  const { 
    data: appointments = [], 
    isLoading: appointmentsLoading,
    refetch
  } = useQuery({
    queryKey: ['appointments', selectedCentreId, filterStatus],
    queryFn: () => appointmentService.getAll({
      centreId: selectedCentreId,
      status: filterStatus
    })
  });

  // Centre options for filtering
  const centreOptions = useMemo(() => [
    { value: 'all', label: 'All Centres' },
    ...centres.map(centre => ({
      value: centre.id,
      label: centre.name
    }))
  ], [centres]);

  // Get appointments for current month in calendar view
  const monthAppointments = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    return appointments.filter(apt => {
      const aptDate = new Date(apt.dateTime);
      return aptDate >= monthStart && aptDate <= monthEnd;
    });
  }, [appointments, currentDate]);

  // Get appointments for a specific day
  const getAppointmentsForDay = useCallback((day: Date) => {
    return appointments.filter(apt => 
      isSameDay(new Date(apt.dateTime), day)
    );
  }, [appointments]);

  // Create appointment mutation
  const createAppointment = useMutation({
    mutationFn: (appointmentData: Partial<Appointment>) => 
      appointmentService.create(appointmentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setShowCreateModal(false);
    }
  });

  // Update appointment mutation
  const updateAppointment = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<Appointment> }) => 
      appointmentService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setShowEditModal(false);
      setSelectedAppointment(null);
    }
  });

  // Delete appointment mutation
  const deleteAppointment = useMutation({
    mutationFn: (id: string) => appointmentService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setShowDeleteModal(false);
      setSelectedAppointment(null);
    }
  });

  // Update appointment status mutation
  const updateAppointmentStatus = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => 
      appointmentService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    }
  });

  // Handlers
  const handleViewDetails = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  }, []);

  const handleDelete = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDeleteModal(true);
  }, []);

  const handleEdit = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowEditModal(true);
  }, []);

  const handleCreateNew = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (selectedAppointment) {
      deleteAppointment.mutate(selectedAppointment.id);
    }
  }, [selectedAppointment, deleteAppointment]);

  // Utility functions
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const getStatusBgColor = useCallback((status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100';
      case 'confirmed': return 'bg-green-100';
      case 'completed': return 'bg-purple-100';
      case 'cancelled': return 'bg-red-100';
      default: return 'bg-gray-100';
    }
  }, []);

  return {
    // State
    viewMode,
    setViewMode,
    currentDate,
    setCurrentDate,
    selectedCentreId,
    setSelectedCentreId,
    filterStatus,
    setFilterStatus,
    showCreateModal,
    setShowCreateModal,
    showDetailsModal,
    setShowDetailsModal,
    showDeleteModal,
    setShowDeleteModal,
    showEditModal,
    setShowEditModal,
    selectedAppointment,
    setSelectedAppointment,
    
    // Data
    centres,
    appointments,
    monthAppointments,
    centreOptions,
    isLoading: appointmentsLoading || centresLoading,
    
    // Functions
    getAppointmentsForDay,
    getStatusColor,
    getStatusBgColor,
    
    // Handlers
    handleViewDetails,
    handleDelete,
    handleEdit,
    handleCreateNew,
    confirmDelete,
    
    // Mutations
    createAppointment,
    updateAppointment,
    deleteAppointment,
    updateAppointmentStatus,
    
    // Refetch
    refetch
  };
}

export default useAppointments;
