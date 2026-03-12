"use client";
import React, { useState } from "react";
import {
    Sword,
    Shield,
    Shirt,
    CircleDot,
    Sparkles,
    FlaskConical,
    Package,
    Pencil,
    Trash2,
    Check,
    Square
} from "lucide-react";
import styles from "./EquipmentManager.module.css";

export interface ItemEffect {
    stat: string;   // ac, speed, str, dex, con, int, wis, cha, save_str, save_dex, etc.
    value: number;
    mode: "add" | "set";
}

export interface EquipmentItem {
    name: string;
    type: string;    // weapon, armor, shield, ring, wondrous, potion, other
    equipped: boolean;
    effects: ItemEffect[];
    description: string;
}

const STAT_OPTIONS = [
    { value: "ac", label: "CA (Classe Armatura)" },
    { value: "speed", label: "Velocità" },
    { value: "str", label: "Forza" },
    { value: "dex", label: "Destrezza" },
    { value: "con", label: "Costituzione" },
    { value: "int", label: "Intelligenza" },
    { value: "wis", label: "Saggezza" },
    { value: "cha", label: "Carisma" },
    { value: "save_str", label: "T.S. Forza" },
    { value: "save_dex", label: "T.S. Destrezza" },
    { value: "save_con", label: "T.S. Costituzione" },
    { value: "save_int", label: "T.S. Intelligenza" },
    { value: "save_wis", label: "T.S. Saggezza" },
    { value: "save_cha", label: "T.S. Carisma" },
    { value: "hp_max", label: "HP Massimi" },
];

const TYPE_OPTIONS = [
    { value: "weapon", label: "Arma", icon: Sword, color: "#f87171" }, // red-ish
    { value: "armor", label: "Armatura", icon: Shirt, color: "#a78bfa" }, // purple
    { value: "shield", label: "Scudo", icon: Shield, color: "#60a5fa" }, // blue
    { value: "ring", label: "Anello", icon: CircleDot, color: "#fb7185" }, // rose
    { value: "wondrous", label: "Oggetto Meraviglioso", icon: Sparkles, color: "#fbbf24" }, // amber
    { value: "potion", label: "Pozione", icon: FlaskConical, color: "#34d399" }, // emerald
    { value: "other", label: "Altro", icon: Package, color: "#94a3b8" }, // slate
];

// Calculate all stat modifications from equipped items
export function calculateEquipmentBonuses(equipment: EquipmentItem[]): Record<string, number> {
    const bonuses: Record<string, number> = {};
    const setValues: Record<string, number> = {};

    for (const item of equipment) {
        if (!item.equipped) continue;
        for (const effect of item.effects) {
            if (effect.mode === "set") {
                setValues[effect.stat] = Math.max(setValues[effect.stat] ?? 0, effect.value);
            } else {
                bonuses[effect.stat] = (bonuses[effect.stat] ?? 0) + effect.value;
            }
        }
    }

    const result: Record<string, number> = {};
    for (const stat of new Set([...Object.keys(bonuses), ...Object.keys(setValues)])) {
        if (stat in setValues) {
            result[stat] = setValues[stat] + (bonuses[stat] ?? 0);
        } else {
            result[stat] = bonuses[stat] ?? 0;
        }
    }
    return result;
}

interface Props {
    equipment: EquipmentItem[];
    onChange: (equipment: EquipmentItem[]) => void;
    editing: boolean;
    canEdit?: boolean;
}

