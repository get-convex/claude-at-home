import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
export const openai = new OpenAI({ apiKey });
