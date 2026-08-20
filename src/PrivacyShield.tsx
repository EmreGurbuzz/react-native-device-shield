import { createContext, useContext, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDeviceSecurity } from './useDeviceSecurity';
import type {
  PrivacyOverlayRenderProps,
  UseDeviceSecurityOptions,
  UseDeviceSecurityResult,
} from './types';

const DeviceSecurityContext = createContext<UseDeviceSecurityResult | null>(
  null
);

/**
 * Read security state from the nearest `<PrivacyShield />`.
 */
export function usePrivacyShield(): UseDeviceSecurityResult {
  const value = useContext(DeviceSecurityContext);
  if (value == null) {
    throw new Error('usePrivacyShield() must be used inside <PrivacyShield />');
  }
  return value;
}

export type PrivacyShieldProps = UseDeviceSecurityOptions & {
  children: ReactNode;
  /**
   * Custom privacy UI. Receives security status + exitPrivacyMode.
   * Rendered as an absolute overlay on top of `children` when privacy mode is on.
   */
  renderOverlay?: (props: PrivacyOverlayRenderProps) => ReactNode;
  /**
   * Hide `children` while privacy mode is active (useful if overlay fully replaces UI).
   * @default false
   */
  hideContentInPrivacyMode?: boolean;
};

/**
 * Wraps your screen and lets you draw a custom overlay when capture is detected.
 *
 * @example
 * ```tsx
 * <PrivacyShield
 *   preventScreenCapture
 *   nativePrivacyOverlay={false}
 *   renderOverlay={({ reason, exitPrivacyMode, isEmulator }) => (
 *     <MySafeScreen reason={reason} onContinue={exitPrivacyMode} />
 *   )}
 * >
 *   <SensitiveScreen />
 * </PrivacyShield>
 * ```
 */
export function PrivacyShield({
  children,
  renderOverlay,
  hideContentInPrivacyMode = false,
  ...options
}: PrivacyShieldProps) {
  const security = useDeviceSecurity(options);
  const { isPrivacyMode, privacyReason } = security;

  const showChildren = !(isPrivacyMode && hideContentInPrivacyMode);
  const overlay =
    isPrivacyMode && renderOverlay != null
      ? renderOverlay({
          ...security,
          reason: privacyReason,
        })
      : null;

  return (
    <DeviceSecurityContext.Provider value={security}>
      <View style={styles.root}>
        {showChildren ? children : null}
        {overlay != null ? (
          <View
            pointerEvents="box-none"
            style={[StyleSheet.absoluteFill, styles.overlayHost]}
          >
            {overlay}
          </View>
        ) : null}
      </View>
    </DeviceSecurityContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlayHost: {
    zIndex: 999,
    elevation: 999,
  },
});
