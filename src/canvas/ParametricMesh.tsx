import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';

interface ParametricMeshProps {
  modelUrl: string | null;
}

/**
 * Component responsible for asynchronously loading and rendering the generated GLB model.
 * It manually handles GLTFLoader instead of using React Suspense to prevent UI flickering 
 * when the model is continuously updating.
 */
export const ParametricMesh: React.FC<ParametricMeshProps> = ({ modelUrl }) => {
  const [currentScene, setCurrentScene] = useState<THREE.Group | null>(null);

  useEffect(() => {
    if (!modelUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentScene(null);
      return;
    }

    let isMounted = true;

    // Load the GLTF asynchronously manually to bypass React Suspense.
    // React Suspense hides the component while loading, which causes the "flash" or "flicker".
    // By loading it in a useEffect and updating state ONLY when it's done,
    // the old model remains on screen until the very moment the new model is ready.
    const loader = new GLTFLoader();
    loader.load(modelUrl, (gltf) => {
      if (!isMounted) return;
      
      const newScene = gltf.scene.clone();
      setCurrentScene(newScene);
    });

    return () => {
      isMounted = false;
    };
  }, [modelUrl]);

  // Cleanup old scenes when a new one replaces it
  useEffect(() => {
    return () => {
      if (currentScene) {
        currentScene.traverse((child: any) => {
          if (child.isMesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((mat: any) => mat.dispose());
            } else {
              child.material?.dispose();
            }
          }
        });
      }
    };
  }, [currentScene]);

  if (!currentScene) return null;

  return <primitive object={currentScene} />;
};
