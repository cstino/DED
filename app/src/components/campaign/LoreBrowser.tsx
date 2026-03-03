"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./LoreBrowser.module.css";
import { LoreFile } from "@/app/api/lore/route";

interface LoreBrowserProps {
    isMaster?: boolean;
}

export function LoreBrowser({ isMaster = false }: LoreBrowserProps) {
    const [tree, setTree] = useState<LoreFile[]>([]);
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    const [content, setContent] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [loadingContent, setLoadingContent] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const [newContent, setNewContent] = useState("");

    useEffect(() => {
        fetchTree();
    }, []);

    useEffect(() => {
        if (selectedPath) {
            fetchContent(selectedPath);
        }
    }, [selectedPath]);

    async function fetchTree() {
        setLoading(true);
        try {
            const res = await fetch("/api/lore");
            if (res.ok) {
                const data = await res.json();
                setTree(data.tree || []);
            }
        } catch (error) {
            console.error("Failed to fetch lore tree:", error);
        }
        setLoading(false);
    }

    async function fetchContent(pathStr: string) {
        setLoadingContent(true);
        try {
            const res = await fetch(`/api/lore?path=${encodeURIComponent(pathStr)}`);
            if (res.ok) {
                const data = await res.json();
                setContent(data.content || "");
            } else {
                setContent("Errore durante il caricamento del file.");
            }
        } catch (error) {
            console.error("Failed to fetch lore content:", error);
            setContent("Errore di rete.");
        }
        setLoadingContent(false);
    }

    async function handleCreateFile(e: React.FormEvent) {
        e.preventDefault();
        try {
            const res = await fetch("/api/lore", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName, content: newContent }),
            });

            if (res.ok) {
                setIsCreating(false);
                setNewName("");
                setNewContent("");
                fetchTree();
            } else {
                alert("Errore durante la creazione del file.");
            }
        } catch (error) {
            console.error("Create error:", error);
            alert("Errore di rete.");
        }
    }

    async function handleDeleteFile(e: React.MouseEvent, pathStr: string) {
        e.stopPropagation();
        if (!confirm(`Sei sicuro di voler eliminare il file "${pathStr}"?`)) return;

        try {
            const res = await fetch(`/api/lore?path=${encodeURIComponent(pathStr)}`, {
                method: "DELETE",
            });

            if (res.ok) {
                if (selectedPath === pathStr) {
                    setSelectedPath(null);
                    setContent("");
                }
                fetchTree();
            } else {
                const data = await res.json();
                alert(data.error || "Errore durante l'eliminazione.");
            }
        } catch (error) {
            console.error("Delete error:", error);
            alert("Errore di rete.");
        }
    }

    function renderTree(items: LoreFile[], depth = 0) {
        return items.map((item) => (
            <div key={item.path} style={{ marginLeft: `${depth * 12}px` }}>
                {item.isDirectory ? (
                    <div className={styles.categoryItem}>
                        <span className={styles.folderIcon}>📁</span>
                        {item.name}
                    </div>
                ) : (
                    <button
                        className={`${styles.fileItem} ${selectedPath === item.path ? styles.fileItemActive : ''}`}
                        onClick={() => {
                            setSelectedPath(item.path);
                            setIsCreating(false);
                        }}
                    >
                        <div className={styles.fileItemContent}>
                            <span className={styles.fileIcon}>📄</span>
                            {item.name}
                        </div>
                        {isMaster && (
                            <span
                                className={styles.deleteFileBtn}
                                onClick={(e) => handleDeleteFile(e, item.path)}
                                title="Elimina file"
                            >
                                🗑️
                            </span>
                        )}
                    </button>
                )}
                {item.children && renderTree(item.children, depth + 1)}
            </div>
        ));
    }

    if (loading && tree.length === 0) return <div className={styles.loadingState}>Caricamento archivio...</div>;

    return (
        <div className={styles.container}>
            <div className={`card ${styles.sidebar}`}>
                <div className={styles.sidebarHeader}>
                    <h3>Archivio Campagna</h3>
                    {isMaster && (
                        <button
                            className={styles.addFileBtn}
                            onClick={() => {
                                setIsCreating(true);
                                setSelectedPath(null);
                            }}
                            title="Nuovo file"
                        >
                            +
                        </button>
                    )}
                </div>
                <div className={styles.treeContainer}>
                    {tree.length === 0 ? (
                        <p className={styles.emptyText}>Nessun file trovato.</p>
                    ) : (
                        renderTree(tree)
                    )}
                </div>
            </div>

            <div className={`card ${styles.contentArea}`}>
                {isCreating ? (
                    <form onSubmit={handleCreateFile} className={styles.creatorForm}>
                        <div className={styles.creatorHeader}>
                            <h3>Crea Nuovo Documento</h3>
                            <button type="button" className={styles.closeCreator} onClick={() => setIsCreating(false)}>✕</button>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Nome File (senza estensione)</label>
                            <input
                                type="text"
                                className={styles.formInput}
                                placeholder="es. Leggende di Xen'drik"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Contenuto (Markdown supportato)</label>
                            <textarea
                                className={`${styles.formInput} ${styles.formTextarea}`}
                                placeholder="Scrivi qui le informazioni..."
                                value={newContent}
                                onChange={(e) => setNewContent(e.target.value)}
                                required
                            />
                        </div>
                        <div className={styles.formActions}>
                            <button type="submit" className="btn btn-primary">Salva Documento</button>
                        </div>
                    </form>
                ) : selectedPath ? (
                    loadingContent ? (
                        <div className={styles.loadingState}>Lettura file...</div>
                    ) : (
                        <div className={styles.markdownWrapper}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {content}
                            </ReactMarkdown>
                        </div>
                    )
                ) : (
                    <div className={styles.emptyState}>
                        <p>Seleziona un file dal menu a sinistra per visualizzarlo o creane uno nuovo.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
