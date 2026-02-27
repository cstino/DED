"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import styles from "./character.module.css";

interface AbilityScores {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
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
    ac: number;
    initiative_bonus: number;
    spell_slots: Record<string, unknown>;
    proficiencies: string[];
    equipment: string[];
    features: string[];
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

const SKILLS: { name: string; ability: keyof AbilityScores; label: string }[] = [
    { name: "acrobatics", ability: "dex", label: "Acrobazia" },
    { name: "animal_handling", ability: "wis", label: "Addestrare Animali" },
    { name: "arcana", ability: "int", label: "Arcano" },
    { name: "athletics", ability: "str", label: "Atletica" },
    { name: "deception", ability: "cha", label: "Inganno" },
    { name: "history", ability: "int", label: "Storia" },
    { name: "insight", ability: "wis", label: "Intuizione" },
    { name: "intimidation", ability: "cha", label: "Intimidire" },
    { name: "investigation", ability: "int", label: "Investigare" },
    { name: "medicine", ability: "wis", label: "Medicina" },
    { name: "nature", ability: "int", label: "Natura" },
    { name: "perception", ability: "wis", label: "Percezione" },
    { name: "performance", ability: "cha", label: "Intrattenere" },
    { name: "persuasion", ability: "cha", label: "Persuasione" },
    { name: "religion", ability: "int", label: "Religione" },
    { name: "sleight_of_hand", ability: "dex", label: "Rapidità di Mano" },
    { name: "stealth", ability: "dex", label: "Furtività" },
    { name: "survival", ability: "wis", label: "Sopravvivenza" },
];

function getMod(score: number): number {
    return Math.floor((score - 10) / 2);
}

function formatMod(mod: number): string {
    return mod >= 0 ? `+${mod}` : `${mod}`;
}

function getProfBonus(level: number): number {
    return Math.ceil(level / 4) + 1;
}

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
    const [activeTab, setActiveTab] = useState<"stats" | "skills" | "combat" | "notes">("stats");

    const isOwner = char?.user_id === user?.id;

    const fetchChar = useCallback(async () => {
        const { data } = await supabase
            .from("characters")
            .select("*")
            .eq("id", charId)
            .single();
        if (data) {
            setChar(data as Character);
            setEditData(data);
        }
        setLoading(false);
    }, [charId]);

    useEffect(() => {
        if (!authLoading && !user) router.push("/login");
    }, [authLoading, user, router]);

    useEffect(() => {
        if (user && charId) fetchChar();
    }, [user, charId, fetchChar]);

    async function saveChanges() {
        if (!char || !isOwner) return;
        setSaving(true);

        const { error } = await supabase
            .from("characters")
            .update({
                name: editData.name,
                level: editData.level,
                hp_current: editData.hp_current,
                hp_max: editData.hp_max,
                ac: editData.ac,
                ability_scores: editData.ability_scores,
                initiative_bonus: getMod(editData.ability_scores?.dex ?? 10),
                notes: editData.notes,
                alignment: editData.alignment,
                background: editData.background,
                proficiencies: editData.proficiencies,
                equipment: editData.equipment,
                features: editData.features,
            })
            .eq("id", char.id);

        if (!error) {
            await fetchChar();
            setEditing(false);
        }
        setSaving(false);
    }

    function updateEdit<K extends keyof Character>(key: K, value: Character[K]) {
        setEditData((prev) => ({ ...prev, [key]: value }));
    }

    function updateAbility(key: string, value: number) {
        const scores = { ...(editData.ability_scores as AbilityScores) };
        scores[key as keyof AbilityScores] = Math.max(1, Math.min(30, value));
        updateEdit("ability_scores", scores);
    }

    if (authLoading || !user || loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner} />
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

    const profBonus = getProfBonus(char.level);
    const hpPercent = Math.max(0, Math.min(100, (char.hp_current / char.hp_max) * 100));
    const abilities = (editing ? editData.ability_scores : char.ability_scores) as AbilityScores;
    const currentHp = editing ? (editData.hp_current ?? char.hp_current) : char.hp_current;
    const currentHpMax = editing ? (editData.hp_max ?? char.hp_max) : char.hp_max;
    const currentAc = editing ? (editData.ac ?? char.ac) : char.ac;

