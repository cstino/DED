"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import styles from "./dashboard.module.css";

interface Campaign {
    id: string;
    name: string;
    description: string | null;
    invite_code: string;
    master_id: string;
    created_at: string;
}

interface CampaignMember {
    campaign_id: string;
    role: string;
    campaigns: Campaign;
}

export default function DashboardPage() {
    const { user, profile, loading: authLoading, signOut } = useAuth();
    const router = useRouter();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [authLoading, user, router]);

    useEffect(() => {
        if (!user) return;

        async function fetchCampaigns() {
            setLoading(true);

            // Fetch campaigns where user is master
            const { data: ownedCampaigns } = await supabase
                .from("campaigns")
                .select("*")
                .eq("master_id", user!.id);

            // Fetch campaigns where user is member/player
            const { data: memberCampaigns } = await supabase
                .from("campaign_members")
                .select("campaign_id, role, campaigns(*)")
                .eq("user_id", user!.id);

            const allCampaigns: Campaign[] = [];

            if (ownedCampaigns) {
                allCampaigns.push(...ownedCampaigns);
            }

            if (memberCampaigns) {
                for (const mc of memberCampaigns as unknown as CampaignMember[]) {
                    if (mc.campaigns && !allCampaigns.find((c) => c.id === mc.campaigns.id)) {
                        allCampaigns.push(mc.campaigns);
                    }
                }
            }

            setCampaigns(allCampaigns);
            setLoading(false);
        }

        fetchCampaigns();
    }, [user]);

    if (authLoading || !user) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner} />
                <p className="text-secondary">Caricamento...</p>
            </div>
        );
    }

    return (
        <div className="page">
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <h1 className="page-title">
                        Ciao, {profile?.username || "Avventuriero"} 👋
                    </h1>
                    <p className="page-subtitle">Le tue campagne D&D</p>
                </div>
                <button
                    className="btn btn-secondary btn-icon"
                    onClick={signOut}
                    title="Logout"
                >
                    🚪
                </button>
            </div>

            {/* Quick Actions */}
            <div className={styles.quickActions}>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowCreateModal(true)}
                    style={{ flex: 1 }}
                >
                    ✨ Crea Campagna
                </button>
                <button
                    className="btn btn-secondary"
                    onClick={() => setShowJoinModal(true)}
                    style={{ flex: 1 }}
                >
                    🔗 Unisciti
                </button>
            </div>

            {/* Campaigns Lists */}
            {loading ? (
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner} />
                </div>
            ) : campaigns.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>🏰</div>
                    <h2>Nessuna campagna</h2>
                    <p className="text-secondary">
                        Crea la tua prima campagna o unisciti ad una esistente con un codice
                        invito!
                    </p>
                </div>
            ) : (
                <div className={styles.campaignList}>
                    {campaigns.map((campaign) => (
                        <div
                            key={campaign.id}
                            className={`card ${styles.campaignCard} ${campaign.master_id === user.id ? "card-glow-amber" : ""
                                }`}
                            onClick={() => router.push(`/campaign/${campaign.id}`)}
                        >
                            <div className={styles.campaignHeader}>
                                <h3>{campaign.name}</h3>
                                <span
                                    className={`${styles.roleBadge} ${campaign.master_id === user.id
                                            ? styles.roleMaster
                                            : styles.rolePlayer
                                        }`}
                                >
                                    {campaign.master_id === user.id ? "DM" : "Giocatore"}
                                </span>
                            </div>
                            {campaign.description && (
                                <p className="text-secondary" style={{ fontSize: "0.9rem" }}>
                                    {campaign.description}
                                </p>
                            )}
                            <div className={styles.campaignFooter}>
                                <span className="text-muted" style={{ fontSize: "0.8rem" }}>
                                    Codice: {campaign.invite_code}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Campaign Modal */}
            {showCreateModal && (
                <CreateCampaignModal
                    userId={user.id}
                    onClose={() => setShowCreateModal(false)}
                    onCreated={(c) => {
                        setCampaigns((prev) => [c, ...prev]);
                        setShowCreateModal(false);
                    }}
                />
            )}

            {/* Join Campaign Modal */}
            {showJoinModal && (
                <JoinCampaignModal
                    userId={user.id}
                    onClose={() => setShowJoinModal(false)}
                    onJoined={(c) => {
                        setCampaigns((prev) => {
                            if (prev.find((p) => p.id === c.id)) return prev;
                            return [c, ...prev];
                        });
                        setShowJoinModal(false);
                    }}
                />
            )}
        </div>
    );
}

/* -------- Create Campaign Modal -------- */
function CreateCampaignModal({
    userId,
    onClose,
    onCreated,
}: {
    userId: string;
    onClose: () => void;
    onCreated: (campaign: Campaign) => void;
}) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleCreate() {
        if (!name.trim()) return;
        setLoading(true);
        setError("");

        // Generate invite code
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let code = "";
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const { data, error: insertError } = await supabase
            .from("campaigns")
            .insert({
                name: name.trim(),
                description: description.trim() || null,
                master_id: userId,
                invite_code: code,
            })
            .select()
            .single();

        if (insertError) {
            setError(insertError.message);
            setLoading(false);
            return;
        }

        // Also add the master as a campaign_member with role 'master'
        await supabase.from("campaign_members").insert({
            campaign_id: data.id,
            user_id: userId,
            role: "master",
        });

        onCreated(data);
    }

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h2>✨ Nuova Campagna</h2>

                {error && (
                    <div
                        style={{
                            background: "rgba(255,68,68,.1)",
                            border: "1px solid rgba(255,68,68,.3)",
                            color: "var(--danger)",
                            padding: "var(--space-sm) var(--space-md)",
                            borderRadius: "var(--radius-md)",
                            fontSize: "0.9rem",
                            marginTop: "var(--space-md)",
                        }}
                    >
                        {error}
                    </div>
                )}

                <div className={styles.modalFields}>
                    <div>
                        <label className="label" htmlFor="campaign-name">
                            Nome Campagna *
                        </label>
                        <input
                            id="campaign-name"
                            type="text"
                            className="input"
                            placeholder="Es. La Cripta dei Draghi"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label" htmlFor="campaign-desc">
                            Descrizione (opzionale)
                        </label>
                        <textarea
                            id="campaign-desc"
                            className="input"
                            rows={3}
                            placeholder="Una breve descrizione..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            style={{ resize: "vertical" }}
                        />
                    </div>
                </div>

                <div className={styles.modalActions}>
                    <button className="btn btn-secondary" onClick={onClose}>
                        Annulla
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleCreate}
                        disabled={loading || !name.trim()}
                    >
                        {loading ? "Creazione..." : "Crea Campagna"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* -------- Join Campaign Modal -------- */
function JoinCampaignModal({
    userId,
    onClose,
    onJoined,
}: {
    userId: string;
    onClose: () => void;
    onJoined: (campaign: Campaign) => void;
}) {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleJoin() {
        if (!code.trim()) return;
        setLoading(true);
        setError("");

        // Find campaign by invite code
        const { data: campaign, error: fetchError } = await supabase
            .from("campaigns")
            .select("*")
            .eq("invite_code", code.trim().toUpperCase())
            .single();

        if (fetchError || !campaign) {
            setError("Codice invito non trovato. Verifica e riprova.");
            setLoading(false);
            return;
        }

        // Check if already a member
        const { data: existing } = await supabase
            .from("campaign_members")
            .select("id")
            .eq("campaign_id", campaign.id)
            .eq("user_id", userId)
            .single();

        if (existing) {
            setError("Fai già parte di questa campagna!");
            setLoading(false);
            return;
        }

        // Join
        const { error: joinError } = await supabase
            .from("campaign_members")
            .insert({
                campaign_id: campaign.id,
                user_id: userId,
                role: "player",
            });

        if (joinError) {
            setError(joinError.message);
            setLoading(false);
            return;
        }

        onJoined(campaign);
    }

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h2>🔗 Unisciti a una Campagna</h2>

                {error && (
                    <div
                        style={{
                            background: "rgba(255,68,68,.1)",
                            border: "1px solid rgba(255,68,68,.3)",
                            color: "var(--danger)",
                            padding: "var(--space-sm) var(--space-md)",
                            borderRadius: "var(--radius-md)",
                            fontSize: "0.9rem",
                            marginTop: "var(--space-md)",
                        }}
                    >
                        {error}
                    </div>
                )}

                <div className={styles.modalFields}>
                    <div>
                        <label className="label" htmlFor="invite-code">
                            Codice Invito
                        </label>
                        <input
                            id="invite-code"
                            type="text"
                            className="input"
                            placeholder="Es. A4B7CX"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            maxLength={6}
                            style={{ textTransform: "uppercase", letterSpacing: "0.2em", textAlign: "center", fontSize: "1.2rem" }}
                        />
                    </div>
                </div>

                <div className={styles.modalActions}>
                    <button className="btn btn-secondary" onClick={onClose}>
                        Annulla
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleJoin}
                        disabled={loading || !code.trim()}
                    >
                        {loading ? "Unione..." : "Unisciti"}
                    </button>
                </div>
            </div>
        </div>
    );
}
