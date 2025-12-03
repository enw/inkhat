/**
 * Built-in Workflow Component Templates
 *
 * Reusable component definitions for building agent workflows.
 */

import type { ComponentTemplate } from '@ports/workflow.js';

/**
 * Trigger Components
 */
export const triggerTemplates: ComponentTemplate[] = [
  {
    type: 'trigger',
    name: 'User Input',
    description: 'Trigger workflow from user input (chat or command)',
    defaultConfig: {
      inputType: 'text',
      prompt: 'Enter your request:',
    },
    inputs: [],
    outputs: [
      {
        name: 'userInput',
        type: 'string',
        required: true,
        description: 'The user\'s input text',
      },
    ],
    codeTemplate: {
      imports: [],
      implementation: `
// User input trigger
const userInput = await context.input.waitForInput("{{prompt}}");
`,
    },
    uiMetadata: {
      icon: '▶',
      color: 'green',
      category: 'Triggers',
    },
  },
  {
    type: 'trigger',
    name: 'Schedule',
    description: 'Trigger workflow on a schedule (cron)',
    defaultConfig: {
      schedule: '0 9 * * *', // Daily at 9 AM
      timezone: 'UTC',
    },
    inputs: [],
    outputs: [
      {
        name: 'timestamp',
        type: 'date',
        required: true,
        description: 'The trigger timestamp',
      },
    ],
    uiMetadata: {
      icon: '⏰',
      color: 'yellow',
      category: 'Triggers',
    },
  },
];

/**
 * LLM Components
 */
export const llmTemplates: ComponentTemplate[] = [
  {
    type: 'action',
    name: 'LLM Completion',
    description: 'Single LLM completion with prompt',
    defaultConfig: {
      provider: 'ollama',
      model: 'llama3.2',
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: '',
      userPrompt: '',
    },
    inputs: [
      {
        name: 'input',
        type: 'string',
        required: true,
        description: 'Input to the LLM',
      },
      {
        name: 'context',
        type: 'object',
        required: false,
        description: 'Additional context variables',
      },
    ],
    outputs: [
      {
        name: 'response',
        type: 'string',
        required: true,
        description: 'LLM response text',
      },
      {
        name: 'tokens',
        type: 'number',
        required: true,
        description: 'Tokens used',
      },
    ],
    codeTemplate: {
      imports: ['LLMPort', 'CompletionRequest'],
      implementation: `
// LLM Completion
const response = await llmPort.complete({
  messages: [
    { role: 'system', content: '{{systemPrompt}}' },
    { role: 'user', content: input }
  ],
  model: '{{model}}',
  temperature: {{temperature}},
  maxTokens: {{maxTokens}}
});
const output = response.content;
const tokens = response.usage.totalTokens;
`,
    },
    uiMetadata: {
      icon: '🤖',
      color: 'blue',
      category: 'LLM',
    },
  },
  {
    type: 'action',
    name: 'LLM with Tools',
    description: 'LLM completion with function calling',
    defaultConfig: {
      provider: 'anthropic',
      model: 'claude-sonnet-4.5',
      temperature: 0.7,
      maxTokens: 2000,
      systemPrompt: '',
      tools: [],
    },
    inputs: [
      {
        name: 'input',
        type: 'string',
        required: true,
        description: 'Input to the LLM',
      },
      {
        name: 'tools',
        type: 'array',
        required: false,
        description: 'Available tools',
      },
    ],
    outputs: [
      {
        name: 'response',
        type: 'string',
        required: true,
        description: 'LLM response',
      },
      {
        name: 'toolCalls',
        type: 'array',
        required: false,
        description: 'Tool calls made',
      },
    ],
    uiMetadata: {
      icon: '🛠',
      color: 'purple',
      category: 'LLM',
    },
  },
];

/**
 * Tool Components
 */
