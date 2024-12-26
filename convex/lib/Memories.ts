import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { Id } from '../_generated/dataModel';
import {
  ActionCtx,
  internalAction,
  internalMutation,
  internalQuery,
  MutationCtx,
} from '../_generated/server';
import { openai } from '../openai';

export type Source = {
  type: 'message';
  messageId: Id<'messages'>;
};

export class Memories {
  static async queueForIndexing(ctx: MutationCtx, source: Source) {
    await ctx.db.insert('memoriesToIndex', {
      source,
    });
    await ctx.scheduler.runAfter(0, internal.lib.Memories.indexMemories, {});
  }

  static async query(ctx: ActionCtx, userId: Id<'users'>, query: string) {
    const response = await openai.embeddings.create({
      input: query,
      model: 'text-embedding-3-small',
    });
    const embedding = response.data[0].embedding;
    const memories = await ctx.vectorSearch('memories', 'body', {
      vector: embedding,
      limit: 15,
      filter: (q) => q.eq('userId', userId),
    });
    return ctx.runQuery(internal.lib.Memories.enrichMemories, {
      userId,
      results: memories,
    });
  }

  static async removeForMessage(ctx: MutationCtx, messageId: Id<'messages'>) {
    const toIndex = await ctx.db
      .query('memoriesToIndex')
      .withIndex('by_source', (q) => q.eq('source', { type: 'message', messageId }))
      .first();
    if (toIndex) {
      await ctx.db.delete(toIndex._id);
    }
    const memories = await ctx.db
      .query('memories')
      .withIndex('by_source', (q) => q.eq('source', { type: 'message', messageId }))
      .collect();
    for (const memory of memories) {
      await ctx.db.delete(memory._id);
    }
  }
}

export const indexMemories = internalAction({
  args: {},
  handler: async (ctx) => {
    const toIndex = await ctx.runQuery(internal.lib.Memories.nextToIndex);
    if (!toIndex) {
      return;
    }
    const { indexId, body } = toIndex;
    const embedding = await openai.embeddings.create({
      input: body,
      model: 'text-embedding-3-small',
    });
    await ctx.runMutation(internal.lib.Memories.addMemory, {
      indexId,
      userId: toIndex.userId,
      source: {
        type: 'message',
        messageId: toIndex.messageId,
      },
      body: embedding.data[0].embedding,
    });
  },
});

export const nextToIndex = internalQuery({
  args: {},
  handler: async (ctx) => {
    const memory = await ctx.db.query('memoriesToIndex').first();
    if (!memory) {
      return null;
    }
    if (memory.source.type !== 'message') {
      throw new Error('Only message sources are supported');
    }
    const message = await ctx.db.get(memory.source.messageId);
    if (!message) {
      throw new Error(`Message ${memory.source.messageId} not found`);
    }
    if (!message.isComplete) {
      throw new Error(`Message ${memory.source.messageId} is not complete`);
    }
    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${message.conversationId} not found`);
    }
    return {
      indexId: memory._id,
      body: message.body,
      userId: conversation.creatorId,
      messageId: message._id,
    };
  },
});

export const addMemory = internalMutation({
  args: {
    indexId: v.id('memoriesToIndex'),
    userId: v.id('users'),
    source: v.object({
      type: v.literal('message'),
      messageId: v.id('messages'),
    }),
    body: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('memories', {
      userId: args.userId,
      source: args.source,
      body: args.body,
    });
    await ctx.db.delete(args.indexId);
  },
});

export const enrichMemories = internalQuery({
  args: {
    userId: v.id('users'),
    results: v.array(
      v.object({
        _id: v.id('memories'),
        _score: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results: Array<{ _score: number; body: string; name: string; ageMilliseconds: number }> =
      [];
    for (const result of args.results) {
      const memory = await ctx.db.get(result._id);
      if (!memory) {
        throw new Error(`Memory ${result._id} not found`);
      }
      const message = await ctx.db.get(memory.source.messageId);
      if (!message) {
        throw new Error(`Message ${memory.source.messageId} not found`);
      }
      let name;
      if (message.agent.type === 'user') {
        const user = await ctx.db.get(message.agent.id);
        if (!user) {
          throw new Error(`User ${message.agent.id} not found`);
        }
        name = user.clerkUser.first_name;
      } else {
        name = 'OpenAI';
      }
      results.push({
        _score: result._score,
        ageMilliseconds: Date.now() - message._creationTime,
        body: message.body,
        name,
      });
    }
    return results;
  },
});
