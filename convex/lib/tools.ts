import { ActionCtx } from '../_generated/server';
import { ChatCompletionTool } from 'openai/resources/index.mjs';
import { z } from 'zod';
import { zodFunction } from 'openai/helpers/zod';
import { Id } from '../_generated/dataModel';

export interface ToolContext {
  ctx: ActionCtx;
  messageId: Id<'messages'>;
  conversationId: Id<'conversations'>;
  creatorId: Id<'users'>;
  callId: string;
}

export interface Tool<TArgs = any, TResult = any> {
  name: string;
  description: string;
  parameters: z.ZodType<TArgs>;
  execute: (context: ToolContext, args: TArgs) => Promise<TResult>;
  prompt?: string;
}

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register<TArgs, TResult>(tool: Tool<TArgs, TResult>) {
    this.tools.set(tool.name, tool);
    return this;
  }

  getOpenAITools(): ChatCompletionTool[] {
    return Array.from(this.tools.values()).map((tool) =>
      zodFunction({
        name: tool.name,
        parameters: tool.parameters,
        description: tool.description,
      })
    );
  }

  getToolPrompts(): string {
    const prompts = Array.from(this.tools.values())
      .filter((tool) => tool.prompt)
      .map((tool) => tool.prompt);
    return prompts.join('\n\n');
  }

  async executeTool(context: ToolContext, name: string, args: string): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    const parsedArgs = tool.parameters.parse(JSON.parse(args));
    const result = await tool.execute(context, parsedArgs);
    return JSON.stringify(result);
  }
}

// Create and export a singleton registry
export const toolRegistry = new ToolRegistry();
