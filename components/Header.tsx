import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS, RADIUS } from '@/constants/colors';

type Props = { title: string; subtitle?: string };

/** Brand block used on the sign-in / register screens. */
export default function Header({ title, subtitle }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.mark}>
        <Ionicons name="qr-code" size={30} color="#FFFFFF" />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: 12, paddingBottom: 28 },
  mark: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4 },
  subtitle: { fontSize: 14, color: COLORS.onInkMuted, marginTop: 4, textAlign: 'center' },
});
