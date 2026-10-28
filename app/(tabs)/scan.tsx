import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppButton from '@/components/AppButton';
import { AccessDenied, AttendanceBadge } from '@/components/ui';
import { COLORS, RADIUS } from '@/constants/colors';
import { recordAttendance } from '@/lib/attendance';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import type { ScanCode, ScanResult } from '@/lib/types';

type IconName = keyof typeof Ionicons.glyphMap;

// How each server answer is presented to the student.
const OUTCOME: Record<ScanCode, { icon: IconName; color: string; tint: string; title: string }> = {
  recorded: { icon: 'checkmark-circle', color: COLORS.success, tint: COLORS.successTint, title: "You're checked in" },
  duplicate: { icon: 'copy', color: COLORS.warning, tint: COLORS.warningTint, title: 'Already checked in' },
  closed: { icon: 'lock-closed', color: COLORS.textSecondary, tint: COLORS.neutralTint, title: 'Event closed' },
  not_started: { icon: 'hourglass', color: COLORS.warning, tint: COLORS.warningTint, title: 'Too early to check in' },
  invalid_qr: { icon: 'close-circle', color: COLORS.danger, tint: COLORS.dangerTint, title: 'Invalid QR code' },
  unauthorized: { icon: 'ban', color: COLORS.danger, tint: COLORS.dangerTint, title: 'Not allowed' },
  error: { icon: 'cloud-offline', color: COLORS.danger, tint: COLORS.dangerTint, title: 'Connection problem' },
};

export default function ScanScreen() {
  const { role } = useAuth();
  if (role !== 'student') return <AccessDenied message="Only student accounts scan attendance QR codes." />;
  return <Scanner />;
}

function Scanner() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<'scanning' | 'checking' | 'done'>('scanning');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [torch, setTorch] = useState(false);
  const lock = useRef(false); // the scanner fires many times per second; only handle the first

  const reset = useCallback(() => {
    lock.current = false;
    setResult(null);
    setPhase('scanning');
  }, []);

  // Fresh scanner each time the tab is opened; camera is released when leaving.
  useFocusEffect(useCallback(() => { reset(); return () => setTorch(false); }, [reset]));

  // Event: QR detected -> validate on the server -> show confirmation / error.
  const handleScanned = async ({ data }: { data: string }) => {
    if (lock.current) return;
    lock.current = true;
    setPhase('checking');
    try {
      setResult(await recordAttendance(data));
    } catch {
      setResult({ ok: false, code: 'error', message: 'Something went wrong. Please try again.' });
    }
    setPhase('done');
  };

  if (!permission) return <View style={styles.dark} />;

  if (!permission.granted) {
    return (
      <View style={[styles.dark, styles.center, { padding: 28 }]}>
        <View style={styles.permIcon}><Ionicons name="camera-outline" size={34} color="#fff" /></View>
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permText}>Allow the camera so you can scan the event QR code. Nothing is recorded or stored from the camera.</Text>
        <AppButton
          title={permission.canAskAgain ? 'Allow camera' : 'Open settings'}
          icon="camera"
          onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
        />
      </View>
    );
  }

  const outcome = result ? OUTCOME[result.code] : null;

  return (
    <View style={styles.dark}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={phase === 'scanning' ? handleScanned : undefined}
      />

      <View style={styles.scrim} pointerEvents="none" />

      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.topTitle}>Scan event QR</Text>
        <Text style={styles.topSub}>
          {phase === 'checking' ? 'Checking...' : 'Hold steady inside the frame'}
        </Text>
      </View>

      <View style={styles.frameWrap} pointerEvents="none">
        <View style={styles.frame}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
        </View>
      </View>

      {phase === 'scanning' && (
        <Pressable style={styles.torch} onPress={() => setTorch((t) => !t)} accessibilityLabel="Toggle flashlight">
          <Ionicons name={torch ? 'flash' : 'flash-outline'} size={22} color="#fff" />
        </Pressable>
      )}

      {phase !== 'scanning' && (
        <View style={styles.sheet}>
          {phase === 'checking' || !result || !outcome ? (
            <View style={styles.sheetCenter}>
              <Text style={styles.sheetTitle}>Checking your code...</Text>
            </View>
          ) : (
            <>
              <View style={[styles.resultIcon, { backgroundColor: outcome.tint }]}>
                <Ionicons name={outcome.icon} size={36} color={outcome.color} />
              </View>
              <Text style={[styles.sheetTitle, { color: outcome.color }]}>{outcome.title}</Text>
              {result.eventTitle ? <Text style={styles.eventTitle}>{result.eventTitle}</Text> : null}
              <Text style={styles.message}>{result.message}</Text>
              {result.code === 'recorded' || result.code === 'duplicate' ? (
                <View style={styles.detailRow}>
                  {result.status ? <AttendanceBadge status={result.status} /> : null}
                  {result.scannedAt ? <Text style={styles.detailTime}>{formatDateTime(result.scannedAt)}</Text> : null}
                </View>
              ) : null}
              <View style={{ alignSelf: 'stretch', marginTop: 18 }}>
                <AppButton title={result.ok ? 'Done' : 'Scan again'} icon={result.ok ? 'checkmark' : 'scan'} onPress={reset} />
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const FRAME = 250;
const CORNER = 36;
const styles = StyleSheet.create({
  dark: { flex: 1, backgroundColor: COLORS.ink },
  center: { alignItems: 'center', justifyContent: 'center' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(14,34,56,0.35)' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 24 },
  topTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  topSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  frameWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: { width: FRAME, height: FRAME },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#fff' },
  tl: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 18 },
  tr: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 18 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 18 },
  br: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 18 },
  torch: { position: 'absolute', bottom: 36, alignSelf: 'center', width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  permIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.inkSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  permTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  permText: { fontSize: 15, color: COLORS.onInkMuted, textAlign: 'center', lineHeight: 22, marginVertical: 12, marginBottom: 24 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: COLORS.card, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: 24, paddingBottom: 28, alignItems: 'center' },
  sheetCenter: { paddingVertical: 20 },
  resultIcon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  eventTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginTop: 8, textAlign: 'center' },
  message: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  detailTime: { fontSize: 13, color: COLORS.textSecondary },
});
