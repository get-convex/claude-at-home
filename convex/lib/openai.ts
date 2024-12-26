import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

let client: OpenAI | null = null;
export function openaiClient() {
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  if (!client) {
    client = new OpenAI({ apiKey });
  }
  return client;
}

export async function computeEmbedding(text: string) {
  const openai = openaiClient();
  const response = await openai.embeddings.create({
    input: text,
    model: 'text-embedding-3-small',
  });
  return response.data[0].embedding;
}
