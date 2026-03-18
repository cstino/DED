"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { calculateEquipmentBonuses, type EquipmentItem } from "@/components/character/EquipmentManager";
import { Heart, Swords } from "lucide-react";
import styles from "./CombatTracker.module.css";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Combatant {
    id: string;
    source_id: string;
    name: string;
    type: "pc" | "npc";
    initiative: number;
    hp_current: number;
    hp_max: number;
    ac: number;
    portrait_url: string | null;
    user_id: string | null;
    race: string;
    class_or_role: string;
    conditions: string[];
}

interface CombatSession {
    id: string;
    campaign_id: string;
    is_active: boolean;
    current_turn_index: number;
    round_number: number;
    combatants: Combatant[];
    created_at: string;
    updated_at: string;
}

interface Character {
    id: string;
    name: string;
    race: string;
    class: string;
    subclass: string | null;
    level: number;
    hp_current: number;
    hp_max: number;
    ac: number;
    user_id: string;
    portrait_url: string | null;
    ability_scores?: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
    equipment?: EquipmentItem[];
}

interface Npc {
    id: string;
    name: string;
    race: string;
    role: string;
    hp: number;
    ac: number;
    type: string;
    portrait_url?: string | null;
    stats?: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
    challenge_rating?: string | null;
    alignment?: string;
    notes?: string;
    traits?: { name: string; description: string }[];
    is_alive?: boolean;
}

interface CombatTrackerProps {
    campaignId: string;
    isMaster: boolean;
}

