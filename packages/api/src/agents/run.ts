import { Run, Providers } from '@librechat/agents';
import { providerEndpointMap, KnownEndpoints } from 'librechat-data-provider';
import type {
  OpenAIClientOptions,
  StandardGraphConfig,
  EventHandler,
  GenericTool,
  GraphEvents,
  IState,
} from '@librechat/agents';
import type { Agent } from 'librechat-data-provider';
import type * as t from '~/types';

// Store original fetch for restoration
const originalFetch = global.fetch;

// Create a logging fetch wrapper
function createLoggingFetch(runId?: string) {
  return async function loggingFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method || 'GET';
    
    console.log(`=== HTTP REQUEST [${runId || 'unknown'}] ===`);
    console.log('URL:', url);
    console.log('Method:', method);
    console.log('Headers:', JSON.stringify(init?.headers || {}, null, 2));
    
    if (init?.body) {
      console.log('Request Body:');
      try {
        if (typeof init.body === 'string') {
          // Try to parse and pretty-print JSON
          try {
            const jsonBody = JSON.parse(init.body);
            console.log(JSON.stringify(jsonBody, null, 2));
          } catch {
            // If not JSON, log as string
            console.log(init.body);
          }
        } else {
          console.log('Body type:', typeof init.body);
          console.log('Body:', init.body);
        }
      } catch (error) {
        console.log('Error logging body:', error);
      }
    }
    
    console.log('=== END HTTP REQUEST ===');
    
    // Make the actual request
    const response = await originalFetch(input, init);
    
    // Log response details
    console.log(`=== HTTP RESPONSE [${runId || 'unknown'}] ===`);
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Response Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
    console.log('=== END HTTP RESPONSE ===');
    
    return response;
  };
}

const customProviders = new Set([
  Providers.XAI,
  Providers.OLLAMA,
  Providers.DEEPSEEK,
  Providers.OPENROUTER,
]);

/**
 * Creates a new Run instance with custom handlers and configuration.
 *
 * @param options - The options for creating the Run instance.
 * @param options.agent - The agent for this run.
 * @param options.signal - The signal for this run.
 * @param options.req - The server request.
 * @param options.runId - Optional run ID; otherwise, a new run ID will be generated.
 * @param options.customHandlers - Custom event handlers.
 * @param options.streaming - Whether to use streaming.
 * @param options.streamUsage - Whether to stream usage information.
 * @returns {Promise<Run<IState>>} A promise that resolves to a new Run instance.
 */
