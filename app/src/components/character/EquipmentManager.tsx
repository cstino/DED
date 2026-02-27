"use client";

import { useState } from "react";
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
    { value: "weapon", label: "🗡️ Arma" },
    { value: "armor", label: "🛡️ Armatura" },
    { value: "shield", label: "🛡️ Scudo" },
    { value: "ring", label: "💍 Anello" },
    { value: "wondrous", label: "✨ Oggetto Meraviglioso" },
    { value: "potion", label: "🧪 Pozione" },
    { value: "other", label: "📦 Altro" },
];

// Calculate all stat modifications from equipped items
export function calculateEquipmentBonuses(equipment: EquipmentItem[]): Record<string, number> {
    const bonuses: Record<string, number> = {};
    const setValues: Record<string, number> = {};

    for (const item of equipment) {
        if (!item.equipped) continue;
        for (const effect of item.effects) {
            if (effect.mode === "set") {
                // "set" mode: use the highest set value
                setValues[effect.stat] = Math.max(setValues[effect.stat] ?? 0, effect.value);
            } else {
                // "add" mode: accumulate
                bonuses[effect.stat] = (bonuses[effect.stat] ?? 0) + effect.value;
            }
        }
    }

    // Merge: set values override base, then add bonuses on top
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
}

export default function EquipmentManager({ equipment, onChange, editing }: Props) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);

    // New item form state
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

    const typeIcon = (type: string) =>
        TYPE_OPTIONS.find((t) => t.value === type)?.label.split(" ")[0] || "📦";

    return (
        <div className={styles.container}>
            {/* Equipment List */}
            {equipment.length === 0 && !showAddForm && (
                <p className={styles.empty}>Nessun equipaggiamento. {editing ? "Aggiungi il primo oggetto!" : ""}</p>
            )}

            {equipment.map((item, idx) => (
                <div
                    key={idx}
                    className={`${styles.itemCard} ${!item.equipped ? styles.itemUnequipped : ""}`}
                >
                    <div className={styles.itemHeader}>
                        <span className={styles.itemIcon}>{typeIcon(item.type)}</span>
                        <div className={styles.itemInfo}>
                            <span className={styles.itemName}>{item.name}</span>
                            {item.description && (
                                <span className={styles.itemDesc}>{item.description}</span>
                            )}
                        </div>
                        {editing && (
                            <div className={styles.itemActions}>
                                <button
                                    type="button"
                                    className={styles.equipBtn}
                                    onClick={() => toggleEquip(idx)}
                                    title={item.equipped ? "Rimuovi" : "Equipaggia"}
                                >
                                    {item.equipped ? "✅" : "⬜"}
                                </button>
                                <button
                                    type="button"
                                    className={styles.editBtn}
                                    onClick={() => startEdit(idx)}
                                >✏️</button>
                                <button
                                    type="button"
                                    className={styles.deleteBtn}
                                    onClick={() => removeItem(idx)}
                                >🗑️</button>
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
            ))}

            {/* Add / Edit Form */}
            {editing && (
                <>
                    {showAddForm ? (
                        <div className={styles.addForm}>
                            <h4>{editingIdx !== null ? "Modifica Oggetto" : "Nuovo Oggetto"}</h4>

                            <div className={styles.formRow}>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Nome oggetto..."
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    style={{ flex: 2 }}
                                />
                                <select
                                    className="input"
                                    value={newType}
                                    onChange={(e) => setNewType(e.target.value)}
                                    style={{ flex: 1 }}
                                >
                                    {TYPE_OPTIONS.map((t) => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>

                            <input
                                type="text"
                                className="input"
                                placeholder="Descrizione (opzionale)..."
                                value={newDesc}
                                onChange={(e) => setNewDesc(e.target.value)}
                            />

                            {/* Effects */}
                            <div className={styles.effectsEditor}>
                                <div className={styles.effectsHeader}>
                                    <span className={styles.effectsTitle}>Effetti</span>
                                    <button type="button" className={styles.addEffectBtn} onClick={addEffect}>
                                        + Aggiungi Effetto
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
                                            style={{ flex: 1 }}
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
                                            ✕
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
