/**
 * Agent Chat Demo App
 *
 * Simple demo of LLM-powered conversational agent.
 * Demonstrates the core agent execution capabilities.
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import type { App, AppContext, AppCommand } from '@ports/app.js';
import type { LLMPort, Message } from '@ports/llm.js';
import { OllamaAdapter } from '@adapters/llm/ollama.js';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export class AgentChatApp implements App {
  readonly id = 'agent-chat';
  readonly name = 'Agent Chat';
  readonly description = 'Chat with an AI agent powered by local LLMs';
  readonly version = '0.1.0';

  private context!: AppContext;
  private llm!: LLMPort;
  private messages: ChatMessage[] = [];

  readonly commands: AppCommand[] = [
    {
      name: 'chat',
      description: 'Start a chat session with the agent',
      execute: async (args, context) => {
        this.context = context;
        this.llm = new OllamaAdapter({
          baseUrl: 'http://localhost:11434',
          defaultModel: 'llama3.2',
        });

        // Test connection
        const connected = await this.llm.testConnection();
        if (!connected) {
          return 'Error: Could not connect to Ollama. Make sure Ollama is running (https://ollama.ai)';
        }

        // Load chat history from storage
        const history = await context.storage.read<ChatMessage[]>('agent-chat/history');
        if (history) {
          this.messages = history;
        }

        return 'Chat session started. Type your message to talk with the agent.';
      },
    },
    {
      name: 'clear',
      description: 'Clear chat history',
      execute: async (args, context) => {
        this.messages = [];
        await context.storage.delete('agent-chat/history');
        return 'Chat history cleared.';
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
          return 'Error: Could not connect to Ollama. Make sure Ollama is running.';
        }

        const models = await this.llm.listModels();
        if (models.length === 0) {
          return 'No models found. Pull a model with: ollama pull llama3.2';
        }

        return `Available models:\n${models.map((m) => `  • ${m.name}${m.supportsTools ? ' (supports tools)' : ''}`).join('\n')}`;
      },
    },
  ];

  async initialize(context: AppContext): Promise<void> {
    this.context = context;

    // Initialize LLM
    this.llm = new OllamaAdapter({
      baseUrl: 'http://localhost:11434',
      defaultModel: 'llama3.2',
    });

    // Load chat history
    const history = await context.storage.read<ChatMessage[]>('agent-chat/history');
    if (history) {
      this.messages = history;
    }
  }

  render(): React.ReactElement {
    return <ChatUI app={this} />;
  }

  async cleanup(): Promise<void> {
    // Save chat history
    if (this.messages.length > 0) {
      await this.context.storage.write('agent-chat/history', this.messages);
    }
  }

  // Public methods for UI

  async sendMessage(userMessage: string): Promise<string> {
    // Add user message
    this.messages.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });

    // Convert to LLM format
    const llmMessages: Message[] = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant. Respond concisely and clearly.',
      },
      ...this.messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    try {
      // Get LLM response
      const response = await this.llm.complete({
        messages: llmMessages,
        temperature: 0.7,
        maxTokens: 500,
      });

      // Add assistant message
      this.messages.push({
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
      });

      // Save history
      await this.context.storage.write('agent-chat/history', this.messages);

      return response.content;
    } catch (error) {
      return `Error: ${(error as Error).message}`;
    }
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  async clearHistory(): Promise<void> {
    this.messages = [];
    await this.context.storage.delete('agent-chat/history');
  }
}

// React UI Component

interface ChatUIProps {
  app: AgentChatApp;
}

function ChatUI({ app }: ChatUIProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(app.getMessages());
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'chat' | 'help'>('chat');

  const handleSubmit = async (value: string) => {
    if (!value.trim()) return;

    // Handle commands
    if (value === '/help') {
      setView('help');
      setInput('');
      return;
    }

    if (value === '/clear') {
      await app.clearHistory();
      setMessages([]);
      setInput('');
      return;
    }

    if (value === '/chat') {
      setView('chat');
      setInput('');
      return;
    }

    // Send message to agent
    setIsLoading(true);
    setInput('');

    try {
      await app.sendMessage(value);
      setMessages(app.getMessages());
    } catch (error) {
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
        <Text>  /help   - Show this help</Text>
        <Text>  /clear  - Clear chat history</Text>
        <Text>  /chat   - Return to chat</Text>
        <Text> </Text>
        <Text dimColor>Type /chat to return...</Text>
        <Box marginTop={1}>
          <Text>&gt; </Text>
          <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="round" borderColor="cyan" padding={1} flexDirection="column">
        <Text bold color="cyan">
          Agent Chat Demo 🤖
        </Text>
        <Text dimColor>Powered by Ollama • Type /help for commands</Text>
      </Box>

      <Box flexDirection="column" marginTop={1} paddingX={1}>
        {messages.length === 0 ? (
          <Text dimColor>No messages yet. Start chatting!</Text>
        ) : (
          messages.slice(-10).map((msg, i) => (
            <Box key={i} flexDirection="column" marginBottom={1}>
              <Text bold color={msg.role === 'user' ? 'green' : 'blue'}>
                {msg.role === 'user' ? 'You' : 'Agent'}:
              </Text>
              <Text>{msg.content}</Text>
            </Box>
          ))
        )}
      </Box>

      {isLoading && (
        <Box marginTop={1}>
          <Text color="yellow">Agent is thinking...</Text>
        </Box>
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
  );
}

export default new AgentChatApp();
