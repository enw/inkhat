/**
 * LLM Provider Port
 *
 * Unified interface for multiple LLM providers (Ollama, OpenAI, Anthropic, OpenRouter).
 * Enables building provider-agnostic AI agents.
 */

export type LLMProvider = 'ollama' | 'openai' | 'anthropic' | 'openrouter';

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * Message in conversation
 */
export interface Message {
  role: MessageRole;
  content: string | MessageContent[];
  name?: string; // For tool/function calls
  toolCallId?: string; // For tool responses
}

/**
 * Multi-modal message content
 */
export type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'image'; imageUrl: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, any> }
  | { type: 'tool_result'; toolCallId: string; content: string };

/**
 * Tool/Function definition for LLM
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
      items?: any;
    }>;
    required?: string[];
  };
}

/**
 * Tool call from LLM
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

/**
 * LLM completion request
 */
export interface CompletionRequest {
  messages: Message[];
  model?: string; // Provider-specific model name
  temperature?: number; // 0-1 (or 0-2 for some providers)
  maxTokens?: number;
  stopSequences?: string[];
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'required' | { name: string };
  topP?: number;
  topK?: number;
  stream?: boolean;
}

/**
 * LLM completion response
 */
export interface CompletionResponse {
  content: string;
  role: MessageRole;
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

/**
 * Streaming chunk
 */
export interface StreamChunk {
  delta: string;
  toolCalls?: Partial<ToolCall>[];
  finishReason?: CompletionResponse['finishReason'];
}

/**
 * Provider configuration
 */
export interface LLMProviderConfig {
  provider: LLMProvider;
  apiKey?: string;
  baseUrl?: string; // For Ollama or custom endpoints
  defaultModel?: string;
  timeout?: number; // milliseconds
  maxRetries?: number;
  options?: Record<string, any>; // Provider-specific options
}

/**
 * Model information
 */
export interface ModelInfo {
  id: string;
  name: string;
  provider: LLMProvider;
  contextWindow: number;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsStreaming: boolean;
  costPer1kTokens?: {
    prompt: number;
    completion: number;
  };
}

/**
 * LLM Provider Port interface
 */
export interface LLMPort {
  /**
   * Send completion request
   */
  complete(request: CompletionRequest): Promise<CompletionResponse>;

  /**
   * Send streaming completion request
   */
  stream(request: CompletionRequest): AsyncGenerator<StreamChunk, CompletionResponse>;

  /**
   * List available models
   */
  listModels(): Promise<ModelInfo[]>;

  /**
   * Get model info
   */
  getModelInfo(modelId: string): Promise<ModelInfo | null>;

  /**
   * Test connection
   */
  testConnection(): Promise<boolean>;

  /**
   * Get provider name
   */
  getProvider(): LLMProvider;

  /**
   * Get configuration
   */
  getConfig(): LLMProviderConfig;
}

/**
 * Multi-provider router
 */
export interface LLMRouter {
  /**
   * Add a provider
   */
  addProvider(name: string, provider: LLMPort): void;

  /**
   * Get provider by name
   */
  getProvider(name: string): LLMPort | undefined;

  /**
   * Remove provider
   */
  removeProvider(name: string): void;

  /**
   * List all providers
   */
  listProviders(): string[];

  /**
   * Route request to appropriate provider
   */
  route(providerName: string, request: CompletionRequest): Promise<CompletionResponse>;

  /**
   * Fallback routing (try multiple providers)
   */
  routeWithFallback(
    providers: string[],
    request: CompletionRequest,
  ): Promise<{ provider: string; response: CompletionResponse }>;
}

/**
 * Prompt template
 */
export interface PromptTemplate {
  name: string;
  description: string;
  template: string;
  variables: string[]; // Variable names in template
  systemPrompt?: string;
  examples?: Array<{ user: string; assistant: string }>;
}

/**
 * Prompt builder utility
 */
export class PromptBuilder {
  private messages: Message[] = [];
  private tools: ToolDefinition[] = [];

  system(content: string): this {
    this.messages.push({ role: 'system', content });
    return this;
  }

  user(content: string | MessageContent[]): this {
    this.messages.push({ role: 'user', content });
    return this;
  }

  assistant(content: string): this {
    this.messages.push({ role: 'assistant', content });
    return this;
  }

  tool(definition: ToolDefinition): this {
    this.tools.push(definition);
    return this;
  }

  toolResult(toolCallId: string, content: string): this {
    this.messages.push({
      role: 'tool',
      content,
      toolCallId,
    });
    return this;
  }

  build(): { messages: Message[]; tools: ToolDefinition[] } {
    return {
      messages: [...this.messages],
      tools: [...this.tools],
    };
  }

  static fromTemplate(template: PromptTemplate, variables: Record<string, string>): PromptBuilder {
    const builder = new PromptBuilder();

    if (template.systemPrompt) {
      builder.system(template.systemPrompt);
    }

    // Add examples
    if (template.examples) {
      for (const example of template.examples) {
        builder.user(example.user);
        builder.assistant(example.assistant);
      }
    }

    // Render template with variables
    let rendered = template.template;
    for (const [key, value] of Object.entries(variables)) {
      rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    builder.user(rendered);

    return builder;
  }
}

/**
 * Token counter utility
 */
export class TokenCounter {
  /**
   * Estimate token count (rough approximation)
   */
  static estimate(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate tokens for messages
   */
  static estimateMessages(messages: Message[]): number {
    let total = 0;
    for (const message of messages) {
      if (typeof message.content === 'string') {
        total += TokenCounter.estimate(message.content);
      } else {
        for (const content of message.content) {
          if (content.type === 'text') {
            total += TokenCounter.estimate(content.text);
          }
        }
      }
      // Add overhead for role, etc.
      total += 4;
    }
    return total;
  }

  /**
   * Check if messages fit within context window
   */
  static fitsInContext(messages: Message[], contextWindow: number, reserveForCompletion: number = 1000): boolean {
    const tokens = TokenCounter.estimateMessages(messages);
    return tokens + reserveForCompletion <= contextWindow;
  }
}
