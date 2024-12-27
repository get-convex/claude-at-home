import { z } from 'zod';
import { Tool, toolRegistry } from './tools';
import { Memories } from '../model/Memories';
import { tavilyClient } from './tavily';
import {
  createSandboxArgs,
  execCommandArgs,
  modalClient,
  readFileArgs,
  terminateSandboxArgs,
  writeFileArgs,
} from './modal';

// Memory tools
const queryMemoryTool: Tool<{ query: string }, any> = {
  name: 'queryMemory',
  description:
    'Issue a semantic search query over all previous memories. The query string will be embedded, and the query will return the content of the 15 memories closest in embedding space.',
  parameters: z.object({
    query: z.string(),
  }),
  execute: async (context, args) => {
    return await Memories.query(context.ctx, context.creatorId, args.query);
  },
  prompt: `This chat app supports memories, where you can query memories using OpenAI's embedding
model and a nearest neighbor search. Use the "queryMemory" tool to search for memories
if you believe it will help the conversation. Be aware that the memories may not
be that relevant to the conversation.`,
};

// Tavily tools
const tavilySearchOptions = z.object({
  searchDepth: z.enum(['basic', 'advanced']).optional(),
  topic: z.enum(['general', 'news', 'finance']).optional(),
  days: z.number().optional(),
  maxResults: z.number().optional(),
  includeImages: z.boolean().optional(),
  includeImageDescriptions: z.boolean().optional(),
  includeAnswer: z.boolean().optional(),
  includeRawContent: z.boolean().optional(),
});

const tavilyToolsPrompt = `You have access to the Tavily API with a few tools:
- Use "tavilySearch" to search the web for a particular search term
- Use "tavilyQna" to ask the web a particular question
- Use "tavilyExtract" to extract content from a list of URLs
Only use these tools if you believe that they will help the conversation.`;

const tavilySearchTool: Tool = {
  name: 'tavilySearch',
  description: 'Search the web for a particular search term.',
  parameters: z.object({
    query: z.string(),
    options: tavilySearchOptions,
  }),
  execute: async (_context, args) => {
    const tvly = tavilyClient();
    return await tvly.search(args.query, args.options);
  },
  prompt: tavilyToolsPrompt,
};

const tavilyQnaTool: Tool = {
  name: 'tavilyQna',
  description: 'Ask the web a particular question.',
  parameters: z.object({
    query: z.string(),
    options: tavilySearchOptions,
  }),
  execute: async (_context, args) => {
    const tvly = tavilyClient();
    return await tvly.searchQNA(args.query, args.options);
  },
};

const tavilyExtractTool: Tool = {
  name: 'tavilyExtract',
  description: 'Extract content from a list of URLs.',
  parameters: z.object({
    urls: z.array(z.string()),
  }),
  execute: async (_context, args) => {
    const tvly = tavilyClient();
    return await tvly.extract(args.urls);
  },
};

// Modal sandbox tools
const modalToolsPrompt = `You have access to Modal sandboxes, where you can create a container, optionally with
a custom container image with apt packages or Python pip packages. You can then execute 
commands in the sandbox, read and write files, and terminate the sandbox. The sandboxes 
do not have network access and terminate after 10 minutes of inactivity. If you ever need 
to run code, I would recommend creating a container, writing the code to "/tmp/code.py", 
and then executing the code with the "execCommand" tool. Note that you can reuse containers
across multiple messages if it hasn't been terminated, and files will persist across
messages. This can be a lot more efficient than creating a new container for each message.`;

const createSandboxTool: Tool = {
  name: 'createSandbox',
  description: 'Create a new sandbox, returning a sandbox ID.',
  parameters: createSandboxArgs,
  execute: async (_context, args) => {
    const modal = modalClient();
    return await modal.createSandbox(args);
  },
  prompt: modalToolsPrompt,
};

const terminateSandboxTool: Tool = {
  name: 'terminateSandbox',
  description: 'Terminate a sandbox by its ID.',
  parameters: terminateSandboxArgs,
  execute: async (_context, args) => {
    const modal = modalClient();
    return await modal.terminateSandbox(args);
  },
};

const execCommandTool: Tool = {
  name: 'execCommand',
  description: 'Execute a command in a sandbox.',
  parameters: execCommandArgs,
  execute: async (_context, args) => {
    const modal = modalClient();
    return await modal.execCommand(args);
  },
};

const readFileTool: Tool = {
  name: 'readFile',
  description: 'Read a file from a sandbox.',
  parameters: readFileArgs,
  execute: async (_context, args) => {
    const modal = modalClient();
    return await modal.readFile(args);
  },
};

const writeFileTool: Tool = {
  name: 'writeFile',
  description: 'Write to a file in a sandbox.',
  parameters: writeFileArgs,
  execute: async (_context, args) => {
    const modal = modalClient();
    return await modal.writeFile(args);
  },
};

// Register all tools
toolRegistry
  .register(queryMemoryTool)
  .register(tavilySearchTool)
  .register(tavilyQnaTool)
  .register(tavilyExtractTool)
  .register(createSandboxTool)
  .register(terminateSandboxTool)
  .register(execCommandTool)
  .register(readFileTool)
  .register(writeFileTool);

export { toolRegistry };
