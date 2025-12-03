/**
 * Tests for JSON Storage Adapter
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JsonStorage } from './json-storage.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('JsonStorage', () => {
  let storage: JsonStorage;
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `inkhat-test-${Date.now()}`);
    storage = new JsonStorage({ basePath: testDir });
    await storage.initialize();
  });

  afterEach(async () => {
    await storage.close();
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should initialize and create base directory', async () => {
    const stats = await fs.stat(testDir);
    expect(stats.isDirectory()).toBe(true);
  });

  it('should write and read data', async () => {
    const key = 'test/item';
    const data = { name: 'test', value: 42 };

    await storage.write(key, data);
    const result = await storage.read(key);

    expect(result).toEqual(data);
  });

  it('should return null for non-existent key', async () => {
    const result = await storage.read('non-existent');
    expect(result).toBeNull();
  });

  it('should delete data', async () => {
    const key = 'test/item';
    await storage.write(key, { name: 'test' });
    await storage.delete(key);

    const result = await storage.read(key);
    expect(result).toBeNull();
  });

  it('should check if key exists', async () => {
    const key = 'test/item';
    expect(await storage.exists(key)).toBe(false);

    await storage.write(key, { name: 'test' });
    expect(await storage.exists(key)).toBe(true);
  });

  it('should list all keys', async () => {
    await storage.write('test/item1', { name: 'one' });
    await storage.write('test/item2', { name: 'two' });
    await storage.write('other/item3', { name: 'three' });

    const keys = await storage.list();
    expect(keys).toHaveLength(3);
    expect(keys).toContain('test/item1');
    expect(keys).toContain('test/item2');
    expect(keys).toContain('other/item3');
  });

  it('should filter keys by pattern', async () => {
    await storage.write('test/item1', { name: 'one' });
    await storage.write('test/item2', { name: 'two' });
    await storage.write('other/item3', { name: 'three' });

    const keys = await storage.list('^test/');
    expect(keys).toHaveLength(2);
    expect(keys).toContain('test/item1');
    expect(keys).toContain('test/item2');
  });

  it('should query data with filter', async () => {
    await storage.write('test/item1', { name: 'one', status: 'active' });
    await storage.write('test/item2', { name: 'two', status: 'inactive' });
    await storage.write('test/item3', { name: 'three', status: 'active' });

    const results = await storage.query({ status: 'active' });
    expect(results).toHaveLength(2);
    expect(results.map(r => r.name)).toContain('one');
    expect(results.map(r => r.name)).toContain('three');
  });
});
