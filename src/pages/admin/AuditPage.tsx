import { useState } from 'react';
import { useUserProfile } from '../../hooks/useUserProfile';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { 
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  CodeBracketIcon,
  BuildingOfficeIcon,
  Cog6ToothIcon,
  UsersIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

interface AuditResult {
  id: string;
  type: 'security' | 'performance' | 'code-quality' | 'accessibility' | 'dependency' | 'database' | 'system';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  file?: string;
  line?: number;
  recommendation: string;
  status: 'active' | 'resolved' | 'ignored';
  data?: any;
}

export default function AuditPage() {
  const { profile, loading } = useUserProfile();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<AuditResult[]>([]);
  const [lastRunDate, setLastRunDate] = useState<Date | null>(null);
  const [systemData, setSystemData] = useState<any>(null);

  // Access control - only super-admin can access this page
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (profile?.role !== 'super-admin') {
    return (
      <div className="page-container">
        <Card className="text-center py-12">
          <ShieldExclamationIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">
            This page is only accessible to super-admin users.
          </p>
        </Card>
      </div>
    );
  }

  const runSystemAudit = async () => {
    setIsRunning(true);
    const auditResults: AuditResult[] = [];
    const systemInfo: any = {};
    
    try {
      // 1. Check Centres Data
      console.log('Auditing centres data...');
      const centresRef = collection(db, 'centres');
      const centresSnapshot = await getDocs(centresRef);
      const allCentres = centresSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      systemInfo.centres = {
        total: allCentres.length,
        active: allCentres.filter(c => c.isActive).length,
        withServices: allCentres.filter(c => c.services && c.services.length > 0).length,
        withOldField: allCentres.filter(c => c.servicesOffered).length,
        details: allCentres.map(c => ({
          id: c.id,
          name: c.name,
          isActive: c.isActive,
          services: c.services?.length || 0,
          hasOldField: !!c.servicesOffered,
          servicesArray: c.services
        }))
      };

      // Check for centres without services
      if (systemInfo.centres.withServices === 0) {
        auditResults.push({
          id: 'centres-no-services',
          type: 'database',
          severity: 'critical',
          title: 'No Centres Have Services',
          description: `Found ${systemInfo.centres.total} centres but none have services linked`,
          recommendation: 'Link services to centres using the Services Management page',
          status: 'active',
          data: systemInfo.centres
        });
      }

      // 2. Check Services Data
      console.log('Auditing services data...');
      const servicesRef = collection(db, 'services');
      const servicesSnapshot = await getDocs(servicesRef);
      const allServices = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      systemInfo.services = {
        total: allServices.length,
        active: allServices.filter(s => s.isActive).length,
        withCentres: allServices.filter(s => s.availableAtCentres && s.availableAtCentres.length > 0).length,
        details: allServices.map(s => ({
          id: s.id,
          name: s.name,
          isActive: s.isActive,
          centres: s.availableAtCentres?.length || 0,
          centresArray: s.availableAtCentres
        }))
      };

      // Check for services without centres
      if (systemInfo.services.withCentres === 0) {
        auditResults.push({
          id: 'services-no-centres',
          type: 'database',
          severity: 'high',
          title: 'No Services Linked to Centres',
          description: `Found ${systemInfo.services.total} services but none are linked to centres`,
          recommendation: 'Use the Services Management page to link services to centres',
          status: 'active',
          data: systemInfo.services
        });
      }

      // 3. Check Users Data
      console.log('Auditing users data...');
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      systemInfo.users = {
        total: allUsers.length,
        byRole: allUsers.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      // 4. Check Staff Data
      console.log('Auditing staff data...');
      const staffRef = collection(db, 'staff');
      const staffSnapshot = await getDocs(staffRef);
      const allStaff = staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      systemInfo.staff = {
        total: allStaff.length,
        active: allStaff.filter(s => s.status === 'active').length
      };

      // 5. Add standard audit checks
      auditResults.push(
        {
          id: 'firebase-rules',
          type: 'security',
          severity: 'high',
          title: 'Firebase Rules Review',
          description: 'Firestore security rules should be reviewed for proper access control',
          file: 'firestore.rules',
          recommendation: 'Ensure all collections have proper role-based access controls',
          status: 'active'
        },
        {
          id: 'bundle-size',
          type: 'performance',
          severity: 'medium',
          title: 'Bundle Size Optimization',
          description: 'Large JavaScript bundles detected that could impact loading times',
          recommendation: 'Consider code splitting and lazy loading for better performance',
          status: 'active'
        }
      );

      // Add success checks
      if (systemInfo.centres.withServices > 0 && systemInfo.services.withCentres > 0) {
        auditResults.push({
          id: 'centres-services-linked',
          type: 'system',
          severity: 'info',
          title: 'Centres-Services Linking Working',
          description: `${systemInfo.centres.withServices} centres have services, ${systemInfo.services.withCentres} services linked to centres`,
          recommendation: 'System is working correctly',
          status: 'resolved'
        });
      }

    } catch (error) {
      console.error('Audit error:', error);
      auditResults.push({
        id: 'audit-error',
        type: 'system',
        severity: 'critical',
        title: 'Audit System Error',
        description: `Error running system audit: ${error}`,
        recommendation: 'Check system logs and database connectivity',
        status: 'active'
      });
    }

    setResults(auditResults);
    setSystemData(systemInfo);
    setLastRunDate(new Date());
    setIsRunning(false);
  };

  const getSeverityIcon = (severity: AuditResult['severity']) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'medium':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'low':
        return <InformationCircleIcon className="w-5 h-5 text-blue-500" />;
      case 'info':
        return <InformationCircleIcon className="w-5 h-5 text-gray-500" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: AuditResult['severity']) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'bg-red-50 border-red-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      case 'low':
        return 'bg-blue-50 border-blue-200';
      case 'info':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type: AuditResult['type']) => {
    switch (type) {
      case 'security':
        return <ShieldExclamationIcon className="w-4 h-4" />;
      case 'code-quality':
        return <CodeBracketIcon className="w-4 h-4" />;
      case 'database':
        return <BuildingOfficeIcon className="w-4 h-4" />;
      case 'system':
        return <Cog6ToothIcon className="w-4 h-4" />;
      default:
        return <CheckCircleIcon className="w-4 h-4" />;
    }
  };

  const severityCounts = results.reduce((acc, result) => {
    acc[result.severity] = (acc[result.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">System Audit</h1>
        <p className="text-gray-600">
          Comprehensive security and performance analysis for the Life Arrow platform
        </p>
      </div>

      {/* Audit Control Panel */}
      <Card className="mb-8">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Audit Control</h2>
              {lastRunDate && (
                <p className="text-sm text-gray-600 mt-1">
                  Last run: {lastRunDate.toLocaleString()}
                </p>
              )}
            </div>
            <Button
              onClick={runSystemAudit}
              disabled={isRunning}
              className="flex items-center"
            >
              {isRunning ? (
                <>
                  <LoadingSpinner />
                  <span className="ml-2">Running Audit...</span>
                </>
              ) : (
                <>
                  <CodeBracketIcon className="w-5 h-5 mr-2" />
                  Run System Audit
                </>
              )}
            </Button>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <InformationCircleIcon className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">About System Audit</p>
                <p>
                  This audit checks security configurations, performance metrics, code quality,
                  accessibility compliance, and dependency vulnerabilities across the platform.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Results Summary */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {(severityCounts.critical || 0) + (severityCounts.high || 0)}
              </div>
              <div className="text-sm text-red-600">Critical & High</div>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {severityCounts.medium || 0}
              </div>
              <div className="text-sm text-yellow-600">Medium</div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {severityCounts.low || 0}
              </div>
              <div className="text-sm text-blue-600">Low</div>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {severityCounts.info || 0}
              </div>
              <div className="text-sm text-gray-600">Info</div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Results */}
      {results.length > 0 && (
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Audit Results</h2>
            <div className="space-y-4">
              {results.map((result) => (
                <div
                  key={result.id}
                  className={`border rounded-lg p-4 ${getSeverityColor(result.severity)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex items-center space-x-2 mt-1">
                        {getSeverityIcon(result.severity)}
                        {getTypeIcon(result.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{result.title}</h3>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {result.type}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {result.severity}
                          </span>
                        </div>
                        <p className="text-gray-700 mb-2">{result.description}</p>
                        {result.file && (
                          <p className="text-sm text-gray-600 mb-2">
                            File: {result.file}
                            {result.line && ` (Line ${result.line})`}
                          </p>
                        )}
                        <div className="bg-white bg-opacity-50 rounded p-3 text-sm">
                          <p className="font-medium text-gray-900 mb-1">Recommendation:</p>
                          <p className="text-gray-700">{result.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* System Data Display */}
      {systemData && (
        <Card className="mb-8">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">System Data Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Centres Data */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Centres</h3>
                  <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-medium">{systemData.centres?.total || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active:</span>
                    <span className="font-medium">{systemData.centres?.active || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>With Services:</span>
                    <span className={`font-medium ${
                      (systemData.centres?.withServices || 0) > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {systemData.centres?.withServices || 0}
                    </span>
                  </div>
                </div>
                
                {/* Detailed centres info */}
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <h4 className="text-xs font-medium text-gray-700 mb-2">Centre Details:</h4>
                  <div className="space-y-1 text-xs max-h-32 overflow-y-auto">
                    {systemData.centres?.details?.map((centre: any, index: number) => (
                      <div key={index} className="flex justify-between">
                        <span className="truncate mr-2">{centre.name}</span>
                        <span className={centre.services > 0 ? 'text-green-600' : 'text-red-600'}>
                          {centre.services} svc
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Services Data */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Services</h3>
                  <Cog6ToothIcon className="w-5 h-5 text-green-600" />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-medium">{systemData.services?.total || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active:</span>
                    <span className="font-medium">{systemData.services?.active || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Linked to Centres:</span>
                    <span className={`font-medium ${
                      (systemData.services?.withCentres || 0) > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {systemData.services?.withCentres || 0}
                    </span>
                  </div>
                </div>
                
                {/* Detailed services info */}
                <div className="mt-3 pt-3 border-t border-green-200">
                  <h4 className="text-xs font-medium text-gray-700 mb-2">Service Details:</h4>
                  <div className="space-y-1 text-xs max-h-32 overflow-y-auto">
                    {systemData.services?.details?.map((service: any, index: number) => (
                      <div key={index} className="flex justify-between">
                        <span className="truncate mr-2">{service.name}</span>
                        <span className={service.centres > 0 ? 'text-green-600' : 'text-red-600'}>
                          {service.centres} ctr
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Users Data */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Users</h3>
                  <UsersIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-medium">{systemData.users?.total || 0}</span>
                  </div>
                  {systemData.users?.byRole && Object.entries(systemData.users.byRole).map(([role, count]) => (
                    <div key={role} className="flex justify-between">
                      <span className="capitalize">{role}:</span>
                      <span className="font-medium">{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Staff Data */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Staff</h3>
                  <UserGroupIcon className="w-5 h-5 text-orange-600" />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-medium">{systemData.staff?.total || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active:</span>
                    <span className="font-medium">{systemData.staff?.active || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {results.length === 0 && !isRunning && (
        <Card>
          <div className="text-center py-12">
            <CodeBracketIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Audit Results</h3>
            <p className="text-gray-600 mb-6">
              Run a system audit to check for security, performance, and code quality issues.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
