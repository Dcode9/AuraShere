import { useCallback, useEffect, useRef, useState } from 'react';

export type StemInfo = { file: string; label: string };

export type Vec3 = { x: number; y: number; z: number };

export type AudioEngine = {
  isLoading: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0..1
  audioBuffers: AudioBuffer[];
  analyserNode: AnalyserNode | null;
  loadStems: (stems: StemInfo[], baseUrl: string) => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  updateStemPosition: (stemIndex: number, position: Vec3) => void;
  setInitialPositions: (positions: Vec3[]) => void;
};

export function useAudioEngine(): AudioEngine {
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const pannersRef = useRef<PannerNode[]>([]);

  const [audioBuffers, setAudioBuffers] = useState<AudioBuffer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);

  const initialPositionsRef = useRef<Vec3[]>([]);

  // Track active sources and timing state
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const offsetRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  const ensureContext = useCallback(() => {
    if (!audioContextRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const gain = ctx.createGain();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.85;

      gain.gain.value = volume;

      // analyser -> master gain -> destination
      analyser.connect(gain);
      gain.connect(ctx.destination);

      audioContextRef.current = ctx;
      gainNodeRef.current = gain;
      analyserRef.current = analyser;
    } else if (gainNodeRef.current && audioContextRef.current) {
      try { gainNodeRef.current.disconnect(); } catch {}
      try { analyserRef.current?.disconnect(); } catch {}
      // Reconnect analyser -> gain -> destination
      analyserRef.current?.connect(gainNodeRef.current);
      gainNodeRef.current.connect(audioContextRef.current.destination);
    }
    return audioContextRef.current!;
  }, [volume]);

  const ensurePanners = useCallback(() => {
    const ctx = ensureContext();
    const analyser = analyserRef.current!;
    if (pannersRef.current.length !== audioBuffers.length) {
      pannersRef.current.forEach((p) => { try { p.disconnect(); } catch {} });
      pannersRef.current = audioBuffers.map((_, i) => {
        const p = ctx.createPanner();
        // @ts-expect-error legacy type in TS lib
        p.panningModel = 'HRTF';
        p.distanceModel = 'inverse';
        p.refDistance = 1;
        p.maxDistance = 10000;
        p.rolloffFactor = 1;
        p.coneInnerAngle = 360;
        p.coneOuterAngle = 0;
        p.coneOuterGain = 0;
        const pos = initialPositionsRef.current[i] || { x: 0, y: 0, z: 0 };
        try { (p.positionX as any).value = pos.x; } catch {}
        try { (p.positionY as any).value = pos.y; } catch {}
        try { (p.positionZ as any).value = pos.z; } catch {}
        // panner -> analyser (not directly to gain)
        p.connect(analyser);
        return p;
      });
    }
  }, [audioBuffers, ensureContext]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  const stopRaf = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const tick = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    if (startTimeRef.current != null) {
      const t = (ctx.currentTime - startTimeRef.current) + offsetRef.current;
      setCurrentTime(Math.min(t, duration));
      if (t >= duration) {
        setIsPlaying(false);
        stopRaf();
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    }
  }, [duration]);

  const connectAndStartSources = useCallback((offsetSeconds: number) => {
    const ctx = ensureContext();
    ensurePanners();

    const created: AudioBufferSourceNode[] = audioBuffers.map((buf, i) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const panner = pannersRef.current[i] ?? ctx.createPanner();
      if (!pannersRef.current[i]) {
        // @ts-expect-error legacy type in TS lib
        panner.panningModel = 'HRTF';
        panner.connect(analyserRef.current!);
        pannersRef.current[i] = panner;
      }
      const pos = initialPositionsRef.current[i] || { x: 0, y: 0, z: 0 };
      try { (panner.positionX as any).value = pos.x; } catch {}
      try { (panner.positionY as any).value = pos.y; } catch {}
      try { (panner.positionZ as any).value = pos.z; } catch {}

      src.connect(panner); // source -> panner
      src.start(0, Math.min(offsetSeconds, buf.duration));
      return src;
    });

    activeSourcesRef.current = created;
  }, [audioBuffers, ensureContext, ensurePanners]);

  const stopActiveSources = useCallback(() => {
    if (activeSourcesRef.current.length > 0) {
      try {
        activeSourcesRef.current.forEach((src) => {
          try { src.stop(); } catch {}
          try { src.disconnect(); } catch {}
        });
      } finally {
        activeSourcesRef.current = [];
      }
    }
  }, []);

  const loadStems = useCallback(async (stems: StemInfo[], baseUrl: string) => {
    setIsLoading(true);
    try {
      const ctx = ensureContext();
      const responses = await Promise.all(
        stems.map((stem) => fetch(`${baseUrl}/audio/${encodeURIComponent(stem.file)}`))
      );
      for (const res of responses) {
        if (!res.ok) throw new Error(`Failed to fetch a stem: ${res.status} ${res.statusText}`);
      }
      const arrayBuffers = await Promise.all(responses.map((r) => r.arrayBuffer()));
      const decoded = await Promise.all(arrayBuffers.map((ab) => ctx.decodeAudioData(ab.slice(0))));

      setAudioBuffers(decoded);
      setDuration(decoded.reduce((max, b) => Math.max(max, b.duration || 0), 0));
      offsetRef.current = 0;
      setCurrentTime(0);

      // Rebuild panners next play
      pannersRef.current.forEach((p) => { try { p.disconnect(); } catch {} });
      pannersRef.current = [];
    } catch (error) {
      console.error('Error loading stems:', error);
      setAudioBuffers([]);
      setDuration(0);
    } finally {
      setIsLoading(false);
    }
  }, [ensureContext]);

  const play = useCallback(async () => {
    const ctx = ensureContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    if (audioBuffers.length === 0) return;

    stopActiveSources();
    connectAndStartSources(offsetRef.current);

    startTimeRef.current = ctx.currentTime;
    setIsPlaying(true);
    stopRaf();
    rafRef.current = requestAnimationFrame(tick);
  }, [audioBuffers.length, connectAndStartSources, ensureContext, stopActiveSources, tick]);

  const pause = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    if (!isPlaying) return;

    if (startTimeRef.current != null) {
      const played = ctx.currentTime - startTimeRef.current;
      offsetRef.current = Math.min(offsetRef.current + played, duration);
    }

    stopActiveSources();
    startTimeRef.current = null;
    setIsPlaying(false);
    stopRaf();
  }, [duration, isPlaying, stopActiveSources]);

  const seek = useCallback((time: number) => {
    const next = Math.max(0, Math.min(time, duration));
    offsetRef.current = next;
    setCurrentTime(next);

    if (isPlaying) {
      stopActiveSources();
      connectAndStartSources(next);
      if (audioContextRef.current) {
        startTimeRef.current = audioContextRef.current.currentTime;
      }
    }
  }, [connectAndStartSources, duration, isPlaying, stopActiveSources]);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(vol, 1));
    setVolumeState(clamped);
  }, []);

  const updateStemPosition = useCallback((stemIndex: number, position: Vec3) => {
    const ctx = audioContextRef.current;
    const panner = pannersRef.current[stemIndex];
    if (!ctx || !panner) return;
    const t = ctx.currentTime;
    try { (panner.positionX as any).setValueAtTime(position.x, t); } catch { (panner.positionX as any).value = position.x; }
    try { (panner.positionY as any).setValueAtTime(position.y, t); } catch { (panner.positionY as any).value = position.y; }
    try { (panner.positionZ as any).setValueAtTime(position.z, t); } catch { (panner.positionZ as any).value = position.z; }
  }, []);

  const setInitialPositions = useCallback((positions: Vec3[]) => {
    initialPositionsRef.current = positions;
    positions.forEach((p, i) => {
      const pn = pannersRef.current[i];
      if (pn) {
        try { (pn.positionX as any).value = p.x; } catch {}
        try { (pn.positionY as any).value = p.y; } catch {}
        try { (pn.positionZ as any).value = p.z; } catch {}
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      stopRaf();
      stopActiveSources();
      pannersRef.current.forEach((p) => { try { p.disconnect(); } catch {} });
      if (analyserRef.current) { try { analyserRef.current.disconnect(); } catch {} }
      if (gainNodeRef.current) { try { gainNodeRef.current.disconnect(); } catch {} }
      if (audioContextRef.current) { try { audioContextRef.current.close(); } catch {} }
    };
  }, [stopActiveSources]);

  return {
    isLoading,
    isPlaying,
    currentTime,
    duration,
    volume,
    audioBuffers,
    analyserNode: analyserRef.current,
    loadStems,
    play,
    pause,
    seek,
    setVolume,
    updateStemPosition,
    setInitialPositions,
  };
}

export default useAudioEngine;