    return (
        <div className="page">
            {/* Back + Actions */}
            <div className={styles.topBar}>
                <button className={styles.backBtn} onClick={() => router.push(`/campaign/${campaignId}`)}>
                    ← Campagna
                </button>
                {isOwner && (
                    <div className={styles.topActions}>
                        {editing ? (
                            <>
                                <button className="btn btn-secondary" onClick={() => { setEditing(false); setEditData(char); }}>
                                    Annulla
                                </button>
                                <button className="btn btn-primary" onClick={saveChanges} disabled={saving}>
                                    {saving ? "Salvo..." : "💾 Salva"}
                                </button>
                            </>
                        ) : (
                            <button className="btn btn-secondary" onClick={() => setEditing(true)}>
                                ✏️ Modifica
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Character Header */}
            <div className={styles.charHeader}>
                <div className={styles.portraitWrap}>
                    {char.portrait_url ? (
                        <Image
                            src={char.portrait_url}
                            alt={char.name}
                            width={100}
                            height={100}
                            className={styles.portrait}
                        />
                    ) : (
                        <div className={styles.portraitFallback}>
                            {char.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <div className={styles.charInfo}>
                    <h1 className={styles.charName}>
                        {editing ? (
                            <input
                                type="text"
                                className={`input ${styles.nameInput}`}
                                value={editData.name ?? ""}
                                onChange={(e) => updateEdit("name", e.target.value)}
                            />
                        ) : char.name}
                    </h1>
                    <p className={styles.charMeta}>
                        {char.race} • {char.class}
                        {char.subclass && ` — ${char.subclass}`}
                    </p>
                    <div className={styles.charTags}>
                        <span className={styles.levelTag}>Lv. {char.level}</span>
                        {char.alignment && <span className={styles.alignTag}>{char.alignment}</span>}
                        {char.background && <span className={styles.bgTag}>{char.background}</span>}
                    </div>
                </div>
            </div>

            {/* Combat Quick Stats */}
            <div className={styles.combatBar}>
                <div className={styles.hpBox}>
                    <div className={styles.hpHeader}>
                        <span className={styles.statLabel}>HP</span>
                        {editing ? (
                            <div className={styles.hpEditRow}>
                                <input
                                    type="number"
                                    className={styles.smallInput}
                                    value={currentHp}
                                    onChange={(e) => updateEdit("hp_current", Math.max(0, parseInt(e.target.value) || 0))}
                                />
                                <span>/</span>
                                <input
                                    type="number"
                                    className={styles.smallInput}
                                    value={currentHpMax}
                                    onChange={(e) => updateEdit("hp_max", Math.max(1, parseInt(e.target.value) || 1))}
                                />
                            </div>
                        ) : (
                            <span className={styles.hpValue}>{char.hp_current}/{char.hp_max}</span>
                        )}
                    </div>
                    <div className="hp-bar-container" style={{ height: 8 }}>
                        <div
                            className="hp-bar"
                            style={{
                                width: `${hpPercent}%`,
                                background: hpPercent > 50 ? "var(--hp-green)" : hpPercent > 25 ? "var(--hp-yellow)" : "var(--hp-red)",
                            }}
                        />
                    </div>
                </div>

                <div className={styles.statBox}>
                    <span className={styles.statLabel}>AC</span>
                    {editing ? (
                        <input
                            type="number"
                            className={styles.smallInput}
                            value={currentAc}
                            onChange={(e) => updateEdit("ac", Math.max(1, parseInt(e.target.value) || 10))}
                        />
                    ) : (
                        <span className={styles.statValue}>{char.ac}</span>
                    )}
                </div>

                <div className={styles.statBox}>
                    <span className={styles.statLabel}>INIT</span>
                    <span className={styles.statValue}>{formatMod(getMod(abilities.dex))}</span>
                </div>

                <div className={styles.statBox}>
                    <span className={styles.statLabel}>PROF</span>
                    <span className={styles.statValue}>+{profBonus}</span>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className={styles.tabs}>
                {([
                    { id: "stats", label: "Statistiche" },
                    { id: "skills", label: "Abilità" },
                    { id: "combat", label: "Equipaggiamento" },
                    { id: "notes", label: "Note" },
                ] as const).map((tab) => (
                    <button
                        key={tab.id}
                        className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className={styles.tabContent}>
                {/* Stats Tab */}
                {activeTab === "stats" && (
                    <div className={styles.abilitiesGrid}>
                        {ABILITIES.map(({ key, label, short }) => {
                            const score = abilities[key as keyof AbilityScores];
                            const mod = getMod(score);
                            return (
                                <div key={key} className={styles.abilityCard}>
                                    <span className={styles.abilityLabel}>{short}</span>
                                    {editing ? (
                                        <input
                                            type="number"
                                            className={styles.abilityInput}
                                            value={score}
                                            onChange={(e) => updateAbility(key, parseInt(e.target.value) || 10)}
                                        />
                                    ) : (
                                        <span className={styles.abilityScore}>{score}</span>
                                    )}
                                    <span className={styles.abilityMod}>{formatMod(mod)}</span>
                                    <span className={styles.abilityName}>{label}</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Skills Tab */}
                {activeTab === "skills" && (
                    <div className={styles.skillsList}>
                        {SKILLS.map((skill) => {
                            const mod = getMod(abilities[skill.ability]);
                            return (
                                <div key={skill.name} className={styles.skillRow}>
                                    <span className={styles.skillName}>{skill.label}</span>
                                    <span className={styles.skillAbility}>({skill.ability.toUpperCase()})</span>
                                    <span className={styles.skillMod}>{formatMod(mod)}</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Equipment Tab */}
                {activeTab === "combat" && (
                    <div className={styles.combatSection}>
                        {/* Features */}
                        <div className={styles.listSection}>
                            <h3 className={styles.listTitle}>Privilegi & Tratti</h3>
                            {editing ? (
                                <textarea
                                    className={`input ${styles.listTextarea}`}
                                    value={(editData.features as string[] || []).join("\n")}
                                    onChange={(e) => updateEdit("features", e.target.value.split("\n").filter(Boolean) as unknown as string[])}
                                    placeholder="Un privilegio per riga..."
                                    rows={5}
                                />
                            ) : (
                                <ul className={styles.itemList}>
                                    {(char.features ?? []).length > 0 ? (
                                        (char.features as string[]).map((f, i) => (
                                            <li key={i} className={styles.item}>{f}</li>
                                        ))
                                    ) : (
                                        <li className={styles.itemEmpty}>Nessun privilegio aggiunto</li>
                                    )}
                                </ul>
                            )}
                        </div>

                        {/* Equipment */}
                        <div className={styles.listSection}>
                            <h3 className={styles.listTitle}>Equipaggiamento</h3>
                            {editing ? (
                                <textarea
                                    className={`input ${styles.listTextarea}`}
                                    value={(editData.equipment as string[] || []).join("\n")}
                                    onChange={(e) => updateEdit("equipment", e.target.value.split("\n").filter(Boolean) as unknown as string[])}
                                    placeholder="Un oggetto per riga..."
                                    rows={5}
                                />
                            ) : (
                                <ul className={styles.itemList}>
                                    {(char.equipment ?? []).length > 0 ? (
                                        (char.equipment as string[]).map((eq, i) => (
                                            <li key={i} className={styles.item}>{eq}</li>
                                        ))
                                    ) : (
                                        <li className={styles.itemEmpty}>Zaino vuoto</li>
                                    )}
                                </ul>
                            )}
                        </div>

                        {/* Proficiencies */}
                        <div className={styles.listSection}>
                            <h3 className={styles.listTitle}>Competenze</h3>
                            {editing ? (
                                <textarea
                                    className={`input ${styles.listTextarea}`}
                                    value={(editData.proficiencies as string[] || []).join("\n")}
                                    onChange={(e) => updateEdit("proficiencies", e.target.value.split("\n").filter(Boolean) as unknown as string[])}
                                    placeholder="Una competenza per riga..."
                                    rows={4}
                                />
                            ) : (
                                <ul className={styles.itemList}>
                                    {(char.proficiencies ?? []).length > 0 ? (
                                        (char.proficiencies as string[]).map((p, i) => (
                                            <li key={i} className={styles.item}>{p}</li>
                                        ))
                                    ) : (
                                        <li className={styles.itemEmpty}>Nessuna competenza</li>
                                    )}
                                </ul>
                            )}
                        </div>
                    </div>
                )}

                {/* Notes Tab */}
                {activeTab === "notes" && (
                    <div className={styles.notesSection}>
                        {editing ? (
                            <textarea
                                className={`input ${styles.notesTextarea}`}
                                value={editData.notes ?? ""}
                                onChange={(e) => updateEdit("notes", e.target.value)}
                                placeholder="Scrivi note sul tuo personaggio, la sua storia, i suoi obiettivi..."
                                rows={12}
                            />
                        ) : (
                            <div className={styles.notesContent}>
                                {char.notes ? (
                                    char.notes.split("\n").map((line, i) => (
                                        <p key={i}>{line || <br />}</p>
                                    ))
                                ) : (
                                    <p className={styles.notesEmpty}>
                                        Nessuna nota. Clicca ✏️ Modifica per aggiungere la storia del tuo personaggio.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
