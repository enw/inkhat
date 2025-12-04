# Agent Chat Memory Storage

## Storage Location

All memory for the Agent Chat application is stored in **JSON files** on the local filesystem using the `JsonStorage` adapter.

### Storage Directory
Base path: `~/.inkhat/data/`

### Files and Structure

1. **Entity Memory (Shared)** - `agent-chat/entity-memory.json`
   - Shared across ALL threads
   - Contains structured knowledge graph of entities (people, places, concepts, events, tasks)
   - **Updated on every message** via tool calls (`create_entity`, `update_entity`, `delete_entity`, `add_relationship`, `remove_relationship`)

2. **Thread-Specific Storage**
   - **Messages**: `agent-chat/threads/{threadId}/history.json`
     - Full conversation history for a specific thread
   - **Summary**: `agent-chat/threads/{threadId}/summary.json`
     - Conversation summary (narrative) for a specific thread
     - Updated every M message pairs (configurable via `summaryUpdateFrequency`)

3. **Thread Metadata** - `agent-chat/threads.json`
   - List of all threads with metadata (name, creation date, message count, etc.)

### Storage Implementation
- Uses `JsonStorage` adapter from `src/adapters/json-storage.ts`
- Files are stored as pretty-printed JSON
- All storage operations are async and go through the `StoragePort` interface

### Example File Locations
```
~/.inkhat/data/
└── agent-chat/
    ├── entity-memory.json          # Shared entity knowledge graph
    ├── threads.json                 # Thread list
    └── threads/
        └── thread-1234567890-abc/
            ├── history.json         # Thread messages
            └── summary.json         # Thread conversation summary
```

## Entity Memory Updates

Entity memory is updated **on every message** through LLM tool calls:

- `create_entity`: Create new entities (people, places, concepts, events, tasks)
- `update_entity`: Update existing entity information
- `delete_entity`: Remove entities from the knowledge graph
- `add_relationship`: Connect entities with relationships
- `remove_relationship`: Remove relationships between entities

All entity memory changes are persisted immediately after tool execution.
