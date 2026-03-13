"use client";

import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, Environment, ContactShadows, PerspectiveCamera } from "@react-three/drei";
import { ModelViewer } from "@/components/campaign/ModelViewer";
import { ArrowLeft, Plus, X, Menu } from "lucide-react";
import styles from "./3d-test.module.css";
import { useRouter, useParams } from "next/navigation";

const ANIMATIONS = [
    { name: "Respiro", file: "/model/warforged/Meshy_AI_Animation_Short_Breathe_and_Look_Around_withSkin.glb" },
    { name: "Cammina", file: "/model/warforged/Meshy_AI_Animation_Walking_withSkin.glb" },
    { name: "Corsa", file: "/model/warforged/Meshy_AI_Animation_Running_withSkin.glb" },
    { name: "Salto", file: "/model/warforged/Meshy_AI_Animation_Basic_Jump_withSkin.glb" },
    { name: "Boxe", file: "/model/warforged/Meshy_AI_Animation_Boxing_Practice_withSkin.glb" },
    { name: "Crouch", file: "/model/warforged/Meshy_AI_Animation_CrouchLookAroundBow_withSkin.glb" },
    { name: "Swing", file: "/model/warforged/Meshy_AI_Animation_Indoor_Swing_withSkin.glb" },
    { name: "Skill", file: "/model/warforged/Meshy_AI_Animation_Skill_03_withSkin.glb" },
];

export default function ThreeDTestPage() {
    const [currentAnim, setCurrentAnim] = useState(0);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const router = useRouter();
    const params = useParams();

    return (
        <div className={styles.container}>
            <div className={styles.ui}>
                <button className={styles.backBtn} onClick={() => router.back()}>
                    <ArrowLeft size={28} />
                </button>
                <div className={styles.header}>
                    <h1>Camp 3D Preview</h1>
                    <p>Test delle animazioni del Forgiato</p>
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
                    
                    {ANIMATIONS.slice(0, 5).map((anim, i) => (
                        <button
                            key={i}
                            className={`${styles.subCircle} ${currentAnim === i ? styles.subCircleActive : ""}`}
                            onClick={() => {
                                setCurrentAnim(i);
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
                    <ModelViewer url={ANIMATIONS[currentAnim].file} />
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

            <div className={styles.overlay} />
        </div>
    );
}
