/**
 * App Port - Interface for productivity applications/plugins
 */

import type { ReactElement } from 'react';
import type { StoragePort } from './storage.js';
import type { InputPort } from './input.js';

export interface AppContext {
  storage: StoragePort;
  input: InputPort;
  config: Record<string, any>;
}

export interface AppCommand {
  name: string;
  description: string;
  aliases?: string[];
  execute: (args: string[], context: AppContext) => Promise<void>;
}

export interface App {
  /**
   * Unique app identifier
   */
  readonly id: string;

  /**
   * Display name
   */
  readonly name: string;

  /**
   * App description
   */
  readonly description: string;

  /**
   * App version
   */
  readonly version: string;

  /**
   * Commands provided by this app
   */
  readonly commands: AppCommand[];

  /**
   * Initialize the app with context
   */
  initialize(context: AppContext): Promise<void>;

  /**
   * Render the app UI
   */
  render(): ReactElement;

  /**
   * Cleanup when app is closed
   */
  cleanup(): Promise<void>;
}

export interface AppRegistry {
  /**
   * Register an app
   */
  register(app: App): void;

  /**
   * Get an app by ID
   */
  get(id: string): App | undefined;

  /**
   * List all registered apps
   */
  list(): App[];

  /**
   * Load apps from directory
   */
  loadFromDirectory(path: string): Promise<void>;
}
