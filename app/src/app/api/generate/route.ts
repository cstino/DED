import { z } from 'zod';

export const maxDuration = 60;

export async function POST(req: Request) {
    const groqKey = process.env.GROQ_API_KEY;

    if (!groqKey) {
        return new Response(
            JSON.stringify({ error: 'Configurazione mancante: GROQ_API_KEY non trovata.' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }

    try {
        const { type, prompt } = await req.json();

        if (!prompt) {
            return new Response(
                JSON.stringify({ error: 'Il campo "prompt" è obbligatorio.' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const isMonster = type === 'monster';

        // Manual schema description for generateText
        const schemaDescription = `{"name":"string","race":"string","role":"string","alignment":"string","hp":number,"ac":number,"stats":{"str":number,"dex":number,"con":number,"int":number,"wis":number,"cha":number},"traits":[{"name":"string","description":"string"}],"actions":[{"name":"string","description":"string"}],"equipment":["string"],"notes":"string","challenge_rating":"string","image_prompt":"string"}`;

        const systemPrompt = `Sei un esperto di D&D 5e. Genera un ${isMonster ? 'MOSTRO' : 'NPC'} completo e bilanciato.
Rispondi ESCLUSIVAMENTE con un oggetto JSON valido che segua esattamente questa struttura: ${schemaDescription}. Non aggiungere altro testo, spiegazioni o blocchi markdown. Rispondi in italiano.`;

        // Direct fetch to Groq to bypass AI SDK protocol issues
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${groqKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Genera: ${prompt}` }
                ],
                temperature: 0.7,
                max_tokens: 1500,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Groq API Error:", errorData);
            throw new Error(`Errore API Groq: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const text = data.choices[0]?.message?.content;

        if (!text) {
            throw new Error('Il modello AI ha restituito una risposta vuota.');
        }

        // Parse JSON
        const generatedObj = JSON.parse(text);

        // Image Generation with Pollinations.ai (Flux)
        const encodedPrompt = encodeURIComponent(generatedObj.image_prompt);
        const portraitUrl = `https://pollinations.ai/p/${encodedPrompt}?width=1024&height=1024&nologo=true&model=flux`;

        return new Response(
            JSON.stringify({
                result: { ...generatedObj, portrait_url: portraitUrl },
                type: isMonster ? 'monster' : 'npc'
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error: any) {
        console.error('API Generate Error:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Errore durante la generazione.' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
