/**
 * Enhanced Text Input Component with Readline Shortcuts
 * 
 * Provides standard terminal editing shortcuts:
 * - Ctrl+A: Move to beginning of line
 * - Ctrl+E: Move to end of line
 * - Ctrl+K: Cut from cursor to end of line
 * - Ctrl+U: Cut from cursor to beginning of line
 * - Ctrl+Y: Paste (yank) the last cut text
 * - Ctrl+W: Delete word before cursor
 * - Ctrl+B: Move back one character
 * - Ctrl+F: Move forward one character
 * - Ctrl+D: Delete character after cursor
 */

import React, { useState, useRef, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

interface EnhancedTextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  focus?: boolean;
}

export function EnhancedTextInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  focus = true,
}: EnhancedTextInputProps) {
  const [cursorPosition, setCursorPosition] = useState(value.length);
  const killRingRef = useRef<string>(''); // Stores text cut with Ctrl+K or Ctrl+U

  // Sync cursor position when value changes externally
  useEffect(() => {
    if (cursorPosition > value.length) {
      setCursorPosition(value.length);
    }
  }, [value, cursorPosition]);

  // Reset cursor to end when value changes externally
  useEffect(() => {
    if (cursorPosition === value.length - 1 && value.length > 0) {
      // Value was likely modified externally, sync cursor
      setCursorPosition(value.length);
    }
  }, [value.length]);

  useInput(
    (input, key) => {
      if (!focus) return;

      // Handle Enter
      if (key.return) {
        if (onSubmit) {
          onSubmit(value);
        }
        return;
      }

      // Handle Ctrl+key combinations
      if (key.ctrl) {
        switch (input.toLowerCase()) {
          case 'a': // Beginning of line
            setCursorPosition(0);
            return;

          case 'e': // End of line
            setCursorPosition(value.length);
            return;

          case 'k': // Kill from cursor to end of line
            if (cursorPosition < value.length) {
              killRingRef.current = value.slice(cursorPosition);
              const newValue = value.slice(0, cursorPosition);
              onChange(newValue);
              setCursorPosition(newValue.length);
            }
            return;

          case 'u': // Kill from cursor to beginning of line
            if (cursorPosition > 0) {
              killRingRef.current = value.slice(0, cursorPosition);
              const newValue = value.slice(cursorPosition);
              onChange(newValue);
              setCursorPosition(0);
            }
            return;

          case 'y': // Yank (paste) the last killed text
            if (killRingRef.current) {
              const newValue =
                value.slice(0, cursorPosition) +
                killRingRef.current +
                value.slice(cursorPosition);
              onChange(newValue);
              setCursorPosition(cursorPosition + killRingRef.current.length);
            }
            return;

          case 'w': // Delete word before cursor
            {
              const beforeCursor = value.slice(0, cursorPosition);
              const match = beforeCursor.match(/(\S+\s*)$/);
              if (match) {
                const wordLength = match[1].length;
                const newValue =
                  value.slice(0, cursorPosition - wordLength) +
                  value.slice(cursorPosition);
                onChange(newValue);
                setCursorPosition(cursorPosition - wordLength);
              }
            }
            return;

          case 'b': // Move back one character
            if (cursorPosition > 0) {
              setCursorPosition(cursorPosition - 1);
            }
            return;

          case 'f': // Move forward one character
            if (cursorPosition < value.length) {
              setCursorPosition(cursorPosition + 1);
            }
            return;

          case 'd': // Delete character after cursor
            if (cursorPosition < value.length) {
              const newValue =
                value.slice(0, cursorPosition) +
                value.slice(cursorPosition + 1);
              onChange(newValue);
            }
            return;

          case 'h': // Backspace (same as Ctrl+H)
            if (cursorPosition > 0) {
              const newValue =
                value.slice(0, cursorPosition - 1) +
                value.slice(cursorPosition);
              onChange(newValue);
              setCursorPosition(cursorPosition - 1);
            }
            return;
        }
      }

      // Handle arrow keys
      if (key.leftArrow) {
        if (cursorPosition > 0) {
          setCursorPosition(cursorPosition - 1);
        }
        return;
      }

      if (key.rightArrow) {
        if (cursorPosition < value.length) {
          setCursorPosition(cursorPosition + 1);
        }
        return;
      }

      // Handle backspace
      if (key.backspace || input === '\u007f') {
        if (cursorPosition > 0) {
          const newValue =
            value.slice(0, cursorPosition - 1) +
            value.slice(cursorPosition);
          onChange(newValue);
          setCursorPosition(cursorPosition - 1);
        }
        return;
      }

      // Handle regular input - insert at cursor position
      if (input && input.length === 1 && !key.ctrl && !key.meta) {
        const newValue =
          value.slice(0, cursorPosition) +
          input +
          value.slice(cursorPosition);
        onChange(newValue);
        setCursorPosition(cursorPosition + 1);
      }
    },
    { isActive: focus }
  );

  // Display the input with cursor
  const displayValue = value || '';
  const beforeCursor = displayValue.slice(0, cursorPosition);
  const atCursor = cursorPosition < displayValue.length ? displayValue[cursorPosition] : '';
  const afterCursor = displayValue.slice(cursorPosition + 1);

  return (
    <Box>
      {displayValue.length === 0 && !focus ? (
        <Text dimColor>{placeholder || ''}</Text>
      ) : (
        <>
          <Text>{beforeCursor}</Text>
          {focus && (
            <Text inverse backgroundColor="white" color="black">
              {atCursor || ' '}
            </Text>
          )}
          {!focus && atCursor && <Text>{atCursor}</Text>}
          <Text>{afterCursor}</Text>
        </>
      )}
    </Box>
  );
}

