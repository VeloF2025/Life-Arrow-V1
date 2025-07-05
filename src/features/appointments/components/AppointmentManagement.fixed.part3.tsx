  // Reset form data
  const resetCreateForm = () => {
    setCreateFormData({
      clientId: clientMode && initialClientId ? initialClientId : '',
      staffId: '',
      centreId: '',
      serviceId: '',
      date: '',
      time: '',
      duration: 0,
      notes: '',
      status: 'scheduled'
    });
    setAvailableTimeSlots([]);
  };

  // Open create modal
  const openCreateModal = () => {
    resetCreateForm();
    setShowCreateModal(true);
  };

  // Render the component
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {clientMode ? 'Book Appointments' : 'Appointment Management'}
        </h1>
        <Button 
          onClick={openCreateModal} 
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          <PlusIcon className="h-5 w-5" />
          <span>{clientMode ? 'Book Appointment' : 'New Appointment'}</span>
        </Button>
      </div>

      {isLoadingAppointments ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                  {!clientMode && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Centre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={clientMode ? 6 : 7} className="px-6 py-4 text-center text-gray-500">
                      No appointments found
                    </td>
                  </tr>
                ) : (
                  allAppointments.map((appointment) => (
                    <tr key={appointment.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {safeFormatDate(appointment.date, 'MMM dd, yyyy')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {appointment.time}
                        </div>
                      </td>
                      {!clientMode && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{appointment.clientName}</div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{appointment.staffName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{appointment.serviceName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{appointment.centreName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewDetails(appointment)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(appointment)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(appointment)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Appointment Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={clientMode ? "Book New Appointment" : "Create New Appointment"}
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {/* Client Selection - Hidden in client mode */}
          {!clientMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Client</label>
              <Select
                value={createFormData.clientId}
                onChange={(value) => handleCreateFormChange('clientId', value)}
                options={clientOptions}
                placeholder="Select Client"
                className="mt-1"
              />
            </div>
          )}

          {/* Service Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Service</label>
            <Select
              value={createFormData.serviceId}
              onChange={(value) => {
                const service = getServiceById(value);
                handleCreateFormChange('serviceId', value);
                if (service) {
                  handleCreateFormChange('duration', service.duration);
                }
              }}
              options={serviceOptions}
              placeholder="Select Service"
              className="mt-1"
            />
          </div>

          {/* Centre Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Centre</label>
            <Select
              value={createFormData.centreId}
              onChange={(value) => handleCreateFormChange('centreId', value)}
              options={centreOptions}
              placeholder="Select Centre"
              className="mt-1"
            />
          </div>

          {/* Staff Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Staff</label>
            <Select
              value={createFormData.staffId}
              onChange={(value) => handleCreateFormChange('staffId', value)}
              options={staffOptions}
              placeholder="Select Staff"
              className="mt-1"
            />
          </div>

          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <Input
              type="date"
              value={createFormData.date}
              onChange={(value) => handleCreateFormChange('date', value)}
              className="mt-1"
            />
          </div>

          {/* Time Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Time</label>
            <Select
              value={createFormData.time}
              onChange={(value) => handleCreateFormChange('time', value)}
              options={availableTimeSlots.map(slot => ({ value: slot, label: slot }))}
              placeholder={availableTimeSlots.length > 0 ? "Select Time" : "No available slots"}
              disabled={availableTimeSlots.length === 0}
              className="mt-1"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <TextArea
              value={createFormData.notes}
              onChange={(value) => handleCreateFormChange('notes', value)}
              placeholder="Add any notes here..."
              className="mt-1"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              {clientMode ? "Book Appointment" : "Create Appointment"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Appointment Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Appointment"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {/* Client Selection - Hidden in client mode */}
          {!clientMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Client</label>
              <Select
                value={editFormData.clientId}
                onChange={(value) => handleEditFormChange('clientId', value)}
                options={clientOptions}
                placeholder="Select Client"
                className="mt-1"
              />
            </div>
          )}

          {/* Service Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Service</label>
            <Select
              value={editFormData.serviceId}
              onChange={(value) => {
                const service = getServiceById(value);
                handleEditFormChange('serviceId', value);
                if (service) {
                  handleEditFormChange('duration', service.duration);
                }
              }}
              options={serviceOptions}
              placeholder="Select Service"
              className="mt-1"
            />
          </div>

          {/* Centre Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Centre</label>
            <Select
              value={editFormData.centreId}
              onChange={(value) => handleEditFormChange('centreId', value)}
              options={centreOptions}
              placeholder="Select Centre"
              className="mt-1"
            />
          </div>

          {/* Staff Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Staff</label>
            <Select
              value={editFormData.staffId}
              onChange={(value) => handleEditFormChange('staffId', value)}
              options={staffOptions}
              placeholder="Select Staff"
              className="mt-1"
            />
          </div>

          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <Input
              type="date"
              value={editFormData.date}
              onChange={(value) => handleEditFormChange('date', value)}
              className="mt-1"
            />
          </div>

          {/* Time Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Time</label>
            <Input
              type="time"
              value={editFormData.time}
              onChange={(value) => handleEditFormChange('time', value)}
              className="mt-1"
            />
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <Select
              value={editFormData.status}
              onChange={(value) => handleEditFormChange('status', value)}
              options={[
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
                { value: 'no-show', label: 'No Show' }
              ]}
              placeholder="Select Status"
              className="mt-1"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <TextArea
              value={editFormData.notes}
              onChange={(value) => handleEditFormChange('notes', value)}
              placeholder="Add any notes here..."
              className="mt-1"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Update Appointment
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Appointment Details"
      >
        {selectedAppointment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Date</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {safeFormatDate(selectedAppointment.date, 'MMMM dd, yyyy')}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Time</h3>
                <p className="mt-1 text-sm text-gray-900">{selectedAppointment.time}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Client</h3>
                <p className="mt-1 text-sm text-gray-900">{selectedAppointment.clientName}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Staff</h3>
                <p className="mt-1 text-sm text-gray-900">{selectedAppointment.staffName}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Service</h3>
                <p className="mt-1 text-sm text-gray-900">{selectedAppointment.serviceName}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Centre</h3>
                <p className="mt-1 text-sm text-gray-900">{selectedAppointment.centreName}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <p className="mt-1">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedAppointment.status)}`}>
                    {selectedAppointment.status}
                  </span>
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Duration</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedAppointment.duration} minutes
                </p>
              </div>
            </div>
            
            {selectedAppointment.notes && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Notes</h3>
                <p className="mt-1 text-sm text-gray-900">{selectedAppointment.notes}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                onClick={() => setShowDetailsModal(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
              >
                Close
              </Button>
              <Button
                onClick={() => handleEdit(selectedAppointment)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-1"
              >
                <PencilIcon className="h-4 w-4" />
                Edit
              </Button>
              <Button
                onClick={() => handleDelete(selectedAppointment)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center gap-1"
              >
                <TrashIcon className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Delete"
      >
        <div className="p-4">
          <div className="flex items-center mb-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Delete Appointment</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Are you sure you want to delete this appointment? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => setShowDeleteModal(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export { AppointmentManagement };
