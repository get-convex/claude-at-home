import { QueryCtx } from '../_generated/server';

import { Id } from '../_generated/dataModel';
import { MutationCtx } from '../_generated/server';
import { Messages } from './Messages';

export class ToolUse {
  static async start(ctx: MutationCtx, messageId: Id<'messages'>, toolName: string) {
    await Messages.requireGenerating(ctx, messageId);
    const id = await ctx.db.insert('toolUsage', {
      messageId,
      toolName,
      toolArgs: '',
      status: { type: 'generating' },
    });
    return id;
  }

  static async setArguments(ctx: MutationCtx, id: Id<'toolUsage'>, args: string) {
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error('Tool use not found');
    }
    await Messages.requireGenerating(ctx, existing.messageId);
    if (existing.status.type !== 'generating') {
      throw new Error('Tool use is not in generating state');
    }
    await ctx.db.patch(id, {
      toolArgs: args,
    });
  }

  static async setInProgress(ctx: MutationCtx, id: Id<'toolUsage'>) {
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error('Tool use not found');
    }
    await Messages.requireGenerating(ctx, existing.messageId);
    if (existing.status.type !== 'generating') {
      throw new Error('Tool use is not in generating state');
    }
    await ctx.db.patch(id, {
      status: { type: 'inProgress' },
    });
  }

  static async setSuccess(ctx: MutationCtx, id: Id<'toolUsage'>, result: string) {
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error('Tool use not found');
    }
    await Messages.requireGenerating(ctx, existing.messageId);
    await ctx.db.patch(id, {
      status: { type: 'success', result },
    });
  }

  static async setError(ctx: MutationCtx, id: Id<'toolUsage'>, error: string) {
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error('Tool use not found');
    }
    await ctx.db.patch(id, {
      status: { type: 'error', error },
    });
  }

  static async list(ctx: QueryCtx, messageId: Id<'messages'>) {
    return await ctx.db
      .query('toolUsage')
      .withIndex('by_message', (q) => q.eq('messageId', messageId))
      .collect();
  }
}
