"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    generateNPC,
    GeneratedNPC,
    NpcRace,
    NpcRole,
    NpcPowerLevel
} from "@/lib/generators/npcGenerator";
import styles from "./NpcGenerator.module.css";

interface NpcGeneratorProps {
    campaignId: string;
    onSaved?: () => void;
}

export default function NpcGenerator({ campaignId, onSaved }: NpcGeneratorProps) {
    const [race, setRace] = useState<NpcRace>("Umano");
    const [role, setRole] = useState<NpcRole>("Guardia");
    const [powerLevel, setPowerLevel] = useState<NpcPowerLevel>("Medio");

    const [npc, setNpc] = useState<GeneratedNPC | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    const RACES: NpcRace[] = ["Umano", "Elfo", "Nano", "Halfling", "Orco", "Tiefling", "Draconico"];
    const ROLES: NpcRole[] = ["Guardia", "Bandito", "Mago", "Sacerdote", "Assassino", "Civile", "Nobile"];
    const POWERS: NpcPowerLevel[] = ["Basso", "Medio", "Alto", "Boss"];

    const handleGenerate = () => {
        setIsAnimating(true);
        setTimeout(() => {
            const result = generateNPC(race, role, powerLevel);
            setNpc(result);
            setIsAnimating(false);
        }, 150); // Small delay for visual effect
    };

    const handleSave = async () => {
        if (!npc) return;
        setIsSaving(true);

        try {
            const { error } = await supabase.from('npcs').insert({
                campaign_id: campaignId,
                name: npc.name,
                description: `Generato proceduralmente. Livello di potenza: ${powerLevel}`,
                race: npc.race,
                role: npc.role,
                alignment: "Neutrale",
                is_alive: true,
                stats: npc.stats,
                traits: [
                    ...npc.traits,
                    { name: "Equipaggiamento", description: npc.equipment.join(", ") },
                    ...npc.actions.map(a => ({ name: `Azione: ${a.name}`, description: a.description }))
                ],
                notes: npc.notes
            });

            if (error) throw error;

            if (onSaved) onSaved();
            setNpc(null); // Reset after save

        } catch (error) {
            console.error("Failed to save NPC:", error);
            alert("Errore nel salvataggio dell'NPC.");
        } finally {
            setIsSaving(false);
        }
    };

    const calcMod = (score: number) => {
        const mod = Math.floor((score - 10) / 2);
        return mod >= 0 ? `+${mod}` : `${mod}`;
    };

    return (
        <div className={styles.generatorContainer}>
            <div className={styles.controls}>
                <div className={styles.controlGroup}>
                    <label>Razza</label>
                    <select
                        className={styles.select}
                        value={race}
                        onChange={(e) => setRace(e.target.value as NpcRace)}
                    >
                        {RACES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>

                <div className={styles.controlGroup}>
                    <label>Ruolo / Archetipo</label>
                    <select
                        className={styles.select}
                        value={role}
                        onChange={(e) => setRole(e.target.value as NpcRole)}
                    >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>

                <div className={styles.controlGroup}>
                    <label>Grado di Sfida (Simulato)</label>
                    <select
                        className={styles.select}
                        value={powerLevel}
                        onChange={(e) => setPowerLevel(e.target.value as NpcPowerLevel)}
                    >
                        {POWERS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>

                <button
                    className={`btn btn-primary ${styles.generateBtn} ${isAnimating ? "pulse-anim" : ""}`}
                    onClick={handleGenerate}
                >
                    ✨ Genera NPC
                </button>
            </div>

            {npc && (
                <div className={`${styles.resultCard} fade-in`}>
                    <div className={styles.resultHeader}>
                        <div className={styles.resultTitle}>
                            <h3>{npc.name}</h3>
                            <div className={styles.resultSubtitle}>
                                {npc.race} • {npc.role}
                            </div>
                        </div>
                        <div className={styles.combatStats}>
                            <div className={`${styles.statBadge} ${styles.ac}`}>
                                <span className={styles.statLabel}>AC</span>
                                <span className={styles.statValue}>{npc.ac}</span>
                            </div>
                            <div className={`${styles.statBadge} ${styles.hp}`}>
                                <span className={styles.statLabel}>HP</span>
                                <span className={styles.statValue}>{npc.hp}</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.abilityScores}>
                        {Object.entries(npc.stats).map(([stat, val]) => (
                            <div key={stat} className={styles.scoreItem}>
                                <span className={styles.scoreLabel}>{stat}</span>
                                <span className={styles.scoreVal}>{val}</span>
                                <span className={styles.scoreMod}>{calcMod(val)}</span>
                            </div>
                        ))}
                    </div>

                    <div className={styles.traitsSection}>
                        <h4>Tratti & Personalità</h4>
                        {npc.traits.map((t, i) => (
                            <div key={i} className={styles.traitItem}>
                                <strong>{t.name}:</strong> {t.description}
                            </div>
                        ))}
                        {npc.notes && (
                            <div className={styles.traitItem} style={{ marginTop: '8px' }}>
                                <strong>Info:</strong> {npc.notes}
                            </div>
                        )}
                    </div>

                    <div className={styles.traitsSection} style={{ marginTop: '16px' }}>
                        <h4>Azioni & Combattimento</h4>
                        {npc.actions.map((a, i) => (
                            <div key={i} className={styles.traitItem}>
                                <strong>{a.name}:</strong> {a.description}
                            </div>
                        ))}
                    </div>

                    <div className={styles.traitsSection} style={{ marginTop: '16px' }}>
                        <h4>Equipaggiamento</h4>
                        <div className={styles.traitItem} style={{ color: "var(--text-secondary)" }}>
                            {npc.equipment.join(", ")}
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button
                            className={`btn ${styles.saveBtn}`}
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? "Salvataggio..." : "💾 Salva in Campagna"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
