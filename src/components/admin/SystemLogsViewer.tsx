import { useState, useEffect, useRef } from 'react';
import { logger, type LogEntry } from '../../lib/logger';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  CheckCircleIcon,
  CodeBracketIcon,
  ArrowPathIcon,
  TrashIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';

const SystemLogsViewer = () => {
  const [filter, setFilter] = useState({
    level: [] as string[],
    category: [] as string[],
    component: '',
    autoScroll: true
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to logger updates
    const unsubscribe = logger.subscribe(() => {
      if (filter.autoScroll) {
        setTimeout(() => {
          logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    });

    return unsubscribe;
  }, [filter.autoScroll]);

  const getFilteredLogs = () => {
    return logger.getLogs({
      level: filter.level.length > 0 ? filter.level as LogEntry['level'][] : undefined,
      category: filter.category.length > 0 ? filter.category as LogEntry['category'][] : undefined,
      component: filter.component || undefined
    });
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'critical':
      case 'error':
        return <XCircleIcon className="w-4 h-4 text-red-500" />;
      case 'warn':
        return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />;
      case 'info':
        return <InformationCircleIcon className="w-4 h-4 text-blue-500" />;
      case 'debug':
        return <CodeBracketIcon className="w-4 h-4 text-gray-500" />;
      default:
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'warn':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'info':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'debug':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-green-50 text-green-700 border-green-200';
    }
  };

  const handleFilterChange = (type: string, value: string) => {
    setFilter(prev => {
      if (type === 'level') {
        const newLevel = prev.level.includes(value) 
          ? prev.level.filter(l => l !== value)
          : [...prev.level, value];
        return { ...prev, level: newLevel };
      } else if (type === 'category') {
        const newCategory = prev.category.includes(value)
          ? prev.category.filter(c => c !== value)
          : [...prev.category, value];
        return { ...prev, category: newCategory };
      } else if (type === 'component') {
        return { ...prev, component: value };
      }
      return prev;
    });
  };

  const clearLogs = () => {
    logger.clear();
  };

  const exportLogs = () => {
    const logsData = logger.export();
    const blob = new Blob([logsData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-logs-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const stats = logger.getStats();
  const filteredLogs = getFilteredLogs();

  return (
    <Card className="w-full">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <CodeBracketIcon className="w-6 h-6 text-gray-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">System Logs</h2>
              <p className="text-sm text-gray-600">
                Real-time system monitoring • {stats.total} total logs
                {stats.recentErrors > 0 && (
                  <span className="ml-2 text-red-600 font-medium">
                    • {stats.recentErrors} recent errors
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilter(prev => ({ ...prev, autoScroll: !prev.autoScroll }))}
              className={filter.autoScroll ? 'bg-green-50 border-green-200' : ''}
            >
              <ArrowPathIcon className={`w-4 h-4 mr-1 ${filter.autoScroll ? 'animate-spin' : ''}`} />
              Auto-scroll
            </Button>
            <Button variant="outline" size="sm" onClick={exportLogs}>
              <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={clearLogs}>
              <TrashIcon className="w-4 h-4 mr-1" />
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          {Object.entries(stats.byLevel).map(([level, count]) => (
            <div
              key={level}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                filter.level.includes(level) ? getLevelColor(level) : 'bg-gray-50 border-gray-200'
              }`}
              onClick={() => handleFilterChange('level', level)}
            >
              <div className="flex items-center space-x-2">
                {getLevelIcon(level)}
                <div>
                  <div className="text-sm font-medium capitalize">{level}</div>
                  <div className="text-lg font-bold">{count}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Category Filters */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {Object.keys(stats.byCategory).map(category => (
              <button
                key={category}
                onClick={() => handleFilterChange('category', category)}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  filter.category.includes(category)
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                }`}
              >
                {category} ({stats.byCategory[category]})
              </button>
            ))}
          </div>
        </div>

        {/* Component Filter */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Filter by component..."
            value={filter.component}
            onChange={(e) => setFilter(prev => ({ ...prev, component: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Logs Display */}
        <div className={`bg-gray-900 rounded-lg overflow-hidden ${isExpanded ? 'h-96' : 'h-64'}`}>
          <div className="h-full overflow-y-auto p-4 font-mono text-sm">
            {filteredLogs.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                No logs match the current filters
              </div>
            ) : (
              <>
                {filteredLogs.map((log) => (
                  <div key={log.id} className="mb-2 group">
                    <div className="flex items-start space-x-2 text-gray-300">
                      <span className="text-gray-500 text-xs whitespace-nowrap">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        log.level === 'error' || log.level === 'critical' ? 'bg-red-900 text-red-200' :
                        log.level === 'warn' ? 'bg-yellow-900 text-yellow-200' :
                        log.level === 'info' ? 'bg-blue-900 text-blue-200' :
                        'bg-gray-800 text-gray-400'
                      }`}>
                        {log.level.toUpperCase()}
                      </span>
                      <span className="text-purple-400 text-xs">
                        [{log.category}{log.component ? `/${log.component}` : ''}]
                      </span>
                      <span className="text-white flex-1">{log.message}</span>
                    </div>
                    {log.data && (
                      <div className="ml-20 mt-1 text-xs text-gray-400 group-hover:text-gray-300">
                        {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                      </div>
                    )}
                    {log.stack && (
                      <div className="ml-20 mt-1 text-xs text-red-400 opacity-70 group-hover:opacity-100">
                        {log.stack.split('\n').slice(0, 3).join('\n')}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-4 text-xs text-gray-500 flex justify-between">
          <span>Showing {filteredLogs.length} of {stats.total} logs</span>
          <span>Max {logger['maxLogs']} logs stored in memory</span>
        </div>
      </div>
    </Card>
  );
};

export default SystemLogsViewer; 