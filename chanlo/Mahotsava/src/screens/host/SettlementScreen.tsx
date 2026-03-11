import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, borderRadius, fontSize, shadows, gradients} from '../../theme/colors';
import {GradientHeader, AmountDisplay, IconButton} from '../../components';
import {api} from '../../services/api';

export default function SettlementScreen({route, navigation}: any) {
  const {eventId, helperId, helperName, helperPhone, totalCollected, amountToHandBack} =
    route.params;
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [settlements, setSettlements] = useState<any[]>([]);

  const loadSettlements = useCallback(async () => {
    try {
      const res = await api.getSettlements(eventId);
      if (res.success) {
        const filtered = (res.settlements || []).filter(
          (s: any) => s.helper?.id === helperId,
        );
        setSettlements(filtered);
      }
    } catch (e) {
      console.error(e);
    }
  }, [eventId, helperId]);

  useFocusEffect(
    useCallback(() => {
      loadSettlements();
    }, [loadSettlements]),
  );

  const handleSettle = async () => {
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) {
      Alert.alert('Invalid', 'Enter a valid amount');
      return;
    }
    if (amt > (amountToHandBack || 0)) {
      Alert.alert(
        'Warning',
        `Amount exceeds pending (Rs. ${amountToHandBack}). Proceed?`,
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Yes', onPress: () => doSettle(amt)},
        ],
      );
      return;
    }
    doSettle(amt);
  };

  const doSettle = async (amt: number) => {
    setLoading(true);
    try {
      const res = await api.settleWithHelper(
        eventId,
        helperId,
        amt,
        note.trim() || undefined,
      );
      if (res.success) {
        Alert.alert('Done', `Rs. ${amt} settled with ${helperName}`, [
          {text: 'OK', onPress: () => navigation.goBack()},
        ]);
      } else {
        Alert.alert('Error', res.message);
      }
    } catch {
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <GradientHeader title="Settlement" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Helper info */}
        <LinearGradient
          colors={[...gradients.helperHeader]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.infoCard}>
          <View style={styles.infoAvatar}>
            <Text style={styles.infoAvatarText}>
              {helperName ? helperName.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
          <Text style={styles.helperName}>{helperName}</Text>
          <Text style={styles.helperPhone}>{helperPhone}</Text>
        </LinearGradient>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryLabelRow}>
              <Ionicons name="wallet-outline" size={16} color={colors.secondary} />
              <Text style={styles.summaryLabel}>Cash Collected</Text>
            </View>
            <AmountDisplay amount={totalCollected || 0} color={colors.secondary} />
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <View style={styles.summaryLabelRow}>
              <Ionicons name="checkmark-done-outline" size={16} color={colors.success} />
              <Text style={styles.summaryLabel}>Already Settled</Text>
            </View>
            <AmountDisplay amount={(totalCollected || 0) - (amountToHandBack || 0)} color={colors.success} />
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <View style={styles.summaryLabelRow}>
              <Ionicons name="alert-circle-outline" size={16} color={(amountToHandBack || 0) > 0 ? colors.error : colors.success} />
              <Text style={[styles.summaryLabel, {fontWeight: '700'}]}>Pending</Text>
            </View>
            <AmountDisplay
              amount={amountToHandBack || 0}
              color={(amountToHandBack || 0) > 0 ? colors.error : colors.success}
              size="lg"
            />
          </View>
        </View>

        {/* Settlement form */}
        <View style={styles.formCard}>
          <View style={styles.formTitleRow}>
            <Ionicons name="cash-outline" size={20} color={colors.accent} />
            <Text style={styles.formTitle}>New Settlement</Text>
          </View>

          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={t => setAmount(t.replace(/[^0-9]/g, ''))}
            placeholder="Enter amount received"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            style={styles.input}
            value={note}
            onChangeText={setNote}
            placeholder="e.g., Cash received at venue"
            placeholderTextColor={colors.textMuted}
          />

          <IconButton
            icon="checkmark-done-outline"
            label="Mark Settled"
            variant="accent"
            onPress={handleSettle}
            loading={loading}
            style={styles.settleBtn}
          />
        </View>

        {/* History */}
        {settlements.length > 0 && (
          <View style={styles.historyCard}>
            <View style={styles.formTitleRow}>
              <Ionicons name="time-outline" size={20} color={colors.info} />
              <Text style={styles.formTitle}>Settlement History</Text>
            </View>
            {settlements.map((s: any, i: number) => (
              <View key={i} style={styles.historyItem}>
                <View>
                  <AmountDisplay amount={s.amount} color={colors.success} />
                  {s.note && <Text style={styles.historyNote}>{s.note}</Text>}
                </View>
                <Text style={styles.historyDate}>
                  {s.settledAt ? s.settledAt.split('T')[0] : ''}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.md, paddingBottom: spacing.xxl},
  infoCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  infoAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  infoAvatarText: {fontSize: fontSize.xl, fontWeight: '800', color: colors.textLight},
  helperName: {fontSize: fontSize.xl, fontWeight: '800', color: colors.textLight},
  helperPhone: {fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: 4},
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    ...shadows.md,
  },
  summaryRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm},
  summaryLabelRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  summaryLabel: {fontSize: fontSize.md, color: colors.textSecondary},
  divider: {height: 1, backgroundColor: colors.divider},
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    ...shadows.md,
  },
  formTitleRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm},
  formTitle: {fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary},
  label: {fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xs, marginTop: spacing.md},
  input: {borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md - 2, fontSize: fontSize.md, color: colors.textPrimary},
  settleBtn: {marginTop: spacing.lg},
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    ...shadows.md,
  },
  historyItem: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider},
  historyNote: {fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2},
  historyDate: {fontSize: fontSize.sm, color: colors.textMuted},
});
