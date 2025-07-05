export const AppointmentManagement: React.FC<AppointmentManagementProps> = ({
  initialClientId,
  onAppointmentBooked,
  clientMode = false,
}) => {
  // State for modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // State for selected appointment
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  // State for form data
  const [createFormData, setCreateFormData] = useState({
    clientId: initialClientId || '',
    staffId: '',
    centreId: '',
    serviceId: '',
    date: '',
    time: '',
    duration: 0,
    notes: '',
    status: 'scheduled'
  });
  
  // State for edit form data
  const [editFormData, setEditFormData] = useState({
    id: '',
    clientId: '',
    staffId: '',
    centreId: '',
    serviceId: '',
    date: '',
    time: '',
    duration: 0,
    notes: '',
    status: ''
  });
  
  // State for available time slots
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

  // Fetch all appointments or client-specific appointments
  const { data: allAppointments = [], isLoading: isLoadingAppointments, refetch } = useQuery({
    queryKey: ['appointments', clientMode ? initialClientId : 'all'],
    queryFn: async () => {
      try {
        const appointmentsCollection = collection(db, 'appointments');
        const querySnapshot = await getDocs(appointmentsCollection);
        const appointments = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
        
        // If in client mode, filter to only show this client's appointments
        return clientMode && initialClientId 
          ? appointments.filter(appt => appt.clientId === initialClientId)
          : appointments;
      } catch (error) {
        console.error('Error fetching appointments:', error);
        return [];
      }
    },
    enabled: true
  });

  // Fetch clients
  const { data: allClients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      try {
        const clients = await clientService.getClients();
        return clients.map(client => ({
          ...client,
          fullName: `${client.firstName || ''} ${client.lastName || ''}`.trim()
        }));
      } catch (error) {
        console.error('Error fetching clients:', error);
        return [];
      }
    }
  });

  // Fetch staff members
  const { data: allStaff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      try {
        const staff = await staffService.getStaffMembers();
        return staff.map(member => ({
          ...member,
          fullName: member.displayName || `${member.firstName || ''} ${member.lastName || ''}`.trim()
        }));
      } catch (error) {
        console.error('Error fetching staff:', error);
        return [];
      }
    }
  });

  // Fetch services
  const { data: allServices = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      try {
        return await serviceService.getServices();
      } catch (error) {
        console.error('Error fetching services:', error);
        return [];
      }
    }
  });

  // Fetch centres
  const { data: allCentres = [] } = useQuery({
    queryKey: ['centres'],
    queryFn: async () => {
      try {
        return await centreService.getCentres();
      } catch (error) {
        console.error('Error fetching centres:', error);
        return [];
      }
    }
  });

  // Options for dropdowns
  const clientOptions = allClients.map(c => ({ value: c.id, label: c.fullName || `Client ${c.id}` }));
  const staffOptions = allStaff.map(s => ({ value: s.id, label: s.fullName || `Staff ${s.id}` }));
  const serviceOptions = allServices.map(s => ({ value: s.id, label: s.name }));
  const centreOptions = allCentres.map(c => ({ value: c.id, label: c.name }));
  
  // Form change handlers
  const handleCreateFormChange = (field: string, value: any) => {
    setCreateFormData(prev => ({ ...prev, [field]: value }));
    
    // If staff or date changed, recalculate available time slots
    if (field === 'staffId' || field === 'date' || field === 'serviceId') {
      updateAvailableTimeSlots();
    }
  };

  const handleEditFormChange = (field: string, value: any) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  // Update available time slots based on staff availability and existing appointments
  const updateAvailableTimeSlots = () => {
    const { staffId, date, serviceId } = createFormData;
    if (!staffId || !date || !serviceId) {
      setAvailableTimeSlots([]);
      return;
    }

    const staff = allStaff.find(s => s.id === staffId);
    const service = allServices.find(s => s.id === serviceId);
    
    if (!staff?.availability || !service) {
      setAvailableTimeSlots([]);
      return;
    }

    const staffAppointments = allAppointments.filter(a => 
      a.staffId === staffId && a.date === date
    );

    const slots = generateAvailableSlots(
      staff.availability,
      staffAppointments,
      service.duration,
      date
    );

    setAvailableTimeSlots(slots);
  };

  // Get service by ID
  const getServiceById = (id: string) => {
    return allServices.find(s => s.id === id);
  };

  // Format date safely
  const safeFormatDate = (dateString: string, formatStr: string) => {
    try {
      return format(new Date(dateString), formatStr);
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no-show': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle view details
  const handleViewDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  };

  // Handle edit
  const handleEdit = (appointment: Appointment) => {
    setEditFormData({
      id: appointment.id,
      clientId: appointment.clientId,
      staffId: appointment.staffId,
      centreId: appointment.centreId,
      serviceId: appointment.serviceId,
      date: appointment.date,
      time: appointment.time,
      duration: appointment.duration || 0,
      notes: appointment.notes || '',
      status: appointment.status
    });
    setShowDetailsModal(false);
    setShowEditModal(true);
  };

  // Handle delete
  const handleDelete = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(false);
    setShowDeleteModal(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!selectedAppointment) return;
    
    try {
      await deleteDoc(doc(db, 'appointments', selectedAppointment.id));
      toast.success('Appointment deleted successfully');
      setShowDeleteModal(false);
      refetch();
    } catch (error) {
      toast.error('Failed to delete appointment');
      console.error('Error deleting appointment:', error);
    }
  };

  // Handle create submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { clientId, staffId, centreId, serviceId, date, time, duration, notes, status } = createFormData;
      
      // Get names for display
      const client = allClients.find(c => c.id === clientId);
      const staff = allStaff.find(s => s.id === staffId);
      const centre = allCentres.find(c => c.id === centreId);
      const service = allServices.find(s => s.id === serviceId);
      
      if (!client || !staff || !centre || !service) {
        toast.error('Please fill in all required fields');
        return;
      }
      
      // Create dateTime string
      const dateTime = `${date}T${time}`;
      
      const newAppointment = {
        clientId,
        clientName: client.fullName || `${client.firstName || ''} ${client.lastName || ''}`.trim(),
        staffId,
        staffName: staff.fullName || `${staff.firstName || ''} ${staff.lastName || ''}`.trim(),
        centreId,
        centreName: centre.name,
        serviceId,
        serviceName: service.name,
        date,
        time,
        dateTime,
        duration,
        notes,
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'appointments'), newAppointment);
      toast.success('Appointment created successfully');
      setShowCreateModal(false);
      refetch();
      
      if (onAppointmentBooked) {
        onAppointmentBooked();
      }
    } catch (error) {
      toast.error('Failed to create appointment');
      console.error('Error creating appointment:', error);
    }
  };

  // Handle edit submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { id, clientId, staffId, centreId, serviceId, date, time, duration, notes, status } = editFormData;
      
      // Get names for display
      const client = allClients.find(c => c.id === clientId);
      const staff = allStaff.find(s => s.id === staffId);
      const centre = allCentres.find(c => c.id === centreId);
      const service = allServices.find(s => s.id === serviceId);
      
      if (!client || !staff || !centre || !service) {
        toast.error('Please fill in all required fields');
        return;
      }
      
      // Create dateTime string
      const dateTime = `${date}T${time}`;
      
      const updatedAppointment = {
        clientId,
        clientName: client.fullName || `${client.firstName || ''} ${client.lastName || ''}`.trim(),
        staffId,
        staffName: staff.fullName || `${staff.firstName || ''} ${staff.lastName || ''}`.trim(),
        centreId,
        centreName: centre.name,
        serviceId,
        serviceName: service.name,
        date,
        time,
        dateTime,
        duration,
        notes,
        status,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(doc(db, 'appointments', id), updatedAppointment);
      toast.success('Appointment updated successfully');
      setShowEditModal(false);
      refetch();
    } catch (error) {
      toast.error('Failed to update appointment');
      console.error('Error updating appointment:', error);
    }
  };
