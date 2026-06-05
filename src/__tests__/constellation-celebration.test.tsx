import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { ConstellationCelebration } from '@/components/constellation-celebration';
import type { Entry } from '@/lib/entries';

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light' },
}));

const ENTRIES: Entry[] = [
  { entryIndex: 1, date: '2026-06-01', mood: 'JOYFUL' },
  { entryIndex: 2, date: '2026-06-02', mood: 'CALM' },
  { entryIndex: 3, date: '2026-06-03', mood: 'NEUTRAL' },
  { entryIndex: 4, date: '2026-06-04', mood: 'ANXIOUS' },
  { entryIndex: 5, date: '2026-06-05', mood: 'SAD' },
  { entryIndex: 6, date: '2026-06-06', mood: 'ANGRY' },
  { entryIndex: 7, date: '2026-06-07', mood: 'JOYFUL' },
];

describe('ConstellationCelebration', () => {
  it('renders the completion banner text', () => {
    const { getByText } = render(
      <ConstellationCelebration
        seed={42}
        constellationId="c0"
        entries={ENTRIES}
        constellationX={200}
        constellationY={300}
        onViewGalaxy={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );
    expect(getByText('✦  Constellation complete')).toBeTruthy();
    expect(getByText('7 moods · View in galaxy →')).toBeTruthy();
  });

  it('calls onViewGalaxy when banner tap pressed', () => {
    const onViewGalaxy = jest.fn();
    const { getByText } = render(
      <ConstellationCelebration
        seed={42}
        constellationId="c0"
        entries={ENTRIES}
        constellationX={200}
        constellationY={300}
        onViewGalaxy={onViewGalaxy}
        onDismiss={jest.fn()}
      />,
    );
    fireEvent.press(getByText('7 moods · View in galaxy →'));
    expect(onViewGalaxy).toHaveBeenCalledTimes(1);
  });

  it('fires haptic on mount', () => {
    const { impactAsync } = require('expo-haptics');
    render(
      <ConstellationCelebration
        seed={42}
        constellationId="c0"
        entries={ENTRIES}
        constellationX={200}
        constellationY={300}
        onViewGalaxy={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );
    expect(impactAsync).toHaveBeenCalledWith('light');
  });

  it('calls onDismiss after 5 seconds', () => {
    jest.useFakeTimers();
    const onDismiss = jest.fn();
    render(
      <ConstellationCelebration
        seed={42}
        constellationId="c0"
        entries={ENTRIES}
        constellationX={200}
        constellationY={300}
        onViewGalaxy={jest.fn()}
        onDismiss={onDismiss}
      />,
    );
    act(() => { jest.advanceTimersByTime(5500); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
