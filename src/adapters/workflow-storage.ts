/**
 * Workflow Storage Adapter
 *
 * Implementation of WorkflowPort using the StoragePort for persistence.
 */

import type { StoragePort } from '@ports/storage.js';
import type {
  WorkflowPort,
  WorkflowDefinition,
  WorkflowExecutionContext,
  ComponentTemplate,
  WorkflowComponent,
  WorkflowConnection,
} from '@ports/workflow.js';
import { builtInComponentTemplates } from './workflow-templates.js';

export class WorkflowStorageAdapter implements WorkflowPort {
  private storage: StoragePort<any>;
  private templates: Map<string, ComponentTemplate> = new Map();

  constructor(storage: StoragePort<any>) {
    this.storage = storage;

    // Load built-in templates
    for (const template of builtInComponentTemplates) {
      this.templates.set(`${template.type}:${template.name}`, template);
    }
  }

  async createWorkflow(
    definition: Omit<WorkflowDefinition, 'id' | 'metadata'>,
  ): Promise<WorkflowDefinition> {
    const id = this.generateId('workflow');
    const now = new Date();

    const workflow: WorkflowDefinition = {
      ...definition,
      id,
      metadata: {
        created: now,
        modified: now,
      },
    };

    await this.storage.write(`workflows/${id}/definition`, workflow);
    return workflow;
  }

  async updateWorkflow(id: string, updates: Partial<WorkflowDefinition>): Promise<WorkflowDefinition> {
    const existing = await this.getWorkflow(id);
    if (!existing) {
      throw new Error(`Workflow not found: ${id}`);
    }

    const updated: WorkflowDefinition = {
      ...existing,
      ...updates,
      id: existing.id, // Preserve ID
      metadata: {
        ...existing.metadata,
        modified: new Date(),
      },
    };

    await this.storage.write(`workflows/${id}/definition`, updated);
    return updated;
  }

  async deleteWorkflow(id: string): Promise<void> {
    // Delete workflow definition
    await this.storage.delete(`workflows/${id}/definition`);

    // Delete any executions
    const executionKeys = await this.storage.list(`workflows/${id}/executions/*`);
    for (const key of executionKeys) {
      await this.storage.delete(key);
    }
  }

  async getWorkflow(id: string): Promise<WorkflowDefinition | null> {
    return await this.storage.read(`workflows/${id}/definition`);
  }

  async listWorkflows(): Promise<WorkflowDefinition[]> {
    const keys = await this.storage.list('workflows/*/definition');
    const workflows: WorkflowDefinition[] = [];

    for (const key of keys) {
      const workflow = await this.storage.read(key);
      if (workflow) {
        workflows.push(workflow);
      }
    }

    return workflows.sort((a, b) => b.metadata.modified.getTime() - a.metadata.modified.getTime());
  }

  async validateWorkflow(definition: WorkflowDefinition): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check for components
    if (!definition.components || definition.components.length === 0) {
      errors.push('Workflow must have at least one component');
    }

    // Check for duplicate component IDs
    const componentIds = new Set<string>();
    for (const component of definition.components) {
      if (componentIds.has(component.id)) {
        errors.push(`Duplicate component ID: ${component.id}`);
      }
      componentIds.add(component.id);
    }

    // Validate connections
    for (const connection of definition.connections) {
      const source = definition.components.find((c) => c.id === connection.sourceComponentId);
      const target = definition.components.find((c) => c.id === connection.targetComponentId);

      if (!source) {
        errors.push(`Connection references non-existent source component: ${connection.sourceComponentId}`);
      }
      if (!target) {
        errors.push(`Connection references non-existent target component: ${connection.targetComponentId}`);
      }

      // Check ports exist
      if (source && !source.outputs.find((p) => p.id === connection.sourcePortId)) {
        errors.push(
          `Connection references non-existent source port: ${connection.sourcePortId} on ${source.name}`,
        );
      }
      if (target && !target.inputs.find((p) => p.id === connection.targetPortId)) {
        errors.push(
          `Connection references non-existent target port: ${connection.targetPortId} on ${target.name}`,
        );
      }
    }

    // Check for cycles (simple DFS)
    if (this.hasCycles(definition.components, definition.connections)) {
      errors.push('Workflow contains cycles');
    }

    // Check for disconnected components (warning, not error)
    const connectedComponents = new Set<string>();
    for (const conn of definition.connections) {
      connectedComponents.add(conn.sourceComponentId);
      connectedComponents.add(conn.targetComponentId);
    }

    for (const component of definition.components) {
      if (!connectedComponents.has(component.id) && component.type !== 'trigger') {
        errors.push(`Component ${component.name} is not connected to any other components`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async executeWorkflow(id: string, inputs?: Record<string, any>): Promise<WorkflowExecutionContext> {
    const workflow = await this.getWorkflow(id);
    if (!workflow) {
      throw new Error(`Workflow not found: ${id}`);
    }

    const executionId = this.generateId('execution');
    const context: WorkflowExecutionContext = {
      workflowId: id,
      executionId,
      startTime: new Date(),
      state: 'running',
      componentStates: new Map(),
      dataFlow: new Map(),
      metrics: {
        componentExecutions: 0,
        totalDuration: 0,
        errors: 0,
      },
    };

    // Save execution context
    await this.storage.write(`workflows/${id}/executions/${executionId}`, context);

    // TODO: Implement actual execution engine
    // This would involve:
    // 1. Topological sort of components
    // 2. Execute each component in order
    // 3. Pass data between components via connections
    // 4. Handle errors and retries
    // 5. Update execution context

    return context;
  }

  async getComponentTemplates(): Promise<ComponentTemplate[]> {
    return Array.from(this.templates.values());
  }

  async registerComponentTemplate(template: ComponentTemplate): Promise<void> {
    const key = `${template.type}:${template.name}`;
    this.templates.set(key, template);

    // Persist to storage
    await this.storage.write(`component-templates/${key}`, template);
  }

  // Helper methods

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private hasCycles(components: WorkflowComponent[], connections: WorkflowConnection[]): boolean {
    const adjacency = new Map<string, string[]>();

    // Build adjacency list
    for (const component of components) {
      adjacency.set(component.id, []);
    }

    for (const conn of connections) {
      const neighbors = adjacency.get(conn.sourceComponentId) || [];
      neighbors.push(conn.targetComponentId);
      adjacency.set(conn.sourceComponentId, neighbors);
    }

    // DFS to detect cycles
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = adjacency.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          return true; // Cycle detected
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const component of components) {
      if (!visited.has(component.id)) {
        if (dfs(component.id)) {
          return true;
        }
      }
    }

    return false;
  }
}
