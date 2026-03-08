"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import styles from "./SplashScreen.module.css";

/* ─── 3D D20 Mesh with deceleration and target alignment ─── */
function SplashD20Mesh({
    onStopped,
    phase
}: {
    onStopped: () => void;
    phase: "spinning" | "stopped" | "done";
}) {
    const groupRef = useRef<THREE.Group>(null);
    const speedRef = useRef(6.0);
    const stoppedRef = useRef(false);

    // Geometry
    const { bodyGeo, edgesGeo } = useMemo(() => {
        const geo = new THREE.IcosahedronGeometry(1.4, 0);
        return { bodyGeo: geo, edgesGeo: new THREE.EdgesGeometry(geo) };
    }, []);

    // Target rotation where a face is front-facing
    // For standard Icosahedron, this brings a face to the front
    const targetRotation = useMemo(() => new THREE.Euler(0.35, Math.PI, 0), []);

    useFrame((state, delta) => {
        if (!groupRef.current || stoppedRef.current) return;

        // Decelerate
        speedRef.current *= 0.965;

        if (speedRef.current > 0.15) {
            groupRef.current.rotation.y += delta * speedRef.current;
            groupRef.current.rotation.x += delta * speedRef.current * 0.4;
        } else {
            // Smoothly move towards target rotation
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotation.x, 0.1);
            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotation.y, 0.1);
            groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRotation.z, 0.1);

            // Check if very close to target
            const dx = Math.abs(groupRef.current.rotation.x - targetRotation.x);
            const dy = Math.abs(groupRef.current.rotation.y - targetRotation.y);

            if (dx < 0.01 && dy < 0.01 && !stoppedRef.current) {
                stoppedRef.current = true;
                groupRef.current.rotation.copy(targetRotation);
                onStopped();
            }
        }
    });

    return (
        <group ref={groupRef}>
            <mesh geometry={bodyGeo}>
                <meshPhysicalMaterial
                    color="#0c1a28"
                    metalness={0.6}
                    roughness={0.2}
                    clearcoat={1}
                    clearcoatRoughness={0.1}
                />
            </mesh>
            <lineSegments geometry={edgesGeo}>
                <lineBasicMaterial color="#00e5a0" transparent opacity={0.6} linewidth={1} />
            </lineSegments>
        </group>
    );
}

const DND_TIPS = [
    "Un critico naturale (20) colpisce sempre, indipendentemente dalla CA.",
    "Il riposo breve dura 1 ora e permette di spendere Dadi Vita.",
    "Il vantaggio ti permette di lanciare due d20 e tenere il più alto.",
    "La competenza aggiunge il tuo bonus ai tiri in cui sei addestrato.",
    "Un riposo lungo recupera tutti i tuoi HP e metà dei tuoi Dadi Vita.",
    "L'ispirazione può essere spesa per ottenere vantaggio su un tiro.",
    "Gli incantesimi rituali non consumano slot se lanciati in 10 minuti extra.",
    "Strizzare l'occhio al Master non garantisce vantaggi... di solito.",
    "La Classe Armatura (CA) determina quanto è difficile colpirti.",
    "La Percezione Passiva aiuta il Master a capire cosa noti senza tirare.",
    "Cadere a 0 HP ti costringe a fare tiri salvezza contro morte.",
    "La Schivata (Dodge) dà svantaggio ai nemici che ti attaccano.",
    "Afferrare (Grapple) sostituisce un attacco e blocca il movimento nemico.",
    "La Resistenza dimezza il danno di un tipo specifico.",
];

/* ─── Main Splash Screen ─── */
export default function SplashScreen({ children }: { children: React.ReactNode }) {
    const [phase, setPhase] = useState<"spinning" | "stopped" | "done">("spinning");
    const [visible, setVisible] = useState(true);
    const [tip, setTip] = useState("");

    useEffect(() => {
        if (typeof window !== "undefined") {
            const seen = sessionStorage.getItem("splash_seen");
            if (seen) {
                setPhase("done");
                setVisible(false);
            } else {
                // Pick a random tip only once
                const randomIndex = Math.floor(Math.random() * DND_TIPS.length);
                setTip(DND_TIPS[randomIndex]);
            }
        }
    }, []);

    const handleStopped = useCallback(() => {
        setPhase("stopped");
        setTimeout(() => {
            setPhase("done");
            if (typeof window !== "undefined") {
                sessionStorage.setItem("splash_seen", "1");
            }
            setTimeout(() => setVisible(false), 500);
        }, 1200);
    }, []);

    if (!visible) return <>{children}</>;

    return (
        <>
            <div className={`${styles.overlay} ${phase === "done" ? styles.overlayHidden : ""}`}>
                <div className={styles.diceContainer}>
                    <div className={styles.ambientGlow} style={{ opacity: phase === "stopped" ? 1 : 0 }} />

                    <Canvas
                        camera={{ position: [0, 0, 4.2], fov: 45 }}
                        gl={{ alpha: true, antialias: true }}
                        style={{ pointerEvents: "none" }}
                    >
                        <ambientLight intensity={0.5} />
                        <pointLight position={[2, 2, 4]} intensity={1.5} color="#00e5a0" />
                        <pointLight position={[-2, -2, 2]} intensity={0.5} color="#ffffff" />

                        <SplashD20Mesh
                            onStopped={handleStopped}
                            phase={phase}
                        />
                    </Canvas>
                </div>

                <div className={`${styles.textContainer} ${phase === "stopped" ? styles.textVisible : ""}`}>
                    <p className={styles.subtitle}>
                        D&D Campaign Manager
                    </p>
                    {tip && <p className={styles.tip}>"{tip}"</p>}
                </div>
            </div>
            {children}
        </>
    );
}
