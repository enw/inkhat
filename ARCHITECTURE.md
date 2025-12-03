# Inkhat Architecture

## Overview

Inkhat uses **Hexagonal Architecture** (also known as Ports & Adapters) to create a flexible, testable framework for building personal productivity TUI applications.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      CLI Entry Point                         │
│                      (src/cli.tsx)                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Framework Core                            │
│                  (src/core/framework.ts)                     │
│                                                              │
│  • Orchestrates all components                              │
│  • Manages app lifecycle                                    │
│  • Dependency injection                                     │
└──────┬────────────────┬────────────────┬────────────────────┘
       │                │                │
       ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Storage    │  │    Input     │  │  App Registry│
│     Port     │  │     Port     │  │     Port     │
│  (Interface) │  │  (Interface) │  │  (Interface) │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Adapters   │  │   Adapters   │  │ Productivity │
│              │  │              │  │     Apps     │
├──────────────┤  ├──────────────┤  ├──────────────┤
│ • JSON Files │  │ • Keyboard   │  │ • Calendar   │
│ • SQLite*    │  │ • Voice*     │  │ • Tasks*     │
│ • Cloud Sync*│  │ • Mouse*     │  │ • Habits*    │
└──────────────┘  └──────────────┘  └──────────────┘

        (* = Planned/Stub implementation)

┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
│                     (Ink + React)                            │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ AppLauncher │  │   Keyboard  │  │ App-Specific│        │
│  │  Component  │  │   Handler   │  │  Components │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Key Principles

### 1. Dependency Inversion
- Core business logic depends on abstractions (ports), not implementations
- Adapters depend on ports, not vice versa
- Apps receive dependencies via `AppContext`

### 2. Separation of Concerns
```
src/
├── ports/       → Define WHAT (contracts/interfaces)
├── adapters/    → Define HOW (implementations)
├── core/        → Define ORCHESTRATION (business logic)
├── apps/        → Define FEATURES (productivity tools)
└── ui/          → Define PRESENTATION (TUI components)
```

### 3. Plugin Architecture
Apps are independent modules that:
- Implement the `App` interface
- Register with the framework
- Get dependencies injected
- Have complete lifecycle management

## Data Flow

### Write Operation
```
User Action
    ↓
UI Component (React/Ink)
    ↓
App Business Logic
    ↓
StoragePort.write()
    ↓
JSON Storage Adapter
    ↓
Filesystem
```

### Read Operation
```
App Initialization
    ↓
StoragePort.read()
    ↓
JSON Storage Adapter
    ↓
Filesystem
    ↓
Parse & Validate
    ↓
Return to App
    ↓
Render UI
```

### Input Handling
```
Terminal Input (stdin)
    ↓
Ink useInput Hook
    ↓
KeyboardHandler Component
    ↓
KeyboardInput Adapter
    ↓
InputPort.emit()
    ↓
App Input Handlers
    ↓
Update State
    ↓
Re-render
```

## Port Interfaces

### StoragePort
```typescript
interface StoragePort<T> {
  read(key: string): Promise<T | null>
  write(key: string, data: T): Promise<void>
  delete(key: string): Promise<void>
  list(pattern?: string): Promise<string[]>
  exists(key: string): Promise<boolean>
  query(filter: Record<string, any>): Promise<T[]>
  initialize(): Promise<void>
  close(): Promise<void>
}
```

### InputPort
```typescript
interface InputPort {
  start(): Promise<void>
  stop(): Promise<void>
  on(handler: (event: InputEvent) => void): void
  off(handler: (event: InputEvent) => void): void
  isAvailable(): Promise<boolean>
}
```

### App Interface
```typescript
interface App {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly version: string
  readonly commands: AppCommand[]
  initialize(context: AppContext): Promise<void>
  render(): ReactElement
  cleanup(): Promise<void>
}
```

## App Context

Every app receives an `AppContext` with:
```typescript
interface AppContext {
  storage: StoragePort    // Data persistence
  input: InputPort        // User input (keyboard, voice)
  config: Record<any>     // User configuration
}
```

## Storage Patterns

### Namespacing
Apps should namespace their storage keys:
```
<app-id>/<resource-type>/<resource-id>

Examples:
- calendar/events/event-123
- tasks/lists/list-456
- habits/trackers/tracker-789
```

### Data Organization
```
~/.inkhat/
└── data/
    ├── calendar/
    │   └── events/
    │       ├── event-1.json
    │       └── event-2.json
    ├── tasks/
    │   └── lists/
    │       └── list-1.json
    └── config.json
```

## Extension Points

### Adding Storage Adapters
1. Implement `StoragePort<T>` interface
2. Create factory function or adapter object
3. Pass to `Framework` constructor

### Adding Input Methods
1. Implement `InputPort` interface
2. Handle input in your adapter
3. Emit `InputEvent` objects
4. Register with framework

### Creating Apps
1. Implement `App` interface
2. Define commands and UI
3. Register with `AppRegistry`
4. Use `AppContext` for storage/input

## Technology Stack

- **TypeScript**: Type-safe development
- **Node.js**: Runtime (ESM modules)
- **React**: Component model
- **Ink**: Terminal UI rendering
- **Vitest**: Testing framework
- **date-fns**: Date manipulation
- **Zod**: Runtime validation (future)

## Design Decisions

### Why Hexagonal Architecture?
- **Testability**: Easy to mock adapters
- **Flexibility**: Swap implementations without changing business logic
- **Maintainability**: Clear boundaries and responsibilities
- **Extensibility**: Add features without modifying core

### Why Ports & Adapters?
- Different users may want different storage (files, DB, cloud)
- Input methods vary (keyboard, voice, mouse)
- Apps should be storage-agnostic
- Testing requires mockable boundaries

### Why React/Ink for TUI?
- Familiar component model
- Declarative UI updates
- Rich ecosystem of components
- Testable rendering logic

### Why ESM?
- Modern JavaScript standard
- Better tree-shaking
- Clearer import/export semantics
- Future-proof

## Future Enhancements

### Planned Features
1. **Voice Input**: Full Whisper API integration
2. **SQLite Storage**: Relational data support
3. **Cloud Sync**: Multi-device synchronization
4. **Plugin System**: Dynamic app loading
5. **Configuration UI**: Settings management
6. **Theming**: Customizable colors/styles
7. **Keybindings**: User-defined shortcuts
8. **LLM Integration**: AI-powered features

### Potential Apps
- Task/Todo Manager with priorities
- Time Tracker with reports
- Habit Tracker with streaks
- Note Taking with search
- Pomodoro Timer
- Budget Tracker
- Reading List Manager

## Testing Strategy

### Unit Tests
- Test adapters in isolation
- Mock storage for app tests
- Test UI components with Ink Testing Library

### Integration Tests
- Test framework orchestration
- Test app lifecycle
- Test data persistence

### Example Test Structure
```typescript
describe('JsonStorage', () => {
  let storage: JsonStorage

  beforeEach(async () => {
    storage = new JsonStorage({ basePath: tmpDir })
    await storage.initialize()
  })

  it('should write and read data', async () => {
    await storage.write('key', data)
    const result = await storage.read('key')
    expect(result).toEqual(data)
  })
})
```

## Performance Considerations

- Storage operations are async (don't block UI)
- Lazy load apps (only when needed)
- Cache frequently accessed data
- Debounce user input
- Virtual scrolling for long lists
- Minimize re-renders with React.memo

## Security Considerations

- Validate all input data
- Sanitize file paths
- Don't store secrets in plain text
- Use proper file permissions
- Validate JSON schema
- Sandbox plugin execution (future)
