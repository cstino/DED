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
const geminiKeys = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || "").split(',').map(k => k.trim()).filter(Boolean);
let currentKeyIndex = 0;

if (!supabaseUrl || !supabaseKey || geminiKeys.length === 0) {
    console.error("Missing required environment variables in ../app/.env.local (Need Supabase and GOOGLE_GENERATIVE_AI_API_KEY)");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to get a model instance for the current key
function getEmbeddingModel() {
    const genAI = new GoogleGenerativeAI(geminiKeys[currentKeyIndex]);
    return genAI.getGenerativeModel({ model: "gemini-embedding-001" });
}

let embeddingModel = getEmbeddingModel();

function rotateKey(): boolean {
    if (currentKeyIndex < geminiKeys.length - 1) {
        currentKeyIndex++;
        console.log(`🔄 Quota exceeded. Rotating to API Key #${currentKeyIndex + 1} (${geminiKeys[currentKeyIndex].substring(0, 8)}...)`);
        embeddingModel = getEmbeddingModel();
        return true;
    }
    return false;
}

// Wrapper to handle embedding with automatic retry on rotation
async function getEmbeddingWithRotation(text: string): Promise<number[]> {
    while (true) {
        try {
            const result = await embeddingModel.embedContent(text);
            return result.embedding.values;
        } catch (err: any) {
            const isQuotaError = err.message.includes('429') || err.message.toLowerCase().includes('quota');
            if (isQuotaError && rotateKey()) {
                continue; // Retry with the next key
            }
            throw err; // Re-throw if no more keys or other error
        }
    }
}

const KNOWLEDGE_BASE_DIR = path.resolve(process.cwd(), '../dnd-campaign');
const CHUNK_SIZE = 3000; // characters
const CHUNK_OVERLAP = 300; // characters
const CONCURRENCY_LIMIT = 2; // Reduced for safety
const BATCH_DELAY_MS = 2000; // 2 requests every 2 seconds = 60 RPM (well under 100 limit)


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
    // Check if we already have chunks for this file to avoid wasting quota
    const { count } = await supabase
        .from('document_chunks')
        .select('*', { count: 'exact', head: true })
        .eq('document_name', relativePath);

    if (count && count > 0) {
        console.log(`⏩ Skipping already processed file: ${relativePath}`);
        return;
    }

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

    // Clean up text
    text = text.replace(/\n+/g, '\n').replace(/\s+/g, ' ').trim();

    const chunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP);
    console.log(`Created ${chunks.length} chunks for ${relativePath}`);

    // Process in batches
    for (let i = 0; i < chunks.length; i += CONCURRENCY_LIMIT) {
        const batch = chunks.slice(i, i + CONCURRENCY_LIMIT);

        await Promise.all(batch.map(async (chunk, batchIdx) => {
            const index = i + batchIdx;
            try {
                const embedding = await getEmbeddingWithRotation(chunk);

                const { error } = await supabase.from('document_chunks').insert({
                    document_name: relativePath,
                    chunk_content: chunk,
                    embedding: embedding,
                    metadata: {
                        chunk_index: index,
                        total_chunks: chunks.length,
                        file_type: ext
                    }
                });

                if (error) {
                    console.error(`Supabase error ${relativePath} [${index}]:`, error.message);
                }
            } catch (err: any) {
                console.error(`Gemini error ${relativePath} [${index}]:`, err.message);
            }
        }));

        // Rate limit protection
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
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

    // Clear existing chunks (MODIFIED: Disabled to allow resuming after quota reset/key swap)
    /*
    console.log("Clearing existing document_chunks...");
    const { error: deleteError } = await supabase.from('document_chunks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (deleteError) console.error("Error clearing table:", deleteError);
    */

    await walkDirAndProcess(KNOWLEDGE_BASE_DIR);

    console.log("✨ Data ingestion complete!");
}

main().catch(console.error);
