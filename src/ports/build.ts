/**
 * Build Engine Port
 *
 * Defines the contract for generating apps from workflow definitions.
 */

import type { WorkflowDefinition } from './workflow.js';
import type { App } from './app.js';

export type CodeLanguage = 'typescript' | 'javascript';
export type BuildTarget = 'app' | 'component' | 'library';

/**
 * Generated code artifact
 */
export interface CodeArtifact {
  filePath: string; // Relative path from project root
  content: string;
  language: CodeLanguage;
  description?: string;
}

/**
 * Build configuration
 */
export interface BuildConfig {
  target: BuildTarget;
  language: CodeLanguage;
  outputDir: string;

  // Code generation options
  options: {
    includeTests?: boolean;
    includeComments?: boolean;
    useStrictTypes?: boolean;
    formatting?: {
      indentSize?: number;
      useTabs?: boolean;
      semicolons?: boolean;
    };
  };

  // Dependencies to include
  dependencies?: string[];
  devDependencies?: string[];
}

/**
 * Build result
 */
export interface BuildResult {
  success: boolean;
  artifacts: CodeArtifact[];
  errors: BuildError[];
  warnings: string[];

  // Generated app info
  appInfo?: {
    id: string;
    path: string;
    entryPoint: string;
  };

  // Build metadata
  metadata: {
    workflowId: string;
    buildTime: Date;
    duration: number; // milliseconds
    artifactCount: number;
    linesOfCode: number;
  };
}

export interface BuildError {
  type: 'validation' | 'generation' | 'filesystem' | 'dependency';
  message: string;
  componentId?: string;
  details?: string;
}

/**
 * Code template for generation
 */
export interface CodeTemplate {
  name: string;
  description: string;
  language: CodeLanguage;
  template: string; // Template with placeholders like {{name}}, {{imports}}, etc.
  placeholders: string[]; // List of required placeholders
}

/**
 * Build Engine Port interface
 */
export interface BuildPort {
  /**
   * Generate an app from a workflow definition
   */
  buildApp(workflowId: string, config: BuildConfig): Promise<BuildResult>;

  /**
   * Generate code from workflow without creating files (preview)
   */
  previewBuild(workflowId: string, config: BuildConfig): Promise<CodeArtifact[]>;

  /**
   * Validate that a workflow can be built
   */
  validateBuild(workflowId: string): Promise<{ valid: boolean; errors: BuildError[] }>;

  /**
   * Generate code for a specific component
   */
  generateComponent(
    componentId: string,
    workflowId: string,
    config: BuildConfig,
  ): Promise<CodeArtifact>;

  /**
   * Load a generated app dynamically
   */
  loadGeneratedApp(appId: string): Promise<App>;

  /**
   * Get available code templates
   */
  getTemplates(): Promise<CodeTemplate[]>;

  /**
   * Register a custom code template
   */
  registerTemplate(template: CodeTemplate): Promise<void>;

  /**
   * Delete a generated app
   */
  deleteGeneratedApp(appId: string): Promise<void>;

  /**
   * List all generated apps
   */
  listGeneratedApps(): Promise<Array<{ id: string; path: string; generated: Date }>>;

  /**
   * Rebuild an app (regenerate from workflow)
   */
  rebuildApp(appId: string, config?: BuildConfig): Promise<BuildResult>;
}

/**
 * Code generator interface for extensibility
 */
export interface CodeGenerator {
  /**
   * Generate code from workflow
   */
  generate(workflow: WorkflowDefinition, config: BuildConfig): Promise<CodeArtifact[]>;

  /**
   * Generate imports section
   */
  generateImports(workflow: WorkflowDefinition): string;

  /**
   * Generate component class/function
   */
  generateComponent(componentId: string, workflow: WorkflowDefinition): string;

  /**
   * Generate main app class
   */
  generateApp(workflow: WorkflowDefinition): string;

  /**
   * Generate command handlers
   */
  generateCommands(workflow: WorkflowDefinition): string;

  /**
   * Generate React UI component
   */
  generateUI(workflow: WorkflowDefinition): string;

  /**
   * Generate types/interfaces
   */
  generateTypes(workflow: WorkflowDefinition): string;

  /**
   * Format generated code
   */
  formatCode(code: string, language: CodeLanguage): string;
}

/**
 * Template renderer utility
 */
export class TemplateRenderer {
  /**
   * Render template with data
   */
  static render(template: string, data: Record<string, any>): string {
    let result = template;

    for (const [key, value] of Object.entries(data)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(placeholder, String(value));
    }

    return result;
  }

  /**
   * Extract placeholders from template
   */
  static extractPlaceholders(template: string): string[] {
    const regex = /{{(\w+)}}/g;
    const placeholders: string[] = [];
    let match;

    while ((match = regex.exec(template)) !== null) {
      if (!placeholders.includes(match[1])) {
        placeholders.push(match[1]);
      }
    }

    return placeholders;
  }

  /**
   * Validate template has all required data
   */
  static validate(template: string, data: Record<string, any>): { valid: boolean; missing: string[] } {
    const placeholders = TemplateRenderer.extractPlaceholders(template);
    const missing = placeholders.filter((p) => !(p in data));

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}
