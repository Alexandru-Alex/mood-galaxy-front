import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { OnboardingSplash } from '@/components/onboarding-splash';

jest.mock('@/lib/api', () => ({
  setOnboardingComplete: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

import { setOnboardingComplete } from '@/lib/api';
const mockSet = setOnboardingComplete as jest.MockedFunction<typeof setOnboardingComplete>;

describe('OnboardingSplash', () => {
  it('renders title and subtitle', () => {
    const { getByText } = render(
      <OnboardingSplash onBegin={jest.fn()} onSkip={jest.fn()} />,
    );
    expect(getByText('Your moods become stars')).toBeTruthy();
    expect(getByText(/Every feeling you log/)).toBeTruthy();
  });

  it('calls setOnboardingComplete then onBegin when CTA pressed', async () => {
    const onBegin = jest.fn();
    const { getByText } = render(
      <OnboardingSplash onBegin={onBegin} onSkip={jest.fn()} />,
    );
    fireEvent.press(getByText('✦  Log your first mood'));
    await waitFor(() => {
      expect(mockSet).toHaveBeenCalledTimes(1);
      expect(onBegin).toHaveBeenCalledTimes(1);
    });
  });

  it('calls setOnboardingComplete then onSkip when Skip pressed', async () => {
    const onSkip = jest.fn();
    const { getByText } = render(
      <OnboardingSplash onBegin={jest.fn()} onSkip={onSkip} />,
    );
    fireEvent.press(getByText('Skip'));
    await waitFor(() => {
      expect(mockSet).toHaveBeenCalledTimes(1);
      expect(onSkip).toHaveBeenCalledTimes(1);
    });
  });
});