export const toolTemplates: ComponentTemplate[] = [
  {
    type: 'action',
    name: 'Read File',
    description: 'Read contents of a file',
    defaultConfig: {
      encoding: 'utf-8',
    },
    inputs: [
      {
        name: 'filePath',
        type: 'string',
        required: true,
        description: 'Path to file to read',
      },
    ],
    outputs: [
      {
        name: 'content',
        type: 'string',
        required: true,
        description: 'File contents',
      },
    ],
    codeTemplate: {
      imports: ['fs/promises'],
      implementation: `
// Read File
const content = await fs.readFile(filePath, '{{encoding}}');
`,
    },
    uiMetadata: {
      icon: '📄',
      color: 'cyan',
      category: 'File Operations',
    },
  },
  {
    type: 'action',
    name: 'Write File',
    description: 'Write content to a file',
    defaultConfig: {
      encoding: 'utf-8',
      createDirs: true,
    },
    inputs: [
      {
        name: 'filePath',
        type: 'string',
        required: true,
        description: 'Path to file to write',
      },
      {
        name: 'content',
        type: 'string',
        required: true,
        description: 'Content to write',
      },
    ],
    outputs: [
      {
        name: 'success',
        type: 'boolean',
        required: true,
        description: 'Whether write succeeded',
      },
    ],
    codeTemplate: {
      imports: ['fs/promises'],
      implementation: `
// Write File
await fs.writeFile(filePath, content, '{{encoding}}');
const success = true;
`,
    },
    uiMetadata: {
      icon: '✏️',
      color: 'cyan',
      category: 'File Operations',
    },
  },
  {
    type: 'action',
    name: 'HTTP Request',
    description: 'Make an HTTP request',
    defaultConfig: {
      method: 'GET',
      headers: {},
      timeout: 30000,
    },
    inputs: [
      {
        name: 'url',
        type: 'string',
        required: true,
        description: 'Request URL',
      },
      {
        name: 'body',
        type: 'object',
        required: false,
        description: 'Request body (for POST/PUT)',
      },
    ],
    outputs: [
      {
        name: 'response',
        type: 'object',
        required: true,
        description: 'HTTP response',
      },
      {
        name: 'statusCode',
        type: 'number',
        required: true,
        description: 'HTTP status code',
      },
    ],
    uiMetadata: {
      icon: '🌐',
      color: 'blue',
      category: 'Network',
    },
  },
  {
    type: 'action',
    name: 'Storage Read',
    description: 'Read data from storage',
    defaultConfig: {},
    inputs: [
      {
        name: 'key',
        type: 'string',
        required: true,
        description: 'Storage key to read',
      },
    ],
    outputs: [
      {
        name: 'data',
        type: 'any',
        required: false,
        description: 'Stored data (null if not found)',
      },
    ],
    codeTemplate: {
      imports: [],
      implementation: `
// Storage Read
const data = await context.storage.read(key);
`,
    },
    uiMetadata: {
      icon: '💾',
      color: 'green',
      category: 'Storage',
    },
  },
  {
    type: 'action',
    name: 'Storage Write',
    description: 'Write data to storage',
    defaultConfig: {},
    inputs: [
      {
        name: 'key',
        type: 'string',
        required: true,
        description: 'Storage key',
      },
      {
        name: 'data',
        type: 'any',
        required: true,
        description: 'Data to store',
      },
    ],
    outputs: [
      {
        name: 'success',
        type: 'boolean',
        required: true,
        description: 'Whether write succeeded',
      },
    ],
    codeTemplate: {
      imports: [],
      implementation: `
// Storage Write
await context.storage.write(key, data);
const success = true;
`,
    },
    uiMetadata: {
      icon: '💾',
      color: 'green',
      category: 'Storage',
    },
  },
];

/**
 * Logic Components
 */
