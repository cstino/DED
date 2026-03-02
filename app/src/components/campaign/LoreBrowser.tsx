"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./LoreBrowser.module.css";
import { LoreFile } from "@/app/api/lore/route";

export function LoreBrowser() {
    const [tree, setTree] = useState<LoreFile[]>([]);
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    const [content, setContent] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [loadingContent, setLoadingContent] = useState(false);

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
                        onClick={() => setSelectedPath(item.path)}
                    >
                        <span className={styles.fileIcon}>📄</span>
                        {item.name}
                    </button>
                )}
                {item.children && renderTree(item.children, depth + 1)}
            </div>
        ));
    }

    if (loading) return <div className={styles.loadingState}>Caricamento archivio...</div>;

    return (
        <div className={styles.container}>
            <div className={`card ${styles.sidebar}`}>
                <h3>Archivio Campagna</h3>
                <div className={styles.treeContainer}>
                    {tree.length === 0 ? (
                        <p className={styles.emptyText}>Nessun file trovato.</p>
                    ) : (
                        renderTree(tree)
                    )}
                </div>
            </div>

            <div className={`card ${styles.contentArea}`}>
                {selectedPath ? (
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
                        <p>Seleziona un file dal menu a sinistra per visualizzarlo.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
