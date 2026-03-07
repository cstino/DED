"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import EquipmentManager, {
    calculateEquipmentBonuses,
    type EquipmentItem,
} from "@/components/character/EquipmentManager";
import SpellBrowser from "@/components/character/SpellBrowser";
import styles from "./character.module.css";

interface AbilityScores {
    str: number; dex: number; con: number; int: number; wis: number; cha: number;
}

interface ClassAbility {
    name: string;
    description: string;
    max_uses: number | null; // null = unlimited
    uses_remaining: number;
    recharge: string; // "Riposo Lungo", "Riposo Breve", or ""
}

interface Character {
    id: string;
    user_id: string;
    campaign_id: string;
    name: string;
    race: string;
    class: string;
    subclass: string | null;
    level: number;
    ability_scores: AbilityScores;
    hp_current: number;
    hp_max: number;
    hp_temp: number;
    ac: number;
    speed: number;
    initiative_bonus: number;
    hit_dice_total: number;
    hit_dice_current: number;
    death_saves: { successes: number; failures: number };
    money: { mp: number; mo: number; ma: number; mr: number; me: number };
    saving_throw_prof: string[];
    skill_proficiencies: string[];
    spell_slots: Record<string, number>;
    spell_slots_used: Record<string, number>;
    known_spells: string[];
    prepared_spells?: string[];
    proficiencies: string[];
    equipment: EquipmentItem[];
    features: string[];
    personality: { traits: string; ideals: string; bonds: string; flaws: string };
    background: string | null;
    alignment: string | null;
    notes: string | null;
    portrait_url: string | null;
    languages: string[];
    class_abilities: ClassAbility[];
    hit_die: number;
    proficiency_bonus: number;
    is_party_member: boolean;
}

const ABILITIES = [
    { key: "str", label: "Forza", short: "FOR" },
    { key: "dex", label: "Destrezza", short: "DES" },
    { key: "con", label: "Costituzione", short: "COS" },
    { key: "int", label: "Intelligenza", short: "INT" },
    { key: "wis", label: "Saggezza", short: "SAG" },
    { key: "cha", label: "Carisma", short: "CAR" },
] as const;

const SKILLS = [
    { name: "acrobatics", ability: "dex" as const, label: "Acrobazia" },
    { name: "animal_handling", ability: "wis" as const, label: "Addestrare Animali" },
    { name: "arcana", ability: "int" as const, label: "Arcano" },
    { name: "athletics", ability: "str" as const, label: "Atletica" },
    { name: "deception", ability: "cha" as const, label: "Inganno" },
    { name: "history", ability: "int" as const, label: "Storia" },
    { name: "insight", ability: "wis" as const, label: "Intuizione" },
    { name: "intimidation", ability: "cha" as const, label: "Intimidire" },
    { name: "investigation", ability: "int" as const, label: "Investigare" },
    { name: "medicine", ability: "wis" as const, label: "Medicina" },
    { name: "nature", ability: "int" as const, label: "Natura" },
    { name: "perception", ability: "wis" as const, label: "Percezione" },
    { name: "performance", ability: "cha" as const, label: "Intrattenere" },
    { name: "persuasion", ability: "cha" as const, label: "Persuasione" },
    { name: "religion", ability: "int" as const, label: "Religione" },
    { name: "sleight_of_hand", ability: "dex" as const, label: "Rapidità di Mano" },
    { name: "stealth", ability: "dex" as const, label: "Furtività" },
    { name: "survival", ability: "wis" as const, label: "Sopravvivenza" },
];

function getMod(score: number): number { return Math.floor((score - 10) / 2); }
function fmtMod(mod: number): string { return mod >= 0 ? `+${mod}` : `${mod}`; }
function profBonus(level: number): number { return Math.ceil(level / 4) + 1; }

const SCHOOL_IT: Record<string, string> = {
    // lowercase English keys
    abjuration: "Abiurazione", conjuration: "Evocazione", divination: "Divinazione",
    enchantment: "Ammaliamento", evocation: "Invocazione", illusion: "Illusione",
    necromancy: "Necromanzia", transmutation: "Trasmutazione", transformation: "Trasmutazione",
    // Capitalized English keys (just in case)
    Abjuration: "Abiurazione", Conjuration: "Evocazione", Divination: "Divinazione",
    Enchantment: "Ammaliamento", Evocation: "Invocazione", Illusion: "Illusione",
    Necromancy: "Necromanzia", Transmutation: "Trasmutazione", Transformation: "Trasmutazione",
};

