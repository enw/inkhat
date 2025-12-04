/**
 * Scrollable Pane Component
 * 
 * A scrollable container that can be focused and scrolled with arrow keys.
 * Used for creating scrollable sections in the memory pane.
 */

import React, { useState, useRef, useEffect, memo } from 'react';
import { Box, Text, useInput } from 'ink';

interface ScrollablePaneProps {
  title: string;
  children: React.ReactNode;
  isFocused: boolean;
  maxVisibleItems?: number;
  borderColor?: string;
  titleColor?: string;
}

export const ScrollablePane = memo(function ScrollablePane({
  title,
  children,
  isFocused,
  maxVisibleItems = 5,
  borderColor = 'magenta',
  titleColor = 'magenta',
}: ScrollablePaneProps) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const autoScrollRef = useRef(true);
  
  // Convert children to array if needed
  const items = React.Children.toArray(children);
  const itemCount = items.length;

  // Reset scroll when focus changes
  useEffect(() => {
    if (isFocused && itemCount > 0) {
      autoScrollRef.current = true;
      setScrollOffset(Math.max(0, itemCount - maxVisibleItems));
    }
  }, [isFocused, itemCount, maxVisibleItems]);

  useInput(
    (_input, key) => {
      if (!isFocused) return;

      if (key.upArrow) {
        autoScrollRef.current = false;
        setScrollOffset(prev => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        const maxOffset = Math.max(0, itemCount - maxVisibleItems);
        setScrollOffset(prev => {
          const newOffset = Math.min(maxOffset, prev + 1);
          if (newOffset >= maxOffset) {
            autoScrollRef.current = true;
          }
          return newOffset;
        });
      } else if (key.pageUp) {
        autoScrollRef.current = false;
        setScrollOffset(prev => Math.max(0, prev - maxVisibleItems));
      } else if (key.pageDown) {
        const maxOffset = Math.max(0, itemCount - maxVisibleItems);
        setScrollOffset(prev => {
          const newOffset = Math.min(maxOffset, prev + maxVisibleItems);
          if (newOffset >= maxOffset) {
            autoScrollRef.current = true;
          }
          return newOffset;
        });
      }
    },
    { isActive: isFocused }
  );

  const visibleStart = Math.max(0, scrollOffset);
  const visibleEnd = Math.min(itemCount, visibleStart + maxVisibleItems);
  const visibleItems = items.slice(visibleStart, visibleEnd);
  const maxOffset = Math.max(0, itemCount - maxVisibleItems);
  const canScrollUp = scrollOffset > 0;
  const canScrollDown = scrollOffset < maxOffset;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={isFocused ? 'green' : borderColor}
      padding={1}
      flexGrow={1}
      minHeight={0}
    >
      <Box flexDirection="row" marginBottom={1}>
        <Text bold color={isFocused ? 'green' : titleColor}>
          {isFocused ? '▶ ' : '  '}
          {title}
        </Text>
        {isFocused && (
          <Text dimColor> (↑↓ to scroll)</Text>
        )}
      </Box>

      {canScrollUp && (
        <Box justifyContent="center" marginBottom={1}>
          <Text dimColor>↑ {itemCount - visibleStart} items above</Text>
        </Box>
      )}

      <Box flexDirection="column" flexGrow={1} minHeight={0}>
        {visibleItems.length > 0 ? (
          visibleItems.map((item, i) => (
            <Box key={visibleStart + i}>{item}</Box>
          ))
        ) : (
          <Box>
            <Text dimColor>No items</Text>
          </Box>
        )}
      </Box>

      {canScrollDown && (
        <Box justifyContent="center" marginTop={1}>
          <Text dimColor>↓ {itemCount - visibleEnd} items below</Text>
        </Box>
      )}
    </Box>
  );
});

