/**
 * Split Memory Panes Component
 * 
 * Splits the memory pane into three separate scrollable panes:
 * - Recent Messages
 * - Thread Summary
 * - Entity Memory
 * 
 * Each pane can be focused and scrolled independently with Tab navigation.
 */

import React, { memo } from 'react';
import { Box, Text } from 'ink';
import { ScrollablePane } from './ScrollablePane.js';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ConversationSummary {
  summary: string;
  lastUpdated: Date;
  messageCount: number;
  threadId: string;
}

interface EntityNode {
  id: string;
  type: 'person' | 'place' | 'concept' | 'event' | 'task' | 'other';
  name: string;
  description: string;
  properties: Record<string, unknown>;
  relationships: Array<{
    targetId: string;
    relationship: string;
    strength: number;
  }>;
}

interface EntityMemory {
  nodes: EntityNode[];
  lastUpdated: Date;
}

interface SplitMemoryPanesProps {
  summary: ConversationSummary | null;
  entityMemory: EntityMemory;
  recentMessages: ChatMessage[];
  messages: ChatMessage[];
  focusedPane: 'recent' | 'summary' | 'entities';
}

export const SplitMemoryPanes = memo(function SplitMemoryPanes({
  summary,
  entityMemory,
  recentMessages,
  messages,
  focusedPane,
}: SplitMemoryPanesProps) {
  return (
    <Box flexDirection="column" width="40%" marginLeft={1} height="100%">
      <Box borderStyle="round" borderColor="magenta" padding={1} marginBottom={1} flexShrink={0}>
        <Text bold color="magenta">
          Memory 🧠
        </Text>
        <Text dimColor>Tab to navigate • Arrow keys to scroll when focused</Text>
      </Box>

      <Box flexDirection="column" flexGrow={1} minHeight={0}>
        {/* Recent Messages Pane */}
        <Box flexGrow={1} minHeight={0} marginBottom={1}>
          <ScrollablePane
            title={`Recent Messages (${Math.min(5, recentMessages.length)})`}
            isFocused={focusedPane === 'recent'}
            maxVisibleItems={5}
            borderColor="cyan"
            titleColor="cyan"
          >
            {recentMessages.slice(-10).map((msg, i) => (
              <Box key={i} flexDirection="column" marginBottom={1}>
                <Text dimColor>
                  {msg.role === 'user' ? '👤' : '🤖'} {msg.content.slice(0, 60)}
                  {msg.content.length > 60 ? '...' : ''}
                </Text>
              </Box>
            ))}
          </ScrollablePane>
        </Box>

        {/* Thread Summary Pane */}
        <Box flexGrow={1} minHeight={0} marginBottom={1}>
          <ScrollablePane
            title="Thread Summary"
            isFocused={focusedPane === 'summary'}
            maxVisibleItems={8}
            borderColor="yellow"
            titleColor="yellow"
          >
            {summary ? (
              <>
                <Box flexDirection="column" marginBottom={1}>
                  <Text dimColor>{summary.summary}</Text>
                </Box>
                <Box>
                  <Text dimColor>
                    (Updated: {messages.length - summary.messageCount} messages ago)
                  </Text>
                </Box>
              </>
            ) : (
              <Box>
                <Text dimColor>No summary yet. Chat more to generate one.</Text>
              </Box>
            )}
          </ScrollablePane>
        </Box>

        {/* Entity Memory Pane */}
        <Box flexGrow={1} minHeight={0}>
          <ScrollablePane
            title={`Entity Memory (${entityMemory.nodes.length} entities, shared)`}
            isFocused={focusedPane === 'entities'}
            maxVisibleItems={8}
            borderColor="green"
            titleColor="green"
          >
            {entityMemory.nodes.length > 0 ? (
              entityMemory.nodes.map((node) => (
                <Box key={node.id} flexDirection="column" marginBottom={1}>
                  <Text bold>
                    {node.type === 'person' ? '👤' : 
                     node.type === 'place' ? '📍' : 
                     node.type === 'event' ? '📅' : 
                     node.type === 'task' ? '✓' : 
                     node.type === 'concept' ? '💡' : '🔷'} {node.name}
                  </Text>
                  <Text dimColor>
                    {node.description.slice(0, 80)}
                    {node.description.length > 80 ? '...' : ''}
                  </Text>
                  {node.relationships.length > 0 && (
                    <Text dimColor>
                      → {node.relationships.length} relationship{node.relationships.length > 1 ? 's' : ''}
                    </Text>
                  )}
                </Box>
              ))
            ) : (
              <Box>
                <Text dimColor>No entities yet. Chat more to extract entities.</Text>
              </Box>
            )}
          </ScrollablePane>
        </Box>
      </Box>
    </Box>
  );
});

