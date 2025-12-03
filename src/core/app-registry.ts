/**
 * App Registry Implementation
 * Manages registration and lifecycle of productivity apps
 */

import type { App, AppRegistry } from '../ports/app.js';
import fs from 'fs/promises';
import path from 'path';

export class DefaultAppRegistry implements AppRegistry {
  private apps: Map<string, App> = new Map();

  register(app: App): void {
    if (this.apps.has(app.id)) {
      throw new Error(`App with id "${app.id}" is already registered`);
    }
    this.apps.set(app.id, app);
  }

  get(id: string): App | undefined {
    return this.apps.get(id);
  }

  list(): App[] {
    return Array.from(this.apps.values());
  }

  async loadFromDirectory(dirPath: string): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const appPath = path.join(dirPath, entry.name, 'index.js');
          try {
            const module = await import(appPath);
            const app = module.default as App;
            this.register(app);
          } catch (error) {
            console.error(`Failed to load app from ${appPath}:`, error);
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist, that's okay
    }
  }

  unregister(id: string): boolean {
    return this.apps.delete(id);
  }

  clear(): void {
    this.apps.clear();
  }
}
