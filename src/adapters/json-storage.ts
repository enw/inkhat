/**
 * JSON File Storage Adapter
 * Stores data as JSON files in the filesystem
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { StoragePort, StorageAdapter } from '../ports/storage.js';

export interface JsonStorageConfig {
  basePath?: string;
  pretty?: boolean;
}

export class JsonStorage<T = any> implements StoragePort<T> {
  private basePath: string;
  private pretty: boolean;

  constructor(config: JsonStorageConfig = {}) {
    this.basePath = config.basePath || path.join(os.homedir(), '.inkhat', 'data');
    this.pretty = config.pretty ?? true;
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.basePath, { recursive: true });
  }

  async read(key: string): Promise<T | null> {
    const filePath = this.getFilePath(key);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async write(key: string, data: T): Promise<void> {
    const filePath = this.getFilePath(key);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    const json = this.pretty
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);

    await fs.writeFile(filePath, json, 'utf-8');
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async list(pattern?: string): Promise<string[]> {
    const keys: string[] = [];
    await this.scanDirectory(this.basePath, '', keys);

    if (pattern) {
      const regex = new RegExp(pattern);
      return keys.filter(key => regex.test(key));
    }

    return keys;
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async query(filter: Record<string, any>): Promise<T[]> {
    const keys = await this.list();
    const results: T[] = [];

    for (const key of keys) {
      const data = await this.read(key);
      if (data && this.matchesFilter(data, filter)) {
        results.push(data);
      }
    }

    return results;
  }

  async close(): Promise<void> {
    // No persistent connections to close for file-based storage
  }

  private getFilePath(key: string): string {
    return path.join(this.basePath, `${key}.json`);
  }

  private async scanDirectory(dir: string, prefix: string, keys: string[]): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const keyPath = prefix ? `${prefix}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, keyPath, keys);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          keys.push(keyPath.replace(/\.json$/, ''));
        }
      }
    } catch (error) {
      // Directory doesn't exist or isn't accessible
    }
  }

  private matchesFilter(data: any, filter: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (data[key] !== value) {
        return false;
      }
    }
    return true;
  }
}

export const jsonStorageAdapter: StorageAdapter = {
  name: 'json-storage',
  type: 'json',
  create<T = any>(config?: JsonStorageConfig): StoragePort<T> {
    return new JsonStorage<T>(config);
  }
};
