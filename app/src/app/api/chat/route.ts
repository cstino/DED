import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for vector similarity search
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
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

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
        const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        const embedResult = await embeddingModel.embedContent(latestMessage);
        const embedding = embedResult.embedding.values;

        // 2. Query Supabase pgvector for similar document chunks
        const { data: documents, error } = await supabase.rpc('match_documents', {
            query_embedding: embedding,
            match_threshold: 0.75, // Adjust based on precision needs
            match_count: 5,       // Max chunks to retrieve
        });

        if (error) {
            console.error('Vector search error:', error);
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

        Regole ferree:
        1. Se la risposta non è presente nel contesto, dillo chiaramente: "Non ho trovato questa informazione nei manuali o negli appunti forniti".
        2. Quando rispondi, **cita la fonte** (il "document_name" del frammento che hai usato) usando le parentesi quadre, es. [Player's Handbook.pdf] o [01-volta-del-cielo.md].
        3. Rispondi in italiano. Sii conciso e diretto, sei al tavolo da gioco e il Master ha bisogno di informazioni rapide.`;

        // 5. Stream the response directly to the client
        const result = await streamText({
            model: google('gemini-2.5-flash'),
            system: systemPrompt,
            messages,
        });

        return result.toDataStreamResponse();

    } catch (error: any) {
        console.error('API Chat Error:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Errore durante la comunicazione con l\'intelligenza artificiale.' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
