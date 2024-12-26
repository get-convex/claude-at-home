import { internal } from './_generated/api';
import { internalMutation, internalQuery, mutation, QueryCtx } from './_generated/server';
import { query } from './_generated/server';
import { v } from 'convex/values';
import { userQuery } from './users';

async function requireUser(ctx: QueryCtx) {
  const auth = await ctx.auth.getUserIdentity();
  if (!auth) {
    throw new Error('Not logged in');
  }
  const user = await userQuery(ctx, auth.subject);
  if (!user) {
    throw new Error(`User ${auth.subject} not found`);
  }
  return user;
}

export const list = query({
  args: {
    conversationId: v.id('conversations'),
  },
  returns: v.array(
    v.object({
      _id: v.id('messages'),
      agent: v.union(
        v.object({
          type: v.literal('user'),
          name: v.string(),
          imageUrl: v.string(),
        }),
        v.object({
          type: v.literal('openai'),
        })
      ),
      isComplete: v.boolean(),
      body: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const currentUser = await requireUser(ctx);
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_conversation', (q) => q.eq('conversationId', args.conversationId))
      .collect();
    const results = [];
    for (const message of messages) {
      if (message.agent.type === 'user') {
        const user = await ctx.db.get(message.agent.id);
        if (!user) {
          throw new Error(`User ${message.agent.id} not found`);
        }
        results.push({
          _id: message._id,
          body: message.body,
          agent: {
            type: 'user' as const,
            name: user.clerkUser.first_name,
            imageUrl: user.clerkUser.image_url,
          },
          isComplete: message.isComplete,
        });
      } else {
        results.push({
          _id: message._id,
          body: message.body,
          agent: { type: 'openai' as const },
          isComplete: message.isComplete,
        });
      }
    }
    return results;
  },
});

export const send = mutation({
  args: {
    conversationId: v.id('conversations'),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Send our message.
    await ctx.db.insert('messages', {
      body: args.body,
      agent: { id: user._id, type: 'user' },
      isComplete: true,
      conversationId: args.conversationId,
    });

    const messageId = await ctx.db.insert('messages', {
      agent: { type: 'openai' },
      body: '...',
      isComplete: false,
      conversationId: args.conversationId,
    });

    ctx.scheduler.runAfter(0, internal.ai.chat, { conversationId: args.conversationId, messageId });
  },
});

// Updates a message with a new body.
export const update = internalMutation({
  args: {
    messageId: v.id('messages'),
    body: v.string(),
    isComplete: v.boolean(),
  },
  handler: async (ctx, { messageId, body, isComplete }) => {
    await ctx.db.patch(messageId, { body, isComplete });
  },
});

export const completeMessage = internalMutation({
  args: {
    messageId: v.id('messages'),
  },
  handler: async (ctx, { messageId }) => {
    await ctx.db.patch(messageId, { isComplete: true });
  },
});
