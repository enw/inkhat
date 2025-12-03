/**
 * Input Port - Abstract interface for user input
 * Adapters can implement keyboard, voice, or other input methods
 */

export type InputType = 'keyboard' | 'voice' | 'mouse' | 'custom';

export interface InputEvent {
  type: InputType;
  data: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface InputPort {
  /**
   * Start listening for input
   */
  start(): Promise<void>;

  /**
   * Stop listening for input
   */
  stop(): Promise<void>;

  /**
   * Register a handler for input events
   */
  on(handler: (event: InputEvent) => void): void;

  /**
   * Remove a handler
   */
  off(handler: (event: InputEvent) => void): void;

  /**
   * Check if input is available/supported
   */
  isAvailable(): Promise<boolean>;
}

export interface VoiceInputPort extends InputPort {
  /**
   * Start recording voice input
   */
  startRecording(): Promise<void>;

  /**
   * Stop recording and transcribe
   */
  stopRecording(): Promise<string>;

  /**
   * Get transcription of audio
   */
  transcribe(audio: Buffer): Promise<string>;
}
