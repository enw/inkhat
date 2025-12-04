/**
 * Agent Chat Demo App
 *
 * Multi-thread conversational agent with memory management.
 * Supports multiple conversation threads with thread-specific conversation memory
 * and shared entity memory across all threads.
 */

import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { Box, Text, useInput } from 'ink';
import type { App, AppContext, AppCommand } from '@ports/app.js';
import type { LLMPort, Message, ToolDefinition, ToolCall } from '@ports/llm.js';
import { OllamaAdapter } from '@adapters/llm/ollama.js';
import TextInput from 'ink-text-input';
import { SplitMemoryPanes } from './SplitMemoryPanes.js';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * Thread metadata
 */
interface Thread {
  id: string;
  name: string;
  createdAt: Date;
  lastMessageAt: Date;
  messageCount: number;
}

/**
 * Conversation summary generated every M messages (thread-specific)
 */
interface ConversationSummary {
  summary: string;
  lastUpdated: Date;
  messageCount: number;
  threadId: string;
}

/**
 * Entity memory node in the knowledge graph (shared across threads)
 */
interface EntityNode {
  id: string;
  type: 'person' | 'place' | 'concept' | 'event' | 'task' | 'other';
  name: string;
  description: string;
  properties: Record<string, unknown>;
  relationships: Array<{
    targetId: string;
    relationship: string;
    strength: number; // 0-1
  }>;
}

/**
 * Entity memory graph structure (shared across all threads)
 */
interface EntityMemory {
  nodes: EntityNode[];
  lastUpdated: Date;
}

/**
 * Memory configuration
 */
interface MemoryConfig {
  recentMessagesCount: number; // N - how many recent messages for LLM context
  summaryUpdateFrequency: number; // M - update summary every M message pairs
}

export class AgentChatApp implements App {
  readonly id = 'agent-chat';
  readonly name = 'Agent Chat';
  readonly description = 'Chat with an AI agent powered by local LLMs with memory management';
  readonly version = '0.3.0';

  private context!: AppContext;
  private llm!: LLMPort;
  private currentThreadId: string | null = null;
  private messages: ChatMessage[] = [];
  private conversationSummary: ConversationSummary | null = null;
  private entityMemory: EntityMemory = { nodes: [], lastUpdated: new Date() };
  private threads: Thread[] = [];
  private isUpdatingMemory: boolean = false;
  private memoryConfig: MemoryConfig = {
    recentMessagesCount: 10,
    summaryUpdateFrequency: 5,
  };

  readonly commands: AppCommand[] = [
    {
      name: 'chat',
      description: 'Start a chat session with the agent',
      execute: async (_args, context) => {
        this.context = context;
        this.llm = new OllamaAdapter({
          baseUrl: 'http://localhost:11434',
          defaultModel: 'llama3.2',
          },
  );

        const connected = await this.llm.testConnection();
        if (!connected) {
          return;
        }

        // Load threads and entity memory
        await this.loadThreads();
        await this.loadEntityMemory();

        // Load or create default thread
        if (this.threads.length === 0) {
          await this.createThread('E10D Agent');
        }
        await this.switchThread(this.threads[0].id);
      },
    },
    {
      name: 'models',
      description: 'List available Ollama models',
      execute: async () => {
        if (!this.llm) {
          this.llm = new OllamaAdapter();
        }
        const connected = await this.llm.testConnection();
        if (!connected) {
          return;
        }
        await this.llm.listModels();
      },
    },
  ];

  async initialize(context: AppContext): Promise<void> {
    this.context = context;
    this.llm = new OllamaAdapter({
      baseUrl: 'http://localhost:11434',
      defaultModel: 'llama3.2',
      },
  );

    await this.loadThreads();
    await this.loadEntityMemory();

    if (this.threads.length === 0) {
      await this.createThread('E10D Agent');
    }
    await this.switchThread(this.threads[0].id);
  }

  render(): React.ReactElement {
    return <ChatUI app={this} />;
  }

  async cleanup(): Promise<void> {
    if (this.currentThreadId) {
      await this.saveThread(this.currentThreadId);
    }
    await this.saveEntityMemory();
    await this.saveThreads();
  }

  // Thread Management

  private async loadThreads(): Promise<void> {
    const threads = await this.context.storage.read('agent-chat/threads') as Thread[] | null;
    if (threads) {
      this.threads = threads.map(t => ({
        ...t,
        createdAt: new Date(t.createdAt),
        lastMessageAt: new Date(t.lastMessageAt),
      }));
    }
  }

  private async saveThreads(): Promise<void> {
    await this.context.storage.write('agent-chat/threads', this.threads);
  }