type Phase = "idle" | "setup" | "initiative" | "active";

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CombatTracker({ campaignId, isMaster }: CombatTrackerProps) {
    const { user } = useAuth();
    const router = useRouter();

    // NPC detail modal
    const [npcDetail, setNpcDetail] = useState<Npc | null>(null);

    // Phase
    const [phase, setPhase] = useState<Phase>("idle");
    const [loading, setLoading] = useState(true);

    // Data
    const [session, setSession] = useState<CombatSession | null>(null);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [npcs, setNpcs] = useState<Npc[]>([]);

    // Setup selections
    const [selectedPCs, setSelectedPCs] = useState<Set<string>>(new Set());
    const [selectedNPCs, setSelectedNPCs] = useState<Set<string>>(new Set());
    const [npcQuantities, setNpcQuantities] = useState<Record<string, number>>({});

    // Initiative
    const [combatants, setCombatants] = useState<Combatant[]>([]);

    // HP Dialog
    const [hpDialog, setHpDialog] = useState<{ combatantId: string; name: string; mode: "damage" | "heal" } | null>(null);
    const [hpAmount, setHpAmount] = useState("");
    const hpInputRef = useRef<HTMLInputElement>(null);

    // Glow notification for players
    const [showGlow, setShowGlow] = useState(false);
    const [glowCharName, setGlowCharName] = useState("");

    // ─── Load existing session or data ───────────────────────────────────────
    useEffect(() => {
        async function load() {
            setLoading(true);

            // Check for active combat session
            const { data: activeSession } = await supabase
                .from("combat_sessions")
                .select("*")
                .eq("campaign_id", campaignId)
                .eq("is_active", true)
                .single();

            if (activeSession) {
                setSession(activeSession);
                setCombatants(activeSession.combatants || []);
                setPhase("active");
            }

            // Load characters and NPCs for setup
            const [charsRes, npcsRes] = await Promise.all([
                supabase.from("characters").select("*").eq("campaign_id", campaignId),
                supabase.from("npcs").select("*").eq("campaign_id", campaignId),
            ]);

            if (charsRes.data) setCharacters(charsRes.data);
            if (npcsRes.data) {
                setNpcs(
                    npcsRes.data.map((n: any) => ({
                        id: n.id,
                        name: n.name,
                        race: n.race || "",
                        role: n.role || "",
                        hp: n.hp || 10,
                        ac: n.ac || 10,
                        type: n.type || "npc",
                        portrait_url: n.portrait_url,
                        stats: n.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
                        challenge_rating: n.challenge_rating || null,
                        alignment: n.alignment || "",
                        notes: n.notes || "",
                        traits: n.traits || [],
                        is_alive: n.is_alive ?? true,
                    }))
                );
            }

            setLoading(false);
        }

        load();
    }, [campaignId]);

    // ─── Supabase Realtime for player notifications ──────────────────────────
    useEffect(() => {
        if (!user || !campaignId) return;

        const channel = supabase
            .channel(`combat-${campaignId}`)
            .on("broadcast", { event: "turn_change" }, (payload: any) => {
                const { currentCombatant, combatants: updatedCombatants, round_number, current_turn_index } = payload.payload;

                // Update combatants for everyone
                if (updatedCombatants) {
                    setCombatants(updatedCombatants);
                    setSession((prev) =>
                        prev
                            ? { ...prev, combatants: updatedCombatants, round_number, current_turn_index }
                            : prev
                    );
                }

                // If this player owns the current combatant, show glow!
                if (currentCombatant?.user_id === user.id && currentCombatant?.type === "pc") {
                    setGlowCharName(currentCombatant.name);
                    setShowGlow(true);
                    setTimeout(() => setShowGlow(false), 5000);
                }
            })
            .on("broadcast", { event: "combat_started" }, (payload: any) => {
                const { session: newSession } = payload.payload;
                if (newSession) {
                    setSession(newSession);
                    setCombatants(newSession.combatants || []);
                    setPhase("active");
                }
            })
            .on("broadcast", { event: "combat_ended" }, () => {
                setSession(null);
                setCombatants([]);
                setPhase("idle");
            })
            .on("broadcast", { event: "hp_update" }, (payload: any) => {
                const { combatants: updatedCombatants } = payload.payload;
                if (updatedCombatants) {
                    setCombatants(updatedCombatants);
                    setSession((prev) =>
                        prev ? { ...prev, combatants: updatedCombatants } : prev
                    );
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, campaignId]);

    // ─── Setup Handlers ──────────────────────────────────────────────────────

    function togglePC(id: string) {
        setSelectedPCs((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function toggleNPC(id: string) {
        setSelectedNPCs((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function proceedToInitiative() {
        const newCombatants: Combatant[] = [];

        // Add selected PCs — include equipment AC bonuses
        characters
            .filter((c) => selectedPCs.has(c.id))
            .forEach((c) => {
                const equipBonus = calculateEquipmentBonuses(c.equipment || [])["ac"] || 0;
                newCombatants.push({
                    id: crypto.randomUUID(),
                    source_id: c.id,
                    name: c.name,
                    type: "pc",
                    initiative: 0,
                    hp_current: c.hp_current,
                    hp_max: c.hp_max,
                    ac: c.ac + equipBonus,
                    portrait_url: c.portrait_url,
                    user_id: c.user_id,
                    race: c.race,
                    class_or_role: `${c.class}${c.subclass ? ` (${c.subclass})` : ""}`,
                    conditions: [],
                });
            });

        // Add selected NPCs — multiple copies based on quantity
        npcs
            .filter((n) => selectedNPCs.has(n.id))
            .forEach((n) => {
                const qty = npcQuantities[n.id] || 1;
                for (let i = 0; i < qty; i++) {
                    newCombatants.push({
                        id: crypto.randomUUID(),
                        source_id: n.id,
                        name: qty > 1 ? `${n.name} #${i + 1}` : n.name,
                        type: "npc",
                        initiative: 0,
                        hp_current: n.hp,
                        hp_max: n.hp,
                        ac: n.ac,
                        portrait_url: n.portrait_url || null,
                        user_id: null,
                        race: n.race,
                        class_or_role: n.role,
                        conditions: [],
                    });
                }
            });

        setCombatants(newCombatants);
        setPhase("initiative");
    }

    function setInitiative(combatantId: string, value: number) {
        setCombatants((prev) =>
            prev.map((c) => (c.id === combatantId ? { ...c, initiative: value } : c))
        );
    }

    async function startCombat() {
        // Sort by initiative descending
        const sorted = [...combatants].sort((a, b) => b.initiative - a.initiative);

        const { data, error } = await supabase
            .from("combat_sessions")
            .insert({
                campaign_id: campaignId,
                is_active: true,
                current_turn_index: 0,
                round_number: 1,
                combatants: sorted,
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating combat session:", error);
            alert("Errore nella creazione della sessione di combattimento.");
            return;
        }

        setSession(data);
        setCombatants(sorted);
        setPhase("active");

        // Broadcast to all players
        supabase.channel(`combat-${campaignId}`).send({
            type: "broadcast",
            event: "combat_started",
            payload: { session: data },
        });

        // If first combatant is a PC, notify that player
        if (sorted[0]?.type === "pc" && sorted[0]?.user_id) {
            supabase.channel(`combat-${campaignId}`).send({
                type: "broadcast",
                event: "turn_change",
                payload: {
                    currentCombatant: sorted[0],
                    combatants: sorted,
                    round_number: 1,
                    current_turn_index: 0,
                },
            });
        }
    }

    // ─── Active Combat Handlers ──────────────────────────────────────────────

    const advanceTurn = useCallback(async () => {
        if (!session) return;

        let nextIndex = (session.current_turn_index + 1) % combatants.length;
        let nextRound = session.round_number;

        // If we wrapped around, increment round
        if (nextIndex === 0) {
            nextRound += 1;
        }

        // Skip dead combatants
        let attempts = 0;
        while (combatants[nextIndex]?.hp_current <= 0 && attempts < combatants.length) {
            nextIndex = (nextIndex + 1) % combatants.length;
            if (nextIndex === 0) nextRound += 1;
            attempts++;
        }

        const updatedSession = {
            current_turn_index: nextIndex,
            round_number: nextRound,
            updated_at: new Date().toISOString(),
        };

        await supabase
            .from("combat_sessions")
            .update(updatedSession)
            .eq("id", session.id);

        setSession((prev) => (prev ? { ...prev, ...updatedSession } : prev));

        // Broadcast turn change
        supabase.channel(`combat-${campaignId}`).send({
            type: "broadcast",
            event: "turn_change",
            payload: {
                currentCombatant: combatants[nextIndex],
                combatants,
                round_number: nextRound,
                current_turn_index: nextIndex,
            },
        });
    }, [session, combatants, campaignId]);

    async function endCombat() {
        if (!session) return;
        if (!confirm("Sei sicuro di voler terminare il combattimento?")) return;

        await supabase
            .from("combat_sessions")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("id", session.id);

        // Sync HP back to source tables
        for (const c of combatants) {
            if (c.type === "pc") {
                await supabase
                    .from("characters")
                    .update({ hp_current: Math.max(0, c.hp_current) })
                    .eq("id", c.source_id);
            }
        }

        // Broadcast end
        supabase.channel(`combat-${campaignId}`).send({
            type: "broadcast",
            event: "combat_ended",
            payload: {},
        });

        setSession(null);
        setCombatants([]);
        setPhase("idle");
    }

    // ─── HP Handlers ─────────────────────────────────────────────────────────

    function openHpDialog(combatantId: string, name: string, mode: "damage" | "heal") {
        setHpDialog({ combatantId, name, mode });
        setHpAmount("");
        setTimeout(() => hpInputRef.current?.focus(), 100);
    }

    async function applyHpChange(mode: "damage" | "heal") {
        if (!hpDialog || !hpAmount) return;
        const amount = parseInt(hpAmount);
        if (isNaN(amount) || amount <= 0) return;

        const updated = combatants.map((c) => {
            if (c.id === hpDialog.combatantId) {
                const newHp =
                    mode === "damage"
                        ? Math.max(-c.hp_max, c.hp_current - amount)
                        : Math.min(c.hp_max, c.hp_current + amount);
                return { ...c, hp_current: newHp };
            }
            return c;
        });

        setCombatants(updated);
        setHpDialog(null);

        if (session) {
            await supabase
                .from("combat_sessions")
                .update({ combatants: updated, updated_at: new Date().toISOString() })
                .eq("id", session.id);

            // Broadcast HP update
            supabase.channel(`combat-${campaignId}`).send({
                type: "broadcast",
                event: "hp_update",
                payload: { combatants: updated },
            });
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    function getHpPercent(current: number, max: number) {
        return Math.max(0, Math.min(100, ((current + max) / (2 * max)) * 100));
    }

    function getHpColor(percent: number) {
        if (percent > 75) return "var(--hp-green)";
        if (percent > 50) return "var(--hp-yellow)";
        return "var(--hp-red)";
    }

    function calcMod(score: number) {
        const mod = Math.floor((score - 10) / 2);
        return mod >= 0 ? `+${mod}` : `${mod}`;
    }

    // ─── Loading ─────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className={styles.combatIdle}>
                <p className="text-secondary">Caricamento...</p>
            </div>
        );
    }

    // ─── Render: Player View (non-DM) ────────────────────────────────────────

    if (!isMaster) {
        return (
            <>
                {/* Glow notification */}
                <div className={`${styles.glowOverlay} ${showGlow ? styles.glowOverlayActive : ""}`}>
                    <div className={styles.glowBorder} />
                    <div className={styles.glowOuter} />
                    {showGlow && (
                        <div className={styles.glowMessage}>
                            <div className={styles.glowMessageText}>⚔️ Tocca a te!</div>
                            <div className={styles.glowMessageSub}>{glowCharName}</div>
                        </div>
                    )}
                </div>

                {session && combatants.length > 0 ? (
                    <div className={styles.activeCombat}>
                        <div className={styles.combatTopBar}>
                            <span className={styles.roundBadge}>
                                Round {session.round_number}
                            </span>
                        </div>

                        {/* Current turn banner */}
                        {combatants[session.current_turn_index] && (
                            <div
                                className={`${styles.turnBanner} ${combatants[session.current_turn_index].type === "npc"
                                    ? styles.turnBannerNpc
                                    : ""
                                    }`}
                            >
                                <div className={styles.turnBannerLabel}>Turno di</div>
                                <div className={styles.turnBannerName}>
                                    {combatants[session.current_turn_index].name}
                                </div>
                            </div>
                        )}

                        {/* Combatant list (read-only for players) */}
                        <div className={styles.combatantsList}>
                            {combatants.map((c, idx) => {
                                const isActive = idx === session.current_turn_index;
                                const isDead = c.hp_current <= 0;
                                const hpPercent = getHpPercent(c.hp_current, c.hp_max);

                                return (
                                    <div
                                        key={c.id}
                                        className={`${styles.combatantCard} ${isActive ? styles.combatantCardActive : ""
                                            } ${isDead ? styles.combatantCardDead : ""} ${c.type === "npc" ? styles.combatantCardNpc : ""
                                            }`}
                                    >
                                        <span className={styles.initiativeNumber}>{c.initiative}</span>

                                        {c.portrait_url ? (
                                            <img
                                                src={c.portrait_url}
                                                alt=""
                                                className={styles.combatantAvatar}
                                            />
                                        ) : (
                                            <div
                                                className={`${styles.combatantAvatarFallback} ${c.type === "npc" ? styles.combatantCardNpc : ""
                                                    }`}
                                            >
                                                {c.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}

                                        <div className={styles.combatantInfo}>
                                            <div className={styles.combatantName}>
                                                {c.name}
                                                {c.type === "npc" && (
                                                    <span className={styles.npcBadge}>NPC</span>
                                                )}
                                                {isActive && (
                                                    <span className={styles.turnIndicator}>Turno</span>
                                                )}
                                            </div>
                                            <div className={styles.combatantSub}>
                                                {c.race} • {c.class_or_role}
                                            </div>
                                            <div className={styles.miniHpBar}>
                                                <div
                                                    className={styles.miniHpBarFill}
                                                    style={{
                                                        width: `${hpPercent}%`,
                                                        background: getHpColor(hpPercent),
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className={styles.combatantStats}>
                                            <div className={styles.combatStat}>
                                                <span className={styles.combatStatLabel}>AC</span>
                                                <span className={styles.combatStatValue}>{c.ac}</span>
                                            </div>
                                            <div className={styles.combatStat}>
                                                <span className={styles.combatStatLabel}>HP</span>
                                                <span className={styles.combatStatValue}>
                                                    {c.hp_current}/{c.hp_max}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className={styles.combatIdle}>
                        <div className={styles.combatIdleIcon}>🛡️</div>
                        <h2>Nessun Combattimento</h2>
                        <p>
                            Quando il DM avvierà un combattimento, lo vedrai apparire qui con l'ordine di
                            iniziativa e le informazioni dei combattenti.
                        </p>
                    </div>
                )}
            </>
        );
    }

    // ─── Render: DM Views ────────────────────────────────────────────────────

    // IDLE
    if (phase === "idle") {
        return (
            <div className={styles.combatIdle}>
                <div className={styles.combatIdleIcon}>⚔️</div>
                <h2>Combattimento</h2>
                <p>
                    Avvia un combattimento per tracciare l'iniziativa, gli HP e i turni di tutti i
                    combattenti. I giocatori vedranno in tempo reale quando tocca a loro!
                </p>
                <button className={styles.startCombatBtn} onClick={() => setPhase("setup")}>
                    ⚔️ Avvia Combattimento
                </button>
            </div>
        );
    }

    // SETUP — Select combatants
    if (phase === "setup") {
        return (
            <div className={styles.setupContainer}>
                <div className={styles.setupHeader}>
                    <h2>⚔️ Prepara Combattimento</h2>
                    <button className={styles.cancelBtn} onClick={() => setPhase("idle")}>
                        Annulla
                    </button>
                </div>

                {/* PCs */}
                <div className={styles.setupSection}>
                    <div className={styles.setupSectionTitle}>🎭 Personaggi Giocanti</div>
                    {characters.length === 0 ? (
                        <div className={styles.emptyPickList}>Nessun PG in questa campagna</div>
                    ) : (
                        <div className={styles.combatantPickList}>
                            {characters.map((c) => {
                                const selected = selectedPCs.has(c.id);
                                const equipBonus = calculateEquipmentBonuses(c.equipment || [])["ac"] || 0;
                                const totalAc = c.ac + equipBonus;
                                return (
                                    <div
                                        key={c.id}
                                        className={`${styles.combatantPickItem} ${selected ? styles.combatantPickItemSelected : ""
                                            }`}
                                        onClick={() => togglePC(c.id)}
                                    >
                                        <div
                                            className={`${styles.pickCheckbox} ${selected ? styles.pickCheckboxChecked : ""
                                                }`}
                                        >
                                            {selected ? "✓" : ""}
                                        </div>
                                        {c.portrait_url ? (
                                            <img
                                                src={c.portrait_url}
                                                alt=""
                                                className={styles.pickAvatar}
                                            />
                                        ) : (
                                            <div className={styles.pickAvatarFallback}>
                                                {c.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className={styles.pickInfo}>
                                            <div className={styles.pickName}>{c.name}</div>
                                            <div className={styles.pickSub}>
                                                {c.race} • {c.class}
                                                {c.subclass ? ` (${c.subclass})` : ""} • Lv.{c.level}
                                            </div>
                                        </div>
                                        <div className={styles.pickStats}>
                                            <span className={styles.pickStatBadge}>
                                                AC {totalAc}
                                            </span>
                                            <span className={styles.pickStatBadge}>
                                                HP {c.hp_current}/{c.hp_max}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* NPCs / Monsters */}
                <div className={styles.setupSection}>
                    <div className={`${styles.setupSectionTitle} ${styles.setupSectionTitleAmber}`}>
                        🐉 NPC e Mostri
                    </div>
                    {npcs.length === 0 ? (
                        <div className={styles.emptyPickList}>
                            Nessun NPC o Mostro generato. Creali prima nella sezione NPCs.
                        </div>
                    ) : (
                        <div className={styles.combatantPickList}>
                            {npcs.map((n) => {
                                const selected = selectedNPCs.has(n.id);
                                const qty = npcQuantities[n.id] || 1;
                                return (
                                    <div
                                        key={n.id}
                                        className={`${styles.combatantPickItem} ${selected ? styles.combatantPickItemSelectedNpc : ""
                                            }`}
                                    >
                                        <div
                                            className={`${styles.pickCheckbox} ${selected ? styles.pickCheckboxCheckedNpc : ""
                                                }`}
                                            onClick={() => toggleNPC(n.id)}
                                        >
                                            {selected ? "✓" : ""}
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 'var(--space-md)', cursor: 'pointer' }} onClick={() => toggleNPC(n.id)}>
                                            {n.portrait_url ? (
                                                <img
                                                    src={n.portrait_url}
                                                    alt=""
                                                    className={styles.pickAvatar}
                                                />
                                            ) : (
                                                <div
                                                    className={`${styles.pickAvatarFallback} ${styles.pickAvatarFallbackNpc}`}
                                                >
                                                    {n.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className={styles.pickInfo}>
                                                <div className={styles.pickName}>{n.name}</div>
                                                <div className={styles.pickSub}>
                                                    {n.race} • {n.role}
                                                </div>
                                            </div>
                                        </div>
                                        {selected && (
                                            <div className={styles.qtyControl} onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    className={styles.qtyBtn}
                                                    onClick={() => setNpcQuantities(prev => ({ ...prev, [n.id]: Math.max(1, qty - 1) }))}
                                                >
                                                    −
                                                </button>
                                                <span className={styles.qtyValue}>{qty}</span>
                                                <button
                                                    className={styles.qtyBtn}
                                                    onClick={() => setNpcQuantities(prev => ({ ...prev, [n.id]: Math.min(20, qty + 1) }))}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        )}
                                        <div className={styles.pickStats}>
                                            <span className={styles.pickStatBadge}>
                                                AC {n.ac}
                                            </span>
                                            <span className={styles.pickStatBadge}>
                                                HP {n.hp}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className={styles.setupActions}>
                    <button className={styles.backBtn} onClick={() => setPhase("idle")}>
                        ← Annulla
                    </button>
                    <button
                        className={styles.confirmBtn}
                        disabled={selectedPCs.size + selectedNPCs.size === 0}
                        onClick={proceedToInitiative}
                    >
                        Assegna Iniziativa →
                    </button>
                </div>
            </div>
        );
    }

    // INITIATIVE — Assign initiative values
    if (phase === "initiative") {
        return (
            <div className={styles.initiativeContainer}>
                <div className={styles.initiativeHeader}>
                    <h2>🎲 Ordine di Iniziativa</h2>
                </div>

                <div className={styles.initiativeList}>
                    {combatants.map((c) => (
                        <div key={c.id} className={styles.initiativeItem}>
                            <input
                                type="number"
                                className={styles.initiativeInput}
                                value={c.initiative || ""}
                                onChange={(e) =>
                                    setInitiative(c.id, parseInt(e.target.value) || 0)
                                }
                                placeholder="0"
                                min={0}
                                max={30}
                            />
                            {c.portrait_url ? (
                                <img
                                    src={c.portrait_url}
                                    alt=""
                                    className={styles.combatantAvatar}
                                />
                            ) : (
                                <div
                                    className={`${styles.combatantAvatarFallback} ${c.type === "npc" ? styles.pickAvatarFallbackNpc : ""
                                        }`}
                                >
                                    {c.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className={styles.combatantInfo}>
                                <div className={styles.combatantName}>
                                    {c.name}
                                    {c.type === "npc" && (
                                        <span className={styles.npcBadge}>NPC</span>
                                    )}
                                </div>
                                <div className={styles.combatantSub}>
                                    {c.race} • {c.class_or_role}
                                </div>
                            </div>
                            <div className={styles.combatantStats}>
                                <div className={styles.combatStat}>
                                    <span className={styles.combatStatLabel}>AC</span>
                                    <span className={styles.combatStatValue}>{c.ac}</span>
                                </div>
                                <div className={styles.combatStat}>
                                    <span className={styles.combatStatLabel}>HP</span>
                                    <span className={styles.combatStatValue}>{c.hp_max}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className={styles.setupActions}>
                    <button className={styles.backBtn} onClick={() => setPhase("setup")}>
                        ← Indietro
                    </button>
                    <button className={styles.confirmBtn} onClick={startCombat}>
                        ⚔️ Inizia Combattimento!
                    </button>
                </div>
            </div>
        );
    }

    // ACTIVE COMBAT — DM View
    if (phase === "active" && session) {
        const currentCombatant = combatants[session.current_turn_index];

        return (
            <div className={styles.activeCombat}>
                {/* Top bar */}
                <div className={styles.combatTopBar}>
                    <span className={styles.roundBadge}>
                        Round {session.round_number}
                    </span>
                    <div className={styles.combatTopActions}>
                        <button className={styles.nextTurnBtn} onClick={advanceTurn}>
                            Avanti ▶
                        </button>
                        <button className={styles.endCombatBtn} onClick={endCombat}>
                            ✕ Termina
                        </button>
                    </div>
                </div>

                {/* Current turn banner */}
                {currentCombatant && (
                    <div
                        className={`${styles.turnBanner} ${currentCombatant.type === "npc" ? styles.turnBannerNpc : ""
                            }`}
                    >
                        <div className={styles.turnBannerLabel}>Turno di</div>
                        <div className={styles.turnBannerName}>{currentCombatant.name}</div>
                    </div>
                )}

                {/* Combatant list */}
                <div className={styles.combatantsList}>
                    {combatants.map((c, idx) => {
                        const isActive = idx === session.current_turn_index;
                        const isDead = c.hp_current <= 0;
                        const hpPercent = getHpPercent(c.hp_current, c.hp_max);

                        return (
                            <div
                                key={c.id}
                                className={`${styles.combatantCard} ${isActive ? styles.combatantCardActive : ""
                                    } ${isDead ? styles.combatantCardDead : ""} ${c.type === "npc" ? styles.combatantCardNpc : ""
                                    }`}
                                onClick={() => {
                                    if (c.type === "pc") {
                                        router.push(`/campaign/${campaignId}/character/${c.source_id}`);
                                    } else {
                                        const npcData = npcs.find(n => n.id === c.source_id);
                                        if (npcData) setNpcDetail(npcData);
                                    }
                                }}
                            >
                                <span className={styles.initiativeNumber}>{c.initiative}</span>

                                {c.portrait_url ? (
                                    <img
                                        src={c.portrait_url}
                                        alt=""
                                        className={styles.combatantAvatar}
                                    />
                                ) : (
                                    <div
                                        className={`${styles.combatantAvatarFallback} ${c.type === "npc" ? "" : ""
                                            }`}
                                    >
                                        {c.name.charAt(0).toUpperCase()}
                                    </div>
                                )}

                                <div className={styles.combatantInfo}>
                                    <div className={styles.combatantName}>
                                        {c.name}
                                        {c.type === "npc" && (
                                            <span className={styles.npcBadge}>NPC</span>
                                        )}
                                        {isActive && (
                                            <span className={styles.turnIndicator}>Turno</span>
                                        )}
                                    </div>
                                    <div className={styles.combatantSub}>
                                        {c.race} • {c.class_or_role}
                                        {c.conditions.length > 0 && (
                                            <>
                                                {" "}
                                                {c.conditions.map((cond) => (
                                                    <span key={cond} className={styles.conditionBadge}>
                                                        {cond}
                                                    </span>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                    <div className={styles.miniHpBar}>
                                        <div
                                            className={styles.miniHpBarFill}
                                            style={{
                                                width: `${hpPercent}%`,
                                                background: getHpColor(hpPercent),
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className={styles.combatantActions}>
                                    <button
                                        className={styles.dmgIconBtn}
                                        title="Infliggi Danno"
                                        onClick={(e) => { e.stopPropagation(); openHpDialog(c.id, c.name, "damage"); }}
                                    >
                                        <Swords size={16} />
                                    </button>
                                    <button
                                        className={styles.healIconBtn}
                                        title="Cura"
                                        onClick={(e) => { e.stopPropagation(); openHpDialog(c.id, c.name, "heal"); }}
                                    >
                                        <Heart size={16} />
                                    </button>
                                </div>

                                <div className={styles.combatantStats}>
                                    <div className={styles.combatStat}>
                                        <span className={styles.combatStatLabel}>AC</span>
                                        <span className={styles.combatStatValue}>{c.ac}</span>
                                    </div>
                                    <div className={styles.combatStat}>
                                        <span className={styles.combatStatLabel}>HP</span>
                                        <span className={styles.combatStatValue}>
                                            {c.hp_current}/{c.hp_max}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* HP Dialog */}
                {hpDialog && (
                    <div className={styles.hpDialog} onClick={() => setHpDialog(null)}>
                        <div
                            className={styles.hpDialogContent}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className={styles.hpDialogTitle}>
                                {hpDialog.mode === "damage" ? (
                                    <><Swords size={18} style={{ color: 'var(--danger)' }} /> Danno a {hpDialog.name}</>
                                ) : (
                                    <><Heart size={18} style={{ color: 'var(--success)' }} /> Cura {hpDialog.name}</>
                                )}
                            </div>
                            <input
                                ref={hpInputRef}
                                type="number"
                                className={styles.hpDialogInput}
                                value={hpAmount}
                                onChange={(e) => setHpAmount(e.target.value)}
                                placeholder="0"
                                min={0}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") applyHpChange(hpDialog.mode);
                                }}
                            />
                            <div className={styles.hpDialogActions}>
                                <button
                                    className={styles.cancelDialogBtn}
                                    onClick={() => setHpDialog(null)}
                                >
                                    Annulla
                                </button>
                                <button
                                    className={hpDialog.mode === "damage" ? styles.dmgBtn : styles.healBtn}
                                    onClick={() => applyHpChange(hpDialog.mode)}
                                >
                                    {hpDialog.mode === "damage" ? (
                                        <><Swords size={14} /> Applica Danno</>
                                    ) : (
                                        <><Heart size={14} /> Applica Cura</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* NPC Detail Modal — Full Sheet */}
                {npcDetail && (
                    <div className={styles.hpDialog} onClick={() => setNpcDetail(null)}>
                        <div
                            className={styles.npcDetailContent}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className={styles.npcDetailHeader}>
                                {npcDetail.portrait_url && (
                                    <img src={npcDetail.portrait_url} alt="" className={styles.npcDetailAvatar} />
                                )}
                                <div style={{ flex: 1 }}>
                                    <h3 className={styles.npcDetailName}>{npcDetail.name}</h3>
                                    <p className={styles.npcDetailSub}>
                                        {npcDetail.race} • {npcDetail.role}
                                        {npcDetail.challenge_rating && ` • CR ${npcDetail.challenge_rating}`}
                                    </p>
                                    {npcDetail.alignment && (
                                        <p className={styles.npcDetailSub} style={{ fontStyle: 'italic' }}>
                                            {npcDetail.alignment}
                                        </p>
                                    )}
                                </div>
                                <button className={styles.cancelBtn} onClick={() => setNpcDetail(null)}>✕</button>
                            </div>

                            {/* Combat Stats */}
                            <div className={styles.npcDetailCombatRow}>
                                <div className={styles.npcDetailCombatBadge}>
                                    <span className={styles.combatStatLabel}>AC</span>
                                    <span className={styles.npcDetailBigValue}>{npcDetail.ac}</span>
                                </div>
                                <div className={styles.npcDetailCombatBadge}>
                                    <span className={styles.combatStatLabel}>HP</span>
                                    <span className={styles.npcDetailBigValue}>{npcDetail.hp}</span>
                                </div>
                            </div>

                            {/* Ability Scores */}
                            {npcDetail.stats && (
                                <div className={styles.npcDetailStats}>
                                    {Object.entries(npcDetail.stats).map(([key, val]) => (
                                        <div key={key} className={styles.npcDetailStatItem}>
                                            <span className={styles.combatStatLabel}>{key.toUpperCase()}</span>
                                            <span className={styles.combatStatValue}>{val as number}</span>
                                            <span className={styles.npcDetailMod}>({calcMod(val as number)})</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Traits / Abilities / Actions */}
                            {npcDetail.traits && npcDetail.traits.length > 0 && (
                                <div className={styles.npcDetailTraits}>
                                    <div className={styles.npcDetailSectionTitle}>Abilità e Azioni</div>
                                    {npcDetail.traits.map((t, i) => (
                                        <div key={i} className={styles.npcDetailTraitItem}>
                                            <strong>{t.name}.</strong> {t.description}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Notes */}
                            {npcDetail.notes && (
                                <div className={styles.npcDetailNotes}>
                                    <div className={styles.npcDetailSectionTitle}>Note</div>
                                    <p>{npcDetail.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return null;
}
