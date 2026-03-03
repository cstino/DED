import fs from 'fs';
import path from 'path';
const envPath = path.resolve('.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const keyMatch = env.match(/GOOGLE_GENERATIVE_AI_API_KEY=(.+)/);
process.env.GOOGLE_GENERATIVE_AI_API_KEY = keyMatch ? keyMatch[1].trim() : '';

import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

async function main() {
  const result = await streamText({
    model: google('gemini-2.5-flash'),
    prompt: 'Hello',
  });
  console.log("Has toDataStreamResponse:", typeof result.toDataStreamResponse === 'function');
}
main();
