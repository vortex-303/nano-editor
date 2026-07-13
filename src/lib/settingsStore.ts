const FAL_KEY = 'nano.falKey';
const UNSPLASH_KEY = 'nano.unsplashKey';
const ONBOARDING_COMPLETE = 'nano.onboardingComplete';

export const getFalKey = (): string | null => localStorage.getItem(FAL_KEY);
export const setFalKey = (key: string): void => localStorage.setItem(FAL_KEY, key.trim());
export const clearFalKey = (): void => localStorage.removeItem(FAL_KEY);

export const getUnsplashKey = (): string | null => localStorage.getItem(UNSPLASH_KEY);
export const setUnsplashKey = (key: string): void => localStorage.setItem(UNSPLASH_KEY, key.trim());
export const clearUnsplashKey = (): void => localStorage.removeItem(UNSPLASH_KEY);

export const isOnboardingComplete = (): boolean => localStorage.getItem(ONBOARDING_COMPLETE) === '1';
export const markOnboardingComplete = (): void => localStorage.setItem(ONBOARDING_COMPLETE, '1');

export const keyHint = (key: string): string =>
  key.length <= 8 ? '••••' : `${key.slice(0, 4)}…${key.slice(-4)}`;
