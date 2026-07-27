"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/lib/supabase";
import { useRef } from "react";
import styles from "./LoreBrowser.module.css";
import { LoreFile } from "@/app/api/lore/route";

// Recursively collect all folder paths from the tree
function collectFolders(items: LoreFile[], prefix = ''): { path: string; name: string }[] {
    const folders: { path: string; name: string }[] = [];
    for (const item of items) {
        if (item.isDirectory) {
            folders.push({ path: item.path, name: prefix + item.name });
            if (item.children) {
                folders.push(...collectFolders(item.children, prefix + item.name + '/'));
            }
        }
    }
    return folders;
}

interface LoreBrowserProps {
    isMaster?: boolean;
    campaignSlug?: string;
}

export function LoreBrowser({ isMaster = false, campaignSlug = "" }: LoreBrowserProps) {
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
    const [movingPath, setMovingPath] = useState<string | null>(null);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [isDraftLoaded, setIsDraftLoaded] = useState(false);

    const params = useParams();
    const campaignId = params?.id as string;

    const fileInputRef = useRef<HTMLInputElement>(null);
    const createTextareaRef = useRef<HTMLTextAreaElement>(null);
    const editTextareaRef = useRef<HTMLTextAreaElement>(null);
    const campaignQuery = campaignSlug ? `&campaign=${encodeURIComponent(campaignSlug)}` : "";

    const fetchTree = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/lore?campaign=${encodeURIComponent(campaignSlug)}`);
            if (res.ok) {
                const data = await res.json();
                setTree(data.tree || []);
            }
        } catch (error) {
            console.error("Failed to fetch lore tree:", error);
        }
        setLoading(false);
    }, [campaignSlug]);

    const fetchContent = useCallback(async (pathStr: string) => {
        setLoadingContent(true);
        try {
            const res = await fetch(`/api/lore?path=${encodeURIComponent(pathStr)}${campaignQuery}`);
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
    }, [campaignQuery]);

    useEffect(() => {
        fetchTree();
    }, [fetchTree]);

    // Persistence logic
    useEffect(() => {
        if (!campaignId) return;
        const saved = localStorage.getItem(`magehand-lore-edit-${campaignId}`);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.isCreating) setIsCreating(data.isCreating);
                if (data.newName) setNewName(data.newName);
                if (data.newContent) setNewContent(data.newContent);
                if (data.isEditing) setIsEditing(data.isEditing);
                if (data.selectedPath) setSelectedPath(data.selectedPath);
                if (data.editContent) setEditContent(data.editContent);
            } catch (e) {
                console.error("Failed to load lore draft", e);
            }
        }
        setIsDraftLoaded(true);
    }, [campaignId]);

    useEffect(() => {
        if (!isDraftLoaded || !campaignId) return;
        const draft = {
            isCreating,
            newName,
            newContent,
            isEditing,
            selectedPath,
            editContent
        };
        localStorage.setItem(`magehand-lore-edit-${campaignId}`, JSON.stringify(draft));
    }, [isDraftLoaded, campaignId, isCreating, newName, newContent, isEditing, selectedPath, editContent]);

    useEffect(() => {
        if (selectedPath) {
            fetchContent(selectedPath);
        }
    }, [selectedPath, fetchContent]);

    async function handleCreateFile(e: React.FormEvent) {
        e.preventDefault();
        try {
            const res = await fetch(`/api/lore?campaign=${encodeURIComponent(campaignSlug)}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName, content: newContent }),
            });

            if (res.ok) {
                setIsCreating(false);
                setNewName("");
                setNewContent("");
                localStorage.removeItem(`magehand-lore-edit-${campaignId}`);
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
            const res = await fetch(`/api/lore?campaign=${encodeURIComponent(campaignSlug)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: selectedPath, content: editContent }),
            });

            if (res.ok) {
                setIsEditing(false);
                setContent(editContent);
                localStorage.removeItem(`magehand-lore-edit-${campaignId}`);
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
            const res = await fetch(`/api/lore?path=${encodeURIComponent(pathStr)}${campaignQuery}`, {
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

    async function handleMoveFile(targetFolder: string) {
        if (!movingPath) return;
        try {
            const res = await fetch(`/api/lore?campaign=${encodeURIComponent(campaignSlug)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ from: movingPath, to: targetFolder }),
            });

            if (res.ok) {
                if (selectedPath === movingPath) {
                    setSelectedPath(null);
                    setContent("");
                }
                setMovingPath(null);
                fetchTree();
            } else {
                const data = await res.json();
                alert(data.error || "Errore durante lo spostamento.");
            }
        } catch (error) {
            console.error("Move error:", error);
            alert("Errore di rete.");
        }
    }

    async function handleCreateFolder(e: React.FormEvent) {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        try {
            const res = await fetch(`/api/lore?campaign=${encodeURIComponent(campaignSlug)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "create-folder", folderPath: newFolderName.trim() }),
            });

            if (res.ok) {
                setIsCreatingFolder(false);
                setNewFolderName("");
                fetchTree();
            } else {
                const data = await res.json();
                alert(data.error || "Errore durante la creazione della cartella.");
            }
        } catch (error) {
            console.error("Create folder error:", error);
            alert("Errore di rete.");
        }
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>, target: 'create' | 'edit') {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `lore-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            const filePath = `lore/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('character-portraits')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('character-portraits')
                .getPublicUrl(filePath);

            const markdownImage = `\n![immagine](${publicUrl})\n`;

            if (target === 'create') {
                const textarea = createTextareaRef.current;
                if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const text = newContent;
                    const before = text.substring(0, start);
                    const after = text.substring(end);
                    setNewContent(before + markdownImage + after);
                } else {
                    setNewContent(prev => prev + markdownImage);
                }
            } else {
                const textarea = editTextareaRef.current;
                if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const text = editContent;
                    const before = text.substring(0, start);
                    const after = text.substring(end);
                    setEditContent(before + markdownImage + after);
                } else {
                    setEditContent(prev => prev + markdownImage);
                }
            }
        } catch (error) {
            console.error("Image upload failed:", error);
            alert("Errore durante il caricamento dell'immagine.");
        } finally {
            setIsUploading(false);
            if (e.target) e.target.value = '';
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
                            <div className={styles.fileActions}>
                                <span
                                    className={styles.moveFileBtn}
                                    onClick={(e) => { e.stopPropagation(); setMovingPath(item.path); }}
                                    title="Sposta file"
                                >
                                    📂
                                </span>
                                <span
                                    className={styles.deleteFileBtn}
                                    onClick={(e) => handleDeleteFile(e, item.path)}
                                    title="Elimina file"
                                >
                                    🗑️
                                </span>
                            </div>
                        )}
                    </button>
                )}
                {item.children && renderTree(item.children, depth + 1)}
            </div>
        ));
    }

    const allFolders = collectFolders(tree);

    if (loading && tree.length === 0) return <div className={styles.loadingState}>Caricamento archivio...</div>;

    return (
        <div className={styles.container}>
            <div className={`card ${styles.sidebar}`}>
                <div className={styles.sidebarHeader}>
                    <h3>Archivio Campagna</h3>
                    {isMaster && (
                        <div className={styles.sidebarActions}>
                            <button
                                className={styles.addFileBtn}
                                onClick={() => {
                                    setIsCreatingFolder(true);
                                    setNewFolderName("");
                                }}
                                title="Nuova cartella"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path><line x1="12" y1="10" x2="12" y2="16"></line><line x1="9" y1="13" x2="15" y2="13"></line></svg>
                            </button>
                            <button
                                className={styles.addFileBtn}
                                onClick={() => {
                                    setIsCreating(true);
                                    setSelectedPath(null);
                                    setIsEditing(false);
                                }}
                                title="Nuovo file"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                            </button>
                        </div>
                    )}
                </div>
                {isCreatingFolder && (
                    <form className={styles.createFolderForm} onSubmit={handleCreateFolder}>
                        <input
                            className={styles.createFolderInput}
                            type="text"
                            placeholder="Nome cartella..."
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            autoFocus
                        />
                        <button type="submit" className={styles.createFolderSubmit}>✓</button>
                        <button type="button" className={styles.createFolderCancel} onClick={() => setIsCreatingFolder(false)}>✕</button>
                    </form>
                )}
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
                            <div className={styles.editorToolbar}>
                                <button
                                    type="button"
                                    className={styles.toolbarBtn}
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                >
                                    {isUploading ? "📤 Caricamento..." : "🖼️ Inserisci Immagine"}
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className={styles.hiddenInput}
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, 'create')}
                                />
                            </div>
                            <textarea
                                ref={createTextareaRef}
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
                                <div className={styles.editorToolbar}>
                                    <button
                                        type="button"
                                        className={styles.toolbarBtn}
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                    >
                                        {isUploading ? "📤 Caricamento..." : "🖼️ Inserisci Immagine"}
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className={styles.hiddenInput}
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(e, 'edit')}
                                    />
                                </div>
                                <textarea
                                    ref={editTextareaRef}
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

            {/* Folder Picker Overlay */}
            {movingPath && (
                <div className={styles.folderPickerOverlay} onClick={() => setMovingPath(null)}>
                    <div className={styles.folderPicker} onClick={(e) => e.stopPropagation()}>
                        <h4 className={styles.folderPickerTitle}>Sposta &quot;{movingPath.split('/').pop()}&quot; in...</h4>
                        <div className={styles.folderPickerList}>
                            <button
                                className={styles.folderPickerItem}
                                onClick={() => handleMoveFile('')}
                            >
                                📂 Radice (nessuna cartella)
                            </button>
                            {allFolders.map((folder) => (
                                <button
                                    key={folder.path}
                                    className={styles.folderPickerItem}
                                    onClick={() => handleMoveFile(folder.path)}
                                >
                                    📁 {folder.name}
                                </button>
                            ))}
                        </div>
                        <button
                            className={styles.folderPickerCancel}
                            onClick={() => setMovingPath(null)}
                        >
                            Annulla
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
