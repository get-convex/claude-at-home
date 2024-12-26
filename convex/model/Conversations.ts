import { Id } from '../_generated/dataModel';
import { MutationCtx, QueryCtx } from '../_generated/server';
import { Messages } from './Messages';

export class Conversations {
  static async create(ctx: MutationCtx, userId: Id<'users'>, name?: string) {
    return await ctx.db.insert('conversations', {
      name,
      creatorId: userId,
    });
  }

  static async get(ctx: QueryCtx, conversationId: Id<'conversations'>) {
    return await ctx.db.get(conversationId);
  }

  static async list(ctx: QueryCtx, userId: Id<'users'>) {
    return await ctx.db
      .query('conversations')
      .withIndex('by_creator', (q) => q.eq('creatorId', userId))
      .collect();
  }

  static async updateName(ctx: MutationCtx, conversationId: Id<'conversations'>, name: string) {
    await ctx.db.patch(conversationId, { name });
  }

  static async remove(ctx: MutationCtx, conversationId: Id<'conversations'>) {
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_conversation', (q) => q.eq('conversationId', conversationId))
      .collect();
    for (const message of messages) {
      await Messages.remove(ctx, message._id);
    }
    await ctx.db.delete(conversationId);
  }
}
