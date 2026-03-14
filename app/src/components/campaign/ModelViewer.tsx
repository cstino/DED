"use client";

import { useRef, useEffect } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

interface ModelViewerProps {
    url: string;
    animationIndex?: number;
    isDefault?: boolean;
    onFinished?: () => void;
    scale?: number;
    position?: [number, number, number];
}

export function ModelViewer({
    url,
    animationIndex = 0,
    isDefault = false,
    onFinished,
    scale = 1.3,
    position = [0, -1.2, 0]
}: ModelViewerProps) {
    const group = useRef<THREE.Group>(null);
    const { scene, animations } = useGLTF(url);
    const { actions, names, mixer } = useAnimations(animations, group);

    useEffect(() => {
        if (!actions || names.length === 0) return;

        const animationName = names[animationIndex] || names[0];
        const action = actions[animationName];

        if (action) {
            Object.values(actions).forEach(a => a?.fadeOut(0.2));

            action.reset().fadeIn(0.4);

            if (!isDefault) {
                action.setLoop(THREE.LoopOnce, 1);
                action.clampWhenFinished = true;
            } else {
                action.setLoop(THREE.LoopRepeat, Infinity);
            }

            action.play();

            const handleFinished = (e: any) => {
                if (e.action === action && onFinished) {
                    onFinished();
                }
            };

            mixer.addEventListener('finished', handleFinished);

            return () => {
                action.fadeOut(0.4);
                mixer.removeEventListener('finished', handleFinished);
            };
        }
    }, [actions, names, animationIndex, url, isDefault, onFinished, mixer]);

    return (
        <group ref={group} dispose={null}>
            <primitive object={scene} scale={scale} position={position} />
        </group>
    );
}
