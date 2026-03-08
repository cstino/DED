import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const key = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || "").split(',')[0].trim();

async function check() {
    if (!key) {
        console.error("No API key found");
        return;
    }
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await model.embedContent("Hello world");
    console.log("Embedding dimension:", result.embedding.values.length);
}

check();