export async function createRun({
  runId,
  agent,
  signal,
  customHandlers,
  streaming = true,
  streamUsage = true,
}: {
  agent: Omit<Agent, 'tools'> & { tools?: GenericTool[] };
  signal: AbortSignal;
  runId?: string;
  streaming?: boolean;
  streamUsage?: boolean;
  customHandlers?: Record<GraphEvents, EventHandler>;
}): Promise<Run<IState>> {
  // LOG: Agent configuration being passed to createRun
  console.log('=== createRun: Agent Configuration ===');
  console.log('Agent provider:', agent.provider);
  console.log('Agent endpoint:', agent.endpoint);
  console.log('Agent model:', agent.model);
  console.log('Agent model_parameters:', JSON.stringify(agent.model_parameters, null, 2));
  console.log('Agent tools count:', agent.tools?.length || 0);
  console.log('RunId:', runId);
  console.log('Streaming:', streaming);
  console.log('StreamUsage:', streamUsage);

  const provider =
    (providerEndpointMap[
      agent.provider as keyof typeof providerEndpointMap
    ] as unknown as Providers) ?? agent.provider;

  // LOG: Provider resolution
  console.log('=== createRun: Provider Resolution ===');
  console.log('Original provider:', agent.provider);
  console.log('Resolved provider:', provider);
  console.log('Is custom provider:', customProviders.has(agent.provider));

  const llmConfig: t.RunLLMConfig = Object.assign(
    {
      provider,
      streaming,
      streamUsage,
    },
    agent.model_parameters,
  );

  // LOG: Initial LLM config
  console.log('=== createRun: Initial LLM Config ===');
  console.log('LLM Config:', JSON.stringify(llmConfig, null, 2));

  /** Resolves issues with new OpenAI usage field */
  if (
    customProviders.has(agent.provider) ||
    (agent.provider === Providers.OPENAI && agent.endpoint !== agent.provider)
  ) {
    llmConfig.streamUsage = false;
    llmConfig.usage = true;
    console.log('=== createRun: Custom Provider Adjustments ===');
    console.log('Set streamUsage to false and usage to true for custom provider');
  }

  let reasoningKey: 'reasoning_content' | 'reasoning' = 'reasoning_content';
  if (provider === Providers.GOOGLE) {
    reasoningKey = 'reasoning';
  } else if (
    llmConfig.configuration?.baseURL?.includes(KnownEndpoints.openrouter) ||
    (agent.endpoint && agent.endpoint.toLowerCase().includes(KnownEndpoints.openrouter))
  ) {
    reasoningKey = 'reasoning';
  } else if (
    (llmConfig as OpenAIClientOptions).useResponsesApi === true &&
    (provider === Providers.OPENAI || provider === Providers.AZURE)
  ) {
    reasoningKey = 'reasoning';
  }

  // LOG: Reasoning key resolution
  console.log('=== createRun: Reasoning Key ===');
  console.log('Reasoning key:', reasoningKey);

  const graphConfig: StandardGraphConfig = {
    signal,
    llmConfig,
    reasoningKey,
    tools: agent.tools,
    instructions: agent.instructions,
    additional_instructions: agent.additional_instructions,
    // toolEnd: agent.end_after_tools,
  };

  // TEMPORARY FOR TESTING
  if (agent.provider === Providers.ANTHROPIC || agent.provider === Providers.BEDROCK) {
    graphConfig.streamBuffer = 2000;
    console.log('=== createRun: Anthropic/Bedrock Adjustment ===');
    console.log('Set streamBuffer to 2000');
  }

  // LOG: Final configuration being passed to Run.create()
  console.log('=== createRun: Final Configuration for @librechat/agents ===');
  console.log('Graph Config:');
  console.log('- llmConfig:', JSON.stringify(graphConfig.llmConfig, null, 2));
  console.log('- reasoningKey:', graphConfig.reasoningKey);
  console.log('- tools count:', graphConfig.tools?.length || 0);
  console.log('- instructions length:', graphConfig.instructions?.length || 0);
  console.log('- additional_instructions length:', graphConfig.additional_instructions?.length || 0);
  console.log('- streamBuffer:', graphConfig.streamBuffer || 'not set');
  console.log('- signal present:', !!graphConfig.signal);

  // LOG: HTTP-related configuration details
  console.log('=== createRun: HTTP Configuration Details ===');
  if (llmConfig.configuration?.baseURL) {
    console.log('Base URL:', llmConfig.configuration.baseURL);
  }
  if (llmConfig.configuration?.defaultHeaders) {
    console.log('Default Headers:', JSON.stringify(llmConfig.configuration.defaultHeaders, null, 2));
  }
  if (llmConfig.configuration?.timeout) {
    console.log('Timeout:', llmConfig.configuration.timeout);
  }
  if ('apiKey' in llmConfig && llmConfig.apiKey) {
    console.log('API Key present:', !!llmConfig.apiKey);
    console.log('API Key length:', typeof llmConfig.apiKey === 'string' ? llmConfig.apiKey.length : 0);
  }

  console.log('=== createRun: Creating Run instance ===');

  // Monkey-patch fetch to log HTTP requests for the entire request lifecycle
  const loggingFetch = createLoggingFetch(runId);
  (global as any).fetch = loggingFetch;

  const run = await Run.create({
    runId,
    graphConfig,
    customHandlers,
  });

  // Extend the run with a cleanup method to restore original fetch
  const originalProcessStream = run.processStream.bind(run);
  run.processStream = async (inputs: any, config: any, options?: any) => {
    try {
      console.log('=== HTTP Logging: Starting processStream ===');
      // Ensure our logging fetch is still active
      (global as any).fetch = loggingFetch;
      
      const result = await originalProcessStream(inputs, config, options);
      
      console.log('=== HTTP Logging: Completed processStream ===');
      return result;
    } finally {
      // Restore original fetch after processStream completes
      console.log('=== HTTP Logging: Restoring original fetch ===');
      (global as any).fetch = originalFetch;
    }
  };

  return run;
}
