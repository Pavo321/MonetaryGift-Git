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

  const loadExpenses = useCallback(async () => {
    try {
      const res = await api.getExpenses(eventId);
      if (res.success) setExpenses(res.expenses || []);
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
    const amt = parseInt(amount, 10);
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
        Alert.alert('Recorded', `Expense of Rs. ${amt} recorded`);
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
      {/* Form */}
      <View style={styles.formCard}>
        <View style={styles.titleRow}>
          <Ionicons name="receipt-outline" size={20} color={colors.error} />
          <Text style={styles.title}>Record Expense</Text>
        </View>

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
          onChangeText={t => setAmount(t.replace(/[^0-9]/g, ''))}
          placeholder="Amount"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
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
  formCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...shadows.sm,
  },
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md},
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
