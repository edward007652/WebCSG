import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { ParametricMesh } from './ParametricMesh';

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
}

interface Scene3DProps {
  modelUrl: string | null;
  cameraState?: CameraState;
  onCameraChange?: (state: CameraState) => void;
}

/**
 * Component responsible for managing and synchronizing the camera state
 * (position and target) with external state.
 */
const CameraController: React.FC<{
  cameraState?: CameraState;
  onCameraChange?: (state: CameraState) => void;
}> = ({ cameraState, onCameraChange }) => {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Update Three.js camera when the external React state changes
  useEffect(() => {
    if (cameraState && controlsRef.current) {
      camera.position.set(...cameraState.position);
      controlsRef.current.target.set(...cameraState.target);
      controlsRef.current.update();
    }
  }, [cameraState, camera]);

  return (
    <OrbitControls 
      ref={controlsRef} 
      makeDefault 
      onChange={() => {
        // Broadcast camera changes back to the parent state
        if (onCameraChange && controlsRef.current) {
          onCameraChange({
            position: [camera.position.x, camera.position.y, camera.position.z],
            target: [controlsRef.current.target.x, controlsRef.current.target.y, controlsRef.current.target.z]
          });
        }
      }}
    />
  );
};

/**
 * Main 3D Scene component.
 * Sets up the Three.js Canvas, lighting, environment, and renders the parametric mesh.
 */
export const Scene3D: React.FC<Scene3DProps> = ({ modelUrl, cameraState, onCameraChange }) => {
  return (
    <Canvas camera={{ position: [20, 20, 20], fov: 45 }}>
      {/* Changed background color to a darker, more contrasting gray */}
      <color attach="background" args={['#2c3e50']} />
      
      {/* Lighting setup for better visibility */}
      <ambientLight intensity={1.2} />
      <directionalLight position={[20, 20, 10]} intensity={1.5} castShadow />
      <directionalLight position={[-20, 10, -10]} intensity={0.8} />
      <directionalLight position={[0, -20, 0]} intensity={0.5} />
      <pointLight position={[0, 20, 0]} intensity={1.0} />
      
      {modelUrl && (
        <Suspense fallback={null}>
          <Stage environment="studio" intensity={1.0} adjustCamera={false}>
            <ParametricMesh modelUrl={modelUrl} />
          </Stage>
        </Suspense>
      )}
      
      <CameraController cameraState={cameraState} onCameraChange={onCameraChange} />
      {/* Grid helper to better perceive depth and space */}
      <gridHelper args={[50, 50, '#888888', '#444444']} position={[0, -10, 0]} />
    </Canvas>
  );
};
