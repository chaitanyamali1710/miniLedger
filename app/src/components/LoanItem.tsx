import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Loan } from '../api';
import { money, niceDate } from '../format';
import { colors } from '../theme';

type Props = {
  loan: Loan;
  onMarkRepaid: (loan: Loan) => void;
  onShowReceipt: (loan: Loan) => void;
};

export function LoanItem({ loan, onMarkRepaid, onShowReceipt }: Props) {
  const status = loan.repaid ? 'Repaid' : loan.isOverdue ? 'Overdue' : 'Due';
  return (
    <View style={[styles.item, loan.isOverdue && styles.overdue, loan.repaid && styles.repaid]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{loan.friendName}</Text>
        <Text style={[styles.sub, loan.isOverdue && { color: colors.red, fontWeight: '600' }]}>
          {status} {loan.repaid ? '' : `· ${niceDate(loan.dueDate)}`}
        </Text>
        {loan.hasReceipt ? (
          <Pressable onPress={() => onShowReceipt(loan)} hitSlop={8}>
            <Text style={styles.link}>View receipt</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.amount, loan.repaid && { color: colors.muted, textDecorationLine: 'line-through' }]}>
          {money(loan.amount)}
        </Text>
        {!loan.repaid ? (
          <Pressable onPress={() => onMarkRepaid(loan)} style={styles.repaidButton} hitSlop={6}>
            <Text style={styles.repaidText}>Mark repaid</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  overdue: { backgroundColor: colors.redBg, borderLeftColor: colors.red },
  repaid: { borderLeftColor: colors.green, opacity: 0.75 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  link: { fontSize: 13, color: colors.primary, marginTop: 6 },
  amount: { fontSize: 17, fontWeight: '700', color: colors.text },
  repaidButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  repaidText: { color: colors.green, fontSize: 13, fontWeight: '600' },
});
