export type DeviceSecurityStatus = {
  /** iOS: device appears jailbroken. Android: always mirrors isRooted. */
  isJailbroken: boolean;
  /** Android: device appears rooted. iOS: always mirrors isJailbroken. */
  isRooted: boolean;
  /** Running on emulator / simulator / common device-farm images. */
  isEmulator: boolean;
  /** Screen is being captured or recorded. */
  isScreenRecording: boolean;
  /** True when jailbreak/root or emulator is detected. */
  isCompromised: boolean;
  /** Native screenshot / screen-record blocking is active (FLAG_SECURE etc.). */
  isSecureScreenEnabled: boolean;
  /**
   * Privacy mode: screen recording active or a screenshot attempt was detected.
   * Use this to swap sensitive UI via `onPrivacyModeChange` or `<PrivacyShield />`.
   */
  isPrivacyMode: boolean;
  /** 'ios' | 'android' | 'unknown' */
  platform: 'ios' | 'android' | 'unknown';
};

export type PrivacyModeReason = 'screen_recording' | 'screenshot' | 'manual';

export type PrivacyModeEvent = {
  active: boolean;
  reason: PrivacyModeReason;
};

export type UseDeviceSecurityOptions = {
  /**
   * How often to re-check static signals (root / emulator).
   * Screen recording is also pushed via native events when available.
   * @default 3000
   */
  pollIntervalMs?: number;
  /** Skip the initial native read until refresh() is called. @default false */
  lazy?: boolean;
  /**
   * Block screenshots / screen recording of app content (Android FLAG_SECURE,
   * iOS secure-layer). @default true
   */
  preventScreenCapture?: boolean;
  /**
   * Native black full-screen cover (App Switcher / recording).
   * Prefer a custom JS overlay via `PrivacyShield` / `renderOverlay`.
   * @default false
   */
  nativePrivacyOverlay?: boolean;
  /**
   * Called when privacy mode turns on/off so you can replace sensitive UI.
   * Also logs to the console when entering privacy mode.
   */
  onPrivacyModeChange?: (event: PrivacyModeEvent) => void;
};

export type UseDeviceSecurityResult = DeviceSecurityStatus & {
  isLoading: boolean;
  /** Why privacy mode is active, if any. */
  privacyReason: PrivacyModeReason | null;
  refresh: () => void;
  /** Turn on native screenshot / recording blocking. */
  enableSecureScreen: () => void;
  /** Turn off native screenshot / recording blocking. */
  disableSecureScreen: () => void;
  /** Leave privacy mode (ignored while screen recording is still active). */
  exitPrivacyMode: () => void;
};

export type PrivacyOverlayRenderProps = UseDeviceSecurityResult & {
  reason: PrivacyModeReason | null;
};
