import { useState, useRef, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { 
  UserIcon, 
  ArrowRightOnRectangleIcon,
  ChevronDownIcon 
} from '@heroicons/react/24/outline';
import { PersonalProfileEditor } from '../forms/PersonalProfileEditor';
import { Modal } from './Modal';
import type { UserProfile } from '../../types';

interface ProfileDropdownProps {
  user: UserProfile;
}

export function ProfileDropdown({ user }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleProfileClick = () => {
    setIsOpen(false);
    setShowProfileModal(true);
  };

  const handleProfileSuccess = () => {
    setShowProfileModal(false);
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Profile Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          {/* Avatar */}
          <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </span>
          </div>
          
          {/* User Info - Hidden on small screens */}
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-gray-900">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-500 capitalize">
              {user.role?.replace('-', ' ')}
            </p>
          </div>
          
          {/* Dropdown Arrow */}
          <ChevronDownIcon 
            className={`w-4 h-4 text-gray-500 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            {/* User Info - Visible on mobile */}
            <div className="sm:hidden px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user.role?.replace('-', ' ')}
              </p>
            </div>

            {/* Menu Items */}
            <button
              onClick={handleProfileClick}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <UserIcon className="w-4 h-4 mr-3 text-gray-500" />
              Edit My Profile
            </button>
            
            <div className="border-t border-gray-100 my-1"></div>
            
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4 mr-3 text-red-500" />
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Profile Editor Modal */}
      {showProfileModal && (
        <Modal 
          isOpen={showProfileModal} 
          onClose={() => setShowProfileModal(false)} 
          title="Edit My Profile"
          size="lg"
        >
          <PersonalProfileEditor onSuccess={handleProfileSuccess} />
        </Modal>
      )}
    </>
  );
} 
