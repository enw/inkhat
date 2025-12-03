/**
 * Keyboard Handler Component
 * Wraps Ink's useInput to integrate with our input port
 */

import React from 'react';
import { useInput } from 'ink';
import type { KeyboardInput } from '../../adapters/keyboard-input.js';

interface KeyboardHandlerProps {
  input: KeyboardInput;
  children?: React.ReactNode;
}

export const KeyboardHandler: React.FC<KeyboardHandlerProps> = ({ input, children }) => {
  useInput((inputStr, key) => {
    input.emit(inputStr, key.ctrl, key.meta);
  });

  return <>{children}</>;
};
