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
    Square,
    ChevronDown,
} from "lucide-react";
import styles from "./EquipmentManager.module.css";

export interface EffectCharges {
    max: number;
    used: number;
    current?: number;
}

export interface ItemEffect {
    stat: string;   // ac, speed, str, dex, con, int, wis, cha, save_str, save_dex, etc.
    value: number;
    mode: "add" | "set";
    description?: string;
    charges?: EffectCharges;
}

export interface EquipmentItem {
    name: string;
    type: string;    // weapon, armor, shield, ring, wondrous, potion, other
    equipped: boolean;
    effects: ItemEffect[];
    description: string;
    charges?: EffectCharges;
}

const STAT_OPTIONS = [
    { value: "custom", label: "Effetto speciale" },
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

export interface EquipmentAdjustment {
    bonus: number;
    setValue?: number;
}

// Keep additive modifiers separate from values that replace the base statistic.
export function calculateEquipmentAdjustments(equipment: EquipmentItem[] = []): Record<string, EquipmentAdjustment> {
    const adjustments: Record<string, EquipmentAdjustment> = {};

    for (const item of equipment) {
        if (!item.equipped) continue;
        for (const effect of item.effects ?? []) {
            const current = adjustments[effect.stat] ?? { bonus: 0 };
            if (effect.mode === "set") {
                current.setValue = current.setValue === undefined
                    ? effect.value
                    : Math.max(current.setValue, effect.value);
            } else {
                current.bonus += effect.value;
            }
            adjustments[effect.stat] = current;
        }
    }

    return adjustments;
}

export function applyEquipmentAdjustment(
    baseValue: number,
    stat: string,
    adjustments: Record<string, EquipmentAdjustment>,
): number {
    const adjustment = adjustments[stat];
    if (!adjustment) return baseValue;
    return (adjustment.setValue ?? baseValue) + adjustment.bonus;
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
    const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

    const [newName, setNewName] = useState("");
    const [newType, setNewType] = useState("other");
    const [newDesc, setNewDesc] = useState("");
    const [newCharges, setNewCharges] = useState<EffectCharges | undefined>();
    const [newEffects, setNewEffects] = useState<ItemEffect[]>([]);

    function resetForm() {
        setNewName("");
        setNewType("other");
        setNewDesc("");
        setNewCharges(undefined);
        setNewEffects([]);
        setShowAddForm(false);
        setEditingIdx(null);
    }

    function addEffect() {
        setNewEffects((prev) => [...prev, { stat: "ac", value: 0, mode: "add", description: "" }]);
    }

    function toggleItemCharges(enabled: boolean) {
        setNewCharges(enabled ? (newCharges ?? { max: 1, used: 0 }) : undefined);
    }

    function updateItemMaxCharges(rawValue: number) {
        const max = Math.max(1, Math.min(20, rawValue || 1));
        setNewCharges((charges) => charges
            ? { max, used: Math.min(charges.used ?? 0, max) }
            : undefined
        );
    }

    function updateEffect(index: number, field: "stat" | "mode" | "value" | "description", value: string | number) {
        setNewEffects((prev) =>
            prev.map((e, i) => (i === index ? { ...e, [field]: value } : e))
        );
    }

    function toggleEffectCharges(index: number, enabled: boolean) {
        setNewEffects((prev) => prev.map((effect, effectIndex) => {
            if (effectIndex !== index) return effect;
            return {
                ...effect,
                charges: enabled
                    ? { max: effect.charges?.max ?? 1, used: effect.charges?.used ?? 0 }
                    : undefined,
            };
        }));
    }

    function updateEffectMaxCharges(index: number, rawValue: number) {
        const max = Math.max(1, Math.min(20, rawValue || 1));
        setNewEffects((prev) => prev.map((effect, effectIndex) => {
            if (effectIndex !== index || !effect.charges) return effect;
            return {
                ...effect,
                charges: {
                    max,
                    used: Math.min(effect.charges.used ?? 0, max),
                },
            };
        }));
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
            effects: newEffects
                .filter((effect) => effect.stat === "custom" || effect.value !== 0 || effect.description?.trim() || effect.charges)
                .map((effect) => ({
                    ...effect,
                    description: effect.description?.trim() || undefined,
                    charges: effect.charges
                        ? {
                            max: Math.max(1, Math.min(20, effect.charges.max)),
                            used: Math.max(0, Math.min(effect.charges.used ?? 0, effect.charges.max)),
                        }
                        : undefined,
                })),
            description: newDesc.trim(),
            charges: newCharges
                ? {
                    max: Math.max(1, Math.min(20, newCharges.max)),
                    used: Math.max(0, Math.min(newCharges.used ?? 0, newCharges.max)),
                }
                : undefined,
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
        setNewCharges(item.charges
            ? { max: item.charges.max, used: item.charges.used ?? 0 }
            : undefined
        );
        setNewEffects((item.effects ?? []).map((effect) => ({
            ...effect,
            description: effect.description ?? "",
            charges: effect.charges
                ? { max: effect.charges.max, used: effect.charges.used ?? 0 }
                : undefined,
        })));
        setEditingIdx(index);
        setShowAddForm(true);
        setExpandedItems((current) => new Set(current).add(index));
    }

    function toggleEquip(index: number) {
        const updated = [...equipment];
        updated[index] = { ...updated[index], equipped: !updated[index].equipped };
        onChange(updated);
    }

    function removeItem(index: number) {
        onChange(equipment.filter((_, i) => i !== index));
        setExpandedItems(new Set());
    }

    function toggleExpanded(index: number) {
        setExpandedItems((current) => {
            const next = new Set(current);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    }

    function setEffectChargeCount(itemIndex: number, effectIndex: number, used: number) {
        const updated = equipment.map((item, index) => {
            if (index !== itemIndex) return item;
            return {
                ...item,
                effects: (item.effects ?? []).map((effect, indexOfEffect) => {
                    if (indexOfEffect !== effectIndex || !effect.charges) return effect;
                    return {
                        ...effect,
                        charges: {
                            max: effect.charges.max,
                            used: Math.max(0, Math.min(used, effect.charges.max)),
                        },
                    };
                }),
            };
        });
        onChange(updated);
    }

    function setItemChargeCount(itemIndex: number, used: number) {
        const updated = equipment.map((item, index) => {
            if (index !== itemIndex || !item.charges) return item;
            return {
                ...item,
                charges: {
                    max: item.charges.max,
                    used: Math.max(0, Math.min(used, item.charges.max)),
                },
            };
        });
        onChange(updated);
    }

    function getEffectTitle(effect: ItemEffect): string {
        return STAT_OPTIONS.find((option) => option.value === effect.stat)?.label || effect.stat;
    }

    function getEffectValue(effect: ItemEffect): string | null {
        if (effect.stat === "custom") return null;
        return effect.mode === "set"
            ? `= ${effect.value}`
            : `${effect.value > 0 ? "+" : ""}${effect.value}`;
    }

    return (
        <div className={styles.container}>
            {equipment.length === 0 && !showAddForm && (
                <p className={styles.empty}>Nessun equipaggiamento. {(editing || canEdit) ? "Aggiungi il primo oggetto!" : ""}</p>
            )}

            {equipment.map((item, idx) => {
                const typeInfo = TYPE_OPTIONS.find((t) => t.value === item.type) || TYPE_OPTIONS[TYPE_OPTIONS.length - 1];
                const Icon = typeInfo.icon;
                const isExpanded = expandedItems.has(idx);
                const effects = item.effects ?? [];

                return (
                    <div
                        key={idx}
                        className={`${styles.itemCard} ${!item.equipped ? styles.itemUnequipped : ""}`}
                    >
                        <div className={styles.itemHeader}>
                            <button
                                type="button"
                                className={styles.itemDisclosure}
                                aria-expanded={isExpanded}
                                aria-controls={`equipment-details-${idx}`}
                                onClick={() => toggleExpanded(idx)}
                            >
                                <span className={styles.iconWrapper} style={{ color: typeInfo.color }}>
                                    <Icon size={20} strokeWidth={2.5} />
                                </span>
                                <span className={styles.itemInfo}>
                                    <span className={styles.itemName}>{item.name}</span>
                                    {item.description && (
                                        <span className={styles.itemDesc}>{item.description}</span>
                                    )}
                                </span>
                                <ChevronDown className={`${styles.disclosureIcon} ${isExpanded ? styles.disclosureIconOpen : ""}`} size={18} />
                            </button>
                            {(editing || canEdit) && (
                                <div className={styles.itemActions}>
                                    <button
                                        type="button"
                                        className={styles.equipBtn}
                                        onClick={() => toggleEquip(idx)}
                                        title={item.equipped ? "Rimuovi" : "Equipaggia"}
                                        aria-label={item.equipped ? `Rimuovi ${item.name}` : `Equipaggia ${item.name}`}
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
                                                aria-label={`Modifica ${item.name}`}
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.deleteBtn}
                                                onClick={() => removeItem(idx)}
                                                aria-label={`Elimina ${item.name}`}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        {!isExpanded && (effects.length > 0 || item.charges) && (
                            <div className={styles.effectsList}>
                                {item.charges && (
                                    <span className={`${styles.effectBadge} ${styles.itemChargesBadge}`}>
                                        Cariche usate {item.charges.used ?? 0}/{item.charges.max}
                                    </span>
                                )}
                                {effects.slice(0, 2).map((eff, ei) => {
                                    const value = getEffectValue(eff);
                                    return (
                                        <span
                                            key={ei}
                                            className={`${styles.effectBadge} ${eff.mode === "set" || eff.value > 0 ? styles.effectPositive : styles.effectNegative}`}
                                        >
                                            {getEffectTitle(eff)}{value ? ` ${value}` : ""}
                                        </span>
                                    );
                                })}
                                {effects.length > 2 && <span className={styles.moreEffects}>+{effects.length - 2}</span>}
                            </div>
                        )}
                        {isExpanded && (
                            <div id={`equipment-details-${idx}`} className={styles.itemDetails}>
                                {item.description && <p className={styles.fullDescription}>{item.description}</p>}
                                {item.charges && (
                                    <div className={`${styles.chargeTracker} ${styles.itemChargeTracker}`}>
                                        <span className={styles.chargeLabel}>Cariche oggetto · Utilizzate {item.charges.used ?? 0}/{item.charges.max}</span>
                                        <div className={styles.chargeDots} role="group" aria-label={`Cariche utilizzate di ${item.name}`}>
                                            {Array.from({ length: item.charges.max }, (_, chargeIndex) => {
                                                const isUsed = chargeIndex < (item.charges?.used ?? 0);
                                                const nextValue = isUsed ? chargeIndex : chargeIndex + 1;
                                                return (
                                                    <button
                                                        type="button"
                                                        key={chargeIndex}
                                                        className={`${styles.chargeDot} ${!isUsed ? styles.chargeDotAvailable : ""}`}
                                                        style={{
                                                            backgroundColor: isUsed ? "transparent" : "#26c6ff",
                                                            borderColor: isUsed ? "#9a654d" : "#26c6ff",
                                                        }}
                                                        aria-label={`${isUsed ? "Ripristina; resteranno" : "Utilizza; diventeranno"} ${isUsed ? chargeIndex : chargeIndex + 1} cariche utilizzate`}
                                                        aria-pressed={isUsed}
                                                        disabled={!(editing || canEdit)}
                                                        onClick={() => setItemChargeCount(idx, nextValue)}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                {effects.length > 0 ? (
                                    <div className={styles.detailEffects}>
                                        {effects.map((effect, effectIndex) => {
                                            const value = getEffectValue(effect);
                                            const charges = effect.charges;
                                            return (
                                                <section className={styles.detailEffect} key={effectIndex}>
                                                    <div className={styles.detailEffectHeader}>
                                                        <strong>{getEffectTitle(effect)}</strong>
                                                        {value && <span>{value}</span>}
                                                    </div>
                                                    {effect.description && <p>{effect.description}</p>}
                                                    {charges && (
                                                        <div className={styles.chargeTracker}>
                                                            <span className={styles.chargeLabel}>Utilizzate {charges.used ?? 0}/{charges.max}</span>
                                                            <div className={styles.chargeDots} role="group" aria-label={`Cariche utilizzate di ${getEffectTitle(effect)}`}>
                                                                {Array.from({ length: charges.max }, (_, chargeIndex) => {
                                                                    const isUsed = chargeIndex < (charges.used ?? 0);
                                                                    const nextValue = isUsed ? chargeIndex : chargeIndex + 1;
                                                                    return (
                                                                        <button
                                                                            type="button"
                                                                            key={chargeIndex}
                                                                            className={`${styles.chargeDot} ${!isUsed ? styles.chargeDotAvailable : ""}`}
                                                                            style={{
                                                                                backgroundColor: isUsed ? "transparent" : "#26c6ff",
                                                                                borderColor: isUsed ? "#9a654d" : "#26c6ff",
                                                                            }}
                                                                            aria-label={`${isUsed ? "Ripristina; resteranno" : "Utilizza; diventeranno"} ${isUsed ? chargeIndex : chargeIndex + 1} cariche utilizzate`}
                                                                            aria-pressed={isUsed}
                                                                            disabled={!(editing || canEdit)}
                                                                            onClick={() => setEffectChargeCount(idx, effectIndex, nextValue)}
                                                                        />
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </section>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className={styles.noEffects}>Nessun effetto configurato.</p>
                                )}
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

                            <textarea
                                className="input"
                                placeholder="Descrizione e regole dell’oggetto (opzionale)..."
                                value={newDesc}
                                onChange={(e) => setNewDesc(e.target.value)}
                                rows={3}
                            />

                            <div className={`${styles.chargesEditor} ${styles.itemChargesEditor}`}>
                                <label className={styles.chargesToggle}>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(newCharges)}
                                        onChange={(e) => toggleItemCharges(e.target.checked)}
                                    />
                                    <span>L’oggetto possiede cariche</span>
                                </label>
                                {newCharges && (
                                    <label className={styles.maxChargesField}>
                                        <span>Cariche massime</span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={20}
                                            className="input"
                                            value={newCharges.max}
                                            onChange={(e) => updateItemMaxCharges(parseInt(e.target.value))}
                                        />
                                    </label>
                                )}
                            </div>

                            <div className={styles.effectsEditor}>
                                <div className={styles.effectsHeader}>
                                    <span>
                                        <span className={styles.effectsTitle}>Effetti dell’oggetto</span>
                                        <span className={styles.effectsHint}>Aggiungi modificatori, capacità speciali e cariche.</span>
                                    </span>
                                </div>

                                {newEffects.map((eff, idx) => (
                                    <div key={idx} className={styles.effectBlock}>
                                        <div className={styles.effectBlockHeader}>
                                            <span>Effetto {idx + 1}</span>
                                            <button type="button" className={styles.removeEffectBtn} onClick={() => removeEffect(idx)} aria-label={`Rimuovi effetto ${idx + 1}`}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <div className={styles.effectFields}>
                                            <label className={styles.fieldGroup}>
                                                <span>Tipo di effetto</span>
                                                <select
                                                    className="input"
                                                    value={eff.stat}
                                                    onChange={(e) => updateEffect(idx, "stat", e.target.value)}
                                                >
                                                    {STAT_OPTIONS.map((s) => (
                                                        <option key={s.value} value={s.value}>{s.label}</option>
                                                    ))}
                                                </select>
                                            </label>
                                            {eff.stat !== "custom" && (
                                                <>
                                                    <label className={styles.fieldGroup}>
                                                        <span>Applicazione</span>
                                                        <select
                                                            className="input"
                                                            value={eff.mode}
                                                            onChange={(e) => updateEffect(idx, "mode", e.target.value)}
                                                        >
                                                            <option value="add">Bonus / Malus</option>
                                                            <option value="set">Imposta valore</option>
                                                        </select>
                                                    </label>
                                                    <label className={`${styles.fieldGroup} ${styles.valueField}`}>
                                                        <span>Valore</span>
                                                        <input
                                                            type="number"
                                                            className="input"
                                                            value={eff.value}
                                                            onChange={(e) => updateEffect(idx, "value", parseInt(e.target.value) || 0)}
                                                        />
                                                    </label>
                                                </>
                                            )}
                                        </div>
                                        <label className={styles.fieldGroup}>
                                            <span>Descrizione dell’effetto <small>opzionale</small></span>
                                            <textarea
                                                className="input"
                                                value={eff.description ?? ""}
                                                onChange={(e) => updateEffect(idx, "description", e.target.value)}
                                                placeholder="Es. Come azione, emette luce intensa per 1 minuto."
                                                rows={2}
                                            />
                                        </label>
                                        <div className={styles.chargesEditor}>
                                            <label className={styles.chargesToggle}>
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(eff.charges)}
                                                    onChange={(e) => toggleEffectCharges(idx, e.target.checked)}
                                                />
                                                <span>Questo effetto usa cariche</span>
                                            </label>
                                            {eff.charges && (
                                                <label className={styles.maxChargesField}>
                                                    <span>Cariche massime</span>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={20}
                                                        className="input"
                                                        value={eff.charges.max}
                                                        onChange={(e) => updateEffectMaxCharges(idx, parseInt(e.target.value))}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <button type="button" className={styles.addEffectBtn} onClick={addEffect}>
                                    + Aggiungi un altro effetto
                                </button>
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
