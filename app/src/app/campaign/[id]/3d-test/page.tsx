"use client";

import { Suspense, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, Environment, ContactShadows, PerspectiveCamera } from "@react-three/drei";
import { ModelViewer } from "@/components/campaign/ModelViewer";
import { ArrowLeft, Plus, X, Menu } from "lucide-react";
import styles from "./3d-test.module.css";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const CHARACTERS = [
    {
        id: "corwin",
        name: "Corwin",
        scale: 2.6,
        position: [0, -0.2, 0],
        rotation: [0, -Math.PI / 2, 0],
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Corwin", // Placeholder
        animations: [{ name: "Respiro", file: "/model/Corwin/corwin.glb" }]
    },
    {
        id: "vaelion",
        name: "Vaelion",
        scale: 2.6,
        position: [0, -0.2, 0],
        rotation: [0, -Math.PI / 2, 0],
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vaelion", // Placeholder
        animations: [{ name: "Respiro", file: "/model/Vaelion/vaelion (3).glb" }]
    },
    {
        id: "lou",
        name: "Lou",
        scale: 2.6,
        position: [0, -0.2, 0],
        rotation: [0, -Math.PI / 2, 0],
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lou", // Placeholder
        animations: [{ name: "Respiro", file: "/model/Lou/Lou (1).glb" }]
    },
    {
        id: "warforged",
        name: "Forgiato",
        scale: 2.6,
        position: [0, -0.2, 0],
        rotation: [0, -Math.PI / 2, 0],
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Forgiato", // Placeholder
        animations: [{ name: "Respiro", file: "/model/warforged/mk cartoon.glb" }]
    }
];

export default function ThreeDTestPage() {
    const params = useParams();
    const campaignId = params.id as string;
    const [currentCharIdx, setCurrentCharIdx] = useState(0);
    const [currentAnim, setCurrentAnim] = useState(0);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [charPortraits, setCharPortraits] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchPortraits = async () => {
            if (!campaignId) {
                console.log("3D Lab: No campaignId found in params");
                return;
            }
            console.log("3D Lab: Fetching portraits for campaign:", campaignId);
            const { data, error } = await supabase
                .from("characters")
                .select("name, portrait_url")
                .eq("campaign_id", campaignId);

            if (error) {
                console.error("3D Lab: Error fetching portraits:", error);
                return;
            }

            if (data) {
                console.log("3D Lab: Data received from Supabase:", data);
                const portraitMap: Record<string, string> = {};
                data.forEach((char: any) => {
                    const key = char.name.toLowerCase().trim();
                    portraitMap[key] = char.portrait_url;
                });
                console.log("3D Lab: Portrait Map generated:", portraitMap);
                setCharPortraits(portraitMap);
            }
        };
        fetchPortraits();
    }, [campaignId]);

    const activeChar = CHARACTERS[currentCharIdx];
    const router = useRouter();

    // Funzione per ottenere l'immagine corretta (DB o segnaposto) con matching flessibile
    const getCharImage = (char: typeof CHARACTERS[0]) => {
        const labName = char.name.toLowerCase().trim();

        // 1. Cerchiamo un match esatto o contenuto (es. "Lou" match con "Lou Camarinelli")
        const dbNameMatch = Object.keys(charPortraits).find(dbName =>
            dbName.includes(labName) || labName.includes(dbName)
        );

        if (dbNameMatch && charPortraits[dbNameMatch]) {
            return charPortraits[dbNameMatch];
        }

        // 2. Casi speciali per nomi molto diversi
        if (labName === "forgiato") {
            const mkMatch = Object.keys(charPortraits).find(n => n.includes("mega knight") || n.includes("warforged"));
            if (mkMatch) return charPortraits[mkMatch];
        }

        return char.image; // Placeholder di default se non trova nulla
    };

    return (
        <div className={styles.container}>
            <div className={styles.ui}>
                <div className={styles.topRow}>
                    <button className={styles.backBtn} onClick={() => router.back()}>
                        <ArrowLeft size={28} />
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

                    {CHARACTERS.map((char, i) => {
                        const count = CHARACTERS.length;
                        // Distribuiamo i cerchi in un arco di 180 gradi (da 180° a 0°)
                        const angleStep = 180 / (count - 1);
                        const angle = 180 - (angleStep * i);
                        const radians = (angle * Math.PI) / 180;
                        const radius = 105; // Raggio del ventaglio

                        const tx = Math.cos(radians) * radius;
                        const ty = -Math.sin(radians) * radius;

                        return (
                            <button
                                key={char.id}
                                className={`${styles.subCircle} ${currentCharIdx === i ? styles.subCircleActive : ""}`}
                                onClick={() => {
                                    setCurrentCharIdx(i);
                                    setIsMenuOpen(false);
                                }}
                                style={{
                                    transform: isMenuOpen
                                        ? `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(1)`
                                        : `translate(0, 0) scale(0)`,
                                    transitionDelay: `${i * 0.05}s`
                                }}
                            >
                                <img src={getCharImage(char)} alt={char.name} className={styles.subCircleImg} />
                            </button>
                        );
                    })}
                </div>
            </div>

            <Canvas shadows dpr={[1, 2]}>
                <PerspectiveCamera makeDefault position={[0, 1.5, 5.5]} fov={50} />
                <ambientLight intensity={1.2} />
                <spotLight position={[5, 5, 5]} angle={0.25} penumbra={1} intensity={10} castShadow />
                <directionalLight position={[-5, 5, 5]} intensity={3} />
                <pointLight position={[0, -2, 2]} intensity={2} color="#ffffff" />

                <Suspense fallback={null}>
                    <ModelViewer
                        key={`${activeChar.id}-${currentAnim}`}
                        url={activeChar.animations[currentAnim]?.file || ""}
                        isDefault={currentAnim === 0}
                        onFinished={() => setCurrentAnim(0)}
                        scale={(activeChar as any).scale}
                        position={(activeChar as any).position}
                        rotation={(activeChar as any).rotation}
                    />
                    <ContactShadows opacity={0.6} scale={10} blur={2.5} far={10} resolution={256} color="#000000" />
                    <Environment preset="city" />
                </Suspense>

                <OrbitControls
                    enablePan={false}
                    enableZoom={false}
                    minPolarAngle={Math.PI / 2}
                    maxPolarAngle={Math.PI / 2}
                    makeDefault
                />
            </Canvas>


            <div className={styles.overlay} />
        </div>
    );
}
