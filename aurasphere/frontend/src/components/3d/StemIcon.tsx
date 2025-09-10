// in src/components/3d/StemIcon.tsx

import React from 'react';
import type { ThreeElements } from '@react-three/fiber';

type StemIconProps = ThreeElements['mesh'] & {
  onPointerDown: (event: any) => void;
  onPointerUp: (event: any) => void;
  onPointerMove: (event: any) => void;
};

export const StemIcon: React.FC<StemIconProps> = (props) => {
  return (
    <mesh {...props}>
      <sphereGeometry args={[0.2, 32, 32]} />
      <meshStandardMaterial color="magenta" />
    </mesh>
  );
};