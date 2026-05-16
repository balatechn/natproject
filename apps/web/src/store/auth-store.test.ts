/**
 * useAuthStore unit tests
 *
 * Zustand stores are tested by directly calling their actions — no React
 * rendering required, so no jsdom environment needed here.
 */

// Zustand `persist` middleware writes to localStorage; mock it to keep tests isolated.
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

import { useAuthStore } from './index';

const sampleUser = {
  id: 'u1',
  name: 'Alice',
  email: 'alice@example.com',
  organizationId: 'org-1',
  roles: ['admin'],
};

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
    localStorageMock.clear();
  });

  it('initialises with null user and token', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  it('setUser stores the user', () => {
    useAuthStore.getState().setUser(sampleUser);
    expect(useAuthStore.getState().user).toEqual(sampleUser);
  });

  it('setAccessToken stores the token', () => {
    useAuthStore.getState().setAccessToken('tok-123');
    expect(useAuthStore.getState().accessToken).toBe('tok-123');
  });

  it('setAuth stores both user and token atomically', () => {
    useAuthStore.getState().setAuth(sampleUser, 'tok-abc');
    const { user, accessToken } = useAuthStore.getState();
    expect(user).toEqual(sampleUser);
    expect(accessToken).toBe('tok-abc');
  });

  it('clearAuth resets both user and token', () => {
    useAuthStore.getState().setAuth(sampleUser, 'tok-abc');
    useAuthStore.getState().clearAuth();
    const { user, accessToken } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(accessToken).toBeNull();
  });
});
