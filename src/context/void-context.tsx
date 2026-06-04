import * as Haptics from 'expo-haptics';
import { createAudioPlayer } from 'expo-audio';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export type VoidStatus = 'idle' | 'running' | 'complete';

type VoidContextValue = {
  status: VoidStatus;
  durationSeconds: number;
  remainingSeconds: number;
  startSession: (durationSeconds: number) => void;
  resetSession: () => void;
};

const VoidContext = createContext<VoidContextValue>({
  status: 'idle',
  durationSeconds: 0,
  remainingSeconds: 0,
  startSession: () => {},
  resetSession: () => {},
});

export function VoidProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<VoidStatus>('idle');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const startedAtRef = useRef<number | null>(null);
  const durationRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusRef = useRef<VoidStatus>('idle');
  const chimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimer() {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function startSession(seconds: number) {
    clearTimer();
    startedAtRef.current = null; // prevent in-flight tick from acting
    setDurationSeconds(seconds);
    setRemainingSeconds(seconds);
    durationRef.current = seconds;
    startedAtRef.current = Date.now();
    setStatus('running');
  }

  function resetSession() {
    clearTimer();
    if (chimeTimerRef.current !== null) {
      clearTimeout(chimeTimerRef.current);
      chimeTimerRef.current = null;
    }
    setStatus('idle');
    setDurationSeconds(0);
    setRemainingSeconds(0);
    startedAtRef.current = null;
  }

  const handleComplete = useCallback(async function handleComplete() {
    clearTimer();
    setRemainingSeconds(0);
    setStatus('complete');
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    try {
      const player = createAudioPlayer(require('../../assets/audio/chime.mp3'));
      player.play();
      chimeTimerRef.current = setTimeout(() => { player.remove(); chimeTimerRef.current = null; }, 4000);
    } catch {}
  }, []);

  const tick = useCallback(function tick() {
    if (startedAtRef.current === null || statusRef.current !== 'running') return;
    const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
    const remaining = Math.max(0, durationRef.current - elapsed);
    setRemainingSeconds(remaining);
    if (remaining === 0) {
      handleComplete();
    }
  }, [handleComplete]);

  useEffect(() => { statusRef.current = status; }, [status]);

  useEffect(() => {
    if (status !== 'running') return;
    intervalRef.current = setInterval(tick, 1000);
    return clearTimer;
  }, [status, tick]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && status === 'running') {
        tick();
      }
    });
    return () => sub.remove();
  }, [status, tick]);

  return (
    <VoidContext.Provider value={{ status, durationSeconds, remainingSeconds, startSession, resetSession }}>
      {children}
    </VoidContext.Provider>
  );
}

export const useVoid = () => useContext(VoidContext);
