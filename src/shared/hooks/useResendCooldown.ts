import { useEffect, useMemo, useState } from 'react';

const RESEND_COOLDOWN_KEY = 'resend-verification-cooldown';
const COOLDOWN_DURATION_SECONDS = 60;

interface CooldownState {
  expiresAt: null | number;
}

/**
 * Hook to manage resend verification email cooldown with localStorage persistence
 *
 * Automatically blocks resend button for 60 seconds after registration or resend.
 * State persists across page refreshes using localStorage.
 *
 * @returns Object with cooldown state and control functions
 */
export function useResendCooldown() {
  const [cooldownState, setCooldownState] = useState<CooldownState>(() => {
    // initialize from localStorage on mount
    try {
      const stored = localStorage.getItem(RESEND_COOLDOWN_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CooldownState;
        // check if cooldown is still valid
        if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
          return parsed;
        }
        // expired cooldown, clear it
        localStorage.removeItem(RESEND_COOLDOWN_KEY);
      }
    } catch {
      // ignore parse errors
    }
    return { expiresAt: null };
  });

  // calculate initial remaining seconds from cooldownState
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    if (cooldownState.expiresAt === null) {
      return 0;
    }
    const now = Date.now();
    return Math.max(0, Math.ceil((cooldownState.expiresAt - now) / 1000));
  });

  // calculate remaining seconds and update every second
  useEffect(() => {
    if (cooldownState.expiresAt === null) {
      setRemainingSeconds(0);
      return;
    }

    const expiresAt = cooldownState.expiresAt;

    const updateRemaining = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
      setRemainingSeconds(remaining);

      // if cooldown expired, clear state
      if (remaining === 0) {
        setCooldownState({ expiresAt: null });
        localStorage.removeItem(RESEND_COOLDOWN_KEY);
      }
    };

    // update immediately
    updateRemaining();

    // update every second
    const interval = setInterval(updateRemaining, 1000);

    return () => clearInterval(interval);
  }, [cooldownState.expiresAt]);

  // persist to localStorage whenever cooldown state changes
  useEffect(() => {
    if (cooldownState.expiresAt === null) {
      localStorage.removeItem(RESEND_COOLDOWN_KEY);
    } else {
      try {
        localStorage.setItem(RESEND_COOLDOWN_KEY, JSON.stringify(cooldownState));
      } catch {
        // ignore storage errors (e.g., quota exceeded)
      }
    }
  }, [cooldownState]);

  const startCooldown = () => {
    const expiresAt = Date.now() + COOLDOWN_DURATION_SECONDS * 1000;
    setCooldownState({ expiresAt });
  };

  const isBlocked = useMemo(() => {
    return cooldownState.expiresAt !== null && remainingSeconds > 0;
  }, [cooldownState.expiresAt, remainingSeconds]);

  const hasActiveCooldown = useMemo(() => {
    return cooldownState.expiresAt !== null && cooldownState.expiresAt > Date.now();
  }, [cooldownState.expiresAt]);

  return {
    hasActiveCooldown,
    isBlocked,
    remainingSeconds,
    startCooldown,
  };
}
