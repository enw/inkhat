# Inkhat

A framework for building personal productivity TUI (Terminal User Interface) applications with Ink and React.

## Features

- **Plugin Architecture**: Build custom productivity apps as plugins
- **Ports & Adapters**: Pluggable storage backends (JSON files, SQLite, cloud sync)
- **Voice Input**: Quick voice comments and commands
- **Keyboard-Driven**: Efficient vim-like keybindings
- **React/Ink**: Familiar React component model for TUI development

## Example Apps

- **Calendar Manager Agent**: Summarize agenda, find meeting slots, manage appointments

## Installation

```bash
npm install
npm run build
```

## Development

```bash
npm run dev
```

## Architecture

Inkhat uses hexagonal architecture (ports & adapters):
- **Ports**: Abstract interfaces for storage, input, and plugins
- **Adapters**: Concrete implementations (JSON storage, voice input, etc.)
- **Core**: Business logic and app framework
- **Apps**: Individual productivity applications built on the framework
- **UI**: Reusable TUI components

## Quick Start

```bash
# Run the app
npm run dev

# Run tests
npm test

# Build for production
npm run build
npm start
```
