import { createGroq } from '@ai-sdk/groq';
import { generateObject } from 'ai';
import { z } from 'zod';

export const maxDuration = 60; // Allow up to 60s for generation

const npcSchema = z.object({
    name: z.string().describe("Nome completo dell'NPC, coerente con la razza scelta"),
    race: z.string().describe("Razza dell'NPC"),
    role: z.string().describe("Ruolo o classe dell'NPC (es. Guerriero, Mago, Ladro, etc.)"),
    alignment: z.string().describe("Allineamento D&D (es. Neutrale Malvagio, Caotico Buono)"),
    hp: z.number().describe("Punti ferita, calcolati secondo le regole D&D 5e per il livello"),
    ac: z.number().describe("Classe armatura, basata sull'equipaggiamento"),
    stats: z.object({
        str: z.number().describe("Forza (1-20)"),
        dex: z.number().describe("Destrezza (1-20)"),
        con: z.number().describe("Costituzione (1-20)"),
        int: z.number().describe("Intelligenza (1-20)"),
        wis: z.number().describe("Saggezza (1-20)"),
        cha: z.number().describe("Carisma (1-20)"),
    }),
    traits: z.array(z.object({
        name: z.string(),
        description: z.string(),
    })).describe("Tratti di personalità, background e capacità passive"),
    actions: z.array(z.object({
        name: z.string(),
        description: z.string(),
    })).describe("Azioni in combattimento con danni e meccaniche D&D 5e"),
    equipment: z.array(z.string()).describe("Lista dell'equipaggiamento"),
    notes: z.string().describe("Note aggiuntive per il DM su come interpretare questo NPC"),
    challenge_rating: z.string().describe("Grado di sfida stimato (es. 1/4, 1, 5, 10)"),
    image_prompt: z.string().describe("Una descrizione dettagliata in INGLESE dell'aspetto fisico dell'NPC per un'IA generatrice di immagini. Specifica stile fantasy, illuminazione e dettagli distintivi."),
});

const monsterSchema = z.object({
    name: z.string().describe("Nome del mostro"),
    race: z.string().describe("Tipo di creatura (es. Aberrazione, Bestia, Drago, Non-morto, etc.)"),
    role: z.string().describe("Sottotipo o ruolo tattico (es. Lupo Mannaro, Guardiano, Sciamano)"),
    alignment: z.string().describe("Allineamento D&D"),
    hp: z.number().describe("Punti ferita secondo il Manuale dei Mostri D&D 5e"),
    ac: z.number().describe("Classe armatura (armatura naturale o equipaggiamento)"),
    stats: z.object({
        str: z.number(),
        dex: z.number(),
        con: z.number(),
        int: z.number(),
        wis: z.number(),
        cha: z.number(),
    }),
    traits: z.array(z.object({
        name: z.string(),
        description: z.string(),
    })).describe("Tratti speciali del mostro (es. Resistenza alla Magia, Visione nel Buio, etc.)"),
    actions: z.array(z.object({
        name: z.string(),
        description: z.string(),
    })).describe("Azioni del mostro in combattimento, con danni esatti e meccaniche D&D 5e"),
    equipment: z.array(z.string()).describe("Equipaggiamento o tesoro trovato sul mostro "),
    notes: z.string().describe("Tattiche di combattimento, abitudini e note per il DM"),
    challenge_rating: z.string().describe("Grado di sfida (CR) bilanciato secondo D&D 5e"),
    image_prompt: z.string().describe("Una descrizione dettagliata in INGLESE dell'aspetto del mostro per un'IA generatrice di immagini. Specifica stile fantasy, mostruosità e ambiente."),
});

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
        const schema = isMonster ? monsterSchema : npcSchema;

        const systemPrompt = isMonster
            ? `Sei un esperto di D&D 5e. Genera un MOSTRO completo e bilanciato secondo le regole del Manuale dei Mostri, con stat block accurato.
Le statistiche devono essere coerenti con il Grado di Sfida (CR). Usa formula HP = dadi vita * (media dado + mod COS).
I danni delle azioni devono essere espressi in notazione D&D (es. "2d6+4 danni taglienti").
Sii creativo con i tratti speciali ma resta bilanciato. 
Genera anche una "image_prompt" in inglese molto dettagliata che descriva l'aspetto del mostro in uno stile fantasy epico e realistico.
Rispondi in italiano.`
            : `Sei un esperto di D&D 5e. Genera un NPC completo e interessante seguendo le regole del Manuale del Giocatore.
Le statistiche (1-20) devono essere coerenti con razza, classe e livello. Calcola HP e AC correttamente.
I tratti di personalità devono essere unici e memorabili, non generici.
Le azioni devono includere danni esatti in notazione D&D (es. "1d8+3 danni perforanti").
Genera anche una "image_prompt" in inglese molto dettagliata che descriva l'aspetto fisico del personaggio in uno stile fantasy epico e realistico, includendo vestiario, armi e tratti somatici.
Rispondi in italiano.`;

        const groq = createGroq({ apiKey: groqKey });

        const result = await generateObject({
            model: groq('llama-3.3-70b-versatile') as any,
            schema,
            system: systemPrompt,
            prompt: `Genera: ${prompt}`,
            maxRetries: 1,
        });

        const generatedObj: any = result.object;

        // Image Generation with Pollinations.ai (Flux)
        const encodedPrompt = encodeURIComponent(generatedObj.image_prompt);
        const portraitUrl = `https://pollinations.ai/p/${encodedPrompt}?width=1024&height=1024&nologo=true&model=flux`;

        console.log('Generated entity:', generatedObj.name);
        console.log('Pollinations Image URL:', portraitUrl);

        return new Response(
            JSON.stringify({
                result: { ...generatedObj, portrait_url: portraitUrl },
                type: isMonster ? 'monster' : 'npc'
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error: any) {
        console.error('API Generate Error (Groq):', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Errore durante la generazione.' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
