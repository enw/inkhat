# Agent Chat Memory Management

## Overview

The Agent Chat app features an advanced memory management system that maintains both conversation context and structured entity knowledge. The interface is split into two panes: a chat interface on the left and a memory dashboard on the right.

## Architecture

### Split Interface

```
┌─────────────────────────────────────────────────────────┐
│                    Agent Chat UI                        │
├──────────────────────────────┬──────────────────────────┤
│   Chat Pane (60%)           │  Memory Pane (40%)        │
│   - Last N messages         │  - Recent Messages        │
│   - Input field             │  - Conversation Summary   │
│   - Loading indicators      │  - Entity Memory Graph    │
└──────────────────────────────┴──────────────────────────┘
```

### Memory Components

1. **Recent Messages (N messages)**
   - Shows the last N messages in the conversation
   - Used for immediate context in LLM requests
   - Configurable via `recentMessagesCount` (default: 10)

2. **Conversation Summary**
   - Narrative summary of the entire conversation
   - Updated every M message pairs (configurable, default: 5)
   - Captures flow, topics, and context
   - Stored separately from entity memory

3. **Entity Memory Graph**
   - Structured knowledge graph of entities
   - Entity types: person, place, concept, event, task, other
   - Relationships between entities with strength indicators
   - Updated incrementally with each summary update

## Configuration

```typescript
interface MemoryConfig {
  recentMessagesCount: number;      // N - how many recent messages to show
  summaryUpdateFrequency: number;   // M - update summary every M messages
}
```

Default values:
- `recentMessagesCount`: 10
- `summaryUpdateFrequency`: 5

## Data Structures

### ConversationSummary

```typescript
interface ConversationSummary {
  summary: string;           // Narrative summary text
  lastUpdated: Date;         // When it was last updated
  messageCount: number;      // Message count when updated
}
```

### EntityNode

```typescript
interface EntityNode {
  id: string;                // Unique identifier
  type: 'person' | 'place' | 'concept' | 'event' | 'task' | 'other';
  name: string;              // Entity name
  description: string;       // What we know about it
  properties: Record<string, unknown>;  // Key-value attributes
  relationships: Array<{     // Connections to other entities
    targetId: string;
    relationship: string;
    strength: number;        // 0-1 scale
  }>;
}
```

### EntityMemory

```typescript
interface EntityMemory {
  nodes: EntityNode[];       // All entity nodes
  lastUpdated: Date;         // When last updated
}
```

## Memory Update Process

1. **Trigger**: After M message pairs are exchanged
2. **Input**: 
   - Previous conversation summary (or "No previous conversation")
   - Latest M messages since last summary
   - Current entity memory graph
3. **LLM Processing**:
   - Specialized prompt that distinguishes conversation memory from entity memory
   - Temperature: 0.3 (for consistent structured output)
   - Max tokens: 2000
4. **Output Parsing**:
   - Extract conversation summary from `=== CONVERSATION MEMORY ===` section
   - Extract entity nodes from `=== ENTITY MEMORY ===` section (JSON array)
5. **Storage**:
   - Merge new entities with existing ones
   - Update existing entities if IDs match
   - Save to persistent storage

## Memory Prompt

The summarization prompt explicitly separates two types of memory:

```
=== CONVERSATION MEMORY ===
[Provides a concise summary of the conversation flow, topics discussed, 
and context. This is narrative text that captures the flow of the 
conversation.]

=== ENTITY MEMORY ===
[Provides a JSON array of entity nodes with:
- id, type, name, description, properties
- relationships array with targetId, relationship, strength
Updates existing entities, adds new ones, strengthens/weakens 
relationships based on new information.]
```

This distinction allows the system to maintain:
- **Conversation Memory**: Coherent narrative understanding
- **Entity Memory**: Structured knowledge base

## Persistence

All memory is persisted to storage using JSON files:

- `agent-chat/history`: Full conversation history
- `agent-chat/conversation-summary`: Latest conversation summary
- `agent-chat/entity-memory`: Entity memory graph

Memory is automatically:
- Loaded when the app initializes
- Saved after each message exchange
- Updated during summary generation
- Cleared with `/clear` command

## Usage in LLM Requests

When sending a message to the LLM, the context includes:

1. **System prompt**: Standard assistant instructions
2. **Conversation summary** (if available): Previous conversation context
3. **Recent messages**: Last N messages for immediate context

This hybrid approach provides:
- Long-term context via summary
- Immediate context via recent messages
- Structured knowledge via entity memory (could be used for retrieval)

## Example Flow

1. User sends 5 messages → Conversation summary generated
2. Entity graph extracted from those 5 messages
3. Summary + entities saved to storage
4. Next 5 messages → Summary updated with new context
5. Entity graph merged/updated with new entities
6. Process repeats

## Future Enhancements

Potential improvements:
- Entity memory retrieval for RAG (Retrieval Augmented Generation)
- Memory search across conversations
- Memory visualization/graph view
- Configurable memory update frequency per conversation
- Memory compression for very long conversations
- Entity relationship visualization

## Configuration Customization

To customize memory settings, modify the `memoryConfig` in `AgentChatApp`:

```typescript
private memoryConfig: MemoryConfig = {
  recentMessagesCount: 15,        // Show more recent messages
  summaryUpdateFrequency: 3,      // Update more frequently
};
```

## Troubleshooting

**Memory not updating:**
- Check that Ollama is running and accessible
- Verify the LLM can generate structured JSON output
- Check console for parsing errors

**Entity memory not parsing:**
- The system gracefully falls back to existing memory if parsing fails
- Check that the LLM response includes proper JSON formatting
- Verify the prompt format matches expected output

**Memory storage errors:**
- Check storage permissions in `~/.inkhat/data/`
- Verify JSON files are not corrupted
- Clear memory with `/clear` to reset if needed

