import { v } from "convex/values";
import { query } from "./_generated/server";
import { User } from "./lib/User";

export const currentUser = query({
  handler: async (ctx) => {
    const status = await User.loggedInStatus(ctx);
    return status;
  }
})