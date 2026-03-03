import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const geminiKeys = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || "").split(',').map(k => k.trim()).filter(Boolean);

const supabase = createClient(supabaseUrl, supabaseKey);

const CHUNK_SIZE = 3000;
const CHUNK_OVERLAP = 300;

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
        chunks.push(text.slice(i, i + chunkSize));
        i += chunkSize - overlap;
    }
    return chunks;
}

async function getEmbedding(text: string): Promise<number[]> {
    let lastError;
    // Try each key in rotation
    for (const key of geminiKeys) {
        try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
            const result = await model.embedContent(text);
            return result.embedding.values;
        } catch (err: any) {
            if (err.message.includes('429') || err.message.toLowerCase().includes('quota')) {
                lastError = err;
                continue;
            }
            throw err;
        }
    }
    throw lastError || new Error("No API keys available for embedding.");
}

export async function reindexFile(relativePath: string, content: string) {
    console.log(`Re-indexing: ${relativePath}`);

    // 1. Clean up and chunk
    const cleanText = content.replace(/\n+/g, '\n').replace(/\s+/g, ' ').trim();
    if (!cleanText) {
        // If empty, just remove existing chunks
        await supabase.from('document_chunks').delete().eq('document_name', relativePath);
        return;
    }

    const chunks = chunkText(cleanText, CHUNK_SIZE, CHUNK_OVERLAP);

    // 2. Generate embeddings for each chunk
    const newChunks = await Promise.all(chunks.map(async (chunk, index) => {
        const embedding = await getEmbedding(chunk);
        return {
            document_name: relativePath,
            chunk_content: chunk,
            embedding: embedding,
            metadata: {
                chunk_index: index,
                total_chunks: chunks.length,
                file_type: relativePath.endsWith('.md') ? '.md' : '.txt'
            }
        };
    }));

    // 3. Update database (Delete old chunks and insert new ones in a pseudo-transaction)
    // We do delete first
    const { error: deleteError } = await supabase
        .from('document_chunks')
        .delete()
        .eq('document_name', relativePath);

    if (deleteError) {
        console.error(`Error deleting old chunks for ${relativePath}:`, deleteError);
        throw deleteError;
    }

    // Insert new chunks
    const { error: insertError } = await supabase
        .from('document_chunks')
        .insert(newChunks);

    if (insertError) {
        console.error(`Error inserting new chunks for ${relativePath}:`, insertError);
        throw insertError;
    }

    console.log(`✅ Re-indexed ${relativePath} with ${chunks.length} chunks.`);
}
