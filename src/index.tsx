import {
  disableSecureScreen,
  enableSecureScreen,
  getSecurityStatus,
  isEmulator,
  isJailbroken,
  isNativeModuleAvailable,
  isRooted,
  isScreenRecording,
  isSecureScreenEnabled,
  setNativePrivacyOverlayEnabled,
  subscribeScreenRecording,
  subscribeScreenshotDetected,
} from './deviceSecurity';
import { useDeviceSecurity } from './useDeviceSecurity';
import {
  PrivacyShield as PrivacyShieldComponent,
  usePrivacyShield as usePrivacyShieldHook,
} from './PrivacyShield';

export type {
  DeviceSecurityStatus,
  PrivacyModeEvent,
  PrivacyModeReason,
  PrivacyOverlayRenderProps,
  UseDeviceSecurityOptions,
  UseDeviceSecurityResult,
} from './types';

export type { PrivacyShieldProps } from './PrivacyShield';

export {
  disableSecureScreen,
  enableSecureScreen,
  getSecurityStatus,
  isEmulator,
  isJailbroken,
  isNativeModuleAvailable,
  isRooted,
  isScreenRecording,
  isSecureScreenEnabled,
  setNativePrivacyOverlayEnabled,
  subscribeScreenRecording,
  subscribeScreenshotDetected,
  useDeviceSecurity,
};

// Assign after imports so Metro/Hermes named exports stay defined.
export const PrivacyShield = PrivacyShieldComponent;
export const usePrivacyShield = usePrivacyShieldHook;