export const logicTemplates: ComponentTemplate[] = [
  {
    type: 'logic',
    name: 'If Condition',
    description: 'Branch based on a condition',
    defaultConfig: {
      condition: 'value > 0',
    },
    inputs: [
      {
        name: 'value',
        type: 'any',
        required: true,
        description: 'Value to evaluate',
      },
    ],
    outputs: [
      {
        name: 'true',
        type: 'any',
        required: false,
        description: 'Output if condition is true',
      },
      {
        name: 'false',
        type: 'any',
        required: false,
        description: 'Output if condition is false',
      },
    ],
    codeTemplate: {
      imports: [],
      implementation: `
// If Condition
if ({{condition}}) {
  // True branch
} else {
  // False branch
}
`,
    },
    uiMetadata: {
      icon: '🔀',
      color: 'orange',
      category: 'Logic',
    },
  },
  {
    type: 'logic',
    name: 'Loop',
    description: 'Repeat actions for each item',
    defaultConfig: {
      maxIterations: 100,
    },
    inputs: [
      {
        name: 'items',
        type: 'array',
        required: true,
        description: 'Items to iterate over',
      },
    ],
    outputs: [
      {
        name: 'item',
        type: 'any',
        required: true,
        description: 'Current item in iteration',
      },
      {
        name: 'index',
        type: 'number',
        required: true,
        description: 'Current iteration index',
      },
    ],
    uiMetadata: {
      icon: '🔁',
      color: 'orange',
      category: 'Logic',
    },
  },
  {
    type: 'logic',
    name: 'Transform',
    description: 'Transform data using JavaScript',
    defaultConfig: {
      expression: 'data.toUpperCase()',
    },
    inputs: [
      {
        name: 'data',
        type: 'any',
        required: true,
        description: 'Input data to transform',
      },
    ],
    outputs: [
      {
        name: 'result',
        type: 'any',
        required: true,
        description: 'Transformed data',
      },
    ],
    codeTemplate: {
      imports: [],
      implementation: `
// Transform
const result = {{expression}};
`,
    },
    uiMetadata: {
      icon: '⚙️',
      color: 'gray',
      category: 'Logic',
    },
  },
];

/**
 * Output Components
 */
export const outputTemplates: ComponentTemplate[] = [
  {
    type: 'output',
    name: 'Display',
    description: 'Display output to user',
    defaultConfig: {
      format: 'text',
    },
    inputs: [
      {
        name: 'content',
        type: 'any',
        required: true,
        description: 'Content to display',
      },
    ],
    outputs: [],
    codeTemplate: {
      imports: [],
      implementation: `
// Display
console.log(content);
`,
    },
    uiMetadata: {
      icon: '📺',
      color: 'white',
      category: 'Output',
    },
  },
  {
    type: 'output',
    name: 'Return',
    description: 'Return result and end workflow',
    defaultConfig: {},
    inputs: [
      {
        name: 'result',
        type: 'any',
        required: true,
        description: 'Result to return',
      },
    ],
    outputs: [],
    codeTemplate: {
      imports: [],
      implementation: `
// Return
return result;
`,
    },
    uiMetadata: {
      icon: '✅',
      color: 'green',
      category: 'Output',
    },
  },
];

/**
 * All built-in component templates
 */
export const builtInComponentTemplates: ComponentTemplate[] = [
  ...triggerTemplates,
  ...llmTemplates,
  ...toolTemplates,
  ...logicTemplates,
  ...outputTemplates,
];

/**
 * Get template by type and name
 */
export function getTemplate(type: string, name: string): ComponentTemplate | undefined {
  return builtInComponentTemplates.find((t) => t.type === type && t.name === name);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): ComponentTemplate[] {
  return builtInComponentTemplates.filter((t) => t.uiMetadata?.category === category);
}

/**
 * Get all categories
 */
export function getCategories(): string[] {
  const categories = new Set<string>();
  for (const template of builtInComponentTemplates) {
    if (template.uiMetadata?.category) {
      categories.add(template.uiMetadata.category);
    }
  }
  return Array.from(categories).sort();
}
