import { v } from 'convex/values';
import { ActionCtx, internalAction, internalMutation, internalQuery } from './_generated/server';
import OpenAI from 'openai';
import { internal } from './_generated/api';
import { zodFunction, zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { Conversations } from './model/Conversations';
import { Doc } from './_generated/dataModel';
import { Messages } from './model/Messages';
import {
  ChatCompletionChunk,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/index.mjs';
import { openaiClient } from './lib/openai';
import { Memories } from './model/Memories';
import { tavilyClient } from './lib/tavily';
import { ToolUse } from './model/ToolUse';

const SYSTEM_PROMPT = `
You are a delightfully helpful assistant in a one-on-one English chat. Be warm but succinct. 
You are definitely not lame, though, so please don't use happy or excited emojis
at the end of your messages.

This chat app supports memories, where you can query memories using OpenAI's embedding
model and a nearest neighbor search. Use the "query_memory" tool to search for memories
if you believe it will help the conversation. Be aware that the memories may not
be that relevant to the conversation.

You also have access to the Tavily API with a few tools. First, use the "tavilySearch"
tool to search the web for a particular search term. Second, use the "tavilyQna" tool
to ask the web a particular question. Finally, use the "tavilyExtract" tool to
extract content from a list of URLs. Again, only use these tools if you believe
that they will help the conversation.

Your response must be in Markdown. The Markdown environment also supports LaTeX using
KaTeX. Note that you MUST use $ for inline LaTeX and $$ for block LaTeX. KaTeX does 
not support using \( \) or \[ \] for inline or block LaTeX. This is very important 
since it will break rendering.
`;

const queryMemoryParameters = z.object({
  query: z.string(),
});

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

const tavilySearchParameters = z.object({
  query: z.string(),
  options: tavilySearchOptions,
});

const tavilyQnaParameters = z.object({
  query: z.string(),
  options: tavilySearchOptions,
});

const tavilyExtractParameters = z.object({
  urls: z.array(z.string()),
});

const openai = openaiClient();

const tools: Array<ChatCompletionTool> = [
  zodFunction({
    name: 'queryMemory',
    parameters: queryMemoryParameters,
    description:
      'Issue a semantic search query over all previous memories. The query string will be embedded, and the query will return the content of the 15 memories closest in embedding space.',
  }),
  zodFunction({
    name: 'tavilySearch',
    parameters: tavilySearchParameters,
    description: 'Search the web for a particular search term.',
  }),
  zodFunction({
    name: 'tavilyQna',
    parameters: tavilyQnaParameters,
    description: 'Ask the web a particular question.',
  }),
  zodFunction({
    name: 'tavilyExtract',
    parameters: tavilyExtractParameters,
    description: 'Extract content from a list of URLs.',
  }),
];

async function streamChat(context: Array<ChatCompletionMessageParam>) {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    stream: true,
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      ...context,
    ],
    tools,
  });
  const iter = stream[Symbol.asyncIterator]();

  let firstChunk = await iter.next();
  if (firstChunk.done) {
    throw new Error('Empty response from OpenAI');
  }
  let chunk = firstChunk.value;
  if (chunk.choices[0].delta.tool_calls) {
    const firstDelta = chunk.choices[0].delta;
    if (!firstDelta.tool_calls) {
      throw new Error('Missing tool call after starting tool call?');
    }
    if (firstDelta.tool_calls.length > 1) {
      throw new Error('Multiple tool calls in a single message are not supported');
    }
    const toolCall = firstDelta.tool_calls[0];
    if (!toolCall.function?.name) {
      throw new Error('No function name in tool call');
    }
    if (!toolCall.id) {
      throw new Error('No tool call ID in tool call');
    }
    const callId = toolCall.id;

    async function* streamToolCall(chunk: ChatCompletionChunk) {
      let functionArgs = '';
      while (true) {
        const delta = chunk.choices[0].delta;
        if (delta.content) {
          throw new Error('Content in tool call');
        }
        const finishReason = chunk.choices[0].finish_reason;
        if (finishReason !== null) {
          if (finishReason !== 'tool_calls') {
            throw new Error(`Unexpected finish reason: ${finishReason}`);
          }
          break;
        }
        if (!delta.tool_calls) {
          throw new Error('Missing tool call after starting tool call?');
        }
        if (delta.tool_calls.length > 1) {
          throw new Error('Multiple tool calls in a single message are not supported');
        }
        const toolCall = delta.tool_calls[0];
        if (toolCall.function?.arguments) {
          functionArgs += toolCall.function.arguments;
          yield functionArgs;
        }
        const nextChunk = await iter.next();
        if (nextChunk.done) {
          throw new Error('Tool call did not finish');
        }
        chunk = nextChunk.value;
      }
      yield functionArgs;
    }

    return {
      type: 'toolCall' as const,
      functionName: toolCall.function.name,
      functionArgs: streamToolCall(chunk),
      callId,
    };
  } else {
    async function* streamChat(chunk: ChatCompletionChunk) {
      let body = '';
      while (true) {
        if (chunk.choices[0].delta.content) {
          body += chunk.choices[0].delta.content;
          yield body;
        }
        const nextChunk = await iter.next();
        if (nextChunk.done) {
          break;
        }
        chunk = nextChunk.value;
      }
      yield body;
    }
    return { type: 'message' as const, stream: streamChat(chunk) };
  }
}

