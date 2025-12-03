/**
 * Agent Execution Port
 *
 * Defines the contract for creating and executing AI agents.
 * Agents are workflow-driven LLM-powered automation.
 */

import type { Message, ToolDefinition, ToolCall, LLMProvider } from './llm.js';
import type { WorkflowDefinition, WorkflowExecutionContext } from './workflow.js';

export type AgentType =
  | 'conversational' // Chat-based interaction
  | 'task'           // Single task execution
  | 'workflow'       // Multi-step workflow execution
  | 'reactive';      // Event-driven agent

export type AgentState = 'idle' | 'thinking' | 'acting' | 'waiting' | 'completed' | 'failed';

/**
 * Agent definition
 */
export interface Agent {
  id: string;
  name: string;
  description: string;
  type: AgentType;

  // LLM configuration
  llm: {
    provider: LLMProvider;
    model: string;
    temperature?: number;
    maxTokens?: number;
  };

  // System prompt / instructions
  systemPrompt: string;

  // Available tools
  tools: AgentTool[];

  // Workflow (for workflow agents)
  workflowId?: string;

  // Memory configuration
  memory?: {
    type: 'buffer' | 'summary' | 'vector';
    maxMessages?: number;
    summaryPrompt?: string;
  };

  // Constraints
  constraints?: {
    maxSteps?: number;
    maxDuration?: number; // milliseconds
    maxCost?: number; // dollars
  };

  // Metadata
  metadata?: {
    author?: string;
    version?: string;
    created?: Date;
    tags?: string[];
  };
}

/**
 * Agent tool definition
 */
export interface AgentTool {
  name: string;
  description: string;
  parameters: ToolDefinition['parameters'];

  // Tool execution handler
  execute: (args: Record<string, any>, context: AgentExecutionContext) => Promise<string>;

  // Tool metadata
  metadata?: {
    category?: string;
    cost?: number; // Relative cost (0-1)
    async?: boolean;
  };
}

/**
 * Agent execution context
 */
export interface AgentExecutionContext {
  agentId: string;
  executionId: string;
  startTime: Date;
  state: AgentState;

  // Conversation history
  messages: Message[];

  // Current step
  currentStep: number;
  maxSteps: number;

  // Workflow context (if workflow agent)
  workflowContext?: WorkflowExecutionContext;

  // Memory/state
  memory: Map<string, any>;

  // Execution metrics
  metrics: {
    steps: number;
    llmCalls: number;
    toolCalls: number;
    tokensUsed: number;
    cost: number;
    duration: number;
    errors: number;
  };

  // Callbacks
  callbacks?: AgentCallbacks;
}

/**
 * Callbacks for agent events
 */
export interface AgentCallbacks {
  onStateChange?: (state: AgentState, context: AgentExecutionContext) => void;
  onThought?: (thought: string, context: AgentExecutionContext) => void;
  onAction?: (action: ToolCall, context: AgentExecutionContext) => void;
  onObservation?: (observation: string, context: AgentExecutionContext) => void;
  onComplete?: (result: AgentExecutionResult, context: AgentExecutionContext) => void;
  onError?: (error: Error, context: AgentExecutionContext) => void;
}

/**
 * Agent execution request
 */
export interface AgentExecutionRequest {
  agentId: string;
  input: string | Message[];
  context?: Record<string, any>; // Initial context/memory
  stream?: boolean;
  callbacks?: AgentCallbacks;
}

/**
 * Agent execution result
 */
export interface AgentExecutionResult {
  executionId: string;
  success: boolean;
  output: string;
  finalState: AgentState;
  steps: AgentStep[];
  metrics: AgentExecutionContext['metrics'];
  error?: {
    message: string;
    step?: number;
    details?: string;
  };
}

/**
 * Single agent step (thought + action + observation)
 */
export interface AgentStep {
  stepNumber: number;
  timestamp: Date;
  thought?: string; // Agent's reasoning
  action?: {
    tool: string;
    arguments: Record<string, any>;
  };
  observation?: string; // Tool result
  duration: number;
}

/**
 * Agent streaming event
 */
export type AgentStreamEvent =
  | { type: 'state'; state: AgentState }
  | { type: 'thought'; content: string }
  | { type: 'action'; action: ToolCall }
  | { type: 'observation'; content: string }
  | { type: 'step'; step: AgentStep }
  | { type: 'complete'; result: AgentExecutionResult }
  | { type: 'error'; error: Error };

/**
 * Agent Port interface
 */
export interface AgentPort {
  /**
   * Create a new agent
   */
  createAgent(agent: Omit<Agent, 'id'>): Promise<Agent>;

