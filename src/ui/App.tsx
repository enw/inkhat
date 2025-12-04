/**
 * Main UI App Component
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { AppLauncher } from './components/AppLauncher.js';
import { KeyboardHandler } from './components/KeyboardHandler.js';
import type { Framework } from '../core/framework.js';
import type { App as ProductivityApp } from '../ports/app.js';
import type { KeyboardInput } from '../adapters/keyboard-input.js';

interface InkhatAppProps {
  framework: Framework;
  keyboardInput: KeyboardInput;
}

export const App: React.FC<InkhatAppProps> = ({ framework, keyboardInput }) => {
  const [currentApp, setCurrentApp] = useState<ProductivityApp | null>(null);
  const [availableApps, setAvailableApps] = useState<ProductivityApp[]>([]);

  useEffect(() => {
    const apps = framework.getRegistry().list();
    setAvailableApps(apps);
  }, [framework]);

  const handleAppSelect = async (app: ProductivityApp) => {
    await framework.launchApp(app.id);
    setCurrentApp(app);
  };

  return (
    <KeyboardHandler input={keyboardInput}>
      <Box flexDirection="column" width="100%" height="100%" flexGrow={1}>
        {currentApp ? (
          <Box flexDirection="column" width="100%" height="100%" flexGrow={1}>
            {currentApp.render()}
          </Box>
        ) : availableApps.length > 0 ? (
          <AppLauncher apps={availableApps} onSelect={handleAppSelect} />
        ) : (
          <Box padding={1}>
            <Text color="yellow">No apps available. Create an app in src/apps/</Text>
          </Box>
        )}
      </Box>
    </KeyboardHandler>
  );
};
