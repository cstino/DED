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
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState("");
    const [newContent, setNewContent] = useState("");
    const [editContent, setEditContent] = useState("");
    const [isSyncing, setIsSyncing] = useState(false);

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

    async function handleSaveEdit() {
        if (!selectedPath) return;
        setIsSyncing(true);
        try {
            const res = await fetch("/api/lore", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: selectedPath, content: editContent }),
            });

            if (res.ok) {
                setIsEditing(false);
                setContent(editContent);
            } else {
                alert("Errore durante il salvataggio.");
            }
        } catch (error) {
            console.error("Save error:", error);
            alert("Errore di rete.");
        }
        setIsSyncing(false);
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
                            setIsEditing(false);
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
                                setIsEditing(false);
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
                    <>
                        <div className={styles.contentHeader}>
                            <h3 style={{ margin: 0 }}>
                                {selectedPath.split('/').pop()?.replace(/\.(md|txt)$/, '')}
                            </h3>
                            {isMaster && !isEditing && (
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => {
                                        setIsEditing(true);
                                        setEditContent(content);
                                    }}
                                >
                                    📝 Modifica
                                </button>
                            )}
                        </div>

                        {loadingContent ? (
                            <div className={styles.loadingState}>Lettura file...</div>
                        ) : isEditing ? (
                            <div className={styles.editorWrapper}>
                                <textarea
                                    className={`${styles.formInput} ${styles.editorTextarea}`}
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    autoFocus
                                />
                                <div className={styles.editorActions}>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => setIsEditing(false)}
                                        disabled={isSyncing}
                                    >
                                        Annulla
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleSaveEdit}
                                        disabled={isSyncing}
                                    >
                                        {isSyncing ? "Sincronizzazione IA..." : "Salva e Aggiorna IA"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.markdownWrapper}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {content}
                                </ReactMarkdown>
                            </div>
                        )}
                    </>
                ) : (
                    <div className={styles.emptyState}>
                        <p>Seleziona un file dal menu a sinistra per visualizzarlo o creane uno nuovo.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
