import { internal } from '../_generated/api';
import { Id } from '../_generated/dataModel';
import { QueryCtx, MutationCtx } from '../_generated/server';
import { Memories } from './Memories';

export class Messages {
  static async list(ctx: QueryCtx, conversationId: Id<'conversations'>) {
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_conversation', (q) => q.eq('conversationId', conversationId))
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
  }

  static async sendUserMessage(
    ctx: MutationCtx,
    conversationId: Id<'conversations'>,
    userId: Id<'users'>,
    body: string
  ) {
    const userMessageId = await ctx.db.insert('messages', {
      body,
      agent: { id: userId, type: 'user' },
      isComplete: true,
      conversationId,
    });
    await Memories.queueForIndexing(ctx, { type: 'message', messageId: userMessageId });
    const aiMessageId = await ctx.db.insert('messages', {
      agent: { type: 'openai' },
      body: '...',
      isComplete: false,
      conversationId,
    });
    ctx.scheduler.runAfter(0, internal.ai.chat, { conversationId, messageId: aiMessageId });
  }

  static async update(
    ctx: MutationCtx,
    messageId: Id<'messages'>,
    patch: { body?: string; isComplete?: boolean }
  ) {
    const existing = await ctx.db.get(messageId);
    if (!existing) {
      throw new Error(`Message ${messageId} not found`);
    }
    if (existing.isComplete) {
      throw new Error(`Message ${messageId} is already complete`);
    }
    if (patch.body !== undefined) {
      await ctx.db.patch(messageId, { body: patch.body });
    }
    if (patch.isComplete) {
      await Memories.queueForIndexing(ctx, { type: 'message', messageId });
    }
    await ctx.db.patch(messageId, patch);
  }

  static async remove(ctx: MutationCtx, messageId: Id<'messages'>) {
    await Memories.removeForMessage(ctx, messageId);
    await ctx.db.delete(messageId);
  }
}
