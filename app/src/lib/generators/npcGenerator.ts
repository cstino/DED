// src/lib/generators/npcGenerator.ts

export type NpcRace = "Umano" | "Elfo" | "Nano" | "Halfling" | "Orco" | "Tiefling" | "Draconico";
export type NpcRole = "Guardia" | "Bandito" | "Mago" | "Sacerdote" | "Assassino" | "Civile" | "Nobile";
export type NpcPowerLevel = "Basso" | "Medio" | "Alto" | "Boss";

interface Stats {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
}

export interface GeneratedNPC {
    name: string;
    race: NpcRace;
    role: NpcRole;
    stats: Stats;
    hp: number;
    ac: number;
    traits: { name: string; description: string }[];
    actions: { name: string; description: string }[];
    equipment: string[];
    notes: string;
}

// ---------------------------------------------------------
// Dati di Base (Mock / Tabelle Procedurali)
// ---------------------------------------------------------

const FIRST_NAMES: Record<NpcRace, string[]> = {
    Umano: ["Arthur", "Bran", "Cedric", "Diana", "Elena", "Fiona", "Gareth"],
    Elfo: ["Aelar", "Faen", "Galan", "Ivellios", "Lia", "Mialee", "Sariel"],
    Nano: ["Adrik", "Baern", "Eberk", "Gunnloda", "Hlin", "Kathra", "Traubon"],
    Halfling: ["Alton", "Cade", "Eldon", "Garret", "Lyle", "Merla", "Verna"],
    Orco: ["Dench", "Feng", "Gell", "Henk", "Holg", "Imsh", "Keth"],
    Tiefling: ["Akmenos", "Amnon", "Barakas", "Damakos", "Ekemon", "Iados", "Kairon"],
    Draconico: ["Arjhan", "Balasar", "Bharash", "Donaar", "Gheshtai", "Heskan", "Kriv"]
};

const LAST_NAMES: Record<NpcRace, string[]> = {
    Umano: ["Smith", "Baker", "Miller", "Stone", "Rivers", "Forrest", "Winter"],
    Elfo: ["Amakiir", "Galanodel", "Holimion", "Liadon", "Meliamne", "Nailo", "Siannodel"],
    Nano: ["Balderk", "Dankil", "Gorunn", "Holderhek", "Loderr", "Lutgehr", "Rumnaheim"],
    Halfling: ["Brushgather", "Goodbarrel", "Greenbottle", "High-hill", "Hilltopple", "Leagallow", "Tealeaf"],
    Orco: ["(Il Sanguinario)", "(Lo Spaccacrani)", "(Il Crudele)", "Gnarsh", "Orog", "Dak", "Krag"],
    Tiefling: ["(Desiderio)", "(Disperazione)", "(Eccellenza)", "(Gloria)", "(Ideale)", "(Musica)", "(Poesia)"],
    Draconico: ["Clethtinthiallor", "Daardendrian", "Delmirev", "Drachedandion", "Fenkenkabradon", "Kepeshkmolik", "Kerrhylon"]
};

const ROLE_BASE_STATS: Record<NpcRole, Stats> = {
    Guardia: { str: 14, dex: 12, con: 12, int: 10, wis: 10, cha: 10 },
    Bandito: { str: 10, dex: 14, con: 12, int: 10, wis: 10, cha: 12 },
    Mago: { str: 8, dex: 12, con: 10, int: 15, wis: 12, cha: 10 },
    Sacerdote: { str: 10, dex: 10, con: 12, int: 12, wis: 15, cha: 13 },
    Assassino: { str: 10, dex: 16, con: 12, int: 12, wis: 10, cha: 14 },
    Civile: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    Nobile: { str: 10, dex: 12, con: 10, int: 12, wis: 10, cha: 15 }
};

const RACE_MODIFIERS: Record<NpcRace, Partial<Stats>> = {
    Umano: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    Elfo: { dex: 2, wis: 1 },
    Nano: { con: 2, str: 1 },
    Halfling: { dex: 2, cha: 1 },
    Orco: { str: 2, con: 1, int: -1 },
    Tiefling: { cha: 2, int: 1 },
    Draconico: { str: 2, cha: 1 }
};

