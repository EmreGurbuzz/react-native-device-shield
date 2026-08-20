import type { TurboModule, CodegenTypes } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type ScreenRecordingEvent = {
  isScreenRecording: boolean;
};

export type ScreenshotEvent = {
  prevented: boolean;
};

export interface Spec extends TurboModule {
  isJailbroken(): boolean;
  isRooted(): boolean;
  isEmulator(): boolean;
  isScreenRecording(): boolean;
  isSecureScreenEnabled(): boolean;
  enableSecureScreen(): void;
  disableSecureScreen(): void;
  /** When true, native may draw a black cover (App Switcher / recording). Prefer JS overlay. */
  setNativePrivacyOverlayEnabled(enabled: boolean): void;
  getSecurityStatus(): Object;
  readonly onScreenRecordingChanged: CodegenTypes.EventEmitter<ScreenRecordingEvent>;
  readonly onScreenshotDetected: CodegenTypes.EventEmitter<ScreenshotEvent>;
}

const NativeDeviceShield = TurboModuleRegistry.get<Spec>('DeviceShield');

export function getNativeDeviceShield(): Spec {
  if (NativeDeviceShield == null) {
    throw new Error(
      "Native module 'DeviceShield' not found. Rebuild the app after installing react-native-device-shield (npx react-native run-android / run-ios)."
    );
  }
  return NativeDeviceShield;
}

export default NativeDeviceShield;
