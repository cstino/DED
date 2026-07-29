import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const CHAT_MODEL_FALLBACKS = [
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
] as const;

function isRetryableModelError(err: any) {
    const errorMessage = (err?.message || '').toLowerCase();
    const lastErrorMessage = (err?.lastError?.message || '').toLowerCase();
    const statusCode = err?.status || err?.statusCode || err?.lastError?.statusCode;

    return (
        statusCode === 429 ||
        statusCode === 503 ||
        errorMessage.includes('429') ||
        errorMessage.includes('503') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('high demand') ||
        errorMessage.includes('temporarily unavailable') ||
        errorMessage.includes('service unavailable') ||
        errorMessage.includes('overload') ||
        errorMessage.includes('please try again later') ||
        lastErrorMessage.includes('429') ||
        lastErrorMessage.includes('503') ||
        lastErrorMessage.includes('quota') ||
        lastErrorMessage.includes('high demand') ||
        lastErrorMessage.includes('temporarily unavailable') ||
        lastErrorMessage.includes('service unavailable') ||
        lastErrorMessage.includes('overload') ||
        lastErrorMessage.includes('please try again later')
    );
}

async function streamChatWithFallback({
    geminiKeys,
    systemPrompt,
    messages,
}: {
    geminiKeys: string[];
    systemPrompt: string;
    messages: any[];
}) {
    let lastQuotaError: any;

    for (const modelId of CHAT_MODEL_FALLBACKS) {
        for (const key of geminiKeys) {
            try {
                const google = createGoogleGenerativeAI({ apiKey: key });
                const result = await streamText({
                    model: google(modelId) as any,
                    system: systemPrompt,
                    messages,
                    maxRetries: 0,
                });
                return result.toDataStreamResponse();
            } catch (err: any) {
                if (isRetryableModelError(err)) {
                    console.log(`🔄 Chat quota exceeded for ${modelId} on one key, trying next fallback...`);
                    lastQuotaError = err;
                    continue;
                }
                throw err;
            }
        }
    }

    throw lastQuotaError || new Error("Tutte le chiavi API e i modelli disponibili hanno esaurito la quota.");
}

// Initialize Supabase client for vector similarity search
export async function POST(req: Request) {
    // Initialize Supabase inside the handler to avoid build-time errors if env vars are missing
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const geminiKeys = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || "").split(',').map(k => k.trim()).filter(Boolean);

    try {
        const { messages, isPro } = await req.json();

        // Security check: Only PRO users can use the AI Assistant
        if (!isPro) {
            return new Response(
                JSON.stringify({ error: "L'Assistente AI è riservato agli utenti PRO (Dungeon Master)." }),
                { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const latestMessage = messages[messages.length - 1].content;

        // 1. Get Embeddings with Rotation
        let embedding;
        let lastEmbedError;
        for (const key of geminiKeys) {
            try {
                const genAI = new GoogleGenerativeAI(key);
                const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
                const embedResult = await embeddingModel.embedContent(latestMessage);
                embedding = embedResult.embedding.values;
                break; // Success!
            } catch (err: any) {
                if (err.message.includes('429') || err.message.toLowerCase().includes('quota')) {
                    console.log(`🔄 Embedding quota exceeded for a key, trying next...`);
                    lastEmbedError = err;
                    continue;
                }
                throw err;
            }
        }

        if (!embedding) {
            throw lastEmbedError || new Error("Tutte le chiavi API hanno esaurito la quota per le ricerche (embeddings).");
        }

        // 2. Query Supabase pgvector for similar document chunks
        const { data: documents, error: dbError } = await supabase.rpc('match_documents', {
            query_embedding: embedding,
            match_threshold: 0.5,
            match_count: 10,
        });

        if (dbError) {
            console.error('Vector search error:', dbError);
            throw new Error('Failed to retrieve knowledge base context.');
        }

        // 3. Assemble the context from the matched documents
        let contextText = '';
        if (documents && documents.length > 0) {
            contextText = documents
                .map((doc: any) => `Fonte: ${doc.document_name}\n${doc.chunk_content}`)
                .join('\n\n');
        }

        // 4. Create the system prompt with the RAG context
        const systemPrompt = `Sei un Dungeon Master Assistant esperto di D&D 5e e dell'ambientazione di Eberron (Sharn).
        Il tuo compito è aiutare il Dungeon Master rispondendo alle sue domande o recuperando regole e lore.
        
        UTILIZZA ESCLUSIVAMENTE IL SEGUENTE CONTESTO RECUPERATO DAI MANUALI E DAGLI APPUNTI DELLA CAMPAGNA PER RISPONDERE:
        <contesto>
        ${contextText}
        </contesto>

        Regole ferree per la formattazione e le citazioni:
        1. Se la risposta non è presente nel contesto, dillo chiaramente: "Non ho trovato questa informazione nei manuali o negli appunti forniti".
        2. Usa SEMPRE il markdown per la formattazione (grassetto per i termini chiave, elenchi puntati per le statistiche).
        3. **CITAZIONI**: NON inserire mai citazioni (parentesi quadre) nel mezzo del testo o alla fine di ogni riga.
        4. **FONTI A FINE MESSAGGIO**: Elenca tutte le fonti utilizzate in una singola riga alla fine del messaggio, preceduta dalla parola "Fonti:", ad esempio: "Fonti: [Manuale del giocatore.txt], [01-volta-del-cielo.md]".
        5. **NOMI FILE PULITI**: Usa SOLO il nome del file nelle citazioni, NON il percorso completo. 
        6. Rispondi in italiano. Sii conciso e diretto, sei al tavolo da gioco e il Master ha bisogno di informazioni rapide.`;

        // 5. Stream the response with Rotation
        return await streamChatWithFallback({
            geminiKeys,
            systemPrompt,
            messages,
        });

    } catch (error: any) {
        console.error('API Chat Error:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Errore durante la comunicazione con l\'intelligenza artificiale.' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
