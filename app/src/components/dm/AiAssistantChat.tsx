"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "ai/react";
import { useAuth } from "@/hooks/useAuth";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from "./AiAssistantChat.module.css";

export default function AiAssistantChat() {
    const { profile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
        api: "/api/chat",
        body: {
            isPro: profile?.is_pro,
        },
        onError: (e: Error) => {
            console.error("AI Chat Error:", e);
        }
    });

    // Auto-scroll to bottom of messages
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    // Only render the button if the user is PRO
    if (!profile?.is_pro) {
        return null;
    }

    return (
        <>
            {/* Floating Action Button */}
            <button
                className={styles.fab}
                onClick={() => setIsOpen(!isOpen)}
                title="D&D AI Assistant"
            >
                {isOpen ? "✕" : "✨"}
            </button>

            {/* Chat Panel */}
            <div className={`${styles.chatPanel} ${isOpen ? styles.open : ""}`}>
                <div className={styles.header}>
                    <h3>D&D Assistant</h3>
                    <span className={styles.badge}>PRO</span>
                </div>

                <div className={styles.messageBox}>
                    {messages.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>Sono il tuo assistente per le regole e la lore di campagna.</p>
                            <p className="text-muted" style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
                                Chiedimi qualcosa come: <br />
                                <i>"Come funziona l'attacco di opportunità?"</i> o <br />
                                <i>"Chi è il re di Sharn?"</i>
                            </p>
                        </div>
                    ) : (
                        messages.map((m: any) => (
                            <div
                                key={m.id}
                                className={`${styles.message} ${m.role === "user" ? styles.userMessage : styles.aiMessage
                                    }`}
                            >
                                <div className={styles.messageRole}>
                                    {m.role === "user" ? "Tu" : "Assistente"}
                                </div>
                                <div className={styles.messageContent}>
                                    {m.role === 'user' ? (
                                        m.content
                                    ) : (
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                p: ({ node, children }) => {
                                                    // Flatten children to check if it starts with "Fonti:"
                                                    const content = String(children);
                                                    if (content.startsWith('Fonti:')) {
                                                        return <span className={styles.sources}>{children}</span>;
                                                    }
                                                    return <p>{children}</p>;
                                                }
                                            }}
                                        >
                                            {m.content}
                                        </ReactMarkdown>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                    {isLoading && (
                        <div className={`${styles.message} ${styles.aiMessage}`}>
                            <div className={styles.typingIndicator}>
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    )}
                    {error && (
                        <div className={styles.errorAlert}>
                            Errore: {error.message}
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSubmit} className={styles.inputArea}>
                    <input
                        className={styles.input}
                        value={input || ""}
                        onChange={handleInputChange}
                        placeholder="Fai una domanda (es. regole, npc, lore...)"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        className={styles.sendButton}
                        disabled={isLoading || !(input || "").trim()}
                    >
                        {isLoading ? "..." : "Invia"}
                    </button>
                </form>
            </div>
        </>
    );
}
