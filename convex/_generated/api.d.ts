/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as conversations from "../conversations.js";
import type * as http from "../http.js";
import type * as lib_Conversations from "../lib/Conversations.js";
import type * as lib_Memories from "../lib/Memories.js";
import type * as lib_Messages from "../lib/Messages.js";
import type * as lib_User from "../lib/User.js";
import type * as messages from "../messages.js";
import type * as openai from "../openai.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  auth: typeof auth;
  conversations: typeof conversations;
  http: typeof http;
  "lib/Conversations": typeof lib_Conversations;
  "lib/Memories": typeof lib_Memories;
  "lib/Messages": typeof lib_Messages;
  "lib/User": typeof lib_User;
  messages: typeof messages;
  openai: typeof openai;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
