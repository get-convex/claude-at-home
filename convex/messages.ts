import { mutation } from './_generated/server';
import { query } from './_generated/server';
import { v } from 'convex/values';
import { User } from './lib/User';
import { Messages } from './lib/Messages';

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
    await User.mustGet(ctx);
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
    const user = await User.mustGet(ctx);
    await Messages.sendUserMessage(ctx, args.conversationId, user._id, args.body);
  },
});

