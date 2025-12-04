# Viewing Agent Chat Memory Files

## Entity Memory (Shared Across All Threads)

**Location:** `~/.inkhat/data/agent-chat/entity-memory.json`

This file contains all entities (people, places, concepts, events, tasks) that have been extracted from conversations, shared across all threads.

### View the full entity memory:

```bash
# Pretty-printed with jq (if installed)
cat ~/.inkhat/data/agent-chat/entity-memory.json | jq

# Or just view it directly
cat ~/.inkhat/data/agent-chat/entity-memory.json

# Or open in your editor
code ~/.inkhat/data/agent-chat/entity-memory.json
```

### Structure:
```json
{
  "nodes": [
    {
      "id": "entity-id",
      "type": "person|place|concept|event|task|other",
      "name": "Entity Name",
      "description": "What we know about this entity",
      "properties": {
        "key": "value"
      },
      "relationships": [
        {
          "targetId": "other-entity-id",
          "relationship": "relationship type",
          "strength": 0.5
        }
      ]
    }
  ],
  "lastUpdated": "2024-12-04T15:43:00.000Z"
}
```

## Thread-Specific Memory

### Conversation History

**Location:** `~/.inkhat/data/agent-chat/threads/{threadId}/history.json`

Contains all messages for a specific thread.

### Conversation Summary

**Location:** `~/.inkhat/data/agent-chat/threads/{threadId}/summary.json`

Contains the narrative summary for a specific thread.

### List all threads:

```bash
cat ~/.inkhat/data/agent-chat/threads.json | jq
```

### View a specific thread:

```bash
# List thread directories
ls ~/.inkhat/data/agent-chat/threads/

# View a thread's history
cat ~/.inkhat/data/agent-chat/threads/{threadId}/history.json | jq

# View a thread's summary
cat ~/.inkhat/data/agent-chat/threads/{threadId}/summary.json | jq
```

## Quick Access Commands

```bash
# View entity memory
cat ~/.inkhat/data/agent-chat/entity-memory.json | jq

# List all threads
cat ~/.inkhat/data/agent-chat/threads.json | jq '.[] | {id, name, messageCount, lastMessageAt}'

# View most recent thread's history
LATEST=$(ls -t ~/.inkhat/data/agent-chat/threads/ | head -1)
cat ~/.inkhat/data/agent-chat/threads/$LATEST/history.json | jq
```

## File Locations Summary

```
~/.inkhat/data/agent-chat/
├── entity-memory.json          # Shared entity knowledge graph
├── threads.json                 # Thread metadata
└── threads/
    └── {threadId}/
        ├── history.json         # Thread messages
        └── summary.json         # Thread conversation summary
```
