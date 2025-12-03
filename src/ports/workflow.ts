/**
 * Workflow and Process Definition Port
 *
 * Defines the contract for visual process design, component-based app building,
 * and workflow execution.
 */

export type ComponentType =
  | 'input'      // User input components (text, select, date)
  | 'action'     // Actions (API calls, storage operations)
  | 'logic'      // Logic nodes (conditions, loops, transforms)
  | 'output'     // Output/display components
  | 'trigger'    // Entry points (scheduled, event-driven)
  | 'container'; // Layout/grouping components

export type DataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'object'
  | 'array'
  | 'any';

/**
 * Port definition for component inputs/outputs
 */
export interface ComponentPort {
  id: string;
  name: string;
  type: DataType;
  required: boolean;
  description?: string;
  defaultValue?: any;
}

/**
 * Component definition in the workflow
 */
export interface WorkflowComponent {
  id: string;
  type: ComponentType;
  name: string;
  description?: string;

  // Component-specific configuration
  config: Record<string, any>;

  // Input and output ports
  inputs: ComponentPort[];
  outputs: ComponentPort[];

  // Position in visual editor (for TUI layout)
  position: { x: number; y: number };

  // Metadata
  metadata?: {
    color?: string;
    icon?: string;
    tags?: string[];
  };
}

/**
 * Connection between components
 */
export interface WorkflowConnection {
  id: string;
  sourceComponentId: string;
  sourcePortId: string;
  targetComponentId: string;
  targetPortId: string;

  // Optional transform/mapping
  transform?: {
    type: 'direct' | 'map' | 'filter' | 'custom';
    expression?: string; // For custom transforms
  };
}

/**
 * Complete workflow definition
 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;

  // Workflow structure
  components: WorkflowComponent[];
  connections: WorkflowConnection[];

  // Workflow metadata
  metadata: {
    author?: string;
    created: Date;
    modified: Date;
    tags?: string[];
    category?: string;
  };

  // App generation settings
  appSettings?: {
    id: string;
    name: string;
    description: string;
    version: string;
  };
}

/**
 * Workflow execution context
 */
export interface WorkflowExecutionContext {
  workflowId: string;
  executionId: string;
  startTime: Date;
  state: 'running' | 'paused' | 'completed' | 'failed';

  // Component execution states
  componentStates: Map<string, ComponentExecutionState>;

  // Data flow between components
  dataFlow: Map<string, any>; // componentId -> output data

  // Execution metrics
  metrics: {
    componentExecutions: number;
    totalDuration: number;
    errors: number;
  };
}

export interface ComponentExecutionState {
  componentId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
  inputData?: any;
  outputData?: any;
}

/**
 * Component template for reusable building blocks
 */
export interface ComponentTemplate {
  type: ComponentType;
  name: string;
  description: string;

  // Default configuration
  defaultConfig: Record<string, any>;

  // Port definitions
  inputs: Omit<ComponentPort, 'id'>[];
  outputs: Omit<ComponentPort, 'id'>[];

  // Validation schema (optional)
  schema?: any; // Could use Zod schema

  // Code generation template
  codeTemplate?: {
    imports?: string[];
    implementation: string; // Template string for code gen
  };

  // UI rendering info
  uiMetadata?: {
    icon?: string;
    color?: string;
    category?: string;
  };
}

/**
 * Port for workflow management operations
 */
export interface WorkflowPort {
  /**
   * Create a new workflow
   */
  createWorkflow(definition: Omit<WorkflowDefinition, 'id' | 'metadata'>): Promise<WorkflowDefinition>;

  /**
   * Update an existing workflow
   */
  updateWorkflow(id: string, definition: Partial<WorkflowDefinition>): Promise<WorkflowDefinition>;

  /**
   * Delete a workflow
   */
  deleteWorkflow(id: string): Promise<void>;

  /**
   * Get workflow by ID
   */
  getWorkflow(id: string): Promise<WorkflowDefinition | null>;

  /**
   * List all workflows
   */
  listWorkflows(): Promise<WorkflowDefinition[]>;

  /**
   * Validate workflow (check for cycles, disconnected components, etc.)
   */
  validateWorkflow(definition: WorkflowDefinition): Promise<{ valid: boolean; errors: string[] }>;

  /**
   * Execute a workflow
   */
  executeWorkflow(id: string, inputs?: Record<string, any>): Promise<WorkflowExecutionContext>;

  /**
   * Get component templates
   */
  getComponentTemplates(): Promise<ComponentTemplate[]>;

  /**
   * Register a new component template
   */
  registerComponentTemplate(template: ComponentTemplate): Promise<void>;
}
