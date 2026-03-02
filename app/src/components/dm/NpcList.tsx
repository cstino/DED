"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { GeneratedNPC } from "@/lib/generators/npcGenerator";
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
    notes: string;
}

export default function NpcList({ campaignId, refreshTrigger }: NpcListProps) {
    const [npcs, setNpcs] = useState<SavedNpc[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchNpcs() {
            setLoading(true);
            const { data, error } = await supabase
                .from('npcs')
                .select('*')
                .eq('campaign_id', campaignId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                // Map the DB structure to our simplified view model
                const mapped = data.map(n => ({
                    id: n.id,
                    name: n.name,
                    race: n.race,
                    role: n.role,
                    hp: n.stats?.con ? n.stats.con * 2 : 10, // Backup display
                    ac: 10, // Backup display
                    notes: n.description || ""
                }));
                // In a real app we'd save scalar HP/AC or compute from JSONB stats directly in query
                setNpcs(mapped);
            }
            setLoading(false);
        }

        fetchNpcs();
    }, [campaignId, refreshTrigger]);

    if (loading) return <p className="text-secondary">Caricamento Compendio...</p>;

    if (npcs.length === 0) return <p className="text-secondary">Nessun NPC generato ancora.</p>;

    return (
        <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", marginTop: "24px" }}>
            {npcs.map(npc => (
                <div key={npc.id} className="card">
                    <h3 style={{ margin: "0 0 4px 0" }}>{npc.name}</h3>
                    <p className="text-secondary" style={{ fontSize: "0.85rem", margin: "0 0 12px 0" }}>
                        {npc.race} • {npc.role}
                    </p>
                    <p style={{ fontSize: "0.9rem" }}>{npc.notes}</p>
                    <hr style={{ borderColor: "var(--border-color)", margin: "12px 0" }} />
                    <button
                        className="btn btn-secondary"
                        style={{ width: "100%", padding: "6px" }}
                        onClick={async () => {
                            if (confirm("Sei sicuro di voler eliminare questo NPC?")) {
                                await supabase.from('npcs').delete().eq('id', npc.id);
                                // Trigger refresh locally by filtering
                                setNpcs(prev => prev.filter(n => n.id !== npc.id));
                            }
                        }}
                    >
                        🗑️ Elimina
                    </button>
                </div>
            ))}
        </div>
    );
}
