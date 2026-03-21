import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, borderRadius, fontSize, shadows} from '../../theme/colors';
import {IconButton, AnimatedCard, AmountDisplay, EmptyState} from '../../components';
import {api} from '../../services/api';

export default function ExpenseScreen({route}: any) {
  const {eventId} = route.params;
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [cashCollected, setCashCollected] = useState<number>(0);
  const [upiCollected, setUpiCollected] = useState<number>(0);

  const loadExpenses = useCallback(async () => {
    try {
      const [expRes, eventsRes] = await Promise.all([
        api.getExpenses(eventId),
        api.getHelperEvents(),
      ]);
      if (expRes.success) setExpenses(expRes.expenses || []);
      if (eventsRes.success && eventsRes.events) {
        const ev = eventsRes.events.find((e: any) => e.eventId === eventId);
        if (ev) {
          setCashCollected(ev.cashCollected || 0);
          setUpiCollected(ev.upiCollected || 0);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [loadExpenses]),
  );

  const handleSpend = async () => {
    if (!reason.trim()) {
      Alert.alert('Required', 'Enter expense reason');
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      Alert.alert('Required', 'Enter valid amount');
      return;
    }

    setLoading(true);
    try {
      const res = await api.recordExpense(eventId, reason.trim(), amt);
      if (res.success) {
        setReason('');
        setAmount('');
        loadExpenses();
        Alert.alert('Recorded', `Expense of Rs. ${amt.toFixed(2)} recorded`);
      } else {
        Alert.alert('Error', res.message || 'Not permitted');
      }
    } catch {
      Alert.alert('Error', 'Failed to record expense');
    } finally {
      setLoading(false);
    }
  };

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <View style={styles.container}>
      {/* Balance banner */}
      <View style={styles.balanceRow}>
        <View style={styles.balanceBox}>
          <Ionicons name="cash-outline" size={14} color={colors.secondary} />
          <Text style={styles.balanceLabel}>Cash collected</Text>
          <AmountDisplay amount={cashCollected} color={colors.secondary} size="sm" />
        </View>
        <View style={styles.balanceDivider} />
        <View style={styles.balanceBox}>
          <Ionicons name="card-outline" size={14} color={colors.info} />
          <Text style={styles.balanceLabel}>UPI (host's)</Text>
          <AmountDisplay amount={upiCollected} color={colors.info} size="sm" />
        </View>
      </View>

      {/* Form */}
      <View style={styles.formCard}>
        <View style={styles.titleRow}>
          <Ionicons name="receipt-outline" size={20} color={colors.error} />
          <Text style={styles.title}>Record Expense</Text>
        </View>
        <Text style={styles.cashNote}>Only cash money can be spent. UPI payments go directly to the host.</Text>

        <TextInput
          style={styles.input}
          value={reason}
          onChangeText={setReason}
          placeholder="What was the expense for?"
          placeholderTextColor={colors.textMuted}
        />

        <TextInput
          style={[styles.input, styles.amountInput]}
          value={amount}
          onChangeText={t => setAmount(t.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
        />

        <IconButton
          icon="trending-down-outline"
          label="Spend"
          variant="danger"
          onPress={handleSpend}
          loading={loading}
          style={styles.spendBtn}
        />
      </View>

      {/* Total */}
      {expenses.length > 0 && (
        <View style={styles.totalRow}>
          <Ionicons name="trending-down" size={18} color={colors.error} />
          <Text style={styles.totalLabel}>Total Expenses</Text>
          <AmountDisplay amount={total} color={colors.error} style={{marginLeft: 'auto'}} />
        </View>
      )}

      {/* List */}
      <FlatList
        data={expenses}
        renderItem={({item, index}) => (
          <AnimatedCard index={index} style={styles.expenseCard}>
            <View style={{flex: 1}}>
              <Text style={styles.expenseReason}>{item.reason}</Text>
              <Text style={styles.expenseBy}>
                {item.spentBy?.name || ''} | {item.createdAt ? item.createdAt.split('T')[0] : ''}
              </Text>
            </View>
            <AmountDisplay amount={item.amount} color={colors.error} />
          </AnimatedCard>
        )}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No expenses"
            message="No expenses recorded yet"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  balanceRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  balanceBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: 2,
  },
  balanceDivider: {width: 1, backgroundColor: colors.divider, marginVertical: spacing.xs},
  balanceLabel: {fontSize: fontSize.xs, color: colors.textMuted},
  formCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  cashNote: {fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.sm, fontStyle: 'italic'},
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs},
  title: {fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary},
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  amountInput: {marginTop: spacing.sm, fontSize: fontSize.xl, fontWeight: '700', textAlign: 'center'},
  spendBtn: {marginTop: spacing.md},
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.errorLight,
  },
  totalLabel: {fontSize: fontSize.md, fontWeight: '600', color: colors.error},
  list: {paddingHorizontal: spacing.md, paddingBottom: spacing.xxl},
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  expenseReason: {fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary},
  expenseBy: {fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2},
});
