import React, { useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';

export type PlayerControlsProps = {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0..1
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolume: (volume: number) => void;
};

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  volume,
  onPlayPause,
  onSeek,
  onVolume,
}) => {
  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;

  // Circular progress ring metrics
  const size = 64;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  const volumePct = Math.round(volume * 100);

  return (
    <div className="w-full max-w-3xl mx-auto backdrop-blur-md bg-black/30 border border-white/10 rounded-2xl p-4 shadow-lg">
      {/* Seek bar + time */}
      <div className="flex items-center gap-3">
        <span className="text-xs tabular-nums text-gray-300 min-w-[40px] text-right">{formatTime(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={Math.min(currentTime, duration || 0)}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="w-full accent-indigo-500 [--tw-range-thumb-size:14px]"
        />
        <span className="text-xs tabular-nums text-gray-300 min-w-[40px]">{formatTime(duration)}</span>
      </div>

      {/* Controls row */}
      <div className="mt-4 flex items-center justify-between gap-4">
        {/* Left: skip back */}
        <button aria-label="Previous" className="p-2 rounded-full hover:bg-white/10 text-gray-200">
          <SkipBack size={20} />
        </button>

        {/* Center: play with circular progress */}
        <button
          onClick={onPlayPause}
          className="relative h-16 w-16 grid place-items-center rounded-full bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-lg hover:scale-[1.02] transition-transform"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          <svg className="absolute inset-0 -rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}> 
            <circle cx={size/2} cy={size/2} r={radius} stroke="rgba(255,255,255,0.15)" strokeWidth={stroke} fill="none" />
            <circle
              cx={size/2}
              cy={size/2}
              r={radius}
              stroke="#fff"
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>

        {/* Right: skip forward */}
        <button aria-label="Next" className="p-2 rounded-full hover:bg-white/10 text-gray-200">
          <SkipForward size={20} />
        </button>

        {/* Volume */}
        <div className="ml-auto flex items-center gap-2 min-w-[180px]">
          <Volume2 size={18} className="text-gray-300" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => onVolume(Number(e.target.value))}
            className="w-32 accent-indigo-500"
          />
          <span className="text-xs text-gray-300 tabular-nums w-8 text-right">{volumePct}</span>
        </div>
      </div>
    </div>
  );
};

export default PlayerControls;
