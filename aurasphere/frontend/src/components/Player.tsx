import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import PlayerControls from './PlayerControls';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { Experience } from './3d/Experience';
import ColorThief from 'colorthief';

export const Player: React.FC = () => {
  const [stems, setStems] = useState<{ file: string; label: string }[]>([]);
  const [stemPositions, setStemPositions] = useState<[number, number, number][]>([]);
  const [dominantColor, setDominantColor] = useState<string>('#101010');

  const {
    loadStems,
    play,
    pause,
    seek,
    setVolume,
    isPlaying,
    currentTime,
    duration,
    isLoading,
    updateStemPosition,
  } = useAudioEngine();

  useEffect(() => {
    const colorThief = new ColorThief();
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = '/album-art.jpg';
    img.addEventListener('load', () => {
      try {
        const color = colorThief.getColor(img);
        const hex = `#${color.map((c: number) => c.toString(16).padStart(2, '0')).join('')}`;
        setDominantColor(hex);
      } catch {}
    });
  }, []);

  useEffect(() => {
    const fetchStems = async () => {
      const res = await fetch('http://localhost:3001/api/stems');
      const data = await res.json();
      setStems(data);
      await loadStems(data, 'http://localhost:3001');

      const numStems = data.length || 1;
      const radius = 3;
      const initialPositions = data.map((_: any, i: number) => {
        const angle = (i / numStems) * Math.PI * 2;
        return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius] as [number, number, number];
      });
      setStemPositions(initialPositions);
    };
    fetchStems();
  }, [loadStems]);

  useEffect(() => {
    stemPositions.forEach((pos, index) => {
      updateStemPosition(index, { x: pos[0], y: pos[1], z: pos[2] });
    });
  }, [stemPositions, updateStemPosition]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', backgroundColor: '#0b0b0f' }}>
      <Canvas shadows style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }} camera={{ position: [0, 2.5, 6], fov: 60 }}>
        {stems.length > 0 && stemPositions.length > 0 && (
          <Experience
            stems={stems}
            stemPositions={stemPositions}
            setStemPositions={setStemPositions}
            dominantColor={dominantColor}
          />
        )}
      </Canvas>
      <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, width: '80%', maxWidth: '800px' }}>
        <div style={{ color: '#cbd5e1', fontSize: 14, marginBottom: 8 }}>
          {isLoading ? 'Loading stems...' : stems.length > 0 ? `Loaded: ${stems.map(s => s.label).join(', ')}` : 'No stems found.'}
        </div>
        <PlayerControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={1}
          onPlayPause={() => (isPlaying ? pause() : play())}
          onSeek={seek}
          onVolume={setVolume}
        />
      </div>
    </div>
  );
};

export default Player;
