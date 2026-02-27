"use client";

import { useEffect, useState, useCallback } from "react";
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
    proficiencies: string[];
    equipment: EquipmentItem[];
    features: string[];
    personality: { traits: string; ideals: string; bonds: string; flaws: string };
    background: string | null;
    alignment: string | null;
    notes: string | null;
    portrait_url: string | null;
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
    const [activeTab, setActiveTab] = useState<"stats" | "combat" | "equipment" | "spells" | "notes">("stats");
    const [showSpellBrowser, setShowSpellBrowser] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const isOwner = char?.user_id === user?.id;

    const fetchChar = useCallback(async () => {
        const { data } = await supabase.from("characters").select("*").eq("id", charId).single();
        if (data) {
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
                personality: data.personality ?? { traits: "", ideals: "", bonds: "", flaws: "" },
                equipment: Array.isArray(data.equipment) ? data.equipment : [],
                features: Array.isArray(data.features) ? data.features : [],
                proficiencies: Array.isArray(data.proficiencies) ? data.proficiencies : [],
            } as Character;
            setChar(c);
            setEditData(c);
        }
        setLoading(false);
    }, [charId]);

    useEffect(() => { if (!authLoading && !user) router.push("/login"); }, [authLoading, user, router]);
    useEffect(() => { if (user && charId) fetchChar(); }, [user, charId, fetchChar]);

    async function saveChanges() {
        if (!char || !isOwner) return;
        setSaving(true);
        const d = editData;
        await supabase.from("characters").update({
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
            spell_slots_used: d.spell_slots_used,
        }).eq("id", char.id);
        await fetchChar();
        setEditing(false);
        setSaving(false);
    }

    // Quick save a single field without entering edit mode
    async function quickSave(field: string, value: unknown) {
        if (!char || !isOwner) return;
        await supabase.from("characters").update({ [field]: value }).eq("id", char.id);
        setChar((prev) => prev ? { ...prev, [field]: value } as Character : null);
        setEditData((prev) => ({ ...prev, [field]: value }));
    }

    async function deleteCharacter() {
        if (!char || !isOwner) return;
        setDeleting(true);
        const { error } = await supabase.from("characters").delete().eq("id", char.id);
        if (!error) {
            router.push(`/campaign/${campaignId}`);
        } else {
            console.error("Error deleting character", error);
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
        return <div className={styles.loadingContainer}><div className={styles.spinner} /></div>;
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

    const pb = profBonus(char.level);
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
                {isOwner && (
                    <div className={styles.topActions}>
                        {editing ? (
                            <>
                                <button className="btn btn-secondary" onClick={() => { setEditing(false); setEditData(char); }}>Annulla</button>
                                <button className="btn btn-primary" onClick={saveChanges} disabled={saving}>
                                    {saving ? "Salvo..." : "💾 Salva"}
                                </button>
                            </>
                        ) : (
                            <>
                                <button className={styles.deleteBtn} onClick={() => setShowDeleteConfirm(true)}>🗑️ Elimina</button>
                                <button className="btn btn-secondary" onClick={() => setEditing(true)}>✏️ Modifica</button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Character Header */}
            <div className={styles.charHeader}>
                <div className={styles.portraitWrap}>
                    {char.portrait_url ? (
                        <Image src={char.portrait_url} alt={char.name} width={100} height={100} className={styles.portrait} />
                    ) : (
                        <div className={styles.portraitFallback}>{char.name.charAt(0).toUpperCase()}</div>
                    )}
                </div>
                <div className={styles.charInfo}>
                    <h1 className={styles.charName}>
                        {editing ? (
                            <input type="text" className={`input ${styles.nameInput}`} value={editData.name ?? ""} onChange={(e) => upd("name", e.target.value)} />
                        ) : char.name}
                    </h1>
                    <p className={styles.charMeta}>{char.race} • {char.class}{char.subclass && ` — ${char.subclass}`}</p>
                    <div className={styles.charTags}>
                        <span className={styles.levelTag}>Lv. {char.level}</span>
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
                        ) : isOwner ? (
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
                    {(char.hp_temp > 0 || isOwner) && (
                        <div className={styles.hpTemp}>
                            <span>HP Temp:</span>
                            {(editing || isOwner) ? (
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
                <div className={styles.statBox}><span className={styles.statLabel}>PROF</span><span className={styles.statValue}>+{pb}</span></div>
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
                    </>
                )}

                {/* ====== COMBAT TAB ====== */}
                {activeTab === "combat" && (
                    <div className={styles.combatSection}>
                        {/* Hit Dice */}
                        <div className={styles.combatGroup}>
                            <h3 className={styles.sectionTitle}>Dadi Vita</h3>
                            <div className={styles.hitDiceRow}>
                                {editing ? (
                                    <>
                                        <input type="number" className={styles.smallInput} value={editData.hit_dice_current ?? 0} onChange={(e) => upd("hit_dice_current", Math.max(0, parseInt(e.target.value) || 0))} />
                                        <span>/ {char.hit_dice_total}</span>
                                    </>
                                ) : (
                                    <span className={styles.hitDiceValue}>{char.hit_dice_current} / {char.hit_dice_total}</span>
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
                                                        if (!isOwner) return;
                                                        const newDs = { ...ds, successes: i < ds.successes ? i : i + 1 };
                                                        if (editing) upd("death_saves", newDs);
                                                        else quickSave("death_saves", newDs);
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
                                                        if (!isOwner) return;
                                                        const newDs = { ...ds, failures: i < ds.failures ? i : i + 1 };
                                                        if (editing) upd("death_saves", newDs);
                                                        else quickSave("death_saves", newDs);
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
                        onChange={(newEquip) => upd("equipment", newEquip)}
                        editing={editing}
                    />
                )}

                {/* ====== SPELLS TAB ====== */}
                {activeTab === "spells" && (
                    <div className={styles.spellsSection}>
                        <div className={styles.spellsInfo}>
                            <p className={styles.spellHint}>
                                Incantesimi conosciuti: <strong>{char.known_spells?.length ?? 0}</strong>
                            </p>
                            {isOwner && (
                                <button className="btn btn-primary" onClick={() => setShowSpellBrowser(true)}>
                                    📖 Sfoglia Incantesimi
                                </button>
                            )}
                        </div>

                        {/* Spell Slots — always clickable for owner */}
                        {Object.keys(char.spell_slots ?? {}).length > 0 && (
                            <div className={styles.spellSlots}>
                                <h3 className={styles.sectionTitle}>Slot Incantesimi</h3>
                                <div className={styles.slotsGrid}>
                                    {Object.entries(char.spell_slots).map(([lvl, total]) => {
                                        const used = char.spell_slots_used?.[lvl] ?? 0;
                                        const remaining = (total as number) - used;
                                        return (
                                            <div key={lvl} className={styles.slotItem}>
                                                <span className={styles.slotLevel}>Lv. {lvl}</span>
                                                <div className={styles.slotDots}>
                                                    {Array.from({ length: total as number }, (_, i) => (
                                                        <button
                                                            key={i}
                                                            type="button"
                                                            className={`${styles.slotDot} ${i < remaining ? styles.slotAvailable : styles.slotUsed}`}
                                                            onClick={() => {
                                                                if (!isOwner) return;
                                                                const slotsUsed = { ...char.spell_slots_used };
                                                                slotsUsed[lvl] = i < remaining ? used + 1 : Math.max(0, used - 1);
                                                                quickSave("spell_slots_used", slotsUsed);
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Known Spells List */}
                        {(char.known_spells?.length ?? 0) > 0 && (
                            <div className={styles.knownSpells}>
                                <h3 className={styles.sectionTitle}>Incantesimi Conosciuti</h3>
                                <div className={styles.spellList}>
                                    {char.known_spells.map((spell, i) => (
                                        <div key={i} className={styles.spellItem}>
                                            <span>{spell}</span>
                                            {isOwner && (
                                                <button
                                                    type="button"
                                                    className={styles.removeSpellBtn}
                                                    onClick={() => quickSave("known_spells", char.known_spells.filter((_, j) => j !== i))}
                                                >✕</button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(char.known_spells?.length ?? 0) === 0 && (
                            <p className={styles.emptyNote}>Nessun incantesimo conosciuto. {isOwner ? 'Clicca "Sfoglia Incantesimi" per aggiungerne.' : ''}</p>
                        )}

                        {/* Spell Browser Overlay */}
                        {showSpellBrowser && (
                            <SpellBrowser
                                knownSpells={char.known_spells ?? []}
                                onConfirm={(spells) => quickSave("known_spells", spells)}
                                onClose={() => setShowSpellBrowser(false)}
                            />
                        )}
                    </div>
                )}

                {/* ====== NOTES TAB ====== */}
                {activeTab === "notes" && (
                    <div className={styles.notesSection}>
                        {editing ? (
                            <textarea className={`input ${styles.notesTextarea}`} value={editData.notes ?? ""} onChange={(e) => upd("notes", e.target.value)} placeholder="Scrivi note sul tuo personaggio..." rows={12} />
                        ) : (
                            <div className={styles.notesContent}>
                                {char.notes ? char.notes.split("\n").map((line, i) => <p key={i}>{line || <br />}</p>) : (
                                    <p className={styles.notesEmpty}>Nessuna nota.</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
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
        </div>
    );
}
