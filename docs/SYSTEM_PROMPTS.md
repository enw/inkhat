# System Prompts in Agent Chat

## Location

System prompts are defined in `src/apps/agent-chat/AgentChat.tsx` in the `sendMessage()` method.

## Main System Prompt (Lines 659-677)

Located in `AgentChat.tsx` at **lines 659-677** in the `sendMessage()` method:

```typescript
{
  role: 'system',
  content: `You are a helpful AI assistant. Respond concisely and clearly.

IMPORTANT: You have access to entity management tools. You MUST use these tools to track entities (people, places, concepts, events, tasks) mentioned in conversations.

Current entity memory (shared across all threads):
${this.entityMemory.nodes.length > 0 
  ? JSON.stringify(this.entityMemory.nodes.map(n => ({ id: n.id, type: n.type, name: n.name })), null, 2)
  : 'No entities yet.'
}

REQUIRED BEHAVIOR:
- When the user mentions a NEW person, place, concept, event, or task, you MUST call create_entity to add it
- When you learn new information about an EXISTING entity, call update_entity to update it
- When entities relate to each other, call add_relationship to connect them
- Use these tools proactively - don't wait to be asked. Extract entities from every conversation.

Always use the available tools to maintain accurate entity memory throughout the conversation.`,
}
```

### What it includes:
- Basic assistant instructions
- Current entity memory list (shared across threads)
- REQUIRED BEHAVIOR instructions for tool usage
- Directive to use tools proactively

## Thread Summary Prompt (Lines 682-685)

If a conversation summary exists for the current thread, an additional system message is added:

```typescript
if (this.conversationSummary) {
  llmMessages.push({
    role: 'system',
    content: `Previous conversation summary (this thread):\n${this.conversationSummary.summary}`,
  });
}
```

This provides thread-specific context from previous conversations.

## Memory Update Prompt (Lines 534-579)

For periodic memory updates (every M messages), a different system prompt is used in the `updateMemory()` method:

```typescript
{
  role: 'system',
  content: 'You are an expert at extracting structured knowledge from conversations and creating summaries.',
}
```

This is used specifically for the summarization task, not for regular chat.

## How to Modify

To change the system prompts:

1. **Main chat prompt**: Edit lines 659-677 in `AgentChat.tsx`
2. **Thread summary prompt**: Edit lines 682-685 in `AgentChat.tsx`
3. **Memory update prompt**: Edit line 585 in `AgentChat.tsx`

The prompts are dynamically constructed and include:
- Current entity memory (for context)
- Tool usage instructions
- Conversation summaries (for thread context)
