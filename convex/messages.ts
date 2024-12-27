import { mutation } from './_generated/server';
import { query } from './_generated/server';
import { v } from 'convex/values';
import { User } from './model/User';
import { Messages } from './model/Messages';
import { ToolUse } from './model/ToolUse';

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
      state: v.union(
        v.object({
          type: v.literal('generating'),
        }),
        v.object({
          type: v.literal('complete'),
        }),
        v.object({
          type: v.literal('error'),
          error: v.string(),
        })
      ),
      body: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    await User.mustBeLoggedIn(ctx);
    const results = await Messages.list(ctx, args.conversationId);
    return results;
  },
});

export const send = mutation({
  args: {
    conversationId: v.id('conversations'),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await User.mustBeLoggedIn(ctx);
    await Messages.sendUserMessage(ctx, args.conversationId, user._id, args.body);
  },
});

export const listToolUses = query({
  args: {
    messageId: v.id('messages'),
  },
  handler: async (ctx, args) => {
    const user = await User.mustBeLoggedIn(ctx);
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error('Message not found');
    }
    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    if (conversation.creatorId !== user._id) {
      throw new Error('You are not allowed to view this conversation');
    }
    return await ToolUse.list(ctx, args.messageId);
  },
});


export const cancel = mutation({
  args: {
    messageId: v.id('messages'),
  },
  handler: async (ctx, args) => {
    const user = await User.mustBeLoggedIn(ctx);
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error('Message not found');
    }
    if (message.agent.type === 'user' && message.agent.id !== user._id) {
      throw new Error('You are not allowed to cancel this message');
    }
    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    if (conversation.creatorId !== user._id) {
      throw new Error('You are not allowed to cancel this message');
    }
    await Messages.fail(ctx, args.messageId, 'Canceled by user');
  },
});
