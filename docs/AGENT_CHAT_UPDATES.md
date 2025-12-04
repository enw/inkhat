# Agent Chat Updates Summary

## ✅ Bug Fixes

### 1. Fixed undefined description bug
**Location:** `src/apps/agent-chat/SplitMemoryPanes.tsx:140`

**Issue:** `node.description` could be undefined, causing error when calling `.slice()`

**Fix:** Added null check before accessing description:
```typescript
{node.description && (
  <Text dimColor>
    {node.description.slice(0, 80)}
    {node.description.length > 80 ? '...' : ''}
  </Text>
)}
```

## ✅ Feature: Tool Call Display

### Tool Calls in Chat Messages
Tool calls are now tracked and displayed in chat messages. When an agent uses tools, you'll see:
- 🔧 Tools used: create_entity, update_entity
- • create_entity: Created entity: Alice (person-alice)
- • update_entity: Updated entity: person-alice

**Location:** Displayed in `ScrollableChatView` component when messages have `toolCalls` property.

### Tool Call Indicator in Header
The chat header now shows: "🔧 Entity tools enabled: Agents use tools to track entities automatically"

## 📍 System Prompts Location

All system prompts are in `src/apps/agent-chat/AgentChat.tsx`:

1. **Main Chat Prompt** (Lines 660-677)
   - Instructions for entity tool usage
   - Current entity memory context
   - REQUIRED BEHAVIOR section

2. **Thread Summary Prompt** (Lines 682-685)
   - Adds conversation summary context for thread

3. **Memory Update Prompt** (Line 585)
   - Used for periodic summarization

See `docs/SYSTEM_PROMPTS.md` for full details.

## 🔧 Entity Tools

Tools are included in every LLM request:
- `create_entity` - Create new entities
- `update_entity` - Update existing entities
- `delete_entity` - Remove entities
- `add_relationship` - Connect entities
- `remove_relationship` - Remove connections

**Location:** `src/apps/agent-chat/AgentChat.tsx:300-369` (getEntityTools method)
