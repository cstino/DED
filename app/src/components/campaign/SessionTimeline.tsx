"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./SessionTimeline.module.css";

interface Session {
    id: string;
    campaign_id: string;
    session_number: number;
    title: string | null;
    notes: string | null;
    played_at: string;
}

interface SessionTimelineProps {
    campaignId: string;
    isMaster: boolean;
}

export function SessionTimeline({ campaignId, isMaster }: SessionTimelineProps) {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // New session form state
    const [newNumber, setNewNumber] = useState<number>(1);
    const [newTitle, setNewTitle] = useState("");
    const [newNotes, setNewNotes] = useState("");
    const [newDate, setNewDate] = useState("");

    useEffect(() => {
        fetchSessions();
    }, [campaignId]);

    async function fetchSessions() {
        setLoading(true);
        const { data, error } = await supabase
            .from("sessions")
            .select("*")
            .eq("campaign_id", campaignId)
            .order("session_number", { ascending: false });

        if (error) {
            console.error("Error fetching sessions:", error);
        } else {
            setSessions(data || []);
            if (data && data.length > 0) {
                setNewNumber(data[0].session_number + 1);
            }

            // Set today's date for default play date
            const today = new Date().toISOString().split('T')[0];
            setNewDate(today);
        }
        setLoading(false);
    }

    async function handleAddSession(e: React.FormEvent) {
        e.preventDefault();

        const sessionData = {
            campaign_id: campaignId,
            session_number: newNumber,
            title: newTitle || null,
            notes: newNotes || null,
            played_at: newDate ? new Date(newDate).toISOString() : new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from("sessions")
            .insert(sessionData)
            .select()
            .single();

        if (error) {
            console.error("Error creating session:", error);
            alert("Errore durante la creazione della sessione.");
        } else if (data) {
            setSessions([data, ...sessions]);
            setIsCreating(false);
            setNewTitle("");
            setNewNotes("");
            setNewNumber(newNumber + 1);
        }
    }

    if (loading) {
        return <div className={styles.loadingState}>Caricamento timeline...</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>Timeline Sessioni</h2>
                {isMaster && (
                    <button
                        className="btn btn-primary"
                        onClick={() => setIsCreating(!isCreating)}
                    >
                        {isCreating ? "Annulla" : "+ Nuova Sessione"}
                    </button>
                )}
            </div>

            {isCreating && (
                <form onSubmit={handleAddSession} className={`card card-glow-teal ${styles.createForm}`}>
                    <div className={styles.creatorHeader}>
                        <h3>📜 Registra Nuova Sessione</h3>
                        <button type="button" className={styles.closeBtn} onClick={() => setIsCreating(false)}>✕</button>
                    </div>

                    <div className={styles.formGrid}>
                        <div className={styles.formField}>
                            <label>Sessione #</label>
                            <input
                                type="number"
                                min="1"
                                className={styles.formInput}
                                value={newNumber}
                                onChange={(e) => setNewNumber(parseInt(e.target.value))}
                                required
                            />
                        </div>
                        <div className={styles.formField}>
                            <label>Data Giocata</label>
                            <input
                                type="date"
                                className={styles.formInput}
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className={`${styles.formField} ${styles.fullWidth}`}>
                            <label>Titolo del Capitolo</label>
                            <input
                                type="text"
                                className={styles.formInput}
                                placeholder="es. L'Oscurità di Sharn"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className={styles.formField}>
                        <label>Appunti della Sessione</label>
                        <textarea
                            className={`${styles.formInput} ${styles.formTextarea}`}
                            placeholder="Cosa è successo in questa avventura? (Markdown supportato)"
                            value={newNotes}
                            onChange={(e) => setNewNotes(e.target.value)}
                            rows={6}
                        />
                    </div>

                    <div className={styles.formActions}>
                        <button type="submit" className="btn btn-primary">
                            ✓ Salva Sessione
                        </button>
                    </div>
                </form>
            )}

            {sessions.length === 0 ? (
                <div className={styles.emptyState}>
                    <p>Nessuna sessione registrata finora.</p>
                </div>
            ) : (
                <div className={styles.timeline}>
                    {sessions.map((session) => (
                        <div key={session.id} className={styles.sessionItem}>
                            <div className={styles.sessionSidebar}>
                                <div className={styles.sessionNumber}>
                                    #{session.session_number}
                                </div>
                                <div className={styles.sessionLine} />
                            </div>

                            <div className={`card ${styles.sessionContent}`}>
                                <div className={styles.sessionHeader}>
                                    <h4>{session.title || `Sessione ${session.session_number}`}</h4>
                                    <span className={styles.sessionDate}>
                                        {new Date(session.played_at).toLocaleDateString("it-IT", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric"
                                        })}
                                    </span>
                                </div>

                                {session.notes ? (
                                    <div className={styles.sessionNotes}>
                                        {session.notes.split('\n').map((paragraph, i) => (
                                            <p key={i}>{paragraph}</p>
                                        ))}
                                    </div>
                                ) : (
                                    <p className={styles.noNotes}>Nessun appunto per questa sessione.</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
