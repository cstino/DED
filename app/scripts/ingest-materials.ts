import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '../app/.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!supabaseUrl || !supabaseKey || !geminiKey) {
    console.error("Missing required environment variables in ../app/.env.local (Need Supabase and GOOGLE_GENERATIVE_AI_API_KEY)");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(geminiKey);
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

// Configuration
const KNOWLEDGE_BASE_DIR = path.resolve(process.cwd(), '../dnd-campaign');
const CHUNK_SIZE = 1000; // characters
const CHUNK_OVERLAP = 200; // characters


function chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
        chunks.push(text.slice(i, i + chunkSize));
        i += chunkSize - overlap;
    }
    return chunks;
}

async function processFile(filePath: string, relativePath: string) {
    console.log(`Processing: ${relativePath}`);

    let text = '';
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.md' || ext === '.txt') {
        text = fs.readFileSync(filePath, 'utf-8');
    } else {
        console.log(`Skipping unsupported file type: ${ext}`);
        return;
    }

    if (!text.trim()) {
        console.log(`Skipping empty file: ${relativePath}`);
        return;
    }

    // Clean up text (remove excessive newlines/spaces)
    text = text.replace(/\n+/g, '\n').replace(/\s+/g, ' ').trim();

    const chunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP);
    console.log(`Created ${chunks.length} chunks for ${relativePath}`);

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        try {
            // Generate embedding using Gemini
            const result = await embeddingModel.embedContent(chunk);
            const embedding = result.embedding.values;

            // Save to Supabase
            const { error } = await supabase.from('document_chunks').insert({
                document_name: relativePath,
                chunk_content: chunk,
                embedding: embedding,
                metadata: {
                    chunk_index: i,
                    total_chunks: chunks.length,
                    file_type: ext
                }
            });

            if (error) {
                console.error(`Supabase insert error for ${relativePath} chunk ${i}:`, error.message);
            }

            // Respect Gemini Free Tier Quota (100 Request per minute)
            await new Promise(resolve => setTimeout(resolve, 800));
        } catch (err: any) {
            console.error(`OpenAI embedding error for ${relativePath} chunk ${i}:`, err.message);
        }
    }
    console.log(`✅ Finished processing ${relativePath}`);
}


async function walkDirAndProcess(dir: string, baseDir: string = '') {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        // Skip hidden files or ignored folders
        if (file.startsWith('.')) continue;

        const fullPath = path.join(dir, file);
        const relPath = path.join(baseDir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            await walkDirAndProcess(fullPath, relPath);
        } else {
            await processFile(fullPath, relPath);
        }
    }
}

async function main() {
    console.log("🚀 Starting D&D Knowledge Base Ingestion...");

    if (!fs.existsSync(KNOWLEDGE_BASE_DIR)) {
        console.error(`Directory not found: ${KNOWLEDGE_BASE_DIR}`);
        process.exit(1);
    }

    // Clear existing chunks (optional, prevents duplicates on re-run)
    console.log("Clearing existing document_chunks...");
    const { error: deleteError } = await supabase.from('document_chunks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (deleteError) console.error("Error clearing table:", deleteError);

    await walkDirAndProcess(KNOWLEDGE_BASE_DIR);

    console.log("✨ Data ingestion complete!");
}

main().catch(console.error);
