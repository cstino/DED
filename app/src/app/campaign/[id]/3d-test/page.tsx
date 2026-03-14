"use client";

import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, Environment, ContactShadows, PerspectiveCamera } from "@react-three/drei";
import { ModelViewer } from "@/components/campaign/ModelViewer";
import { ArrowLeft, Plus, X, Menu } from "lucide-react";
import styles from "./3d-test.module.css";
import { useRouter, useParams } from "next/navigation";

const CHARACTERS = [
    {
        id: "corwin",
        name: "Corwin",
        scale: 2.6,
        position: [0, -0.8, 0],
        animations: [
            { name: "Respiro", file: "/model/Corwin/corwin.glb" },
        ]
    },
    {
        id: "vaelion",
        name: "Vaelion",
        scale: 2.6,
        position: [0, -0.8, 0],
        animations: [
            { name: "Respiro", file: "/model/Vaelion/vaelion (3).glb" },
        ]
    },
    {
        id: "lou",
        name: "Lou",
        scale: 2.6,
        position: [0, -0.8, 0],
        animations: [
            { name: "Respiro", file: "/model/Lou/Lou (1).glb" },
        ]
    },
    {
        id: "warforged",
        name: "Forgiato",
        scale: 2.6,
        position: [0, -0.8, 0],
        animations: [
            { name: "Respiro", file: "/model/warforged/mk cartoon.glb" },
        ]
    }
];

export default function ThreeDTestPage() {
    const [currentCharIdx, setCurrentCharIdx] = useState(0);
    const [currentAnim, setCurrentAnim] = useState(0);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);

    // Manteniamo le selezioni per ogni personaggio
    const [selections, setSelections] = useState<Record<string, number[]>>({
        corwin: [0],
        vaelion: [0],
        lou: [0],
        warforged: [0]
    });

    const activeChar = CHARACTERS[currentCharIdx];
    const selectedAnims = selections[activeChar.id] || [];
    const router = useRouter();

    const toggleAnimInSelection = (index: number) => {
        const currentSelection = selections[activeChar.id];
        if (currentSelection.includes(index)) {
            if (currentSelection.length > 1) {
                setSelections({
                    ...selections,
                    [activeChar.id]: currentSelection.filter(i => i !== index)
                });
            }
        } else {
            if (currentSelection.length < 5) {
                setSelections({
                    ...selections,
                    [activeChar.id]: [...currentSelection, index].sort((a, b) => a - b)
                });
            }
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.ui}>
                <div className={styles.topRow}>
                    <button className={styles.backBtn} onClick={() => router.back()}>
                        <ArrowLeft size={28} />
                    </button>
                    <button className={styles.settingsBtn} onClick={() => setIsSideMenuOpen(true)}>
                        <Menu size={28} />
                    </button>
                </div>
                <div className={styles.header}>
                    <div className={styles.logoWrapper}>
                        <span className={styles.mageText}>
                            MAGEHAN
                            <span className={styles.letterD}>
                                D
                                <span className={styles.labBadge}>3D LAB</span>
                            </span>
                        </span>
                    </div>
                </div>
            </div>

            <div className={styles.menuContainer}>
                <div className={`${styles.menuWrapper} ${isMenuOpen ? styles.isOpen : ""}`}>
                    <button
                        className={styles.mainCircle}
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        <Plus size={30} />
                    </button>

                    {selectedAnims.map((animIdx, i) => (
                        <button
                            key={i}
                            className={`${styles.subCircle} ${currentAnim === animIdx ? styles.subCircleActive : ""}`}
                            onClick={() => {
                                setCurrentAnim(animIdx);
                            }}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
            </div>

            <Canvas shadows dpr={[1, 2]}>
                <PerspectiveCamera makeDefault position={[0, 1.5, 5.5]} fov={50} />
                <ambientLight intensity={0.7} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
                <pointLight position={[-10, -10, -10]} intensity={1} color="#4455ff" />

                <Suspense fallback={null}>
                    <ModelViewer
                        key={`${activeChar.id}-${currentAnim}`}
                        url={activeChar.animations[currentAnim]?.file || ""}
                        isDefault={currentAnim === 0}
                        onFinished={() => setCurrentAnim(0)}
                        scale={(activeChar as any).scale}
                        position={(activeChar as any).position}
                    />
                    <ContactShadows opacity={0.6} scale={10} blur={2.5} far={10} resolution={256} color="#000000" />
                    <Environment preset="night" />
                </Suspense>

                <OrbitControls
                    enablePan={false}
                    enableZoom={false}
                    minPolarAngle={Math.PI / 2}
                    maxPolarAngle={Math.PI / 2}
                    makeDefault
                />
            </Canvas>

            {/* Side Menu per selezione animazioni */}
            {isSideMenuOpen && (
                <div className={styles.drawerOverlay} onClick={() => setIsSideMenuOpen(false)}>
                    <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.drawerHeader}>
                            <h2>Equipaggiamento</h2>
                            <button className={styles.closeBtn} onClick={() => setIsSideMenuOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className={styles.drawerContent}>
                            <section className={styles.drawerSection}>
                                <h3>Cambia Personaggio</h3>
                                <div className={styles.charSwitchGrid}>
                                    {CHARACTERS.map((char, idx) => (
                                        <button
                                            key={char.id}
                                            className={`${styles.charTab} ${currentCharIdx === idx ? styles.charTabActive : ""}`}
                                            onClick={() => {
                                                setCurrentCharIdx(idx);
                                                setCurrentAnim(0);
                                                setIsMenuOpen(false);
                                            }}
                                        >
                                            {char.name}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section className={styles.drawerSection}>
                                <h3>Equipaggiamento Animazioni</h3>
                                <p className={styles.drawerInfo}>
                                    Seleziona fino a 5 animazioni per {activeChar.name}.
                                </p>
                                <div className={styles.animList}>
                                    {activeChar.animations.map((anim, idx) => {
                                        if (idx === 0) return null;

                                        const slotIndex = selectedAnims.indexOf(idx);
                                        const isSelected = slotIndex !== -1;
                                        return (
                                            <button
                                                key={idx}
                                                className={`${styles.animItem} ${isSelected ? styles.animItemSelected : ""}`}
                                                onClick={() => toggleAnimInSelection(idx)}
                                                disabled={!isSelected && selectedAnims.length >= 5}
                                            >
                                                <div className={styles.animItemLeft}>
                                                    <div className={styles.animName}>{anim.name}</div>
                                                    {!isSelected && (
                                                        <div className={styles.animStatus}>
                                                            Disponibile
                                                        </div>
                                                    )}
                                                </div>
                                                {isSelected && (
                                                    <div className={styles.slotBadge}>
                                                        {slotIndex + 1}
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.overlay} />
        </div>
    );
}
