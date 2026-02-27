"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./SpellBrowser.module.css";

interface Spell {
    id: string;
    name: string;
    level: number;
    school: string;
    casting_time: string;
    range: string;
    components: string;
    duration: string;
    description: string;
    is_concentration: boolean;
    is_ritual: boolean;
    casters: Record<string, boolean>;
}

const SCHOOLS = [
    "abjuration", "conjuration", "divination", "enchantment",
    "evocation", "illusion", "necromancy", "transmutation", "transformation",
];

const SCHOOL_IT: Record<string, string> = {
    abjuration: "Abiurazione", conjuration: "Evocazione", divination: "Divinazione",
    enchantment: "Ammaliamento", evocation: "Invocazione", illusion: "Illusione",
    necromancy: "Necromanzia", transmutation: "Trasmutazione", transformation: "Trasmutazione",
};

const CASTER_CLASSES = ["bard", "cleric", "druid", "paladin", "ranger", "sorcerer", "warlock", "wizard"];

interface Props {
    knownSpells: string[];
    onAddSpell: (name: string) => void;
    onRemoveSpell: (name: string) => void;
    onClose: () => void;
}

export default function SpellBrowser({ knownSpells, onAddSpell, onRemoveSpell, onClose }: Props) {
    const [allSpells, setAllSpells] = useState<Spell[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState("");
    const [levelFilter, setLevelFilter] = useState<number | null>(null);
    const [schoolFilter, setSchoolFilter] = useState("");
    const [classFilter, setClassFilter] = useState("");
    const [concFilter, setConcFilter] = useState<boolean | null>(null);
    const [ritualFilter, setRitualFilter] = useState<boolean | null>(null);

    // Expanded spell
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            const { data } = await supabase
                .from("spells")
                .select("*")
                .order("level")
                .order("name");
            if (data) setAllSpells(data);
            setLoading(false);
        }
        load();
    }, []);

    const filtered = useMemo(() => {
        return allSpells.filter((s) => {
            if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
            if (levelFilter !== null && s.level !== levelFilter) return false;
            if (schoolFilter && s.school.toLowerCase() !== schoolFilter.toLowerCase()) return false;
            if (classFilter && !s.casters?.[classFilter]) return false;
            if (concFilter !== null && s.is_concentration !== concFilter) return false;
            if (ritualFilter !== null && s.is_ritual !== ritualFilter) return false;
            return true;
        });
    }, [allSpells, search, levelFilter, schoolFilter, classFilter, concFilter, ritualFilter]);

    const activeFilters = [levelFilter !== null, schoolFilter, classFilter, concFilter !== null, ritualFilter !== null].filter(Boolean).length;

    function clearFilters() {
        setSearch(""); setLevelFilter(null); setSchoolFilter(""); setClassFilter("");
        setConcFilter(null); setRitualFilter(null);
    }

    return (
        <div className={styles.overlay}>
            <div className={styles.browser}>
                {/* Header */}
                <div className={styles.header}>
                    <h2>📖 Browser Incantesimi</h2>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                {/* Search */}
                <input
                    type="text"
                    className={`input ${styles.searchInput}`}
                    placeholder="Cerca incantesimo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                />

                {/* Filters */}
                <div className={styles.filters}>
                    {/* Level */}
                    <div className={styles.filterGroup}>
                        <div className={styles.levelBtns}>
                            <button
                                className={`${styles.levelBtn} ${levelFilter === null ? styles.levelActive : ""}`}
                                onClick={() => setLevelFilter(null)}
                            >Tutti</button>
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((lv) => (
                                <button
                                    key={lv}
                                    className={`${styles.levelBtn} ${levelFilter === lv ? styles.levelActive : ""}`}
                                    onClick={() => setLevelFilter(levelFilter === lv ? null : lv)}
                                >
                                    {lv === 0 ? "C" : lv}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* School + Class + Toggles */}
                    <div className={styles.filterRow}>
                        <select className={`input ${styles.filterSelect}`} value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)}>
                            <option value="">Tutte le scuole</option>
                            {SCHOOLS.map((s) => <option key={s} value={s}>{SCHOOL_IT[s]}</option>)}
                        </select>

                        <select className={`input ${styles.filterSelect}`} value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
                            <option value="">Tutte le classi</option>
                            {CASTER_CLASSES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                        </select>

                        <button
                            className={`${styles.toggleBtn} ${concFilter === true ? styles.toggleActive : ""}`}
                            onClick={() => setConcFilter(concFilter === true ? null : true)}
                        >
                            🎯 Conc.
                        </button>

                        <button
                            className={`${styles.toggleBtn} ${ritualFilter === true ? styles.toggleActive : ""}`}
                            onClick={() => setRitualFilter(ritualFilter === true ? null : true)}
                        >
                            📿 Rituale
                        </button>
                    </div>

                    {activeFilters > 0 && (
                        <button className={styles.clearFilters} onClick={clearFilters}>
                            ✕ Rimuovi filtri ({activeFilters})
                        </button>
                    )}
                </div>

                {/* Results count */}
                <div className={styles.resultsInfo}>
                    {loading ? "Caricamento..." : `${filtered.length} incantesimi trovati`}
                </div>

                {/* Spell List */}
                <div className={styles.spellList}>
                    {filtered.slice(0, 100).map((spell) => {
                        const isKnown = knownSpells.includes(spell.name);
                        const isExpanded = expandedId === spell.id;
                        return (
                            <div key={spell.id} className={`${styles.spellCard} ${isKnown ? styles.spellKnown : ""}`}>
                                <div className={styles.spellRow} onClick={() => setExpandedId(isExpanded ? null : spell.id)}>
                                    <span className={styles.spellLevel}>
                                        {spell.level === 0 ? "C" : spell.level}
                                    </span>
                                    <div className={styles.spellInfo}>
                                        <span className={styles.spellName}>{spell.name}</span>
                                        <span className={styles.spellMeta}>
                                            {SCHOOL_IT[spell.school] || spell.school}
                                            {spell.is_concentration && " • 🎯"}
                                            {spell.is_ritual && " • 📿"}
                                        </span>
                                    </div>
                                    <button
                                        className={`${styles.addBtn} ${isKnown ? styles.addBtnKnown : ""}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isKnown) onRemoveSpell(spell.name);
                                            else onAddSpell(spell.name);
                                        }}
                                    >
                                        {isKnown ? "✓" : "+"}
                                    </button>
                                </div>

                                {isExpanded && (
                                    <div className={styles.spellDetails}>
                                        <div className={styles.detailRow}>
                                            <span>Tempo di Lancio:</span>
                                            <span>{spell.casting_time}</span>
                                        </div>
                                        <div className={styles.detailRow}>
                                            <span>Gittata:</span>
                                            <span>{spell.range}</span>
                                        </div>
                                        <div className={styles.detailRow}>
                                            <span>Componenti:</span>
                                            <span>{spell.components}</span>
                                        </div>
                                        <div className={styles.detailRow}>
                                            <span>Durata:</span>
                                            <span>{spell.duration}</span>
                                        </div>
                                        <p className={styles.spellDesc}>{spell.description}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {filtered.length > 100 && (
                        <p className={styles.moreNote}>
                            Mostrati 100 di {filtered.length} risultati. Usa i filtri per restringere la ricerca.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
