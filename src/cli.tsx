#!/usr/bin/env node

/**
 * Inkhat CLI Entry Point
 */

import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import { Framework } from './core/framework.js';
import { JsonStorage } from './adapters/json-storage.js';
import { KeyboardInput } from './adapters/keyboard-input.js';
import { App } from './ui/App.js';
import calendarApp from './apps/calendar/CalendarManager.js';
import agentChatApp from './apps/agent-chat/AgentChat.js';

const program = new Command();

program
  .name('inkhat')
  .description('A framework for building personal productivity TUI applications')
  .version('0.1.0');

program
  .command('run', { isDefault: true })
  .description('Run the Inkhat TUI')
  .action(async () => {
    // Initialize adapters
    const storage = new JsonStorage();
    const keyboardInput = new KeyboardInput();

    // Create framework
    const framework = new Framework({
      storage,
      input: keyboardInput,
      config: {}
    });

    // Initialize framework
    await framework.initialize();

    // Register built-in apps
    framework.getRegistry().register(calendarApp);
    framework.getRegistry().register(agentChatApp);

    // Render the UI
    const { unmount, waitUntilExit } = render(
      <App framework={framework} keyboardInput={keyboardInput} />
    );

    // Handle exit
    try {
      await waitUntilExit();
    } finally {
      await framework.shutdown();
      unmount();
    }
  });

program
  .command('exec <app> <command>')
  .description('Execute a command from an app')
  .action(async (appId: string, commandName: string, ...args: string[]) => {
    const storage = new JsonStorage();
    const keyboardInput = new KeyboardInput();

    const framework = new Framework({
      storage,
      input: keyboardInput,
      config: {}
    });

    await framework.initialize();
    framework.getRegistry().register(calendarApp);
    framework.getRegistry().register(agentChatApp);

    try {
      await framework.executeCommand(appId, commandName, args);
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    } finally {
      await framework.shutdown();
    }
  });

program.parse();
