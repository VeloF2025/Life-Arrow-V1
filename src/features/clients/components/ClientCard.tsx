import React from 'react';
import { 
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CalendarDaysIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LinkIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { Button } from '@/components/ui/Button';
import type { Client } from '@/types';
import HighlightedText from './HighlightedText';

interface ClientCardProps {
  client: Client;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewDetails: () => void;
  onViewAppointments: () => void;
  onBookAppointment: () => void;
  onLinkUser: () => void;
  canEdit: boolean;
  canDelete: boolean;
  searchTerm?: string;
}

export function ClientCard({
  client,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onViewDetails,
  onViewAppointments,
  onBookAppointment,
  onLinkUser,
  canEdit,
  canDelete,
  searchTerm = ''
}: ClientCardProps) {
  // Helper function to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'pending-verification':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date helper
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Card Header */}
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center mb-4 sm:mb-0">
            <div className="flex-shrink-0">
              {client.photoUrl ? (
                <img
                  src={client.photoUrl}
                  alt={`${client.firstName} ${client.lastName}`}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-700 font-medium text-lg">
                    {client.firstName?.[0]}{client.lastName?.[0]}
                  </span>
                </div>
              )}
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                <HighlightedText 
                  text={`${client.firstName || ''} ${client.lastName || ''}`} 
                  highlight={searchTerm} 
                  className="bg-yellow-200 rounded-sm"
                />
              </h3>
              <div className="flex items-center mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
                  {client.status.replace('-', ' ')}
                </span>
                <span className="text-sm text-gray-500 ml-2">
                  ID: {client.id.substring(0, 8)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onViewDetails}
              className="flex items-center"
            >
              <EyeIcon className="w-4 h-4 mr-1" />
              Details
            </Button>
            
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="flex items-center"
              >
                <PencilIcon className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={onViewAppointments}
              className="flex items-center"
            >
              <CalendarDaysIcon className="w-4 h-4 mr-1" />
              Appointments
            </Button>
            
            <Button
              variant="primary"
              size="sm"
              onClick={onBookAppointment}
              className="flex items-center"
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Book Appointment
            </Button>
            
            {canDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="flex items-center text-red-600 hover:text-red-700"
              >
                <TrashIcon className="w-4 h-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
        
        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="flex items-center mb-4">
            <PhoneIcon className="w-5 h-5 text-gray-400 mr-2" />
            <span className="text-gray-600">
              <HighlightedText 
                text={client.phone || 'No phone number'} 
                highlight={searchTerm} 
                className="bg-yellow-200 rounded-sm"
              />
            </span>
          </div>
          <div className="flex items-center mb-4">
            <EnvelopeIcon className="w-5 h-5 text-gray-400 mr-2" />
            <span className="text-gray-600">
              <HighlightedText 
                text={client.email || 'No email address'} 
                highlight={searchTerm} 
                className="bg-yellow-200 rounded-sm"
              />
            </span>
          </div>
          <div className="flex items-center">
            <MapPinIcon className="w-5 h-5 text-gray-400 mr-2" />
            <span className="text-gray-600">
              {client.address ? (
                <HighlightedText 
                  text={`${client.address}, ${client.city || ''} ${client.state || ''} ${client.postalCode || ''}`} 
                  highlight={searchTerm} 
                  className="bg-yellow-200 rounded-sm"
                />
              ) : 'No address'}
            </span>
          </div>
        </div>
        
        {/* Expand/Collapse Button */}
        <button
          onClick={onToggleExpand}
          className="flex items-center justify-center w-full mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600 hover:text-gray-900"
        >
          {isExpanded ? (
            <>
              <ChevronUpIcon className="w-5 h-5 mr-1" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDownIcon className="w-5 h-5 mr-1" />
              Show More
            </>
          )}
        </button>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 sm:px-6 pb-6 border-t border-gray-200 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Personal Information</h4>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Gender</dt>
                  <dd className="text-sm text-gray-900">{client.gender || 'Not specified'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                  <dd className="text-sm text-gray-900">{client.dateOfBirth || 'Not specified'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Occupation</dt>
                  <dd className="text-sm text-gray-900">
                    <HighlightedText 
                      text={client.occupation || 'Not specified'} 
                      highlight={searchTerm} 
                      className="bg-yellow-200 rounded-sm"
                    />
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Company</dt>
                  <dd className="text-sm text-gray-900">
                    <HighlightedText 
                      text={client.company || 'Not specified'} 
                      highlight={searchTerm} 
                      className="bg-yellow-200 rounded-sm"
                    />
                  </dd>
                </div>
              </dl>
            </div>
            
            {/* Address Information */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Address</h4>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Address Line 1</dt>
                  <dd className="text-sm text-gray-900">{client.address1 || 'Not specified'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Address Line 2</dt>
                  <dd className="text-sm text-gray-900">{client.address2 || 'Not specified'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Suburb</dt>
                  <dd className="text-sm text-gray-900">{client.suburb || 'Not specified'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Postal Code</dt>
                  <dd className="text-sm text-gray-900">{client.postalCode || 'Not specified'}</dd>
                </div>
              </dl>
            </div>
            
            {/* Administrative Information */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Administrative</h4>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Registration Date</dt>
                  <dd className="text-sm text-gray-900">{formatDate(client.registrationDate)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Last Activity</dt>
                  <dd className="text-sm text-gray-900">{formatDate(client.lastActivity)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Centre</dt>
                  <dd className="text-sm text-gray-900">{client.myNearestCentre || 'Not specified'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">User Account</dt>
                  <dd className="text-sm text-gray-900">
                    {client.userId ? (
                      <span className="text-green-600">Linked</span>
                    ) : (
                      <button
                        onClick={onLinkUser}
                        className="text-primary-600 hover:text-primary-700 flex items-center"
                      >
                        <LinkIcon className="w-4 h-4 mr-1" />
                        Link User
                      </button>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
            
            {/* Additional Information */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Additional Information</h4>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Marital Status</dt>
                  <dd className="text-sm text-gray-900">{client.maritalStatus || 'Not specified'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Employment Status</dt>
                  <dd className="text-sm text-gray-900">{client.employmentStatus || 'Not specified'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Preferred Contact</dt>
                  <dd className="text-sm text-gray-900">{client.preferredMethodOfContact || 'Not specified'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Referrer</dt>
                  <dd className="text-sm text-gray-900">{client.referrerName || 'Not specified'}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientCard;
