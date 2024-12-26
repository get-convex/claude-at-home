import { query } from "./_generated/server";
import { User } from "./model/User";

export const currentUser = query({
  handler: async (ctx) => {
    const status = await User.loggedInStatus(ctx);
    return status;
  }
})