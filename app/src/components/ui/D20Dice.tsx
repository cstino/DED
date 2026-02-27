"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

function D20Mesh() {
    const groupRef = useRef<THREE.Group>(null);

    // Create geometries once
    const { bodyGeo, edgesGeo } = useMemo(() => {
        const geo = new THREE.IcosahedronGeometry(1.4, 0);
        return {
            bodyGeo: geo,
            edgesGeo: new THREE.EdgesGeometry(geo),
        };
    }, []);

    // Slow continuous rotation
    useFrame((_, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += delta * 0.25;
            groupRef.current.rotation.x += delta * 0.12;
        }
    });

    return (
        <Float speed={1.8} rotationIntensity={0.2} floatIntensity={1}>
            <group ref={groupRef}>
                {/* Main solid body */}
                <mesh geometry={bodyGeo}>
                    <meshPhysicalMaterial
                        color="#0c1a28"
                        metalness={0.5}
                        roughness={0.3}
                        clearcoat={1}
                        clearcoatRoughness={0.15}
                        envMapIntensity={2}
                    />
                </mesh>

                {/* Glowing wireframe edges — brighter */}
                <lineSegments geometry={edgesGeo}>
                    <lineBasicMaterial color="#00e5a0" transparent opacity={0.7} linewidth={1} />
                </lineSegments>

                {/* Inner subtle glow mesh */}
                <mesh geometry={bodyGeo} scale={1.01}>
                    <meshBasicMaterial
                        color="#00e5a0"
                        transparent
                        opacity={0.04}
                        wireframe
                    />
                </mesh>
            </group>
        </Float>
    );
}

interface D20DiceProps {
    size?: number;
}

export default function D20Dice({ size = 120 }: D20DiceProps) {
    return (
        <div
            style={{
                width: size,
                height: size,
                position: "relative",
                margin: "0 auto",
            }}
        >
            {/* Ambient glow behind the dice */}
            <div
                style={{
                    position: "absolute",
                    inset: "-40%",
                    background: "radial-gradient(circle, rgba(0, 229, 160, 0.2) 0%, transparent 70%)",
                    borderRadius: "50%",
                    animation: "d20glow 3s ease-in-out infinite",
                    pointerEvents: "none",
                }}
            />

            <Canvas
                camera={{ position: [0, 0, 4.2], fov: 45 }}
                style={{ pointerEvents: "none" }}
                gl={{ alpha: true, antialias: true }}
            >
                {/* Lighting — brighter and more directional */}
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 5, 5]} intensity={1} color="#ffffff" />
                <directionalLight position={[-3, -1, 3]} intensity={0.4} color="#ffffff" />
                <pointLight position={[-2, -3, 4]} intensity={0.8} color="#00e5a0" />
                <pointLight position={[3, 2, -2]} intensity={0.4} color="#f0a830" />
                <pointLight position={[0, 3, 3]} intensity={0.3} color="#00e5a0" />

                <D20Mesh />
            </Canvas>

            <style>{`
        @keyframes d20glow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
        </div>
    );
}
