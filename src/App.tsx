import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useUserProfile } from './hooks/useUserProfile';
import { Permissions } from './lib/permissions';
import PermissionProtectedRoute from './components/auth/PermissionProtectedRoute';

// Admin pages
import MigrationPage from './pages/admin/MigrationPage';

// Page imports
import LandingPage from './pages/LandingPage';
import { Dashboard as AdminDashboard } from './pages/admin/Dashboard';
import ClientDashboard from './pages/client/Dashboard';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import { RegistrationPage } from './pages/RegistrationPage';
import { RegistrationSuccessPage } from './pages/RegistrationSuccessPage';
import ProfileCompletionPage from './pages/ProfileCompletionPage';
import AppointmentPage from './pages/AppointmentPage';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Global styles
import './index.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Note: ProtectedRoute has been replaced by PermissionProtectedRoute
// This legacy component has been removed as part of the RBAC migration

// Public Route component (redirect if already authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, profile, loading } = useUserProfile();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (isAuthenticated && profile) {
    // Redirect based on user role
    if (profile.role === 'client') {
      return <Navigate to="/client/dashboard" replace />;
    } else if (profile.role === 'admin' || profile.role === 'super-admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
  }
  
  return <>{children}</>;
}

function AppContent() {
  return (
    <div className="min-h-screen w-full bg-gray-50">
      <Routes>
        {/* Public routes */}
        <Route 
          path="/" 
          element={
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          } 
        />
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } 
        />
        <Route 
          path="/signup" 
          element={
            <PublicRoute>
              <SignupPage />
            </PublicRoute>
          } 
        />
        <Route 
          path="/register" 
          element={
            <PublicRoute>
              <RegistrationPage />
            </PublicRoute>
          } 
        />
        <Route 
          path="/registration-success" 
          element={<RegistrationSuccessPage />} 
        />
        
        {/* Profile completion route - accessible to all authenticated users */}
        <Route 
          path="/profile/complete" 
          element={
            <PermissionProtectedRoute>
              <ProfileCompletionPage />
            </PermissionProtectedRoute>
          } 
        />
        
        {/* Appointments route - accessible to all authenticated users with appropriate permissions */}
        <Route 
          path="/appointments" 
          element={
            <PermissionProtectedRoute requiredPermission={Permissions.VIEW_OWN_APPOINTMENTS}>
              <AppointmentPage />
            </PermissionProtectedRoute>
          } 
        />
        
        {/* Protected routes - Admin */}
        <Route 
          path="/admin/dashboard" 
          element={
            <PermissionProtectedRoute 
              requiredPermissions={[
                Permissions.VIEW_STAFF,
                Permissions.VIEW_CLIENTS,
                Permissions.VIEW_SERVICES
              ]}
              requireAll={false}
            >
              <AdminDashboard />
            </PermissionProtectedRoute>
          } 
        />
        {/* Admin Migration Page */}
        <Route 
          path="/admin/migration" 
          element={
            <PermissionProtectedRoute 
              requiredPermission={Permissions.MANAGE_SYSTEM}
            >
              <MigrationPage />
            </PermissionProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin/*" 
          element={
            <PermissionProtectedRoute 
              requiredPermissions={[
                Permissions.VIEW_STAFF,
                Permissions.VIEW_CLIENTS,
                Permissions.VIEW_SERVICES
              ]}
              requireAll={false}
            >
              <AdminDashboard />
            </PermissionProtectedRoute>
          } 
        />
        
        {/* Protected routes - Client */}
        <Route 
          path="/client/dashboard" 
          element={
            <PermissionProtectedRoute requiredPermission={Permissions.VIEW_OWN_APPOINTMENTS}>
              <ClientDashboard />
            </PermissionProtectedRoute>
          } 
        />
        <Route 
          path="/client/*" 
          element={
            <PermissionProtectedRoute requiredPermission={Permissions.VIEW_OWN_APPOINTMENTS}>
              <ClientDashboard />
            </PermissionProtectedRoute>
          } 
        />
        
        {/* Legacy routes - redirect to role-specific dashboards */}
        <Route 
          path="/dashboard" 
          element={
            <PermissionProtectedRoute>
              <Navigate to="/client/dashboard" replace />
            </PermissionProtectedRoute>
          } 
        />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
      </Router>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
