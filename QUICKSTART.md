# Inkhat Quick Start Guide

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

## Running Your First App

```bash
# Start in development mode
npm run dev
```

You'll see the app launcher with the Calendar Manager Agent available. Use arrow keys to select and Enter to launch.

## Using the Calendar Manager Agent

### Interactive Mode

1. Run `npm run dev`
2. Select "Calendar Manager Agent"
3. Use keyboard shortcuts:
   - `[1]` - View today's agenda
   - `[2]` - Add new event
   - `[3]` - Find available meeting slots
   - `[q]` - Quit
   - `[b]` - Back to app launcher

### CLI Commands

```bash
# View today's agenda
npm run dev -- exec calendar-manager agenda

# Find available slots
npm run dev -- exec calendar-manager slots
```

## Product Requirements Summary

Based on your requirements, Inkhat provides:

### ✅ Framework/Platform Architecture
- Plugin-based system for building custom productivity apps
- Reusable components and standardized interfaces
- Easy app registration and lifecycle management

### ✅ Configurable Storage (Ports & Adapters)
- Abstract `StoragePort` interface
- JSON file adapter (implemented)
- Ready for SQLite, cloud sync, and other adapters
- Pluggable design - swap storage without changing app code

### ✅ Keyboard-Driven Interface
- Vim-like keybindings support
- Arrow key navigation
- Form inputs and text entry
- Interactive menus

### 🚧 Voice Input (Stub Implementation)
- Interface defined (`VoiceInputPort`)
- Ready for integration with:
  - OpenAI Whisper API
  - Local Whisper models
  - Google Speech-to-Text
  - AWS Transcribe

## Example Apps Included

### 1. Calendar Manager Agent
**Features:**
- Summarize today's agenda
- Find open meeting slots
- Add and modify appointments
- Store events in JSON files

**Location:** `src/apps/calendar/`

## Creating Your Next App

### Step 1: Define Your App Structure

```bash
mkdir -p src/apps/my-app
```

### Step 2: Implement the App Interface

See `CLAUDE.md` for detailed instructions on implementing the `App` interface.

### Step 3: Register Your App

Edit `src/cli.tsx`:

```typescript
import myApp from './apps/my-app/MyApp.js';
framework.getRegistry().register(myApp);
```

### Step 4: Run and Test

```bash
npm run dev
```

## Next Steps

1. **Add Voice Input**: Integrate a transcription service in `src/adapters/voice-input.ts`
2. **Build More Apps**:
   - Task Manager
   - Time Tracker
   - Habit Tracker
   - Note Taking App
3. **Add Storage Adapters**: Implement SQLite or cloud sync
4. **Enhance UI**: Create more reusable TUI components
5. **Add Configuration**: User settings and preferences

## Architecture at a Glance

```
src/
├── ports/           # Abstract interfaces
│   ├── storage.ts   # Data persistence contract
│   ├── input.ts     # User input contract
│   └── app.ts       # App plugin contract
├── adapters/        # Concrete implementations
│   ├── json-storage.ts
│   ├── keyboard-input.ts
│   └── voice-input.ts
├── core/            # Framework business logic
│   ├── framework.ts
│   └── app-registry.ts
├── apps/            # Productivity applications
│   └── calendar/
├── ui/              # TUI components
│   ├── App.tsx
│   └── components/
└── cli.tsx          # Entry point
```

## Resources

- **CLAUDE.md**: Detailed development guide for Claude Code
- **README.md**: Project overview
- [Ink Documentation](https://github.com/vadimdemedes/ink)
- [React Documentation](https://react.dev)

## Getting Help

Check the following resources:
1. `CLAUDE.md` - Comprehensive developer guide
2. Example apps in `src/apps/`
3. Type definitions in `src/ports/`
4. Tests in `src/**/*.test.ts`

Happy building! 🎯
