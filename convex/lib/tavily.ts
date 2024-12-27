import { tavily } from '@tavily/core';

const apiKey = process.env.TAVILY_API_KEY;
let client: ReturnType<typeof tavily> | null = null;

export function tavilyClient() {
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY is not set');
  }
  if (!client) {
    client = tavily({ apiKey });
  }
  return client;
}
