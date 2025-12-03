/**
 * App Launcher Component
 * Displays list of available apps and allows user to select one
 */

import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import type { App } from '../../ports/app.js';

interface AppLauncherProps {
  apps: App[];
  onSelect: (app: App) => void;
}

export const AppLauncher: React.FC<AppLauncherProps> = ({ apps, onSelect }) => {
  const items = apps.map(app => ({
    label: `${app.name} - ${app.description}`,
    value: app
  }));

  const handleSelect = (item: { label: string; value: App }) => {
    onSelect(item.value);
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🎯 Inkhat - Select an App
        </Text>
      </Box>
      <SelectInput items={items} onSelect={handleSelect} />
    </Box>
  );
};
