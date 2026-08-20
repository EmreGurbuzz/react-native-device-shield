# react-native-device-shield

Screen security and device integrity for React Native — jailbreak/root detection, emulator detection, screen-recording monitoring, and screenshot blocking via `useDeviceSecurity()`.

Built for fintech, e-commerce, and healthcare apps that need layered client-side defenses (HIPAA / KVKK oriented workflows).

## Features

- **Jailbreak / root detection** — heuristic checks on iOS and Android
- **Emulator / simulator detection** — including common device-farm images
- **Screen recording detection** — live events when capture starts or stops
- **Screenshot protection** — Android `FLAG_SECURE`; iOS secure-layer blanking
- **Privacy mode** — react when recording or a screenshot attempt is detected
- **TurboModule** — New Architecture ready

## Installation

```sh
npm install react-native-device-shield
# or
yarn add react-native-device-shield
```

iOS:

```sh
cd ios && pod install
```

> Requires the New Architecture (TurboModule). React Native **0.76+** is recommended.

## Quick start

```tsx
import { useDeviceSecurity } from 'react-native-device-shield';

export function SecureScreen() {
  const { isCompromised, isScreenRecording, isSecureScreenEnabled } =
    useDeviceSecurity({
      preventScreenCapture: true, // Android FLAG_SECURE → captures blanked
      onPrivacyModeChange: ({ active, reason }) => {
        // Capture detected — swap sensitive UI if you want
      },
    });

  // Sensitive content is blanked by the OS when capture is blocked.
  return null;
}
```

Optionally wrap screens with `<PrivacyShield />` and `renderOverlay` to show a custom warning UI to the user. Screenshots and recordings still stay black when secure mode is on.

### iOS screenshot note

iOS does not offer a public API as strong as Android `FLAG_SECURE`. This library blanks content via a secure `UITextField` container. **It often does not work in the Simulator** — test on a real device.

## API

### `useDeviceSecurity(options?)`

| Field | Type | Description |
|-------|------|-------------|
| `isJailbroken` | `boolean` | iOS jailbreak signals |
| `isRooted` | `boolean` | Android root signals (mirrors jailbreak on iOS) |
| `isEmulator` | `boolean` | Emulator / Simulator / common device-farm images |
| `isScreenRecording` | `boolean` | Screen recording / capture active |
| `isSecureScreenEnabled` | `boolean` | Native screenshot blocking is on |
| `isPrivacyMode` | `boolean` | Privacy mode after recording or screenshot |
| `isCompromised` | `boolean` | `isJailbroken \|\| isRooted \|\| isEmulator` |
| `platform` | `'ios' \| 'android' \| 'unknown'` | Current platform |
| `isLoading` | `boolean` | Initial native read in progress |
| `privacyReason` | `PrivacyModeReason \| null` | Why privacy mode is active |
| `refresh()` | `() => void` | Re-run checks immediately |
| `enableSecureScreen()` | `() => void` | Enable screenshot / recording blocking |
| `disableSecureScreen()` | `() => void` | Disable blocking |
| `exitPrivacyMode()` | `() => void` | Leave privacy mode (ignored while recording) |

**Options**

| Option | Default | Description |
|--------|---------|-------------|
| `preventScreenCapture` | `true` | Android `FLAG_SECURE`, iOS secure layer |
| `nativePrivacyOverlay` | `false` | Native black cover; keep off for custom UI. **iOS only** — Android already blanks via `FLAG_SECURE`, so this flag is a no-op there |
| `onPrivacyModeChange` | — | Callback when privacy mode toggles |
| `pollIntervalMs` | `3000` | How often to re-check static signals |
| `lazy` | `false` | Defer first read until `refresh()` |

Note: `preventScreenCapture` is read on every render — flipping it from `true` to `false` at runtime calls `disableSecureScreen()` for you, same as flipping it back on calls `enableSecureScreen()`.

### `<PrivacyShield />` (optional)

Shows a custom overlay to the person using the device when capture is detected. Captured output remains blanked by `FLAG_SECURE` / the iOS secure layer.

```tsx
import { PrivacyShield } from 'react-native-device-shield';

<PrivacyShield
  preventScreenCapture
  renderOverlay={({ reason, exitPrivacyMode }) => (
    <MySafeScreen reason={reason} onContinue={exitPrivacyMode} />
  )}
>
  <SensitiveScreen />
</PrivacyShield>
```

`<PrivacyShield />` doesn't do the blocking itself — it just calls `useDeviceSecurity()` internally and adds an overlay slot on top. `useDeviceSecurity()` alone (no wrapper needed) already enables `FLAG_SECURE` / the iOS secure layer by default; wrap with `<PrivacyShield>` only when you want a custom warning UI or the `usePrivacyShield()` context below.

Use `usePrivacyShield()` inside children to read the same security state from context (throws if called outside a `<PrivacyShield>`).

Pass `hideContentInPrivacyMode` to unmount `children` while privacy mode is active, instead of just layering the overlay on top:

```tsx
<PrivacyShield hideContentInPrivacyMode renderOverlay={() => <BlockedScreen />}>
  <SensitiveScreen />
</PrivacyShield>
```

### Imperative helpers

```ts
import {
  enableSecureScreen,
  getSecurityStatus,
  isEmulator,
  isJailbroken,
  isRooted,
  isScreenRecording,
} from 'react-native-device-shield';

enableSecureScreen();
const status = getSecurityStatus();
```

Also available: `disableSecureScreen`, `isSecureScreenEnabled`, `setNativePrivacyOverlayEnabled`, `subscribeScreenRecording`, `subscribeScreenshotDetected`, `isNativeModuleAvailable()` (check before calling native APIs directly, e.g. to detect Expo Go).

## Platform notes

- **Android:** `FLAG_SECURE` blanks screenshots and recordings; API 34+ uses `ScreenCaptureCallback` to detect attempts. Below API 34, capture is still blocked but no `onScreenshotDetected` event fires. `isScreenRecording` is a heuristic (looks for secondary displays named like "screen"/"record"/"capture"/"cast"/"mirror") — it can false-positive on things like Chromecast and miss recorders that don't match those names
- **iOS:** `UIScreen.isCaptured`, screenshot notifications, and a secure text-field layer. Apple gives no public API to block the screenshot action itself — `onScreenshotDetected` fires *after* the OS already took it, and `prevented` just means the captured frame was blanked by the secure layer. The secure layer relies on an undocumented `UITextField` internal-view trick, so treat it as best-effort, not guaranteed across iOS versions
- No single signal is 100% reliable — design defense in depth

## Example app

```sh
yarn
yarn example ios
# or
yarn example android
```

## License

MIT
