import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useDeviceSecurity } from '../../src/useDeviceSecurity';

function StatusRow({
  label,
  value,
  /** When true, YES is danger (red). When false, YES is safe (green). */
  dangerWhenTrue = true,
}: {
  label: string;
  value: boolean;
  dangerWhenTrue?: boolean;
}) {
  const isDanger = dangerWhenTrue ? value : !value;

  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View
        style={[styles.badge, isDanger ? styles.badgeDanger : styles.badgeOk]}
      >
        <Text style={styles.badgeText}>{value ? 'YES' : 'NO'}</Text>
      </View>
    </View>
  );
}

export default function App() {
  const {
    isJailbroken,
    isRooted,
    isEmulator,
    isScreenRecording,
    isSecureScreenEnabled,
    isPrivacyMode,
    isCompromised,
    platform,
    refresh,
  } = useDeviceSecurity({
    preventScreenCapture: true,
    pollIntervalMs: 2000,
    onPrivacyModeChange: ({ active, reason }) => {
      if (active) {
        console.log('[example] capture detected:', reason);
      }
    },
  });

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <Text style={styles.brand}>Device Shield</Text>
        <Text style={styles.subtitle}>
          Native screenshot / screen-recording protection (FLAG_SECURE)
        </Text>

        <View style={styles.panel}>
          <StatusRow label="isJailbroken" value={isJailbroken} />
          <StatusRow label="isRooted" value={isRooted} />
          <StatusRow label="isEmulator" value={isEmulator} />
          <StatusRow label="isScreenRecording" value={isScreenRecording} />
          <StatusRow
            label="isSecureScreenEnabled"
            value={isSecureScreenEnabled}
            dangerWhenTrue={false}
          />
          <StatusRow label="isPrivacyMode" value={isPrivacyMode} />
          <StatusRow label="isCompromised" value={isCompromised} />
          <Text style={styles.metaText}>platform: {platform}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={refresh}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>Refresh</Text>
        </Pressable>

        <Text style={styles.hint}>
          Red YES = risk. Green YES on isSecureScreenEnabled means captures are
          blanked by the OS. Screenshots and recordings stay black — no custom
          overlay needed.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#E8F1F0',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 48,
    gap: 20,
  },
  brand: {
    fontSize: 34,
    fontWeight: '700',
    color: '#0F3D3E',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    color: '#3D5C5C',
  },
  panel: {
    backgroundColor: '#F7FBFA',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#C5D9D7',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#163A3B',
  },
  badge: {
    minWidth: 52,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  badgeOk: {
    backgroundColor: '#D8F3DC',
  },
  badgeDanger: {
    backgroundColor: '#F8D7DA',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#163A3B',
  },
  metaText: {
    marginTop: 8,
    fontSize: 13,
    color: '#3D5C5C',
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#0F3D3E',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#F7FBFA',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    color: '#5A7373',
  },
});
