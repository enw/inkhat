/**
 * Observability Port
 *
 * Defines the contract for collecting metrics, events, and monitoring
 * app and workflow execution.
 */

export type MetricType =
  | 'counter'    // Incrementing value (e.g., requests, errors)
  | 'gauge'      // Current value (e.g., active connections, memory)
  | 'histogram'  // Distribution of values (e.g., latency, sizes)
  | 'timer';     // Duration measurements

export type EventSeverity = 'debug' | 'info' | 'warn' | 'error' | 'critical';

/**
 * Metric data point
 */
export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>; // For grouping/filtering
  unit?: string; // e.g., 'ms', 'bytes', 'count'
}

/**
 * Event for logging significant occurrences
 */
export interface ObservabilityEvent {
  id: string;
  type: string; // e.g., 'app.launched', 'workflow.completed', 'error'
  severity: EventSeverity;
  timestamp: Date;
  message: string;
  data?: Record<string, any>;
  source?: {
    appId?: string;
    workflowId?: string;
    componentId?: string;
  };
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Trace for tracking execution flow
 */
export interface Trace {
  id: string;
  parentId?: string; // For nested traces
  name: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'running' | 'completed' | 'failed';
  metadata?: Record<string, any>;
}

/**
 * Health check result
 */
export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  message?: string;
  metadata?: Record<string, any>;
}

/**
 * App performance metrics
 */
export interface AppMetrics {
  appId: string;
  launchCount: number;
  totalRuntime: number; // milliseconds
  averageRuntime: number;
  lastLaunched?: Date;
  errorCount: number;
  commandExecutions: Map<string, number>; // command name -> count
}

/**
 * Workflow execution metrics
 */
export interface WorkflowMetrics {
  workflowId: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageDuration: number;
  lastExecuted?: Date;
  componentMetrics: Map<string, ComponentMetrics>; // componentId -> metrics
}

export interface ComponentMetrics {
  componentId: string;
  executionCount: number;
  averageDuration: number;
  errorCount: number;
}

/**
 * Storage operation metrics
 */
export interface StorageMetrics {
  readCount: number;
  writeCount: number;
  deleteCount: number;
  queryCount: number;
  averageReadTime: number;
  averageWriteTime: number;
  totalDataSize: number; // bytes
  errorCount: number;
}

/**
 * System resource metrics
 */
export interface SystemMetrics {
  timestamp: Date;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu?: {
    percentage: number;
  };
}

/**
 * Observability Port interface
 */
export interface ObservabilityPort {
  /**
   * Record a metric
   */
  recordMetric(metric: Metric): void;

  /**
   * Record multiple metrics at once
   */
  recordMetrics(metrics: Metric[]): void;

  /**
   * Log an event
   */
  logEvent(event: Omit<ObservabilityEvent, 'id' | 'timestamp'>): void;

  /**
   * Start a trace
   */
  startTrace(name: string, parentId?: string): Trace;

  /**
   * End a trace
   */
  endTrace(traceId: string, status: 'completed' | 'failed', metadata?: Record<string, any>): void;

  /**
   * Get metrics for time range
   */
  getMetrics(options: {
    name?: string;
    type?: MetricType;
    startTime?: Date;
    endTime?: Date;
    tags?: Record<string, string>;
  }): Promise<Metric[]>;

  /**
   * Get events for time range
   */
  getEvents(options: {
    type?: string;
    severity?: EventSeverity;
    startTime?: Date;
    endTime?: Date;
    source?: { appId?: string; workflowId?: string };
  }): Promise<ObservabilityEvent[]>;

  /**
   * Get app metrics
   */
  getAppMetrics(appId?: string): Promise<AppMetrics[]>;

  /**
   * Get workflow metrics
   */
  getWorkflowMetrics(workflowId?: string): Promise<WorkflowMetrics[]>;

  /**
   * Get storage metrics
   */
  getStorageMetrics(): Promise<StorageMetrics>;

  /**
   * Get system metrics
   */
  getSystemMetrics(): Promise<SystemMetrics>;

  /**
   * Run health checks
   */
  runHealthChecks(): Promise<HealthCheck[]>;

  /**
   * Clear old metrics/events (data retention)
   */
  clearOldData(olderThan: Date): Promise<void>;

  /**
   * Initialize observability system
   */
  initialize(): Promise<void>;

  /**
   * Shutdown and flush any pending data
   */
  shutdown(): Promise<void>;
}

/**
 * Helper for creating metrics
 */
export class MetricBuilder {
  static counter(name: string, value: number = 1, tags?: Record<string, string>): Metric {
    return {
      name,
      type: 'counter',
      value,
      timestamp: new Date(),
      tags,
      unit: 'count',
    };
  }

  static gauge(name: string, value: number, unit?: string, tags?: Record<string, string>): Metric {
    return {
      name,
      type: 'gauge',
      value,
      timestamp: new Date(),
      tags,
      unit,
    };
  }

  static timer(name: string, duration: number, tags?: Record<string, string>): Metric {
    return {
      name,
      type: 'timer',
      value: duration,
      timestamp: new Date(),
      tags,
      unit: 'ms',
    };
  }

  static histogram(name: string, value: number, unit?: string, tags?: Record<string, string>): Metric {
    return {
      name,
      type: 'histogram',
      value,
      timestamp: new Date(),
      tags,
      unit,
    };
  }
}
