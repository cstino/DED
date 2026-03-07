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

/* ─── Main Splash Screen ─── */
export default function SplashScreen({ children }: { children: React.ReactNode }) {
    const [phase, setPhase] = useState<"spinning" | "stopped" | "done">("spinning");
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const seen = sessionStorage.getItem("splash_seen");
            if (seen) {
                setPhase("done");
                setVisible(false);
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

                <p className={`${styles.subtitle} ${phase === "stopped" ? styles.subtitleVisible : ""}`}>
                    D&D Campaign Manager
                </p>
            </div>
            {children}
        </>
    );
}