const MANNERISMS = [
    "Schiocca sempre le dita",
    "Ha un tic all'occhio destro",
    "Parla molto lentamente",
    "Sussurra invece di parlare",
    "Resta a braccia conserte",
    "Gioca con una moneta",
    "Si liscia la barba/capelli"
];

const ROLE_ACTIONS: Record<NpcRole, { name: string; description: string }[]> = {
    Guardia: [{ name: "Lancia", description: "Attacco con arma da mischia o a distanza. 1d6 + MOD STR danni perforanti." }, { name: "Balestra Leggera", description: "Attacco a distanza (RD 24/96). 1d8 + MOD DEX danni perforanti." }],
    Bandito: [{ name: "Scimitarra", description: "Attacco con arma da mischia (Finesse). 1d6 + MOD STR/DEX danni taglienti." }, { name: "Pugnale", description: "Da mischia o lancio. 1d4 + MOD STR/DEX danni perforanti." }],
    Mago: [{ name: "Dardo Incantato", description: "Lancia 3 dardi magici (infallibili). 1d4+1 danni da forza ciascuno." }, { name: "Raggio di Gelo", description: "Attacco magico a distanza. 1d8 danni da freddo e riduce la velocità di 3m." }, { name: "Scudo", description: "Reazione: Ottiene +5 alla AC." }],
    Sacerdote: [{ name: "Mazza", description: "Attacco con arma da mischia. 1d6 + MOD STR danni contundenti." }, { name: "Fiamma Sacra", description: "TS Destrezza o subisce 1d8 danni radiosi." }, { name: "Cura Ferite", description: "Tocco: cura 1d8 + MOD WIS punti ferita." }],
    Assassino: [{ name: "Spada Corta", description: "Attacco da mischia. 1d6 + MOD DEX danni perforanti." }, { name: "Attacco Furtivo", description: "Danni bonus se ha Vantaggio o l'alleato è in mischia." }],
    Civile: [{ name: "Randello", description: "Attacco con arma da mischia. 1d4 danni contundenti." }],
    Nobile: [{ name: "Stocco", description: "Attacco con arma da mischia. 1d8 + MOD STR/DEX danni perforanti." }, { name: "Incitare", description: "Aggiunge 1d4 ai tiri dell'alleato entro 9m per 1 minuto." }]
};

const ROLE_EQUIPMENT: Record<NpcRole, string[]> = {
    Guardia: ["Cotta di Maglia", "Scudo", "Lancia", "Balestra Leggera", "Simbolo della Città", "1d4 monete d'argento"],
    Bandito: ["Armatura di Cuoio", "Scimitarra", "Pugnale", "Borsello di monete rubate (1d6 MA)"],
    Mago: ["Vesti da Studioso", "Bastone Ferrato", "Libro degli Incantesimi", "Borsa dei Componenti"],
    Sacerdote: ["Giacomaglio", "Mazza", "Simbolo Sacro", "Kit da Guaritore"],
    Assassino: ["Cuoio Borchiato", "Spada Corta", "Balestra a Mano", "Veleno Base", "Strumenti da Scasso"],
    Civile: ["Abiti Comuni", "Strumenti del mestiere", "Borsello povero"],
    Nobile: ["Abiti Preziosi", "Stocco", "Anello con Sigillo", "Borsa gonfia d'oro (4d6 MO)"]
};

// ---------------------------------------------------------
// Funzioni di Supporto
// ---------------------------------------------------------

function getRandomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

function calculateModifier(score: number): number {
    return Math.floor((score - 10) / 2);
}

// ---------------------------------------------------------
// Funzione Principale di Generazione
// ---------------------------------------------------------

