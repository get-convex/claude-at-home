import { httpRouter } from 'convex/server';
import { httpAction, internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import type { WebhookEvent } from '@clerk/backend';
import { Webhook } from 'svix';
import { User } from './lib/User';
import { v } from 'convex/values';

function ensureEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`missing environment variable ${name}`);
  }
  return value;
}

const webhookSecret = ensureEnvironmentVariable('CLERK_WEBHOOK_SECRET');

const http = httpRouter();
http.route({
  path: '/clerk-users-webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const event = await validateRequest(request);
    if (!event) {
      return new Response('Error occured', {
        status: 400,
      });
    }
    await ctx.runMutation(internal.http.handleUpdated, {
      event,
    });
    return new Response(null, {
      status: 200,
    });
  }),
});

export default http;

async function validateRequest(req: Request): Promise<WebhookEvent | undefined> {
  const payloadString = await req.text();

  const svixHeaders = {
    'svix-id': req.headers.get('svix-id')!,
    'svix-timestamp': req.headers.get('svix-timestamp')!,
    'svix-signature': req.headers.get('svix-signature')!,
  };
  const wh = new Webhook(webhookSecret);
  let evt: Event | null = null;
  try {
    evt = wh.verify(payloadString, svixHeaders) as Event;
  } catch (_) {
    console.log('error verifying');
    return;
  }

  return evt as unknown as WebhookEvent;
}

export const handleUpdated = internalMutation({
  args: {
    event: v.any()
  },
  handler: async (ctx, args) => {
    const { event } = args;
    switch (event.type) {
      case 'user.created': // intentional fallthrough
      case 'user.updated': {
        const existingUser = await User.getBySubject(ctx, event.data.id);
        if (existingUser && event.type === 'user.created') {
          console.warn('Overwriting user', event.data.id, 'with', event.data);
        }
        console.log('creating/updating user', event.data.id);
        await User.updateOrCreate(ctx, event.data);
        break;
      }
      case 'user.deleted': {
        // Clerk docs say this is required, but the types say optional?
        const id = event.data.id!;
        await User.remove(ctx, id);
        break;
      }
      default: {
        console.log('ignored Clerk webhook event', event.type);
      }
    }
  }
})