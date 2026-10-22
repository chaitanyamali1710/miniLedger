import { StyleSheet, Text, View } from 'react-native';
import type { Summary } from '../api';
import { money } from '../format';
import { colors } from '../theme';

export function SummaryCard({ summary }: { summary: Summary | null }) {
  const s = summary ?? { totalLent: 0, totalRepaid: 0, outstanding: 0, overdueAmount: 0, overdueCount: 0 };
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Still to get back</Text>
      <Text style={styles.big}>{money(s.outstanding)}</Text>
      <View style={styles.row}>
        <Stat label="Total lent" value={money(s.totalLent)} />
        <Stat label="Repaid" value={money(s.totalRepaid)} color={colors.green} />
        <Stat
          label={s.overdueCount === 1 ? 'Overdue (1)' : `Overdue (${s.overdueCount})`}
          value={money(s.overdueAmount)}
          color={s.overdueAmount > 0 ? colors.red : undefined}
        />
      </View>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  label: { fontSize: 13, color: colors.muted },
  big: { fontSize: 32, fontWeight: '700', color: colors.text, marginTop: 2, marginBottom: 14 },
  row: { flexDirection: 'row', gap: 8 },
  value: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 2 },
});
