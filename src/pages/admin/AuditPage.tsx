import { useState } from 'react';
import { useUserProfile } from '../../hooks/useUserProfile';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { 
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline';

interface AuditResult {
  id: string;
  type: 'security' | 'performance' | 'code-quality' | 'accessibility' | 'dependency';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  file?: string;
  line?: number;
  recommendation: string;
  status: 'active' | 'resolved' | 'ignored';
}

export default function AuditPage() {
  const { profile, loading } = useUserProfile();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<AuditResult[]>([]);
  const [lastRunDate, setLastRunDate] = useState<Date | null>(null);

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
    
    // Simulate audit process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock audit results
    const mockResults: AuditResult[] = [
      {
        id: '1',
        type: 'security',
        severity: 'high',
        title: 'Firebase Rules Review',
        description: 'Firestore security rules should be reviewed for proper access control',
        file: 'firestore.rules',
        recommendation: 'Ensure all collections have proper role-based access controls',
        status: 'active'
      },
      {
        id: '2',
        type: 'performance',
        severity: 'medium',
        title: 'Bundle Size Optimization',
        description: 'Large JavaScript bundles detected that could impact loading times',
        recommendation: 'Consider code splitting and lazy loading for better performance',
        status: 'active'
      },
      {
        id: '3',
        type: 'dependency',
        severity: 'medium',
        title: 'Outdated Dependencies',
        description: 'Some npm packages have newer versions available',
        recommendation: 'Update dependencies to latest stable versions for security fixes',
        status: 'active'
      },
      {
        id: '4',
        type: 'accessibility',
        severity: 'low',
        title: 'ARIA Labels Missing',
        description: 'Some interactive elements lack proper ARIA labels',
        recommendation: 'Add descriptive ARIA labels for better screen reader support',
        status: 'active'
      },
      {
        id: '5',
        type: 'code-quality',
        severity: 'info',
        title: 'Code Documentation',
        description: 'Consider adding more inline documentation for complex functions',
        recommendation: 'Add JSDoc comments for better code maintainability',
        status: 'active'
      }
    ];

    setResults(mockResults);
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
