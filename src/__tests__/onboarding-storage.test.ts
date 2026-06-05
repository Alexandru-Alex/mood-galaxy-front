import { Platform } from 'react-native';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

import * as SecureStore from 'expo-secure-store';
import { getOnboardingComplete, setOnboardingComplete } from '@/lib/api';

const mockGet = SecureStore.getItemAsync as jest.MockedFunction<typeof SecureStore.getItemAsync>;
const mockSet = SecureStore.setItemAsync as jest.MockedFunction<typeof SecureStore.setItemAsync>;

beforeEach(() => {
  jest.clearAllMocks();
  // Reset localStorage mock between tests
  (global as any).localStorage = {
    _store: {} as Record<string, string>,
    getItem(k: string) { return this._store[k] ?? null; },
    setItem(k: string, v: string) { this._store[k] = v; },
  };
});

describe('getOnboardingComplete (native)', () => {
  beforeEach(() => { jest.replaceProperty(Platform, 'OS', 'ios'); });

  it('returns false when key is absent', async () => {
    mockGet.mockResolvedValueOnce(null);
    expect(await getOnboardingComplete()).toBe(false);
    expect(mockGet).toHaveBeenCalledWith('onboarding_complete');
  });

  it('returns true when key is "1"', async () => {
    mockGet.mockResolvedValueOnce('1');
    expect(await getOnboardingComplete()).toBe(true);
  });
});

describe('setOnboardingComplete (native)', () => {
  beforeEach(() => { jest.replaceProperty(Platform, 'OS', 'ios'); });

  it('stores "1" under onboarding_complete', async () => {
    mockSet.mockResolvedValueOnce(undefined);
    await setOnboardingComplete();
    expect(mockSet).toHaveBeenCalledWith('onboarding_complete', '1');
  });
});

describe('getOnboardingComplete (web)', () => {
  beforeEach(() => { jest.replaceProperty(Platform, 'OS', 'web'); });

  it('returns false when key is absent', async () => {
    expect(await getOnboardingComplete()).toBe(false);
  });

  it('returns true when key is "1"', async () => {
    (global as any).localStorage.setItem('onboarding_complete', '1');
    expect(await getOnboardingComplete()).toBe(true);
  });
});

describe('setOnboardingComplete (web)', () => {
  beforeEach(() => { jest.replaceProperty(Platform, 'OS', 'web'); });

  it('stores "1" in localStorage', async () => {
    await setOnboardingComplete();
    expect((global as any).localStorage.getItem('onboarding_complete')).toBe('1');
  });
});
