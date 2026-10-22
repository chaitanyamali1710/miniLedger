import { useCallback, useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError, api, type Loan, type Summary } from '../api';
import { Button } from '../components/Button';
import { ReceiptImage } from '../components/ReceiptImage';
import { confirm, showMessage } from '../dialogs';
import { LoanItem } from '../components/LoanItem';
import { SummaryCard } from '../components/SummaryCard';
import { money } from '../format';
import { colors } from '../theme';

type Props = {
  token: string;
  onAdd: () => void;
  onLogout: () => void;
};

export function HomeScreen({ token, onAdd, onLogout }: Props) {
  const insets = useSafeAreaInsets();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receiptFor, setReceiptFor] = useState<Loan | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, totals] = await Promise.all([api.listLoans(token), api.summary(token)]);
      setLoans(list);
      setSummary(totals);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return onLogout();
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, onLogout]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmRepaid(loan: Loan) {
    const ok = await confirm('Mark as repaid?', `${loan.friendName} paid back ${money(loan.amount)}.`, 'Yes, repaid');
    if (!ok) return;
    try {
      await api.markRepaid(token, loan.id);
      load();
    } catch (e) {
      showMessage('Could not update', (e as Error).message);
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>MiniLedger</Text>
        <Pressable onPress={onLogout} hitSlop={8}>
          <Text style={styles.logout}>Log out</Text>
        </Pressable>
      </View>

      <FlatList
        data={loans}
        keyExtractor={(l) => String(l.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListHeaderComponent={
          <>
            <SummaryCard summary={summary} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </>
        }
        ListEmptyComponent={
          !loading && !error ? <Text style={styles.empty}>No entries yet. Tap "Add entry" to log a loan.</Text> : undefined
        }
        renderItem={({ item }) => <LoanItem loan={item} onMarkRepaid={confirmRepaid} onShowReceipt={setReceiptFor} />}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Button title="+ Add entry" onPress={onAdd} />
      </View>

      <Modal visible={receiptFor !== null} transparent animationType="fade" onRequestClose={() => setReceiptFor(null)}>
        <Pressable style={styles.modalBg} onPress={() => setReceiptFor(null)}>
          {receiptFor ? (
            <ReceiptImage token={token} loanId={receiptFor.id} style={styles.receipt} />
          ) : null}
          <Text style={styles.modalHint}>Tap anywhere to close</Text>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  logout: { color: colors.primary, fontSize: 15 },
  error: { color: colors.red, marginBottom: 12 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 24 },
  footer: { position: 'absolute', left: 16, right: 16, bottom: 0 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  receipt: { width: '90%', height: '75%' },
  modalHint: { color: '#fff', marginTop: 16 },
});
