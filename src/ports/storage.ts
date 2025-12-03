/**
 * Storage Port - Abstract interface for data persistence
 * Adapters can implement this for JSON files, SQLite, cloud storage, etc.
 */

export interface StoragePort<T = any> {
  /**
   * Read data by key
   */
  read(key: string): Promise<T | null>;

  /**
   * Write data by key
   */
  write(key: string, data: T): Promise<void>;

  /**
   * Delete data by key
   */
  delete(key: string): Promise<void>;

  /**
   * List all keys matching pattern
   */
  list(pattern?: string): Promise<string[]>;

  /**
   * Check if key exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Query data with filters
   */
  query(filter: Record<string, any>): Promise<T[]>;

  /**
   * Initialize storage (create directories, connections, etc.)
   */
  initialize(): Promise<void>;

  /**
   * Close storage connections
   */
  close(): Promise<void>;
}

export interface StorageAdapter {
  readonly name: string;
  readonly type: 'json' | 'sqlite' | 'cloud' | 'custom';
  create<T = any>(): StoragePort<T>;
}
