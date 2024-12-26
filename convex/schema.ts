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
  users: defineTable({
    // this is UserJSON from @clerk/backend
    clerkUser: v.any(),
    color: v.string(),
  }).index('by_clerk_id', ['clerkUser.id']),

  conversations: defineTable({
    name: v.optional(v.string()),
    creatorId: v.id('users'),
  }).index('by_creator', ['creatorId']),

  messages: defineTable({
    agent,
    body: v.string(),
    isComplete: v.boolean(),
    conversationId: v.id('conversations'),
  }).index('by_conversation', ['conversationId']),
});
