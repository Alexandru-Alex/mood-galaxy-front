import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import { VoidProvider, useVoid } from '@/context/void-context';

jest.useFakeTimers();

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({ play: jest.fn(), remove: jest.fn() })),
}));

import { AppState } from 'react-native';

jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() } as any);

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(VoidProvider, null, children);
}

describe('useVoid', () => {
  it('starts in idle status', () => {
    const { result } = renderHook(() => useVoid(), { wrapper });
    expect(result.current.status).toBe('idle');
    expect(result.current.remainingSeconds).toBe(0);
  });

  it('transitions to running when startSession is called', () => {
    const { result } = renderHook(() => useVoid(), { wrapper });
    act(() => {
      result.current.startSession(300);
    });
    expect(result.current.status).toBe('running');
    expect(result.current.durationSeconds).toBe(300);
    expect(result.current.remainingSeconds).toBe(300);
  });

  it('counts down each second', () => {
    const { result } = renderHook(() => useVoid(), { wrapper });
    act(() => {
      result.current.startSession(300);
    });
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current.remainingSeconds).toBe(297);
  });

  it('transitions to complete when countdown reaches 0', () => {
    const { result } = renderHook(() => useVoid(), { wrapper });
    act(() => {
      result.current.startSession(2);
    });
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current.status).toBe('complete');
    expect(result.current.remainingSeconds).toBe(0);
  });

  it('resets back to idle after resetSession', () => {
    const { result } = renderHook(() => useVoid(), { wrapper });
    act(() => {
      result.current.startSession(10);
    });
    act(() => {
      result.current.resetSession();
    });
    expect(result.current.status).toBe('idle');
    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.durationSeconds).toBe(0);
  });
});
