# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Inkhat is a framework for building personal productivity TUI (Terminal User Interface) applications using Ink and React. It uses hexagonal architecture (ports & adapters) to enable pluggable storage backends, input methods, and productivity apps.

## Key Architectural Concepts

### Hexagonal Architecture (Ports & Adapters)

The codebase follows the ports and adapters pattern:

- **Ports** (`src/ports/`): Abstract interfaces defining contracts
  - `storage.ts`: Data persistence interface (`StoragePort`, `StorageAdapter`)
  - `input.ts`: User input interface (`InputPort`, `VoiceInputPort`)
  - `app.ts`: Productivity app plugin interface (`App`, `AppRegistry`, `AppContext`)

- **Adapters** (`src/adapters/`): Concrete implementations of ports
  - `json-storage.ts`: File-based JSON storage (implements `StoragePort`)
  - `keyboard-input.ts`: Terminal keyboard input (implements `InputPort`)
  - `voice-input.ts`: Voice transcription stub (implements `VoiceInputPort`)

- **Core** (`src/core/`): Business logic
  - `framework.ts`: Main orchestrator that wires ports/adapters together
  - `app-registry.ts`: Manages app registration and lifecycle

### App Plugin System

Apps are self-contained modules that implement the `App` interface:
- Each app lives in `src/apps/<app-name>/`
- Apps export a default instance that gets registered with the framework
- Apps provide commands (CLI-style) and a React component for TUI rendering
- Apps receive an `AppContext` with access to storage, input, and config

### Path Aliases

TypeScript paths are configured in `tsconfig.json`:
```typescript
import { StoragePort } from '@ports/storage';
import { JsonStorage } from '@adapters/json-storage';
import type { App } from '@ports/app';
```

## Development Commands

### Running the App

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

### Code Quality

```bash
# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Watch mode for development
npm run watch
```

### Testing

```bash
# Run tests
npm test

# Run tests with UI
npm test:ui

# Run tests once (CI mode)
npm test:run
```

### CLI Commands

```bash
# Run the interactive TUI
npm run dev

# Execute a command directly
npm run dev -- exec calendar-manager agenda
npm run dev -- exec calendar-manager slots
```

## Creating a New App

1. Create directory structure:
```bash
mkdir -p src/apps/my-app
```

2. Create your app class implementing the `App` interface:
```typescript
// src/apps/my-app/MyApp.tsx
import React from 'react';
import type { App, AppContext, AppCommand } from '@ports/app';

export class MyApp implements App {
  readonly id = 'my-app';
  readonly name = 'My App';
  readonly description = 'Description of what it does';
  readonly version = '0.1.0';

  readonly commands: AppCommand[] = [
    {
      name: 'command-name',
      description: 'What this command does',
      execute: async (args, context) => {
        // Use context.storage for persistence
        // Use context.input for user input
      }
    }
  ];

  async initialize(context: AppContext): Promise<void> {
    // Setup, load data, etc.
  }

  render(): React.ReactElement {
    return <YourUIComponent />;
  }

  async cleanup(): Promise<void> {
    // Save state, close connections
  }
}

export default new MyApp();
```

3. Register in `src/cli.tsx`:
```typescript
import myApp from './apps/my-app/MyApp.js';
framework.getRegistry().register(myApp);
```

## Storage Patterns

Apps use the storage port for data persistence:

```typescript
// Write data
await context.storage.write('my-app/items/item-1', { name: 'foo' });

// Read data
const item = await context.storage.read('my-app/items/item-1');

// List keys
const keys = await context.storage.list('my-app/items/*');

// Query with filters
const items = await context.storage.query({ status: 'active' });
```

Storage keys should be namespaced by app: `<app-id>/<resource-type>/<id>`

## Creating New Storage Adapters

To add a new storage backend (e.g., SQLite):

1. Create adapter in `src/adapters/`:
```typescript
import type { StoragePort, StorageAdapter } from '@ports/storage';

export class SqliteStorage<T> implements StoragePort<T> {
  // Implement all StoragePort methods
}

export const sqliteStorageAdapter: StorageAdapter = {
  name: 'sqlite-storage',
  type: 'sqlite',
  create<T>(): StoragePort<T> {
    return new SqliteStorage<T>();
  }
};
```

2. Use in `src/cli.tsx`:
```typescript
const storage = new SqliteStorage();
```

## Voice Input Integration

Voice input is currently a stub. To enable it:

1. Choose a transcription service (OpenAI Whisper, local model, etc.)
2. Implement audio capture in `src/adapters/voice-input.ts`
3. Add API keys to environment or config
4. Use in apps:
```typescript
context.input.on((event) => {
  if (event.type === 'voice') {
    const text = event.data.text;
    // Process voice command
  }
});
```

## UI Components

Reusable TUI components live in `src/ui/components/`:
- `AppLauncher.tsx`: Select from available apps
- `KeyboardHandler.tsx`: Bridge between Ink's useInput and our input port

Use Ink components for building UIs:
- `Box` for layout
- `Text` for styled text
- `TextInput` for text entry
- `SelectInput` for menus
- `Spinner` for loading states

## Configuration

User configuration is stored in `~/.inkhat/` by default:
- Data files: `~/.inkhat/data/`
- Config: Managed by `conf` package (TODO: add config module)

## Important Notes

- All file imports must use `.js` extensions (ESM requirement)
- The project uses `type: "module"` for native ESM support
- React components for TUI must return valid Ink elements
- Storage operations are async - always await them
- Apps should namespace their storage keys to avoid conflicts
- Voice input requires external transcription service integration

## Example: Calendar Manager Agent

See `src/apps/calendar/` for a complete example app that:
- Manages calendar events with storage
- Provides CLI commands (agenda, add, slots)
- Renders an interactive TUI
- Finds available meeting slots
- Demonstrates the full app lifecycle
