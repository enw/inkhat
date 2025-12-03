/**
 * Keyboard Input Adapter
 * Handles keyboard input via Ink's useInput hook wrapper
 */

import type { InputPort, InputEvent } from '../ports/input.js';

export class KeyboardInput implements InputPort {
  private handlers: Array<(event: InputEvent) => void> = [];
  private isListening = false;

  async start(): Promise<void> {
    this.isListening = true;
  }

  async stop(): Promise<void> {
    this.isListening = false;
  }

  on(handler: (event: InputEvent) => void): void {
    this.handlers.push(handler);
  }

  off(handler: (event: InputEvent) => void): void {
    this.handlers = this.handlers.filter(h => h !== handler);
  }

  async isAvailable(): Promise<boolean> {
    return true; // Keyboard is always available in terminal
  }

  /**
   * Emit a keyboard event (called by UI components)
   */
  emit(key: string, ctrl: boolean = false, meta: boolean = false): void {
    if (!this.isListening) return;

    const event: InputEvent = {
      type: 'keyboard',
      data: { key, ctrl, meta },
      timestamp: new Date(),
      metadata: {}
    };

    for (const handler of this.handlers) {
      handler(event);
    }
  }
}
