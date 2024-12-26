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
import type * as lib_openai from "../lib/openai.js";
import type * as messages from "../messages.js";
import type * as model_Conversations from "../model/Conversations.js";
import type * as model_Memories from "../model/Memories.js";
import type * as model_Messages from "../model/Messages.js";
import type * as model_User from "../model/User.js";

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
  "lib/openai": typeof lib_openai;
  messages: typeof messages;
  "model/Conversations": typeof model_Conversations;
  "model/Memories": typeof model_Memories;
  "model/Messages": typeof model_Messages;
  "model/User": typeof model_User;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
