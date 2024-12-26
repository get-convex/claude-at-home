import { v } from 'convex/values';
import { internalAction, internalQuery } from './_generated/server';
import OpenAI from 'openai';
import { internal } from './_generated/api';

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
      .withIndex('by_creation_time', (q) => q.lt('_creationTime', existing._creationTime))
      .take(100);
    return messages.map((m) => ({
      role: m.agent.type === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.body,
    }));
  },
});

const SYSTEM_PROMPT = `
You are a delightfully helpful assistant in a one-on-one chat. Be warm but succinct. 

Your response must be in Markdown. The Markdown environment also supports LaTeX. You
can either return inline LaTeX like $E = mc^2$ or block LaTeX like

$$
E = mc^2
$$
`;

export const chat = internalAction({
  args: {
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
  },
});
