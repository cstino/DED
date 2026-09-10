/**
 * Reads the Gemini keys in declaration order. The primary variable can contain
 * comma-separated keys; numbered variables are also supported for convenience.
 */
export function getGeminiKeys(): string[] {
    const values = [
        process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        process.env.GOOGLE_GENERATIVE_AI_API_KEY2,
        process.env.GOOGLE_GENERATIVE_AI_API_KEY3,
        process.env.GOOGLE_GENERATIVE_AI_API_KEY4,
    ];

    return values
        .flatMap((value) => (value || '').split(','))
        .map((key) => key.trim())
        .filter(Boolean);
}
