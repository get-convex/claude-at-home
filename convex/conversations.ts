import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { userQuery } from './users';
import { QueryCtx } from './_generated/server';

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

export const create = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    return await ctx.db.insert('conversations', {
      name: args.name,
      creatorId: user._id,
    });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query('conversations')
      .withIndex('by_creator', (q) => q.eq('creatorId', user._id))
      .order('desc')
      .collect();
  },
});

export const update = mutation({
  args: {
    id: v.id('conversations'),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const conversation = await ctx.db.get(args.id);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    if (conversation.creatorId !== user._id) {
      throw new Error('Not authorized');
    }
    await ctx.db.patch(args.id, { name: args.name });
  },
});

export const remove = mutation({
  args: {
    id: v.id('conversations'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const conversation = await ctx.db.get(args.id);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    if (conversation.creatorId !== user._id) {
      throw new Error('Not authorized');
    }

    // Delete all messages in the conversation
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_conversation', (q) => q.eq('conversationId', args.id))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    await ctx.db.delete(args.id);
  },
});
