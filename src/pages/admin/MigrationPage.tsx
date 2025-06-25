import React, { useState } from 'react';
import { migrationService } from '../../lib/migration';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';
import { Permissions } from '../../lib/permissions';
import { usePermissions } from '../../hooks/usePermissions';

interface MigrationStatus {
  users: number;
  services: number;
  appointments: number;
  roles: number;
  permissions: number;
}

export function MigrationPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [step, setStep] = useState<string | null>(null);

  // Check if user has permission to manage system
  const hasPermission = can(Permissions.MANAGE_SYSTEM);

  const handleMigrateUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      setStep('users');
      
      const count = await migrationService.migrateUsers();
      
      setStatus(prev => ({
        ...prev || { services: 0, appointments: 0, roles: 0, permissions: 0 },
        users: count
      }));
      
      setStep(null);
    } catch (err) {
      console.error('Error migrating users:', err);
      setError('Failed to migrate users: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateServices = async () => {
    try {
      setLoading(true);
      setError(null);
      setStep('services');
      
      const count = await migrationService.migrateServices();
      
      setStatus(prev => ({
        ...prev || { users: 0, appointments: 0, roles: 0, permissions: 0 },
        services: count
      }));
      
      setStep(null);
    } catch (err) {
      console.error('Error migrating services:', err);
      setError('Failed to migrate services: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      setStep('appointments');
      
      const count = await migrationService.migrateAppointments();
      
      setStatus(prev => ({
        ...prev || { users: 0, services: 0, roles: 0, permissions: 0 },
        appointments: count
      }));
      
      setStep(null);
    } catch (err) {
      console.error('Error migrating appointments:', err);
      setError('Failed to migrate appointments: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      setStep('roles');
      
      const count = await migrationService.createSystemRoles();
      
      setStatus(prev => ({
        ...prev || { users: 0, services: 0, appointments: 0, permissions: 0 },
        roles: count
      }));
      
      setStep(null);
    } catch (err) {
      console.error('Error creating roles:', err);
      setError('Failed to create roles: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePermissions = async () => {
    try {
      setLoading(true);
      setError(null);
      setStep('permissions');
      
      const count = await migrationService.createSystemPermissions();
      
      setStatus(prev => ({
        ...prev || { users: 0, services: 0, appointments: 0, roles: 0 },
        permissions: count
      }));
      
      setStep(null);
    } catch (err) {
      console.error('Error creating permissions:', err);
      setError('Failed to create permissions: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateAll = async () => {
    try {
      setLoading(true);
      setError(null);
      setStep('all');
      
      const result = await migrationService.migrateAll();
      setStatus(result);
      
      setStep(null);
    } catch (err) {
      console.error('Error in full migration:', err);
      setError('Failed to complete migration: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  if (!hasPermission) {
    return (
      <AdminLayout>
        <div className="p-6">
          <Alert type="error" title="Access Denied">
            You do not have permission to access this page.
          </Alert>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-6">Database Migration</h1>
        
        <Card className="mb-6">
          <div className="p-4">
            <h2 className="text-lg font-medium mb-4">Migration Status</h2>
            
            {error && (
              <Alert type="error" title="Error" className="mb-4">
                {error}
              </Alert>
            )}
            
            {status && (
              <div className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-500">Users</div>
                  <div className="text-2xl font-semibold">{status.users}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-500">Services</div>
                  <div className="text-2xl font-semibold">{status.services}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-500">Appointments</div>
                  <div className="text-2xl font-semibold">{status.appointments}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-500">Roles</div>
                  <div className="text-2xl font-semibold">{status.roles}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="text-sm text-gray-500">Permissions</div>
                  <div className="text-2xl font-semibold">{status.permissions}</div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button
                onClick={handleCreateRoles}
                disabled={loading}
                variant="secondary"
              >
                {loading && step === 'roles' ? 'Creating Roles...' : 'Step 1: Create Roles'}
              </Button>
              
              <Button
                onClick={handleCreatePermissions}
                disabled={loading}
                variant="secondary"
              >
                {loading && step === 'permissions' ? 'Creating Permissions...' : 'Step 2: Create Permissions'}
              </Button>
              
              <Button
                onClick={handleMigrateUsers}
                disabled={loading}
                variant="secondary"
              >
                {loading && step === 'users' ? 'Migrating Users...' : 'Step 3: Migrate Users'}
              </Button>
              
              <Button
                onClick={handleMigrateServices}
                disabled={loading}
                variant="secondary"
              >
                {loading && step === 'services' ? 'Migrating Services...' : 'Step 4: Migrate Services'}
              </Button>
              
              <Button
                onClick={handleMigrateAppointments}
                disabled={loading}
                variant="secondary"
              >
                {loading && step === 'appointments' ? 'Migrating Appointments...' : 'Step 5: Migrate Appointments'}
              </Button>
              
              <Button
                onClick={handleMigrateAll}
                disabled={loading}
                variant="primary"
              >
                {loading && step === 'all' ? 'Running Full Migration...' : 'Run Full Migration'}
              </Button>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="p-4">
            <h2 className="text-lg font-medium mb-4">Migration Information</h2>
            
            <div className="prose max-w-none">
              <p>
                This page allows you to migrate data from the old database structure to the new unified schema.
                The migration process is designed to be non-destructive and will not delete any existing data.
              </p>
              
              <p>
                <strong>Migration Steps:</strong>
              </p>
              
              <ol>
                <li><strong>Create Roles:</strong> Creates system roles in the new schema.</li>
                <li><strong>Create Permissions:</strong> Creates system permissions in the new schema.</li>
                <li><strong>Migrate Users:</strong> Migrates users from old collections to the new unified users collection.</li>
                <li><strong>Migrate Services:</strong> Migrates services to the new schema.</li>
                <li><strong>Migrate Appointments:</strong> Migrates appointments to the new schema.</li>
              </ol>
              
              <p>
                <strong>Full Migration:</strong> Runs all steps in the correct order.
              </p>
              
              <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 mt-4">
                <p className="text-yellow-800">
                  <strong>Important:</strong> It is recommended to back up your database before running the migration.
                  While the migration is designed to be safe, unexpected issues may occur.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}

export default MigrationPage;
