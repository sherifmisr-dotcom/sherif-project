/**
 * Type definitions for Idle Session Timeout feature
 */

/**
 * Configuration options for the useIdleTimeout hook
 */
export interface UseIdleTimeoutOptions {
  /** Total idle time in milliseconds before logout (default: 60 minutes) */
  idleMs: number;

  /** Warning duration in milliseconds before logout (default: 60 seconds) */
  warnMs: number;

  /** Throttle interval in milliseconds for activity updates (default: 3 seconds) */
  throttleMs: number;

  /** Whether the user is currently authenticated */
  isAuthenticated: boolean;

  /** Callback function to perform logout */
  onLogout: () => void;
}

/**
 * Return value from the useIdleTimeout hook
 */
export interface UseIdleTimeoutReturn {
  /** Whether to show the warning modal */
  showModal: boolean;

  /** Remaining seconds in the countdown timer */
  remainingSeconds: number;

  /** Whether the countdown has expired (reached 0) */
  expired: boolean;

  /** Handler for the continue button */
  handleContinue: () => void;

  /** Handler for the logout button */
  handleLogout: () => void;
}

/**
 * Props for the IdleTimeoutModal component
 */
export interface IdleTimeoutModalProps {
  /** Whether the modal is open */
  isOpen: boolean;

  /** Remaining seconds in the countdown */
  remainingSeconds: number;

  /** Callback when continue button is clicked */
  onContinue: () => void;

  /** Callback when logout button is clicked */
  onLogout: () => void;
}

/**
 * Activity event types that trigger idle timer reset
 */
export type ActivityEvent =
  | 'mousemove'
  | 'mousedown'
  | 'keydown'
  | 'scroll'
  | 'touchstart';

/**
 * Visibility event types that trigger idle status check
 */
export type VisibilityEvent =
  | 'visibilitychange'
  | 'focus';

/**
 * localStorage schema for persisting idle timeout state
 */
export interface LocalStorageSchema {
  /** Timestamp of last user activity (Date.now()) */
  lastActivityAt: string;
}

/**
 * Storage keys used by the idle timeout feature
 */
export const STORAGE_KEYS = {
  LAST_ACTIVITY: 'lastActivityAt',
} as const;