  async createThread(name: string): Promise<string> {
    const threadId = `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const thread: Thread = {
      id: threadId,
      name,
      createdAt: now,
      lastMessageAt: now,
      messageCount: 0,
    };
    this.threads.push(thread);
    await this.saveThreads();
    return threadId;
  }

  async switchThread(threadId: string): Promise<void> {
    // Save current thread before switching
    if (this.currentThreadId) {
      await this.saveThread(this.currentThreadId);
    }

    this.currentThreadId = threadId;
    await this.loadThread(threadId);
  }

  async deleteThread(threadId: string): Promise<void> {
    // Delete thread data
    await this.context.storage.delete(`agent-chat/threads/${threadId}/history`);
    await this.context.storage.delete(`agent-chat/threads/${threadId}/summary`);

    // Remove from threads list
    this.threads = this.threads.filter(t => t.id !== threadId);
    await this.saveThreads();

    // If deleted thread was current, switch to first available or create new
    if (this.currentThreadId === threadId) {
      if (this.threads.length > 0) {
        await this.switchThread(this.threads[0].id);
      } else {
        const newThreadId = await this.createThread('E10D Agent');
        await this.switchThread(newThreadId);
      }
    }
  }

  getThreads(): Thread[] {
    return [...this.threads];
  }

  getCurrentThreadId(): string | null {
    return this.currentThreadId;
  }

  getCurrentThread(): Thread | null {
    if (!this.currentThreadId) return null;
    return this.threads.find(t => t.id === this.currentThreadId) || null;
  }

  private async loadThread(threadId: string): Promise<void> {
    const history = await this.context.storage.read(`agent-chat/threads/${threadId}/history`) as ChatMessage[] | null;
    if (history) {
      this.messages = history.map(m => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
    } else {
      this.messages = [];
    }

    const summary = await this.context.storage.read(`agent-chat/threads/${threadId}/summary`) as ConversationSummary | null;
    if (summary) {
      this.conversationSummary = {
        ...summary,
        lastUpdated: new Date(summary.lastUpdated),
      };
    } else {
      this.conversationSummary = null;
    }
  }

  private async saveThread(threadId: string): Promise<void> {
    if (this.messages.length > 0) {
      await this.context.storage.write(`agent-chat/threads/${threadId}/history`, this.messages);
    }

    if (this.conversationSummary) {
      await this.context.storage.write(`agent-chat/threads/${threadId}/summary`, this.conversationSummary);
    }

    // Update thread metadata
    const thread = this.threads.find(t => t.id === threadId);
    if (thread) {
      thread.messageCount = this.messages.length;
      thread.lastMessageAt = new Date();
      await this.saveThreads();
    }
  }

  private async loadEntityMemory(): Promise<void> {
    const entityMem = await this.context.storage.read('agent-chat/entity-memory') as EntityMemory | null;
    if (entityMem) {
      this.entityMemory = {
        ...entityMem,
        lastUpdated: new Date(entityMem.lastUpdated),
      };
    }
  }

  private async saveEntityMemory(): Promise<void> {
    await this.context.storage.write('agent-chat/entity-memory', this.entityMemory);
  }

  /**
   * Get entity management tool definitions for LLM
   */
  private getEntityTools(): ToolDefinition[] {
    return [
      {
        name: 'create_entity',
        description: 'Create a new entity in the knowledge graph. Use this when you encounter a new person, place, concept, event, or task.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Unique identifier for the entity (e.g., "person-alice", "concept-machine-learning")' },
            type: { type: 'string', enum: ['person', 'place', 'concept', 'event', 'task', 'other'], description: 'Type of entity' },
            name: { type: 'string', description: 'Display name of the entity' },
            description: { type: 'string', description: 'Description of what we know about this entity' },
            properties: { type: 'object', description: 'Additional key-value properties about the entity' },
          },
          required: ['id', 'type', 'name', 'description'],
        },
      },
      {
        name: 'update_entity',
        description: 'Update an existing entity with new information. Use this to modify entity details or add new properties.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID of the entity to update' },
            name: { type: 'string', description: 'Updated name (optional)' },
            description: { type: 'string', description: 'Updated description (optional)' },
            properties: { type: 'object', description: 'Updated properties to merge with existing ones (optional)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_entity',
        description: 'Delete an entity from the knowledge graph. Use this when an entity is no longer relevant.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID of the entity to delete' },
          },
          required: ['id'],
        },
      },
      {
        name: 'add_relationship',
        description: 'Add or update a relationship between two entities. Use this to connect entities (e.g., "Alice works at Google", "Python is a programming language").',
        parameters: {
          type: 'object',
          properties: {
            sourceId: { type: 'string', description: 'ID of the source entity' },
            targetId: { type: 'string', description: 'ID of the target entity' },
            relationship: { type: 'string', description: 'Type of relationship (e.g., "works_at", "is_a", "created", "located_in")' },
            strength: { type: 'number', description: 'Strength of relationship (0-1), default 0.5' },
          },
          required: ['sourceId', 'targetId', 'relationship'],
        },
      },
      {
        name: 'remove_relationship',
        description: 'Remove a relationship between two entities.',
        parameters: {
          type: 'object',
          properties: {
            sourceId: { type: 'string', description: 'ID of the source entity' },
            targetId: { type: 'string', description: 'ID of the target entity' },
            relationship: { type: 'string', description: 'Type of relationship to remove' },
          },
          required: ['sourceId', 'targetId', 'relationship'],
        },
      },
    ];
  }

  /**
   * Execute entity management tool calls
   */
  private async executeEntityTool(toolCall: ToolCall): Promise<string> {
    const { name, arguments: rawArgs } = toolCall;
    
    // Parse arguments if they come as a JSON string (Ollama sometimes returns string)
    // Tool arguments are validated by the LLM tool schema, so we can safely use 'any' here
    let args: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (typeof rawArgs === 'string') {
      try {
        args = JSON.parse(rawArgs);
      } catch {
        args = {};
      }
    } else {
      args = rawArgs || {};
    }

    try {
      switch (name) {
        case 'create_entity': {
          const existingIndex = this.entityMemory.nodes.findIndex(n => n.id === args.id);
          if (existingIndex >= 0) {
            // Entity already exists, update it instead
            this.entityMemory.nodes[existingIndex] = {
              ...this.entityMemory.nodes[existingIndex],
              name: args.name || this.entityMemory.nodes[existingIndex].name,
              description: args.description || this.entityMemory.nodes[existingIndex].description,
              properties: { ...this.entityMemory.nodes[existingIndex].properties, ...(args.properties || {}) },
            };
            this.entityMemory.lastUpdated = new Date();
            return `Updated existing entity: ${args.id}`;
          }

          const newNode: EntityNode = {
            id: args.id,
            type: args.type || 'other',
            name: args.name,
            description: args.description,
            properties: args.properties || {},
            relationships: [],
          };
          this.entityMemory.nodes.push(newNode);
          this.entityMemory.lastUpdated = new Date();
          return `Created entity: ${args.name} (${args.id})`;
        }

        case 'update_entity': {
          const index = this.entityMemory.nodes.findIndex(n => n.id === args.id);
          if (index < 0) {
            return `Entity not found: ${args.id}`;
          }

          if (args.name) this.entityMemory.nodes[index].name = args.name;
          if (args.description) this.entityMemory.nodes[index].description = args.description;
          if (args.properties) {
            this.entityMemory.nodes[index].properties = {
              ...this.entityMemory.nodes[index].properties,
              ...args.properties,
            };
          }
          this.entityMemory.lastUpdated = new Date();
          return `Updated entity: ${args.id}`;
        }

        case 'delete_entity': {
          const index = this.entityMemory.nodes.findIndex(n => n.id === args.id);
          if (index < 0) {
            return `Entity not found: ${args.id}`;
          }

          // Remove relationships pointing to this entity
          for (const node of this.entityMemory.nodes) {
            node.relationships = node.relationships.filter(
              rel => rel.targetId !== args.id
            );
          }

          this.entityMemory.nodes.splice(index, 1);
          this.entityMemory.lastUpdated = new Date();
          return `Deleted entity: ${args.id}`;
        }

        case 'add_relationship': {
          const sourceIndex = this.entityMemory.nodes.findIndex(n => n.id === args.sourceId);
          const targetIndex = this.entityMemory.nodes.findIndex(n => n.id === args.targetId);

          if (sourceIndex < 0) {
            return `Source entity not found: ${args.sourceId}`;
          }
          if (targetIndex < 0) {
            return `Target entity not found: ${args.targetId}`;
          }

          const existingRelIndex = this.entityMemory.nodes[sourceIndex].relationships.findIndex(
            rel => rel.targetId === args.targetId && rel.relationship === args.relationship
          );

          const strength = typeof args.strength === 'number' ? Math.max(0, Math.min(1, args.strength)) : 0.5;

          if (existingRelIndex >= 0) {
            this.entityMemory.nodes[sourceIndex].relationships[existingRelIndex].strength = strength;
            return `Updated relationship: ${args.sourceId} --[${args.relationship}]--> ${args.targetId}`;
          } else {
            this.entityMemory.nodes[sourceIndex].relationships.push({
              targetId: args.targetId,
              relationship: args.relationship,
              strength,
            });
            this.entityMemory.lastUpdated = new Date();
            return `Added relationship: ${args.sourceId} --[${args.relationship}]--> ${args.targetId}`;
          }
        }

        case 'remove_relationship': {
          const sourceIndex = this.entityMemory.nodes.findIndex(n => n.id === args.sourceId);
          if (sourceIndex < 0) {
            return `Source entity not found: ${args.sourceId}`;
          }

          const initialLength = this.entityMemory.nodes[sourceIndex].relationships.length;
          this.entityMemory.nodes[sourceIndex].relationships = this.entityMemory.nodes[sourceIndex].relationships.filter(
            rel => !(rel.targetId === args.targetId && rel.relationship === args.relationship)
          );

          if (this.entityMemory.nodes[sourceIndex].relationships.length < initialLength) {
            this.entityMemory.lastUpdated = new Date();
            return `Removed relationship: ${args.sourceId} --[${args.relationship}]--> ${args.targetId}`;
          }
          return `Relationship not found: ${args.sourceId} --[${args.relationship}]--> ${args.targetId}`;
        }

        default:
          return `Unknown tool: ${name}`;
      }
    } catch (error) {
      return `Error executing ${name}: ${(error as Error).message}`;
    }
  }

  /**
   * Generate conversation summary (thread-specific) and update entity memory (shared)
   */
  private async updateMemory(): Promise<void> {
    if (!this.currentThreadId || this.messages.length < 2) return;
    
    // Prevent concurrent memory updates
    if (this.isUpdatingMemory) {
      return;
    }
    
    this.isUpdatingMemory = true;

    try {
      const summaryStartIndex = this.conversationSummary?.messageCount || 0;
      const messagesSinceSummary = this.messages.slice(summaryStartIndex);
      
      if (messagesSinceSummary.length === 0) return;

      const previousSummary = this.conversationSummary?.summary || 'No previous conversation.';
      const recentMessages = messagesSinceSummary.map(m => 
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
      ).join('\n');

      const currentEntityMemory = JSON.stringify(this.entityMemory.nodes, null, 2);

      const summarizationPrompt = `You are a memory management system for an AI assistant. Your task is to:

1. Create/Update CONVERSATION MEMORY: Summarize THIS THREAD's conversation flow, key topics discussed, and important context. This is thread-specific memory.
2. Create/Update ENTITY MEMORY: Extract and structure knowledge about entities (people, places, concepts, events, tasks) mentioned in the conversation. Entity memory is SHARED across all threads.

Previous conversation summary (this thread):
${previousSummary}

Current entity memory (shared across all threads):
${currentEntityMemory}

Recent messages since last summary (this thread):
${recentMessages}

Please provide TWO distinct outputs:

=== CONVERSATION MEMORY ===
[Provide a concise summary of THIS THREAD's conversation flow, topics discussed, and context. This is thread-specific memory.]

=== ENTITY MEMORY ===
[Provide a JSON array of entity nodes. Each node should have:
- id: unique identifier
- type: one of "person", "place", "concept", "event", "task", "other"
- name: entity name
- description: what we know about this entity
- properties: key-value pairs of attributes
- relationships: array of {targetId, relationship, strength} to other entities

Update existing entities, add new ones, and strengthen/weaken relationships based on new information.
Only return the JSON array, no markdown formatting.]

Output format:
=== CONVERSATION MEMORY ===
[your summary here]

=== ENTITY MEMORY ===
[your JSON array here]`;

      const response = await this.llm.complete({
        messages: [
          {
            role: 'system',
            content: 'You are an expert at extracting structured knowledge from conversations and creating summaries.',
          },
          {
            role: 'user',
            content: summarizationPrompt,
          },
        ],
        temperature: 0.3,
        maxTokens: 2000,
        },
  );

      const responseText = response.content;
      const conversationMatch = responseText.match(/=== CONVERSATION MEMORY ===\s*([\s\S]*?)\s*=== ENTITY MEMORY ===/);
      const entityMatch = responseText.match(/=== ENTITY MEMORY ===\s*([\s\S]*)/);

      if (conversationMatch && this.currentThreadId) {
        this.conversationSummary = {
          summary: conversationMatch[1].trim(),
          lastUpdated: new Date(),
          messageCount: this.messages.length,
          threadId: this.currentThreadId,
        };
      }

      if (entityMatch) {
        try {
          const entityJson = entityMatch[1].trim().replace(/```json\s*/g, '').replace(/```\s*/g, '');
          const parsedNodes = JSON.parse(entityJson);
          
          if (Array.isArray(parsedNodes)) {
            const existingIds = new Set(this.entityMemory.nodes.map(n => n.id));
            const newNodes = parsedNodes.filter((n: EntityNode) => !existingIds.has(n.id));
            const updatedNodes = parsedNodes.filter((n: EntityNode) => existingIds.has(n.id));
            
            for (const updatedNode of updatedNodes) {
              const index = this.entityMemory.nodes.findIndex(n => n.id === updatedNode.id);
              if (index >= 0) {
                this.entityMemory.nodes[index] = updatedNode;
              }
            }
            
            this.entityMemory.nodes.push(...newNodes);
            this.entityMemory.lastUpdated = new Date();
          }
        } catch {
          // Failed to parse entity memory, continue with existing memory
        }
      }

      await this.saveThread(this.currentThreadId!);
      await this.saveEntityMemory();
    } catch {
      // Failed to update memory, but don't break chat
    } finally {
      this.isUpdatingMemory = false;
    }
  }

  // Public methods for UI

  async sendMessage(userMessage: string): Promise<string> {
    if (!this.currentThreadId) {
      throw new Error('No thread selected');
    }

    this.messages.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
      },
  );

    const llmMessages: Message[] = [
      {
        role: 'system',
        content: `You are a helpful AI assistant. Respond concisely and clearly.

Current entity memory (shared across all threads):
${this.entityMemory.nodes.length > 0 
  ? JSON.stringify(this.entityMemory.nodes.map(n => ({ id: n.id, type: n.type, name: n.name })), null, 2)
  : 'No entities yet.'
}

Use the available tools to create, update, or delete entities as you learn about them from the conversation.`,
      },
    ];

    if (this.conversationSummary) {
      llmMessages.push({
        role: 'system',
        content: `Previous conversation summary (this thread):\n${this.conversationSummary.summary}`,
        },
  );
    }

    const recentMessages = this.messages.slice(-this.memoryConfig.recentMessagesCount);
    llmMessages.push(...recentMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })));

    try {
      // Include entity tools in every request
      const tools = this.getEntityTools();
      
      let response = await this.llm.complete({
        messages: llmMessages,
        temperature: 0.7,
        maxTokens: 500,
        tools,
        },
  );

      // Process tool calls if any
      if (response.toolCalls && response.toolCalls.length > 0) {
        const toolResults: Message[] = [];
        
        for (const toolCall of response.toolCalls) {
          const result = await this.executeEntityTool(toolCall);
          toolResults.push({
            role: 'tool',
            content: result,
            toolCallId: toolCall.id,
          });
        }

        // Save entity memory after processing tools
        await this.saveEntityMemory();

        // If there were tool calls, make a follow-up request to get the final response
        const followUpMessages = [...llmMessages, {
          role: 'assistant' as const,
          content: response.content || '',
          toolCalls: response.toolCalls,
        }, ...toolResults];

        response = await this.llm.complete({
          messages: followUpMessages,
          temperature: 0.7,
          maxTokens: 500,
          tools,
          },
    );
      }

      this.messages.push({
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        },
  );

      await this.saveThread(this.currentThreadId);

      const messageCountSinceLastUpdate = this.messages.length - (this.conversationSummary?.messageCount || 0);
      if (messageCountSinceLastUpdate >= this.memoryConfig.summaryUpdateFrequency) {
        this.updateMemory().catch(() => {
          // Memory update failed, but don't break chat
          },
  );
      }

      return response.content;
    } catch (error) {
      return `Error: ${(error as Error).message}`;
    }
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  getRecentMessages(count: number = this.memoryConfig.recentMessagesCount): ChatMessage[] {
    return this.messages.slice(-count);
  }

  getConversationSummary(): ConversationSummary | null {
    return this.conversationSummary;
  }

  getEntityMemory(): EntityMemory {
    return { ...this.entityMemory };
  }

  getMemoryConfig(): MemoryConfig {
    return { ...this.memoryConfig };
  }

  async clearCurrentThread(): Promise<void> {
    if (!this.currentThreadId) return;
    
    this.messages = [];
    this.conversationSummary = null;
    await this.saveThread(this.currentThreadId);
  }

  async clearEntityMemory(): Promise<void> {
    this.entityMemory = { nodes: [], lastUpdated: new Date() };
    await this.saveEntityMemory();
  }
}

// React UI Component

interface ChatUIProps {
  app: AgentChatApp;
}

/**
 * Scrollable Chat Viewport Component
 */
interface ScrollableChatViewProps {
  isFocused: boolean;
  messages: ChatMessage[];
}

const ScrollableChatView = memo(function ScrollableChatView({ messages, isFocused }: ScrollableChatViewProps) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const autoScrollRef = useRef(true);
  const prevMessageCountRef = useRef(messages.length);
  
  const MAX_VISIBLE_MESSAGES = 6;

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      if (autoScrollRef.current && messages.length > 0) {
        const maxOffset = Math.max(0, messages.length - MAX_VISIBLE_MESSAGES);
        setScrollOffset(maxOffset);
      }
      prevMessageCountRef.current = messages.length;
    }
  }, [messages.length]);

  useInput(
    (_input, key) => {
      if (!isFocused) return; // Only scroll when chat pane is focused

      if (key.upArrow) {
        autoScrollRef.current = false;
        setScrollOffset(prev => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        const maxOffset = Math.max(0, messages.length - MAX_VISIBLE_MESSAGES);
        setScrollOffset(prev => {
          const newOffset = Math.min(maxOffset, prev + 1);
          if (newOffset >= maxOffset) {
            autoScrollRef.current = true;
          }
          return newOffset;
        });
      } else if (key.pageUp) {
        autoScrollRef.current = false;
        setScrollOffset(prev => Math.max(0, prev - MAX_VISIBLE_MESSAGES));
      } else if (key.pageDown) {
        const maxOffset = Math.max(0, messages.length - MAX_VISIBLE_MESSAGES);
        setScrollOffset(prev => {
          const newOffset = Math.min(maxOffset, prev + MAX_VISIBLE_MESSAGES);
          if (newOffset >= maxOffset) {
            autoScrollRef.current = true;
          }
          return newOffset;
        });
      }
    },
  );

  const visibleStart = Math.max(0, scrollOffset);
  const visibleEnd = Math.min(messages.length, visibleStart + MAX_VISIBLE_MESSAGES);
  const visibleMessages = messages.slice(visibleStart, visibleEnd);
  const maxOffset = Math.max(0, messages.length - MAX_VISIBLE_MESSAGES);
  const canScrollUp = scrollOffset > 0;
  const canScrollDown = scrollOffset < maxOffset;

  if (messages.length === 0) {
    return (
      <Box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
        <Text dimColor>No messages yet. Start chatting!</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1} minHeight={0} overflowY="hidden">
      {canScrollUp && (
        <Box justifyContent="center" marginBottom={1} flexShrink={0}>
          <Text dimColor>↑ {messages.length - visibleStart} messages above (↑↓ to scroll)</Text>
        </Box>
      )}
      
      <Box flexDirection="column" flexGrow={1} minHeight={0}>
        {visibleMessages.map((msg, i) => (
          <Box key={visibleStart + i} flexDirection="column" marginBottom={1}>
            <Text bold color={msg.role === 'user' ? 'green' : 'blue'}>
              {msg.role === 'user' ? 'You' : 'Agent'}:
            </Text>
            <Text>{msg.content}</Text>
          </Box>
        ))}
      </Box>

      {canScrollDown && (
        <Box justifyContent="center" marginTop={1} flexShrink={0}>
          <Text dimColor>↓ {messages.length - visibleEnd} messages below (↑↓ to scroll)</Text>
        </Box>
      )}
    </Box>
  );
});

interface CommandDefinition {
  key: string;
  label: string;
  description: string;
  command: string;
}

const AVAILABLE_COMMANDS: CommandDefinition[] = [
  { key: 'help', label: '/help', description: 'Show help', command: 'help' },
  { key: 'clear', label: '/clear', description: 'Clear current thread messages', command: 'clear' },
  { key: 'new', label: '/new', description: 'Create a new thread', command: 'new' },
  { key: 'thread', label: '/thread', description: 'Show thread list or switch thread', command: 'thread' },
  { key: 'chat', label: '/chat', description: 'Return to chat', command: 'chat' },
];

// Memoized Memory Pane component - only re-renders when its props change

// Memoized Command Selector component
interface CommandSelectorProps {
  filteredCommands: CommandDefinition[];
  selectedCommandIndex: number;
}

const CommandSelector = memo(function CommandSelector({ filteredCommands, selectedCommandIndex }: CommandSelectorProps) {
  return (
    <Box 
      marginBottom={1} 
      borderStyle="single" 
      borderColor="cyan" 
      padding={1}
      flexDirection="column"
    >
      <Text bold color="cyan" dimColor>
        Commands (↑↓ to navigate, Enter to select):
      </Text>
      {filteredCommands.map((cmd, index) => (
        <Box key={cmd.key} flexDirection="row" marginTop={index === 0 ? 0 : 1}>
          <Text color={index === selectedCommandIndex ? 'green' : 'white'} bold={index === selectedCommandIndex}>
            {index === selectedCommandIndex ? '→ ' : '  '}
          </Text>
          <Text color={index === selectedCommandIndex ? 'green' : 'white'} bold={index === selectedCommandIndex}>
            {cmd.label}
          </Text>
          <Text dimColor> - {cmd.description}</Text>
        </Box>
      ))}
    </Box>
  );
});

function ChatUI({ app }: ChatUIProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(app.getMessages());
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingMemory, setIsUpdatingMemory] = useState(false);
  const [view, setView] = useState<'chat' | 'help' | 'threads'>('chat');
  const [summary, setSummary] = useState(app.getConversationSummary());
  const [entityMemory, setEntityMemory] = useState(app.getEntityMemory());
  const [threads, setThreads] = useState(app.getThreads());
  const [currentThread, setCurrentThread] = useState(app.getCurrentThread());
  const [showCommandSelector, setShowCommandSelector] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [focusedPane, setFocusedPane] = useState<'chat' | 'recent' | 'summary' | 'entities' | 'input'>('input');

  const prevMessageCountRef = useRef(messages.length);
  const prevSummaryRef = useRef(summary);
  const prevEntityCountRef = useRef(entityMemory.nodes.length);
  
  // Filter commands based on input after '/'
  const filteredCommands = useMemo(() => {
    if (!input.startsWith('/')) return [];
    const query = input.slice(1).toLowerCase().trim();
    if (query === '') return AVAILABLE_COMMANDS;
    return AVAILABLE_COMMANDS.filter(cmd => 
      cmd.key.toLowerCase().includes(query) || 
      cmd.description.toLowerCase().includes(query)
    );
  }, [input]);
  
  // Show command selector when input starts with '/' and reset selection
  useEffect(() => {
    const shouldShow = input.startsWith('/') && filteredCommands.length > 0;
    setShowCommandSelector(shouldShow);
    if (shouldShow) {
      setSelectedCommandIndex(0);
    }
  }, [input, filteredCommands.length]);
  
  useEffect(() => {
    const currentMessages = app.getMessages();
    const currentSummary = app.getConversationSummary();
    const currentEntityMemory = app.getEntityMemory();
    const currentThreads = app.getThreads();
    const currentThreadObj = app.getCurrentThread();
    
    if (currentMessages.length !== prevMessageCountRef.current) {
      setMessages(currentMessages);
      prevMessageCountRef.current = currentMessages.length;
    }
    if (currentSummary?.messageCount !== prevSummaryRef.current?.messageCount) {
      setSummary(currentSummary);
      prevSummaryRef.current = currentSummary;
    }
    if (currentEntityMemory.nodes.length !== prevEntityCountRef.current) {
      setEntityMemory(currentEntityMemory);
      prevEntityCountRef.current = currentEntityMemory.nodes.length;
    }
    setThreads(currentThreads);
    setCurrentThread(currentThreadObj);
  }, [app]);

  // Handle command execution
  const executeCommand = async (cmd: string, args: string[] = []) => {
    if (cmd === 'help') {
      setView('help');
      setInput('');
      return;
    }

    if (cmd === 'clear') {
      await app.clearCurrentThread();
      setMessages([]);
      setSummary(null);
      setInput('');
      return;
    }

    if (cmd === 'new') {
      const threadName = args.join(' ') || `Thread ${threads.length + 1}`;
      const newThreadId = await app.createThread(threadName);
      await app.switchThread(newThreadId);
      setMessages(app.getMessages());
      setSummary(app.getConversationSummary());
      setView('chat');
      setInput('');
      return;
    }

    if (cmd === 'thread') {
      if (args.length === 0) {
        setView('threads');
        setInput('');
        return;
      }
      
      const threadIdOrName = args.join(' ');
      const thread = threads.find(t => 
        t.id === threadIdOrName || t.name.toLowerCase() === threadIdOrName.toLowerCase()
      );
      
      if (thread) {
        await app.switchThread(thread.id);
        setMessages(app.getMessages());
        setSummary(app.getConversationSummary());
        setView('chat');
        setInput('');
        return;
      }
      
      setInput('');
      return;
    }

    if (cmd === 'chat') {
      setView('chat');
      setInput('');
      return;
    }

    setInput('');
  };

  // Handle arrow key navigation when command selector is visible
  useInput((_inputStr, key) => {
    if (!showCommandSelector || filteredCommands.length === 0) return;
    
    if (key.upArrow) {
      setSelectedCommandIndex(prev => 
        prev > 0 ? prev - 1 : filteredCommands.length - 1
      );
    } else if (key.downArrow) {
      setSelectedCommandIndex(prev => 
        prev < filteredCommands.length - 1 ? prev + 1 : 0
      );
    } else if (key.return && filteredCommands[selectedCommandIndex]) {
      // Fill in the command name when Enter is pressed
      const selectedCmd = filteredCommands[selectedCommandIndex];
      setInput(selectedCmd.label + ' ');
      setShowCommandSelector(false);
      return; // Prevent default Enter behavior
    }
  }, { isActive: showCommandSelector });

  // Handle Tab navigation between panes
  useInput((_inputStr, key) => {
    if (showCommandSelector) return; // Don't interfere with command selector
    
    if (key.tab) {
      const panes: Array<'chat' | 'recent' | 'summary' | 'entities' | 'input'> = [
        'input', 'chat', 'recent', 'summary', 'entities', 'input'
      ];
      const currentIndex = panes.indexOf(focusedPane);
      const nextIndex = (currentIndex + 1) % panes.length;
      setFocusedPane(panes[nextIndex]);
    }
  }, { isActive: !showCommandSelector });

  const handleSubmit = async (value: string) => {
    if (!value.trim()) return;
    
    // If command selector is visible and Enter was pressed, don't submit yet
    if (showCommandSelector && filteredCommands.length > 0) {
      return;
    }

    // Handle slash commands
    if (value.startsWith('/')) {
      const [cmd, ...args] = value.slice(1).split(' ');
      await executeCommand(cmd, args);
      return;
    }

    // Send message to agent
    setIsLoading(true);
    setInput('');

    try {
      await app.sendMessage(value);
      setMessages(app.getMessages());
      
      const messageCount = app.getMessages().length;
      const config = app.getMemoryConfig();
      const messageCountSinceLastUpdate = messageCount - (app.getConversationSummary()?.messageCount || 0);
      
      if (messageCountSinceLastUpdate >= config.summaryUpdateFrequency) {
        setIsUpdatingMemory(true);
        globalThis.setTimeout(() => {
          setIsUpdatingMemory(false);
        }, 2000);
      }
    } catch {
      // Error handled by app
    } finally {
      setIsLoading(false);
    }
  };

  if (view === 'help') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">
          Agent Chat - Help
        </Text>
        <Text> </Text>
        <Text>Commands:</Text>
        <Text>  /help     - Show this help</Text>
        <Text>  /clear    - Clear current thread messages</Text>
        <Text>  /new      - Create a new thread</Text>
        <Text>  /new name - Create a new thread with a name</Text>
        <Text>  /thread   - Show thread list</Text>
        <Text>  /thread &lt;id&gt; - Switch to thread by ID or name</Text>
        <Text>  /chat     - Return to chat</Text>
        <Text> </Text>
        <Text dimColor>Type /chat to return...</Text>
        <Box marginTop={1}>
          <Text>&gt; </Text>
          <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
        </Box>
      </Box>
    );
  }

  if (view === 'threads') {
  return (
    <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">
          Threads ({threads.length})
        </Text>
        <Text> </Text>
        {threads.map((thread) => (
          <Box key={thread.id} flexDirection="row" marginBottom={1}>
            <Text color={thread.id === app.getCurrentThreadId() ? 'green' : 'white'}>
              {thread.id === app.getCurrentThreadId() ? '→ ' : '  '}
              {thread.name}
            </Text>
            <Text dimColor> ({thread.messageCount} messages)</Text>
          </Box>
        ))}
        <Text> </Text>
        <Text dimColor>Type /thread &lt;name&gt; to switch, /new to create, /chat to return</Text>
        <Box marginTop={1}>
          <Text>&gt; </Text>
          <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
        </Box>
      </Box>
    );
  }

  const config = app.getMemoryConfig();
  // Memoize recentMessages so SplitMemoryPanes doesn't re-render on every keystroke
  const recentMessages = useMemo(() => {
    return app.getRecentMessages(config.recentMessagesCount);
  }, [messages.length, config.recentMessagesCount]);

  return (
    <Box flexDirection="row" width="100%" height="100%" flexGrow={1}>
      {/* Left Pane: Chat */}
      <Box flexDirection="column" width="60%" borderStyle="single" borderColor={focusedPane === 'chat' ? 'green' : 'cyan'} padding={1} height="100%">
        <Box borderStyle="round" borderColor="cyan" padding={1} flexDirection="column" flexShrink={0}>
          <Text bold color="cyan">
            Agent Chat 🤖 {focusedPane === 'chat' ? " ▶" : ""}
          </Text>
          <Text dimColor>
            {currentThread ? `Thread: ${currentThread.name}` : 'No thread'} • 
            Type / to see commands • Arrow keys to scroll
              </Text>
            </Box>

        <Box 
          flexDirection="column" 
          marginTop={1} 
          paddingX={1} 
          flexGrow={1}
          minHeight={0}
        >
          <ScrollableChatView messages={messages} isFocused={focusedPane === 'chat'} />
      </Box>

      {isLoading && (
        <Box marginTop={1}>
          <Text color="yellow">Agent is thinking...</Text>
        </Box>
      )}

        {isUpdatingMemory && (
          <Box marginTop={1}>
            <Text color="yellow" dimColor>Updating memory...</Text>
          </Box>
        )}

        {/* Command selector */}
        {showCommandSelector && filteredCommands.length > 0 && (
          <CommandSelector 
            filteredCommands={filteredCommands}
            selectedCommandIndex={selectedCommandIndex}
          />
      )}

      <Box marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
        <Text bold>&gt; </Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder="Type your message..."
        />
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          {messages.length > 0 ? `${messages.length} messages` : 'Ready to chat'}
        </Text>
      </Box>
      </Box>

      {/* Right Pane: Memory - Memoized to prevent re-renders */}
      <SplitMemoryPanes 
        summary={summary}
        focusedPane={(focusedPane === 'recent' || focusedPane === 'summary' || focusedPane === 'entities') ? focusedPane : 'recent'}
        entityMemory={entityMemory}
        recentMessages={recentMessages}
        messages={messages}
      />
    </Box>
  );
}

export default new AgentChatApp();
