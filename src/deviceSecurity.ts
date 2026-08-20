import { Platform } from 'react-native';
import NativeDeviceShield, {
  getNativeDeviceShield,
} from './NativeDeviceShield';
import type { DeviceSecurityStatus } from './types';

const normalizeStatus = (
  raw: Object,
  privacyMode = false
): DeviceSecurityStatus => {
  const value = raw as Partial<DeviceSecurityStatus>;
  const jailbroken = Boolean(value.isJailbroken);
  const rooted = Boolean(value.isRooted);
  const emulator = Boolean(value.isEmulator);
  const recording = Boolean(value.isScreenRecording);
  const secure = Boolean(value.isSecureScreenEnabled);

  return {
    isJailbroken: jailbroken,
    isRooted: rooted,
    isEmulator: emulator,
    isScreenRecording: recording,
    isSecureScreenEnabled: secure,
    isPrivacyMode: privacyMode || recording,
    isCompromised: Boolean(
      value.isCompromised ?? (jailbroken || rooted || emulator)
    ),
    platform:
      value.platform === 'ios' || value.platform === 'android'
        ? value.platform
        : Platform.OS === 'ios'
          ? 'ios'
          : Platform.OS === 'android'
            ? 'android'
            : 'unknown',
  };
};

function native() {
  return getNativeDeviceShield();
}

export function isJailbroken(): boolean {
  return native().isJailbroken();
}

export function isRooted(): boolean {
  return native().isRooted();
}

export function isEmulator(): boolean {
  return native().isEmulator();
}

export function isScreenRecording(): boolean {
  return native().isScreenRecording();
}

export function isSecureScreenEnabled(): boolean {
  return native().isSecureScreenEnabled();
}

export function enableSecureScreen(): void {
  native().enableSecureScreen();
}

export function disableSecureScreen(): void {
  native().disableSecureScreen();
}

export function setNativePrivacyOverlayEnabled(enabled: boolean): void {
  native().setNativePrivacyOverlayEnabled(enabled);
}

export function getSecurityStatus(privacyMode = false): DeviceSecurityStatus {
  return normalizeStatus(native().getSecurityStatus(), privacyMode);
}

export function subscribeScreenRecording(
  listener: (isScreenRecording: boolean) => void
): { remove: () => void } {
  const module = native();
  return module.onScreenRecordingChanged((event) => {
    listener(Boolean(event?.isScreenRecording));
  });
}

export function subscribeScreenshotDetected(
  listener: (prevented: boolean) => void
): { remove: () => void } {
  const module = native();
  return module.onScreenshotDetected((event) => {
    listener(Boolean(event?.prevented));
  });
}

export function isNativeModuleAvailable(): boolean {
  return NativeDeviceShield != null;
}
