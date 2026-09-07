import { create } from 'zustand';

interface WelcomeState {
  isOpen: boolean;
  username: string;
  triggerWelcome: (username: string) => void;
  closeWelcome: () => void;
}

/**
 * Transient in-memory store for the full-screen welcome experience.
 * Not persisted in localStorage to ensure it only activates on explicit login,
 * and never on standard page refreshes or internal page navigation.
 */
export const useWelcomeStore = create<WelcomeState>((set) => ({
  isOpen: false,
  username: '',
  triggerWelcome: (username: string) => {
    set({
      isOpen: true,
      username: username?.trim() || 'User',
    });
  },
  closeWelcome: () => {
    set({
      isOpen: false,
      username: '',
    });
  },
}));
