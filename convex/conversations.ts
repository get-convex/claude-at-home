import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { User } from './model/User';
import { Conversations } from './model/Conversations';

export const create = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await User.mustBeLoggedIn(ctx);
    const conversation = await Conversations.create(ctx, user._id, args.name);
    return conversation;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await User.mustBeLoggedIn(ctx);
    const allMessages = await Conversations.list(ctx, user._id);
    allMessages.sort((a, b) => b._creationTime - a._creationTime);
    return allMessages;
  },
});

export const update = mutation({
  args: {
    id: v.id('conversations'),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await User.mustBeLoggedIn(ctx);
    const conversation = await Conversations.get(ctx, args.id);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    if (conversation.creatorId !== user._id) {
      throw new Error('Not authorized');
    }
    await Conversations.updateName(ctx, args.id, args.name);
  },
});

export const remove = mutation({
  args: {
    id: v.id('conversations'),
  },
  handler: async (ctx, args) => {
    const user = await User.mustBeLoggedIn(ctx);
    const conversation = await Conversations.get(ctx, args.id);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    if (conversation.creatorId !== user._id) {
      throw new Error('Not authorized');
    }
    await Conversations.remove(ctx, args.id);
  },
});
