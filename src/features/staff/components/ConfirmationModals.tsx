import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import * as Schema from '@/lib/db-schema';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText = 'Cancel',
  isDestructive = false
}: ConfirmationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6 z-50">
          <div className="flex items-start">
            {isDestructive && (
              <div className="flex-shrink-0 mr-3">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
              <p className="mt-2 text-sm text-gray-500">{message}</p>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <Button onClick={onClose} variant="ghost">
              {cancelText}
            </Button>
            <Button 
              onClick={onConfirm} 
              variant={isDestructive ? 'destructive' : 'default'}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

interface DeleteStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  staff: Schema.UserDocument | null;
}

export function DeleteStaffModal({
  isOpen,
  onClose,
  onConfirm,
  staff
}: DeleteStaffModalProps) {
  if (!staff) return null;
  
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Staff Member"
      message={`Are you sure you want to delete ${staff.firstName} ${staff.lastName}? This action cannot be undone.`}
      confirmText="Delete"
      isDestructive={true}
    />
  );
}

interface PromoteStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  staff: Schema.UserDocument | null;
}

export function PromoteStaffModal({
  isOpen,
  onClose,
  onConfirm,
  staff
}: PromoteStaffModalProps) {
  if (!staff) return null;
  
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Promote to Admin"
      message={`Are you sure you want to promote ${staff.firstName} ${staff.lastName} to admin? This will grant them additional permissions.`}
      confirmText="Promote"
    />
  );
}

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  staff: Schema.UserDocument | null;
}

export function PasswordResetModal({
  isOpen,
  onClose,
  onConfirm,
  staff
}: PasswordResetModalProps) {
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    onConfirm(password);
    setPassword('');
    setConfirmPassword('');
    setError(null);
  };
  
  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    setError(null);
    onClose();
  };
  
  if (!staff) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6 z-50">
          <h3 className="text-lg font-medium text-gray-900">Reset Password</h3>
          <p className="mt-2 text-sm text-gray-500">
            Enter a new password for {staff.firstName} {staff.lastName}.
          </p>
          
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button type="button" onClick={handleClose} variant="ghost">
                Cancel
              </Button>
              <Button type="submit">
                Reset Password
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
}