function KnownSpellsList({ knownSpells, spellDetails, expandedSpell, setExpandedSpell, canEdit, onRemove, preparedSpells, onTogglePrepare, canPrepareSpells }: {
    knownSpells: string[];
    spellDetails: Record<string, any>;
    expandedSpell: string | null;
    setExpandedSpell: (s: string | null) => void;
    canEdit: boolean;
    onRemove: (name: string) => void;
    preparedSpells?: string[];
    onTogglePrepare?: (name: string) => void;
    canPrepareSpells?: boolean;
}) {
    // Group spells by level
    const grouped: Record<number, { name: string; detail?: any }[]> = {};
    for (const name of knownSpells) {
        const detail = spellDetails[name];
        const level = detail?.level ?? -1;
        if (!grouped[level]) grouped[level] = [];
        grouped[level].push({ name, detail });
    }
    // Sort levels: -1 (unknown) at end, then 0 (cantrips), 1, 2, ...
    const sortedLevels = Object.keys(grouped).map(Number).sort((a, b) => {
        if (a === -1) return 1;
        if (b === -1) return -1;
        return a - b;
    });

    const levelLabel = (lvl: number) => {
        if (lvl === -1) return "Altro";
        if (lvl === 0) return "Trucchetti";
        return `Livello ${lvl}`;
    };

    const levelColor: Record<number, string> = {
        [-1]: "#8a8a9a",
        0: "#00e5a0",
        1: "#4da6ff",
        2: "#a78bfa",
        3: "#f59e0b",
        4: "#ef4444",
        5: "#ec4899",
        6: "#06b6d4",
        7: "#f97316",
        8: "#8b5cf6",
        9: "#fbbf24",
    };

    return (
        <div className={styles.knownSpells}>
            <h3 className={styles.sectionTitle}>Incantesimi Conosciuti</h3>
            {sortedLevels.map((lvl) => {
                const color = levelColor[lvl] || "#8a8a9a";
                return (
                    <div key={lvl} className={styles.spellLevelGroup}>
                        <div className={styles.spellLevelHeader} style={{ borderBottomColor: `${color}30` }}>
                            <span className={styles.spellLevelLabel} style={{ color }}>{levelLabel(lvl)}</span>
                            <span className={styles.spellLevelCount}>{grouped[lvl].length}</span>
                        </div>
                        <div className={styles.spellLevelList}>
                            {grouped[lvl].sort((a, b) => a.name.localeCompare(b.name)).map(({ name, detail }) => {
                                const isExpanded = expandedSpell === name;
                                return (
                                    <div key={name} className={styles.knownSpellCard}>
                                        <div className={styles.knownSpellRow} onClick={() => setExpandedSpell(isExpanded ? null : name)}>
                                            <div className={styles.knownSpellInfo}>
                                                <div className={styles.spellNameRow}>
                                                    {canPrepareSpells && lvl > 0 && (
                                                        <button
                                                            type="button"
                                                            className={`${styles.prepareToggle} ${preparedSpells?.includes(name) ? styles.prepareToggleActive : ""}`}
                                                            disabled={!canEdit}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (canEdit && onTogglePrepare) onTogglePrepare(name);
                                                            }}
                                                            title={preparedSpells?.includes(name) ? "Incantesimo preparato" : "Prepara incantesimo"}
                                                        />
                                                    )}
                                                    <span className={styles.knownSpellName}>{detail?.name || name}</span>
                                                </div>
                                                <div className={styles.knownSpellMeta}>
                                                    {SCHOOL_IT[detail?.school] || (detail?.school ? detail.school : "Sconosciuta")}
                                                    {detail?.duration && ` • ${detail.duration}`}
                                                    {detail?.concentration && <span className={styles.concentrationBadge}>Conc</span>}
                                                    {detail?.ritual && <span className={styles.ritualBadge}>Rito</span>}
                                                </div>
                                            </div>
                                            <div className={styles.knownSpellActions}>
                                                {canEdit && (
                                                    <button type="button" className={styles.removeSpellBtn} onClick={(e) => {
                                                        e.stopPropagation();
                                                        onRemove(name);
                                                    }}>✕</button>
                                                )}
                                                <span className={styles.expandArrow}>{isExpanded ? "▾" : "▸"}</span>
                                            </div>
                                        </div>
                                        {isExpanded && detail && (
                                            <div className={styles.spellDetailCard}>
                                                <div className={styles.spellDetailGrid}>
                                                    <div className={styles.spellDetailItem}><span className={styles.spellDetailLabel}>Lancio</span><span>{detail.casting_time}</span></div>
                                                    <div className={styles.spellDetailItem}><span className={styles.spellDetailLabel}>Gittata</span><span>{detail.range}</span></div>
                                                    <div className={styles.spellDetailItem}><span className={styles.spellDetailLabel}>Componenti</span><span>{detail.components}</span></div>
                                                    <div className={styles.spellDetailItem}><span className={styles.spellDetailLabel}>Durata</span><span>{detail.duration}</span></div>
                                                </div>
                                                {detail.description && <p className={styles.spellDetailDesc}>{detail.description}</p>}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

const PREPARING_CLASSES = ["cleric", "druid", "wizard", "paladin", "artificer", "chierico", "druido", "mago", "paladino", "artefice"];

export default function CharacterSheetPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const campaignId = params.id as string;
    const charId = params.charId as string;

    const [char, setChar] = useState<Character | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [editData, setEditData] = useState<Partial<Character>>({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"stats" | "combat" | "equipment" | "spells" | "notes">("stats");
    const [showSpellBrowser, setShowSpellBrowser] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [spellDetails, setSpellDetails] = useState<Record<string, any>>({});
    const [expandedSpell, setExpandedSpell] = useState<string | null>(null);
    const [expandedAbility, setExpandedAbility] = useState<number | null>(null);
    const [noteToDelete, setNoteToDelete] = useState<number | null>(null);
    const [portraitFile, setPortraitFile] = useState<File | null>(null);
    const [portraitPreview, setPortraitPreview] = useState<string | null>(null);
    const [showPortraitFull, setShowPortraitFull] = useState(false);
    const [slowLoading, setSlowLoading] = useState(false);

    const [campaignMasterId, setCampaignMasterId] = useState<string | null>(null);

    // Prevent concurrent Supabase writes
    const saveLockRef = useRef(false);
    const quickSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingQuickSaveRef = useRef<Record<string, unknown>>({});

    const isOwner = char?.user_id === user?.id;
    const isMaster = user?.id === campaignMasterId;
    const canEdit = isOwner || isMaster;

    const fetchChar = useCallback(async (isMounted: boolean) => {
        try {
            if (isMounted) {
                setLoading(true);
                setSlowLoading(false);
            }
            const { data, error } = await supabase.from("characters").select("*").eq("id", charId).single();
            if (error) throw error;

            if (data && isMounted) {
                // Ensure new fields have defaults for older records
                const c = {
                    ...data,
                    hp_temp: data.hp_temp ?? 0,
                    speed: data.speed ?? 30,
                    hit_dice_total: data.hit_dice_total ?? data.level,
                    hit_dice_current: data.hit_dice_current ?? data.level,
                    death_saves: data.death_saves ?? { successes: 0, failures: 0 },
                    money: data.money ?? { mp: 0, mo: 0, ma: 0, mr: 0, me: 0 },
                    saving_throw_prof: data.saving_throw_prof ?? [],
                    skill_proficiencies: data.skill_proficiencies ?? [],
                    spell_slots_used: data.spell_slots_used ?? {},
                    known_spells: data.known_spells ?? [],
                    prepared_spells: Array.isArray(data.prepared_spells) ? data.prepared_spells : [],
                    personality: data.personality ?? { traits: "", ideals: "", bonds: "", flaws: "" },
                    equipment: Array.isArray(data.equipment) ? data.equipment : [],
                    features: Array.isArray(data.features) ? data.features : [],
                    proficiencies: Array.isArray(data.proficiencies) ? data.proficiencies : [],
                    languages: Array.isArray(data.languages) ? data.languages : [],
                    class_abilities: Array.isArray(data.class_abilities) ? data.class_abilities : [],
                    hit_die: data.hit_die ?? 8,
                    proficiency_bonus: data.proficiency_bonus ?? Math.ceil((data.level || 1) / 4) + 1,
                    is_party_member: !!data.is_party_member,
                } as Character;
                setChar(c);
                setEditData(c);

                // Also fetch campaign to get master_id
                const { data: campData } = await supabase.from("campaigns").select("master_id").eq("id", data.campaign_id).single();
                if (campData) setCampaignMasterId(campData.master_id);
            }
        } catch (err) {
            console.error("Error fetching character:", err);
        } finally {
            if (isMounted) setLoading(false);
        }
    }, [charId]);

    useEffect(() => { if (!authLoading && !user) router.push("/login"); }, [authLoading, user, router]);

    useEffect(() => {
        if (!user || !charId) return;

        let isMounted = true;
        const timeout = setTimeout(() => {
            if (isMounted && loading) setSlowLoading(true);
        }, 5000);

        fetchChar(isMounted).finally(() => {
            if (isMounted) clearTimeout(timeout);
        });

        return () => { isMounted = false; clearTimeout(timeout); };
    }, [user, charId, fetchChar]);

    // Beforeunload to prevent data loss
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (Object.keys(pendingQuickSaveRef.current).length > 0 || saving) {
                e.preventDefault();
                e.returnValue = "Ci sono salvataggi in corso. Sei sicuro di voler uscire?";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [saving]);

    // Fetch spell details for known spells
    useEffect(() => {
        if (!char?.known_spells?.length) return;
        async function fetchSpellDetails() {
            const names = char!.known_spells;
            const { data } = await supabase
                .from("spells")
                .select("*")
                .in("name", names)
                .limit(500);
            if (data) {
                const map: Record<string, any> = {};
                data.forEach((s: any) => { map[s.name] = s; });
                setSpellDetails(map);
            }
        }
        fetchSpellDetails();
    }, [char?.known_spells]);

    async function saveChanges() {
        if (!char || !canEdit) return;
        if (saveLockRef.current) return; // Already saving, don't stack

        // Cancel any pending quickSave — saveChanges will include all data
        if (quickSaveTimerRef.current) {
            clearTimeout(quickSaveTimerRef.current);
            quickSaveTimerRef.current = null;
            pendingQuickSaveRef.current = {};
        }

        saveLockRef.current = true;
        setSaving(true);
        setSaveError(null);

        // Helper: wrap a promise with a timeout
        function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
            return Promise.race([
                promise,
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error("TIMEOUT")), ms)
                ),
            ]);
        }

        try {
            const d = editData;

            // Upload portrait if changed
            let newPortraitUrl = char.portrait_url;
            if (portraitFile) {
                const ext = portraitFile.name.split(".").pop();
                const ts = Date.now();
                const path = `portraits/${user!.id}/${ts}.${ext}`;
                try {
                    const { error: uploadError } = await withTimeout(
                        Promise.resolve(supabase.storage.from("character-portraits").upload(path, portraitFile)),
                        10000
                    );
                    if (!uploadError) {
                        const { data: urlData } = supabase.storage
                            .from("character-portraits")
                            .getPublicUrl(path);
                        newPortraitUrl = urlData.publicUrl;
                    } else {
                        console.error("Portrait upload error:", uploadError);
                    }
                } catch (uploadErr) {
                    console.error("Portrait upload timed out or failed:", uploadErr);
                    // Continue saving without the new portrait
                }
            }

            const { data: updatedChar, error } = await withTimeout(
                Promise.resolve(supabase.from("characters").update({
                    name: d.name,
                    level: d.level,
                    hp_current: d.hp_current,
                    hp_max: d.hp_max,
                    hp_temp: d.hp_temp,
                    ac: d.ac,
                    speed: d.speed,
                    ability_scores: d.ability_scores,
                    initiative_bonus: getMod(d.ability_scores?.dex ?? 10),
                    hit_dice_current: d.hit_dice_current,
                    hit_dice_total: d.hit_dice_total,
                    death_saves: d.death_saves,
                    money: d.money,
                    saving_throw_prof: d.saving_throw_prof,
                    skill_proficiencies: d.skill_proficiencies,
                    notes: d.notes,
                    alignment: d.alignment,
                    background: d.background,
                    proficiencies: d.proficiencies,
                    equipment: d.equipment,
                    features: d.features,
                    personality: d.personality,
                    known_spells: d.known_spells,
                    spell_slots: d.spell_slots,
                    spell_slots_used: d.spell_slots_used,
                    languages: d.languages,
                    class_abilities: d.class_abilities,
                    portrait_url: newPortraitUrl,
                }).eq("id", char.id).select().single()),
                10000
            );

            if (error) {
                console.error("Error saving character:", error);
                setSaveError("Errore dal server: " + error.message);
                return;
            }

            if (updatedChar) {
                const c = {
                    ...updatedChar,
                    hp_temp: updatedChar.hp_temp ?? 0,
                    speed: updatedChar.speed ?? 30,
                    hit_dice_total: updatedChar.hit_dice_total ?? updatedChar.level,
                    hit_dice_current: updatedChar.hit_dice_current ?? updatedChar.level,
                    death_saves: updatedChar.death_saves ?? { successes: 0, failures: 0 },
                    money: updatedChar.money ?? { mp: 0, mo: 0, ma: 0, mr: 0, me: 0 },
                    saving_throw_prof: updatedChar.saving_throw_prof ?? [],
                    skill_proficiencies: updatedChar.skill_proficiencies ?? [],
                    spell_slots_used: updatedChar.spell_slots_used ?? {},
                    known_spells: updatedChar.known_spells ?? [],
                    prepared_spells: Array.isArray(updatedChar.prepared_spells) ? updatedChar.prepared_spells : [],
                    personality: updatedChar.personality ?? { traits: "", ideals: "", bonds: "", flaws: "" },
                    equipment: Array.isArray(updatedChar.equipment) ? updatedChar.equipment : [],
                    features: Array.isArray(updatedChar.features) ? updatedChar.features : [],
                    proficiencies: Array.isArray(updatedChar.proficiencies) ? updatedChar.proficiencies : [],
                    languages: Array.isArray(updatedChar.languages) ? updatedChar.languages : [],
                    class_abilities: Array.isArray(updatedChar.class_abilities) ? updatedChar.class_abilities : [],
                    hit_die: updatedChar.hit_die ?? 8,
                    proficiency_bonus: updatedChar.proficiency_bonus ?? Math.ceil((updatedChar.level || 1) / 4) + 1,
                } as Character;
                setChar(c);
                setEditData(c);
                setPortraitFile(null);
                setPortraitPreview(null);
                setSaveError(null);
                setEditing(false);
            }
        } catch (err: any) {
            console.error("Unexpected error during save:", err);
            if (err?.message === "TIMEOUT") {
                setSaveError("Connessione lenta o assente. Le modifiche NON sono state perse, riprova.");
            } else {
                setSaveError("Errore inaspettato: " + (err?.message ?? "sconosciuto"));
            }
        } finally {
            saveLockRef.current = false;
            setSaving(false);
        }
    }

    // Quick save fields without entering edit mode
    // Debounced and batched to prevent data loss and concurrent writes
    async function quickSave(field: string, value: unknown) {
        if (!char || !canEdit) return;

        // Don't try to save proficiency_bonus if it's not in DB
        if (field === "proficiency_bonus") {
            setChar((prev) => prev ? { ...prev, [field]: value as any } as Character : null);
            setEditData((prev) => ({ ...prev, [field]: value as any }));
            return;
        }

        // Immediately update local state for responsiveness
        setChar((prev) => prev ? { ...prev, [field]: value as any } as Character : null);
        setEditData((prev) => ({ ...prev, [field]: value as any }));

        // Accumulate pending changes in a record
        pendingQuickSaveRef.current[field] = value;

        // Start showing "Saving..." immediately for feedback
        setSaving(true);
        setSaveError(null);

        if (quickSaveTimerRef.current) clearTimeout(quickSaveTimerRef.current);

        quickSaveTimerRef.current = setTimeout(async () => {
            const changes = { ...pendingQuickSaveRef.current };
            if (Object.keys(changes).length === 0) {
                setSaving(false);
                return;
            }

            // Clear the ref BEFORE starting the request so new changes can be added
            pendingQuickSaveRef.current = {};
            quickSaveTimerRef.current = null;

            // Wait for any in-flight full save or other quick save to finish
            // (Simple serial queue using saveLockRef)
            let retries = 0;
            while (saveLockRef.current && retries < 10) {
                await new Promise(r => setTimeout(r, 500));
                retries++;
            }

            saveLockRef.current = true;

            try {
                const { error } = await supabase.from("characters").update(changes).eq("id", char.id);
                if (error) {
                    console.error("quickSave error:", error);
                    setSaveError("Errore salvataggio automatico. Riprova.");
                    // In case of error, put changes back (if they weren't updated again)
                    // This is a simplified approach; in production we might want a more robust queue
                }
            } catch (err) {
                console.error("quickSave failed:", err);
                setSaveError("Errore salvataggio automatico (network).");
            } finally {
                saveLockRef.current = false;
                // Only turn off saving if no new changes arrived in the meantime
                if (Object.keys(pendingQuickSaveRef.current).length === 0) {
                    setSaving(false);
                }
            }
        }, 500); // 500ms debounce for stability
    }

    async function deleteCharacter() {
        if (!char || !canEdit) return;
        if (!confirm(`Sei sicuro di voler eliminare definitivamente questo personaggio?`)) return;
        setDeleting(true);
        try {
            const { error } = await supabase.from("characters").delete().eq("id", char.id);
            if (!error) {
                router.push(`/campaign/${campaignId}`);
            } else {
                throw error;
            }
        } catch (err: any) {
            console.error("Error deleting character", err);
            alert("Errore durante l'eliminazione: " + err.message);
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    }

    function upd<K extends keyof Character>(key: K, value: Character[K]) {
        setEditData((p) => ({ ...p, [key]: value }));
    }

    function updAbility(key: string, value: number) {
        const s = { ...(editData.ability_scores as AbilityScores) };
        s[key as keyof AbilityScores] = Math.max(1, Math.min(30, value));
        upd("ability_scores", s);
    }

    if (authLoading || !user || loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner} />
                {slowLoading && (
                    <div className={styles.slowLoadingHint}>
                        <p>Il caricamento sta impiegando più del previsto.</p>
                        <button className="btn btn-secondary btn-sm" onClick={() => window.location.reload()}>
                            🔄 Riprova Caricamento
                        </button>
                    </div>
                )}
            </div>
        );
    }
    if (!char) {
        return (
            <div className={styles.loadingContainer}>
                <p className="text-secondary">Personaggio non trovato</p>
                <button className="btn btn-secondary" onClick={() => router.push(`/campaign/${campaignId}`)}>
                    Torna alla campagna
                </button>
            </div>
        );
    }

    const pb = editing ? (editData.proficiency_bonus ?? 2) : (char.proficiency_bonus ?? 2);
    const abs = (editing ? editData.ability_scores : char.ability_scores) as AbilityScores;
    const equip = (editing ? editData.equipment : char.equipment) as EquipmentItem[];
    const equipBonuses = calculateEquipmentBonuses(equip);
    const saveProfs = (editing ? editData.saving_throw_prof : char.saving_throw_prof) as string[];
    const skillProfs = (editing ? editData.skill_proficiencies : char.skill_proficiencies) as string[];

    // Effective values with equipment bonuses
    const effectiveAc = (editing ? editData.ac ?? char.ac : char.ac) + (equipBonuses["ac"] ?? 0);
    const effectiveSpeed = (editing ? editData.speed ?? char.speed : char.speed) + (equipBonuses["speed"] ?? 0);
    const hpPercent = Math.max(0, Math.min(100, (char.hp_current / char.hp_max) * 100));

    return (
        <div className="page">
            {/* Top Bar */}
            <div className={styles.topBar}>
                <button className={styles.backBtn} onClick={() => router.push(`/campaign/${campaignId}`)}>
                    ← Campagna
                </button>
                {canEdit && (
                    <div className={styles.topActions}>
                        {editing ? (
                            <>
                                <button className="btn btn-secondary" onClick={() => { setEditing(false); setEditData(char); setSaveError(null); }}>Annulla</button>
                                <button className="btn btn-primary" onClick={saveChanges} disabled={saving}>
                                    {saving ? "Salvo..." : "💾 Salva"}
                                </button>
                            </>
                        ) : (
                            <button
                                className={styles.settingsBtn}
                                onClick={() => setShowSettingsMenu(true)}
                            >
                                <span className={styles.settingsIcon}>⚙</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Side Panel (via Portal) */}
            {showSettingsMenu && typeof window !== 'undefined' && createPortal(
                <div className={styles.sidePanel}>
                    <div className={styles.sidePanelBackdrop} onClick={() => setShowSettingsMenu(false)} />
                    <div className={styles.sidePanelContent}>
                        <div className={styles.sidePanelHeader}>
                            <span className={styles.sidePanelTitle}>Opzioni</span>
                            <button className={styles.sidePanelClose} onClick={() => setShowSettingsMenu(false)}>✕</button>
                        </div>
                        <nav className={styles.sidePanelNav}>
                            <button className={styles.sidePanelItem} style={{ animationDelay: '0.05s' }} onClick={() => { setShowSettingsMenu(false); setEditing(true); }}>
                                <span className={styles.sidePanelItemIcon}>✏️</span>
                                <span>Modifica Personaggio</span>
                            </button>
                            {isMaster && (
                                <button
                                    className={styles.sidePanelItem}
                                    style={{ animationDelay: '0.08s', color: char.is_party_member ? 'var(--accent-teal)' : 'var(--text-secondary)' }}
                                    onClick={() => {
                                        const newValue = !char.is_party_member;
                                        setChar(p => p ? { ...p, is_party_member: newValue } as Character : null);
                                        quickSave("is_party_member", newValue);
                                    }}
                                >
                                    <span className={styles.sidePanelItemIcon}>{char.is_party_member ? '🛡️' : '👤'}</span>
                                    <span>{char.is_party_member ? 'Rimuovi dal Party' : 'Aggiungi al Party'}</span>
                                </button>
                            )}
                            {isOwner && (
                                <button className={`${styles.sidePanelItem} ${styles.sidePanelItemDanger}`} style={{ animationDelay: '0.12s' }} onClick={() => { setShowSettingsMenu(false); setShowDeleteConfirm(true); }}>
                                    <span className={styles.sidePanelItemIcon}>🗑️</span>
                                    <span>Elimina Personaggio</span>
                                </button>
                            )}
                        </nav>
                    </div>
                </div>,
                document.body
            )}

            {/* Save Error Banner */}
            {saveError && (
                <div className={styles.saveErrorBanner}>
                    <span>⚠️ {saveError}</span>
                    <button className="btn btn-primary" onClick={saveChanges} disabled={saving} style={{ marginLeft: 12, padding: '4px 12px', fontSize: '0.85rem' }}>
                        {saving ? "Riprovo..." : "🔄 Riprova"}
                    </button>
                    <button className={styles.saveErrorClose} onClick={() => setSaveError(null)}>✕</button>
                </div>
            )}

            {/* Character Header */}
            <div className={styles.charHeader}>
                <div className={styles.portraitWrap}>
                    {editing ? (
                        <label className={styles.portraitEditLabel}>
                            {portraitPreview ? (
                                <Image src={portraitPreview} alt="Preview" width={100} height={100} className={styles.portrait} />
                            ) : char.portrait_url ? (
                                <Image src={char.portrait_url} alt={char.name} width={100} height={100} className={styles.portrait} />
                            ) : (
                                <div className={styles.portraitFallback}>{char.name.charAt(0).toUpperCase()}</div>
                            )}
                            <div className={styles.portraitEditOverlay}>📷</div>
                            <input type="file" accept="image/*" className={styles.portraitFileInput} onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    setPortraitFile(file);
                                    setPortraitPreview(URL.createObjectURL(file));
                                }
                            }} />
                        </label>
                    ) : char.portrait_url ? (
                        <div onClick={() => setShowPortraitFull(true)} style={{ cursor: 'pointer' }}>
                            <Image src={char.portrait_url} alt={char.name} width={100} height={100} className={styles.portrait} />
                        </div>
                    ) : (
                        <div className={styles.portraitFallback}>{char.name.charAt(0).toUpperCase()}</div>
                    )}
                </div>
                <div className={styles.charInfo}>
                    <div className={styles.nameRow}>
                        {editing ? (
                            <input type="text" className={`input ${styles.nameInput}`} value={editData.name ?? ""} onChange={(e) => upd("name", e.target.value)} />
                        ) : (
                            <h1 className={styles.charName}>{char.name}</h1>
                        )}
                        <div className={`${styles.savingIndicator} ${saving ? styles.savingIndicatorActive : ""}`}>
                            <span className={styles.savingDot} />
                            <span>Salvataggio...</span>
                        </div>
                    </div>
                    <p className={styles.charMeta}>{char.race} • {char.class}{char.subclass && ` — ${char.subclass}`}</p>
                    <div className={styles.charTags}>
                        <div className={styles.levelWrapper}>
                            <span className={styles.levelTag}>Lv. {editing ? (editData.level ?? char.level) : char.level}</span>
                            {editing && (
                                <div className={styles.levelControlsHeader}>
                                    <button
                                        className={`${styles.levelBtn} ${styles.levelDown}`}
                                        onClick={() => {
                                            const currentLevel = editData.level ?? char?.level ?? 1;
                                            const newLevel = Math.max(1, currentLevel - 1);
                                            const newPB = Math.ceil(newLevel / 4) + 1;
                                            upd("level", newLevel);
                                            upd("proficiency_bonus", newPB);
                                            // Optional: also update hit dice total if it was equal to level
                                            if (editData.hit_dice_total === currentLevel) {
                                                upd("hit_dice_total", newLevel);
                                                if (editData.hit_dice_current === currentLevel) {
                                                    upd("hit_dice_current", newLevel);
                                                }
                                            }
                                        }}
                                        disabled={(editData.level ?? char?.level ?? 1) <= 1}
                                        title="Level Down"
                                    >
                                        -
                                    </button>
                                    <button
                                        className={`${styles.levelBtn} ${styles.levelUp}`}
                                        onClick={() => {
                                            const currentLevel = editData.level ?? char?.level ?? 1;
                                            const newLevel = Math.min(20, currentLevel + 1);
                                            const newPB = Math.ceil(newLevel / 4) + 1;
                                            upd("level", newLevel);
                                            upd("proficiency_bonus", newPB);
                                            // Optional: also update hit dice total
                                            if (editData.hit_dice_total === currentLevel) {
                                                upd("hit_dice_total", newLevel);
                                                if (editData.hit_dice_current === currentLevel) {
                                                    upd("hit_dice_current", newLevel);
                                                }
                                            }
                                        }}
                                        disabled={(editData.level ?? char?.level ?? 1) >= 20}
                                        title="Level Up"
                                    >
                                        +
                                    </button>
                                </div>
                            )}
                        </div>
                        {char.alignment && <span className={styles.alignTag}>{char.alignment}</span>}
                        {char.background && <span className={styles.bgTag}>{char.background}</span>}
                    </div>
                </div>
            </div>

            {/* Combat Bar */}
            <div className={styles.combatBar}>
                <div className={styles.hpBox}>
                    <div className={styles.hpHeader}>
                        <span className={styles.statLabel}>HP</span>
                        {editing ? (
                            <div className={styles.hpEditRow}>
                                <input type="number" className={styles.smallInput} value={editData.hp_current ?? 0} onChange={(e) => upd("hp_current", Math.max(0, parseInt(e.target.value) || 0))} />
                                <span>/</span>
                                <input type="number" className={styles.smallInput} value={editData.hp_max ?? 1} onChange={(e) => upd("hp_max", Math.max(1, parseInt(e.target.value) || 1))} />
                            </div>
                        ) : canEdit ? (
                            <div className={styles.hpEditRow}>
                                <input type="number" className={styles.smallInput} value={char.hp_current} onChange={(e) => setChar((p) => p ? { ...p, hp_current: Math.max(0, parseInt(e.target.value) || 0) } as Character : null)} onBlur={(e) => quickSave("hp_current", Math.max(0, parseInt(e.target.value) || 0))} />
                                <span>/ {char.hp_max}</span>
                            </div>
                        ) : (
                            <span className={styles.hpValue}>{char.hp_current}/{char.hp_max}</span>
                        )}
                    </div>
                    <div className="hp-bar-container" style={{ height: 8 }}>
                        <div className="hp-bar" style={{ width: `${hpPercent}%`, background: hpPercent > 50 ? "var(--hp-green)" : hpPercent > 25 ? "var(--hp-yellow)" : "var(--hp-red)" }} />
                    </div>
                    {(char.hp_temp > 0 || canEdit) && (
                        <div className={styles.hpTemp}>
                            <span>HP Temp:</span>
                            {(editing || canEdit) ? (
                                <input type="number" className={styles.tinyInput} value={editing ? (editData.hp_temp ?? 0) : char.hp_temp} onChange={(e) => { const v = Math.max(0, parseInt(e.target.value) || 0); if (editing) upd("hp_temp", v); else setChar((p) => p ? { ...p, hp_temp: v } as Character : null); }} onBlur={(e) => { if (!editing) quickSave("hp_temp", Math.max(0, parseInt(e.target.value) || 0)); }} />
                            ) : (
                                <span className={styles.tempValue}>{char.hp_temp}</span>
                            )}
                        </div>
                    )}
                </div>
                <div className={styles.statBox}><span className={styles.statLabel}>AC</span><span className={styles.statValue}>{effectiveAc}{equipBonuses["ac"] ? <small className={styles.bonusNote}>({fmtMod(equipBonuses["ac"])})</small> : null}</span></div>
                <div className={styles.statBox}><span className={styles.statLabel}>VEL</span><span className={styles.statValue}>{effectiveSpeed}</span></div>
                <div className={styles.statBox}><span className={styles.statLabel}>INIT</span><span className={styles.statValue}>{fmtMod(getMod(abs.dex))}</span></div>
                <div className={styles.statBox}>
                    <span className={styles.statLabel}>BC</span>
                    <span className={styles.statValue}>+{pb}</span>
                </div>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
                {([
                    { id: "stats", label: "Statistiche" },
                    { id: "combat", label: "Combattimento" },
                    { id: "equipment", label: "Zaino" },
                    { id: "spells", label: "Magia" },
                    { id: "notes", label: "Note" },
                ] as const).map((tab) => (
                    <button key={tab.id} className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`} onClick={() => setActiveTab(tab.id)}>
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className={styles.tabContent}>
                {/* ====== STATS TAB ====== */}
                {activeTab === "stats" && (
                    <>
                        {/* Ability Scores */}
                        <h3 className={styles.sectionTitle}>Caratteristiche</h3>
                        <div className={styles.abilitiesGrid}>
                            {ABILITIES.map(({ key, label, short }) => {
                                const score = abs[key as keyof AbilityScores] + (equipBonuses[key] ?? 0);
                                const mod = getMod(score);
                                return (
                                    <div key={key} className={styles.abilityCard}>
                                        <span className={styles.abilityLabel}>{short}</span>
                                        {editing ? (
                                            <input type="number" className={styles.abilityInput} value={abs[key as keyof AbilityScores]} onChange={(e) => updAbility(key, parseInt(e.target.value) || 10)} />
                                        ) : (
                                            <span className={styles.abilityScore}>{score}</span>
                                        )}
                                        <span className={styles.abilityMod}>{fmtMod(mod)}</span>
                                        <span className={styles.abilityName}>{label}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Saving Throws */}
                        <h3 className={styles.sectionTitle}>Tiri Salvezza</h3>
                        <div className={styles.savesList}>
                            {ABILITIES.map(({ key, label, short }) => {
                                const baseScore = abs[key as keyof AbilityScores] + (equipBonuses[key] ?? 0);
                                const mod = getMod(baseScore);
                                const isProf = saveProfs.includes(key);
                                const saveBonus = equipBonuses[`save_${key}`] ?? 0;
                                const total = mod + (isProf ? pb : 0) + saveBonus;
                                return (
                                    <div key={key} className={`${styles.saveRow} ${isProf ? styles.saveProf : ""}`}>
                                        {editing ? (
                                            <input
                                                type="checkbox"
                                                checked={isProf}
                                                onChange={() => {
                                                    const p = [...saveProfs];
                                                    if (isProf) upd("saving_throw_prof", p.filter((s) => s !== key));
                                                    else upd("saving_throw_prof", [...p, key]);
                                                }}
                                            />
                                        ) : (
                                            <span className={`${styles.profDot} ${isProf ? styles.profDotActive : ""}`} />
                                        )}
                                        <span className={styles.saveMod}>{fmtMod(total)}</span>
                                        <span className={styles.saveName}>{short} — {label}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Skills */}
                        <h3 className={styles.sectionTitle}>Abilità</h3>
                        <div className={styles.skillsList}>
                            {SKILLS.map((skill) => {
                                const baseScore = abs[skill.ability] + (equipBonuses[skill.ability] ?? 0);
                                const mod = getMod(baseScore);
                                const isProf = skillProfs.includes(skill.name);
                                const total = mod + (isProf ? pb : 0);
                                return (
                                    <div key={skill.name} className={`${styles.skillRow} ${isProf ? styles.skillProf : ""}`}>
                                        {editing ? (
                                            <input
                                                type="checkbox"
                                                checked={isProf}
                                                onChange={() => {
                                                    const p = [...skillProfs];
                                                    if (isProf) upd("skill_proficiencies", p.filter((s) => s !== skill.name));
                                                    else upd("skill_proficiencies", [...p, skill.name]);
                                                }}
                                            />
                                        ) : (
                                            <span className={`${styles.profDot} ${isProf ? styles.profDotActive : ""}`} />
                                        )}
                                        <span className={styles.skillMod}>{fmtMod(total)}</span>
                                        <span className={styles.skillName}>{skill.label}</span>
                                        <span className={styles.skillAbility}>({skill.ability.toUpperCase()})</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Languages Section */}
                        <div className={styles.statsGroup}>
                            <h3 className={styles.sectionTitle}>Linguaggi</h3>
                            <div className={styles.languagesVerticalList}>
                                {editing ? (
                                    <>
                                        {(editData.languages || []).map((lang, i) => (
                                            <div key={i} className={styles.languageRowEdit}>
                                                <input
                                                    type="text"
                                                    className={`input ${styles.languageInput}`}
                                                    value={lang}
                                                    onChange={(e) => {
                                                        const arr = [...(editData.languages || [])];
                                                        arr[i] = e.target.value;
                                                        upd("languages", arr);
                                                    }}
                                                    placeholder="Inserisci lingua..."
                                                />
                                                <button type="button" className={styles.removeLangSqBtn} onClick={() => {
                                                    const arr = (editData.languages || []).filter((_, j) => i !== j);
                                                    upd("languages", arr);
                                                }}>✕</button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            className={styles.addAbilityBtn}
                                            style={{ marginTop: '8px' }}
                                            onClick={() => {
                                                upd("languages", [...(editData.languages || []), ""]);
                                            }}
                                        >
                                            + Aggiungi Linguaggio
                                        </button>
                                    </>
                                ) : (
                                    char.languages?.length > 0 ? (
                                        char.languages.map((lang, i) => (
                                            <div key={i} className={styles.languageRowView}>
                                                <span className={styles.languageDot}>•</span>
                                                <span className={styles.languageText}>{lang || <span className="text-muted">...</span>}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className={styles.notesEmpty}>Nessun linguaggio specificato.</p>
                                    )
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* ====== COMBAT TAB ====== */}
                {activeTab === "combat" && (
                    <div className={styles.combatSection}>
                        {/* Class Abilities */}
                        <div className={styles.combatGroup}>
                            <h3 className={styles.sectionTitle}>Abilità di Classe</h3>
                            <div className={styles.abilitiesList}>
                                {editing ? (
                                    <>
                                        {(editData.class_abilities || []).map((ability, i) => (
                                            <div key={i} className={styles.classAbilityEditCard}>
                                                <div className={styles.classAbilityEditHeader}>
                                                    <input
                                                        type="text"
                                                        className={`input ${styles.classAbilityNameInput}`}
                                                        value={ability.name}
                                                        onChange={(e) => {
                                                            const arr = [...(editData.class_abilities || [])];
                                                            arr[i] = { ...arr[i], name: e.target.value };
                                                            upd("class_abilities", arr);
                                                        }}
                                                        placeholder="Nome Abilità"
                                                    />
                                                    <button type="button" className={styles.removeClassAbilityBtn} onClick={() => {
                                                        const arr = (editData.class_abilities || []).filter((_, j) => i !== j);
                                                        upd("class_abilities", arr);
                                                    }}>✕</button>
                                                </div>
                                                <textarea
                                                    className={`input ${styles.classAbilityDescInput}`}
                                                    value={ability.description}
                                                    onChange={(e) => {
                                                        const arr = [...(editData.class_abilities || [])];
                                                        arr[i] = { ...arr[i], description: e.target.value };
                                                        upd("class_abilities", arr);
                                                    }}
                                                    placeholder="Descrizione..."
                                                    rows={2}
                                                />
                                                <div className={styles.classAbilityUsesRow}>
                                                    <label className={styles.classAbilityUsesLabel}>
                                                        Usi max:
                                                        <input
                                                            type="number"
                                                            className={`input ${styles.tinyInput}`}
                                                            value={ability.max_uses ?? ""}
                                                            placeholder="∞"
                                                            onChange={(e) => {
                                                                const val = e.target.value ? parseInt(e.target.value) : null;
                                                                const arr = [...(editData.class_abilities || [])];
                                                                arr[i] = { ...arr[i], max_uses: val, uses_remaining: val ?? 0 };
                                                                upd("class_abilities", arr);
                                                            }}
                                                        />
                                                    </label>
                                                    <label className={styles.classAbilityUsesLabel}>
                                                        Ricarica:
                                                        <select
                                                            className={`input ${styles.smallInput}`}
                                                            value={ability.recharge}
                                                            onChange={(e) => {
                                                                const arr = [...(editData.class_abilities || [])];
                                                                arr[i] = { ...arr[i], recharge: e.target.value };
                                                                upd("class_abilities", arr);
                                                            }}
                                                        >
                                                            <option value="">Nessuna</option>
                                                            <option value="Riposo Breve">Rip. Breve</option>
                                                            <option value="Riposo Lungo">Rip. Lungo</option>
                                                        </select>
                                                    </label>
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            className={styles.addClassAbilityBtn}
                                            onClick={() => {
                                                const newAb: ClassAbility = { name: "", description: "", max_uses: null, uses_remaining: 0, recharge: "" };
                                                upd("class_abilities", [...(editData.class_abilities || []), newAb]);
                                            }}
                                        >
                                            + Aggiungi Abilità
                                        </button>
                                    </>
                                ) : (
                                    (char.class_abilities || []).length > 0 ? (
                                        (char.class_abilities || []).map((ability, i) => {
                                            const isExpanded = expandedAbility === i;
                                            return (
                                                <div key={i} className={styles.classAbilityCard}>
                                                    <div className={styles.classAbilityRow} onClick={() => setExpandedAbility(isExpanded ? null : i)}>
                                                        <div className={styles.classAbilityInfo}>
                                                            <span className={styles.classAbilityName}>{ability.name}</span>
                                                            {ability.recharge && <span className={styles.classAbilityMeta}>↻ {ability.recharge}</span>}
                                                        </div>
                                                        <div className={styles.classAbilityActions}>
                                                            {ability.max_uses !== null && ability.max_uses > 0 && (
                                                                <div className={styles.classAbilityDotsWrapper} onClick={(e) => e.stopPropagation()}>
                                                                    {Array.from({ length: ability.max_uses }).map((_, dotIdx) => (
                                                                        <button
                                                                            key={dotIdx}
                                                                            type="button"
                                                                            className={`${styles.classAbilityDot} ${dotIdx < ability.uses_remaining ? styles.classAbilityDotActive : ""}`}
                                                                            disabled={!canEdit}
                                                                            onClick={() => {
                                                                                if (!canEdit) return;
                                                                                const newUses = dotIdx < ability.uses_remaining && dotIdx === ability.uses_remaining - 1
                                                                                    ? dotIdx // Toggle off last active
                                                                                    : dotIdx + 1; // Toggle on up to here

                                                                                const arr = [...char.class_abilities];
                                                                                arr[i] = { ...arr[i], uses_remaining: newUses };
                                                                                setChar(p => p ? { ...p, class_abilities: arr } as Character : null);
                                                                                quickSave("class_abilities", arr);
                                                                            }}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <span className={styles.expandArrow}>{isExpanded ? "▾" : "▸"}</span>
                                                        </div>
                                                    </div>
                                                    {isExpanded && canEdit && (
                                                        <div className={styles.abilityEditForm}>
                                                            <input
                                                                type="text"
                                                                className={`input ${styles.abilityNameInput}`}
                                                                value={ability.name}
                                                                onChange={(e) => {
                                                                    const arr = [...char.class_abilities];
                                                                    arr[i] = { ...arr[i], name: e.target.value };
                                                                    setChar(p => p ? { ...p, class_abilities: arr } as Character : null);
                                                                    quickSave("class_abilities", arr);
                                                                }}
                                                                placeholder="Nome abilità..."
                                                            />
                                                            <textarea
                                                                className={`input ${styles.classAbilityDescInput}`}
                                                                value={ability.description}
                                                                onChange={(e) => {
                                                                    const arr = [...char.class_abilities];
                                                                    arr[i] = { ...arr[i], description: e.target.value };
                                                                    setChar(p => p ? { ...p, class_abilities: arr } as Character : null);
                                                                    quickSave("class_abilities", arr);
                                                                }}
                                                                placeholder="Descrizione..."
                                                                rows={2}
                                                            />
                                                            <div className={styles.classAbilityUsesRow}>
                                                                <label className={styles.classAbilityUsesLabel}>
                                                                    Usi max:
                                                                    <input
                                                                        type="number"
                                                                        className={`input ${styles.tinyInput}`}
                                                                        value={ability.max_uses ?? ""}
                                                                        placeholder="∞"
                                                                        onChange={(e) => {
                                                                            const val = e.target.value ? parseInt(e.target.value) : null;
                                                                            const arr = [...char.class_abilities];
                                                                            arr[i] = { ...arr[i], max_uses: val, uses_remaining: val ?? 0 };
                                                                            setChar(p => p ? { ...p, class_abilities: arr } as Character : null);
                                                                            quickSave("class_abilities", arr);
                                                                        }}
                                                                    />
                                                                </label>
                                                                <label className={styles.classAbilityUsesLabel}>
                                                                    Ricarica:
                                                                    <select
                                                                        className={`input ${styles.smallInput}`}
                                                                        value={ability.recharge}
                                                                        onChange={(e) => {
                                                                            const arr = [...char.class_abilities];
                                                                            arr[i] = { ...arr[i], recharge: e.target.value };
                                                                            setChar(p => p ? { ...p, class_abilities: arr } as Character : null);
                                                                            quickSave("class_abilities", arr);
                                                                        }}
                                                                    >
                                                                        <option value="">Nessuna</option>
                                                                        <option value="Riposo Breve">Rip. Breve</option>
                                                                        <option value="Riposo Lungo">Rip. Lungo</option>
                                                                    </select>
                                                                </label>
                                                                <button
                                                                    type="button"
                                                                    className={styles.deleteAbilityBtn}
                                                                    onClick={() => {
                                                                        const arr = char.class_abilities.filter((_, idx) => idx !== i);
                                                                        setChar(p => p ? { ...p, class_abilities: arr } as Character : null);
                                                                        quickSave("class_abilities", arr);
                                                                        setExpandedAbility(null);
                                                                    }}
                                                                >🗑️ Elimina</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {isExpanded && !canEdit && (
                                                        <div className={styles.classAbilityDetail}>
                                                            <p className={styles.classAbilityDesc}>{ability.description || <span className="text-muted">Nessuna descrizione.</span>}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className={styles.notesEmpty}>Nessuna abilità specificata.</p>
                                    )
                                )}
                                {!editing && canEdit && (
                                    <button
                                        type="button"
                                        className={styles.addClassAbilityBtn}
                                        onClick={() => {
                                            const newAb: ClassAbility = { name: "", description: "", max_uses: null, uses_remaining: 0, recharge: "" };
                                            const arr = [...(char.class_abilities || []), newAb];
                                            setChar(p => p ? { ...p, class_abilities: arr } as Character : null);
                                            quickSave("class_abilities", arr);
                                            setExpandedAbility(arr.length - 1); // Auto-expand new ability
                                        }}
                                    >
                                        + Aggiungi Abilità
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Hit Dice */}
                        <div className={styles.combatGroup}>
                            <h3 className={styles.sectionTitle}>Dadi Vita</h3>
                            <div className={styles.hitDiceRow}>
                                {editing ? (
                                    <div className={styles.hitDiceEditGroup}>
                                        <div className={styles.hitDiceInputWrap}>
                                            <input
                                                type="number"
                                                className={styles.smallInput}
                                                value={editData.hit_dice_current ?? 0}
                                                onChange={(e) => upd("hit_dice_current", Math.max(0, parseInt(e.target.value) || 0))}
                                                placeholder="Corr."
                                            />
                                            <span className={styles.hitDiceSeparator}>/</span>
                                            <input
                                                type="number"
                                                className={styles.smallInput}
                                                value={editData.hit_dice_total ?? 1}
                                                onChange={(e) => upd("hit_dice_total", Math.max(1, parseInt(e.target.value) || 1))}
                                                placeholder="Tot."
                                            />
                                        </div>
                                        <div className={styles.hitDieTypeSelect}>
                                            <span className={styles.hitDieLabel}>Tipo: d</span>
                                            <select
                                                className={styles.tinySelect}
                                                value={editData.hit_die ?? 8}
                                                onChange={(e) => upd("hit_die", parseInt(e.target.value))}
                                            >
                                                {[6, 8, 10, 12].map(d => (
                                                    <option key={d} value={d}>{d}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {canEdit && (
                                            <button type="button" className={styles.hitDiceBtn} onClick={() => {
                                                const next = Math.max(0, char.hit_dice_current - 1);
                                                setChar((p) => p ? { ...p, hit_dice_current: next } as Character : null);
                                                quickSave("hit_dice_current", next);
                                            }}>−</button>
                                        )}
                                        <div className={styles.hitDiceDisplay}>
                                            <span className={styles.hitDiceValue}>{char.hit_dice_current} / {char.hit_dice_total}</span>
                                            <span className={styles.hitDieType}>d{char.hit_die ?? 8}</span>
                                        </div>
                                        {canEdit && (
                                            <button type="button" className={styles.hitDiceBtn} onClick={() => {
                                                const next = Math.min(char.hit_dice_total, char.hit_dice_current + 1);
                                                setChar((p) => p ? { ...p, hit_dice_current: next } as Character : null);
                                                quickSave("hit_dice_current", next);
                                            }}>+</button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Death Saves */}
                        <div className={styles.combatGroup}>
                            <h3 className={styles.sectionTitle}>Tiri Morte</h3>
                            <div className={styles.deathSaves}>
                                <div className={styles.deathRow}>
                                    <span>Successi</span>
                                    <div className={styles.deathDots}>
                                        {[0, 1, 2].map((i) => {
                                            const ds = (editing ? editData.death_saves : char.death_saves) ?? { successes: 0, failures: 0 };
                                            return (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    className={`${styles.deathDot} ${i < ds.successes ? styles.deathSuccess : ""}`}
                                                    onClick={() => {
                                                        if (!canEdit) return;
                                                        const newDs = { ...ds, successes: i < ds.successes ? i : i + 1 };
                                                        if (editing) upd("death_saves", newDs);
                                                        else {
                                                            setChar((p) => p ? { ...p, death_saves: newDs } as Character : null);
                                                            quickSave("death_saves", newDs);
                                                        }
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className={styles.deathRow}>
                                    <span>Fallimenti</span>
                                    <div className={styles.deathDots}>
                                        {[0, 1, 2].map((i) => {
                                            const ds = (editing ? editData.death_saves : char.death_saves) ?? { successes: 0, failures: 0 };
                                            return (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    className={`${styles.deathDot} ${i < ds.failures ? styles.deathFail : ""}`}
                                                    onClick={() => {
                                                        if (!canEdit) return;
                                                        const newDs = { ...ds, failures: i < ds.failures ? i : i + 1 };
                                                        if (editing) upd("death_saves", newDs);
                                                        else {
                                                            setChar((p) => p ? { ...p, death_saves: newDs } as Character : null);
                                                            quickSave("death_saves", newDs);
                                                        }
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Money */}
                        <div className={styles.combatGroup}>
                            <h3 className={styles.sectionTitle}>Denaro</h3>
                            <div className={styles.moneyGrid}>
                                {[
                                    { key: "mp", label: "MP", full: "Monete di Platino" },
                                    { key: "mo", label: "MO", full: "Monete d'Oro" },
                                    { key: "ma", label: "MA", full: "Monete d'Argento" },
                                    { key: "mr", label: "MR", full: "Monete di Rame" },
                                    { key: "me", label: "ME", full: "Monete d'Electrum" },
                                ].map(({ key, label }) => {
                                    const money = (editing ? editData.money : char.money) ?? { mp: 0, mo: 0, ma: 0, mr: 0, me: 0 };
                                    return (
                                        <div key={key} className={styles.moneyItem}>
                                            <span className={styles.moneyLabel}>{label}</span>
                                            {editing ? (
                                                <input type="number" className={styles.moneyInput} value={money[key as keyof typeof money]} onChange={(e) => upd("money", { ...money, [key]: Math.max(0, parseInt(e.target.value) || 0) })} />
                                            ) : canEdit ? (
                                                <input type="number" className={styles.moneyInput} value={money[key as keyof typeof money]} onChange={(e) => { const val = Math.max(0, parseInt(e.target.value) || 0); const newMoney = { ...money, [key]: val }; setChar((p) => p ? { ...p, money: newMoney } as Character : null); quickSave("money", newMoney); }} />
                                            ) : (
                                                <span className={styles.moneyValue}>{money[key as keyof typeof money]}</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Personality */}
                        <div className={styles.combatGroup}>
                            <h3 className={styles.sectionTitle}>Personalità</h3>
                            {["traits", "ideals", "bonds", "flaws"].map((field) => {
                                const label = { traits: "Tratti", ideals: "Ideali", bonds: "Legami", flaws: "Difetti" }[field]!;
                                const personality = (editing ? editData.personality : char.personality) ?? { traits: "", ideals: "", bonds: "", flaws: "" };
                                return (
                                    <div key={field} className={styles.personalityField}>
                                        <label className={styles.personalityLabel}>{label}</label>
                                        {editing ? (
                                            <textarea className={`input ${styles.personalityInput}`} value={personality[field as keyof typeof personality]} onChange={(e) => upd("personality", { ...personality, [field]: e.target.value })} rows={2} />
                                        ) : (
                                            <p className={styles.personalityText}>{personality[field as keyof typeof personality] || <span className="text-muted">—</span>}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Features */}
                        <div className={styles.combatGroup}>
                            <h3 className={styles.sectionTitle}>Privilegi & Tratti</h3>
                            {editing ? (
                                <textarea className={`input ${styles.listTextarea}`} value={(editData.features as string[] || []).join("\n")} onChange={(e) => upd("features", e.target.value.split("\n").filter(Boolean) as unknown as string[])} placeholder="Un privilegio per riga..." rows={5} />
                            ) : (
                                <ul className={styles.itemList}>
                                    {(char.features ?? []).length > 0 ? (
                                        (char.features as string[]).map((f, i) => <li key={i} className={styles.item}>{f}</li>)
                                    ) : (
                                        <li className={styles.itemEmpty}>Nessun privilegio</li>
                                    )}
                                </ul>
                            )}
                        </div>
                    </div>
                )}

                {/* ====== EQUIPMENT TAB ====== */}
                {activeTab === "equipment" && (
                    <EquipmentManager
                        equipment={equip}
                        onChange={(newEquip) => {
                            if (editing) {
                                upd("equipment", newEquip);
                            } else {
                                setChar((p) => p ? { ...p, equipment: newEquip } as Character : null);
                                quickSave("equipment", newEquip);
                            }
                        }}
                        editing={editing}
                        canEdit={canEdit}
                    />
                )}

                {/* ====== SPELLS TAB ====== */}
                {activeTab === "spells" && (
                    <div className={styles.spellsSection}>
                        <div className={styles.spellsInfo}>
                            <p className={styles.spellHint}>
                                Incantesimi conosciuti: <strong>{char.known_spells?.length ?? 0}</strong>
                            </p>
                            {canEdit && (
                                <button className="btn btn-primary" onClick={() => setShowSpellBrowser(true)}>
                                    📖 Sfoglia Incantesimi
                                </button>
                            )}
                        </div>

                        {/* Spell Slots */}
                        {(Object.keys(char.spell_slots ?? {}).length > 0 || editing) && (
                            <div className={styles.spellSlots}>
                                <h3 className={styles.sectionTitle}>Slot Incantesimi</h3>
                                <div className={styles.slotsGrid}>
                                    {Object.entries(editing ? (editData.spell_slots ?? {}) : (char.spell_slots ?? {})).map(([lvl, total]) => {
                                        const used = char.spell_slots_used?.[lvl] ?? 0;
                                        const remaining = (total as number) - used;
                                        return (
                                            <div key={lvl} className={styles.slotItem}>
                                                <span className={styles.slotLevel}>Lv. {lvl}</span>
                                                <div className={styles.slotDotsRow}>
                                                    {editing && (
                                                        <div className={styles.slotEditGroup}>
                                                            <button
                                                                type="button"
                                                                className={styles.slotEditBtn}
                                                                onClick={() => {
                                                                    const currentTotal = (editData.spell_slots?.[lvl] as number) ?? 0;
                                                                    const slots = { ...(editData.spell_slots ?? {}) };
                                                                    slots[lvl] = currentTotal + 1;
                                                                    upd("spell_slots", slots);
                                                                }}
                                                            >+</button>
                                                            <button
                                                                type="button"
                                                                className={styles.slotEditBtn}
                                                                onClick={() => {
                                                                    const currentTotal = (editData.spell_slots?.[lvl] as number) ?? 0;
                                                                    if (currentTotal > 0) {
                                                                        const slots = { ...(editData.spell_slots ?? {}) };
                                                                        slots[lvl] = currentTotal - 1;
                                                                        upd("spell_slots", slots);
                                                                    }
                                                                }}
                                                            >-</button>
                                                        </div>
                                                    )}
                                                    <div className={styles.slotDots}>
                                                        {Array.from({ length: total as number }, (_, i) => (
                                                            <button
                                                                key={i}
                                                                type="button"
                                                                className={`${styles.slotDot} ${i < remaining ? styles.slotAvailable : styles.slotUsed}`}
                                                                disabled={editing || !canEdit}
                                                                onClick={() => {
                                                                    if (editing || !canEdit) return;
                                                                    const slotsUsed = { ...char.spell_slots_used };
                                                                    slotsUsed[lvl] = i < remaining ? used + 1 : Math.max(0, used - 1);
                                                                    setChar((p) => p ? { ...p, spell_slots_used: slotsUsed } as Character : null);
                                                                    quickSave("spell_slots_used", slotsUsed);
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Add/Remove Last Level Buttons */}
                                    {editing && (
                                        <div className={styles.slotLevelsEditActions}>
                                            <button
                                                type="button"
                                                className={styles.slotLevelActionBtn}
                                                onClick={() => {
                                                    const slots = { ...(editData.spell_slots ?? {}) };
                                                    const keys = Object.keys(slots);
                                                    if (keys.length > 0) {
                                                        const lastLevel = keys[keys.length - 1];
                                                        delete slots[lastLevel];
                                                        upd("spell_slots", slots);
                                                    }
                                                }}
                                            >- Rimuovi Livello</button>
                                            <button
                                                type="button"
                                                className={styles.slotLevelActionBtn}
                                                onClick={() => {
                                                    const slots = { ...(editData.spell_slots ?? {}) };
                                                    const keys = Object.keys(slots).map(Number);
                                                    const maxLevel = keys.length > 0 ? Math.max(...keys) : 0;
                                                    slots[String(maxLevel + 1)] = 1;
                                                    upd("spell_slots", slots);
                                                }}
                                            >+ Aggiungi Livello</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Known Spells List — grouped by level */}
                        {(char.known_spells?.length ?? 0) > 0 && (
                            <KnownSpellsList
                                knownSpells={char.known_spells}
                                spellDetails={spellDetails}
                                expandedSpell={expandedSpell}
                                setExpandedSpell={setExpandedSpell}
                                canEdit={canEdit}
                                onRemove={(spellName) => {
                                    const updated = char.known_spells.filter((s) => s !== spellName);
                                    setChar((p) => p ? { ...p, known_spells: updated } as Character : null);
                                    quickSave("known_spells", updated);
                                }}
                                preparedSpells={char.prepared_spells ?? []}
                                onTogglePrepare={(spellName) => {
                                    const current = char.prepared_spells ?? [];
                                    const updated = current.includes(spellName)
                                        ? current.filter(s => s !== spellName)
                                        : [...current, spellName];
                                    setChar(p => p ? { ...p, prepared_spells: updated } as Character : null);
                                    quickSave("prepared_spells", updated);
                                }}
                                canPrepareSpells={PREPARING_CLASSES.includes(char.class.toLowerCase())}
                            />
                        )}

                        {(char.known_spells?.length ?? 0) === 0 && (
                            <p className={styles.emptyNote}>Nessun incantesimo conosciuto. {canEdit ? 'Clicca "Sfoglia Incantesimi" per aggiungerne.' : ''}</p>
                        )}

                        {/* Spell Browser Overlay */}
                        {showSpellBrowser && (
                            <SpellBrowser
                                knownSpells={char.known_spells ?? []}
                                onConfirm={(spells) => {
                                    if (!canEdit) return;
                                    setChar((p) => p ? { ...p, known_spells: spells } as Character : null);
                                    quickSave("known_spells", spells);
                                }}
                                onClose={() => setShowSpellBrowser(false)}
                            />
                        )}
                    </div>
                )}

                {/* ====== NOTES TAB ====== */}
                {activeTab === "notes" && (() => {
                    // Parse notes: support both legacy string and new JSON array format
                    type NoteEntry = { text: string; date: string };
                    let notesList: NoteEntry[] = [];
                    try {
                        if (char.notes && char.notes.startsWith("[")) {
                            notesList = JSON.parse(char.notes);
                        } else if (char.notes) {
                            notesList = [{ text: char.notes, date: "" }];
                        }
                    } catch { notesList = char.notes ? [{ text: char.notes, date: "" }] : []; }

                    const saveNotes = (updated: NoteEntry[]) => {
                        const json = JSON.stringify(updated);
                        setChar((p) => p ? { ...p, notes: json } as Character : null);
                        quickSave("notes", json);
                    };

                    return (
                        <div className={styles.notesSection}>
                            {canEdit && (
                                <button
                                    type="button"
                                    className={styles.addNoteBtn}
                                    onClick={() => {
                                        const newNote: NoteEntry = {
                                            text: "",
                                            date: new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
                                        };
                                        saveNotes([newNote, ...notesList]);
                                    }}
                                >
                                    + Nuova Nota
                                </button>
                            )}

                            {notesList.length === 0 && (
                                <p className={styles.notesEmpty}>Nessuna nota. {canEdit ? "Aggiungi la prima!" : ""}</p>
                            )}

                            {notesList.map((note, i) => (
                                <div key={i} className={styles.noteCard}>
                                    <div className={styles.noteHeader}>
                                        {note.date && <span className={styles.noteDate}>{note.date}</span>}
                                        {canEdit && (
                                            <button type="button" className={styles.noteDeleteBtn} onClick={() => setNoteToDelete(i)}>🗑️</button>
                                        )}
                                    </div>
                                    {canEdit ? (
                                        <textarea
                                            className={`input ${styles.noteTextarea}`}
                                            value={note.text}
                                            onChange={(e) => {
                                                const updated = [...notesList];
                                                updated[i] = { ...note, text: e.target.value };
                                                const json = JSON.stringify(updated);
                                                setChar((p) => p ? { ...p, notes: json } as Character : null);
                                            }}
                                            onBlur={() => saveNotes(notesList)}
                                            placeholder="Scrivi la tua nota..."
                                            rows={3}
                                        />
                                    ) : (
                                        <p className={styles.noteText}>{note.text || <span className="text-muted">—</span>}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                })()}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3>Elimina Personaggio</h3>
                        <p>Sei sicuro di voler eliminare <strong>{char.name}</strong>? Questa azione è irreversibile.</p>
                        <div className={styles.modalActions}>
                            <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                                Annulla
                            </button>
                            <button className="btn btn-danger" onClick={deleteCharacter} disabled={deleting}>
                                {deleting ? "Eliminazione..." : "Si, Elimina Definitivamente"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Note Delete Confirmation */}
            {noteToDelete !== null && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3>Elimina Nota</h3>
                        <p>Sei sicuro di voler eliminare questa nota?</p>
                        <div className={styles.modalActions}>
                            <button className="btn btn-secondary" onClick={() => setNoteToDelete(null)}>Annulla</button>
                            <button className="btn btn-danger" onClick={() => {
                                // Parse notes and delete
                                type NoteEntry = { text: string; date: string };
                                let notesList: NoteEntry[] = [];
                                try {
                                    if (char.notes?.startsWith("[")) notesList = JSON.parse(char.notes);
                                    else if (char.notes) notesList = [{ text: char.notes, date: "" }];
                                } catch { notesList = char.notes ? [{ text: char.notes, date: "" }] : []; }
                                const updated = notesList.filter((_, j) => j !== noteToDelete);
                                const json = JSON.stringify(updated);
                                setChar((p) => p ? { ...p, notes: json } as Character : null);
                                quickSave("notes", json);
                                setNoteToDelete(null);
                            }}>Elimina</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Fullscreen Portrait */}
            {showPortraitFull && char.portrait_url && (
                <div className={styles.portraitFullOverlay} onClick={() => setShowPortraitFull(false)}>
                    <button className={styles.portraitFullClose} onClick={() => setShowPortraitFull(false)}>✕</button>
                    <Image src={char.portrait_url} alt={char.name} width={600} height={600} className={styles.portraitFullImage} />
                </div>
            )}
        </div>
    );
}