export default function EquipmentManager({ equipment, onChange, editing, canEdit = false }: Props) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);

    const [newName, setNewName] = useState("");
    const [newType, setNewType] = useState("other");
    const [newDesc, setNewDesc] = useState("");
    const [newEffects, setNewEffects] = useState<ItemEffect[]>([]);

    function resetForm() {
        setNewName("");
        setNewType("other");
        setNewDesc("");
        setNewEffects([]);
        setShowAddForm(false);
        setEditingIdx(null);
    }

    function addEffect() {
        setNewEffects((prev) => [...prev, { stat: "ac", value: 0, mode: "add" }]);
    }

    function updateEffect(index: number, field: keyof ItemEffect, value: string | number) {
        setNewEffects((prev) =>
            prev.map((e, i) => (i === index ? { ...e, [field]: value } : e))
        );
    }

    function removeEffect(index: number) {
        setNewEffects((prev) => prev.filter((_, i) => i !== index));
    }

    function saveItem() {
        if (!newName.trim()) return;

        const item: EquipmentItem = {
            name: newName.trim(),
            type: newType,
            equipped: true,
            effects: newEffects.filter((e) => e.value !== 0),
            description: newDesc.trim(),
        };

        if (editingIdx !== null) {
            const updated = [...equipment];
            updated[editingIdx] = { ...item, equipped: equipment[editingIdx].equipped };
            onChange(updated);
        } else {
            onChange([...equipment, item]);
        }
        resetForm();
    }

    function startEdit(index: number) {
        const item = equipment[index];
        setNewName(item.name);
        setNewType(item.type);
        setNewDesc(item.description);
        setNewEffects([...item.effects]);
        setEditingIdx(index);
        setShowAddForm(true);
    }

    function toggleEquip(index: number) {
        const updated = [...equipment];
        updated[index] = { ...updated[index], equipped: !updated[index].equipped };
        onChange(updated);
    }

    function removeItem(index: number) {
        onChange(equipment.filter((_, i) => i !== index));
    }

    return (
        <div className={styles.container}>
            {equipment.length === 0 && !showAddForm && (
                <p className={styles.empty}>Nessun equipaggiamento. {(editing || canEdit) ? "Aggiungi il primo oggetto!" : ""}</p>
            )}

            {equipment.map((item, idx) => {
                const typeInfo = TYPE_OPTIONS.find((t) => t.value === item.type) || TYPE_OPTIONS[TYPE_OPTIONS.length - 1];
                const Icon = typeInfo.icon;

                return (
                    <div
                        key={idx}
                        className={`${styles.itemCard} ${!item.equipped ? styles.itemUnequipped : ""}`}
                    >
                        <div className={styles.itemHeader}>
                            <div className={styles.iconWrapper} style={{ color: typeInfo.color }}>
                                <Icon size={20} strokeWidth={2.5} />
                            </div>
                            <div className={styles.itemInfo}>
                                <span className={styles.itemName}>{item.name}</span>
                                {item.description && (
                                    <span className={styles.itemDesc}>{item.description}</span>
                                )}
                            </div>
                            {(editing || canEdit) && (
                                <div className={styles.itemActions}>
                                    <button
                                        type="button"
                                        className={styles.equipBtn}
                                        onClick={() => toggleEquip(idx)}
                                        title={item.equipped ? "Rimuovi" : "Equipaggia"}
                                        style={{ color: item.equipped ? "var(--accent-teal)" : "var(--text-muted)" }}
                                    >
                                        {item.equipped ? <Check size={18} strokeWidth={3} /> : <Square size={18} />}
                                    </button>
                                    {editing && (
                                        <>
                                            <button
                                                type="button"
                                                className={styles.editBtn}
                                                onClick={() => startEdit(idx)}
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.deleteBtn}
                                                onClick={() => removeItem(idx)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        {item.effects.length > 0 && (
                            <div className={styles.effectsList}>
                                {item.effects.map((eff, ei) => {
                                    const label = STAT_OPTIONS.find((s) => s.value === eff.stat)?.label || eff.stat;
                                    return (
                                        <span
                                            key={ei}
                                            className={`${styles.effectBadge} ${eff.value > 0 ? styles.effectPositive : styles.effectNegative}`}
                                        >
                                            {eff.mode === "set" ? `${label} = ${eff.value}` : `${label} ${eff.value > 0 ? "+" : ""}${eff.value}`}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}

            {(editing || canEdit) && (
                <>
                    {showAddForm ? (
                        <div className={styles.addForm}>
                            <h4 className={styles.formTitle}>
                                {editingIdx !== null ? "Modifica Oggetto" : "Nuovo Oggetto"}
                            </h4>

                            <div className={styles.formRow}>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Nome oggetto..."
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    style={{ flex: 2 }}
                                />
                                <div className={styles.selectWrapper}>
                                    <select
                                        className="input"
                                        value={newType}
                                        onChange={(e) => setNewType(e.target.value)}
                                    >
                                        {TYPE_OPTIONS.map((t) => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <input
                                type="text"
                                className="input"
                                placeholder="Descrizione (opzionale)..."
                                value={newDesc}
                                onChange={(e) => setNewDesc(e.target.value)}
                            />

                            <div className={styles.effectsEditor}>
                                <div className={styles.effectsHeader}>
                                    <span className={styles.effectsTitle}>Effetti Statistici</span>
                                    <button type="button" className={styles.addEffectBtn} onClick={addEffect}>
                                        + Aggiungi
                                    </button>
                                </div>

                                {newEffects.map((eff, idx) => (
                                    <div key={idx} className={styles.effectRow}>
                                        <select
                                            className="input"
                                            value={eff.stat}
                                            onChange={(e) => updateEffect(idx, "stat", e.target.value)}
                                            style={{ flex: 2 }}
                                        >
                                            {STAT_OPTIONS.map((s) => (
                                                <option key={s.value} value={s.value}>{s.label}</option>
                                            ))}
                                        </select>
                                        <select
                                            className="input"
                                            value={eff.mode}
                                            onChange={(e) => updateEffect(idx, "mode", e.target.value)}
                                            style={{ flex: 1.5 }}
                                        >
                                            <option value="add">Bonus (+/−)</option>
                                            <option value="set">Imposta (=)</option>
                                        </select>
                                        <input
                                            type="number"
                                            className="input"
                                            value={eff.value}
                                            onChange={(e) => updateEffect(idx, "value", parseInt(e.target.value) || 0)}
                                            style={{ width: 70 }}
                                        />
                                        <button type="button" className={styles.removeEffectBtn} onClick={() => removeEffect(idx)}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className={styles.formActions}>
                                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                                    Annulla
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={saveItem}
                                    disabled={!newName.trim()}
                                >
                                    {editingIdx !== null ? "Salva Modifiche" : "Aggiungi"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className={styles.addItemBtn}
                            onClick={() => setShowAddForm(true)}
                        >
                            + Aggiungi Oggetto
                        </button>
                    )}
                </>
            )}
        </div>
    );
}