export function generateNPC(race: NpcRace, role: NpcRole, powerLevel: NpcPowerLevel): GeneratedNPC {
    // 1. Array base e Modificatori
    const baseStats = { ...ROLE_BASE_STATS[role] };
    const raceMod = RACE_MODIFIERS[race];

    const stats: Stats = {
        str: baseStats.str + (raceMod.str || 0),
        dex: baseStats.dex + (raceMod.dex || 0),
        con: baseStats.con + (raceMod.con || 0),
        int: baseStats.int + (raceMod.int || 0),
        wis: baseStats.wis + (raceMod.wis || 0),
        cha: baseStats.cha + (raceMod.cha || 0),
    };

    // 2. Scala di Livello
    let level = 1;
    let hitDiceType = 8; // Default
    let baseAc = 10;

    switch (role) {
        case "Mago": hitDiceType = 6; baseAc = 10; break;
        case "Guardia": hitDiceType = 8; baseAc = 14; break; // Armor
        case "Bandito": hitDiceType = 8; baseAc = 12; break; // Leather
        case "Sacerdote": hitDiceType = 8; baseAc = 13; break; // Chain shirt
        case "Assassino": hitDiceType = 8; baseAc = 13; break; // Studded Leather
        case "Civile": hitDiceType = 6; baseAc = 10; break;
        case "Nobile": hitDiceType = 8; baseAc = 11; break; // Fine clothes
    }

    switch (powerLevel) {
        case "Basso": level = 1; break; // CR 1/8 to 1/2
        case "Medio": level = 4; break; // CR 2 to 3
        case "Alto": level = 8; break; // CR 5 to 7
        case "Boss": level = 12; break; // CR 9+
    }

    // Aggiungi bonus alle stats in base al livello (simulazione ASI)
    if (level >= 4) stats[getPrimaryStat(role)] += 2;
    if (level >= 8) stats[getPrimaryStat(role)] += 2;
    if (level >= 12) stats.con += 2; // Bosses get tougher

    // Cap at 20 max for generators
    for (const key in stats) {
        if (stats[key as keyof Stats] > 20) stats[key as keyof Stats] = 20;
    }

    // 3. Punti Ferita & Classe Armatura
    const conMod = calculateModifier(stats.con);
    const dexMod = calculateModifier(stats.dex);

    // Formula HP: Max primo dado + (Media Dado * (Livello-1)) + (Con Mod * Livello)
    const hp = hitDiceType + Math.floor((hitDiceType / 2 + 0.5) * (level - 1)) + (conMod * level);

    // AC: Base Armor + Dex (capped if heavy armor, ma qui simuliamo armature leggere/medie)
    const ac = baseAc + (role === "Guardia" ? Math.min(2, dexMod) : dexMod);

    // 4. Nome
    const firstName = getRandomItem(FIRST_NAMES[race]);
    const lastName = getRandomItem(LAST_NAMES[race]);
    const name = `${firstName} ${lastName}`;

    // 5. Tratti e Note
    const mannerism = getRandomItem(MANNERISMS);
    const traits = [
        { name: "Personalità", description: mannerism }
    ];

    let notes = `Personaggio di livello ${level} (Potere: ${powerLevel}). `;

    // 6. Azioni & Combattimento + Equip
    const baseActions = [...ROLE_ACTIONS[role]];
    if (powerLevel === "Alto" || powerLevel === "Boss") {
        baseActions.push({ name: "Multiattacco", description: "Il personaggio effettua due attacchi ad ogni round." });
    }
    const actions = baseActions;
    const equipment = [...ROLE_EQUIPMENT[role]];

    return {
        name,
        race,
        role,
        stats,
        hp: Math.max(1, hp), // HP non può essere < 1
        ac,
        traits,
        actions,
        equipment,
        notes
    };
}

function getPrimaryStat(role: NpcRole): keyof Stats {
    switch (role) {
        case "Guardia": return "str";
        case "Bandito": return "dex";
        case "Mago": return "int";
        case "Sacerdote": return "wis";
        case "Assassino": return "dex";
        case "Civile": return "con";
        case "Nobile": return "cha";
        default: return "str";
    }
}
