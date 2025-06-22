import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Button } from '../ui/Button';
import { ArrowRightOnRectangleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import type { UserProfile } from '../../types';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  user?: UserProfile | null;
  showDebugInfo?: boolean;
  actions?: React.ReactNode;
}

export default function DashboardHeader({ 
  title, 
  subtitle, 
  user, 
  showDebugInfo = false,
  actions 
}: DashboardHeaderProps) {
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isSuperAdmin = user?.role === 'super-admin';

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {title}
          </h1>
          <div className="mt-2 flex items-center space-x-2">
            <p className="text-gray-600">
              {subtitle || (user ? `Welcome back, ${user.firstName} ${user.lastName}` : 'Welcome')}
            </p>
            
            {showDebugInfo && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                DEBUG: Role = {user?.role || 'undefined'}
              </span>
            )}
            
            {isSuperAdmin && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                <ShieldCheckIcon className="w-3 h-3 mr-1" />
                Super Admin
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {actions}
          <Button
            onClick={handleLogout}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>
      </div>
    </div>
  );
} 