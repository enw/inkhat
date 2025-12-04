/**
 * Ollama LLM Adapter
 *
 * Adapter for local LLMs via Ollama (https://ollama.ai)
 */

import { Ollama } from 'ollama';
import type {
  LLMPort,
  LLMProviderConfig,
  CompletionRequest,
  CompletionResponse,
  StreamChunk,
  ModelInfo,
  Message,
  ToolDefinition,
  ToolCall,
} from '@ports/llm.js';

export class OllamaAdapter implements LLMPort {
  private client: Ollama;
  private config: LLMProviderConfig;

  constructor(config: Partial<LLMProviderConfig> = {}) {
    this.config = {
      provider: 'ollama',
      baseUrl: config.baseUrl || 'http://localhost:11434',
      defaultModel: config.defaultModel || 'llama3.2',
      timeout: config.timeout || 120000, // 2 minutes
      maxRetries: config.maxRetries || 3,
      ...config,
    };

    this.client = new Ollama({
      host: this.config.baseUrl,
    });
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const model = request.model || this.config.defaultModel!;

    try {
      const response = await this.client.chat({
        model,
        messages: request.messages.map(this.convertMessage),
        options: {
          temperature: request.temperature,
          num_predict: request.maxTokens,
          top_p: request.topP,
          top_k: request.topK,
          stop: request.stopSequences,
        },
        tools: request.tools ? request.tools.map(this.convertTool) : undefined,
        stream: false,
      });

      return this.convertResponse(response);
    } catch (error) {
      throw new Error(`Ollama completion failed: ${(error as Error).message}`);
    }
  }

  async *stream(request: CompletionRequest): AsyncGenerator<StreamChunk, CompletionResponse> {
    const model = request.model || this.config.defaultModel!;

    try {
      const stream = await this.client.chat({
        model,
        messages: request.messages.map(this.convertMessage),
        options: {
          temperature: request.temperature,
          num_predict: request.maxTokens,
          top_p: request.topP,
          top_k: request.topK,
          stop: request.stopSequences,
        },
        tools: request.tools ? request.tools.map(this.convertTool) : undefined,
        stream: true,
      });

      let fullContent = '';
      let toolCalls: ToolCall[] = [];
      let finishReason: CompletionResponse['finishReason'] = 'stop';

      for await (const chunk of stream) {
        if (chunk.message?.content) {
          const delta = chunk.message.content;
          fullContent += delta;

          yield {
            delta,
            finishReason: chunk.done ? 'stop' : undefined,
          };
        }

        if (chunk.message?.tool_calls) {
          toolCalls = chunk.message.tool_calls.map((tc: any) => {
            // Ollama may return arguments as a JSON string or object
            let args = tc.function?.arguments || {};
            if (typeof args === 'string') {
              try {
                args = JSON.parse(args);
              } catch {
                args = {};
              }
            }
            return {
              id: tc.id || `tool_${Date.now()}`,
              name: tc.function?.name || '',
              arguments: args,
            };
          });

          yield {
            delta: '',
            toolCalls,
          };
        }

        if (chunk.done) {
          finishReason = toolCalls.length > 0 ? 'tool_calls' : 'stop';
        }
      }

      return {
        content: fullContent,
        role: 'assistant',
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        finishReason,
        usage: {
          promptTokens: 0, // Ollama doesn't provide token counts in all versions
          completionTokens: 0,
          totalTokens: 0,
        },
        model,
      };
    } catch (error) {
      throw new Error(`Ollama streaming failed: ${(error as Error).message}`);
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.client.list();

      return response.models.map((model) => ({
        id: model.name,
        name: model.name,
        provider: 'ollama' as const,
        contextWindow: 2048, // Default, varies by model
        supportsTools: this.modelSupportsTools(model.name),
        supportsVision: this.modelSupportsVision(model.name),
        supportsStreaming: true,
      }));
    } catch (error) {
      throw new Error(`Failed to list Ollama models: ${(error as Error).message}`);
    }
  }

  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    try {
      const models = await this.listModels();
      return models.find((m) => m.id === modelId) || null;
    } catch {
      return null;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.list();
      return true;
    } catch {
      return false;
    }
  }

  getProvider() {
    return this.config.provider;
  }

  getConfig() {
    return { ...this.config };
  }

  // Helper methods

  private convertMessage(message: Message): any {
    if (typeof message.content === 'string') {
      return {
        role: message.role,
        content: message.content,
      };
    }

    // Multi-modal content (images, etc.)
    const content: any[] = [];
    for (const item of message.content) {
      if (item.type === 'text') {
        content.push({ type: 'text', text: item.text });
      } else if (item.type === 'image') {
        content.push({ type: 'image', url: item.imageUrl });
      }
    }

    return {
      role: message.role,
      content,
    };
  }

  private convertTool(tool: ToolDefinition): any {
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    };
  }

  private convertResponse(response: any): CompletionResponse {
    const toolCalls: ToolCall[] = [];

    if (response.message?.tool_calls) {
      for (const tc of response.message.tool_calls) {
        // Ollama may return arguments as a JSON string or object
        let args = tc.function?.arguments || {};
        if (typeof args === 'string') {
          try {
            args = JSON.parse(args);
          } catch {
            args = {};
          }
        }
        
        toolCalls.push({
          id: tc.id || `tool_${Date.now()}`,
          name: tc.function?.name || '',
          arguments: args,
        });
      }
    }

    return {
      content: response.message?.content || '',
      role: 'assistant',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
      usage: {
        promptTokens: response.prompt_eval_count || 0,
        completionTokens: response.eval_count || 0,
        totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0),
      },
      model: response.model,
    };
  }

  private modelSupportsTools(modelName: string): boolean {
    // Models known to support function calling
    const toolModels = ['llama3.2', 'llama3.1', 'mistral', 'mixtral', 'command-r'];
    return toolModels.some((m) => modelName.toLowerCase().includes(m));
  }

  private modelSupportsVision(modelName: string): boolean {
    // Models known to support vision
    const visionModels = ['llava', 'bakllava', 'llama3.2-vision'];
    return visionModels.some((m) => modelName.toLowerCase().includes(m));
  }
}
