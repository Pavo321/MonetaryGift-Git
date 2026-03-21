import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
  Alert,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, borderRadius, fontSize, shadows, gradients} from '../../theme/colors';
import {GradientHeader, AnimatedCard, AmountDisplay, EmptyState} from '../../components';
import {api} from '../../services/api';

type Tab = 'payments' | 'helpers' | 'expenses';

const TAB_CONFIG: {key: Tab; icon: string; label: string}[] = [
  {key: 'payments', icon: 'card-outline', label: 'Payments'},
  {key: 'helpers', icon: 'people-outline', label: 'Helpers'},
  {key: 'expenses', icon: 'trending-down-outline', label: 'Expenses'},
];

export default function EventDetailScreen({route, navigation}: any) {
  const {eventId} = route.params;
  const [event, setEvent] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('payments');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [eventRes, expenseRes] = await Promise.all([
        api.getEventDetails(eventId),
        api.getExpenses(eventId),
      ]);
      if (eventRes.success) {
        setEvent(eventRes.event);
        setPayments(eventRes.payments || []);
      }
      if (expenseRes.expenses) {
        setExpenses(expenseRes.expenses);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  if (loading || !event) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderPayment = ({item, index}: any) => {
    const isSuccess = item.status === 'SUCCESS';
    return (
      <AnimatedCard index={index} style={[styles.paymentCard, {borderLeftColor: isSuccess ? colors.success : colors.warning}]}>
        <View style={styles.paymentRow}>
          <View style={{flex: 1}}>
            <Text style={styles.paymentName}>{item.guestName}</Text>
            <Text style={styles.paymentDetail}>
              {item.guestVillage || ''} {item.createdAt ? '| ' + item.createdAt.split('T')[0] : ''}
            </Text>
          </View>
          <View style={{alignItems: 'flex-end'}}>
            <AmountDisplay amount={item.amount} color={colors.textPrimary} />
            <View style={[styles.statusBadge, isSuccess ? styles.statusSuccess : styles.statusPending]}>
              <Ionicons
                name={isSuccess ? 'checkmark-circle' : 'time-outline'}
                size={10}
                color={isSuccess ? colors.success : colors.warning}
              />
              <Text style={[styles.statusText, {color: isSuccess ? colors.success : colors.warning}]}>
                {item.status}
              </Text>
            </View>
          </View>
        </View>
      </AnimatedCard>
    );
  };

  return (
    <View style={styles.container}>
      <GradientHeader
        title={event.eventName}
        subtitle={event.eventDate}
        onBack={() => navigation.goBack()}
        rightIcon="qr-code-outline"
        onRightPress={() => {
          setQrUri(api.getEventQrUrl(eventId));
          setQrVisible(true);
        }}
      />
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() =>
          Alert.alert(
            'Delete Event',
            'This will permanently delete the event and all its data. Make sure all helpers are settled first.',
            [
              {text: 'Cancel', style: 'cancel'},
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  const res = await api.deleteEvent(eventId);
                  if (res.success) {
                    navigation.goBack();
                  } else {
                    Alert.alert('Cannot Delete', res.message || 'Failed to delete event');
                  }
                },
              },
            ],
          )
        }>
        <Ionicons name="trash-outline" size={16} color={colors.error} />
        <Text style={styles.deleteBtnText}>Delete Event</Text>
      </TouchableOpacity>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Ionicons name="cash-outline" size={16} color={colors.secondary} />
          <AmountDisplay amount={event.cashAmount || 0} color={colors.secondary} size="sm" />
          <Text style={styles.statLabel}>Cash</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="card-outline" size={16} color={colors.info} />
          <AmountDisplay amount={event.upiAmount || 0} color={colors.info} size="sm" />
          <Text style={styles.statLabel}>UPI</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="gift-outline" size={16} color={colors.primary} />
          <Text style={styles.statValue}>{event.totalGiftsReceived || 0}</Text>
          <Text style={styles.statLabel}>Gifts</Text>
        </View>
      </View>

      {/* Accept Gift button */}
      <TouchableOpacity
        style={styles.acceptGiftBtn}
        onPress={() => navigation.navigate('HostCollect', {eventId, eventName: event.eventName})}>
        <Ionicons name="gift-outline" size={18} color={colors.textLight} />
        <Text style={styles.acceptGiftText}>Accept Gift</Text>
      </TouchableOpacity>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TAB_CONFIG.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => {
              setActiveTab(tab.key);
              if (tab.key === 'helpers') {
                navigation.navigate('Helpers', {eventId});
              }
            }}>
            <Ionicons
              name={tab.icon}
              size={18}
              color={activeTab === tab.key ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === 'payments' && (
        <FlatList
          data={payments}
          renderItem={renderPayment}
          keyExtractor={item => String(item.hisabId)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <EmptyState icon="card-outline" title="No payments yet" message="Payments will appear here as guests contribute" />
          }
        />
      )}
      {activeTab === 'expenses' && (
        <FlatList
          data={expenses}
          renderItem={({item, index}: any) => (
            <AnimatedCard index={index} style={[styles.paymentCard, {borderLeftColor: colors.error}]}>
              <View style={styles.paymentRow}>
                <View style={{flex: 1}}>
                  <Text style={styles.paymentName}>{item.reason}</Text>
                  <Text style={styles.paymentDetail}>
                    By: {item.spentBy?.name || 'Helper'} {item.createdAt ? '| ' + item.createdAt.split('T')[0] : ''}
                  </Text>
                </View>
                <AmountDisplay amount={item.amount} color={colors.error} />
              </View>
            </AnimatedCard>
          )}
          keyExtractor={(item, index) => String(item.id || index)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[colors.primary]} />
          }
          ListHeaderComponent={
            expenses.length > 0 ? (
              <View style={styles.expenseTotal}>
                <Ionicons name="trending-down" size={18} color={colors.error} />
                <Text style={styles.expenseTotalText}>
                  Total Expenses: {'\u20B9'}{expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0).toLocaleString('en-IN')}
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState icon="receipt-outline" title="No expenses" message="No expenses recorded for this event" />
          }
        />
      )}

      {/* QR Modal */}
      <Modal visible={qrVisible} transparent animationType="fade" onRequestClose={() => setQrVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="qr-code" size={32} color={colors.primary} style={{marginBottom: spacing.sm}} />
            <Text style={styles.modalTitle}>Event QR Code</Text>
            <Text style={styles.modalSubtitle}>Share this QR with guests & helpers</Text>
            {qrUri && (
              <Image
                source={{uri: qrUri, headers: {Authorization: `Bearer ${api.getAuthToken()}`}}}
                style={styles.qrImage}
                resizeMode="contain"
                onLoadStart={() => setQrLoading(true)}
                onLoadEnd={() => setQrLoading(false)}
                onError={() => { setQrLoading(false); Alert.alert('Error', 'Failed to load QR code'); }}
              />
            )}
            {qrLoading && <ActivityIndicator size="large" color={colors.primary} style={{position: 'absolute', top: '50%'}} />}
            <Text style={styles.modalHint}>Event ID: {eventId}</Text>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setQrVisible(false)}>
              <Ionicons name="close" size={18} color={colors.textLight} />
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background},
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 2,
    ...shadows.sm,
  },
  statValue: {fontSize: fontSize.md, fontWeight: '800', color: colors.textPrimary},
  statLabel: {fontSize: fontSize.xs, color: colors.textMuted},
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    ...shadows.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {borderBottomColor: colors.primary},
  tabText: {fontSize: fontSize.sm, fontWeight: '600', color: colors.textMuted},
  tabTextActive: {color: colors.primary},
  list: {padding: spacing.md, paddingBottom: spacing.xxl},
  paymentCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
  },
  paymentRow: {flexDirection: 'row', alignItems: 'center'},
  paymentName: {fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary},
  paymentDetail: {fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2},
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginTop: 4,
  },
  statusSuccess: {backgroundColor: colors.successLight},
  statusPending: {backgroundColor: colors.warningLight},
  statusText: {fontSize: 10, fontWeight: '700'},
  expenseTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  expenseTotalText: {fontSize: fontSize.md, fontWeight: '700', color: colors.error},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg},
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    ...shadows.lg,
  },
  modalTitle: {fontSize: fontSize.lg, fontWeight: '800', color: colors.textPrimary},
  modalSubtitle: {fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.md},
  qrImage: {width: 260, height: 260, borderRadius: borderRadius.md},
  modalHint: {fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.md},
  modalCloseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xxl,
    marginTop: spacing.md,
  },
  modalCloseBtnText: {color: colors.textLight, fontSize: fontSize.md, fontWeight: '700'},
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.md,
    marginTop: -spacing.xs,
  },
  deleteBtnText: {fontSize: fontSize.xs, color: colors.error, fontWeight: '600'},
  acceptGiftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
  },
  acceptGiftText: {fontSize: fontSize.md, fontWeight: '700', color: colors.textLight},
});
