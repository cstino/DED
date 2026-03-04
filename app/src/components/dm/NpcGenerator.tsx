"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./NpcGenerator.module.css";

interface GeneratedEntity {
    name: string;
    race: string;
    role: string;
    alignment: string;
    hp: number;
    ac: number;
    stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
    traits: { name: string; description: string }[];
    actions: { name: string; description: string }[];
    equipment: string[];
    notes: string;
    challenge_rating: string;
}

interface NpcGeneratorProps {
    campaignId: string;
    onSaved?: () => void;
}

export default function NpcGenerator({ campaignId, onSaved }: NpcGeneratorProps) {
    const [mode, setMode] = useState<"ai" | "manual">("ai");
    const [entityType, setEntityType] = useState<"npc" | "monster">("npc");
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generated, setGenerated] = useState<GeneratedEntity | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Manual mode state
    const [manualData, setManualData] = useState<GeneratedEntity>({
        name: "", race: "", role: "", alignment: "Neutrale",
        hp: 10, ac: 10,
        stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        traits: [], actions: [], equipment: [], notes: "", challenge_rating: "1",
    });

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        setError(null);
        setGenerated(null);

        try {
            const res = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: entityType === "monster" ? "monster" : "npc",
                    prompt: prompt.trim(),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Errore durante la generazione.");
                return;
            }

            setGenerated(data.result);
        } catch (err: any) {
            setError("Errore di rete. Riprova.");
            console.error("Generate error:", err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async (entity: GeneratedEntity) => {
        setIsSaving(true);
        setError(null);
        try {
            const payload = {
                campaign_id: campaignId,
                name: entity.name,
                description: `${entity.role} - CR ${entity.challenge_rating}`,
                race: entity.race,
                role: entity.role,
                alignment: entity.alignment,
                is_alive: true,
                hp: entity.hp,
                ac: entity.ac,
                stats: entity.stats,
                type: entityType,
                challenge_rating: entity.challenge_rating,
                traits: [
                    ...entity.traits,
                    { name: "Equipaggiamento", description: entity.equipment.join(", ") },
                    ...entity.actions.map(a => ({ name: `Azione: ${a.name}`, description: a.description }))
                ],
                notes: entity.notes,
            };
            console.log("Saving NPC/Monster:", payload);

            const { error: dbError } = await supabase.from('npcs').insert(payload);

            if (dbError) {
                console.error("Supabase insert error:", dbError);
                setError(`Errore salvataggio: ${dbError.message}`);
                return;
            }

            console.log("NPC/Monster saved successfully!");
            if (onSaved) onSaved();
            setGenerated(null);
            setPrompt("");
            if (mode === "manual") {
                setManualData({
                    name: "", race: "", role: "", alignment: "Neutrale",
                    hp: 10, ac: 10,
                    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
                    traits: [], actions: [], equipment: [], notes: "", challenge_rating: "1",
                });
            }
        } catch (err: any) {
            console.error("Failed to save:", err);
            setError(`Errore nel salvataggio: ${err?.message || "sconosciuto"}`);
        } finally {
            setIsSaving(false);
        }
    };

    const calcMod = (score: number) => {
        const mod = Math.floor((score - 10) / 2);
        return mod >= 0 ? `+${mod}` : `${mod}`;
    };

    const EXAMPLE_PROMPTS = entityType === "npc"
        ? ["Mercante halfling astuto di livello 3", "Guardia del corpo orchessa veterana", "Mago elfo oscuro di alto livello"]
        : ["Ragno gigante velenoso CR 2", "Golem di ferro guardiano di una cripta", "Drago rosso giovane"];

    return (
        <div className={styles.generatorContainer}>
            {/* Mode Toggle */}
            <div className={styles.modeToggle}>
                <button
                    className={`${styles.modeBtn} ${mode === "ai" ? styles.modeBtnActive : ""}`}
                    onClick={() => setMode("ai")}
                >
                    ✨ Generazione AI
                </button>
                <button
                    className={`${styles.modeBtn} ${mode === "manual" ? styles.modeBtnActive : ""}`}
                    onClick={() => setMode("manual")}
                >
                    ✏️ Creazione Manuale
                </button>
            </div>

            {/* Type Toggle */}
            <div className={styles.typeToggle}>
                <button
                    className={`${styles.typeBtn} ${entityType === "npc" ? styles.typeBtnActive : ""}`}
                    onClick={() => setEntityType("npc")}
                >
                    🧑 NPC
                </button>
                <button
                    className={`${styles.typeBtn} ${entityType === "monster" ? styles.typeBtnActive : ""}`}
                    onClick={() => setEntityType("monster")}
                >
                    🐉 Mostro
                </button>
            </div>

            {mode === "ai" ? (
                /* ===== AI MODE ===== */
                <div className={styles.aiMode}>
                    <div className={styles.promptSection}>
                        <label className={styles.promptLabel}>
                            Descrivi {entityType === "npc" ? "l'NPC" : "il Mostro"} che vuoi creare:
                        </label>
                        <textarea
                            className={styles.promptInput}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={`Es: "${EXAMPLE_PROMPTS[0]}"`}
                            rows={3}
                        />
                        <div className={styles.examplePrompts}>
                            {EXAMPLE_PROMPTS.map((ex, i) => (
                                <button key={i} className={styles.exampleBtn} onClick={() => setPrompt(ex)}>
                                    {ex}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        className={`btn btn-primary ${styles.generateBtn}`}
                        onClick={handleGenerate}
                        disabled={isGenerating || !prompt.trim()}
                    >
                        {isGenerating ? (
                            <span className={styles.loadingText}>
                                <span className={styles.loadingDice}>🎲</span>
                                Magia in corso...
                            </span>
                        ) : (
                            `✨ Genera ${entityType === "npc" ? "NPC" : "Mostro"}`
                        )}
                    </button>

                    {error && (
                        <div className={styles.errorBanner}>
                            ⚠️ {error}
                        </div>
                    )}

                    {generated && (
                        <EntityCard
                            entity={generated}
                            entityType={entityType}
                            calcMod={calcMod}
                            onSave={() => handleSave(generated)}
                            isSaving={isSaving}
                        />
                    )}
                </div>
            ) : (
                /* ===== MANUAL MODE ===== */
                <ManualForm
                    data={manualData}
                    setData={setManualData}
                    entityType={entityType}
                    onSave={() => handleSave(manualData)}
                    isSaving={isSaving}
                />
            )}
        </div>
    );
}

/* ===== Entity Card Component ===== */
function EntityCard({
    entity, entityType, calcMod, onSave, isSaving
}: {
    entity: GeneratedEntity;
    entityType: string;
    calcMod: (n: number) => string;
    onSave: () => void;
    isSaving: boolean;
}) {
    return (
        <div className={`${styles.resultCard} fade-in`}>
            <div className={styles.resultHeader}>
                <div className={styles.resultTitle}>
                    <h3>{entity.name}</h3>
                    <div className={styles.resultSubtitle}>
                        {entity.race} • {entity.role}
                        {entity.challenge_rating && ` • CR ${entity.challenge_rating}`}
                    </div>
                    {entity.alignment && (
                        <div className={styles.alignmentBadge}>{entity.alignment}</div>
                    )}
                </div>
                <div className={styles.combatStats}>
                    <div className={`${styles.statBadge} ${styles.ac}`}>
                        <span className={styles.statLabel}>AC</span>
                        <span className={styles.statValue}>{entity.ac}</span>
                    </div>
                    <div className={`${styles.statBadge} ${styles.hp}`}>
                        <span className={styles.statLabel}>HP</span>
                        <span className={styles.statValue}>{entity.hp}</span>
                    </div>
                </div>
            </div>

            <div className={styles.abilityScores}>
                {Object.entries(entity.stats).map(([stat, val]) => (
                    <div key={stat} className={styles.scoreItem}>
                        <span className={styles.scoreLabel}>{stat.toUpperCase()}</span>
                        <span className={styles.scoreVal}>{val}</span>
                        <span className={styles.scoreMod}>{calcMod(val)}</span>
                    </div>
                ))}
            </div>

            {entity.traits.length > 0 && (
                <div className={styles.traitsSection}>
                    <h4>{entityType === "monster" ? "Tratti Speciali" : "Tratti & Personalità"}</h4>
                    {entity.traits.map((t, i) => (
                        <div key={i} className={styles.traitItem}>
                            <strong>{t.name}:</strong> {t.description}
                        </div>
                    ))}
                </div>
            )}

            {entity.actions.length > 0 && (
                <div className={styles.traitsSection} style={{ marginTop: '16px' }}>
                    <h4>Azioni & Combattimento</h4>
                    {entity.actions.map((a, i) => (
                        <div key={i} className={styles.traitItem}>
                            <strong>{a.name}:</strong> {a.description}
                        </div>
                    ))}
                </div>
            )}

            {entity.equipment.length > 0 && (
                <div className={styles.traitsSection} style={{ marginTop: '16px' }}>
                    <h4>Equipaggiamento</h4>
                    <div className={styles.traitItem} style={{ color: "var(--text-secondary)" }}>
                        {entity.equipment.join(", ")}
                    </div>
                </div>
            )}

            {entity.notes && (
                <div className={styles.traitsSection} style={{ marginTop: '16px' }}>
                    <h4>📝 Note per il DM</h4>
                    <div className={styles.traitItem} style={{ fontStyle: "italic", color: "var(--text-secondary)" }}>
                        {entity.notes}
                    </div>
                </div>
            )}

            <div className={styles.actions}>
                <button
                    className={`btn ${styles.saveBtn}`}
                    onClick={onSave}
                    disabled={isSaving}
                >
                    {isSaving ? "Salvataggio..." : "💾 Salva in Campagna"}
                </button>
            </div>
        </div>
    );
}

/* ===== Manual Creation Form ===== */
function ManualForm({
    data, setData, entityType, onSave, isSaving,
}: {
    data: GeneratedEntity;
    setData: (d: GeneratedEntity) => void;
    entityType: string;
    onSave: () => void;
    isSaving: boolean;
}) {
    const updateStat = (stat: keyof GeneratedEntity["stats"], val: number) => {
        setData({ ...data, stats: { ...data.stats, [stat]: val } });
    };

    const addTrait = () => {
        setData({ ...data, traits: [...data.traits, { name: "", description: "" }] });
    };
    const updateTrait = (i: number, field: "name" | "description", val: string) => {
        const traits = [...data.traits];
        traits[i] = { ...traits[i], [field]: val };
        setData({ ...data, traits });
    };
    const removeTrait = (i: number) => {
        setData({ ...data, traits: data.traits.filter((_, idx) => idx !== i) });
    };

    const addAction = () => {
        setData({ ...data, actions: [...data.actions, { name: "", description: "" }] });
    };
    const updateAction = (i: number, field: "name" | "description", val: string) => {
        const actions = [...data.actions];
        actions[i] = { ...actions[i], [field]: val };
        setData({ ...data, actions });
    };
    const removeAction = (i: number) => {
        setData({ ...data, actions: data.actions.filter((_, idx) => idx !== i) });
    };

    const isValid = data.name.trim() !== "" && data.race.trim() !== "";

    return (
        <div className={styles.manualForm}>
            {/* Identity Row */}
            <div className={styles.manualRow}>
                <div className={styles.manualField}>
                    <label>Nome *</label>
                    <input
                        type="text"
                        value={data.name}
                        onChange={(e) => setData({ ...data, name: e.target.value })}
                        placeholder={entityType === "npc" ? "Es: Gareth il Silenzioso" : "Es: Basilisco Infernale"}
                    />
                </div>
                <div className={styles.manualField}>
                    <label>{entityType === "npc" ? "Razza *" : "Tipo Creatura *"}</label>
                    <input
                        type="text"
                        value={data.race}
                        onChange={(e) => setData({ ...data, race: e.target.value })}
                        placeholder={entityType === "npc" ? "Es: Elfo" : "Es: Bestia"}
                    />
                </div>
            </div>

            <div className={styles.manualRow}>
                <div className={styles.manualField}>
                    <label>{entityType === "npc" ? "Ruolo / Classe" : "Sottotipo"}</label>
                    <input
                        type="text"
                        value={data.role}
                        onChange={(e) => setData({ ...data, role: e.target.value })}
                        placeholder={entityType === "npc" ? "Es: Mercante" : "Es: Guardiano"}
                    />
                </div>
                <div className={styles.manualField}>
                    <label>Allineamento</label>
                    <input
                        type="text"
                        value={data.alignment}
                        onChange={(e) => setData({ ...data, alignment: e.target.value })}
                        placeholder="Es: Neutrale Malvagio"
                    />
                </div>
                <div className={styles.manualField}>
                    <label>CR</label>
                    <input
                        type="text"
                        value={data.challenge_rating}
                        onChange={(e) => setData({ ...data, challenge_rating: e.target.value })}
                        placeholder="Es: 5"
                    />
                </div>
            </div>

            {/* Combat Stats */}
            <div className={styles.manualRow}>
                <div className={styles.manualField} style={{ maxWidth: 100 }}>
                    <label>HP</label>
                    <input type="number" value={data.hp} onChange={(e) => setData({ ...data, hp: parseInt(e.target.value) || 0 })} />
                </div>
                <div className={styles.manualField} style={{ maxWidth: 100 }}>
                    <label>AC</label>
                    <input type="number" value={data.ac} onChange={(e) => setData({ ...data, ac: parseInt(e.target.value) || 0 })} />
                </div>
            </div>

            {/* Ability Scores */}
            <div className={styles.manualStatsGrid}>
                {(["str", "dex", "con", "int", "wis", "cha"] as const).map(stat => (
                    <div key={stat} className={styles.manualStatItem}>
                        <label>{stat.toUpperCase()}</label>
                        <input
                            type="number"
                            min={1} max={30}
                            value={data.stats[stat]}
                            onChange={(e) => updateStat(stat, parseInt(e.target.value) || 10)}
                        />
                    </div>
                ))}
            </div>

            {/* Traits */}
            <div className={styles.manualListSection}>
                <div className={styles.manualListHeader}>
                    <h4>Tratti</h4>
                    <button className={styles.addItemBtn} onClick={addTrait}>+ Aggiungi</button>
                </div>
                {data.traits.map((t, i) => (
                    <div key={i} className={styles.manualListItem}>
                        <input placeholder="Nome tratto" value={t.name} onChange={(e) => updateTrait(i, "name", e.target.value)} />
                        <input placeholder="Descrizione" value={t.description} onChange={(e) => updateTrait(i, "description", e.target.value)} />
                        <button className={styles.removeItemBtn} onClick={() => removeTrait(i)}>✕</button>
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className={styles.manualListSection}>
                <div className={styles.manualListHeader}>
                    <h4>Azioni</h4>
                    <button className={styles.addItemBtn} onClick={addAction}>+ Aggiungi</button>
                </div>
                {data.actions.map((a, i) => (
                    <div key={i} className={styles.manualListItem}>
                        <input placeholder="Nome azione" value={a.name} onChange={(e) => updateAction(i, "name", e.target.value)} />
                        <input placeholder="Descrizione" value={a.description} onChange={(e) => updateAction(i, "description", e.target.value)} />
                        <button className={styles.removeItemBtn} onClick={() => removeAction(i)}>✕</button>
                    </div>
                ))}
            </div>

            {/* Notes */}
            <div className={styles.manualField}>
                <label>Note</label>
                <textarea
                    value={data.notes}
                    onChange={(e) => setData({ ...data, notes: e.target.value })}
                    placeholder="Note per il DM..."
                    rows={3}
                />
            </div>

            <button
                className={`btn btn-primary ${styles.generateBtn}`}
                onClick={onSave}
                disabled={isSaving || !isValid}
            >
                {isSaving ? "Salvataggio..." : "💾 Salva in Campagna"}
            </button>
        </div>
    );
}
