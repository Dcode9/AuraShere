// in src/components/3d/Experience.tsx

import React, { useMemo, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import CoreVisualizer from './CoreVisualizer';
import { StemIcon } from './StemIcon';
import { Color } from 'three';
import { useAudioEngine } from '../../hooks/useAudioEngine';

// Define the shape of the props this component will receive
interface ExperienceProps {
  stems: { file: string; label: string }[];
  stemPositions: [number, number, number][];
  setStemPositions: React.Dispatch<React.SetStateAction<[number, number, number][]>>;
  dominantColor?: string;
}

export const Experience: React.FC<ExperienceProps> = ({ stems, stemPositions, setStemPositions, dominantColor }) => {
  // R3F hooks are now safely inside a component that will be in the Canvas
  const { scene, raycaster } = useThree();
  const { analyserNode } = useAudioEngine();

  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const DRAG_RADIUS = 3;

  const baseColor = useMemo(() => new Color(dominantColor || '#101010'), [dominantColor]);
  const dataArray = useMemo(() => new Uint8Array(1024 / 2), []);

  useFrame(() => {
    if (!analyserNode) {
      scene.background = baseColor;
      return;
    }
    analyserNode.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const normalized = avg / 255; // 0..1
    // Pulse by lerping towards white slightly based on audio
    const pulsed = baseColor.clone().lerp(new Color('#ffffff'), normalized * 0.15);
    scene.background = pulsed;
  });

  const handlePointerDown = (index: number, event: any) => {
    event.target.setPointerCapture(event.pointerId);
    event.stopPropagation();
    setIsDragging(true);
    setDraggedItemIndex(index);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setDraggedItemIndex(null);
  };

  const handlePointerMove = (event: any) => {
    if (isDragging && draggedItemIndex !== null) {
      const controlSphere = scene.getObjectByName('drag-control-sphere');
      if (controlSphere) {
        const intersects = raycaster.intersectObject(controlSphere);
        if (intersects.length > 0) {
          const point = intersects[0].point;
          const newPosition = point.normalize().multiplyScalar(DRAG_RADIUS);
          setStemPositions((prevPositions) => {
            const newPositions = [...prevPositions];
            newPositions[draggedItemIndex] = [newPosition.x, newPosition.y, newPosition.z];
            return newPositions;
          });
        }
      }
    }
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={1.5} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <OrbitControls enabled={!isDragging} />

      <CoreVisualizer />

      {stems.map((stem, index) => (
        <StemIcon
          key={index}
          position={stemPositions[index]}
          onPointerDown={(e) => handlePointerDown(index, e)}
          onPointerUp={handlePointerUp}
          onPointerMove={handlePointerMove}
          castShadow
        />
      ))}

      {/* Invisible control sphere for pointer raycast */}
      <mesh name="drag-control-sphere" visible={false}>
        <sphereGeometry args={[DRAG_RADIUS, 32, 32]} />
        <meshBasicMaterial />
      </mesh>

      {/* Shadow-receiving floor */}
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, -2, 0]}>
        <planeGeometry args={[100, 100]} />
        <shadowMaterial opacity={0.5} />
      </mesh>
    </>
  );
};
