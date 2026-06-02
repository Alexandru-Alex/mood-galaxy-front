import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const SOUND_KEY = 'sound_enabled';

export async function persistSoundEnabled(val: boolean): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(SOUND_KEY, String(val));
}

type AudioContextValue = {
  isMuted: boolean;
  toggleMute: () => void;
  setMuted: (val: boolean) => void;
};

const AudioContext = createContext<AudioContextValue>({
  isMuted: false,
  toggleMute: () => {},
  setMuted: () => {},
});

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const playerRef = useRef<AudioPlayer | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let player: AudioPlayer | null = null;
    let cancelled = false;
    let idleHandle: ReturnType<typeof requestIdleCallback> | null = null;

    idleHandle = requestIdleCallback(async () => {
      if (cancelled) return;
      try {
        const stored = await SecureStore.getItemAsync(SOUND_KEY);
        const startMuted = stored === 'false';
        if (startMuted) setIsMuted(true);
        await setAudioModeAsync({ playsInSilentMode: true });
        if (cancelled) return;
        player = createAudioPlayer(require('../../assets/audio/meditation.mp3'));
        player.loop = true;
        player.volume = startMuted ? 0 : 1;
        player.play();
        playerRef.current = player;
      } catch {}
    });

    return () => {
      cancelled = true;
      if (idleHandle !== null) cancelIdleCallback(idleHandle);
      player?.remove();
    };
  }, []);

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (playerRef.current) {
        playerRef.current.volume = next ? 0 : 1;
      }
      return next;
    });
  };

  const setMuted = useCallback((val: boolean) => {
    setIsMuted(val);
    if (playerRef.current) {
      playerRef.current.volume = val ? 0 : 1;
    }
  }, []);

  return (
    <AudioContext.Provider value={{ isMuted, toggleMute, setMuted }}>
      {children}
    </AudioContext.Provider>
  );
}

export const useAudio = () => useContext(AudioContext);
