import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
export const openai = new OpenAI({ apiKey });

export async function computeEmbedding(text: string) {
  const response = await openai.embeddings.create({
    input: text,
    model: 'text-embedding-3-small',
  });
  return response.data[0].embedding;
}
