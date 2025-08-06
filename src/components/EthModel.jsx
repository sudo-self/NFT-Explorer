// src/components/EthModel.jsx

import React, { Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

function EthereumLogo() {
  const { scene } = useGLTF("/eth.glb");

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          metalness: 0.6,
          roughness: 0.4,
        });
      }
    });
  }, [scene]);

  return <primitive object={scene} scale={0.03} position={[0, -0.05, 0]} />;
}

const EthGLBViewer = () => {
  return (
    <div className="w-10 h-10">
      <Canvas camera={{ position: [0, 0, 5], fov: 35 }} gl={{ alpha: true }}>
        <ambientLight intensity={1} />
        <directionalLight position={[2, 2, 2]} />
        <Suspense fallback={null}>
          <EthereumLogo />
        </Suspense>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={2}
        />
      </Canvas>
    </div>
  );
};

export default EthGLBViewer;

