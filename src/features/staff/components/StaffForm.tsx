import React from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Schema from '@/lib/db-schema';
import { Button } from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { serviceService } from '@/features/services/api/serviceService';
import { centreService } from '@/features/centres/api/centreService';

interface StaffFormProps {
  formData: Partial<Schema.UserDocument>;
  isEditing: boolean;
  submitting: boolean;
  error: string | null;
  photoPreview: string | null;
  password: string;
  confirmPassword: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onMultiSelectChange: (name: 'serviceIds' | 'centreIds', value: string[]) => void;
  onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onConfirmPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  onPhotoClick: () => void;
  onClearPhoto: () => void;
  onAvailabilityChange: (day: keyof Schema.Availability, field: keyof Schema.TimeSlot, value: string | boolean) => void;
}

export function StaffForm({
  formData,
  isEditing,
  submitting,
  error,
  photoPreview,
  password,
  confirmPassword,
  onInputChange,
  onMultiSelectChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  onCancel,
  onPhotoClick,
  onClearPhoto,
  onAvailabilityChange
}: StaffFormProps) {
  const { data: services, isLoading: isLoadingServices } = useQuery({ 
    queryKey: ['services'], 
    queryFn: serviceService.getAll 
  });
  const { data: centres, isLoading: isLoadingCentres } = useQuery({ 
    queryKey: ['centres'], 
    queryFn: centreService.getAll 
  });

  const serviceOptions = services?.map(s => ({ value: s.id, label: s.name })) || [];
  const centreOptions = centres?.map(c => ({ value: c.id, label: c.name })) || [];
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Photo upload section */}
        <div className="flex flex-col items-center">
          <div 
            onClick={onPhotoClick}
            className="h-32 w-32 rounded-full border-2 border-gray-300 flex items-center justify-center cursor-pointer overflow-hidden"
          >
            {photoPreview ? (
              <img 
                src={photoPreview} 
                alt="Staff photo preview" 
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-gray-500">Add Photo</span>
            )}
          </div>
          {photoPreview && (
            <button
              type="button"
              onClick={onClearPhoto}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              Remove Photo
            </button>
          )}
        </div>
        
        {/* Form fields */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName || ''}
              onChange={onInputChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName || ''}
              onChange={onInputChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email || ''}
              onChange={onInputChange}
              required
              disabled={isEditing}
              className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${isEditing ? 'bg-gray-100' : ''}`}
            />
            {isEditing && (
              <p className="mt-1 text-xs text-gray-500">Email cannot be changed.</p>
            )}
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone || ''}
              onChange={onInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="position" className="block text-sm font-medium text-gray-700">
              Position
            </label>
            <input
              type="text"
              id="position"
              name="position"
              value={formData.position || ''}
              onChange={onInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700">
              Department
            </label>
            <input
              type="text"
              id="department"
              name="department"
              value={formData.department || ''}
              onChange={onInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              id="role"
              name="role"
              value={formData.role || 'staff'}
              onChange={onInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          
          <div className="md:col-span-2">
            <MultiSelect
              label="Assignable Services"
              options={serviceOptions}
              value={formData.serviceIds || []}
              onChange={(value) => onMultiSelectChange('serviceIds', value)}
              isLoading={isLoadingServices}
              placeholder="Select services..."
            />
          </div>

          <div className="md:col-span-2">
            <MultiSelect
              label="Assignable Centres"
              options={centreOptions}
              value={formData.centreIds || []}
              onChange={(value) => onMultiSelectChange('centreIds', value)}
              isLoading={isLoadingCentres}
              placeholder="Select centres..."
            />
          </div>

          {/* Weekly Availability Section */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-medium text-gray-900">Weekly Availability</h3>
            <div className="mt-4 space-y-4">
              {Object.keys(formData.availability || {}).map((day) => (
                <div key={day} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div className="md:col-span-1">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.availability?.[day as keyof Schema.Availability]?.[0]?.isAvailable || false}
                        onChange={(e) => onAvailabilityChange(day as keyof Schema.Availability, 'isAvailable', e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 capitalize">{day}</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={formData.availability?.[day as keyof Schema.Availability]?.[0]?.start || ''}
                      onChange={(e) => onAvailabilityChange(day as keyof Schema.Availability, 'start', e.target.value)}
                      disabled={!formData.availability?.[day as keyof Schema.Availability]?.[0]?.isAvailable}
                      className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                    <span>-</span>
                    <input
                      type="time"
                      value={formData.availability?.[day as keyof Schema.Availability]?.[0]?.end || ''}
                      onChange={(e) => onAvailabilityChange(day as keyof Schema.Availability, 'end', e.target.value)}
                      disabled={!formData.availability?.[day as keyof Schema.Availability]?.[0]?.isAvailable}
                      className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              value={formData.bio || ''}
              onChange={onInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          
          {!isEditing && (
            <>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={password}
                  onChange={onPasswordChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={onConfirmPasswordChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className="flex justify-end space-x-3">
        <Button type="button" onClick={onCancel} variant="ghost">
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <LoadingSpinner size="sm" /> : isEditing ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
