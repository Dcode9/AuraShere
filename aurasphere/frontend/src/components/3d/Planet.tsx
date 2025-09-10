import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import type { Mesh } from 'three';

const Planet: React.FC = () => {
  const { analyserNode } = useAudioEngine();
  const meshRef = useRef<Mesh>(null!);
  const dataArray = useMemo(() => new Uint8Array(1024 / 2), []);
  const texture = useTexture('https://opengameart.org/sites/default/files/arid_03-1024x512.png');

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.1;
    }
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
      <meshStandardMaterial map={texture} />
    </mesh>
  );
};

export default Planet;
