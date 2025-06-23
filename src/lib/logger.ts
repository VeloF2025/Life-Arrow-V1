interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  category: 'component' | 'database' | 'auth' | 'navigation' | 'api' | 'booking' | 'system';
  component?: string;
  message: string;
  data?: any;
  stack?: string;
  userId?: string;
  userRole?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private listeners: ((logs: LogEntry[]) => void)[] = [];

  private createLogEntry(
    level: LogEntry['level'],
    category: LogEntry['category'],
    message: string,
    data?: any,
    component?: string
  ): LogEntry {
    return {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      category,
      component,
      message,
      data,
      stack: level === 'error' || level === 'critical' ? new Error().stack : undefined,
      userId: this.getCurrentUserId(),
      userRole: this.getCurrentUserRole()
    };
  }

  private getCurrentUserId(): string | undefined {
    try {
      // Try to get from localStorage or other state management
      return localStorage.getItem('currentUserId') || undefined;
    } catch {
      return undefined;
    }
  }

  private getCurrentUserRole(): string | undefined {
    try {
      return localStorage.getItem('currentUserRole') || undefined;
    } catch {
      return undefined;
    }
  }

  private addLog(entry: LogEntry) {
    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
    
    // Console output for development
    const consoleMethod = entry.level === 'error' || entry.level === 'critical' ? 'error' :
                         entry.level === 'warn' ? 'warn' : 'log';
    
    console[consoleMethod](
      `[${entry.timestamp.toISOString()}] [${entry.level.toUpperCase()}] [${entry.category}${entry.component ? `/${entry.component}` : ''}]`,
      entry.message,
      entry.data || ''
    );

    // Notify listeners
    this.listeners.forEach(listener => listener([...this.logs]));
  }

  // Public logging methods
  debug(category: LogEntry['category'], message: string, data?: any, component?: string) {
    this.addLog(this.createLogEntry('debug', category, message, data, component));
  }

  info(category: LogEntry['category'], message: string, data?: any, component?: string) {
    this.addLog(this.createLogEntry('info', category, message, data, component));
  }

  warn(category: LogEntry['category'], message: string, data?: any, component?: string) {
    this.addLog(this.createLogEntry('warn', category, message, data, component));
  }

  error(category: LogEntry['category'], message: string, data?: any, component?: string) {
    this.addLog(this.createLogEntry('error', category, message, data, component));
  }

  critical(category: LogEntry['category'], message: string, data?: any, component?: string) {
    this.addLog(this.createLogEntry('critical', category, message, data, component));
  }

  // Specialized logging methods
  componentMount(component: string, props?: any) {
    this.info('component', `${component} mounted`, props, component);
  }

  componentUnmount(component: string) {
    this.info('component', `${component} unmounted`, undefined, component);
  }

  componentError(component: string, error: Error, errorInfo?: any) {
    this.error('component', `${component} error: ${error.message}`, {
      error: error.message,
      stack: error.stack,
      errorInfo
    }, component);
  }

  databaseQuery(collection: string, operation: string, data?: any) {
    this.debug('database', `${operation} on ${collection}`, data);
  }

  databaseError(collection: string, operation: string, error: Error) {
    this.error('database', `${operation} failed on ${collection}: ${error.message}`, {
      error: error.message,
      stack: error.stack
    });
  }

  authEvent(event: string, data?: any) {
    this.info('auth', event, data);
  }

  navigationEvent(from: string, to: string, data?: any) {
    this.info('navigation', `Navigating from ${from} to ${to}`, data);
  }

  bookingEvent(event: string, data?: any) {
    this.info('booking', event, data);
  }

  apiCall(endpoint: string, method: string, data?: any) {
    this.debug('api', `${method} ${endpoint}`, data);
  }

  apiError(endpoint: string, method: string, error: Error) {
    this.error('api', `${method} ${endpoint} failed: ${error.message}`, {
      error: error.message,
      stack: error.stack
    });
  }

  // Listener management
  subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Get logs
  getLogs(filter?: {
    level?: LogEntry['level'][];
    category?: LogEntry['category'][];
    component?: string;
    since?: Date;
  }): LogEntry[] {
    let filtered = [...this.logs];

    if (filter) {
      if (filter.level) {
        filtered = filtered.filter(log => filter.level!.includes(log.level));
      }
      if (filter.category) {
        filtered = filtered.filter(log => filter.category!.includes(log.category));
      }
      if (filter.component) {
        filtered = filtered.filter(log => log.component === filter.component);
      }
      if (filter.since) {
        filtered = filtered.filter(log => log.timestamp >= filter.since!);
      }
    }

    return filtered;
  }

  // Clear logs
  clear() {
    this.logs = [];
    this.listeners.forEach(listener => listener([]));
  }

  // Export logs
  export(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Get statistics
  getStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      byComponent: {} as Record<string, number>,
      recentErrors: this.logs.filter(log => 
        (log.level === 'error' || log.level === 'critical') &&
        log.timestamp > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
      ).length
    };

    this.logs.forEach(log => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
      if (log.component) {
        stats.byComponent[log.component] = (stats.byComponent[log.component] || 0) + 1;
      }
    });

    return stats;
  }
}

// Create singleton instance
export const logger = new Logger();

// React hook for using logger in components
export const useLogger = () => {
  return logger;
};

// Export types
export type { LogEntry };

// Auto-log unhandled errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.critical('system', `Unhandled error: ${event.error?.message || event.message}`, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error?.stack
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.critical('system', `Unhandled promise rejection: ${event.reason}`, {
      reason: event.reason
    });
  });

  // Log system startup
  logger.info('system', 'Logger system initialized', {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  });
  
  // Add some demo logs for testing
  logger.debug('system', 'Debug log test - System ready for monitoring');
  logger.info('component', 'Component system online');
  logger.warn('booking', 'Booking system monitoring active - Check centre availability');
  logger.info('database', 'Database connection monitoring started');
} 