  /**
   * Update an agent
   */
  updateAgent(id: string, updates: Partial<Agent>): Promise<Agent>;

  /**
   * Delete an agent
   */
  deleteAgent(id: string): Promise<void>;

  /**
   * Get agent by ID
   */
  getAgent(id: string): Promise<Agent | null>;

  /**
   * List all agents
   */
  listAgents(): Promise<Agent[]>;

  /**
   * Execute an agent
   */
  execute(request: AgentExecutionRequest): Promise<AgentExecutionResult>;

  /**
   * Execute agent with streaming
   */
  executeStream(request: AgentExecutionRequest): AsyncGenerator<AgentStreamEvent, AgentExecutionResult>;

  /**
   * Stop a running agent
   */
  stopExecution(executionId: string): Promise<void>;

  /**
   * Get execution history
   */
  getExecutionHistory(agentId: string, limit?: number): Promise<AgentExecutionResult[]>;

  /**
   * Register a tool
   */
  registerTool(tool: AgentTool): Promise<void>;

  /**
   * Get available tools
   */
  getTools(): Promise<AgentTool[]>;

  /**
   * Create agent from workflow
   */
  createAgentFromWorkflow(workflowId: string, config: Partial<Agent>): Promise<Agent>;
}

/**
 * Agent orchestration patterns
 */
export type OrchestrationPattern =
  | 'sequential'  // Execute agents one after another
  | 'parallel'    // Execute agents concurrently
  | 'conditional' // Execute based on conditions
  | 'loop'        // Repeat agents
  | 'map';        // Execute agent for each item in collection

/**
 * Multi-agent orchestration
 */
export interface AgentOrchestration {
  id: string;
  name: string;
  description: string;
  pattern: OrchestrationPattern;

  // Agents in orchestration
  agents: Array<{
    agentId: string;
    condition?: string; // For conditional patterns
    iterateOver?: string; // For map patterns
  }>;

  // Data flow between agents
  dataFlow: Array<{
    fromAgent: string;
    toAgent: string;
    mapping: Record<string, string>; // output key -> input key
  }>;
}

/**
 * Agent template for common patterns
 */
export interface AgentTemplate {
  name: string;
  description: string;
  type: AgentType;
  systemPromptTemplate: string;
  recommendedTools: string[];
  recommendedModel: string;
  examples?: Array<{ input: string; expectedOutput: string }>;
}

/**
 * Built-in agent templates
 */
export const AGENT_TEMPLATES: Record<string, AgentTemplate> = {
  researcher: {
    name: 'Researcher',
    description: 'Research agent that gathers information and synthesizes findings',
    type: 'task',
    systemPromptTemplate: `You are a research agent. Your goal is to thoroughly research {{topic}} and provide a comprehensive summary.

Use the available tools to:
1. Search for relevant information
2. Read and analyze sources
3. Synthesize findings into a coherent report

Be thorough, cite sources, and provide actionable insights.`,
    recommendedTools: ['web_search', 'read_url', 'storage_read', 'storage_write'],
    recommendedModel: 'gpt-4-turbo',
  },

  coder: {
    name: 'Coder',
    description: 'Coding agent that writes, tests, and debugs code',
    type: 'task',
    systemPromptTemplate: `You are an expert software engineer. Your goal is to {{task}}.

Available tools allow you to:
1. Read and analyze code files
2. Write and edit code
3. Run tests and see results
4. Search documentation

Write clean, well-tested, documented code following best practices.`,
    recommendedTools: ['read_file', 'write_file', 'run_command', 'search_code'],
    recommendedModel: 'claude-sonnet-4.5',
  },

  assistant: {
    name: 'Assistant',
    description: 'Conversational assistant for general tasks',
    type: 'conversational',
    systemPromptTemplate: `You are a helpful assistant. Respond to the user's questions and requests clearly and concisely.

When you need to perform actions, use the available tools. Always explain what you're doing and why.`,
    recommendedTools: [],
    recommendedModel: 'gpt-4o',
  },

  workflow_executor: {
    name: 'Workflow Executor',
    description: 'Agent that executes predefined workflows',
    type: 'workflow',
    systemPromptTemplate: `You are a workflow execution agent. You follow predefined workflows step by step.

For each step:
1. Read the step definition
2. Execute the required actions using tools
3. Verify the results
4. Proceed to next step or handle errors

Be precise and handle errors gracefully.`,
    recommendedTools: ['workflow_step', 'storage_read', 'storage_write'],
    recommendedModel: 'claude-sonnet-4.5',
  },
};
