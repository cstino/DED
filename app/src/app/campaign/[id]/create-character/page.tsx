"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import styles from "./create.module.css";

interface RaceOption {
    name: string;
    movement: { speed?: number } | null;
    ability_bonuses: Record<string, number> | null;
}

interface ClassOption {
    name: string;
    hit_dice: number | null;
    saving_throws: Record<string, boolean> | null;
}

interface SubclassOption {
    name: string;
    class_name: string;
}

const ABILITIES = [
    { key: "str", label: "Forza", short: "FOR" },
    { key: "dex", label: "Destrezza", short: "DES" },
    { key: "con", label: "Costituzione", short: "COS" },
    { key: "int", label: "Intelligenza", short: "INT" },
    { key: "wis", label: "Saggezza", short: "SAG" },
    { key: "cha", label: "Carisma", short: "CAR" },
] as const;

const ALIGNMENTS = [
    "Legale Buono", "Neutrale Buono", "Caotico Buono",
    "Legale Neutrale", "Neutrale Puro", "Caotico Neutrale",
    "Legale Malvagio", "Neutrale Malvagio", "Caotico Malvagio",
];

const ALL_SKILLS = [
    { name: "acrobatics", ability: "dex", label: "Acrobazia" },
    { name: "animal_handling", ability: "wis", label: "Addestrare Animali" },
    { name: "arcana", ability: "int", label: "Arcano" },
    { name: "athletics", ability: "str", label: "Atletica" },
    { name: "deception", ability: "cha", label: "Inganno" },
    { name: "history", ability: "int", label: "Storia" },
    { name: "insight", ability: "wis", label: "Intuizione" },
    { name: "intimidation", ability: "cha", label: "Intimidire" },
    { name: "investigation", ability: "int", label: "Investigare" },
    { name: "medicine", ability: "wis", label: "Medicina" },
    { name: "nature", ability: "int", label: "Natura" },
    { name: "perception", ability: "wis", label: "Percezione" },
    { name: "performance", ability: "cha", label: "Intrattenere" },
    { name: "persuasion", ability: "cha", label: "Persuasione" },
    { name: "religion", ability: "int", label: "Religione" },
    { name: "sleight_of_hand", ability: "dex", label: "Rapidità di Mano" },
    { name: "stealth", ability: "dex", label: "Furtività" },
    { name: "survival", ability: "wis", label: "Sopravvivenza" },
];

function getModifier(score: number): string {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
}