export const chat = internalAction({
  args: {
    conversationId: v.id('conversations'),
    messageId: v.id('messages'),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.runQuery(internal.ai.getConversation, {
      conversationId: args.conversationId,
    });
    const previousMessages = await ctx.runQuery(internal.ai.allMessages, {
      conversationId: args.conversationId,
    });
    const context: Array<ChatCompletionMessageParam> = [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      ...previousMessages,
    ];
    try {
      while (true) {
        const result = await streamChat(context);
        if (result.type === 'toolCall') {
          if (!result.functionName) {
            throw new Error('No function name in tool call');
          }
          const toolUseId = await ctx.runMutation(internal.ai.startToolUse, {
            messageId: args.messageId,
            toolName: result.functionName,
          });
          let toolArgs = '';
          for await (const snapshot of result.functionArgs) {
            toolArgs = snapshot;
            await ctx.runMutation(internal.ai.setToolUseArguments, {
              id: toolUseId,
              args: toolArgs,
            });
          }
          await ctx.runMutation(internal.ai.setToolUseInProgress, {
            id: toolUseId,
          });
          context.push({
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                type: 'function',
                id: result.callId,
                function: {
                  name: result.functionName,
                  arguments: toolArgs,
                },
              },
            ],
          });
          if (result.functionName === 'queryMemory') {
            const { query } = queryMemoryParameters.parse(JSON.parse(toolArgs));
            const memories = await Memories.query(ctx, conversation.creatorId, query);
            console.log('Result:', memories);
            context.push({
              role: 'tool',
              content: JSON.stringify(memories),
              tool_call_id: result.callId,
            });
            await ctx.runMutation(internal.ai.setToolUseSuccess, {
              id: toolUseId,
              result: JSON.stringify(memories),
            });
            continue;
          } else if (result.functionName === 'tavilySearch') {
            const tvly = tavilyClient();
            const { query, options } = tavilySearchParameters.parse(JSON.parse(toolArgs));
            const searchResult = await tvly.search(query, options);
            context.push({
              role: 'tool',
              content: JSON.stringify(searchResult),
              tool_call_id: result.callId,
            });
            await ctx.runMutation(internal.ai.setToolUseSuccess, {
              id: toolUseId,
              result: JSON.stringify(searchResult),
            });
            continue;
          } else if (result.functionName === 'tavilyQna') {
            const tvly = tavilyClient();
            const { query, options } = tavilyQnaParameters.parse(JSON.parse(toolArgs));
            const qnaResult = await tvly.searchQNA(query, options);
            console.log('Result:', qnaResult);
            context.push({
              role: 'tool',
              content: JSON.stringify(qnaResult),
              tool_call_id: result.callId,
            });
            await ctx.runMutation(internal.ai.setToolUseSuccess, {
              id: toolUseId,
              result: JSON.stringify(qnaResult),
            });
            continue;
          } else if (result.functionName === 'tavilyExtract') {
            const tvly = tavilyClient();
            const { urls } = tavilyExtractParameters.parse(JSON.parse(toolArgs));
            const extractResult = await tvly.extract(urls);
            console.log('Result:', extractResult);
            context.push({
              role: 'tool',
              content: JSON.stringify(extractResult),
              tool_call_id: result.callId,
            });
            await ctx.runMutation(internal.ai.setToolUseSuccess, {
              id: toolUseId,
              result: JSON.stringify(extractResult),
            });
            continue;
          } else {
            throw new Error(`Unexpected tool call: ${result.functionName}`);
          }
        } else if (result.type === 'message') {
          for await (const part of result.stream) {
            await ctx.runMutation(internal.ai.streamMessage, {
              messageId: args.messageId,
              body: part,
            });
          }
          await ctx.runMutation(internal.ai.completeMessage, {
            messageId: args.messageId,
          });
          break;
        }
      }
    } catch (e) {
      if (e instanceof OpenAI.APIError) {
        console.error(e);
        await ctx.runMutation(internal.ai.streamMessage, {
          messageId: args.messageId,
          body: `I'm sorry, but I'm having trouble right now. Please try again later.`,
        });
      } else {
        throw e;
      }
    }
    await generateConversationNameIfNeeded(ctx, openai, conversation);
  },
});

