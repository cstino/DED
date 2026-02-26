/**
 * Calculate ability score modifier
 * e.g. 17 → +3, 10 → +0, 8 → -1
 */
export function getModifier(score: number): number {
    return Math.floor((score - 10) / 2);
}

/**
 * Format modifier as string with sign
 * e.g. 3 → "+3", -1 → "-1", 0 → "+0"
 */
export function formatModifier(mod: number): string {
    return mod >= 0 ? `+${mod}` : `${mod}`;
}

/**
 * Get HP bar color class based on percentage
 */
export function getHpClass(current: number, max: number): string {
    const pct = (current / max) * 100;
    if (pct > 50) return "hp-high";
    if (pct > 25) return "hp-mid";
    return "hp-low";
}

/**
 * Generate a random invite code (6 chars, uppercase)
 */
export function generateInviteCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * D&D Ability score names
 */
export const ABILITY_SCORES = [
    { key: "str", label: "FOR", fullLabel: "Forza" },
    { key: "dex", label: "DES", fullLabel: "Destrezza" },
    { key: "con", label: "COS", fullLabel: "Costituzione" },
    { key: "int", label: "INT", fullLabel: "Intelligenza" },
    { key: "wis", label: "SAG", fullLabel: "Saggezza" },
    { key: "cha", label: "CAR", fullLabel: "Carisma" },
] as const;

export type AbilityKey = (typeof ABILITY_SCORES)[number]["key"];

export interface AbilityScores {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
}
