"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
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

    function getHpPercent(current: number, max: number) {
        return Math.max(0, Math.min(100, (current / max) * 100));
    }

    function getHpColor(percent: number) {
        if (percent > 50) return "var(--hp-green)";
        if (percent > 25) return "var(--hp-yellow)";
        return "var(--hp-red)";
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
            {/* Header */}
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

            {/* My Characters Section */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2>{isMaster ? "I tuoi PG (Master)" : "I tuoi Personaggi"}</h2>
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
                                        <span className={styles.levelBadge}>Lv. {char.level}</span>
                                    </div>
                                    <p className={styles.charInfo}>
                                        {char.race} • {char.class}
                                        {char.subclass ? ` (${char.subclass})` : ""}
                                    </p>
                                    <div className={styles.charStats}>
                                        <div className={styles.hpSection}>
                                            <span className={styles.hpLabel}>
                                                HP {char.hp_current}/{char.hp_max}
                                            </span>
                                            <div className="hp-bar-container">
                                                <div
                                                    className="hp-bar"
                                                    style={{
                                                        width: `${hpPercent}%`,
                                                        background: getHpColor(hpPercent),
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className={styles.acBadge}>
                                            <span className={styles.acLabel}>AC</span>
                                            <span className={styles.acValue}>{char.ac}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Party Section */}
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
                                        <span className={styles.levelBadge}>Lv. {char.level}</span>
                                    </div>
                                    <p className={styles.charInfo}>
                                        {char.race} • {char.class}
                                        {char.subclass ? ` (${char.subclass})` : ""}
                                    </p>
                                    <div className={styles.charStats}>
                                        <div className={styles.hpSection}>
                                            <span className={styles.hpLabel}>
                                                HP {char.hp_current}/{char.hp_max}
                                            </span>
                                            <div className="hp-bar-container">
                                                <div
                                                    className="hp-bar"
                                                    style={{
                                                        width: `${hpPercent}%`,
                                                        background: getHpColor(hpPercent),
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className={styles.acBadge}>
                                            <span className={styles.acLabel}>AC</span>
                                            <span className={styles.acValue}>{char.ac}</span>
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
                            <span
                                className={`${styles.memberRole} ${m.role === "master" ? styles.roleMaster : styles.rolePlayer
                                    }`}
                            >
                                {m.role === "master" ? "DM" : "Giocatore"}
                            </span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
