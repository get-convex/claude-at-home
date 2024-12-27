// NOTE: You can remove this file. Declaring the shape
// of the database is entirely optional in Convex.
// See https://docs.convex.dev/database/schemas.

import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

const agent = v.union(
  v.object({
    type: v.literal('user'),
    id: v.id('users'),
  }),
  v.object({
    type: v.literal('openai'),
  })
);

export default defineSchema({
  allowedEmails: defineTable({
    email: v.string(),
  }).index('by_email', ['email']),

  users: defineTable({
    // this is UserJSON from @clerk/backend
    clerkUser: v.any(),
  }).index('by_clerk_id', ['clerkUser.id']),

  conversations: defineTable({
    name: v.optional(v.string()),
    creatorId: v.id('users'),
  }).index('by_creator', ['creatorId']),

  messages: defineTable({
    agent,
    body: v.string(),
    conversationId: v.id('conversations'),
    state: v.union(
      v.object({ type: v.literal('generating') }),
      v.object({ type: v.literal('error'), error: v.string() }),
      v.object({ type: v.literal('complete') })
    ),
  }).index('by_conversation', ['conversationId']),

  toolUsage: defineTable({
    messageId: v.id('messages'),
    toolName: v.string(),
    toolArgs: v.string(),
    status: v.union(
      v.object({
        type: v.literal('generating'),
      }),
      v.object({
        type: v.literal('inProgress'),
      }),
      v.object({
        type: v.literal('success'),
        result: v.string(),
      }),
      v.object({
        type: v.literal('error'),
        error: v.string(),
      })
    ),
  }).index('by_message', ['messageId']),

  memoriesToIndex: defineTable({
    source: v.union(
      v.object({
        type: v.literal('message'),
        messageId: v.id('messages'),
      })
    ),
  }).index('by_source', ['source']),

  memories: defineTable({
    userId: v.id('users'),
    source: v.union(
      v.object({
        type: v.literal('message'),
        messageId: v.id('messages'),
      })
    ),
    body: v.array(v.float64()),
  })
    .vectorIndex('body', {
      dimensions: 1536,
      filterFields: ['userId'],
      vectorField: 'body',
    })
    .index('by_source', ['source']),
});
