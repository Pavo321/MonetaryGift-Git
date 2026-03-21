import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, borderRadius, fontSize, shadows} from '../../theme/colors';
import {GradientHeader, AnimatedCard, AmountDisplay, EmptyState, IconButton} from '../../components';
import {api} from '../../services/api';

export default function HelpersScreen({route, navigation}: any) {
  const {eventId} = route.params;
  const [helpers, setHelpers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addPhone, setAddPhone] = useState('');
  const [addName, setAddName] = useState('');
  const [addCanExpense, setAddCanExpense] = useState(false);
  const [adding, setAdding] = useState(false);

  const loadHelpers = useCallback(async () => {
    try {
      const res = await api.getHelpers(eventId);
      if (res.success) setHelpers(res.helpers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      loadHelpers();
    }, [loadHelpers]),
  );

  const handleAdd = async () => {
    if (!addName.trim()) {
      Alert.alert('Invalid', 'Enter helper name');
      return;
    }
    if (addPhone.length !== 10) {
      Alert.alert('Invalid', 'Enter a valid 10-digit number');
      return;
    }
    setAdding(true);
    try {
      const res = await api.addHelper(eventId, addPhone, addCanExpense, addName.trim());
      if (res.success) {
        setShowAdd(false);
        setAddPhone('');
        setAddName('');
        setAddCanExpense(false);
        loadHelpers();
      } else {
        Alert.alert('Error', res.message);
      }
    } catch {
      Alert.alert('Error', 'Failed to add helper');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = (helper: any) => {
    const pending = helper.amountToHandBack || 0;
    const msg =
      pending > 0
        ? `${helper.name} has Rs. ${pending} pending. Are you sure?`
        : `Remove ${helper.name} as helper?`;
    Alert.alert('Remove Helper', msg, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.removeHelper(eventId, helper.userId);
            loadHelpers();
          } catch {
            Alert.alert('Error', 'Failed to remove');
          }
        },
      },
    ]);
  };

  const renderHelper = ({item, index}: any) => (
    <AnimatedCard index={index} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {item.name ? item.name.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
        <View style={{flex: 1, marginLeft: spacing.md}}>
          <Text style={styles.helperName}>{item.name}</Text>
          <Text style={styles.helperPhone}>{item.phoneNumber}</Text>
        </View>
        <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(item)}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Ionicons name="cash-outline" size={13} color={colors.secondary} />
          <AmountDisplay amount={item.cashCollected || 0} color={colors.secondary} size="sm" />
          <Text style={styles.statLabel}>Cash</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="card-outline" size={13} color={colors.info} />
          <AmountDisplay amount={item.upiCollected || 0} color={colors.info} size="sm" />
          <Text style={styles.statLabel}>UPI</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="arrow-undo-outline" size={13} color={(item.amountToHandBack || 0) > 0 ? colors.error : colors.textMuted} />
          <AmountDisplay
            amount={item.amountToHandBack || 0}
            color={(item.amountToHandBack || 0) > 0 ? colors.error : colors.textPrimary}
            size="sm"
          />
          <Text style={styles.statLabel}>To Hand Back</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.permBadge}>
          <Ionicons
            name={item.canExpense ? 'checkmark-circle' : 'close-circle'}
            size={14}
            color={item.canExpense ? colors.success : colors.textMuted}
          />
          <Text style={[styles.permText, {color: item.canExpense ? colors.success : colors.textMuted}]}>
            {item.canExpense ? 'Can expense' : 'No expense'}
          </Text>
        </View>
        <IconButton
          icon="wallet-outline"
          label="Settle"
          variant="accent"
          size="sm"
          onPress={() =>
            navigation.navigate('Settlement', {
              eventId,
              helperId: item.userId,
              helperName: item.name,
              helperPhone: item.phoneNumber,
              totalCollected: item.totalCollected,
              amountToHandBack: item.amountToHandBack,
            })
          }
        />
      </View>
    </AnimatedCard>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GradientHeader title="Manage Helpers" onBack={() => navigation.goBack()} />

      <View style={styles.addBtnWrap}>
        <IconButton
          icon="person-add-outline"
          label="Add Helper"
          variant="secondary"
          onPress={() => setShowAdd(true)}
        />
      </View>

      <FlatList
        data={helpers}
        renderItem={renderHelper}
        keyExtractor={item => String(item.userId)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No helpers added"
            message="Add helpers to assist with collecting money at your event"
          />
        }
      />

      {/* Add Helper Modal */}
      <Modal visible={showAdd} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Ionicons name="person-add-outline" size={24} color={colors.secondary} />
              <Text style={styles.modalTitle}>Add Helper</Text>
            </View>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={addName}
              onChangeText={setAddName}
              placeholder="Helper's name"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={addPhone}
              onChangeText={t => setAddPhone(t.replace(/[^0-9]/g, '').slice(0, 10))}
              placeholder="10-digit number"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              maxLength={10}
            />

            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setAddCanExpense(!addCanExpense)}>
              <View style={[styles.checkbox, addCanExpense && styles.checkboxChecked]}>
                {addCanExpense && <Ionicons name="checkmark" size={14} color={colors.textLight} />}
              </View>
              <Text style={styles.checkLabel}>Allow recording expenses</Text>
            </TouchableOpacity>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAdd(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, adding && {opacity: 0.7}]}
                onPress={handleAdd}
                disabled={adding}>
                {adding ? (
                  <ActivityIndicator color={colors.textLight} size="small" />
                ) : (
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                    <Ionicons name="person-add" size={16} color={colors.textLight} />
                    <Text style={styles.modalConfirmText}>Add</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background},
  addBtnWrap: {padding: spacing.md},
  list: {paddingHorizontal: spacing.md, paddingBottom: spacing.xxl},
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center'},
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {fontSize: fontSize.lg, fontWeight: '800', color: colors.textLight},
  helperName: {fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary},
  helperPhone: {fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2},
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {flexDirection: 'row', marginTop: spacing.md, gap: spacing.sm},
  statBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    alignItems: 'center',
  },
  statLabel: {fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2},
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  permBadge: {flexDirection: 'row', alignItems: 'center', gap: 4},
  permText: {fontSize: fontSize.xs, fontWeight: '600'},
  // Modal
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg},
  modal: {backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, ...shadows.lg},
  modalHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md},
  modalTitle: {fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary},
  label: {fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xs, marginTop: spacing.sm},
  input: {borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md - 2, fontSize: fontSize.md, color: colors.textPrimary},
  checkRow: {flexDirection: 'row', alignItems: 'center', marginTop: spacing.md},
  checkbox: {width: 22, height: 22, borderWidth: 2, borderColor: colors.border, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm},
  checkboxChecked: {backgroundColor: colors.secondary, borderColor: colors.secondary},
  checkLabel: {fontSize: fontSize.sm, color: colors.textPrimary},
  modalBtns: {flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg},
  modalCancel: {paddingHorizontal: spacing.lg, paddingVertical: spacing.sm},
  modalCancelText: {fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '600'},
  modalConfirm: {backgroundColor: colors.secondary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.md},
  modalConfirmText: {color: colors.textLight, fontSize: fontSize.md, fontWeight: '700'},
});
