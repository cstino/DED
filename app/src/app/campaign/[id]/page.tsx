"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { SessionTimeline } from "@/components/campaign/SessionTimeline";
import { LoreBrowser } from "@/components/campaign/LoreBrowser";
import AiAssistantChat from "@/components/dm/AiAssistantChat";
import NpcGenerator from "@/components/dm/NpcGenerator";
import NpcList from "@/components/dm/NpcList";
import SpellCompendium from "@/components/dm/SpellCompendium";
import styles from "./campaign.module.css";

interface Campaign {
    id: string;
    name: string;
    description: string | null;
    invite_code: string;
    master_id: string;
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
    ability_scores: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
    skill_proficiencies: string[];
    proficiency_bonus?: number;
}

interface Member {
    user_id: string;
    role: string;
    profiles: { username: string; avatar_url: string | null };
}

export default function CampaignPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const campaignId = params.id as string;

    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<"party" | "sessions" | "lore" | "npcs" | "spells">("party");
    const [npcRefreshTrigger, setNpcRefreshTrigger] = useState(0);

    const isMaster = campaign?.master_id === user?.id;

    useEffect(() => {
        if (!authLoading && !user) router.push("/login");
    }, [authLoading, user, router]);

    useEffect(() => {
        if (!user || !campaignId) return;

        async function fetchAll() {
            setLoading(true);

            const [campaignRes, charsRes, membersRes] = await Promise.all([
                supabase.from("campaigns").select("*").eq("id", campaignId).single(),
                supabase.from("characters").select("*").eq("campaign_id", campaignId),
                supabase
                    .from("campaign_members")
                    .select("user_id, role, profiles(username, avatar_url)")
                    .eq("campaign_id", campaignId),
            ]);

            if (campaignRes.data) setCampaign(campaignRes.data);
            if (charsRes.data) setCharacters(charsRes.data);
            if (membersRes.data) setMembers(membersRes.data as unknown as Member[]);

            setLoading(false);
        }

        fetchAll();
    }, [user, campaignId]);

    function copyInviteCode() {
        if (!campaign) return;
        navigator.clipboard.writeText(campaign.invite_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    async function handleDeleteCharacter(id: string, name: string) {
        if (!confirm(`Sei sicuro di voler eliminare definitivamente il personaggio "${name}"? Questa azione non può essere annullata.`)) return;

        const { error } = await supabase.from("characters").delete().eq("id", id);
        if (error) {
            alert("Errore durante l'eliminazione del personaggio.");
        } else {
            setCharacters(characters.filter(c => c.id !== id));
        }
    }

    async function handleDeleteMember(userId: string, username: string) {
        if (userId === user?.id) {
            alert("Non puoi rimuovere te stesso dalla campagna.");
            return;
        }

        if (!confirm(`Sei sicuro di voler rimuovere l'utente "${username}" dalla campagna? I suoi personaggi rimarranno ma non potrà più accedere.`)) return;

        const { error } = await supabase
            .from("campaign_members")
            .delete()
            .eq("campaign_id", campaignId)
            .eq("user_id", userId);

        if (error) {
            alert("Errore durante la rimozione del membro.");
        } else {
            setMembers(members.filter(m => m.user_id !== userId));
        }
    }

    function getHpPercent(current: number, max: number) {
        return Math.max(0, Math.min(100, (current / max) * 100));
    }

    function getHpColor(percent: number) {
        if (percent > 50) return "var(--hp-green)";
        if (percent > 25) return "var(--hp-yellow)";
        return "var(--hp-red)";
    }

    function getPassivePerception(char: Character) {
        const wis = char.ability_scores?.wis ?? 10;
        const wisMod = Math.floor((wis - 10) / 2);
        const pb = char.proficiency_bonus ?? (Math.ceil(char.level / 4) + 1);
        const isProficient = char.skill_proficiencies?.includes("perception");
        const val = 10 + wisMod + (isProficient ? pb : 0);
        const mod = wisMod + (isProficient ? pb : 0);
        return { val, mod: mod >= 0 ? `+${mod}` : `${mod}` };
    }

    if (authLoading || !user || loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner} />
                <p className="text-secondary">Caricamento campagna...</p>
            </div>
        );
    }

    if (!campaign) {
        return (
            <div className={styles.loadingContainer}>
                <p className="text-secondary">Campagna non trovata</p>
                <button className="btn btn-secondary" onClick={() => router.push("/dashboard")}>
                    Torna alla dashboard
                </button>
            </div>
        );
    }

    // Group characters by user
    const myCharacters = characters.filter((c) => c.user_id === user.id);
    const otherCharacters = characters.filter((c) => c.user_id !== user.id);

    return (
        <div className="page">
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.push("/dashboard")}>
                    ← Dashboard
                </button>
                <div className={styles.headerInfo}>
                    <h1 className="page-title">{campaign.name}</h1>
                    {campaign.description && (
                        <p className="page-subtitle">{campaign.description}</p>
                    )}
                </div>
                <div className={styles.headerActions}>
                    <button
                        className={`${styles.inviteBtn} ${copied ? styles.inviteCopied : ""}`}
                        onClick={copyInviteCode}
                    >
                        {copied ? "✓ Copiato!" : `📋 ${campaign.invite_code}`}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className={styles.tabsContainer}>
                <button
                    className={`${styles.tabBtn} ${activeTab === 'party' ? styles.tabBtnActive : ''}`}
                    onClick={() => setActiveTab('party')}
                >
                    Party
                </button>
                <button
                    className={`${styles.tabBtn} ${activeTab === 'sessions' ? styles.tabBtnActive : ''}`}
                    onClick={() => setActiveTab('sessions')}
                >
                    Sessioni
                </button>
                <button
                    className={`${styles.tabBtn} ${activeTab === 'lore' ? styles.tabBtnActive : ''}`}
                    onClick={() => setActiveTab('lore')}
                >
                    Materiale
                </button>
                <button
                    className={`${styles.tabBtn} ${activeTab === 'spells' ? styles.tabBtnActive : ''}`}
                    onClick={() => setActiveTab('spells')}
                >
                    Incantesimi
                </button>
                {isMaster && (
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'npcs' ? styles.tabBtnActive : ''}`}
                        onClick={() => setActiveTab('npcs')}
                    >
                        NPCs
                    </button>
                )}
            </div>

            {activeTab === "party" && (
                <>
                    {/* My Characters Section - Only for Players */}
                    {!isMaster && (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h2>I tuoi Personaggi</h2>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => router.push(`/campaign/${campaignId}/create-character`)}
                                >
                                    + Nuovo PG
                                </button>
                            </div>

                            {myCharacters.length === 0 ? (
                                <div className={styles.emptyCard}>
                                    <p>Nessun personaggio in questa campagna</p>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => router.push(`/campaign/${campaignId}/create-character`)}
                                        style={{ marginTop: "var(--space-md)" }}
                                    >
                                        Crea il tuo primo personaggio
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.characterGrid}>
                                    {myCharacters.map((char) => {
                                        const hpPercent = getHpPercent(char.hp_current, char.hp_max);
                                        return (
                                            <div
                                                key={char.id}
                                                className={`card card-glow-teal ${styles.characterCard}`}
                                                onClick={() => router.push(`/campaign/${campaignId}/character/${char.id}`)}
                                            >
                                                <div className={styles.charHeader}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                                        {char.portrait_url ? (
                                                            <img src={char.portrait_url} alt={char.name} className={styles.cardPortrait} />
                                                        ) : (
                                                            <div className={styles.cardPortraitFallback}>{char.name.charAt(0).toUpperCase()}</div>
                                                        )}
                                                        <h3>{char.name}</h3>
                                                    </div>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                        <span className={styles.levelBadge}>Lv. {char.level}</span>
                                                    </div>
                                                </div>
                                                <p className={styles.charInfo}>
                                                    {char.race} • {char.class}
                                                    {char.subclass ? ` (${char.subclass})` : ""}
                                                </p>
                                                <div className={styles.charStats}>
                                                    <div className={styles.hpSection}>
                                                        <div className={styles.hpHeader}>
                                                            <span className={styles.hpLabel}>HP</span>
                                                            <span className={styles.hpNumbers}>{char.hp_current} / {char.hp_max}</span>
                                                        </div>
                                                        <div className={styles.hpBarOuter}>
                                                            <div
                                                                className={styles.hpBarInner}
                                                                style={{
                                                                    width: `${hpPercent}%`,
                                                                    background: getHpColor(hpPercent),
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className={styles.badgesSection}>
                                                        <div className={styles.statBadge}>
                                                            <span className={styles.statLabel}>AC</span>
                                                            <span className={styles.statValue}>{char.ac}</span>
                                                        </div>
                                                        <div className={styles.statBadge}>
                                                            <span className={styles.statLabel}>BC</span>
                                                            <span className={styles.statValue}>+{char.proficiency_bonus ?? (Math.ceil(char.level / 4) + 1)}</span>
                                                        </div>
                                                        <div className={styles.statBadge}>
                                                            <span className={styles.statLabel}>PERC</span>
                                                            <span className={styles.statValue}>
                                                                {getPassivePerception(char).val}
                                                                <small style={{ fontSize: '0.65rem', marginLeft: '4px', opacity: 0.7 }}>
                                                                    ({getPassivePerception(char).mod})
                                                                </small>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    )}

                    {/* Party Section - Other Players' Characters */}
                    {otherCharacters.length > 0 && (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h2>Il Party</h2>
                            </div>
                            <div className={styles.characterGrid}>
                                {otherCharacters.map((char) => {
                                    const hpPercent = getHpPercent(char.hp_current, char.hp_max);
                                    const owner = members.find((m) => m.user_id === char.user_id);
                                    return (
                                        <div
                                            key={char.id}
                                            className={`card ${styles.characterCard}`}
                                            onClick={() => router.push(`/campaign/${campaignId}/character/${char.id}`)}
                                        >
                                            <div className={styles.charHeader}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                                    {char.portrait_url ? (
                                                        <img src={char.portrait_url} alt={char.name} className={styles.cardPortrait} />
                                                    ) : (
                                                        <div className={styles.cardPortraitFallback}>{char.name.charAt(0).toUpperCase()}</div>
                                                    )}
                                                    <h3>{char.name}</h3>
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                    <span className={styles.levelBadge}>Lv. {char.level}</span>
                                                    {isMaster && (
                                                        <button
                                                            className={styles.deleteBtn}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteCharacter(char.id, char.name);
                                                            }}
                                                            title="Elimina PG"
                                                        >
                                                            🗑️
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <p className={styles.charInfo}>
                                                {char.race} • {char.class}
                                                {char.subclass ? ` (${char.subclass})` : ""}
                                            </p>
                                            <div className={styles.charStats}>
                                                <div className={styles.hpSection}>
                                                    <div className={styles.hpHeader}>
                                                        <span className={styles.hpLabel}>HP</span>
                                                        <span className={styles.hpNumbers}>{char.hp_current} / {char.hp_max}</span>
                                                    </div>
                                                    <div className={styles.hpBarOuter}>
                                                        <div
                                                            className={styles.hpBarInner}
                                                            style={{
                                                                width: `${hpPercent}%`,
                                                                background: getHpColor(hpPercent),
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className={styles.badgesSection}>
                                                    <div className={styles.statBadge}>
                                                        <span className={styles.statLabel}>AC</span>
                                                        <span className={styles.statValue}>{char.ac}</span>
                                                    </div>
                                                    <div className={styles.statBadge}>
                                                        <span className={styles.statLabel}>BC</span>
                                                        <span className={styles.statValue}>+{char.proficiency_bonus ?? (Math.ceil(char.level / 4) + 1)}</span>
                                                    </div>
                                                    <div className={styles.statBadge}>
                                                        <span className={styles.statLabel}>PERC</span>
                                                        <span className={styles.statValue}>
                                                            {getPassivePerception(char).val}
                                                            <small style={{ fontSize: '0.65rem', marginLeft: '4px', opacity: 0.7 }}>
                                                                ({getPassivePerception(char).mod})
                                                            </small>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {owner && (
                                                <p className={styles.charOwner}>
                                                    Giocatore: {owner.profiles.username}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Members Section */}
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2>Membri ({members.length})</h2>
                        </div>
                        <div className={styles.memberList}>
                            {members.map((m) => (
                                <div key={m.user_id} className={styles.memberItem}>
                                    <div className={styles.memberAvatar}>
                                        {m.profiles.username.charAt(0).toUpperCase()}
                                    </div>
                                    <span className={styles.memberName}>{m.profiles.username}</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <span
                                            className={`${styles.memberRole} ${m.role === "master" ? styles.roleMaster : styles.rolePlayer
                                                }`}
                                        >
                                            {m.role === "master" ? "DM" : "Giocatore"}
                                        </span>
                                        {isMaster && m.role !== "master" && (
                                            <button
                                                className={styles.deleteIconBtn}
                                                onClick={() => handleDeleteMember(m.user_id, m.profiles.username)}
                                                title="Rimuovi membro"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </>
            )}

            {
                activeTab === "sessions" && (
                    <SessionTimeline campaignId={campaignId} isMaster={isMaster} />
                )
            }

            {
                activeTab === "lore" && (
                    <LoreBrowser isMaster={isMaster} />
                )
            }

            {
                activeTab === "spells" && (
                    <SpellCompendium />
                )
            }

            {
                activeTab === "npcs" && isMaster && (
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2>Generatore e Compendio PNG</h2>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "flex-start" }}>
                            <div style={{ flex: 1, minWidth: "300px" }}>
                                <NpcGenerator
                                    campaignId={campaignId}
                                    onSaved={() => setNpcRefreshTrigger(prev => prev + 1)}
                                />
                            </div>
                            <div className="card" style={{ padding: "var(--space-lg)", flexShrink: 0, display: "flex", flexDirection: "column", gap: "12px", border: "1px solid var(--accent-teal)", background: "rgba(0, 229, 160, 0.05)" }}>
                                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Gestione Master</h3>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => router.push(`/campaign/${campaignId}/create-character`)}
                                >
                                    + Crea PG del Master
                                </button>
                                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0, maxWidth: "200px" }}>
                                    Crea un personaggio gestito da te come DM.
                                </p>
                            </div>
                        </div>

                        <h3 style={{ marginTop: "32px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
                            Archivio PNG
                        </h3>
                        <NpcList campaignId={campaignId} refreshTrigger={npcRefreshTrigger} />

                        {myCharacters.length > 0 && (
                            <div style={{ marginTop: "40px" }}>
                                <h3 style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "8px", marginBottom: "20px" }}>
                                    I tuoi Personaggi (Master)
                                </h3>
                                <div className={styles.characterGrid}>
                                    {myCharacters.map((char) => {
                                        const hpPercent = getHpPercent(char.hp_current, char.hp_max);
                                        return (
                                            <div
                                                key={char.id}
                                                className={`card card-glow-teal ${styles.characterCard}`}
                                                onClick={() => router.push(`/campaign/${campaignId}/character/${char.id}`)}
                                            >
                                                <div className={styles.charHeader}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                                        {char.portrait_url ? (
                                                            <img src={char.portrait_url} alt={char.name} className={styles.cardPortrait} />
                                                        ) : (
                                                            <div className={styles.cardPortraitFallback}>{char.name.charAt(0).toUpperCase()}</div>
                                                        )}
                                                        <h3>{char.name}</h3>
                                                    </div>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                        <span className={styles.levelBadge}>Lv. {char.level}</span>
                                                        <button
                                                            className={styles.deleteBtn}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteCharacter(char.id, char.name);
                                                            }}
                                                            title="Elimina PG"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className={styles.charInfo}>
                                                    {char.race} • {char.class}
                                                    {char.subclass ? ` (${char.subclass})` : ""}
                                                </p>
                                                <div className={styles.charStats}>
                                                    <div className={styles.hpSection}>
                                                        <div className={styles.hpHeader}>
                                                            <span className={styles.hpLabel}>HP</span>
                                                            <span className={styles.hpNumbers}>{char.hp_current} / {char.hp_max}</span>
                                                        </div>
                                                        <div className={styles.hpBarOuter}>
                                                            <div
                                                                className={styles.hpBarInner}
                                                                style={{
                                                                    width: `${hpPercent}%`,
                                                                    background: getHpColor(hpPercent),
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className={styles.badgesSection}>
                                                        <div className={styles.statBadge}>
                                                            <span className={styles.statLabel}>AC</span>
                                                            <span className={styles.statValue}>{char.ac}</span>
                                                        </div>
                                                        <div className={styles.statBadge}>
                                                            <span className={styles.statLabel}>BC</span>
                                                            <span className={styles.statValue}>+{char.proficiency_bonus ?? (Math.ceil(char.level / 4) + 1)}</span>
                                                        </div>
                                                        <div className={styles.statBadge}>
                                                            <span className={styles.statLabel}>PERC</span>
                                                            <span className={styles.statValue}>
                                                                {getPassivePerception(char).val}
                                                                <small style={{ fontSize: '0.65rem', marginLeft: '4px', opacity: 0.7 }}>
                                                                    ({getPassivePerception(char).mod})
                                                                </small>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </section>
                )
            }

            {/* AI Assistant Floating Widget */}
            <AiAssistantChat />
        </div >
    );
}
