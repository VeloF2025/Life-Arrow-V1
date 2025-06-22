import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserProfile } from './hooks/useUserProfile';

// Page imports
import LandingPage from './pages/LandingPage';
import { Dashboard as AdminDashboard } from './pages/admin/Dashboard';
import ClientDashboard from './pages/client/Dashboard';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import { RegistrationPage } from './pages/RegistrationPage';
import { RegistrationSuccessPage } from './pages/RegistrationSuccessPage';
import ProfileCompletionPage from './pages/ProfileCompletionPage';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route component
function ProtectedRoute({ 
  children,
  allowedRoles,
}: { 
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { isAuthenticated, profile, loading } = useUserProfile();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Check role-based access
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // Redirect to appropriate dashboard based on user role
    if (profile.role === 'client') {
      return <Navigate to="/client/dashboard" replace />;
    } else if (profile.role === 'admin' || profile.role === 'super-admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
  }
  
  return <>{children}</>;
}

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
            <ProtectedRoute>
              <ProfileCompletionPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Protected routes - Admin */}
        <Route 
          path="/admin/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'super-admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/*" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'super-admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Protected routes - Client */}
        <Route 
          path="/client/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['client']}>
              <ClientDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/client/*" 
          element={
            <ProtectedRoute allowedRoles={['client']}>
              <ClientDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Legacy routes - redirect to role-specific dashboards */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Navigate to="/client/dashboard" replace />
            </ProtectedRoute>
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
    </QueryClientProvider>
  );
}

export default App;
