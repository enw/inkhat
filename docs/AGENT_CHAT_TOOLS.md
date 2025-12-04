# Agent Chat Entity Management Tools

## Overview

Entity Memory is now updated **on every message** using LLM tool calls. The agent can create, update, delete entities and manage relationships in real-time during conversations.

## Available Tools

### 1. `create_entity`
Create a new entity in the knowledge graph.

**Parameters:**
- `id` (required): Unique identifier (e.g., "person-alice", "concept-machine-learning")
- `type` (required): One of: "person", "place", "concept", "event", "task", "other"
- `name` (required): Display name
- `description` (required): What we know about this entity
- `properties` (optional): Additional key-value attributes

### 2. `update_entity`
Update an existing entity with new information.

**Parameters:**
- `id` (required): Entity ID to update
- `name` (optional): Updated name
- `description` (optional): Updated description
- `properties` (optional): Properties to merge with existing ones

### 3. `delete_entity`
Delete an entity from the knowledge graph (also removes all relationships).

**Parameters:**
- `id` (required): Entity ID to delete

### 4. `add_relationship`
Add or update a relationship between two entities.

**Parameters:**
- `sourceId` (required): ID of source entity
- `targetId` (required): ID of target entity
- `relationship` (required): Type of relationship (e.g., "works_at", "is_a", "created")
- `strength` (optional): Relationship strength 0-1 (default: 0.5)

### 5. `remove_relationship`
Remove a relationship between two entities.

**Parameters:**
- `sourceId` (required): ID of source entity
- `targetId` (required): ID of target entity
- `relationship` (required): Type of relationship to remove

## How It Works

1. **On Every Message**: Tools are included in every LLM request
2. **Tool Execution**: If the LLM makes tool calls, they are executed immediately
3. **Entity Memory Update**: Entity memory is updated in real-time
4. **Persistence**: Changes are saved to `~/.inkhat/data/agent-chat/entity-memory.json`
5. **Shared Memory**: Entity memory is shared across all threads

## Example Flow

```
User: "My friend Alice works at Google in San Francisco."

LLM calls tools:
- create_entity({ id: "person-alice", type: "person", name: "Alice", ... })
- create_entity({ id: "place-google", type: "place", name: "Google", ... })
- create_entity({ id: "place-sf", type: "place", name: "San Francisco", ... })
- add_relationship({ sourceId: "person-alice", targetId: "place-google", relationship: "works_at" })
- add_relationship({ sourceId: "place-google", targetId: "place-sf", relationship: "located_in" })

Entity memory updated immediately!
```

## Storage

See [AGENT_CHAT_STORAGE.md](./AGENT_CHAT_STORAGE.md) for details on where entity memory is stored.
