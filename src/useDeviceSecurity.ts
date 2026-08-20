import { useCallback, useEffect, useRef, useState } from 'react';
import NativeDeviceShield from './NativeDeviceShield';
import {
  disableSecureScreen as nativeDisableSecureScreen,
  enableSecureScreen as nativeEnableSecureScreen,
  getSecurityStatus,
  setNativePrivacyOverlayEnabled,
  subscribeScreenRecording,
  subscribeScreenshotDetected,
} from './deviceSecurity';
import type {
  DeviceSecurityStatus,
  PrivacyModeEvent,
  PrivacyModeReason,
  UseDeviceSecurityOptions,
  UseDeviceSecurityResult,
} from './types';

const DEFAULT_STATUS: DeviceSecurityStatus = {
  isJailbroken: false,
  isRooted: false,
  isEmulator: false,
  isScreenRecording: false,
  isCompromised: false,
  isSecureScreenEnabled: false,
  isPrivacyMode: false,
  platform: 'unknown',
};

/**
 * One-line device integrity + screen-capture monitoring for fintech,
 * e-commerce and healthcare apps (HIPAA / KVKK oriented workflows).
 */
export function useDeviceSecurity(
  options: UseDeviceSecurityOptions = {}
): UseDeviceSecurityResult {
  const {
    pollIntervalMs = 3000,
    lazy = false,
    preventScreenCapture = true,
    nativePrivacyOverlay = false,
    onPrivacyModeChange,
  } = options;

  const [status, setStatus] = useState<DeviceSecurityStatus>(DEFAULT_STATUS);
  const [isLoading, setIsLoading] = useState(!lazy);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [privacyReason, setPrivacyReason] = useState<PrivacyModeReason | null>(
    null
  );
  const mounted = useRef(true);
  const privacyActiveRef = useRef(false);
  const recordingRef = useRef(false);
  const onPrivacyModeChangeRef = useRef(onPrivacyModeChange);

  useEffect(() => {
    onPrivacyModeChangeRef.current = onPrivacyModeChange;
  }, [onPrivacyModeChange]);

  const setPrivacy = useCallback(
    (active: boolean, reason: PrivacyModeReason) => {
      if (active === privacyActiveRef.current) {
        return;
      }

      privacyActiveRef.current = active;
      setPrivacyMode(active);
      setPrivacyReason(active ? reason : null);

      if (active) {
        console.log(
          `[DeviceShield] Privacy mode active (reason: ${reason}) — switch away from sensitive UI`
        );
      } else {
        console.log('[DeviceShield] Privacy mode ended');
      }

      const event: PrivacyModeEvent = { active, reason };
      onPrivacyModeChangeRef.current?.(event);
    },
    []
  );

  const refresh = useCallback(() => {
    try {
      const next = getSecurityStatus(privacyActiveRef.current);
      if (!mounted.current) {
        return;
      }

      setStatus(next);
      setIsLoading(false);
      recordingRef.current = next.isScreenRecording;

      if (next.isScreenRecording) {
        setPrivacy(true, 'screen_recording');
      }
    } catch {
      if (mounted.current) {
        setIsLoading(false);
      }
    }
  }, [setPrivacy]);

  const enableSecureScreen = useCallback(() => {
    nativeEnableSecureScreen();
    refresh();
  }, [refresh]);

  const disableSecureScreen = useCallback(() => {
    nativeDisableSecureScreen();
    refresh();
  }, [refresh]);

  const exitPrivacyMode = useCallback(() => {
    if (recordingRef.current) {
      return;
    }
    setPrivacy(false, 'manual');
  }, [setPrivacy]);

  useEffect(() => {
    mounted.current = true;

    if (NativeDeviceShield == null) {
      console.warn(
        '[DeviceShield] Native module missing — rebuild the app (yarn example android / ios).'
      );
      setIsLoading(false);
      return;
    }

    try {
      setNativePrivacyOverlayEnabled(nativePrivacyOverlay);
    } catch {
      // ignore
    }

    if (preventScreenCapture) {
      try {
        nativeEnableSecureScreen();
      } catch {
        // ignore
      }
    } else {
      try {
        nativeDisableSecureScreen();
      } catch {
        // ignore
      }
    }

    if (!lazy) {
      refresh();
    }

    const recordingSub = subscribeScreenRecording((isScreenRecording) => {
      if (!mounted.current) {
        return;
      }

      recordingRef.current = isScreenRecording;

      setStatus((prev) => ({
        ...prev,
        isScreenRecording,
        isPrivacyMode: isScreenRecording || privacyActiveRef.current,
        isCompromised: prev.isJailbroken || prev.isRooted || prev.isEmulator,
      }));

      if (isScreenRecording) {
        if (preventScreenCapture) {
          nativeEnableSecureScreen();
        }
        setPrivacy(true, 'screen_recording');
      } else {
        setPrivacy(false, 'screen_recording');
      }
    });

    const screenshotSub = subscribeScreenshotDetected((_prevented) => {
      if (!mounted.current) {
        return;
      }

      if (preventScreenCapture) {
        nativeEnableSecureScreen();
      }

      setStatus((prev) => ({
        ...prev,
        isPrivacyMode: true,
      }));
      setPrivacy(true, 'screenshot');
    });

    const timer =
      pollIntervalMs > 0
        ? setInterval(() => {
            refresh();
          }, pollIntervalMs)
        : undefined;

    return () => {
      mounted.current = false;
      recordingSub.remove();
      screenshotSub.remove();
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [
    lazy,
    nativePrivacyOverlay,
    pollIntervalMs,
    preventScreenCapture,
    refresh,
    setPrivacy,
  ]);

  return {
    ...status,
    isPrivacyMode: privacyMode || status.isScreenRecording,
    privacyReason:
      privacyReason ?? (status.isScreenRecording ? 'screen_recording' : null),
    isLoading,
    refresh,
    enableSecureScreen,
    disableSecureScreen,
    exitPrivacyMode,
  };
}
