/**
 * Inkhat Framework Core
 * Main orchestrator for the productivity app framework
 */

import type { App, AppContext, AppRegistry } from '../ports/app.js';
import type { StoragePort } from '../ports/storage.js';
import type { InputPort } from '../ports/input.js';
import { DefaultAppRegistry } from './app-registry.js';

export interface FrameworkConfig {
  storage: StoragePort;
  input: InputPort;
  appRegistry?: AppRegistry;
  config?: Record<string, any>;
}

export class Framework {
  private storage: StoragePort;
  private input: InputPort;
  private registry: AppRegistry;
  private config: Record<string, any>;
  private currentApp: App | null = null;
  private context: AppContext;

  constructor(config: FrameworkConfig) {
    this.storage = config.storage;
    this.input = config.input;
    this.registry = config.appRegistry || new DefaultAppRegistry();
    this.config = config.config || {};

    this.context = {
      storage: this.storage,
      input: this.input,
      config: this.config
    };
  }

  async initialize(): Promise<void> {
    await this.storage.initialize();
    await this.input.start();
  }

  getRegistry(): AppRegistry {
    return this.registry;
  }

  async launchApp(appId: string): Promise<void> {
    const app = this.registry.get(appId);
    if (!app) {
      throw new Error(`App "${appId}" not found`);
    }

    // Cleanup current app if any
    if (this.currentApp) {
      await this.currentApp.cleanup();
    }

    // Initialize new app
    await app.initialize(this.context);
    this.currentApp = app;
  }

  getCurrentApp(): App | null {
    return this.currentApp;
  }

  async executeCommand(appId: string, commandName: string, args: string[]): Promise<void> {
    const app = this.registry.get(appId);
    if (!app) {
      throw new Error(`App "${appId}" not found`);
    }

    const command = app.commands.find(
      cmd => cmd.name === commandName || cmd.aliases?.includes(commandName)
    );

    if (!command) {
      throw new Error(`Command "${commandName}" not found in app "${appId}"`);
    }

    await command.execute(args, this.context);
  }

  async shutdown(): Promise<void> {
    if (this.currentApp) {
      await this.currentApp.cleanup();
      this.currentApp = null;
    }

    await this.input.stop();
    await this.storage.close();
  }
}
