import { v } from 'convex/values';
import { internalAction, internalMutation, internalQuery } from './_generated/server';
import OpenAI from 'openai';
import { internal } from './_generated/api';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

export const previousMessages = internalQuery({
  args: {
    messageId: v.id('messages'),
  },
  returns: v.array(
    v.object({
      role: v.union(v.literal('user'), v.literal('assistant')),
      content: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.messageId);
    if (!existing) {
      throw new Error(`Message ${args.messageId} not found`);
    }
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_conversation', (q) =>
        q.eq('conversationId', existing.conversationId).lt('_creationTime', existing._creationTime)
      )
      .collect();
    return messages.map((m) => ({
      role: m.agent.type === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.body,
    }));
  },
});

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

const SYSTEM_PROMPT = `
You are a delightfully helpful assistant in a one-on-one chat. Be warm but succinct. 

Your response must be in Markdown. The Markdown environment also supports LaTeX using
KaTeX. Note that you MUST use $ for inline LaTeX and $$ for block LaTeX. KaTeX does 
not support using \( \) or \[ \] for inline or block LaTeX. This is very important 
since it will break rendering.
`;

export const chat = internalAction({
  args: {
    conversationId: v.id('conversations'),
    messageId: v.id('messages'),
  },
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(internal.ai.previousMessages, { messageId: args.messageId });
    const apiKey = process.env.OPENAI_API_KEY;
    const openai = new OpenAI({ apiKey });
    try {
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
      });
      let body = '';
      for await (const part of stream) {
        if (part.choices[0].delta?.content) {
          body += part.choices[0].delta.content;
          await ctx.runMutation(internal.messages.update, {
            messageId: args.messageId,
            body,
            isComplete: false,
          });
        }
      }
      await ctx.runMutation(internal.messages.completeMessage, { messageId: args.messageId });
    } catch (e) {
      if (e instanceof OpenAI.APIError) {
        console.error(e);
        await ctx.runMutation(internal.messages.update, {
          messageId: args.messageId,
          body: `I'm sorry, but I'm having trouble right now. Please try again later. (Tell your boyfriend: ${e.message})`,
          isComplete: true,
        });
      } else {
        throw e;
      }
    }
    const conversation = await ctx.runQuery(internal.ai.getConversation, {
      conversationId: args.conversationId,
    });
    if (!conversation.name) {
      const messages = await ctx.runQuery(internal.ai.allMessages, {
        conversationId: args.conversationId,
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
        conversationId: args.conversationId,
        name: title,
      });
    }
  },
});

export const getConversation = internalQuery({
  args: {
    conversationId: v.id('conversations'),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
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
    await ctx.db.patch(args.conversationId, { name: args.name });
  },
});
