import { UserJSON } from '@clerk/backend';
import { Doc, Id } from '../_generated/dataModel';
import { MutationCtx, QueryCtx } from '../_generated/server';

export class User {
  static async getBySubject(ctx: QueryCtx, subject: string): Promise<AuthenticatedUser | null> {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkUser.id', subject))
      .unique();
    if (!user) {
      return null;
    }
    const emailAddreses = user.clerkUser.email_addresses
      .filter((entry: any) => entry.verification.status === "verified")
      .map((entry: any) => entry.email_address);

    let anyAllowed = false;
    for (const email of emailAddreses) {
      const allowedEmail = await ctx.db.query('allowedEmails').withIndex('by_email', (q) => q.eq('email', email)).unique();
      anyAllowed = anyAllowed || allowedEmail !== null;
    }
    if (!anyAllowed) {
      console.log("user not allowed", user.clerkUser);
      return null;
    }
    return user as AuthenticatedUser;
  }

  static async get(ctx: QueryCtx): Promise<AuthenticatedUser | null> {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      return null;
    }
    return await this.getBySubject(ctx, identity.subject);
  }

  static async mustGet(ctx: QueryCtx): Promise<AuthenticatedUser> {
    const user = await this.get(ctx);
    if (!user) throw new Error("Can't get current user");
    return user;
  }

  static async updateOrCreate(ctx: MutationCtx, clerkUser: UserJSON): Promise<void> {
    const userRecord = await this.get(ctx);
    if (userRecord === null) {
      await ctx.db.insert('users', { clerkUser });
    } else {
      await ctx.db.patch(userRecord._id, { clerkUser });
    }
  }

  static async remove(ctx: MutationCtx, id: Id<"users">): Promise<void> {
    const existing = await this.get(ctx);
    if (existing === null) {
      console.warn("can't delete user, does not exist", id);
      return;
    }
    await ctx.db.delete(id);
  }
}

export type AuthenticatedUser = Omit<Doc<'users'>, 'clerkUser'> & { clerkUser: UserJSON; } & { __brand: "AuthenticatedUser"; };