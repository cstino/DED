"use client";

import { useRef, useEffect } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

interface ModelViewerProps {
    url: string;
    animationIndex?: number;
}

export function ModelViewer({ url, animationIndex = 0 }: ModelViewerProps) {
    const group = useRef<THREE.Group>(null);
    const { scene, animations } = useGLTF(url);
    const { actions, names } = useAnimations(animations, group);

    useEffect(() => {
        if (names.length > 0) {
            const animationName = names[animationIndex] || names[0];
            actions[animationName]?.reset().fadeIn(0.5).play();
            return () => {
                actions[animationName]?.fadeOut(0.5);
            };
        }
    }, [actions, names, animationIndex]);

    return (
        <group ref={group} dispose={null}>
            <primitive object={scene} scale={1.3} position={[0, -1.2, 0]} />
        </group>
    );
}

// Pre-load common models to avoid flashing
// useGLTF.preload("/model/warforged/Meshy_AI_Animation_Short_Breathe_and_Look_Around_withSkin.glb");