export default function CreateCharacterPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const campaignId = params.id as string;

    // DB options
    const [races, setRaces] = useState<RaceOption[]>([]);
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [subclasses, setSubclasses] = useState<SubclassOption[]>([]);

    // Form state
    const [name, setName] = useState("");
    const [race, setRace] = useState("");
    const [raceSearch, setRaceSearch] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [classSearch, setClassSearch] = useState("");
    const [subclass, setSubclass] = useState("");
    const [level, setLevel] = useState(1);
    const [alignment, setAlignment] = useState("");
    const [background, setBackground] = useState("");
    const [abilities, setAbilities] = useState({
        str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
    });
    const [hpMax, setHpMax] = useState(10);
    const [ac, setAc] = useState(10);
    const [speed, setSpeed] = useState(30);
    const [skillProfs, setSkillProfs] = useState<string[]>([]);
    const [portraitFile, setPortraitFile] = useState<File | null>(null);
    const [portraitPreview, setPortraitPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Derived: auto saving throws from selected class
    const selectedClassData = classes.find((c) => c.name === selectedClass);
    const autoSaveProfs: string[] = selectedClassData?.saving_throws
        ? Object.entries(selectedClassData.saving_throws)
            .filter(([, v]) => v)
            .map(([k]) => k)
        : [];

    function handlePortraitChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            setError("L'immagine deve essere più piccola di 10MB");
            return;
        }
        setPortraitFile(file);
        setPortraitPreview(URL.createObjectURL(file));
    }

    // Fetch races, classes, subclasses from DB
    useEffect(() => {
        async function loadOptions() {
            const [racesRes, classesRes, subclassesRes] = await Promise.all([
                supabase.from("races").select("name, movement, ability_bonuses").order("name"),
                supabase.from("classes").select("name, hit_dice, saving_throws").order("name"),
                supabase.from("subclasses").select("name, class_name").order("name"),
            ]);
            if (racesRes.data) setRaces(racesRes.data);
            if (classesRes.data) setClasses(classesRes.data);
            if (subclassesRes.data) setSubclasses(subclassesRes.data);
        }
        loadOptions();
    }, []);

    useEffect(() => {
        if (!authLoading && !user) router.push("/login");
    }, [authLoading, user, router]);

    // Auto-set speed from race
    useEffect(() => {
        const raceData = races.find((r) => r.name === race);
        if (raceData?.movement?.speed) {
            setSpeed(raceData.movement.speed);
        }
    }, [race, races]);

    // Filter subclasses when class changes
    const filteredSubclasses = subclasses.filter(
        (sc) => sc.class_name.toLowerCase() === selectedClass.toLowerCase()
    );

    // Calculate HP based on class hit dice + CON modifier
    useEffect(() => {
        if (selectedClassData?.hit_dice) {
            const conMod = Math.floor((abilities.con - 10) / 2);
            const baseHp = selectedClassData.hit_dice + conMod;
            setHpMax(Math.max(1, baseHp * level));
        }
    }, [selectedClass, abilities.con, level, selectedClassData]);

    function setAbility(key: string, value: number) {
        setAbilities((prev) => ({
            ...prev,
            [key]: Math.max(1, Math.min(30, value)),
        }));
    }

    function toggleSkillProf(skillName: string) {
        setSkillProfs((prev) =>
            prev.includes(skillName)
                ? prev.filter((s) => s !== skillName)
                : [...prev, skillName]
        );
    }

    // Filter races and classes by search
    const filteredRaces = races.filter((r) =>
        r.name.toLowerCase().includes(raceSearch.toLowerCase())
    );
    const filteredClasses = classes.filter((c) =>
        c.name.toLowerCase().includes(classSearch.toLowerCase())
    );

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!user || !name.trim() || !race || !selectedClass) return;

        setSaving(true);
        setError("");

        // Upload portrait if provided
        let portraitUrl: string | null = null;
        if (portraitFile) {
            const ext = portraitFile.name.split(".").pop();
            const path = `portraits/${user.id}/${Date.now()}.${ext}`;
            const { error: uploadError } = await supabase.storage
                .from("character-portraits")
                .upload(path, portraitFile);
            if (uploadError) {
                console.warn("Portrait upload failed:", uploadError.message);
            } else {
                const { data: urlData } = supabase.storage
                    .from("character-portraits")
                    .getPublicUrl(path);
                portraitUrl = urlData.publicUrl;
            }
        }

        const hitDice = selectedClassData?.hit_dice || 8;

        const { error: insertError } = await supabase.from("characters").insert({
            user_id: user.id,
            campaign_id: campaignId,
            name: name.trim(),
            race,
            class: selectedClass,
            subclass: subclass || null,
            level,
            ability_scores: abilities,
            hp_current: hpMax,
            hp_max: hpMax,
            hp_temp: 0,
            ac,
            speed,
            initiative_bonus: Math.floor((abilities.dex - 10) / 2),
            hit_dice_total: level,
            hit_dice_current: level,
            saving_throw_prof: autoSaveProfs,
            skill_proficiencies: skillProfs,
            background: background || null,
            alignment: alignment || null,
            portrait_url: portraitUrl,
            death_saves: { successes: 0, failures: 0 },
            money: { mp: 0, mo: 0, ma: 0, mr: 0, me: 0 },
            personality: { traits: "", ideals: "", bonds: "", flaws: "" },
            spell_slots: buildSpellSlots(hitDice, level),
        });

        if (insertError) {
            setError(insertError.message);
            setSaving(false);
            return;
        }

        router.push(`/campaign/${campaignId}`);
    }

    if (authLoading || !user) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner} />
            </div>
        );
    }

    return (
        <div className="page">
            <button className={styles.backBtn} onClick={() => router.push(`/campaign/${campaignId}`)}>
                ← Torna alla campagna
            </button>

            <div className={styles.formContainer}>
                <h1 className={styles.title}>Crea Personaggio</h1>
                <p className={styles.subtitle}>Compila i dettagli del tuo nuovo avventuriero</p>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    {/* Portrait Upload */}
                    <div className={styles.portraitSection}>
                        <div
                            className={styles.portraitUpload}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {portraitPreview ? (
                                <Image
                                    src={portraitPreview}
                                    alt="Anteprima ritratto"
                                    width={120}
                                    height={120}
                                    className={styles.portraitImage}
                                />
                            ) : (
                                <div className={styles.portraitPlaceholder}>
                                    <span className={styles.portraitIcon}>🖼️</span>
                                    <span className={styles.portraitText}>Aggiungi ritratto</span>
                                </div>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handlePortraitChange}
                                className={styles.portraitInput}
                            />
                        </div>
                        {portraitFile && (
                            <button
                                type="button"
                                className={styles.clearBtn}
                                onClick={() => { setPortraitFile(null); setPortraitPreview(null); }}
                            >
                                ✕ Rimuovi immagine
                            </button>
                        )}
                    </div>

                    {/* Name */}
                    <div className={styles.field}>
                        <label className="label" htmlFor="char-name">Nome Personaggio *</label>
                        <input
                            id="char-name"
                            type="text"
                            className="input"
                            placeholder="Es. Thorin Scudodiquercia"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    {/* Race */}
                    <div className={styles.field}>
                        <label className="label">Razza *</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Cerca razza..."
                            value={raceSearch}
                            onChange={(e) => {
                                setRaceSearch(e.target.value);
                                if (!e.target.value) setRace("");
                            }}
                        />
                        {raceSearch && !race && (
                            <div className={styles.dropdown}>
                                {filteredRaces.slice(0, 8).map((r) => (
                                    <button
                                        key={r.name}
                                        type="button"
                                        className={styles.dropdownItem}
                                        onClick={() => {
                                            setRace(r.name);
                                            setRaceSearch(r.name);
                                        }}
                                    >
                                        <span>{r.name}</span>
                                        {r.movement?.speed && (
                                            <span className={styles.hitDice}>{r.movement.speed} ft</span>
                                        )}
                                    </button>
                                ))}
                                {filteredRaces.length === 0 && (
                                    <div className={styles.dropdownEmpty}>Nessun risultato</div>
                                )}
                            </div>
                        )}
                        {race && (
                            <div className={styles.selectedInfo}>
                                <button
                                    type="button"
                                    className={styles.clearBtn}
                                    onClick={() => { setRace(""); setRaceSearch(""); setSpeed(30); }}
                                >
                                    ✕ Cambia razza
                                </button>
                                {speed !== 30 && (
                                    <span className={styles.autoTag}>⚡ Velocità: {speed} ft (auto)</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Class */}
                    <div className={styles.field}>
                        <label className="label">Classe *</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Cerca classe..."
                            value={classSearch}
                            onChange={(e) => {
                                setClassSearch(e.target.value);
                                if (!e.target.value) { setSelectedClass(""); setSubclass(""); }
                            }}
                        />
                        {classSearch && !selectedClass && (
                            <div className={styles.dropdown}>
                                {filteredClasses.slice(0, 8).map((c) => (
                                    <button
                                        key={c.name}
                                        type="button"
                                        className={styles.dropdownItem}
                                        onClick={() => {
                                            setSelectedClass(c.name);
                                            setClassSearch(c.name);
                                            setSubclass("");
                                        }}
                                    >
                                        <span>{c.name}</span>
                                        {c.hit_dice && <span className={styles.hitDice}>d{c.hit_dice}</span>}
                                    </button>
                                ))}
                                {filteredClasses.length === 0 && (
                                    <div className={styles.dropdownEmpty}>Nessun risultato</div>
                                )}
                            </div>
                        )}
                        {selectedClass && (
                            <div className={styles.selectedInfo}>
                                <button
                                    type="button"
                                    className={styles.clearBtn}
                                    onClick={() => { setSelectedClass(""); setClassSearch(""); setSubclass(""); }}
                                >
                                    ✕ Cambia classe
                                </button>
                                {autoSaveProfs.length > 0 && (
                                    <span className={styles.autoTag}>
                                        🛡️ Tiri Salvezza: {autoSaveProfs.map((s) => s.toUpperCase()).join(", ")} (auto)
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Subclass */}
                    {selectedClass && filteredSubclasses.length > 0 && (
                        <div className={styles.field}>
                            <label className="label">Sottoclasse (opzionale)</label>
                            <select
                                className="input"
                                value={subclass}
                                onChange={(e) => setSubclass(e.target.value)}
                            >
                                <option value="">— Nessuna —</option>
                                {filteredSubclasses.map((sc) => (
                                    <option key={sc.name} value={sc.name}>{sc.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Level + Alignment Row */}
                    <div className={styles.row}>
                        <div className={styles.field} style={{ flex: 1 }}>
                            <label className="label">Livello</label>
                            <input
                                type="number"
                                className="input"
                                min={1}
                                max={20}
                                value={level}
                                onChange={(e) => setLevel(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                            />
                        </div>
                        <div className={styles.field} style={{ flex: 2 }}>
                            <label className="label">Allineamento</label>
                            <select
                                className="input"
                                value={alignment}
                                onChange={(e) => setAlignment(e.target.value)}
                            >
                                <option value="">— Seleziona —</option>
                                {ALIGNMENTS.map((a) => (
                                    <option key={a} value={a}>{a}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Background */}
                    <div className={styles.field}>
                        <label className="label">Background (opzionale)</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Es. Soldato, Eremita, Nobile..."
                            value={background}
                            onChange={(e) => setBackground(e.target.value)}
                        />
                    </div>

                    {/* Ability Scores */}
                    <div className={styles.abilitiesSection}>
                        <label className="label">Caratteristiche</label>
                        <div className={styles.abilitiesGrid}>
                            {ABILITIES.map(({ key, label, short }) => (
                                <div key={key} className={styles.abilityCard}>
                                    <span className={styles.abilityLabel}>{short}</span>
                                    <div className={styles.abilityInputWrap}>
                                        <button
                                            type="button"
                                            className={styles.abilityBtn}
                                            onClick={() => setAbility(key, abilities[key as keyof typeof abilities] - 1)}
                                        >
                                            −
                                        </button>
                                        <input
                                            type="number"
                                            className={styles.abilityInput}
                                            value={abilities[key as keyof typeof abilities]}
                                            onChange={(e) => setAbility(key, parseInt(e.target.value) || 10)}
                                            min={1}
                                            max={30}
                                        />
                                        <button
                                            type="button"
                                            className={styles.abilityBtn}
                                            onClick={() => setAbility(key, abilities[key as keyof typeof abilities] + 1)}
                                        >
                                            +
                                        </button>
                                    </div>
                                    <span className={styles.abilityMod}>
                                        {getModifier(abilities[key as keyof typeof abilities])}
                                    </span>
                                    <span className={styles.abilityName}>{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Skill Proficiencies */}
                    <div className={styles.skillsSection}>
                        <label className="label">Competenze nelle Abilità</label>
                        <p className={styles.skillHint}>Seleziona le abilità in cui il personaggio è competente</p>
                        <div className={styles.skillsGrid}>
                            {ALL_SKILLS.map((skill) => (
                                <label key={skill.name} className={styles.skillCheck}>
                                    <input
                                        type="checkbox"
                                        checked={skillProfs.includes(skill.name)}
                                        onChange={() => toggleSkillProf(skill.name)}
                                    />
                                    <span className={styles.skillCheckLabel}>
                                        {skill.label}
                                        <span className={styles.skillCheckAbility}>({skill.ability.toUpperCase()})</span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* HP + AC + Speed Row */}
                    <div className={styles.row}>
                        <div className={styles.field} style={{ flex: 1 }}>
                            <label className="label">HP Massimi</label>
                            <input
                                type="number"
                                className="input"
                                min={1}
                                value={hpMax}
                                onChange={(e) => setHpMax(Math.max(1, parseInt(e.target.value) || 1))}
                            />
                        </div>
                        <div className={styles.field} style={{ flex: 1 }}>
                            <label className="label">AC</label>
                            <input
                                type="number"
                                className="input"
                                min={1}
                                value={ac}
                                onChange={(e) => setAc(Math.max(1, parseInt(e.target.value) || 10))}
                            />
                        </div>
                        <div className={styles.field} style={{ flex: 1 }}>
                            <label className="label">Velocità (ft)</label>
                            <input
                                type="number"
                                className="input"
                                min={0}
                                value={speed}
                                onChange={(e) => setSpeed(Math.max(0, parseInt(e.target.value) || 30))}
                            />
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        className={`btn btn-primary ${styles.submitBtn}`}
                        disabled={saving || !name.trim() || !race || !selectedClass}
                    >
                        {saving ? "Creazione..." : "⚔️ Crea Personaggio"}
                    </button>
                </form>
            </div>
        </div>
    );
}

// Build initial spell slots based on class (basic heuristic)
function buildSpellSlots(hitDice: number, level: number): Record<string, number> {
    // Full casters (d6/d8 hit dice): Wizard, Sorcerer, Bard, Cleric, Druid
    // Half casters (d10): Ranger, Paladin
    // No casting: Barbarian (d12), Fighter (d10), Monk (d8 but no casting), Rogue (d8 but no casting)
    // This is a simple heuristic; exact slots come from the spell_table in the class data
    const slots: Record<string, number> = {};
    if (hitDice <= 8) {
        // Potential full caster
        if (level >= 1) slots["1"] = level >= 1 ? Math.min(4, level + 1) : 0;
        if (level >= 3) slots["2"] = level >= 3 ? Math.min(3, Math.floor((level - 1) / 2)) : 0;
        if (level >= 5) slots["3"] = level >= 5 ? Math.min(3, Math.floor((level - 3) / 2)) : 0;
        if (level >= 7) slots["4"] = level >= 7 ? Math.min(3, Math.ceil((level - 5) / 2)) : 0;
        if (level >= 9) slots["5"] = level >= 9 ? Math.min(3, Math.ceil((level - 7) / 2)) : 0;
    }
    return slots;
}
