import { v } from 'convex/values';
import { ActionCtx, internalAction, internalMutation, internalQuery } from './_generated/server';
import OpenAI from 'openai';
import { internal } from './_generated/api';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { Conversations } from './model/Conversations';
import { Doc } from './_generated/dataModel';
import { Messages } from './model/Messages';
import { ChatCompletionMessageParam, ChatCompletionChunk } from 'openai/resources/index.mjs';
import { openaiClient } from './lib/openai';
import { ToolUse } from './model/ToolUse';
import { toolRegistry } from './lib/toolDefinitions';

function getSystemPrompt() {
  const basePrompt = `You are a delightfully helpful assistant in a one-on-one English chat. Be warm but succinct. 
You are definitely not lame, though, so please don't use happy or excited emojis
at the end of your messages.`;

  const toolPrompts = toolRegistry.getToolPrompts();

  const formatPrompt = `Your response must be in Markdown. The Markdown environment also supports LaTeX using
KaTeX. Note that you MUST use $ for inline LaTeX and $$ for block LaTeX. KaTeX does 
not support using \( \) or \[ \] for inline or block LaTeX. This is very important 
since it will break rendering. Also note that since the environment supports LaTeX, 
you will have to escape dollar signs in your response.`;

  return [basePrompt, toolPrompts, formatPrompt].join('\n\n');
}

const openai = openaiClient();

async function streamChat(context: Array<ChatCompletionMessageParam>) {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    stream: true,
    messages: [
      {
        role: 'system',
        content: getSystemPrompt(),
      },
      ...context,
    ],
    tools: toolRegistry.getOpenAITools(),
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
        content: getSystemPrompt(),
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

          try {
            const toolResult = await toolRegistry.executeTool(
              {
                ctx,
                messageId: args.messageId,
                conversationId: args.conversationId,
                creatorId: conversation.creatorId,
                callId: result.callId,
              },
              result.functionName,
              toolArgs
            );

            context.push({
              role: 'tool',
              content: toolResult,
              tool_call_id: result.callId,
            });

            await ctx.runMutation(internal.ai.setToolUseSuccess, {
              id: toolUseId,
              result: toolResult,
            });

            continue;
          } catch (e: any) {
            context.push({
              role: 'tool',
              content: `Tool failed: ${e.toString()}`,
              tool_call_id: result.callId,
            });
            await ctx.runMutation(internal.ai.setToolUseError, {
              id: toolUseId,
              error: e.toString(),
            });
            throw e;
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
    await Messages.generateBody(ctx, args.messageId, args.body);
  },
});

export const completeMessage = internalMutation({
  args: {
    messageId: v.id('messages'),
  },
  handler: async (ctx, args) => {
    await Messages.complete(ctx, args.messageId);
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

export const setToolUseError = internalMutation({
  args: {
    id: v.id('toolUsage'),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ToolUse.setError(ctx, args.id, args.error);
  },
});
