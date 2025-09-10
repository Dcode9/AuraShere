import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import type { Mesh } from 'three';

const CoreVisualizer: React.FC = () => {
  const { analyserNode } = useAudioEngine();
  const meshRef = useRef<Mesh>(null!);
  const dataArray = useMemo(() => new Uint8Array(1024 / 2), []);

  useFrame(() => {
    if (!analyserNode || !meshRef.current) return;
    analyserNode.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const normalized = avg / 255; // 0..1
    const targetScale = 1 + normalized * 0.6; // scale between 1 and 1.6

    const current = meshRef.current.scale.x;
    const lerped = current + (targetScale - current) * 0.15; // smoothing
    meshRef.current.scale.set(lerped, lerped, lerped);
  });

  return (
    <mesh ref={meshRef} castShadow>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color="cyan" />
    </mesh>
  );
};

export default CoreVisualizer;
