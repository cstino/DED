"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./NpcGenerator.module.css";

interface NpcListProps {
    campaignId: string;
    refreshTrigger: number;
}

interface SavedNpc {
    id: string;
    name: string;
    race: string;
    role: string;
    hp: number;
    ac: number;
    type: string;
    challenge_rating: string | null;
    alignment: string;
    notes: string;
    traits: { name: string; description: string }[];
    stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
    is_alive: boolean;
    is_party_member: boolean;
}

export default function NpcList({ campaignId, refreshTrigger }: NpcListProps) {
    const [npcs, setNpcs] = useState<SavedNpc[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
        async function fetchNpcs() {
            setLoading(true);
            const { data, error } = await supabase
                .from('npcs')
                .select('*')
                .eq('campaign_id', campaignId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                const mapped: SavedNpc[] = data.map(n => ({
                    id: n.id,
                    name: n.name,
                    race: n.race || "",
                    role: n.role || "",
                    hp: n.hp || 10,
                    ac: n.ac || 10,
                    type: n.type || "npc",
                    challenge_rating: n.challenge_rating,
                    alignment: n.alignment || "",
                    notes: n.description || n.notes || "",
                    traits: Array.isArray(n.traits) ? n.traits : [],
                    stats: n.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
                    is_alive: n.is_alive !== false,
                    is_party_member: n.is_party_member || false,
                }));
                setNpcs(mapped);
            }
            setLoading(false);
        }

        fetchNpcs();
    }, [campaignId, refreshTrigger]);

    const calcMod = (score: number) => {
        const mod = Math.floor((score - 10) / 2);
        return mod >= 0 ? `+${mod}` : `${mod}`;
    };

    if (loading) return <p className="text-secondary">Caricamento Compendio...</p>;

    if (npcs.length === 0) return <p className="text-secondary">Nessun NPC o mostro generato ancora.</p>;

    const npcItems = npcs.filter(n => n.type !== "monster");
    const monsterItems = npcs.filter(n => n.type === "monster");

    return (
        <div className={styles.npcListContainer}>
            {npcItems.length > 0 && (
                <>
                    <h4 className={styles.listSectionTitle}>🧑 NPC ({npcItems.length})</h4>
                    <div className={styles.npcGrid}>
                        {npcItems.map(npc => (
                            <NpcCard
                                key={npc.id}
                                npc={npc}
                                isExpanded={expanded === npc.id}
                                onToggle={() => setExpanded(expanded === npc.id ? null : npc.id)}
                                calcMod={calcMod}
                                onDelete={() => {
                                    setNpcs(prev => prev.filter(n => n.id !== npc.id));
                                }}
                            />
                        ))}
                    </div>
                </>
            )}

            {monsterItems.length > 0 && (
                <>
                    <h4 className={styles.listSectionTitle} style={{ marginTop: "24px" }}>🐉 Mostri ({monsterItems.length})</h4>
                    <div className={styles.npcGrid}>
                        {monsterItems.map(npc => (
                            <NpcCard
                                key={npc.id}
                                npc={npc}
                                isExpanded={expanded === npc.id}
                                onToggle={() => setExpanded(expanded === npc.id ? null : npc.id)}
                                calcMod={calcMod}
                                onDelete={() => {
                                    setNpcs(prev => prev.filter(n => n.id !== npc.id));
                                }}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function NpcCard({ npc, isExpanded, onToggle, calcMod, onDelete }: {
    npc: SavedNpc;
    isExpanded: boolean;
    onToggle: () => void;
    calcMod: (n: number) => string;
    onDelete: () => void;
}) {
    return (
        <div className={`${styles.npcCard} ${isExpanded ? styles.npcCardExpanded : ""}`}>
            <div className={styles.npcCardHeader} onClick={onToggle}>
                <div className={styles.npcCardTitle}>
                    <h3>{npc.name}</h3>
                    <span className={styles.npcCardSub}>
                        {npc.race} • {npc.role}
                        {npc.challenge_rating && ` • CR ${npc.challenge_rating}`}
                    </span>
                </div>
                <div className={styles.npcCardBadges}>
                    <span className={styles.npcBadgeAc}>AC {npc.ac}</span>
                    <span className={styles.npcBadgeHp}>HP {npc.hp}</span>
                </div>
            </div>

            {isExpanded && (
                <div className={styles.npcCardBody}>
                    {/* Ability Scores */}
                    <div className={styles.npcCardStats}>
                        {Object.entries(npc.stats).map(([stat, val]) => (
                            <div key={stat} className={styles.npcStatItem}>
                                <span className={styles.npcStatLabel}>{stat.toUpperCase()}</span>
                                <span className={styles.npcStatVal}>{val} ({calcMod(val)})</span>
                            </div>
                        ))}
                    </div>

                    {/* Traits */}
                    {npc.traits.length > 0 && (
                        <div className={styles.npcCardTraits}>
                            {npc.traits.map((t, i) => (
                                <div key={i} className={styles.npcTraitItem}>
                                    <strong>{t.name}:</strong> {t.description}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Notes */}
                    {npc.notes && (
                        <div className={styles.npcCardNotes}>
                            <em>{npc.notes}</em>
                        </div>
                    )}

                    <button
                        className={styles.npcDeleteBtn}
                        onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm("Sei sicuro di voler eliminare?")) {
                                await supabase.from('npcs').delete().eq('id', npc.id);
                                onDelete();
                            }
                        }}
                    >
                        🗑️ Elimina
                    </button>
                </div>
            )}
        </div>
    );
}