async function generateConversationNameIfNeeded(
  ctx: ActionCtx,
  openai: OpenAI,
  conversation: Doc<'conversations'>
) {
  if (conversation.name) {
    return;
  }
  const messages = await ctx.runQuery(internal.ai.allMessages, {
    conversationId: conversation._id,
  });
  const completion = await openai.beta.chat.completions.parse({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a chat assistant summarizing a conversation to create a title for the conversation in a chat app. Be succinct and return a string of no more than five words.`,
      },
      ...messages,
    ],
    response_format: zodResponseFormat(z.object({ title: z.string() }), 'title'),
  });
  const title = completion.choices[0].message.parsed?.title;
  if (!title) {
    throw new Error('No title found');
  }
  await ctx.runMutation(internal.ai.updateConversationName, {
    conversationId: conversation._id,
    name: title,
  });
}

export const allMessages = internalQuery({
  args: {
    conversationId: v.id('conversations'),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_conversation', (q) => q.eq('conversationId', args.conversationId))
      .collect();
    return messages.map((m) => ({
      role: m.agent.type === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.body,
    }));
  },
});

export const streamMessage = internalMutation({
  args: {
    messageId: v.id('messages'),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    await Messages.update(ctx, args.messageId, { body: args.body });
  },
});

export const completeMessage = internalMutation({
  args: {
    messageId: v.id('messages'),
  },
  handler: async (ctx, args) => {
    await Messages.update(ctx, args.messageId, { isComplete: true });
  },
});

export const getConversation = internalQuery({
  args: {
    conversationId: v.id('conversations'),
  },
  handler: async (ctx, args) => {
    const conversation = await Conversations.get(ctx, args.conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${args.conversationId} not found`);
    }
    return conversation;
  },
});

export const updateConversationName = internalMutation({
  args: {
    conversationId: v.id('conversations'),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await Conversations.updateName(ctx, args.conversationId, args.name);
  },
});

export const startToolUse = internalMutation({
  args: {
    messageId: v.id('messages'),
    toolName: v.string(),
  },
  handler: async (ctx, args) => {
    return await ToolUse.start(ctx, args.messageId, args.toolName);
  },
});

export const setToolUseArguments = internalMutation({
  args: {
    id: v.id('toolUsage'),
    args: v.string(),
  },
  handler: async (ctx, args) => {
    await ToolUse.setArguments(ctx, args.id, args.args);
  },
});

export const setToolUseInProgress = internalMutation({
  args: {
    id: v.id('toolUsage'),
  },
  handler: async (ctx, args) => {
    await ToolUse.setInProgress(ctx, args.id);
  },
});

export const setToolUseSuccess = internalMutation({
  args: {
    id: v.id('toolUsage'),
    result: v.string(),
  },
  handler: async (ctx, args) => {
    await ToolUse.setSuccess(ctx, args.id, args.result);
  },
});
