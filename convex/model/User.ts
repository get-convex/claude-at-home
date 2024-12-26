import { UserJSON } from '@clerk/backend';
import { Doc, Id } from '../_generated/dataModel';
import { MutationCtx, QueryCtx } from '../_generated/server';

async function allowedEmail(ctx: QueryCtx, emailAddress: string): Promise<boolean> {
  if (process.env.ALLOWED_DOMAIN && emailAddress.endsWith(`@${process.env.ALLOWED_DOMAIN}`)) {
    console.log('allowed email', emailAddress);
    return true;
  }
  const allowedEmail = await ctx.db
    .query('allowedEmails')
    .withIndex('by_email', (q) => q.eq('email', emailAddress))
    .unique();
  console.log('allowEmail', emailAddress, allowedEmail);
  return allowedEmail !== null;
}

async function anyEmailAllowed(ctx: QueryCtx, clerkUser: UserJSON): Promise<boolean> {
  for (const email of clerkUser.email_addresses) {
    if (email.verification?.status === 'verified') {
      if (await allowedEmail(ctx, email.email_address)) {
        return true;
      }
    }
  }
  return false;
}

export class User {
  static async getBySubject(ctx: QueryCtx, subject: string): Promise<AuthenticatedUser | null> {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkUser.id', subject))
      .unique();
    if (!user) {
      return null;
    }
    const anyAllowed = await anyEmailAllowed(ctx, user.clerkUser);
    if (!anyAllowed) {
      console.log('user not allowed', user.clerkUser);
      return null;
    }
    return user as AuthenticatedUser;
  }

  static async loggedInStatus(ctx: QueryCtx): Promise<"No JWT token" | "No Clerk user" | "Disallowed email" | "Logged in"> {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      return "No JWT token";
    }
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkUser.id', identity.subject))
      .unique();
    if (!user) {
      return "No Clerk user";
    }
    const anyAllowed = await anyEmailAllowed(ctx, user.clerkUser);
    if (!anyAllowed) {
      return 'Disallowed email';
    }
    return 'Logged in';
  }

  static async loggedIn(ctx: QueryCtx): Promise<AuthenticatedUser | null> {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      return null;
    }
    return await this.getBySubject(ctx, identity.subject);
  }

  static async mustBeLoggedIn(ctx: QueryCtx): Promise<AuthenticatedUser> {
    const user = await this.loggedIn(ctx);
    if (!user) throw new Error("Can't get current user");
    return user;
  }

  static async updateOrCreate(ctx: MutationCtx, clerkUser: UserJSON): Promise<void> {
    const userRecord = await this.loggedIn(ctx);
    if (userRecord === null) {
      await ctx.db.insert('users', { clerkUser });
    } else {
      await ctx.db.patch(userRecord._id, { clerkUser });
    }
  }

  static async remove(ctx: MutationCtx, id: Id<'users'>): Promise<void> {
    const existing = await this.loggedIn(ctx);
    if (existing === null) {
      console.warn("can't delete user, does not exist", id);
      return;
    }
    await ctx.db.delete(id);
  }
}

export type AuthenticatedUser = Omit<Doc<'users'>, 'clerkUser'> & { clerkUser: UserJSON } & {
  __brand: 'AuthenticatedUser';
};
