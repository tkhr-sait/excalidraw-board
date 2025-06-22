import { atom } from 'jotai';

// Board state atoms
export const elementsAtom = atom<readonly any[]>([]);

export const appStateAtom = atom<any>({
  viewBackgroundColor: "#ffffff",
});

// Connection state atoms
export const connectionStatusAtom = atom<'connecting' | 'connected' | 'disconnected'>('disconnected');

export const roomIdAtom = atom<string | null>(null);

export const connectedUsersAtom = atom<string[]>([]);

// Derived atoms
export const isConnectedAtom = atom((get) => get(connectionStatusAtom) === 'connected');