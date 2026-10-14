/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as conversations from "../conversations.js";
import type * as http from "../http.js";
import type * as lib_modal from "../lib/modal.js";
import type * as lib_openai from "../lib/openai.js";
import type * as lib_tavily from "../lib/tavily.js";
import type * as lib_toolDefinitions from "../lib/toolDefinitions.js";
import type * as lib_tools from "../lib/tools.js";
import type * as messages from "../messages.js";
import type * as model_Conversations from "../model/Conversations.js";
import type * as model_Memories from "../model/Memories.js";
import type * as model_Messages from "../model/Messages.js";
import type * as model_ToolUse from "../model/ToolUse.js";
import type * as model_User from "../model/User.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  auth: typeof auth;
  conversations: typeof conversations;
  http: typeof http;
  "lib/modal": typeof lib_modal;
  "lib/openai": typeof lib_openai;
  "lib/tavily": typeof lib_tavily;
  "lib/toolDefinitions": typeof lib_toolDefinitions;
  "lib/tools": typeof lib_tools;
  messages: typeof messages;
  "model/Conversations": typeof model_Conversations;
  "model/Memories": typeof model_Memories;
  "model/Messages": typeof model_Messages;
  "model/ToolUse": typeof model_ToolUse;
  "model/User": typeof model_User;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
